# CypherMed Backend - Testing Guide

## 🚀 Quick Start

1. **Start the server:**
```bash
cd backend
npm run dev
```

2. **Health check:**
```bash
curl http://localhost:3000/health
```

## 📝 Example Test Workflows

### 1. Register a Patient

```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "patient_wallet_001",
    "name": "Alice Smith",
    "dob": "1992-08-20",
    "emergencyContact": "+1234567890"
  }' | jq .
```

**Response includes:**
- Patient details
- `encryptionKey` - **Save this!** You'll need it to encrypt/decrypt records

### 2. Create Encrypted Medical Record

```bash
# Save the encryption key from step 1
ENCRYPTION_KEY="YOUR_ENCRYPTION_KEY_HERE"
PATIENT_ID="YOUR_PATIENT_ID_HERE"

curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"recordType\": \"LabResult\",
    \"data\": {
      \"test\": \"Blood Panel\",
      \"bloodType\": \"A+\",
      \"cholesterol\": 180,
      \"glucose\": 95
    },
    \"encryptionKey\": \"$ENCRYPTION_KEY\",
    \"accessor\": \"doctor_wallet_123\"
  }" | jq .
```

### 3. Upload Medical Document

```bash
# Create a test file
echo "Medical Report Content" > test-report.txt

curl -X POST http://localhost:3000/api/records \
  -F "patientId=$PATIENT_ID" \
  -F "recordType=General" \
  -F "file=@test-report.txt" \
  -F "encryptionKey=$ENCRYPTION_KEY" \
  -F "accessor=doctor_wallet_123" | jq .
```

### 4. Retrieve and Decrypt Record

```bash
RECORD_ID="YOUR_RECORD_ID_HERE"

curl "http://localhost:3000/api/records/$RECORD_ID?accessor=doctor_wallet_123&decryptionKey=$ENCRYPTION_KEY" | jq .
```

### 5. Grant Access to Provider

```bash
curl -X POST http://localhost:3000/api/patients/$PATIENT_ID/grant-access \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "specialist_wallet_456",
    "role": "Doctor",
    "allowedTypes": "all",
    "expiresAt": "2026-12-31T23:59:59Z",
    "accessor": "patient_wallet_001"
  }' | jq .
```

### 6. Search for Patients

```bash
curl -X POST http://localhost:3000/api/patients/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "alice",
    "searchBy": "name",
    "limit": 10
  }' | jq .
```

### 7. Create Access Request

```bash
curl -X POST http://localhost:3000/api/access-requests \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "'$PATIENT_ID'",
    "requester": "new_doctor_wallet_789",
    "role": "Doctor",
    "reason": "Consultation for treatment plan"
  }' | jq .
```

### 8. View Patient with All Details

```bash
curl "http://localhost:3000/api/patients/$PATIENT_ID?includeRecords=true&includeAccessGrants=true" | jq .
```

### 9. View Audit Logs

```bash
curl "http://localhost:3000/api/audit-logs?patientId=$PATIENT_ID&limit=20" | jq .
```

### 10. Update Patient Profile

```bash
curl -X PATCH http://localhost:3000/api/patients/$PATIENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "emergencyContact": "+0987654321",
    "accessor": "patient_wallet_001"
  }' | jq .
```

### 11. Download Record File

```bash
curl "http://localhost:3000/api/records/$RECORD_ID/download?accessor=doctor_wallet_123" \
  -o downloaded-file.txt
```

### 12. Revoke Provider Access

```bash
GRANT_ID="YOUR_GRANT_ID_HERE"

curl -X DELETE http://localhost:3000/api/patients/$PATIENT_ID/revoke-access/$GRANT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "accessor": "patient_wallet_001"
  }' | jq .
```

## 🔐 Testing Encryption

### Verify Encryption Works

```bash
# 1. Create encrypted record
RESPONSE=$(curl -s -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"recordType\": \"Prescription\",
    \"data\": {\"medication\": \"Test Drug\", \"dosage\": \"100mg\"},
    \"encryptionKey\": \"$ENCRYPTION_KEY\"
  }")

echo "$RESPONSE" | jq .

# 2. Try to retrieve WITHOUT decryption key (data should be encrypted)
RECORD_ID=$(echo "$RESPONSE" | jq -r .id)
curl "http://localhost:3000/api/records/$RECORD_ID?accessor=test" | jq .

# 3. Retrieve WITH decryption key (data should be readable)
curl "http://localhost:3000/api/records/$RECORD_ID?accessor=test&decryptionKey=$ENCRYPTION_KEY" | jq .
```

## 📊 Testing Record Types

```bash
# Test all supported record types
for TYPE in General Prescription LabResult VisitSummary Immunization Imaging Allergy Surgery Diagnosis; do
  echo "Creating $TYPE record..."
  curl -s -X POST http://localhost:3000/api/records \
    -H "Content-Type: application/json" \
    -d "{
      \"patientId\": \"$PATIENT_ID\",
      \"recordType\": \"$TYPE\",
      \"data\": {\"type\": \"$TYPE\", \"note\": \"Test record\"},
      \"encryptionKey\": \"$ENCRYPTION_KEY\"
    }" | jq -c '{recordType, id}'
done
```

