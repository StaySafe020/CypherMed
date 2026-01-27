import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

// Register a guardian for a minor patient
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      guardianWallet,
      relationship,
      canApprove = true,
      canView = true,
      canCreate = true,
    } = req.body;

    if (!patientId || !guardianWallet || !relationship) {
      return res.status(400).json({
        error: "patientId, guardianWallet, and relationship are required",
      });
    }

    // Verify patient exists and is a minor
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    if (!patient.isMinor) {
      return res.status(400).json({
        error: "Patient is not a minor - guardian assignment not allowed",
      });
    }

    // Calculate expiration (when patient turns 18)
    const eighteenthBirthday = new Date(patient.dob);
    eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);

    // Check if guardian is also a patient
    const guardianPatient = await prisma.patient.findUnique({
      where: { wallet: guardianWallet },
    });

    const guardian = await prisma.guardian.create({
      data: {
        patientId,
        guardianWallet,
        guardianPatientId: guardianPatient?.id || null,
        relationship,
        canApprove,
        canView,
        canCreate,
        expiresAt: eighteenthBirthday,
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId,
        accessor: guardianWallet,
        action: "guardian_assigned",
        success: true,
        reason: `Guardian assigned with relationship: ${relationship}`,
        metadata: { guardianId: guardian.id, relationship },
      },
    });

    res.status(201).json(guardian);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get all guardians for a patient
router.get("/patient/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const guardians = await prisma.guardian.findMany({
      where: { patientId, isActive: true },
      include: {
        guardianPatient: {
          select: {
            id: true,
            name: true,
            wallet: true,
          },
        },
      },
    });

    res.json(guardians);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get all wards for a guardian
router.get("/wards/:guardianWallet", async (req: Request, res: Response) => {
  try {
    const { guardianWallet } = req.params;

    const wards = await prisma.guardian.findMany({
      where: { guardianWallet, isActive: true },
      include: {
        patient: {
          select: {
            id: true,
            wallet: true,
            name: true,
            dob: true,
            isMinor: true,
          },
        },
      },
    });

    res.json(wards);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Revoke guardian access
router.post("/:id/revoke", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { revokedBy } = req.body;

    const guardian = await prisma.guardian.findUnique({ where: { id } });
    if (!guardian) {
      return res.status(404).json({ error: "Guardian not found" });
    }

    const updated = await prisma.guardian.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: guardian.patientId,
        accessor: revokedBy || "system",
        action: "guardian_revoked",
        success: true,
        reason: `Guardian access revoked for ${guardian.guardianWallet}`,
        metadata: { guardianId: id },
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Transfer control from guardian to patient (when they turn 18)
router.post("/transfer/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Check if patient is 18 or older
    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
    if (age < 18) {
      return res.status(400).json({
        error: `Patient is only ${age} years old - must be 18 to receive control`,
      });
    }

    // Update patient status
    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        isMinor: false,
        guardianTransferredAt: new Date(),
      },
    });

    // Expire all active guardians
    await prisma.guardian.updateMany({
      where: {
        patientId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId,
        accessor: "system",
        action: "guardian_transfer_complete",
        success: true,
        reason: "Patient reached 18 years - full control transferred",
        metadata: { age, transferredAt: new Date().toISOString() },
      },
    });

    res.json({
      success: true,
      patient: updated,
      message: "Control transferred from guardians to patient",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
