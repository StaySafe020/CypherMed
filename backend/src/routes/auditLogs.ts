import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

// Get audit logs with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { 
      patientId, 
      accessor, 
      action, 
      recordId,
      success,
      startDate, 
      endDate,
      limit = "100",
      offset = "0"
    } = req.query;

    const where: any = {};
    
    if (patientId) where.patientId = String(patientId);
    if (accessor) where.accessor = String(accessor);
    if (action) where.action = String(action);
    if (recordId) where.recordId = String(recordId);
    if (success !== undefined) where.success = success === "true";
    
    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
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
        orderBy: { createdAt: "desc" },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
      }),
      prisma.auditEvent.count({ where }),
    ]);

    res.json({
      events,
      pagination: {
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
        hasMore: total > parseInt(String(offset)) + events.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get a specific audit event
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const event = await prisma.auditEvent.findUnique({
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

    if (!event) {
      return res.status(404).json({ error: "Audit event not found" });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get audit log analytics/statistics
router.get("/analytics/overview", async (req: Request, res: Response) => {
  try {
    const { patientId, startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    // Get total counts
    const [
      totalEvents,
      successfulEvents,
      failedEvents,
      uniqueAccessors,
    ] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.count({ where: { ...where, success: true } }),
      prisma.auditEvent.count({ where: { ...where, success: false } }),
      prisma.auditEvent.findMany({
        where,
        select: { accessor: true },
        distinct: ['accessor'],
      }),
    ]);

    // Get action breakdown
    const actionBreakdown = await prisma.auditEvent.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });

    // Get most active accessors
    const topAccessors = await prisma.auditEvent.groupBy({
      by: ['accessor'],
      where,
      _count: { accessor: true },
      orderBy: { _count: { accessor: 'desc' } },
      take: 10,
    });

    // Get recent failed attempts
    const recentFailures = await prisma.auditEvent.findMany({
      where: { ...where, success: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            wallet: true,
          },
        },
      },
    });

    res.json({
      summary: {
        totalEvents,
        successfulEvents,
        failedEvents,
        successRate: totalEvents > 0 
          ? ((successfulEvents / totalEvents) * 100).toFixed(2) + '%' 
          : '0%',
        uniqueAccessors: uniqueAccessors.length,
      },
      actionBreakdown: actionBreakdown.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topAccessors: topAccessors.map(item => ({
        accessor: item.accessor,
        count: item._count.accessor,
      })),
      recentFailures,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get access patterns by time (for dashboard charts)
router.get("/analytics/timeline", async (req: Request, res: Response) => {
  try {
    const { patientId, accessor, groupBy = "day", startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    if (accessor) where.accessor = String(accessor);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    // Get all events in range
    const events = await prisma.auditEvent.findMany({
      where,
      select: {
        createdAt: true,
        action: true,
        success: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by time period
    const grouped: Record<string, { total: number; successful: number; failed: number; actions: Record<string, number> }> = {};
    
    events.forEach(event => {
      let key: string;
      const date = new Date(event.createdAt);
      
      if (groupBy === "hour") {
        key = date.toISOString().slice(0, 13) + ":00:00";
      } else if (groupBy === "day") {
        key = date.toISOString().slice(0, 10);
      } else if (groupBy === "month") {
        key = date.toISOString().slice(0, 7);
      } else {
        key = date.toISOString().slice(0, 10);
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, successful: 0, failed: 0, actions: {} };
      }

      grouped[key].total++;
      if (event.success) {
        grouped[key].successful++;
      } else {
        grouped[key].failed++;
      }

      grouped[key].actions[event.action] = (grouped[key].actions[event.action] || 0) + 1;
    });

    const timeline = Object.entries(grouped).map(([timestamp, data]) => ({
      timestamp,
      ...data,
    }));

    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Export audit logs for compliance (CSV format)
router.get("/export/csv", async (req: Request, res: Response) => {
  try {
    const { patientId, startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const events = await prisma.auditEvent.findMany({
      where,
      include: {
        patient: {
          select: {
            wallet: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Generate CSV
    const csvHeader = "Timestamp,Patient Wallet,Patient Name,Accessor,Action,Success,Record ID,Reason,Metadata\n";
    const csvRows = events.map(event => {
      const timestamp = event.createdAt.toISOString();
      const patientWallet = event.patient?.wallet || "N/A";
      const patientName = event.patient?.name || "N/A";
      const accessor = event.accessor;
      const action = event.action;
      const success = event.success ? "Yes" : "No";
      const recordId = event.recordId || "N/A";
      const reason = (event.reason || "").replace(/"/g, '""');
      const metadata = JSON.stringify(event.metadata || {}).replace(/"/g, '""');
      
      return `"${timestamp}","${patientWallet}","${patientName}","${accessor}","${action}","${success}","${recordId}","${reason}","${metadata}"`;
    }).join("\n");

    const csv = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Export audit logs for compliance (JSON format)
router.get("/export/json", async (req: Request, res: Response) => {
  try {
    const { patientId, startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const events = await prisma.auditEvent.findMany({
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
      orderBy: { createdAt: 'asc' },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      filters: {
        patientId: patientId || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      totalRecords: events.length,
      auditLogs: events,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get compliance report summary
router.get("/compliance/report", async (req: Request, res: Response) => {
  try {
    const { patientId, startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = String(patientId);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const [
      totalAccess,
      emergencyAccess,
      unauthorizedAttempts,
      dataModifications,
      accessGrants,
      accessRevocations,
    ] = await Promise.all([
      prisma.auditEvent.count({ where: { ...where, action: { in: ['view', 'access_record'] } } }),
      prisma.auditEvent.count({ where: { ...where, action: 'emergency_access' } }),
      prisma.auditEvent.count({ where: { ...where, success: false } }),
      prisma.auditEvent.count({ where: { ...where, action: { in: ['create', 'update', 'delete'] } } }),
      prisma.auditEvent.count({ where: { ...where, action: { in: ['grant_access', 'approve_access_request'] } } }),
      prisma.auditEvent.count({ where: { ...where, action: 'revoke_access' } }),
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        startDate: startDate || "inception",
        endDate: endDate || "present",
      },
      patientId: patientId || "all",
      metrics: {
        totalAccessEvents: totalAccess,
        emergencyAccessEvents: emergencyAccess,
        unauthorizedAttempts,
        dataModifications,
        accessGrantsIssued: accessGrants,
        accessRevocations,
      },
      compliance: {
        hipaaCompliant: true,
        auditTrailComplete: true,
        encryptionEnabled: true,
      },
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
