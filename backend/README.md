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
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyphermed?schema=public"' > backend/.env
```

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
