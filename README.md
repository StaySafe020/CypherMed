# CypherMed - Decentralized Medical Records Protocol

A blockchain-based healthcare platform built on Solana that gives patients true ownership and control over their medical records while providing hospitals, doctors, and insurers with secure, compliant, and fraud-proof access.

## 🎯 Overview

CypherMed leverages Solana's high-performance blockchain to create **immutable audit trails** of medical record access while keeping sensitive patient data encrypted in off-chain PostgreSQL databases. This hybrid approach ensures:

- **Patient Sovereignty**: Complete control over who accesses medical data
- **HIPAA Compliance**: Cryptographic proof of consent and access
- **Fraud Prevention**: Tamper-proof audit logs for insurers
- **Emergency Access**: Break-glass protocols for life-threatening situations
- **Interoperability**: Seamless data sharing between healthcare providers

---

## ✨ Key Features

### 1. **Patient-Controlled Access Management**
- Patients can grant and revoke access to specific healthcare providers
- Granular permissions for doctors, hospitals, and insurance companies
- Individual access control per provider (not institution-wide by default)
- Time-based access grants with automatic expiration
- Condition-based access rules per record type

### 2. **Role-Based Access Control (RBAC)**
- **Patient**: Full ownership and control of all medical records
- **Doctor**: View and create records with patient permission
- **Hospital**: Institutional access to patient records during treatment
- **Insurer**: Read-only access for claims verification
- **Emergency Responder**: Temporary emergency access with audit trail

### 3. **Immutable Audit Trail**
- Every access attempt is recorded on-chain (successful and failed)
- Timestamps for all record creation, modification, and access events
- Cryptographic proof of who accessed what and when
- Cannot be altered or deleted - permanent compliance record
- Real-time monitoring of unauthorized access attempts

### 4. **Emergency Access System**
- "Break-glass" access for life-threatening situations
- Emergency responders can access critical medical information
- All emergency access is logged with justification
- Post-emergency audit and review process
- Patient notification of emergency access

### 5. **Multi-Record Type Support**
- **General Medical Records**: Patient history, diagnoses, treatments
- **Prescriptions**: Medication history and current prescriptions
- **Lab Results**: Blood work, imaging, pathology reports
- **Visit Summaries**: Doctor's notes and consultation records
- **Immunization Records**: Vaccination history
- Each record type has customizable access rules

### 6. **Privacy-First Architecture**
- Sensitive medical data stored encrypted in off-chain PostgreSQL
- Only metadata, timestamps, and access logs stored on-chain
- Zero-knowledge proofs for verification without data exposure
- End-to-end encryption for all off-chain data
- Patient controls encryption keys

### 7. **Compliance & Verification**
- HIPAA-compliant audit trails
- Cryptographic proof of patient consent
- Fraud-proof verification for insurance claims
- Regulatory compliance automation
- Exportable audit logs for legal requirements

### 8. **Access Request System**
- Healthcare providers can request access from patients
- Patients approve/deny access requests
- Automated notifications for pending requests
- Batch approval for multiple providers
- Access history and statistics

---

## 🏗️ Architecture

### On-Chain (Solana)
- **Patient Accounts**: Identity and access control lists
- **Access Grants**: Permissions and expiration timestamps
- **Audit Logs**: Immutable record of all access events
- **Record Metadata**: Record IDs, types, timestamps, and hashes
- **Emergency Access**: Break-glass event logs

### Off-Chain (PostgreSQL)
- **Encrypted Medical Records**: Full patient medical data
- **IPFS/Arweave CIDs**: Pointers to distributed storage (future)
- **Encryption Keys**: Patient-controlled key management
- **Session Data**: Temporary access tokens

### Hybrid Benefits
✅ **Privacy**: Sensitive data never touches the blockchain  
✅ **Immutability**: Access logs cannot be tampered with  
✅ **Performance**: Fast queries on off-chain DB, verified on-chain  
✅ **Cost-Effective**: Only critical data incurs blockchain storage costs  
✅ **Scalability**: PostgreSQL handles high-volume medical data  

---

## 🛠️ Tech Stack

### Blockchain Layer
- **Solana**: High-performance L1 blockchain
- **Anchor Framework**: Rust-based Solana development framework
- **Rust**: Smart contract programming language
- **SPL Token** (Future): For tokenomics/payment system

### Backend (Future)
- **PostgreSQL**: Encrypted medical record storage
- **Node.js/Express**: API layer between frontend and blockchain
- **TypeScript**: Type-safe backend development

### Frontend (Future)
- **React**: User interface framework
- **Solana Web3.js**: Blockchain interaction
- **Anchor Provider**: Wallet integration (Phantom, Solflare)
- **TailwindCSS**: UI styling

### Security
- **Encryption**: AES-256 for data at rest
- **Key Management**: Patient-controlled private keys
- **Access Control**: On-chain authorization checks
- **Audit Logging**: Immutable blockchain records

---

## 📦 Project Structure

