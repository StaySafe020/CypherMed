-- Seed SQL for CypherMed (run after migrations or will be picked up by docker entrypoint on first init)
-- NOTE: This inserts into the `patient` table that Prisma will create during migrations.

-- Replace table name/casing if your Prisma migrations generated a different table name.

INSERT INTO patient (wallet, name, dob, "emergencyContact", "createdAt", "updatedAt")
VALUES (
  'TEST_WALLET_PUBKEY',
  'Test Patient',
  '1990-01-01T00:00:00Z',
  NULL,
  now(),
  now()
)
ON CONFLICT DO NOTHING;
