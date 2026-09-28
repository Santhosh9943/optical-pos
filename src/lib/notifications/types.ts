/**
 * Notification Subsystem Domain Types
 * 
 * Defines type-safe event categories, severities, channel targets,
 * and extensible typed event payload specifications for OptixOS.
 */

export type NotificationCategory = 'system' | 'alert' | 'reminder';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type NotificationTargetRole = 'all' | 'admin' | 'optometrist' | 'clerk' | 'super_admin';
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'whatsapp';

export interface NotificationPayloadMap {
  'system.announcement': {
    title: string;
    message: string;
    version?: string;
    actionUrl?: string;
  };
  'system.maintenance': {
    window: string;
    reason: string;
    expectedDuration: string;
  };
  'inventory.low_stock': {
    itemId: string;
    itemName: string;
    sku: string;
    currentStock: number;
    threshold: number;
    branchId: string;
    branchName?: string;
  };
  'lab_order.sla_overdue': {
    orderId: string;
    patientName: string;
    promisedDate: string;
    daysOverdue: number;
    branchId: string;
  };
  'lab_order.ready_pickup': {
    orderId: string;
    patientName: string;
    branchId: string;
  };
  'subscription.payment_failed': {
    invoiceId: string;
    amount: string;
    gracePeriodDays: number;
  };
  'approval.requested': {
    requestId: string;
    requestType: string;
    requesterName: string;
  };
  'patient.exam_recall': {
    patientId: string;
    patientName: string;
    lastExamDate: string;
  };
}

export type NotificationEventType = keyof NotificationPayloadMap;

export interface EventDefinition<T extends NotificationEventType> {
  type: T;
  category: NotificationCategory;
  defaultSeverity: NotificationSeverity;
  defaultChannels: NotificationChannel[];
  formatTitle: (payload: NotificationPayloadMap[T]) => string;
  formatMessage: (payload: NotificationPayloadMap[T]) => string;
  formatActionUrl?: (payload: NotificationPayloadMap[T]) => string;
  formatActionLabel?: (payload: NotificationPayloadMap[T]) => string;
}

export interface NotificationItemDTO {
  id: string;
  organizationId: string;
  branchId: string | null;
  recipientId: string | null;
  targetRole: string | null;
  category: NotificationCategory;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

export interface NotificationFilter {
  unreadOnly?: boolean;
  category?: NotificationCategory;
  branchId?: string;
  limit?: number;
}
