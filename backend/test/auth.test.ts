import "./env";

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getBase58Decoder } from "@solana/kit";
import { buildMessage, generateNonce } from "@tuwaio/siwx-core";
import prisma from "../src/prisma";
import authRouter, { verifyToken } from "../src/routes/auth";
import accessRequestsRouter from "../src/routes/accessRequests";
import { readJwtSecret, siwxPolicy } from "../src/auth/siwx";
import { createRateLimiter } from "../src/auth/rateLimit";

const DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const ALLOWED_DOMAIN = "localhost:3001";

const base58 = getBase58Decoder();
const createdWallets: string[] = [];
let server: Server;
let baseUrl: string;

/** An Ed25519 key pair that signs like a Solana wallet: base58 address and base58 signatures. */
function newWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const rawPublicKey = publicKey
    .export({ format: "der", type: "spki" })
    .subarray(-32);
  const address = base58.decode(rawPublicKey);
  createdWallets.push(address);
  return {
    address,
    sign: (message: string) =>
      base58.decode(sign(null, Buffer.from(message), privateKey)),
  };
}

type Wallet = ReturnType<typeof newWallet>;

async function request(
  method: "GET" | "POST",
  path: string,
  { body, token }: { body?: unknown; token?: string } = {}
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function issueNonce(): Promise<string> {
  const { status, body } = await request("POST", "/api/auth/nonce", {
    body: {},
  });
  assert.equal(status, 200);
  return body.nonce;
}

/** The CAIP-122 sign-in message a wallet signs, and its signature. */
async function signIn(
  wallet: Wallet,
  options: {
    domain?: string;
    chainId?: string;
    nonce?: string;
    withExpiration?: boolean;
    signer?: Wallet;
  } = {}
) {
  const domain = options.domain ?? ALLOWED_DOMAIN;
  const chainId = options.chainId ?? DEVNET;
  const issuedAt = new Date();
  const message = buildMessage({
    domain,
    address: `${chainId}:${wallet.address}` as `${string}:${string}:${string}`,
    statement: "Sign in to CypherMed.",
    uri: `http://${domain}`,
    version: "1",
    chainId: chainId as `${string}:${string}`,
    nonce: options.nonce ?? (await issueNonce()),
    issuedAt: issuedAt.toISOString(),
    ...(options.withExpiration === false
      ? {}
      : {
          expirationTime: new Date(
            issuedAt.getTime() + 60 * 60 * 1000
          ).toISOString(),
        }),
  });
  const payload = {
    message,
    signature: (options.signer ?? wallet).sign(message),
  };
  return { payload, ...(await verify(payload)) };
}

function verify(payload: { message: string; signature: string }) {
  return request("POST", "/api/auth/verify-signature", { body: payload });
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.get("/api/me", verifyToken, (req, res) =>
    res.json({ user: (req as any).user })
  );
  app.use("/api/access-requests", verifyToken, accessRequestsRouter);
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  const patients = await prisma.patient.findMany({
    where: { wallet: { in: createdWallets } },
    select: { id: true },
  });
  const patientIds = patients.map((patient) => patient.id);
  await prisma.notification.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.auditEvent.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.accessRequest.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.provider.deleteMany({
    where: { wallet: { in: createdWallets } },
  });
  await prisma.authSession.deleteMany({
    where: { wallet: { in: createdWallets } },
  });
  await prisma.patient.deleteMany({
    where: { wallet: { in: createdWallets } },
  });
  server.close();
  await prisma.$disconnect();
});

describe("domain verification", () => {
  it("rejects a message signed for another domain", async () => {
    const { status, body } = await signIn(newWallet(), {
      domain: "phishing.example.com",
    });
    assert.equal(status, 401);
    assert.match(body.error, /Domain mismatch/);
  });

  it("signs in with a message for the allowed domain", async () => {
    const wallet = newWallet();
    const { status, body } = await signIn(wallet);
    assert.equal(status, 200);
    assert.equal(typeof body.accessToken, "string");
    assert.equal(typeof body.refreshToken, "string");

    const me = await request("GET", "/api/me", { token: body.accessToken });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.walletAddress, wallet.address);
  });
});

