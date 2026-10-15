# CypherMed API Endpoints

## Auth API (SIWX)

Wallet sign-in with SIWX (Sign In With Solana, CAIP-122). Protected routes take `Authorization: Bearer <accessToken>`.

### Get a Nonce
```http
POST /api/auth/nonce
```
Returns `{ "nonce": "..." }`. The nonce works once and expires after 5 minutes. `/nonce` and `/verify-signature` each accept `AUTH_RATE_LIMIT_PER_MINUTE` requests (default 10) per client IP and minute, then answer `429` with `Retry-After`.

### Verify a Signed Message
```http
POST /api/auth/verify-signature
Content-Type: application/json

{
  "message": "localhost:3001 wants you to sign in with your Solana account: ...",
  "signature": "<base58 signature>"
}
```
The message must use a nonce from `/nonce`, one of the `SIWX_ALLOWED_ORIGINS` as its domain and URI, Solana devnet, and an expiration time within 7 days. Returns `{ accessToken, refreshToken, user }` with `user.role` from the server (`patient`, or the wallet's provider role); both tokens are bound to a server session. Errors: `400` (missing fields), `401` (wrong domain or network, invalid signature, nonce expired or already used).

### Refresh the Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "..." }
```
Returns `{ accessToken }` while the session is active, with the role read again from the database; `401` after logout or expiry.

### Get the Signed-In Profile
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```
Returns `{ wallet, role, provider }`: the role the server has on record (`patient` unless the wallet registered as a provider) and the provider registration, or `null`.

### Register as a Provider
```http
POST /api/auth/provider
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "role": "doctor|nurse|hospital_admin|insurer",
  "name": "Dr. Jane Doe",
  "email": "jane@example.com",
  "licenseNumber": "MD-12345",
  "specialty": "Cardiology",
  "institution": "City Hospital"
}
```
Registers the signed-in wallet (taken from the access token) as a provider with `verificationStatus: "pending"` (a provider can request patient access only once it is `"verified"`), and returns `{ accessToken, refreshToken, provider }` with the provider role. A wallet or verification status in the body is ignored. Errors: `400` (unknown role, missing name), `409` (the wallet is already registered).

### Log Out
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```
Revokes the session: its access and refresh tokens stop working at once. If the app cannot reach this endpoint, it keeps the user signed in and shows the error instead of clearing the session locally.

## Patients API

### List All Patients
```bash
GET /api/patients?limit=100&offset=0
GET /api/patients?search=john&limit=20
GET /api/patients?wallet=wallet_address
```

Response:
```json
{
  "patients": [...],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 150
  }
}
```

### Get Patient by ID or Wallet
```bash
GET /api/patients/:id
GET /api/patients/:id?includeRecords=true&includeAccessGrants=true
```

Response includes patient info, optionally with records and access grants.

### Register New Patient
```bash
POST /api/patients
Content-Type: application/json

{
  "wallet": "wallet_address",
  "name": "John Doe",
  "dob": "1990-01-15",
  "emergencyContact": "+1234567890" (optional)
}
```

Response:
```json
{
  "patient": {...},
  "encryptionKey": "base64_encoded_key"
}
```
**Important**: Store the encryptionKey securely - it's needed to decrypt medical records.

### Update Patient Profile
```bash
PATCH /api/patients/:id
Content-Type: application/json

{
  "name": "John Smith",
  "emergencyContact": "+0987654321",
  "accessor": "wallet_address" (optional)
}
```

### Delete Patient Account
```bash
DELETE /api/patients/:id
Content-Type: application/json

{
  "confirm": true,
  "accessor": "wallet_address" (optional)
}
```

### Grant Access to Provider (Consent Management)
```bash
POST /api/patients/:id/grant-access
Content-Type: application/json

{
  "provider": "provider_wallet_address",
  "role": "Doctor|Hospital|Insurer|EmergencyResponder",
  "allowedTypes": "all|Prescription|LabResult|..." (optional, default: "all"),
  "expiresAt": "2026-06-01T00:00:00Z" (optional),
  "accessor": "patient_wallet" (optional)
}
```

### Revoke Provider Access
```bash
DELETE /api/patients/:id/revoke-access/:grantId
Content-Type: application/json

