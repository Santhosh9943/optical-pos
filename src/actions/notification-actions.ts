'use server';

/**
 * OptixOS Notification Server Actions
 * 
 * Provides type-safe queries and mutations for the notification center,
 * including unread count calculations, per-user read tracking,
 * and modular event dispatching with deduplication.
 */

import { db } from '@/db';
import {
  notifications,
  notificationReads,
  notificationPreferences,
  type Notification,
} from '@/db/schema';
import { eq, and, or, isNull, desc, inArray, sql } from 'drizzle-orm';
import { getCurrentSession, requireAuthSession, canAccessBranches } from '@/lib/auth-utils';
import { dispatchNotificationInternal } from '@/lib/notifications-internal';
import { invalidateCache, withCache } from '@/lib/cache';
import type {
  NotificationEventType,
  NotificationPayloadMap,
  NotificationItemDTO,
  NotificationFilter,
  NotificationSeverity,
} from '@/lib/notifications/types';

/**
 * Fetches notifications for the active user session and organization.
 * Dynamically correlates with notification_reads to determine read status.
 */
export async function getNotificationsAction(
  filter: NotificationFilter = {}
): Promise<NotificationItemDTO[]> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return [];
    }

    const userId = session.user?.id || 'synthetic-session-user';
    const limit = filter.limit || 30;

    // Build query conditions
    const conditions = [
      eq(notifications.organizationId, session.organizationId),
      // User targeting: either explicitly addressed to this user, or broadcast (recipientId is null)
      or(
        eq(notifications.recipientId, userId),
        isNull(notifications.recipientId)
      ),
    ];

    // Branch scoping: include if practice-wide (branchId is null) or matches active branch
    if (filter.branchId) {
      conditions.push(
        or(
          isNull(notifications.branchId),
          eq(notifications.branchId, filter.branchId)
        )
      );
    }

    if (filter.category) {
      conditions.push(eq(notifications.category, filter.category));
    }

    // Query notifications with left join on user reads
    const rows = await db
      .select({
        notification: notifications,
        read: notificationReads,
      })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.userId, userId)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const items: NotificationItemDTO[] = rows
      .filter((r) => !r.read?.dismissedAt)
      .map(({ notification, read }) => ({
        id: notification.id,
        organizationId: notification.organizationId,
        branchId: notification.branchId,
        recipientId: notification.recipientId,
        targetRole: notification.targetRole,
        category: notification.category as NotificationItemDTO['category'],
        type: notification.type,
        severity: notification.severity as NotificationSeverity,
        title: notification.title,
        message: notification.message,
        metadata: (notification.metadata as Record<string, unknown>) || null,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        createdAt: notification.createdAt.toISOString(),
        isRead: !!read?.readAt,
        readAt: read?.readAt ? read.readAt.toISOString() : null,
      }));

    if (filter.unreadOnly) {
      return items.filter((item) => !item.isRead);
    }

    return items;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Calculates unread notifications count and urgency indicator for the active user.
 */
export async function getUnreadNotificationCountAction(): Promise<{
  unreadCount: number;
  hasUrgent: boolean;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { unreadCount: 0, hasUrgent: false };
    }

    const userId = session.user?.id || 'synthetic-session-user';

    // Fetch unread items
    const unreadItems = await getNotificationsAction({ unreadOnly: true, limit: 100 });
    const unreadCount = unreadItems.length;
    const hasUrgent = unreadItems.some(
      (n) => n.severity === 'high' || n.severity === 'critical'
    );

    return { unreadCount, hasUrgent };
  } catch (error) {
    console.error('Error calculating unread notifications:', error);
    return { unreadCount: 0, hasUrgent: false };
  }
}

/**
 * Marks a single notification as read for the active user.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<{ success: boolean }> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: false };
    }

    const userId = session.user?.id || 'synthetic-session-user';

    // Insert or update notification_reads
    await db
      .insert(notificationReads)
      .values({
        notificationId,
        userId,
        readAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [notificationReads.notificationId, notificationReads.userId],
        set: { readAt: new Date() },
      });

    await invalidateCache({
      orgId: session.organizationId,
      namespace: 'notifications',
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false };
  }
}

/**
 * Marks all notifications in the organization as read for the active user.
 */
