import { Router, Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { generateNonce } from "@tuwaio/siwx-core";
import prisma from "../prisma";
import { createRateLimiter } from "../auth/rateLimit";
import { PROVIDER_ROLES, isProviderRole, roleOf } from "../auth/roles";
import {
  NONCE_TTL_SECONDS,
  SESSION_TTL_SECONDS,
  nonceStore,
  readJwtSecret,
  sessionStore,
  siwxPolicy,
  verifySignIn,
  walletOf,
} from "../auth/siwx";

const router = Router();

const JWT_SECRET = readJwtSecret();
// Read at startup, so a malformed SIWX_ALLOWED_ORIGINS stops the backend instead of failing every sign-in
const SIWX_POLICY = siwxPolicy();

// Sign-in requests per client IP and minute, counted separately for /nonce and /verify-signature
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE) || 10;
const nonceLimiter = createRateLimiter({
  windowMs: 60_000,
  max: AUTH_RATE_LIMIT,
});
const verifyLimiter = createRateLimiter({
  windowMs: 60_000,
  max: AUTH_RATE_LIMIT,
});

type TokenClaims = {
  userId: string;
  walletAddress: string;
  role: string;
  sid: string;
};

/** Signs the access and refresh tokens of a session; both expire with it. */
function signTokens(claims: TokenClaims, sessionExpiresAt: number) {
  const expiresIn = Math.max(
    1,
    Math.floor((sessionExpiresAt - Date.now()) / 1000)
  );
  return {
    accessToken: jwt.sign({ ...claims, type: "access" }, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn,
    }),
    refreshToken: jwt.sign({ ...claims, type: "refresh" }, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn,
    }),
  };
}

/**
 * Generate a nonce for the sign-in message. It works once and expires after 5 minutes.
 */
router.post("/nonce", nonceLimiter, async (_req: Request, res: Response) => {
  try {
    const nonce = generateNonce();
    await nonceStore.issue({ nonce, ttlSeconds: NONCE_TTL_SECONDS });
    res.json({ nonce });
  } catch (err: any) {
    console.error("Nonce generation error:", err);
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

/**
 * Verify a signed sign-in message (SIWX, CAIP-122) and issue JWT tokens bound to a new session
 */
router.post(
  "/verify-signature",
  verifyLimiter,
  async (req: Request, res: Response) => {
    try {
      const { message, signature } = req.body ?? {};

      if (typeof message !== "string" || typeof signature !== "string") {
        return res
          .status(400)
          .json({ error: "message and signature are required" });
      }

      const result = await verifySignIn({ message, signature }, SIWX_POLICY);
      if ("error" in result) {
        return res.status(401).json({ error: result.error });
      }

      const record = await sessionStore.create({
        session: result.session,
        ttlSeconds: SESSION_TTL_SECONDS,
      });
      const walletAddress = walletOf(record.session.address);

      // Create or get user
      let user = await prisma.patient.findUnique({
        where: { wallet: walletAddress },
      });

      if (!user) {
        // Create new patient with wallet
        user = await prisma.patient.create({
          data: {
            wallet: walletAddress,
            name: `User ${walletAddress.substring(0, 8)}`,
            dob: new Date(),
          },
        });
      }

      await sessionStore.bindSubject(record.id, user.id);

      // The role comes from the provider registration on the server, never from the browser
      const role = await roleOf(walletAddress);
      const tokens = signTokens(
        { userId: user.id, walletAddress, role, sid: record.id },
        record.expiresAt
      );

      res.json({
        ...tokens,
        user: {
          id: user.id,
          wallet: user.wallet,
          name: user.name,
          role,
        },
      });
    } catch (err: any) {
      console.error("Signature verification error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  }
);

/**
 * Refresh the access token while the session is active
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    if (decoded.type !== "refresh" || typeof decoded.sid !== "string") {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    const record = await sessionStore.get(decoded.sid);
    if (!record) {
      return res.status(401).json({ error: "Session expired or revoked" });
    }

    // Re-read the role, so a registration since the last token is picked up and an old token cannot keep a role
    const { accessToken } = signTokens(
      {
        userId: decoded.userId,
        walletAddress: decoded.walletAddress,
        role: await roleOf(decoded.walletAddress),
        sid: decoded.sid,
      },
      record.expiresAt
    );

    res.json({ accessToken });
  } catch (err: any) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/**
 * Middleware to verify the JWT access token and that its session is still active
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let decoded: JwtPayload;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    if (decoded.type !== "access" || typeof decoded.sid !== "string") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!(await sessionStore.get(decoded.sid))) {
      return res.status(401).json({ error: "Session expired or revoked" });
    }
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Outside the try block: an error thrown by the next handler must not turn into a 401
  (req as any).user = decoded;
  next();
}

/**
 * The signed-in wallet and the role the server has on record for it
 */
router.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = (req as any).user as JwtPayload;
    const provider = await prisma.provider.findUnique({
      where: { wallet: walletAddress },
    });
    res.json({
      wallet: walletAddress,
      role: provider?.role ?? "patient",
      provider,
    });
  } catch (err: any) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to load the profile" });
  }
});

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 200)
    : null;
}

/**
 * Register the signed-in wallet as a provider and issue tokens with that role. The wallet comes from the access
 * token and the verification status starts as pending: neither is taken from the request body.
 */
router.post("/provider", verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const { role, name, email, licenseNumber, specialty, institution } =
    req.body ?? {};

  if (!isProviderRole(role)) {
    return res
      .status(400)
      .json({ error: `role must be one of: ${PROVIDER_ROLES.join(", ")}` });
  }
  const providerName = optionalText(name);
  if (!providerName) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const provider = await prisma.provider.create({
      data: {
        wallet: user.walletAddress,
        role,
        name: providerName,
        email: optionalText(email),
        licenseNumber: optionalText(licenseNumber),
        specialty: optionalText(specialty),
        institution: optionalText(institution),
      },
    });
    const record = await sessionStore.get(user.sid);
    if (!record) {
      return res.status(401).json({ error: "Session expired or revoked" });
    }
    const tokens = signTokens(
      {
        userId: user.userId,
        walletAddress: user.walletAddress,
        role,
        sid: user.sid,
      },
      record.expiresAt
    );
    res.status(201).json({ ...tokens, provider });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "This wallet is already registered as a provider" });
    }
    console.error("Provider registration error:", err);
    res.status(500).json({ error: "Provider registration failed" });
  }
});

/**
 * Revoke the session of the access token: it and its refresh token stop working
 */
router.post("/logout", verifyToken, async (req: Request, res: Response) => {
  try {
    await sessionStore.revoke((req as any).user.sid);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
