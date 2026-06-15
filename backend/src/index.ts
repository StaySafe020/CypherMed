import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import patientsRouter from "./routes/patients";
import recordsRouter from "./routes/records";
import accessRequestsRouter from "./routes/accessRequests";
import auditLogsRouter from "./routes/auditLogs";
import notificationsRouter from "./routes/notifications";
import guardiansRouter from "./routes/guardians";
import birthRegistrationsRouter from "./routes/birthRegistrations";
import authRouter, { verifyToken } from "./routes/auth";
import prisma from "./prisma";
import { initializeSocketIO } from "./utils/socket";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    res.json({ status: "ok", websocket: "enabled" });
  } catch (err) {
    res.status(500).json({ status: "error", error: String(err) });
  }
});

// Auth routes (public)
app.use("/api/auth", authRouter);

// Protected routes (require JWT token)
app.use("/api/patients", verifyToken, patientsRouter);
app.use("/api/records", verifyToken, recordsRouter);
app.use("/api/access-requests", verifyToken, accessRequestsRouter);
app.use("/api/audit-logs", verifyToken, auditLogsRouter);
app.use("/api/notifications", verifyToken, notificationsRouter);
app.use("/api/guardians", verifyToken, guardiansRouter);
app.use("/api/birth-registrations", verifyToken, birthRegistrationsRouter);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`CypherMed backend listening on http://localhost:${PORT}`);
  console.log(`WebSocket server enabled on ws://localhost:${PORT}`);
});
