# CypherMed Backend - Local Dev

This document explains how to run the local Postgres instance (Docker Compose), run Prisma migrations, and seed a test patient.

Prerequisites
- Docker & Docker Compose installed
- Node.js (>=18) and npm

Start Postgres locally

```bash
cd backend
docker compose up -d
```

Create `backend/.env` (if not present)

```bash
cp backend/.env.example backend/.env
```

Then set at least:

- `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/cyphermed?schema=public` for the Docker Compose database
- `JWT_SECRET`: a random value of at least 32 characters (`openssl rand -base64 32`); the backend refuses to start without it
- `SIWX_ALLOWED_ORIGINS`: the frontend origins allowed in sign-in messages, comma-separated (default `http://localhost:3001`)
- `TRUST_PROXY_HOPS`: the number of reverse proxies in front of the backend (Render: `1`), so the sign-in rate limit (`AUTH_RATE_LIMIT_PER_MINUTE`, default 10 per IP and minute) sees the client IP

Generate Prisma client and run migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

Seed test patient (SQL seed runs on first container init; to create via Prisma run):

```bash
npm run prisma:seed
```

Stop containers

```bash
docker compose down
```

Wallet sign-in

The app signs in with SIWX (Sign In With Solana, CAIP-122): `POST /api/auth/nonce` issues a single-use nonce, the wallet signs a message bound to the app domain, devnet and an expiry, and `POST /api/auth/verify-signature` returns JWT tokens tied to a server session. `POST /api/auth/logout` revokes the session. See the Auth section of `API_DOCUMENTATION.md`.

Run the tests

The tests sign in against a real database, so run the migrations first:

```bash
cd backend
npx prisma migrate deploy
npm test
```
