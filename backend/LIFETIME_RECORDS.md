# Lifetime Medical Records System

## 🎯 Overview

CypherMed now supports **birth-to-lifetime** medical record management, ensuring no one loses their health history. Records start at birth and follow patients throughout their lives.

---

## ✨ Key Features

### 1. **Birth Registration**
- Hospital registers newborn with birth certificate ID
- Guardian (parent) automatically assigned
- First medical record created atomically
- Temporary wallet until child can manage their own

### 2. **Guardian Management**
- Parents/guardians control minor's medical records
- Permissions: view, create, approve access requests
- Auto-expires when child turns 18
- Multiple guardians supported (both parents, legal guardian)

### 3. **Age-Based Control Transfer**
- Guardian has full control (0-17 years)
- At 18: automatic transfer to patient
- Guardian access revoked, patient takes ownership
- Audit trail of transfer event

### 4. **Family Linking**
- Parents can be patients in the system too
- Family medical history tracking
- Sibling records linkable for hereditary conditions

---

## 📡 API Endpoints

### Birth Registration

**Register a newborn**
\`\`\`bash
POST /api/birth-registrations
Content-Type: application/json

{
  "birthCertificateId": "BC-2026-001234",
  "childName": "Emma Johnson",
  "birthDate": "2026-01-15T08:30:00Z",
  "birthPlace": "City Hospital, New York",
  "birthWeight": 3200,  // grams
  "birthLength": 49.5,  // cm
  "motherName": "Sarah Johnson",
  "fatherName": "Michael Johnson",
  "attendingPhysician": "Dr. Smith",
  "guardianWallet": "parent_wallet_address",
  "guardianRelationship": "parent",
  "registeredBy": "hospital_wallet_address"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "patient": {
    "id": "patient_uuid",
    "wallet": "birth_temp_BC-2026-001234",
    "name": "Emma Johnson",
    "dob": "2026-01-15T08:30:00Z",
    "isMinor": true,
    "birthCertificate": "BC-2026-001234"
  },
  "birthRegistration": { ... },
  "guardian": {
    "guardianWallet": "parent_wallet_address",
    "relationship": "parent",
    "expiresAt": "2044-01-15T00:00:00Z"
  },
  "birthRecord": { ... }
}
\`\`\`

---

### Guardian Management

**Assign guardian to existing minor**
\`\`\`bash
POST /api/guardians
{
  "patientId": "patient_uuid",
  "guardianWallet": "guardian_wallet",
  "relationship": "parent",  // parent, legal_guardian, foster_parent
  "canApprove": true,
  "canView": true,
  "canCreate": true
}
\`\`\`

**Get all guardians for a patient**
\`\`\`bash
GET /api/guardians/patient/:patientId
\`\`\`

**Get all wards for a guardian**
\`\`\`bash
GET /api/guardians/wards/:guardianWallet
\`\`\`

**Revoke guardian access**
\`\`\`bash
POST /api/guardians/:id/revoke
{
  "revokedBy": "court_order_system"
}
\`\`\`

**Transfer control to patient (at 18)**
\`\`\`bash
POST /api/guardians/transfer/:patientId
\`\`\`

---

### Wallet Assignment

**Assign wallet when minor gets their own**
\`\`\`bash
PATCH /api/birth-registrations/:patientId/assign-wallet
{
  "wallet": "patient_new_wallet_address"
}
\`\`\`

---

## 🔄 Lifetime Record Flow

### Birth (Age 0)
1. Hospital calls `/api/birth-registrations` with birth certificate
2. System creates:
   - Patient account (isMinor=true, temp wallet)
   - Birth registration record
   - Guardian link (parent)
   - First medical record (BirthCertificate type)
   - Audit event
3. Guardian wallet receives notification

### Childhood (Age 0-17)
- Guardian approves all access requests
- Guardian can view/create records
- Immunization records added by pediatrician
- School health records linked
- Patient has read-only access (optional, via guardian)

### Transition (Age 18)
1. System calls `/api/guardians/transfer/:patientId`
2. Patient marked as `isMinor=false`
3. All guardians auto-revoked
4. Patient receives full control
5. Audit trail created

### Adulthood (Age 18+)
- Patient approves own access requests
- Patient creates/manages own records
- Guardian access removed
- Lifetime medical history intact

---

## 📊 Database Schema

### Patient (Extended)
\`\`\`sql
- birthCertificate: string (birth cert ID)
- nationalId: string (SSN or national health ID)
- isMinor: boolean
- guardianTransferredAt: timestamp
- guardians: Guardian[]
- wards: Guardian[] (if they are a guardian to others)
\`\`\`

### Guardian
\`\`\`sql
- patientId: UUID (the minor)
- guardianWallet: string
- relationship: "parent" | "legal_guardian" | "foster_parent"
- canApprove: boolean
- canView: boolean
- canCreate: boolean
- isActive: boolean
- expiresAt: timestamp (18th birthday)
- revokedAt: timestamp
\`\`\`

### BirthRegistration
\`\`\`sql
- patientId: UUID
- birthCertificateId: string (unique)
- birthDate: timestamp
- birthPlace: string
- birthWeight: float (grams)
- birthLength: float (cm)
- motherName: string
- fatherName: string
- attendingPhysician: string
- registeredBy: string (hospital wallet)
\`\`\`

---

## 🛡️ Security & Privacy

- ✅ **Birth records encrypted** in PostgreSQL
- ✅ **Guardian permissions** granular (view/create/approve)
- ✅ **Auto-expiration** at age 18 prevents stale access
- ✅ **Audit trail** of all guardian actions
- ✅ **Immutable birth certificate** on blockchain (future)

---

## 🧪 Testing Example

\`\`\`bash
# 1. Register a birth
curl -X POST http://localhost:3000/api/birth-registrations \\
  -H "Content-Type: application/json" \\
  -d '{
    "birthCertificateId": "BC-TEST-2026-001",
    "childName": "Test Baby",
    "birthDate": "2026-01-25T10:00:00Z",
    "birthPlace": "Test Hospital",
    "birthWeight": 3500,
    "guardianWallet": "parent_test_wallet",
    "registeredBy": "hospital_wallet"
  }'

# 2. Get guardians for the baby
curl "http://localhost:3000/api/guardians/patient/PATIENT_ID"

# 3. Get all wards for the parent
curl "http://localhost:3000/api/guardians/wards/parent_test_wallet"

# 4. Transfer control when they turn 18
curl -X POST "http://localhost:3000/api/guardians/transfer/PATIENT_ID"
\`\`\`

---

## 🚀 Next Steps

- [ ] Social recovery for lost wallets
- [ ] Immunization tracking module
- [ ] School health record integration
- [ ] Multi-sig for critical minors (court-ordered)
- [ ] International birth certificate standards (HL7 FHIR)
