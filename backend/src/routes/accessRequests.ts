import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { notifyAccessRequest, notifyAccessGranted, notifyAccessDenied } from "../utils/notifications";

const router = Router();

// Create a new access request
router.post("/", async (req: Request, res: Response) => {
  try {
    const { patientId, requester, role, reason, expiresAt } = req.body;
    
    if (!patientId || !requester || !role) {
      return res.status(400).json({ 
        error: "patientId, requester, and role are required" 
      });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Set default expiration (7 days from now)
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);

    const accessRequest = await prisma.accessRequest.create({
      data: {
        patientId,
        requester,
        role,
        reason: reason || null,
        status: "pending",
        expiresAt: expiresAt ? new Date(expiresAt) : defaultExpiration,
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId,
        accessor: requester,
        action: "request_access",
        success: true,
        reason: reason || "Access request submitted",
        metadata: { requestId: accessRequest.id, role },
      },
    });

    // Send notification to patient
    await notifyAccessRequest(patient.wallet, requester, role, accessRequest.id);

    res.status(201).json(accessRequest);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// List access requests (filter by patientId or requester or status)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { patientId, requester, status } = req.query;
    const where: any = {};
    
    if (patientId) where.patientId = String(patientId);
    if (requester) where.requester = String(requester);
    if (status) where.status = String(status);

    const requests = await prisma.accessRequest.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            wallet: true,
            name: true,
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get a specific access request
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const request = await prisma.accessRequest.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            wallet: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: "Access request not found" });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Approve an access request
router.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { allowedTypes, grantExpiresAt, approvedBy } = req.body;

    const request = await prisma.accessRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: "Access request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ 
        error: `Request already ${request.status}` 
      });
    }

    // Update request status
    const updatedRequest = await prisma.accessRequest.update({
      where: { id },
      data: { status: "approved" },
    });

    // Create AccessGrantOffchain record
    const grantExpiration = grantExpiresAt 
      ? new Date(grantExpiresAt) 
      : request.expiresAt;

    const grant = await prisma.accessGrantOffchain.create({
      data: {
        patientId: request.patientId,
        provider: request.requester,
        role: request.role,
        allowedTypes: allowedTypes || "all",
        expiresAt: grantExpiration,
      },
    });

    // Get patient info for notification
    const patient = await prisma.patient.findUnique({ 
      where: { id: request.patientId } 
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: request.patientId,
        accessor: approvedBy || "patient",
        action: "approve_access_request",
        success: true,
        reason: `Access request approved for ${request.requester}`,
        metadata: { 
          requestId: id, 
          requester: request.requester,
          role: request.role,
          allowedTypes: allowedTypes || "all",
        },
      },
    });

    // Send notification
    if (patient) {
      await notifyAccessGranted(
        patient.wallet,
        request.requester,
        allowedTypes || "all",
        grant.id
      );
    }

    res.json({ 
      success: true, 
      request: updatedRequest,
      message: "Access request approved and grant created" 
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Deny an access request
router.post("/:id/deny", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, deniedBy } = req.body;

    const request = await prisma.accessRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: "Access request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ 
        error: `Request already ${request.status}` 
      });
    }

    // Update request status
    const updatedRequest = await prisma.accessRequest.update({
      where: { id },
      data: { 
        status: "denied",
        reason: reason || request.reason,
      },
    });

    // Get patient info for notification
    const patient = await prisma.patient.findUnique({ 
      where: { id: request.patientId } 
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: request.patientId,
        accessor: deniedBy || "patient",
        action: "deny_access_request",
        success: true,
        reason: reason || `Access request denied for ${request.requester}`,
        metadata: { 
          requestId: id, 
          requester: request.requester,
          role: request.role,
        },
      },
    });

    // Send notification
    if (patient) {
      await notifyAccessDenied(patient.wallet, request.requester, id);
    }

    res.json({ 
      success: true, 
      request: updatedRequest,
      message: "Access request denied" 
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Batch approve multiple access requests
router.post("/batch/approve", async (req: Request, res: Response) => {
  try {
    const { requestIds, allowedTypes, grantExpiresAt, approvedBy } = req.body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ 
        error: "requestIds array is required" 
      });
    }

    const results = [];
    const errors = [];

    for (const id of requestIds) {
      try {
        const request = await prisma.accessRequest.findUnique({ where: { id } });
        
        if (!request) {
          errors.push({ id, error: "Not found" });
          continue;
        }

        if (request.status !== "pending") {
          errors.push({ id, error: `Already ${request.status}` });
          continue;
        }

        // Update request
        await prisma.accessRequest.update({
          where: { id },
          data: { status: "approved" },
        });

        // Create grant
        const grantExpiration = grantExpiresAt 
          ? new Date(grantExpiresAt) 
          : request.expiresAt;

        await prisma.accessGrantOffchain.create({
          data: {
            patientId: request.patientId,
            provider: request.requester,
            role: request.role,
            allowedTypes: allowedTypes || "all",
            expiresAt: grantExpiration,
          },
        });

        // Audit event
        await prisma.auditEvent.create({
          data: {
            patientId: request.patientId,
            accessor: approvedBy || "patient",
            action: "approve_access_request",
            success: true,
            reason: `Batch approval for ${request.requester}`,
            metadata: { 
              requestId: id,
              requester: request.requester,
              role: request.role,
              batch: true,
            },
          },
        });

        results.push({ id, success: true });
      } catch (err) {
        errors.push({ id, error: String(err) });
      }
    }

    res.json({ 
      approved: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Cancel an access request (by requester)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body;

    const request = await prisma.accessRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: "Access request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ 
        error: "Can only cancel pending requests" 
      });
    }

    // Update status to cancelled
    const updatedRequest = await prisma.accessRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        patientId: request.patientId,
        accessor: cancelledBy || request.requester,
        action: "cancel_access_request",
        success: true,
        reason: `Access request cancelled by ${cancelledBy || request.requester}`,
        metadata: { requestId: id },
      },
    });

    res.json({ 
      success: true, 
      request: updatedRequest,
      message: "Access request cancelled" 
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