```
CypherMed/
├── programs/
│   └── cyphermed/
│       ├── src/
│       │   ├── lib.rs              # Main program entry
│       │   ├── state/              # Account structures
│       │   │   ├── mod.rs
│       │   │   ├── patient.rs      # Patient account
│       │   │   ├── record.rs       # Medical record metadata
│       │   │   ├── access_grant.rs # Access permissions
│       │   │   └── audit_log.rs    # Audit trail entries
│       │   ├── instructions/       # Program instructions
│       │   │   ├── mod.rs
│       │   │   ├── initialize_patient.rs
│       │   │   ├── create_record.rs
│       │   │   ├── grant_access.rs
│       │   │   ├── revoke_access.rs
│       │   │   ├── access_record.rs
│       │   │   └── emergency_access.rs
│       │   ├── errors.rs           # Custom error codes
│       │   └── utils.rs            # Helper functions
│       └── Cargo.toml
├── tests/                          # Integration tests
├── migrations/                     # Deployment scripts
├── app/                            # Frontend (future)
├── Anchor.toml                     # Anchor configuration
├── Cargo.toml                      # Workspace configuration
└── README.md                       # This file
```

---

## 🚀 Getting Started

### Prerequisites

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   ```

3. **Install Anchor**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

4. **Install Node.js & Yarn**
   ```bash
   # Install Node.js 18+
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # Install Yarn
   npm install -g yarn
   ```

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/StaySafe020/CypherMed.git
   cd CypherMed
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure Solana for local development**
   ```bash
   solana config set --url localhost
   solana-keygen new  # Create a new keypair if needed
   ```

4. **Start local validator**
   ```bash
   solana-test-validator
   ```

5. **Build the program**
   ```bash
   anchor build
   ```

6. **Run tests**
   ```bash
   anchor test
   ```

7. **Deploy to devnet**
   ```bash
   solana config set --url devnet
   solana airdrop 2  # Get devnet SOL
   anchor deploy
   ```

---

## 🧪 Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test --skip-build tests/patient.test.ts

# Run with detailed logs
RUST_LOG=debug anchor test
```

---

## 📝 Usage Examples

### Initialize Patient Account
```rust
// Patient registers on the platform
initialize_patient(
    patient_wallet: Pubkey,
    name: String,
    date_of_birth: i64,
)
```

### Grant Access to Doctor
```rust
// Patient grants a doctor access to specific record types
grant_access(
    patient: Pubkey,
    provider: Pubkey,
    role: Role::Doctor,
    record_types: vec![RecordType::GeneralMedical, RecordType::LabResults],
    expiration: Some(timestamp + 30_days),
)
```

### Create Medical Record
```rust
// Doctor creates a new medical record
create_record(
    patient: Pubkey,
    provider: Pubkey,
    record_type: RecordType::Prescription,
    data_hash: String,      // Hash of encrypted off-chain data
    ipfs_cid: String,       // IPFS content identifier
)
```

### Emergency Access
```rust
// Emergency responder accesses patient records
emergency_access(
    responder: Pubkey,
    patient: Pubkey,
    justification: String,  // "Car accident, unconscious patient"
)
```

### Audit Access Logs
```rust
// Anyone can verify access history on-chain
get_audit_logs(
    patient: Pubkey,
    from_timestamp: i64,
    to_timestamp: i64,
)
```

---

## 🔐 Security Considerations

- **Private Keys**: Patients must securely store their Solana wallet keys
- **Off-Chain Security**: PostgreSQL must be properly secured and encrypted
- **Access Control**: All on-chain instructions verify permissions
- **Emergency Access**: Requires justification and creates permanent audit trail
- **Data Encryption**: All off-chain medical data is encrypted at rest
- **Transport Security**: TLS/SSL for all API communications

---

## 🗺️ Roadmap

### Phase 1: Core Protocol (Current)
- ✅ Project initialization
- 🔄 Smart contract development
- 🔄 Basic access control
- 🔄 Audit logging system

### Phase 2: Enhanced Features
- ⏳ Emergency access system
- ⏳ Time-based permissions
- ⏳ Multi-signature for sensitive records
- ⏳ Comprehensive testing

### Phase 3: Backend Integration
- ⏳ PostgreSQL integration
- ⏳ Encryption key management
- ⏳ REST API development
- ⏳ WebSocket for real-time notifications

### Phase 4: Frontend Development
- ⏳ React web application
- ⏳ Patient dashboard
- ⏳ Provider interface
- ⏳ Wallet integration

### Phase 5: Production Ready
- ⏳ Security audit
- ⏳ Performance optimization
- ⏳ Documentation
- ⏳ Mainnet deployment

### Phase 6: Advanced Features
- ⏳ Token economics
- ⏳ AI-powered insights
- ⏳ Mobile applications
- ⏳ Interoperability standards (FHIR)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the APACHE 2.0 License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact

**Project Maintainer**: StaySafe020  
**Repository**: [https://github.com/StaySafe020/CypherMed](https://github.com/StaySafe020/CypherMed)

---

## ⚠️ Disclaimer

This is experimental software for healthcare data management. Always ensure compliance with local healthcare regulations (HIPAA, GDPR, etc.) and conduct thorough security audits before production use. Not intended for production medical use without proper security audits and regulatory approval.

---

## 🙏 Acknowledgments

- Solana Foundation for the high-performance blockchain
- Anchor Framework team for excellent developer tools
- Open-source healthcare community
- All contributors and supporters of decentralized healthcare

---

**Built with ❤️ on Solana**
