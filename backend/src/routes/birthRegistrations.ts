import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

// Register birth and create patient account atomically
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      birthCertificateId,
      childName,
      birthDate,
      birthPlace,
      birthWeight,
      birthLength,
      motherName,
      fatherName,
      attendingPhysician,
      guardianWallet,
      guardianRelationship = "parent",
      registeredBy, // Hospital/clinic wallet
      metadata,
    } = req.body;

    if (
      !birthCertificateId ||
      !childName ||
      !birthDate ||
      !birthPlace ||
      !guardianWallet ||
      !registeredBy
    ) {
      return res.status(400).json({
        error:
          "birthCertificateId, childName, birthDate, birthPlace, guardianWallet, and registeredBy are required",
      });
    }

    // Check if birth certificate already exists
    const existing = await prisma.birthRegistration.findUnique({
      where: { birthCertificateId },
    });

    if (existing) {
      return res.status(409).json({
        error: "Birth certificate ID already registered",
      });
    }

    // Create patient account (minor, wallet will be assigned later)
    const tempWallet = `birth_temp_${birthCertificateId}`;
    const patient = await prisma.patient.create({
      data: {
        wallet: tempWallet,
        name: childName,
        dob: new Date(birthDate),
        birthCertificate: birthCertificateId,
        isMinor: true,
      },
    });

    // Create birth registration record
    const birthReg = await prisma.birthRegistration.create({
      data: {
        patientId: patient.id,
        birthCertificateId,
        birthDate: new Date(birthDate),
        birthPlace,
        birthWeight: birthWeight ? parseFloat(birthWeight) : null,
        birthLength: birthLength ? parseFloat(birthLength) : null,
        motherName,
        fatherName,
        attendingPhysician,
        registeredBy,
        metadata: metadata || null,
      },
    });

    // Calculate 18th birthday for guardian expiration
    const eighteenthBirthday = new Date(birthDate);
    eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);

    // Assign guardian
    const guardianPatient = await prisma.patient.findUnique({
      where: { wallet: guardianWallet },
    });

    const guardian = await prisma.guardian.create({
      data: {
        patientId: patient.id,
        guardianWallet,
        guardianPatientId: guardianPatient?.id || null,
        relationship: guardianRelationship,
        canApprove: true,
        canView: true,
        canCreate: true,
        expiresAt: eighteenthBirthday,
      },
    });

    // Create initial birth record in medical records
    const birthRecord = await prisma.record.create({
      data: {
        patientId: patient.id,
        recordType: "BirthCertificate",
        dataHash: `birth_${birthCertificateId}`,
        storagePath: null,
        metadata: {
          birthCertificateId,
          birthPlace,
          birthWeight,
          birthLength,
          registeredBy,
        },
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: patient.id,
        accessor: registeredBy,
        action: "birth_registered",
        success: true,
        reason: `Birth registered at ${birthPlace}`,
        metadata: {
          birthCertificateId,
          guardianWallet,
          birthRecordId: birthRecord.id,
        },
      },
    });

    res.status(201).json({
      success: true,
      patient,
      birthRegistration: birthReg,
      guardian,
      birthRecord,
      message: "Birth successfully registered with guardian assigned",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get birth registration by patient ID
router.get("/patient/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const birthReg = await prisma.birthRegistration.findUnique({
      where: { patientId },
    });

    if (!birthReg) {
      return res.status(404).json({ error: "Birth registration not found" });
    }

    res.json(birthReg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get birth registration by certificate ID
router.get("/certificate/:certId", async (req: Request, res: Response) => {
  try {
    const { certId } = req.params;

    const birthReg = await prisma.birthRegistration.findUnique({
      where: { birthCertificateId: certId },
    });

    if (!birthReg) {
      return res.status(404).json({
        error: "Birth registration not found for this certificate",
      });
    }

    res.json(birthReg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Update patient wallet when they get their own wallet (e.g., at age 13+)
router.patch("/:patientId/assign-wallet", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: "wallet is required" });
    }

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: { wallet },
    });

    await prisma.auditEvent.create({
      data: {
        patientId,
        accessor: wallet,
        action: "wallet_assigned",
        success: true,
        reason: "Patient wallet assigned",
        metadata: { newWallet: wallet },
      },
    });

    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
