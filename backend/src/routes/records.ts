import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { upload, getFilePath, fileExists, deleteFile, readFile, getFileMetadata } from "../utils/storage";
import { encrypt, decrypt, hashData } from "../utils/encryption";

const router = Router();

// Valid record types
const RECORD_TYPES = [
  "General",
  "Prescription",
  "LabResult",
  "VisitSummary",
  "Immunization",
  "Imaging",
  "Allergy",
  "Surgery",
  "Diagnosis"
];

// Validate record type
function isValidRecordType(type: string): boolean {
  return RECORD_TYPES.includes(type);
}

// Create a record with optional file upload and encryption
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { patientId, recordType, data, metadata, accessor, encryptionKey } = req.body;
    
    if (!patientId || !recordType) {
      return res.status(400).json({ error: "patientId and recordType are required" });
    }

    // Validate record type
    if (!isValidRecordType(recordType)) {
      return res.status(400).json({ 
        error: `Invalid recordType. Must be one of: ${RECORD_TYPES.join(", ")}` 
      });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    let storagePath = null;
    let dataHash = "";
    let encryptedData = null;

    // Handle file upload
    if (req.file) {
      storagePath = req.file.filename;
      
      // If encryption key provided, encrypt the file
      if (encryptionKey) {
        const fileBuffer = readFile(req.file.filename);
        encryptedData = encrypt(fileBuffer.toString("base64"), encryptionKey);
        dataHash = hashData(encryptedData);
      } else {
        // Just hash the file without encryption
        const fileBuffer = readFile(req.file.filename);
        dataHash = hashData(fileBuffer.toString("base64"));
      }
    } else if (data) {
      // Handle JSON data
      if (encryptionKey) {
        encryptedData = encrypt(JSON.stringify(data), encryptionKey);
        dataHash = hashData(encryptedData);
      } else {
        dataHash = hashData(JSON.stringify(data));
      }
    } else {
      return res.status(400).json({ error: "Either file or data must be provided" });
    }

    // Parse metadata if string
    let parsedMetadata = metadata;
    if (typeof metadata === "string") {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        parsedMetadata = { raw: metadata };
      }
    }

    // Add encrypted data and file info to metadata
    const finalMetadata = {
      ...parsedMetadata,
      encrypted: !!encryptionKey,
      encryptedData: encryptedData || undefined,
      originalData: !encryptionKey && data ? data : undefined,
      fileInfo: req.file ? {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      } : undefined,
    };

    const record = await prisma.record.create({
      data: {
        patientId,
        recordType,
        dataHash,
        storagePath: storagePath ?? null,
        metadata: finalMetadata,
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId,
        recordId: record.id,
        accessor: accessor ?? "system",
        action: "create",
        success: true,
        metadata: { 
          note: "Record created via API",
          recordType,
          encrypted: !!encryptionKey,
          hasFile: !!req.file,
        },
      },
    });

    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// List records (optionally filter by patientId and recordType)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { patientId, recordType, includeDeleted, limit, offset } = req.query;
    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    if (recordType && isValidRecordType(String(recordType))) {
      where.recordType = String(recordType);
    }

    const take = limit ? parseInt(String(limit)) : 100;
    const skip = offset ? parseInt(String(offset)) : 0;

    let records = await prisma.record.findMany({ 
      where, 
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            wallet: true,
          }
        }
      }
    });

    if (!includeDeleted || includeDeleted === "false") {
      records = records.filter((r) => {
        if (!r.metadata) return true;
        try {
          const m: any = r.metadata as any;
          return !m.deleted;
        } catch (_) {
          return true;
        }
      });
    }

    res.json({
      records,
      pagination: {
        limit: take,
        offset: skip,
        total: records.length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get a single record with decryption support
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessor, decryptionKey, includeFile } = req.query;
    
    const record = await prisma.record.findUnique({ 
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            wallet: true,
            dob: true,
          }
        }
      }
    });
    
    if (!record) return res.status(404).json({ error: "Record not found" });

    // Log view audit event
    await prisma.auditEvent.create({
      data: {
        patientId: record.patientId,
        recordId: record.id,
        accessor: (accessor as string) ?? "system",
        action: "view",
        success: true,
        metadata: { note: "Record viewed via API" },
      },
    });

    // Handle decryption if key provided
    let decryptedData = null;
    const metadata = record.metadata as any;
    
    if (decryptionKey && metadata?.encrypted && metadata?.encryptedData) {
      try {
        const decrypted = decrypt(metadata.encryptedData, String(decryptionKey));
        decryptedData = JSON.parse(decrypted);
      } catch (error) {
        return res.status(400).json({ error: "Decryption failed - invalid key" });
      }
    }

    // Include file data if requested
    let fileData = null;
    if (includeFile === "true" && record.storagePath && fileExists(record.storagePath)) {
      const fileBuffer = readFile(record.storagePath);
      fileData = {
        ...getFileMetadata(record.storagePath),
        data: fileBuffer.toString("base64"),
      };
    }

    res.json({
      ...record,
      decryptedData,
      fileData,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Update a record (partial)
router.patch("/:id", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, metadata, accessor, encryptionKey } = req.body;
    
    const existing = await prisma.record.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Record not found" });

    let storagePath = existing.storagePath;
    let dataHash = existing.dataHash;
    let updatedMetadata = existing.metadata as any || {};

    // Handle new file upload
    if (req.file) {
      // Delete old file if exists
      if (existing.storagePath && fileExists(existing.storagePath)) {
        deleteFile(existing.storagePath);
      }
      
      storagePath = req.file.filename;
      
      // Encrypt or hash new file
      const fileBuffer = readFile(req.file.filename);
      if (encryptionKey) {
        const encryptedData = encrypt(fileBuffer.toString("base64"), encryptionKey);
        dataHash = hashData(encryptedData);
        updatedMetadata.encryptedData = encryptedData;
        updatedMetadata.encrypted = true;
      } else {
        dataHash = hashData(fileBuffer.toString("base64"));
      }
      
      updatedMetadata.fileInfo = {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
    }

    // Handle data update
    if (data) {
      if (encryptionKey) {
        const encryptedData = encrypt(JSON.stringify(data), encryptionKey);
        dataHash = hashData(encryptedData);
        updatedMetadata.encryptedData = encryptedData;
        updatedMetadata.encrypted = true;
      } else {
        dataHash = hashData(JSON.stringify(data));
        updatedMetadata.originalData = data;
      }
    }

    // Merge metadata
    if (metadata) {
      const newMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      updatedMetadata = { ...updatedMetadata, ...newMeta };
    }

    const updated = await prisma.record.update({
      where: { id },
      data: {
        dataHash,
        storagePath: storagePath ?? existing.storagePath,
        metadata: updatedMetadata,
      },
    });

    await prisma.auditEvent.create({
      data: {
        patientId: updated.patientId,
        recordId: updated.id,
        accessor: accessor ?? "system",
        action: "update",
        success: true,
        metadata: { 
          note: "Record updated via API",
          hasNewFile: !!req.file,
          encrypted: !!encryptionKey,
        },
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Soft-delete a record by adding metadata.deleted = true
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessor, hardDelete } = req.body;
    
    const existing = await prisma.record.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Record not found" });

    if (hardDelete === true) {
      // Hard delete - remove file and database record
      if (existing.storagePath && fileExists(existing.storagePath)) {
        deleteFile(existing.storagePath);
      }
      
      await prisma.record.delete({ where: { id } });
      
      await prisma.auditEvent.create({
        data: {
          patientId: existing.patientId,
          recordId: existing.id,
          accessor: accessor ?? "system",
          action: "delete",
          success: true,
          metadata: { note: "Record hard-deleted via API" },
        },
      });
      
      return res.json({ ok: true, deleted: "hard" });
    }

    // Soft delete - just mark as deleted
    const newMetadata = { 
      ...(existing.metadata as any || {}), 
      deleted: true, 
      deletedAt: new Date().toISOString(),
      deletedBy: accessor ?? "system",
    };

    const updated = await prisma.record.update({ 
      where: { id }, 
      data: { metadata: newMetadata } 
    });

    await prisma.auditEvent.create({
      data: {
        patientId: updated.patientId,
        recordId: updated.id,
        accessor: accessor ?? "system",
        action: "delete",
        success: true,
        metadata: { note: "Record soft-deleted via API" },
      },
    });

    res.json({ ok: true, deleted: "soft" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Download file for a record
router.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessor } = req.query;
    
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: "Record not found" });
    
    if (!record.storagePath) {
      return res.status(404).json({ error: "No file attached to this record" });
    }
    
    if (!fileExists(record.storagePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Log download audit event
    await prisma.auditEvent.create({
      data: {
        patientId: record.patientId,
        recordId: record.id,
        accessor: (accessor as string) ?? "system",
        action: "download",
        success: true,
        metadata: { note: "File downloaded via API" },
      },
    });

    const filePath = getFilePath(record.storagePath);
    const metadata = record.metadata as any;
    const originalName = metadata?.fileInfo?.originalName || record.storagePath;
    
    res.download(filePath, originalName);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get records by type
router.get("/type/:recordType", async (req: Request, res: Response) => {
  try {
    const { recordType } = req.params;
    const { patientId, limit, offset } = req.query;
    
    if (!isValidRecordType(recordType)) {
      return res.status(400).json({ 
        error: `Invalid recordType. Must be one of: ${RECORD_TYPES.join(", ")}` 
      });
    }

    const where: any = { recordType };
    if (patientId) where.patientId = String(patientId);

    const take = limit ? parseInt(String(limit)) : 100;
    const skip = offset ? parseInt(String(offset)) : 0;

    const records = await prisma.record.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            wallet: true,
          }
        }
      }
    });

    // Filter out soft-deleted records
    const activeRecords = records.filter((r) => {
      const m: any = r.metadata as any;
      return !m?.deleted;
    });

    res.json({
      recordType,
      records: activeRecords,
      pagination: {
        limit: take,
        offset: skip,
        total: activeRecords.length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
