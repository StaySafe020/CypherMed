import prisma from "../prisma";
import { sendNotificationToWallet, sendUnreadCount } from "./socket";

export type NotificationType =
  | "access_request"
  | "access_granted"
  | "access_denied"
  | "access_revoked"
  | "record_created"
  | "record_updated"
  | "record_accessed"
  | "emergency_access"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

interface CreateNotificationParams {
  patientWallet: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: any;
}

/**
 * Create and send a notification
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Find patient by wallet
    const patient = await prisma.patient.findUnique({
      where: { wallet: params.patientWallet },
    });

    if (!patient) {
      console.error(`Patient not found for wallet: ${params.patientWallet}`);
      return null;
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        patientId: patient.id,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || "normal",
        metadata: params.metadata || null,
      },
    });

    // Send real-time notification via WebSocket
    await sendNotificationToWallet(params.patientWallet, {
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority || "normal",
      metadata: {
        id: notification.id,
        createdAt: notification.createdAt,
        ...params.metadata,
      },
    });

    // Update unread count
    await sendUnreadCount(params.patientWallet);

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  accessRequest: (requesterName: string, role: string) => ({
    type: "access_request" as NotificationType,
    title: "New Access Request",
    message: `${requesterName} (${role}) has requested access to your medical records.`,
    priority: "high" as NotificationPriority,
  }),

  accessGranted: (providerName: string, allowedTypes: string) => ({
    type: "access_granted" as NotificationType,
    title: "Access Granted",
    message: `You have granted ${providerName} access to your ${allowedTypes} records.`,
    priority: "normal" as NotificationPriority,
  }),

  accessDenied: (requesterName: string) => ({
    type: "access_denied" as NotificationType,
    title: "Access Request Denied",
    message: `Access request from ${requesterName} has been denied.`,
    priority: "normal" as NotificationPriority,
  }),

  accessRevoked: (providerName: string) => ({
    type: "access_revoked" as NotificationType,
    title: "Access Revoked",
    message: `Access for ${providerName} has been revoked.`,
    priority: "normal" as NotificationPriority,
  }),

  recordCreated: (recordType: string, createdBy: string) => ({
    type: "record_created" as NotificationType,
    title: "New Medical Record",
    message: `A new ${recordType} record has been added by ${createdBy}.`,
    priority: "normal" as NotificationPriority,
  }),

  recordUpdated: (recordType: string, updatedBy: string) => ({
    type: "record_updated" as NotificationType,
    title: "Record Updated",
    message: `Your ${recordType} record has been updated by ${updatedBy}.`,
    priority: "normal" as NotificationPriority,
  }),

  recordAccessed: (accessor: string, recordType: string) => ({
    type: "record_accessed" as NotificationType,
    title: "Record Accessed",
    message: `${accessor} accessed your ${recordType} record.`,
    priority: "low" as NotificationPriority,
  }),

  emergencyAccess: (responderName: string, reason: string) => ({
    type: "emergency_access" as NotificationType,
    title: "Emergency Access Alert",
    message: `Emergency responder ${responderName} accessed your records. Reason: ${reason}`,
    priority: "urgent" as NotificationPriority,
  }),

  batchAccessGranted: (count: number) => ({
    type: "access_granted" as NotificationType,
    title: "Multiple Access Requests Approved",
    message: `You have approved ${count} access requests.`,
    priority: "normal" as NotificationPriority,
  }),
};

/**
 * Send notification when access is requested
 */
export async function notifyAccessRequest(
  patientWallet: string,
  requester: string,
  role: string,
  requestId: string
) {
  const template = NotificationTemplates.accessRequest(requester, role);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { requestId, requester, role },
  });
}

/**
 * Send notification when access is granted
 */
export async function notifyAccessGranted(
  patientWallet: string,
  provider: string,
  allowedTypes: string,
  grantId: string
) {
  const template = NotificationTemplates.accessGranted(provider, allowedTypes);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { grantId, provider, allowedTypes },
  });
}

/**
 * Send notification when access is denied
 */
export async function notifyAccessDenied(
  patientWallet: string,
  requester: string,
  requestId: string
) {
  const template = NotificationTemplates.accessDenied(requester);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { requestId, requester },
  });
}

/**
 * Send notification when access is revoked
 */
export async function notifyAccessRevoked(
  patientWallet: string,
  provider: string,
  grantId: string
) {
  const template = NotificationTemplates.accessRevoked(provider);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { grantId, provider },
  });
}

/**
 * Send notification when a record is created
 */
export async function notifyRecordCreated(
  patientWallet: string,
  recordType: string,
  createdBy: string,
  recordId: string
) {
  const template = NotificationTemplates.recordCreated(recordType, createdBy);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { recordId, recordType, createdBy },
  });
}

/**
 * Send notification when a record is updated
 */
export async function notifyRecordUpdated(
  patientWallet: string,
  recordType: string,
  updatedBy: string,
  recordId: string
) {
  const template = NotificationTemplates.recordUpdated(recordType, updatedBy);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { recordId, recordType, updatedBy },
  });
}

/**
 * Send notification when a record is accessed
 */
export async function notifyRecordAccessed(
  patientWallet: string,
  accessor: string,
  recordType: string,
  recordId: string
) {
  const template = NotificationTemplates.recordAccessed(accessor, recordType);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { recordId, recordType, accessor },
  });
}

/**
 * Send notification for emergency access
 */
export async function notifyEmergencyAccess(
  patientWallet: string,
  responderName: string,
  reason: string,
  eventId: string
) {
  const template = NotificationTemplates.emergencyAccess(responderName, reason);
  return createNotification({
    patientWallet,
    ...template,
    metadata: { eventId, responderName, reason },
  });
}
