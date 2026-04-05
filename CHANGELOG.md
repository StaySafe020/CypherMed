# Changelog

All notable changes to CypherMed are documented here.

Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### In Progress
- Next.js frontend (patient dashboard, provider interface, onboarding flow)
- Mainnet deployment preparation
- Third-party security audit

---

## [0.3.0] — 2026-04-05

### Added
- Privacy-preserving identity model: `patient_id_hash`, `identity_hash`, `country_code` fields on Patient account
- Patients are now identified by SHA-256 hashed IDs — raw wallet addresses are never used as lookup keys
- Cross-hospital identity verification via `identity_hash`
- Regional compliance support via `country_code` (ISO 3166-1 alpha-2)
- 15 new RecordTypes: Admission, Discharge, Surgery, Pathology, RadiologyReport, VitalSigns, NursingNotes, ProgressNotes, ProcedureReport, TransferRecord, Referral, Maternity, Rehabilitation, ConsentForm, InsuranceClaim
- 8 new Roles: Nurse, LabTechnician, Pharmacist, Radiologist, Specialist, MentalHealth, Dentist, Administrator
- GitHub Actions CI workflow

### Changed
- `initialize_patient` instruction updated to accept `patient_id_hash`, `identity_hash`, `country_code`
- `AccessGrant::MAX_RECORD_TYPES` increased from 5 to 10
- Test suite updated for new `initializePatient` signature

### Fixed
- Missing signer validation in `create_record` instruction

---

## [0.2.0] — 2026-03-23

### Added
- Emergency Profile system (`EmergencyProfile` state account)
  - Blood type, known allergies, current medications, chronic conditions
  - Emergency instructions, organ donor status, DNR flag
  - Primary physician and insurance info hash
- `EmergencySeverity` enum: Critical, Urgent, Standard
- `emergency_access_with_profile` instruction — returns emergency profile data alongside audit log
- `create_emergency_profile` and `update_emergency_profile` instructions
- Consent Delegation system (`ConsentDelegate` state account)
  - Relationship types: Parent, LegalGuardian, Spouse, PowerOfAttorney, Conservator, Other
  - Granular per-delegate permissions (grant access, revoke, approve requests, create records, view records)
- `delegate_consent` and `revoke_delegation` instructions
- 19 new error codes for input validation (blood type, allergy, medication field lengths; delegation constraints)
- 22 integration tests — all passing

### Changed
- `emergency_access.rs` enhanced with severity level support and profile-aware access

---

## [0.1.0] — 2026-01-02

### Added
- Initial smart contract (Anchor/Rust) deployed on localnet
- `Patient` account with role and record type enums
- 7 initial RecordTypes: GeneralMedical, Prescription, LabResult, VisitSummary, Immunization, Imaging, Emergency
- 5 initial Roles: Patient, Doctor, Hospital, Insurer, EmergencyResponder
- Core instructions: `initialize_patient`, `create_record`, `grant_access`, `revoke_access`, `access_record`, `emergency_access`
- Access request workflow: `request_access`, `approve_deny_request`
- Batch grant: `batch_grant`
- Record management: `update_delete_record`
- Patient management: `deactivate_patient`, `reactivate_patient`
- `AuditLog` state account — immutable on-chain access events
- `AccessGrant` state account — role-based permissions with expiration
- `AccessRequest` state account — request/approve/deny workflow
- PostgreSQL backend (Node.js/Express, Prisma ORM, 3 migrations)
- AES-256-GCM encryption for off-chain medical data
- REST API: patients, records, access requests, audit logs, notifications
- WebSocket real-time notifications (Socket.IO)
- Docker Compose for local Postgres
- Next.js 14 frontend scaffold with Solana Wallet Adapter
