import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter for medical documents
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types for medical records
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/dicom", // Medical imaging
    "text/plain",
    "application/json",
    "application/xml",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

/**
 * Get file path for a stored file
 */
export function getFilePath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}

/**
 * Check if file exists
 */
export function fileExists(filename: string): boolean {
  return fs.existsSync(getFilePath(filename));
}

/**
 * Delete a file from storage
 */
export function deleteFile(filename: string): boolean {
  try {
    const filePath = getFilePath(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete file ${filename}:`, error);
    return false;
  }
}

/**
 * Read file contents as buffer
 */
export function readFile(filename: string): Buffer {
  const filePath = getFilePath(filename);
  return fs.readFileSync(filePath);
}

/**
 * Save buffer to file
 */
export function saveFile(filename: string, data: Buffer): string {
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, data);
  return filename;
}

/**
 * Get file metadata
 */
export function getFileMetadata(filename: string) {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const stats = fs.statSync(filePath);
  return {
    filename,
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    extension: path.extname(filename),
  };
}
