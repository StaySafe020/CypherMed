import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

// Get all notifications for a patient
router.get("/", async (req: Request, res: Response) => {
  try {
    const { wallet, unreadOnly, limit, offset, priority, type } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet parameter is required" });
    }

    // Find patient
    const patient = await prisma.patient.findUnique({
      where: { wallet: String(wallet) },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const where: any = { patientId: patient.id };

    if (unreadOnly === "true") {
      where.read = false;
    }

    if (priority) {
      where.priority = String(priority);
    }

    if (type) {
      where.type = String(type);
    }

    const take = limit ? parseInt(String(limit)) : 50;
    const skip = offset ? parseInt(String(offset)) : 0;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.notification.count({ where }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: {
        patientId: patient.id,
        read: false,
      },
    });

    res.json({
      notifications,
      pagination: {
        total,
        unreadCount,
        limit: take,
        offset: skip,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get a single notification
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
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

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Mark all notifications as read for a patient
router.post("/mark-all-read", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: "wallet is required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { wallet },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const result = await prisma.notification.updateMany({
      where: {
        patientId: patient.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      updated: result.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Delete a notification
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Delete all read notifications for a patient
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: "wallet is required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { wallet },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const result = await prisma.notification.deleteMany({
      where: {
        patientId: patient.id,
        read: true,
      },
    });

    res.json({
      success: true,
      deleted: result.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get notification statistics
router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet parameter is required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { wallet: String(wallet) },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const [
      total,
      unread,
      byType,
      byPriority,
      recentNotifications,
    ] = await Promise.all([
      prisma.notification.count({ where: { patientId: patient.id } }),
      prisma.notification.count({
        where: { patientId: patient.id, read: false },
      }),
      prisma.notification.groupBy({
        by: ["type"],
        where: { patientId: patient.id },
        _count: true,
      }),
      prisma.notification.groupBy({
        by: ["priority"],
        where: { patientId: patient.id },
        _count: true,
      }),
      prisma.notification.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    res.json({
      summary: {
        total,
        unread,
        read: total - unread,
      },
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      byPriority: byPriority.map((item) => ({
        priority: item.priority,
        count: item._count,
      })),
      recentNotifications,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
