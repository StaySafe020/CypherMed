import crypto from "crypto";

// AES-256-GCM encryption for medical records
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derives a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypts sensitive medical data
 * @param plaintext - The data to encrypt
 * @param password - Encryption password (patient's key)
 * @returns Encrypted data as base64 string with salt, iv, and auth tag
 */
export function encrypt(plaintext: string, password: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "hex")
    ]);
    
    return combined.toString("base64");
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypts encrypted medical data
 * @param encryptedData - Base64 encrypted data
 * @param password - Decryption password (patient's key)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    // Parse the combined buffer
    const combined = Buffer.from(encryptedData, "base64");
    
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.slice(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Generates a SHA-256 hash of data for integrity verification
 */
export function hashData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generates a secure random encryption key for a patient
 */
export function generatePatientKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * Validates if encrypted data can be decrypted with given password
 */
export function validateEncryption(
  encryptedData: string,
  password: string
): boolean {
  try {
    decrypt(encryptedData, password);
    return true;
  } catch {
    return false;
  }
}
