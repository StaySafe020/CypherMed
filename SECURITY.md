# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| main (devnet) | Yes |
| older branches | No |

CypherMed is currently in active development and has not yet had a formal third-party security audit. Do not use on mainnet with real patient data until an audit is complete.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

This is a healthcare data protocol. Any vulnerability that could expose patient data or allow unauthorized record access must be handled privately first.

### How to Report

1. Go to the repository: [https://github.com/StaySafe020/CypherMed](https://github.com/StaySafe020/CypherMed)
2. Open a **private security advisory** via the GitHub Security tab → "Report a vulnerability"
3. Include as much detail as possible (see below)

### What to Include

- A clear description of the vulnerability
- The component affected (smart contract, backend API, frontend, or off-chain encryption)
- Steps to reproduce
- Potential impact (what data or accounts could be affected)
- Any suggested fix if you have one

### What Happens Next

- You will receive acknowledgment within **72 hours**
- We will investigate and keep you updated on progress
- A fix will be developed and tested privately before any public disclosure
- You will be credited in the security advisory unless you prefer to remain anonymous

## Scope

The following are in scope for security reports:

- Smart contract logic (Anchor/Rust programs in `programs/`)
- Backend API security (authentication, authorization, input validation)
- Off-chain encryption implementation (`backend/src/utils/encryption.ts`)
- Access control bypass vulnerabilities
- Privacy leaks (wallet address exposure, patient identity disclosure)
- Emergency access abuse vectors

The following are out of scope:

- Bugs in third-party dependencies (report those upstream)
- Issues that require physical access to a user's device
- Social engineering attacks

## Security Design Principles

- All on-chain instructions validate permissions before execution
- Patient identity uses SHA-256 hashed IDs — raw wallet addresses are never used as lookup keys
- Off-chain medical data is encrypted with AES-256-GCM
- Emergency access requires explicit justification and creates a permanent, immutable audit trail
- 43 custom error codes enforce strict input validation on all state-changing operations

## Disclosure Policy

We follow responsible disclosure. Once a fix is deployed, we will publish a public security advisory crediting the reporter (with their permission) and documenting the vulnerability and fix.
