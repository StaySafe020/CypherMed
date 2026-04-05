# CypherMed — Technical Documentation

This document contains detailed technical documentation for the CypherMed protocol. For the project overview, quick start, and contribution guidelines see the [README](README.md).

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Usage Examples](#usage-examples)
4. [Backend Local Development](#backend-local-development)
5. [Testing](#testing)
6. [Security Considerations](#security-considerations)
7. [Roadmap](#roadmap)

---

## Architecture

### On-Chain (Solana)
- **Patient Accounts**: Privacy-preserving identity with hashed IDs and access control
- **Access Grants**: Role-based permissions with expiration (up to 10 record types per grant)
- **Audit Logs**: Immutable record of all access events (success and failure)
- **Record Metadata**: Record IDs, types, timestamps, and data hashes
- **Emergency Access**: Break-glass event logs with severity classification
- **Emergency Profiles**: Critical medical data for first responders
- **Consent Delegates**: Guardian/representative management for minors and incapacitated patients

### Off-Chain (PostgreSQL)
- **Encrypted Medical Records**: Full patient medical data
- **IPFS/Arweave CIDs**: Pointers to distributed storage (future)
- **Encryption Keys**: Patient-controlled key management
- **Session Data**: Temporary access tokens

### Hybrid Benefits
- **Privacy**: Sensitive data never touches the blockchain
- **Immutability**: Access logs cannot be tampered with
- **Performance**: Fast queries on off-chain DB, verified on-chain
- **Cost-Effective**: Only critical data incurs blockchain storage costs
- **Scalability**: PostgreSQL handles high-volume medical data

### Privacy-Preserving Identity Model

Patients are never identified by their raw wallet address. CypherMed uses a three-layer privacy model:

| Layer | Value | Purpose |
|---|---|---|
| Wallet (authority) | Raw public key | Signing only — never used as a lookup key |
| `patient_id_hash` | SHA-256(wallet + salt) | Universal medical ID used by hospitals |
| `identity_hash` | SHA-256(name + DOB + national ID + salt) | Cross-hospital patient verification |
| `country_code` | ISO 3166-1 alpha-2 | Regional compliance (HIPAA, NDPR, GDPR) |

Sensitive medical data is stored encrypted off-chain. Only metadata, timestamps, and access logs are stored on-chain. Patients control their own encryption keys.

---

## Project Structure

```
CypherMed/
├── programs/
│   └── cyphermed/
│       ├── src/
│       │   ├── lib.rs                      # Main program entry (20 instructions)
│       │   ├── state/                       # Account structures (7 accounts)
│       │   │   ├── mod.rs
│       │   │   ├── patient.rs               # Patient account (privacy-preserving ID)
│       │   │   ├── record.rs                # Medical record metadata
│       │   │   ├── access_grant.rs          # Access permissions
│       │   │   ├── audit_log.rs             # Audit trail entries
│       │   │   ├── access_request.rs        # Access request tracking
│       │   │   ├── emergency_profile.rs     # Emergency medical data
│       │   │   └── consent_delegate.rs      # Guardian/delegate management
│       │   ├── instructions/                # Program instructions (13 files)
│       │   │   ├── mod.rs
│       │   │   ├── initialize_patient.rs    # Patient registration
│       │   │   ├── create_record.rs         # Medical record creation
│       │   │   ├── grant_access.rs          # Direct access grant
│       │   │   ├── revoke_access.rs         # Revoke permissions
│       │   │   ├── access_record.rs         # View records with audit
│       │   │   ├── emergency_access.rs      # Break-glass access
│       │   │   ├── emergency_profile.rs     # Create/update emergency profile
│       │   │   ├── request_access.rs        # Request access workflow
│       │   │   ├── approve_deny_request.rs  # Approve/deny access requests
│       │   │   ├── update_delete_record.rs  # Update/soft-delete records
│       │   │   ├── batch_grant.rs           # Batch access grants
│       │   │   ├── patient_management.rs    # Deactivate/reactivate patient
│       │   │   └── consent_delegation.rs    # Delegate/revoke consent
│       │   ├── errors.rs                    # 43 custom error codes
│       │   └── utils.rs                     # Helper functions
│       └── Cargo.toml
├── tests/                                   # Integration tests (22 tests)
│   ├── cyphermed.ts                         # Basic workflow tests
│   └── cyphermed-full.ts                    # Comprehensive test suite
├── backend/                                 # Express API + PostgreSQL
│   ├── src/
│   │   ├── index.ts                         # Server entry point
│   │   ├── routes/                          # 7 route modules
│   │   └── utils/                           # Encryption, storage, notifications
│   ├── prisma/                              # Database schema + migrations
│   └── docker-compose.yml                   # Local Postgres setup
├── app/                                     # Next.js frontend
│   └── src/
│       ├── app/                             # Pages (onboarding, login, dashboard)
│       ├── store/                           # Zustand state management
│       └── providers/                       # Wallet adapter provider
├── migrations/                              # Deployment scripts
├── .github/workflows/                       # CI/CD workflows
├── Anchor.toml                              # Anchor configuration
├── Cargo.toml                               # Workspace configuration
└── README.md
```

---

## Usage Examples

### Initialize Patient Account
```rust
initialize_patient(
    name: "encrypted_name_hash",
    date_of_birth: 631152000,               // Unix timestamp
    patient_id_hash: "sha256(wallet+salt)", // Universal medical ID
    identity_hash: "sha256(name+dob+national_id+salt)", // Cross-hospital verification
    country_code: "NG",                     // ISO 3166-1 alpha-2
    emergency_contact: Some(contact_wallet),
)
```

### Grant Access to a Doctor
```rust
grant_access(
    provider: doctor_wallet,
    role: Role::Doctor,
    allowed_record_types: vec![
        RecordType::GeneralMedical,
        RecordType::LabResult,
        RecordType::Prescription,
    ],
    expires_at: Some(timestamp + 30_days),
    can_create: true,
    can_modify: false,
    can_view: true,
    reason: Some("Primary care physician"),
)
```

### Create a Medical Record
```rust
create_record(
    record_id: "rx-2026-0001",
    record_type: RecordType::Prescription,
    data_hash: "sha256_of_encrypted_offchain_data",
    storage_cid: Some("ipfs://Qm..."),
    metadata: Some("Amoxicillin 500mg"),
)
```

### Emergency Access with Profile
```rust
// Emergency responder accesses patient records with severity
emergency_access_with_profile(
    justification: "Car accident - patient unconscious",
    severity: EmergencySeverity::Critical,
    client_info: Some("Ambulance Unit 7"),
)
// Returns: blood type, allergies, medications, DNR status
```

### Delegate Consent (Guardian System)
```rust
delegate_consent(
    delegate: parent_wallet,
    relationship: DelegateRelationship::Parent,
    can_grant_access: true,
    can_approve_requests: true,
    can_create_records: true,
    can_view_records: true,
    expires_at: Some(child_turns_18_timestamp),
    reason: Some("Legal guardian of minor"),
)
```

---

## Backend Local Development

The backend uses Docker Compose for a reproducible local Postgres instance and Prisma for migrations.

```bash
# 1. Start local Postgres
cd backend
docker-compose up -d

# 2. Create the .env file used by Prisma
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyphermed?schema=public"' > .env

# 3. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# 4. Seed a test patient
npm run prisma:seed

# 5. Stop containers when done
docker-compose down
```

**Notes:**
- The Compose file uses `postgres:15` and mounts a seed SQL file on first init.
- Prisma creates tables with model-casing (e.g., `"Patient"`). When querying directly with `psql`, quote identifiers.
- If you prefer not to run Docker, use any managed Postgres instance and set `DATABASE_URL` accordingly in `backend/.env`.

---

## Testing

CypherMed has 22 integration tests covering the full smart contract functionality.

```bash
# Run all tests
anchor test

# Run with detailed logs
RUST_LOG=debug anchor test
```

### Test Coverage

| Area | Tests |
|---|---|
| Patient registration (privacy-preserving IDs) | 2 |
| Access grant and revocation | 3 |
| Access request workflow (request, approve, deny) | 3 |
| Medical record CRUD (create, update, soft-delete) | 4 |
| Record access with audit logging | 2 |
| Emergency access (basic and with profile + severity) | 3 |
| Emergency profile (create and update) | 2 |
| Consent delegation and revocation | 2 |
| Patient account management (deactivate, reactivate) | 1 |
| **Total** | **22** |

---

## Security Considerations

| Area | Approach |
|---|---|
| Identity | Patients identified by hashed IDs — raw wallet never used as a lookup key |
| Private Keys | Patients must securely store Solana wallet keys (hardware wallet recommended) |
| Off-chain storage | All medical data encrypted with AES-256-GCM at rest |
| Access control | All 20 on-chain instructions verify permissions before execution |
| Emergency access | Requires justification and severity level; creates a permanent, immutable audit trail |
| Input validation | 43 custom error codes covering all edge cases and boundary conditions |
| Transport | TLS/SSL required for all API communications |
| Emergency profiles | DNR and organ donor flags are on-chain — only accessible in an authenticated emergency access transaction |

### Known Limitations
- Off-chain PostgreSQL data is encrypted but the server holding the keys is a single point of trust. A future phase will migrate to patient-side key management with no server-side key storage.
- Smart contracts have not yet undergone a third-party security audit. Do not use in production until a full audit is complete.

---

## Roadmap

### Phase 1 — Core Protocol (COMPLETE)
- Smart contract development (Anchor/Rust)
- Patient registration with privacy-preserving identity
- Medical record CRUD
- Access grant/revoke system
- Access request workflow (request, approve, deny)
- Batch access grants
- Audit logging (on-chain)
- 13 hospital staff roles, 28 medical record types

### Phase 2 — Enhanced Features (COMPLETE)
- Emergency access (break-glass) with severity levels
- Emergency profile (blood type, allergies, DNR, medications)
- Consent delegation (guardian system for minors and incapacitated patients)
- Time-based permissions with automatic expiration
- Security hardening and input validation (43 error codes)
- Comprehensive test suite (22 tests)

### Phase 3 — Backend Integration (COMPLETE)
- PostgreSQL integration (schema + 3 migrations)
- AES-256-GCM encryption for medical data
- REST API (patients, records, access requests, audit logs, notifications)
- WebSocket real-time notifications
- File upload support (PDF, images, DICOM, up to 50MB)

### Phase 4 — Frontend (IN PROGRESS)
- Next.js web application with Solana wallet integration
- Patient dashboard
- Provider interface
- Onboarding and login flow

### Phase 5 — Production Ready
- Third-party security audit
- Performance optimization
- Mainnet deployment
- HIPAA compliance certification

### Phase 6 — Advanced Features
- Mobile applications (React Native)
- Interoperability standards (HL7 FHIR)
- Token economics
- AI-powered health insights
- Cross-chain interoperability
