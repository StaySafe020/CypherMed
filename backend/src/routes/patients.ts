import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { generatePatientKey } from "../utils/encryption";

const router = Router();

// List all patients with pagination and search
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, wallet, limit, offset } = req.query;
    
    const take = limit ? parseInt(String(limit)) : 100;
    const skip = offset ? parseInt(String(offset)) : 0;
    
    const where: any = {};
    
    // Search by name, wallet, or emergency contact
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { wallet: { contains: String(search), mode: "insensitive" } },
        { emergencyContact: { contains: String(search), mode: "insensitive" } },
      ];
    }
    
    // Filter by specific wallet
    if (wallet) {
      where.wallet = String(wallet);
    }

    const patients = await prisma.patient.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            records: true,
            accessRequests: true,
            AccessGrantOffchain: true,
          }
        }
      }
    });

    const total = await prisma.patient.count({ where });

    res.json({
      patients,
      pagination: {
        limit: take,
        offset: skip,
        total,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get single patient by ID or wallet
router.get("/:identifier", async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const { includeRecords, includeAccessGrants } = req.query;
    
    // Try to find by ID first, then by wallet
    let patient = await prisma.patient.findUnique({
      where: { id: identifier },
      include: {
        records: includeRecords === "true" ? {
          orderBy: { createdAt: "desc" },
          take: 50,
        } : false,
        AccessGrantOffchain: includeAccessGrants === "true" ? {
          orderBy: { grantedAt: "desc" },
        } : false,
        accessRequests: includeAccessGrants === "true" ? {
          where: { status: "pending" },
          orderBy: { requestedAt: "desc" },
        } : false,
        _count: {
          select: {
            records: true,
            accessRequests: true,
            AccessGrantOffchain: true,
            AuditEvent: true,
          }
        }
      }
    });

    // If not found by ID, try wallet
    if (!patient) {
      patient = await prisma.patient.findUnique({
        where: { wallet: identifier },
        include: {
          records: includeRecords === "true" ? {
            orderBy: { createdAt: "desc" },
            take: 50,
          } : false,
          AccessGrantOffchain: includeAccessGrants === "true" ? {
            orderBy: { grantedAt: "desc" },
          } : false,
          accessRequests: includeAccessGrants === "true" ? {
            where: { status: "pending" },
            orderBy: { requestedAt: "desc" },
          } : false,
          _count: {
            select: {
              records: true,
              accessRequests: true,
              AccessGrantOffchain: true,
              AuditEvent: true,
            }
          }
        }
      });
    }

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Register a new patient
router.post("/", async (req: Request, res: Response) => {
  try {
    const { wallet, name, dob, emergencyContact, metadata } = req.body;
    
    if (!wallet || !name || !dob) {
      return res.status(400).json({ 
        error: "wallet, name and dob are required" 
      });
    }

    // Check if wallet already exists
    const existing = await prisma.patient.findUnique({ 
      where: { wallet } 
    });
    
    if (existing) {
      return res.status(409).json({ 
        error: "Patient with this wallet already exists" 
      });
    }

    // Generate encryption key for patient
    const encryptionKey = generatePatientKey();

    const patient = await prisma.patient.create({
      data: {
        wallet,
        name,
        dob: new Date(dob),
        emergencyContact: emergencyContact || null,
      },
    });

    // Create initial audit event
    await prisma.auditEvent.create({
      data: {
        patientId: patient.id,
        accessor: wallet,
        action: "register",
        success: true,
        metadata: { 
          note: "Patient registered",
          registeredAt: new Date().toISOString(),
        },
      },
    });

    res.status(201).json({
      patient,
      encryptionKey, // Return encryption key for patient to store securely
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Update patient profile
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, dob, emergencyContact, accessor } = req.body;

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        dob: dob ? new Date(dob) : existing.dob,
        emergencyContact: emergencyContact !== undefined 
          ? emergencyContact 
          : existing.emergencyContact,
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: updated.id,
        accessor: accessor ?? existing.wallet,
        action: "update_profile",
        success: true,
        metadata: { 
          note: "Patient profile updated",
          changes: { name, dob, emergencyContact },
        },
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Delete patient (soft delete via metadata would require schema change)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessor, confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({ 
        error: "Confirmation required. Send { confirm: true } to delete." 
      });
    }

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Create final audit event before deletion
    await prisma.auditEvent.create({
      data: {
        patientId: existing.id,
        accessor: accessor ?? existing.wallet,
        action: "delete_account",
        success: true,
        metadata: { 
          note: "Patient account deleted",
          deletedAt: new Date().toISOString(),
        },
      },
    });

    // Note: This will cascade delete records, access requests, etc.
    // In production, you might want to implement soft delete
    await prisma.patient.delete({ where: { id } });

    res.json({ ok: true, deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Grant access to a provider (consent management)
router.post("/:id/grant-access", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { provider, role, allowedTypes, expiresAt, accessor } = req.body;

    if (!provider || !role) {
      return res.status(400).json({ 
        error: "provider and role are required" 
      });
    }

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Valid roles
    const validRoles = ["Doctor", "Hospital", "Insurer", "EmergencyResponder"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}` 
      });
    }

    const grant = await prisma.accessGrantOffchain.create({
      data: {
        patientId: id,
        provider,
        role,
        allowedTypes: allowedTypes || "all",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: id,
        accessor: accessor ?? patient.wallet,
        action: "grant_access",
        success: true,
        metadata: { 
          note: "Access granted to provider",
          grantId: grant.id,
          provider,
          role,
          allowedTypes: allowedTypes || "all",
        },
      },
    });

    res.status(201).json(grant);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Revoke access from a provider
router.delete("/:id/revoke-access/:grantId", async (req: Request, res: Response) => {
  try {
    const { id, grantId } = req.params;
    const { accessor } = req.body;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const grant = await prisma.accessGrantOffchain.findUnique({ 
      where: { id: grantId } 
    });
    
    if (!grant) {
      return res.status(404).json({ error: "Access grant not found" });
    }

    if (grant.patientId !== id) {
      return res.status(403).json({ 
        error: "This access grant does not belong to this patient" 
      });
    }

    await prisma.accessGrantOffchain.delete({ where: { id: grantId } });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: id,
        accessor: accessor ?? patient.wallet,
        action: "revoke_access",
        success: true,
        metadata: { 
          note: "Access revoked from provider",
          grantId,
          provider: grant.provider,
          role: grant.role,
        },
      },
    });

    res.json({ ok: true, revoked: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get patient's access grants (who can access their data)
router.get("/:id/access-grants", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.query;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    let where: any = { patientId: id };
    
    // Filter for active grants only (not expired)
    if (active === "true") {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    }

    const grants = await prisma.accessGrantOffchain.findMany({
      where,
      orderBy: { grantedAt: "desc" },
    });

    res.json({ grants });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Search for patients (for providers)
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query, searchBy, limit, offset } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const take = limit || 20;
    const skip = offset || 0;

    let where: any = {};

    if (searchBy === "wallet") {
      where.wallet = { contains: query, mode: "insensitive" };
    } else if (searchBy === "name") {
      where.name = { contains: query, mode: "insensitive" };
    } else {
      // Search both
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { wallet: { contains: query, mode: "insensitive" } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      take,
      skip,
      select: {
        id: true,
        wallet: true,
        name: true,
        dob: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    const total = await prisma.patient.count({ where });

    res.json({
      results: patients,
      pagination: {
        limit: take,
        offset: skip,
        total,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