## 🔍 Testing Filters & Pagination

```bash
# Get records by type
curl "http://localhost:3000/api/records?patientId=$PATIENT_ID&recordType=Prescription" | jq .

# Get records with pagination
curl "http://localhost:3000/api/records?patientId=$PATIENT_ID&limit=5&offset=0" | jq .

# Get all patients with search
curl "http://localhost:3000/api/patients?search=alice&limit=10" | jq .
```

## 🧪 Testing File Uploads

```bash
# Create test files
echo "Lab Report Data" > lab-report.txt
echo '{"test": "X-Ray", "result": "Normal"}' > xray-result.json

# Upload text file
curl -X POST http://localhost:3000/api/records \
  -F "patientId=$PATIENT_ID" \
  -F "recordType=LabResult" \
  -F "file=@lab-report.txt" \
  -F "accessor=doctor_wallet" | jq .

# Upload JSON file with encryption
curl -X POST http://localhost:3000/api/records \
  -F "patientId=$PATIENT_ID" \
  -F "recordType=Imaging" \
  -F "file=@xray-result.json" \
  -F "encryptionKey=$ENCRYPTION_KEY" \
  -F "accessor=radiologist_wallet" | jq .
```

## ✅ Full Integration Test Script

```bash
#!/bin/bash
set -e

echo "🧪 Starting CypherMed Integration Tests"

# 1. Register patient
echo "1️⃣  Registering patient..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"wallet":"test_patient","name":"Test User","dob":"1990-01-01"}')

PATIENT_ID=$(echo "$RESPONSE" | jq -r .patient.id)
ENCRYPTION_KEY=$(echo "$RESPONSE" | jq -r .encryptionKey)

echo "   ✅ Patient ID: $PATIENT_ID"

# 2. Create encrypted record
echo "2️⃣  Creating encrypted record..."
RECORD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d "{\"patientId\":\"$PATIENT_ID\",\"recordType\":\"General\",\"data\":{\"note\":\"Test\"},\"encryptionKey\":\"$ENCRYPTION_KEY\"}")

RECORD_ID=$(echo "$RECORD_RESPONSE" | jq -r .id)
echo "   ✅ Record ID: $RECORD_ID"

# 3. Retrieve and decrypt
echo "3️⃣  Retrieving encrypted record..."
DECRYPT_RESPONSE=$(curl -s "http://localhost:3000/api/records/$RECORD_ID?decryptionKey=$ENCRYPTION_KEY")
DECRYPTED=$(echo "$DECRYPT_RESPONSE" | jq .decryptedData)

if [ "$DECRYPTED" != "null" ]; then
  echo "   ✅ Decryption successful: $DECRYPTED"
else
  echo "   ❌ Decryption failed"
  exit 1
fi

# 4. Grant access
echo "4️⃣  Granting access to provider..."
curl -s -X POST http://localhost:3000/api/patients/$PATIENT_ID/grant-access \
  -H "Content-Type: application/json" \
  -d '{"provider":"test_provider","role":"Doctor","allowedTypes":"all"}' > /dev/null

echo "   ✅ Access granted"

# 5. View audit logs
echo "5️⃣  Checking audit logs..."
AUDIT_COUNT=$(curl -s "http://localhost:3000/api/audit-logs?patientId=$PATIENT_ID" | jq '.logs | length')
echo "   ✅ Found $AUDIT_COUNT audit events"

echo ""
echo "🎉 All tests passed!"
echo "   Patient ID: $PATIENT_ID"
echo "   Encryption Key: $ENCRYPTION_KEY"
```

Save this as `test.sh`, make it executable (`chmod +x test.sh`), and run it!

## 📈 Performance Testing

```bash
# Bulk create records (test performance)
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/records \
    -H "Content-Type: application/json" \
    -d "{\"patientId\":\"$PATIENT_ID\",\"recordType\":\"General\",\"data\":{\"count\":$i}}" > /dev/null &
done
wait
echo "Created 100 records"
```

## 🐛 Common Issues

### Issue: `encryptionKey` not working
**Solution:** Make sure you're using the exact key returned during patient registration.

### Issue: File upload fails
**Solution:** Check file type is allowed (PDF, JPEG, PNG, etc.) and size is under 50MB.

### Issue: "Patient not found"
**Solution:** Verify the patient ID is correct and the patient exists in the database.

### Issue: Decryption fails
**Solution:** Ensure the decryption key matches the encryption key used during record creation.

## 📝 Notes

- All dates should be in ISO 8601 format
- Encryption keys are base64 encoded
- File uploads use multipart/form-data
- JSON requests use application/json
- All endpoints return JSON responses
