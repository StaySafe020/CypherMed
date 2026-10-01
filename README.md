# CypherMed

![CI](https://github.com/StaySafe020/CypherMed/actions/workflows/ci.yml/badge.svg)

CypherMed is a Solana-based medical records MVP focused on patient-controlled, auditable access.

## Links

- **Live app:** https://app-three-rho-15.vercel.app/connect
- **API:** https://cyphermed.onrender.com/
- **API health:** https://cyphermed.onrender.com/health
- **Technical docs:** [CYPHERMED_DOCS.md](CYPHERMED_DOCS.md)

## Demo workflow

1. Connect a Solana wallet as a patient.
2. Create or view a medical record.
3. Grant a provider scoped access.
4. Confirm the provider can read the permitted record.
5. Review the audit event.
6. Revoke access and confirm subsequent reads are denied.

The backend enforces access against the active grant at read time. Records are stored off-chain, while access events are designed for auditability.

## Stack

- **Frontend:** Next.js, React, Tailwind CSS, Solana Wallet Adapter
- **Backend:** Node.js, Express, Prisma, PostgreSQL, Socket.IO
- **On-chain:** Anchor and Solana
- **Deployment:** Vercel frontend, Render API, Neon PostgreSQL

## Local development

```bash
# Frontend
cd app
npm install
cp .env.example .env.local
npm run dev

# Backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `app/.env.local` to the backend URL. For local development, use `http://localhost:3000`.

## Status

This is an experimental MVP for demonstration and testing. It is not approved for production healthcare use. Do not use real patient data. Review the [security notes](SECURITY.md) and applicable HIPAA, GDPR, NDPR, and other healthcare requirements before deployment.

Licensed under the Apache License 2.0.