export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: false, count: 0 };
    }

    const userId = session.user?.id || 'synthetic-session-user';
    const unreadList = await getNotificationsAction({ unreadOnly: true, limit: 100 });

    if (unreadList.length === 0) {
      return { success: true, count: 0 };
    }

    // Single batched upsert instead of an N+1 insert loop
    const now = new Date();
    await db
      .insert(notificationReads)
      .values(
        unreadList.map((item) => ({
          notificationId: item.id,
          userId,
          readAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: [notificationReads.notificationId, notificationReads.userId],
        set: { readAt: now },
      });

    await invalidateCache({
      orgId: session.organizationId,
      namespace: 'notifications',
    });

    return { success: true, count: unreadList.length };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Dismisses a notification (hides from feed for this user).
 */
export async function dismissNotificationAction(
  notificationId: string
): Promise<{ success: boolean }> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: false };
    }

    const userId = session.user?.id || 'synthetic-session-user';
    const now = new Date();

    await db
      .insert(notificationReads)
      .values({
        notificationId,
        userId,
        readAt: now,
        dismissedAt: now,
      })
      .onConflictDoUpdate({
        target: [notificationReads.notificationId, notificationReads.userId],
        set: { dismissedAt: now },
      });

    await invalidateCache({
      orgId: session.organizationId,
      namespace: 'notifications',
    });

    return { success: true };
  } catch (error) {
    console.error('Error dismissing notification:', error);
    return { success: false };
  }
}

/**
 * @description Client-callable, type-safe notification dispatcher.
 * Security: requires an authenticated session; the organization is ALWAYS the caller's session
 * organization (any client-supplied `organizationId` must match it or the call is rejected), an
 * optional `branchId` must belong to that organization, and action links are restricted to
 * same-origin relative paths. Server code that already resolved a trusted org should call
 * `dispatchNotificationInternal` from `@/lib/notifications-internal` instead.
 * @param params - Event type, payload and targeting options
 * @returns `{ success, id?, deduplicated? }`
 */
export async function dispatchNotificationAction<T extends NotificationEventType>(params: {
  type: T;
  payload: NotificationPayloadMap[T];
  organizationId?: string;
  branchId?: string;
  recipientId?: string;
  targetRole?: string;
  severity?: NotificationSeverity;
  dedupKey?: string;
}): Promise<{ success: boolean; id?: string; deduplicated?: boolean }> {
  try {
    const session = await requireAuthSession();

    if (params.organizationId && params.organizationId !== session.organizationId) {
      return { success: false };
    }
    if (params.branchId && !(await canAccessBranches(session, [params.branchId]))) {
      return { success: false };
    }

    return await dispatchNotificationInternal({
      type: params.type,
      payload: params.payload,
      organizationId: session.organizationId,
      branchId: params.branchId,
      recipientId: params.recipientId,
      targetRole: params.targetRole,
      severity: params.severity,
      dedupKey: params.dedupKey,
    });
  } catch (error) {
    console.error('Error dispatching notification:', error);
    return { success: false };
  }
}

/**
 * Development / Demo Seeder:
 * Provisions 3 initial realistic notifications if the feed is empty,
 * allowing immediate testing of System Updates, Warnings, and Reminders.
 */
export async function seedInitialNotificationsAction(): Promise<{ seeded: boolean }> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { seeded: false };
    }

    const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.organizationId, session.organizationId));

    if (Number(existing[0]?.count || 0) > 0) {
      return { seeded: false };
    }

    // 1. System update
    await dispatchNotificationInternal({
      type: 'system.announcement',
      organizationId: session.organizationId,
      severity: 'low',
      payload: {
        title: 'OptixOS v2.4 Feature Release',
        message:
          'Single-Store operational isolation and Consolidated Practice Reports Hub are now active across your practice.',
        version: 'v2.4.0',
        actionUrl: '/admin/reports',
      },
    });

    // 2. Warning / Alert
    await dispatchNotificationInternal({
      type: 'inventory.low_stock',
      organizationId: session.organizationId,
      branchId: session.branchId,
      severity: 'high',
      payload: {
        itemId: 'demo-item-1',
        itemName: 'Ray-Ban Wayfarer Classic (RB2140)',
        sku: 'RB-2140-901',
        currentStock: 2,
        threshold: 5,
        branchId: session.branchId,
      },
    });

    // 3. Due-date reminder
    await dispatchNotificationInternal({
      type: 'lab_order.sla_overdue',
      organizationId: session.organizationId,
      branchId: session.branchId,
      severity: 'high',
      payload: {
        orderId: 'demo-order-1',
        patientName: 'Aarav Sharma',
        promisedDate: new Date().toLocaleDateString('en-IN'),
        daysOverdue: 1,
        branchId: session.branchId,
      },
    });

    return { seeded: true };
  } catch (error) {
    console.error('Error seeding initial notifications:', error);
    return { seeded: false };
  }
}
