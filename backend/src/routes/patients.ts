import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({});
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/", async (req, res) => {
  try {
    const { wallet, name, dob, emergencyContact } = req.body;
    if (!wallet || !name || !dob) {
      return res.status(400).json({ error: "wallet, name and dob are required" });
    }
    const patient = await prisma.patient.create({
      data: {
        wallet,
        name,
        dob: new Date(dob),
        emergencyContact,
      },
    });
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
