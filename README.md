# CypherMed
![CI](https://github.com/StaySafe020/CypherMed/actions/workflows/ci.yml/badge.svg)

Decentralized medical records protocol built on Solana. Patients own their data — hospitals, doctors, and insurers access it only with explicit, auditable consent.

For full technical details see [CYPHERMED_DOCS.md](CYPHERMED_DOCS.md).

---

## Overview

CypherMed combines Solana's immutable ledger with off-chain encrypted storage (PostgreSQL) so that sensitive medical data never touches the blockchain while every access event is permanently audited on-chain.

- **Patient Sovereignty** — complete control over who accesses medical data
- **Immutable Audit Trail** — every access attempt recorded on-chain, tamper-proof
- **Emergency Access** — break-glass protocols with severity levels and permanent audit
- **Universal Identity** — privacy-preserving IDs, not raw wallet addresses
- **Full Hospital Operations** — 28 record types, 13 roles, birth-to-death records

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Anchor Framework (Rust), Solana |
| RPC | [Helius](https://helius.dev) |
| Backend | Node.js/Express, PostgreSQL, Prisma ORM |
| Frontend | Next.js 14, React 18, Solana Wallet Adapter, TailwindCSS |
| Encryption | AES-256-GCM (off-chain data), PBKDF2 key derivation |
| Real-time | Socket.IO |

**Program ID (devnet):** `34LxHEYnuRTy2dif922hNttBbrPNQ6pj7pThyCxwxUrL`

---

## Quick Start

### Prerequisites

- Rust (latest stable)
- Solana CLI v1.18+
- Anchor Framework v0.32+
- Node.js v18+, Yarn
- Docker (for backend PostgreSQL)

### Smart Contract

```bash
git clone https://github.com/StaySafe020/CypherMed.git
cd CypherMed
yarn install
anchor build
anchor test
```

### Backend

```bash
cd backend
docker-compose up -d
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyphermed?schema=public"' > .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd app
cp .env.local.example .env.local  # add your Helius API key
npm install
npm run dev
```

Configure your Helius API key in `app/.env.local`:
```
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here
```

---

## Documentation

| Document | Description |
|---|---|
| [CYPHERMED_DOCS.md](CYPHERMED_DOCS.md) | Architecture, project structure, usage examples, testing, security, roadmap |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, coding standards, PR process |
| [SECURITY.md](SECURITY.md) | Vulnerability disclosure policy |
| [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) | REST API reference |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## License

Licensed under the Apache License 2.0 — see [LICENSE](LICENSE).

---

## Contact

**Maintainer**: StaySafe020  
**Repository**: [https://github.com/StaySafe020/CypherMed](https://github.com/StaySafe020/CypherMed)

---

## ⚠️ Disclaimer

This is experimental software. Always ensure compliance with local healthcare regulations (HIPAA, GDPR, NDPR, etc.) and conduct thorough security audits before any production use. Not intended for production medical use without proper regulatory approval.

---

**Built with ❤️ on Solana**