{
  "accessor": "patient_wallet" (optional)
}
```

### Get Patient's Access Grants
```bash
GET /api/patients/:id/access-grants
GET /api/patients/:id/access-grants?active=true
```

Response:
```json
{
  "grants": [
    {
      "id": "grant_uuid",
      "provider": "provider_wallet",
      "role": "Doctor",
      "allowedTypes": "all",
      "grantedAt": "2026-01-05T10:00:00Z",
      "expiresAt": null
    }
  ]
}
```

### Search Patients (for Providers)
```bash
POST /api/patients/search
Content-Type: application/json

{
  "query": "john",
  "searchBy": "name|wallet" (optional),
  "limit": 20,
  "offset": 0
}
```

Response:
```json
{
  "results": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 5
  }
}
```

---

## Records API

### Create Medical Record
```bash
# With JSON data
POST /api/records
Content-Type: application/json

{
  "patientId": "uuid",
  "recordType": "Prescription|LabResult|General|...",
  "data": { "diagnosis": "...", "treatment": "..." },
  "encryptionKey": "patient_encryption_key" (optional),
  "metadata": { "notes": "..." } (optional),
  "accessor": "wallet_address" (optional)
}

# With file upload
POST /api/records
Content-Type: multipart/form-data

patientId: uuid
recordType: LabResult
file: <binary file data>
encryptionKey: patient_key (optional)
accessor: wallet_address (optional)
```

### List Records
```bash
GET /api/records?patientId=uuid&limit=100&offset=0
GET /api/records?patientId=uuid&recordType=Prescription
GET /api/records?includeDeleted=true
```

Response:
```json
{
  "records": [...],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 45
  }
}
```

### Get Single Record
```bash
GET /api/records/:id?accessor=wallet
GET /api/records/:id?accessor=wallet&decryptionKey=key&includeFile=true
```

Response includes record details, optionally with decrypted data and file content.

### Update Record
```bash
# Update with new data
PATCH /api/records/:id
Content-Type: application/json

{
  "data": { "updated": "data" },
  "encryptionKey": "patient_key" (optional),
  "accessor": "wallet_address" (optional)
}

# Update with new file
PATCH /api/records/:id
Content-Type: multipart/form-data

file: <binary file data>
encryptionKey: patient_key (optional)
accessor: wallet_address (optional)
```

### Delete Record
```bash
# Soft delete (default)
DELETE /api/records/:id
Content-Type: application/json

{
  "accessor": "wallet_address" (optional)
}

# Hard delete (removes file and database entry)
DELETE /api/records/:id
Content-Type: application/json

{
  "hardDelete": true,
  "accessor": "wallet_address" (optional)
}
```

### Download Record File
```bash
GET /api/records/:id/download?accessor=wallet_address
```

Downloads the file attached to the record (if any).

### Get Records by Type
```bash
GET /api/records/type/:recordType?patientId=uuid&limit=100
```

Returns all records of a specific type.

---

## Notifications API

### Get All Notifications
```bash
GET /api/notifications?wallet=patient_wallet&limit=50&offset=0
GET /api/notifications?wallet=patient_wallet&unreadOnly=true
GET /api/notifications?wallet=patient_wallet&type=access_request&priority=high
```

Response:
```json
{
  "notifications": [...],
  "pagination": {
    "total": 15,
    "unreadCount": 5,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Single Notification
```bash
GET /api/notifications/:id
```

### Mark Notification as Read
```bash
PATCH /api/notifications/:id/read
```

### Mark All as Read
```bash
POST /api/notifications/mark-all-read
Content-Type: application/json

{
  "wallet": "patient_wallet"
}
```

### Delete Notification
```bash
DELETE /api/notifications/:id
```

### Delete All Read Notifications
```bash
DELETE /api/notifications
Content-Type: application/json

{
  "wallet": "patient_wallet"
}
```

### Get Notification Statistics
```bash
GET /api/notifications/stats/summary?wallet=patient_wallet
```

Response:
```json
{
  "summary": {
    "total": 50,
    "unread": 5,
    "read": 45
  },
  "byType": [
    { "type": "access_request", "count": 15 }
  ],
  "byPriority": [
    { "priority": "high", "count": 10 }
  ],
  "recentNotifications": [...]
}
```

---

## 🔌 WebSocket Real-Time Notifications

### Connect to WebSocket
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('authenticate', 'patient_wallet_address');
});