describe("nonce reuse", () => {
  it("accepts a signed message only once", async () => {
    const first = await signIn(newWallet());
    assert.equal(first.status, 200);
    const replay = await verify(first.payload);
    assert.equal(replay.status, 401);
    assert.match(replay.body.error, /Nonce expired or already used/);
  });

  it("rejects a nonce the server did not issue", async () => {
    const { status, body } = await signIn(newWallet(), {
      nonce: generateNonce(),
    });
    assert.equal(status, 401);
    assert.match(body.error, /Nonce expired or already used/);
  });

  it("rejects an expired nonce", async () => {
    const nonce = await issueNonce();
    await prisma.authNonce.update({
      where: { nonce },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const { status, body } = await signIn(newWallet(), { nonce });
    assert.equal(status, 401);
    assert.match(body.error, /Nonce expired or already used/);
  });
});

describe("session revocation", () => {
  it("refreshes the access token while the session is active", async () => {
    const { body } = await signIn(newWallet());
    const refreshed = await request("POST", "/api/auth/refresh", {
      body: { refreshToken: body.refreshToken },
    });
    assert.equal(refreshed.status, 200);
    const me = await request("GET", "/api/me", {
      token: refreshed.body.accessToken,
    });
    assert.equal(me.status, 200);
  });

  it("rejects a refresh token used as an access token", async () => {
    const { body } = await signIn(newWallet());
    const me = await request("GET", "/api/me", { token: body.refreshToken });
    assert.equal(me.status, 401);
  });

  it("rejects the access and refresh tokens after logout", async () => {
    const { body } = await signIn(newWallet());
    assert.equal(
      (await request("GET", "/api/me", { token: body.accessToken })).status,
      200
    );

    const logout = await request("POST", "/api/auth/logout", {
      token: body.accessToken,
    });
    assert.equal(logout.status, 200);

    const me = await request("GET", "/api/me", { token: body.accessToken });
    assert.equal(me.status, 401);
    assert.match(me.body.error, /Session expired or revoked/);
    const refreshed = await request("POST", "/api/auth/refresh", {
      body: { refreshToken: body.refreshToken },
    });
    assert.equal(refreshed.status, 401);
    assert.match(refreshed.body.error, /Session expired or revoked/);
  });
});

describe("other sign-in checks", () => {
  it("rejects a message for a network the app does not use", async () => {
    const { status, body } = await signIn(newWallet(), { chainId: MAINNET });
    assert.equal(status, 401);
    assert.match(body.error, /Chain ID .* is not allowed/);
  });

  it("rejects a signature made by another key", async () => {
    const { status, body } = await signIn(newWallet(), {
      signer: newWallet(),
    });
    assert.equal(status, 401);
    assert.match(body.error, /signature/i);
  });

  it("rejects a message without an expiration time", async () => {
    const { status, body } = await signIn(newWallet(), {
      withExpiration: false,
    });
    assert.equal(status, 401);
    assert.match(body.error, /expiration/i);
  });

  it("reads the allowed frontend origins from SIWX_ALLOWED_ORIGINS", () => {
    const policy = siwxPolicy({
      SIWX_ALLOWED_ORIGINS: "https://a.example.com, https://b.example.com",
    });
    assert.deepEqual(policy.expectedDomain, ["a.example.com", "b.example.com"]);
    assert.deepEqual(policy.expectedUri, [
      "https://a.example.com",
      "https://b.example.com",
    ]);
    assert.throws(() => siwxPolicy({ SIWX_ALLOWED_ORIGINS: "not a url" }));
  });

  it("requires a JWT secret of at least 32 characters", () => {
    assert.throws(() => readJwtSecret({}));
    assert.throws(() => readJwtSecret({ JWT_SECRET: "too-short" }));
    const secret = "x".repeat(32);
    assert.equal(readJwtSecret({ JWT_SECRET: secret }), secret);
  });
});

const doctor = {
  role: "doctor",
  name: "Dr. Test",
  email: "dr.test@example.com",
  licenseNumber: "LIC-1",
  specialty: "Cardiology",
  institution: "Test Clinic",
};

function roleOf(token: string) {
  return (jwt.decode(token) as JwtPayload).role;
}

describe("roles verified by the server", () => {
  it("signs in as a patient until the wallet registers as a provider", async () => {
    const { body } = await signIn(newWallet());
    assert.equal(body.user.role, "patient");
    assert.equal(roleOf(body.accessToken), "patient");
    const me = await request("GET", "/api/auth/me", {
      token: body.accessToken,
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.role, "patient");
    assert.equal(me.body.provider, null);
  });

  it("registers the signed-in wallet as a provider and issues tokens with that role", async () => {
    const wallet = newWallet();
    const { body } = await signIn(wallet);
    const registered = await request("POST", "/api/auth/provider", {
      token: body.accessToken,
      body: doctor,
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.provider.wallet, wallet.address);
    assert.equal(registered.body.provider.role, "doctor");
    assert.equal(registered.body.provider.verificationStatus, "pending");
    assert.equal(roleOf(registered.body.accessToken), "doctor");

    const me = await request("GET", "/api/auth/me", {
      token: registered.body.accessToken,
    });
    assert.equal(me.body.role, "doctor");
    assert.equal(me.body.provider.licenseNumber, "LIC-1");
  });

  it("ignores the wallet and verification status sent by the browser", async () => {
    const wallet = newWallet();
    const { body } = await signIn(wallet);
    const registered = await request("POST", "/api/auth/provider", {
      token: body.accessToken,
      body: {
        ...doctor,
        wallet: newWallet().address,
        verificationStatus: "verified",
      },
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.provider.wallet, wallet.address);
    assert.equal(registered.body.provider.verificationStatus, "pending");
  });

  it("rejects an unknown provider role and a missing name", async () => {
    const { body } = await signIn(newWallet());
    const unknown = await request("POST", "/api/auth/provider", {
      token: body.accessToken,
      body: { ...doctor, role: "admin" },
    });
    assert.equal(unknown.status, 400);
    const unnamed = await request("POST", "/api/auth/provider", {
      token: body.accessToken,
      body: { ...doctor, name: "  " },
    });
    assert.equal(unnamed.status, 400);
  });

  it("does not let a wallet register twice", async () => {
    const { body } = await signIn(newWallet());
    const first = await request("POST", "/api/auth/provider", {
      token: body.accessToken,
      body: doctor,
    });
    assert.equal(first.status, 201);
    const second = await request("POST", "/api/auth/provider", {
      token: first.body.accessToken,
      body: { ...doctor, role: "insurer" },
    });
    assert.equal(second.status, 409);
  });

  it("reads the role from the database on sign-in and on refresh", async () => {
    const wallet = newWallet();
    const before = await signIn(wallet);
    await request("POST", "/api/auth/provider", {
      token: before.body.accessToken,
      body: doctor,
    });
    // A refresh token issued before the registration still carries "patient".
    const refreshed = await request("POST", "/api/auth/refresh", {
      body: { refreshToken: before.body.refreshToken },
    });
    assert.equal(refreshed.status, 200);
    assert.equal(roleOf(refreshed.body.accessToken), "doctor");
    const again = await signIn(wallet);
    assert.equal(again.body.user.role, "doctor");
  });

  it("takes the requester's role for an access request from the server", async () => {
    const patient = await signIn(newWallet());
    const providerWallet = newWallet();
    const provider = await signIn(providerWallet);
    const registered = await request("POST", "/api/auth/provider", {
      token: provider.body.accessToken,
      body: doctor,
    });
    await prisma.provider.update({
      where: { wallet: providerWallet.address },
      data: { verificationStatus: "verified" },
    });
    const created = await request("POST", "/api/access-requests", {
      token: registered.body.accessToken,
      body: {
        patientId: patient.body.user.id,
        role: "insurer",
        reason: "Checkup",
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.role, "doctor");
  });

  it("rejects access requests from providers that are not verified yet", async () => {
    const patient = await signIn(newWallet());
    const providerWallet = newWallet();
    const provider = await signIn(providerWallet);
    const registered = await request("POST", "/api/auth/provider", {
      token: provider.body.accessToken,
      body: doctor,
    });
    const body = { patientId: patient.body.user.id, reason: "Checkup" };
    const pending = await request("POST", "/api/access-requests", {
      token: registered.body.accessToken,
      body,
    });
    assert.equal(pending.status, 403);
    assert.match(pending.body.error, /verified/);

    await prisma.provider.update({
      where: { wallet: providerWallet.address },
      data: { verificationStatus: "rejected" },
    });
    const rejected = await request("POST", "/api/access-requests", {
      token: registered.body.accessToken,
      body,
    });
    assert.equal(rejected.status, 403);
    assert.equal(
      await prisma.accessRequest.count({
        where: { requester: providerWallet.address },
      }),
      0
    );
  });

  it("rejects access requests from wallets that are not providers", async () => {
    const patient = await signIn(newWallet());
    const other = await signIn(newWallet());
    const created = await request("POST", "/api/access-requests", {
      token: other.body.accessToken,
      body: { patientId: patient.body.user.id, role: "doctor" },
    });
    assert.equal(created.status, 403);
  });
});

describe("rate limits", () => {
  async function limitedApp(options: { max: number; now: () => number }) {
    const app = express();
    app.set("trust proxy", true);
    app.post(
      "/limited",
      createRateLimiter({ windowMs: 60_000, ...options }),
      (_req, res) => res.json({ ok: true })
    );
    const limited = app.listen(0);
    await once(limited, "listening");
    const url = `http://127.0.0.1:${
      (limited.address() as AddressInfo).port
    }/limited`;
    const hit = (ip: string) =>
      fetch(url, { method: "POST", headers: { "X-Forwarded-For": ip } });
    return { hit, close: () => limited.close() };
  }

  it("answers 429 with Retry-After once a client exceeds the limit", async () => {
    const { hit, close } = await limitedApp({ max: 2, now: () => 1_000 });
    try {
      assert.equal((await hit("203.0.113.1")).status, 200);
      assert.equal((await hit("203.0.113.1")).status, 200);
      const limited = await hit("203.0.113.1");
      assert.equal(limited.status, 429);
      assert.equal(limited.headers.get("retry-after"), "60");
      assert.equal((await hit("203.0.113.2")).status, 200);
    } finally {
      close();
    }
  });

  it("lets the client back in when the window ends", async () => {
    let now = 1_000;
    const { hit, close } = await limitedApp({ max: 1, now: () => now });
    try {
      assert.equal((await hit("203.0.113.3")).status, 200);
      assert.equal((await hit("203.0.113.3")).status, 429);
      now += 60_000;
      assert.equal((await hit("203.0.113.3")).status, 200);
    } finally {
      close();
    }
  });
});
