import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

// Create a record
router.post("/", async (req: Request, res: Response) => {
  try {
    const { patientId, recordType, dataHash, storagePath, metadata, accessor } = req.body;
    if (!patientId || !recordType || !dataHash) {
      return res.status(400).json({ error: "patientId, recordType and dataHash are required" });
    }

    const record = await prisma.record.create({
      data: {
        patientId,
        recordType,
        dataHash,
        storagePath: storagePath ?? null,
        metadata: metadata ?? null,
      },
    });

    // create audit event
    await prisma.auditEvent.create({
      data: {
        patientId,
        recordId: record.id,
        accessor: accessor ?? "system",
        action: "create",
        success: true,
        metadata: { note: "Record created via API" },
      },
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// List records (optionally filter by patientId)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { patientId, includeDeleted } = req.query;
    const where: any = {};
    if (patientId) where.patientId = String(patientId);

    let records = await prisma.record.findMany({ where, orderBy: { createdAt: "desc" } });

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

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get a single record (view) — also logs a view audit event
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessor } = req.query;
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: "Record not found" });

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

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Update a record (partial)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dataHash, storagePath, metadata, accessor } = req.body;
    const existing = await prisma.record.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Record not found" });

    const updated = await prisma.record.update({
      where: { id },
      data: {
        dataHash: dataHash ?? existing.dataHash,
        storagePath: storagePath ?? existing.storagePath,
        metadata: metadata ?? existing.metadata,
      },
    });

    await prisma.auditEvent.create({
      data: {
        patientId: updated.patientId,
        recordId: updated.id,
        accessor: accessor ?? "system",
        action: "update",
        success: true,
        metadata: { note: "Record updated via API" },
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Soft-delete a record by adding metadata.deleted = true
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessor } = req.body;
    const existing = await prisma.record.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Record not found" });

    const newMetadata = { ...(existing.metadata as any || {}), deleted: true, deletedAt: new Date().toISOString() };

    const updated = await prisma.record.update({ where: { id }, data: { metadata: newMetadata } });

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

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
