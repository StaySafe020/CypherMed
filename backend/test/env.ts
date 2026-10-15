// Loaded before the app modules: they read these variables when they are imported.
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-with-at-least-32-characters";
process.env.SIWX_ALLOWED_ORIGINS = "http://localhost:3001";
// The suite signs in many times from one address; the limiter itself is tested separately.
process.env.AUTH_RATE_LIMIT_PER_MINUTE = "1000";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must point to a migrated test database (see backend/README.md)"
  );
}
