import { randomBytes } from "crypto";
import type { AuthSession } from "@prisma/client";
import { parseCaip10AccountId } from "@tuwaio/orbit-core";
import type { SiwxVerificationPolicy } from "@tuwaio/siwx-core";
import {
  toSession,
  verifySiwxPayload,
  type SiwxNonceStore,
  type SiwxSession,
  type SiwxSessionRecord,
  type SiwxSessionStore,
} from "@tuwaio/siwx-server";
import prisma from "../prisma";

/** How long a sign-in nonce can be used, in seconds. */
export const NONCE_TTL_SECONDS = 5 * 60;

/** Longest session, in seconds. The access and refresh tokens never outlive their session. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** CAIP-2 chain ID of Solana devnet, the only cluster of the app. */
export const DEVNET_CHAIN_ID = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

/**
 * Reads the JWT signing secret. The backend refuses to start without one, so tokens are never signed with a
 * value that is public in the repository.
 */
export function readJwtSecret(
  env: Record<string, string | undefined> = process.env
): string {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set to a random value of at least 32 characters (openssl rand -base64 32)"
    );
  }
  return secret;
}

/**
 * What a sign-in message must contain to be accepted: one of the frontend origins of SIWX_ALLOWED_ORIGINS
 * (comma-separated, default http://localhost:3001) as its domain and URI, Solana devnet, an expiration time
 * within the session lifetime, and an issue time of the last 5 minutes.
 */
export function siwxPolicy(
  env: Record<string, string | undefined> = process.env
): SiwxVerificationPolicy {
  const origins = (env.SIWX_ALLOWED_ORIGINS || "http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin));
  return {
    expectedDomain: origins.map((url) => url.host),
    expectedUri: origins.map((url) => url.origin),
    allowedChainIds: [DEVNET_CHAIN_ID],
    requireExpirationTime: true,
    maxIssuedAtAgeSeconds: 300,
    maxSessionLifetimeSeconds: SESSION_TTL_SECONDS,
    clockSkewSeconds: 60,
  };
}

/** The base58 wallet address of a CAIP-10 account ID such as `solana:<genesis hash>:<address>`. */
export function walletOf(accountId: string): string {
  const account = parseCaip10AccountId(accountId);
  if (!account) throw new Error(`Not a CAIP-10 account ID: ${accountId}`);
  return account.address;
}

/** Single-use sign-in nonces in Postgres: consuming one deletes it, so a signed message works once. */
export const nonceStore: SiwxNonceStore = {
  async issue({ nonce, ttlSeconds }) {
    await prisma.authNonce.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await prisma.authNonce.create({
      data: { nonce, expiresAt: new Date(Date.now() + ttlSeconds * 1000) },
    });
  },
  async consume({ nonce }) {
    const { count } = await prisma.authNonce.deleteMany({
      where: { nonce, expiresAt: { gt: new Date() } },
    });
    return count === 1;
  },
};

function toRecord(row: AuthSession): SiwxSessionRecord {
  return {
    id: row.id,
    session: {
      address: `${row.chainId}:${row.wallet}`,
      chainId: row.chainId,
      domain: row.domain,
      nonce: row.nonce,
      issuedAt: row.issuedAt.toISOString(),
      expirationTime: row.expiresAt.toISOString(),
    },
    subjectId: row.subjectId ?? undefined,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

/**
 * Wallet sessions in Postgres. A session ends at the earliest of its lifetime and the expiration time of the
 * signed message; `get` returns null once it has ended or was revoked.
 */
export const sessionStore: SiwxSessionStore = {
  async create({ session, ttlSeconds }) {
    const limits = [Date.now() + ttlSeconds * 1000];
    if (session.expirationTime) limits.push(Date.parse(session.expirationTime));
    const row = await prisma.authSession.create({
      data: {
        id: randomBytes(32).toString("base64url"),
        wallet: walletOf(session.address),
        chainId: session.chainId,
        domain: session.domain,
        nonce: session.nonce,
        issuedAt: new Date(session.issuedAt),
        expiresAt: new Date(Math.min(...limits)),
      },
    });
    return toRecord(row);
  },
  async get(id) {
    const row = await prisma.authSession.findUnique({ where: { id } });
    if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return toRecord(row);
  },
  async bindSubject(id, subjectId) {
    const { count } = await prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { subjectId },
    });
    return count === 1;
  },
  async revoke(id) {
    await prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};

/**
 * Verifies a signed sign-in message: its CAIP-122 fields against the policy, the wallet signature, and its
 * nonce, which is consumed here. Returns the session to create, or why the message was rejected.
 */
export async function verifySignIn(
  payload: { message: string; signature: string },
  policy: SiwxVerificationPolicy
): Promise<{ session: SiwxSession } | { error: string }> {
  const result = await verifySiwxPayload(payload, { policy });
  if (!result.success || !result.data) {
    return { error: result.error || "Invalid sign-in message" };
  }
  if (!(await nonceStore.consume({ nonce: result.data.nonce }))) {
    return { error: "Nonce expired or already used" };
  }
  return { session: toSession(result.data, result.method) };
}
