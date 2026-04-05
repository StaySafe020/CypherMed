# Contributing to CypherMed

Thank you for your interest in contributing to CypherMed! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/StaySafe020/CypherMed/issues).
2. If not, open a new issue using the **Bug Report** template.
3. Include steps to reproduce, expected behavior, and actual behavior.
4. Include your environment details (OS, Solana CLI version, Anchor version, Node.js version).

### Suggesting Features

1. Open a new issue using the **Feature Request** template.
2. Describe the feature, why it's needed, and how it should work.
3. If possible, include examples or mockups.

### Submitting Code

1. Fork the repository.
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following the coding standards below.
4. Write or update tests for your changes.
5. Ensure all tests pass:
   ```bash
   anchor test
   ```
6. Commit with a clear message:
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. Push and open a Pull Request against `main`.

## Development Setup

### Prerequisites

- Rust (latest stable)
- Solana CLI (v1.18+)
- Anchor Framework (v0.32+)
- Node.js (v18+)
- Yarn
- Docker (for backend database)

### Quick Start

```bash
git clone https://github.com/StaySafe020/CypherMed.git
cd CypherMed
yarn install
anchor build
anchor test
```

### Backend Setup

```bash
cd backend
docker-compose up -d
cp .env.example .env   # or create .env with DATABASE_URL
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Coding Standards

### Rust (Smart Contracts)

- Follow standard Rust formatting (`cargo fmt`)
- Use `cargo clippy` for linting
- All public functions must have doc comments
- New instructions must include input validation
- Every state-changing operation must create an audit log entry
- Use the existing error codes in `errors.rs` or add new ones when needed

### TypeScript (Backend & Tests)

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Use `async/await` over raw promises
- Validate all user input at API boundaries

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `test:` — Adding or updating tests
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `chore:` — Build process or tooling changes

Examples:
```
feat: add vital signs record type
fix: correct access grant expiration check
docs: update emergency profile API docs
test: add consent delegation tests
```

## Project Structure

- `programs/cyphermed/src/` — Solana smart contract (Anchor/Rust)
- `programs/cyphermed/src/state/` — On-chain account definitions
- `programs/cyphermed/src/instructions/` — Program instruction handlers
- `tests/` — Integration tests (TypeScript)
- `backend/` — Express API with PostgreSQL
- `app/` — Next.js frontend

## Areas Where Help is Welcome

- Frontend development (Next.js, React, TailwindCSS)
- Mobile app development (React Native)
- Security auditing and penetration testing
- Healthcare compliance expertise (HIPAA, GDPR, NDPR)
- Documentation and tutorials
- Internationalization (i18n)
- Testing (unit tests, integration tests, fuzz testing)

## Code Review Process

1. All PRs require at least one review before merging.
2. CI must pass (build + tests).
3. New features must include tests.
4. Breaking changes must be documented.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
