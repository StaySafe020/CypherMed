import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import prisma from "../prisma";

// Store connected clients by wallet address
const connectedClients = new Map<string, string[]>(); // wallet -> socketIds[]

export let io: SocketIOServer;

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Configure this properly in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Client authenticates with wallet address
    socket.on("authenticate", (wallet: string) => {
      if (!wallet) {
        socket.emit("error", { message: "Wallet address required" });
        return;
      }

      // Store socket ID for this wallet
      if (!connectedClients.has(wallet)) {
        connectedClients.set(wallet, []);
      }
      connectedClients.get(wallet)!.push(socket.id);

      // Join a room for this wallet
      socket.join(wallet);

      console.log(`Authenticated wallet ${wallet} with socket ${socket.id}`);
      socket.emit("authenticated", { wallet, socketId: socket.id });

      // Send unread notification count
      sendUnreadCount(wallet);
    });

    // Mark notification as read
    socket.on("mark_read", async (data: { notificationId: string; wallet: string }) => {
      try {
        await prisma.notification.update({
          where: { id: data.notificationId },
          data: { read: true, readAt: new Date() },
        });

        // Send updated count
        sendUnreadCount(data.wallet);
      } catch (error) {
        socket.emit("error", { message: "Failed to mark notification as read" });
      }
    });

    // Mark all as read
    socket.on("mark_all_read", async (data: { wallet: string }) => {
      try {
        const patient = await prisma.patient.findUnique({
          where: { wallet: data.wallet },
        });

        if (patient) {
          await prisma.notification.updateMany({
            where: {
              patientId: patient.id,
              read: false,
            },
            data: {
              read: true,
              readAt: new Date(),
            },
          });

          // Send updated count
          sendUnreadCount(data.wallet);
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to mark all as read" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Remove socket from connected clients
      for (const [wallet, socketIds] of connectedClients.entries()) {
        const index = socketIds.indexOf(socket.id);
        if (index > -1) {
          socketIds.splice(index, 1);
          if (socketIds.length === 0) {
            connectedClients.delete(wallet);
          }
          break;
        }
      }
    });
  });

  return io;
}

/**
 * Send notification to a specific wallet
 */
export async function sendNotificationToWallet(
  wallet: string,
  notification: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    metadata?: any;
  }
) {
  if (!io) {
    console.error("Socket.IO not initialized");
    return;
  }

  // Emit to all sockets connected to this wallet
  io.to(wallet).emit("notification", notification);
}

/**
 * Send unread notification count to a wallet
 */
export async function sendUnreadCount(wallet: string) {
  if (!io) return;

  try {
    const patient = await prisma.patient.findUnique({
      where: { wallet },
    });

    if (patient) {
      const unreadCount = await prisma.notification.count({
        where: {
          patientId: patient.id,
          read: false,
        },
      });

      io.to(wallet).emit("unread_count", { count: unreadCount });
    }
  } catch (error) {
    console.error("Failed to send unread count:", error);
  }
}

/**
 * Get connected clients for a wallet
 */
export function getConnectedClients(wallet: string): string[] {
  return connectedClients.get(wallet) || [];
}

/**
 * Check if a wallet is connected
 */
export function isWalletConnected(wallet: string): boolean {
  const socketIds = connectedClients.get(wallet);
  return socketIds !== undefined && socketIds.length > 0;
}
