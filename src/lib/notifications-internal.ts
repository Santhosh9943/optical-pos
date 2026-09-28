/**
 * Internal (server-only, NOT a Server Action) notification dispatcher.
 *
 * This module intentionally has no `'use server'` directive, so its exports can never be invoked
 * directly from the client. Server Actions that have already authenticated the caller and resolved
 * the tenant (organizationId) call `dispatchNotificationInternal` with that trusted org id.
 */

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { invalidateCache } from '@/lib/cache';
import type {
  NotificationEventType,
  NotificationPayloadMap,
  NotificationSeverity,
} from '@/lib/notifications/types';
import { getEventDefinition } from '@/lib/notifications/event-registry';

/** Parameters for dispatching a notification with an already-verified organization id. */
export interface InternalNotificationParams<T extends NotificationEventType> {
  type: T;
  payload: NotificationPayloadMap[T];
  /** Trusted organization id resolved from the authenticated session by the caller. */
  organizationId: string;
  branchId?: string;
  recipientId?: string;
  targetRole?: string;
  severity?: NotificationSeverity;
  dedupKey?: string;
}

/**
 * @description Restricts notification action links to same-origin relative paths.
 * Accepts only paths that start with a single '/' (rejects '//host', '/\\host', schemes and control chars).
 * @param url - Candidate action URL
 * @returns The safe relative URL, or null when unsafe/absent
 */
export function sanitizeNotificationActionUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return null;
  return trimmed.slice(0, 500);
}

/**
 * @description Formats and persists a notification from the EVENT_REGISTRY with a 6-hour dedup window.
 * Callers MUST pass an organizationId obtained from an authenticated session.
 * @param params - InternalNotificationParams
 * @returns `{ success, id?, deduplicated? }`
 */
export async function dispatchNotificationInternal<T extends NotificationEventType>(
  params: InternalNotificationParams<T>
): Promise<{ success: boolean; id?: string; deduplicated?: boolean }> {
  try {
    const orgId = params.organizationId;
    if (!orgId) {
      return { success: false };
    }

    const eventDef = getEventDefinition(params.type);
    const title = eventDef.formatTitle(params.payload);
    const message = eventDef.formatMessage(params.payload);
    const actionUrl = sanitizeNotificationActionUrl(
      eventDef.formatActionUrl ? eventDef.formatActionUrl(params.payload) : null
    );
    const actionLabel = eventDef.formatActionLabel
      ? eventDef.formatActionLabel(params.payload)
      : null;
    const severity = params.severity || eventDef.defaultSeverity;

    // Deduplication check: if dedupKey provided, check if sent in last 6 hours
    if (params.dedupKey) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.organizationId, orgId),
            eq(notifications.dedupKey, params.dedupKey),
            gt(notifications.createdAt, sixHoursAgo)
          )
        )
        .limit(1);

      if (existing) {
        return { success: true, id: existing.id, deduplicated: true };
      }
    }

    const [created] = await db
      .insert(notifications)
      .values({
        organizationId: orgId,
        branchId: params.branchId || null,
        recipientId: params.recipientId || null,
        targetRole: params.targetRole || null,
        category: eventDef.category,
        type: params.type,
        severity,
        title,
        message,
        metadata: params.payload as Record<string, unknown>,
        actionUrl,
        actionLabel,
        dedupKey: params.dedupKey || null,
      })
      .returning();

    await invalidateCache({
      orgId,
      namespace: 'notifications',
    });

    return { success: true, id: created.id };
  } catch (error) {
    console.error('[dispatchNotificationInternal] Error dispatching notification:', error);
    return { success: false };
  }
}
