/**
 * Notification Event Registry
 * 
 * Central registry mapping domain event types to presentation logic,
 * default severity levels, categories, formatters, and action links.
 */

import type {
  NotificationEventType,
  NotificationPayloadMap,
  EventDefinition,
  NotificationCategory,
  NotificationSeverity,
  NotificationChannel,
} from './types';

export const EVENT_REGISTRY: {
  [K in NotificationEventType]: EventDefinition<K>;
} = {
  'system.announcement': {
    type: 'system.announcement',
    category: 'system',
    defaultSeverity: 'low',
    defaultChannels: ['in_app'],
    formatTitle: (p) => p.title || 'System Announcement',
    formatMessage: (p) => p.message,
    formatActionUrl: (p) => p.actionUrl || '/admin/settings',
    formatActionLabel: () => 'Read More',
  },

  'system.maintenance': {
    type: 'system.maintenance',
    category: 'system',
    defaultSeverity: 'medium',
    defaultChannels: ['in_app', 'email'],
    formatTitle: () => 'Scheduled System Maintenance',
    formatMessage: (p) =>
      `Maintenance scheduled for ${p.window} (${p.expectedDuration}). Reason: ${p.reason}`,
    formatActionUrl: () => '/admin/settings',
    formatActionLabel: () => 'System Status',
  },

  'inventory.low_stock': {
    type: 'inventory.low_stock',
    category: 'alert',
    defaultSeverity: 'high',
    defaultChannels: ['in_app'],
    formatTitle: (p) => `Low Stock Alert: ${p.itemName}`,
    formatMessage: (p) =>
      `Item SKU ${p.sku} has dropped to ${p.currentStock} units (reorder threshold: ${p.threshold}).`,
    formatActionUrl: (p) => `/admin/inventory?search=${encodeURIComponent(p.sku)}`,
    formatActionLabel: () => 'View Inventory',
  },

  'lab_order.sla_overdue': {
    type: 'lab_order.sla_overdue',
    category: 'reminder',
    defaultSeverity: 'high',
    defaultChannels: ['in_app'],
    formatTitle: (p) => `Lab Order SLA Overdue: ${p.patientName}`,
    formatMessage: (p) =>
      `Order promised on ${p.promisedDate} is overdue by ${p.daysOverdue} day(s). Immediate workshop attention needed.`,
    formatActionUrl: (p) => `/admin/lab-orders?orderId=${p.orderId}`,
    formatActionLabel: () => 'Open Workshop Kanban',
  },

  'lab_order.ready_pickup': {
    type: 'lab_order.ready_pickup',
    category: 'reminder',
    defaultSeverity: 'medium',
    defaultChannels: ['in_app'],
    formatTitle: (p) => `Spectacles Ready for Collection`,
    formatMessage: (p) =>
      `Spectacles for ${p.patientName} have completed lens mounting and are waiting for collection.`,
    formatActionUrl: (p) => `/admin/lab-orders?orderId=${p.orderId}`,
    formatActionLabel: () => 'View Order',
  },

  'subscription.payment_failed': {
    type: 'subscription.payment_failed',
    category: 'alert',
    defaultSeverity: 'critical',
    defaultChannels: ['in_app', 'email'],
    formatTitle: () => 'Subscription Payment Failed',
    formatMessage: (p) =>
      `Your practice renewal payment of ₹${p.amount} failed. Grace period: ${p.gracePeriodDays} days before access restriction.`,
    formatActionUrl: () => '/pricing',
    formatActionLabel: () => 'Update Payment Method',
  },

  'approval.requested': {
    type: 'approval.requested',
    category: 'alert',
    defaultSeverity: 'medium',
    defaultChannels: ['in_app'],
    formatTitle: () => 'Privileged Action Approval Required',
    formatMessage: (p) =>
      `${p.requesterName} requested authorization for: ${p.requestType}.`,
    formatActionUrl: () => '/super-admin/approvals',
    formatActionLabel: () => 'Review Request',
  },

  'patient.exam_recall': {
    type: 'patient.exam_recall',
    category: 'reminder',
    defaultSeverity: 'low',
    defaultChannels: ['in_app'],
    formatTitle: (p) => `Annual Eye Exam Due: ${p.patientName}`,
    formatMessage: (p) =>
      `It has been over 12 months since the last refraction on ${p.lastExamDate}. Recall message recommended.`,
    formatActionUrl: (p) => `/admin/patients?patientId=${p.patientId}`,
    formatActionLabel: () => 'Patient Refraction',
  },
};

/**
 * Helper to get an event definition safely with a fallback.
 */
export function getEventDefinition<T extends NotificationEventType>(
  type: T
): EventDefinition<T> {
  const def = EVENT_REGISTRY[type];
  if (!def) {
    throw new Error(`Unregistered notification event type: ${type}`);
  }
  return def;
}
