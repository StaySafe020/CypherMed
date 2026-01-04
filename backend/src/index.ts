import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import patientsRouter from "./routes/patients";
import recordsRouter from "./routes/records";
import accessRequestsRouter from "./routes/accessRequests";
import auditLogsRouter from "./routes/auditLogs";
import prisma from "./prisma";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", error: String(err) });
  }
});

app.use("/api/patients", patientsRouter);
app.use("/api/records", recordsRouter);
app.use("/api/access-requests", accessRequestsRouter);
app.use("/api/audit-logs", auditLogsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CypherMed backend listening on http://localhost:${PORT}`);
});