socket.on('authenticated', (data) => {
  console.log('Connected:', data);
});

socket.on('notification', (notification) => {
  // Real-time notification received
  console.log(notification.title, notification.message);
});

socket.on('unread_count', (data) => {
  // Unread count updated
  console.log('Unread:', data.count);
});
```

### WebSocket Events
- `authenticate` - Authenticate with wallet address
- `authenticated` - Confirmation of authentication
- `notification` - New notification received
- `unread_count` - Unread notification count
- `mark_read` - Mark notification as read
- `mark_all_read` - Mark all as read

---

## Access Requests API

### Create Access Request
```bash
POST /api/access-requests
Content-Type: application/json

{
  "patientId": "uuid",
  "reason": "Need access for treatment",
  "expiresAt": "2026-01-15T00:00:00Z" (optional)
}
```
The requester is the signed-in wallet and its role comes from its provider registration (`POST /api/auth/provider`); a `requester` or `role` in the body is ignored. Wallets that are not registered providers get `403`, and so do providers whose `verificationStatus` is not `"verified"` (pending or rejected registrations).

### List Access Requests
```bash
GET /api/access-requests?patientId=uuid&status=pending
GET /api/access-requests?requester=wallet_address
```

### Get Specific Access Request
```bash
GET /api/access-requests/:id
```

### Approve Access Request
```bash
POST /api/access-requests/:id/approve
Content-Type: application/json

{
  "allowedTypes": "all|Prescription|LabResult|VisitSummary",
  "grantExpiresAt": "2026-02-01T00:00:00Z" (optional),
  "approvedBy": "wallet_address" (optional)
}
```

### Deny Access Request
```bash
POST /api/access-requests/:id/deny
Content-Type: application/json

{
  "reason": "Not authorized",
  "deniedBy": "wallet_address" (optional)
}
```

### Batch Approve Requests
```bash
POST /api/access-requests/batch/approve
Content-Type: application/json

{
  "requestIds": ["uuid1", "uuid2"],
  "allowedTypes": "all",
  "approvedBy": "wallet_address"
}
```

### Cancel Access Request
```bash
DELETE /api/access-requests/:id
Content-Type: application/json

{
  "cancelledBy": "wallet_address"
}
```

---

## Audit Logs API

### Query Audit Logs
```bash
GET /api/audit-logs?patientId=uuid&accessor=wallet&action=view&success=true
GET /api/audit-logs?startDate=2026-01-01&endDate=2026-01-31&limit=50&offset=0
```

### Get Specific Audit Event
```bash
GET /api/audit-logs/:id
```

### Analytics Overview
```bash
GET /api/audit-logs/analytics/overview?patientId=uuid
GET /api/audit-logs/analytics/overview?startDate=2026-01-01&endDate=2026-01-31
```

Response:
```json
{
  "summary": {
    "totalEvents": 150,
    "successfulEvents": 145,
    "failedEvents": 5,
    "successRate": "96.67%",
    "uniqueAccessors": 12
  },
  "actionBreakdown": [
    { "action": "view", "count": 80 },
    { "action": "create", "count": 30 }
  ],
  "topAccessors": [
    { "accessor": "doctor_wallet", "count": 50 }
  ],
  "recentFailures": [...]
}
```

### Timeline Analytics
```bash
GET /api/audit-logs/analytics/timeline?groupBy=day&startDate=2026-01-01
GET /api/audit-logs/analytics/timeline?groupBy=hour&patientId=uuid
```

Response:
```json
{
  "timeline": [
    {
      "timestamp": "2026-01-04",
      "total": 25,
      "successful": 24,
      "failed": 1,
      "actions": {
        "view": 15,
        "create": 8,
        "update": 2
      }
    }
  ]
}
```

### Export Audit Logs (CSV)
```bash
GET /api/audit-logs/export/csv?patientId=uuid&startDate=2026-01-01
```

Downloads CSV file with all audit events.

### Export Audit Logs (JSON)
```bash
GET /api/audit-logs/export/json?patientId=uuid&startDate=2026-01-01
```

Downloads JSON file with all audit events.

### Compliance Report
```bash
GET /api/audit-logs/compliance/report?patientId=uuid
GET /api/audit-logs/compliance/report?startDate=2026-01-01&endDate=2026-01-31
```

Response:
```json
{
  "generatedAt": "2026-01-04T12:00:00Z",
  "period": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  },
  "patientId": "uuid",
  "metrics": {
    "totalAccessEvents": 150,
    "emergencyAccessEvents": 2,
    "unauthorizedAttempts": 5,
    "dataModifications": 30,
    "accessGrantsIssued": 8,
    "accessRevocations": 2
  },
  "compliance": {
    "hipaaCompliant": true,
    "auditTrailComplete": true,
    "encryptionEnabled": true
  }
}
```

---

## Query Parameters Reference

### Common Filters
- `patientId`: Filter by patient UUID
- `accessor`: Filter by accessor wallet address
- `action`: Filter by action type (view, create, update, delete, etc.)
- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

### Actions
- `view` / `access_record`
- `create`
- `update`
- `delete`
- `grant_access`
- `revoke_access`
- `request_access`
- `approve_access_request`
- `deny_access_request`
- `emergency_access`

### Roles
- `Patient`
- `Doctor`
- `Hospital`
- `Insurer`
- `EmergencyResponder`

### Record Types
- `General`
- `Prescription`
- `LabResult`
- `VisitSummary`
- `Immunization`- `Imaging`
- `Allergy`
- `Surgery`
- `Diagnosis`

---

## 🔐 Encryption & Security

### How Encryption Works

1. **Patient Registration**: Each patient receives a unique encryption key
2. **Storing Records**: Medical data is encrypted with the patient's key before storage
3. **Accessing Records**: Authorized providers need the decryption key to view sensitive data
4. **File Security**: Uploaded files can be encrypted and stored securely

### Using Encryption

**Create Encrypted Record:**
```bash
POST /api/records
Content-Type: application/json

