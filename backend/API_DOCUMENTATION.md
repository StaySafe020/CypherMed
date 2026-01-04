# CypherMed API Endpoints

## Access Requests API

### Create Access Request
```bash
POST /api/access-requests
Content-Type: application/json

{
  "patientId": "uuid",
  "requester": "wallet_address",
  "role": "Doctor|Hospital|Insurer|EmergencyResponder",
  "reason": "Need access for treatment",
  "expiresAt": "2026-01-15T00:00:00Z" (optional)
}
```

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
- `Immunization`