{
  "patientId": "uuid",
  "recordType": "LabResult",
  "data": { "bloodType": "O+", "cholesterol": 180 },
  "encryptionKey": "patient_encryption_key_from_registration"
}
```

**Retrieve and Decrypt:**
```bash
GET /api/records/:id?decryptionKey=patient_encryption_key
```

### Security Best Practices

- ✅ Store patient encryption keys securely (never in plaintext)
- ✅ Use HTTPS for all API communications
- ✅ Validate wallet signatures for authentication
- ✅ Log all access attempts for audit compliance
- ✅ Implement rate limiting to prevent abuse
- ✅ Regularly rotate encryption keys
- ✅ Back up encrypted data securely

---

## 📋 Complete Example Workflow

### 1. Register a Patient
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "5XYZ...abc",
    "name": "Jane Doe",
    "dob": "1985-03-20"
  }'

# Response includes encryptionKey - store it!
```

### 2. Create a Medical Record
```bash
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_uuid",
    "recordType": "Prescription",
    "data": {
      "medication": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "3x daily",
      "duration": "7 days"
    },
    "encryptionKey": "patient_encryption_key",
    "accessor": "doctor_wallet"
  }'
```

### 3. Provider Requests Access
```bash
curl -X POST http://localhost:3000/api/access-requests \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_uuid",
    "requester": "specialist_wallet",
    "role": "Doctor",
    "reason": "Specialist consultation required"
  }'
```

### 4. Patient Approves Access
```bash
curl -X POST http://localhost:3000/api/access-requests/:request_id/approve \
  -H "Content-Type: application/json" \
  -d '{
    "allowedTypes": "all",
    "grantExpiresAt": "2026-12-31T23:59:59Z",
    "approvedBy": "patient_wallet"
  }'
```

### 5. Provider Views Records
```bash
curl "http://localhost:3000/api/records?patientId=patient_uuid&accessor=specialist_wallet"
```

### 6. View Audit Trail
```bash
curl "http://localhost:3000/api/audit-logs?patientId=patient_uuid&limit=50"
```

---

## 🚀 Quick Start

1. **Start the backend:**
```bash
cd backend
npm install
npm run dev
```

2. **Health Check:**
```bash
curl http://localhost:3000/health
```

3. **Create your first patient and start building!**

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Pagination defaults: `limit=100`, `offset=0`
- All audit events are logged automatically
- Soft deletes preserve data for compliance
- Hard deletes permanently remove files and database entries
- File uploads support: PDF, JPEG, PNG, GIF, DICOM, TXT, JSON, XML
- Maximum file size: 50MB
- Encryption uses AES-256-GCM with PBKDF2 key derivation