'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useCachedResource } from '@/hooks/use-cached-resource';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  dismissNotificationAction,
  seedInitialNotificationsAction,
} from '@/actions/notification-actions';
import { NotificationPopover } from './notification-popover';
import type { NotificationItemDTO } from '@/lib/notifications/types';

export function NotificationBellTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications using SWR cache (30s refresh interval)
  const fetcher = useCallback(async () => {
    // If first load on a clean session, seed demo alerts
    await seedInitialNotificationsAction();
    return await getNotificationsAction({ limit: 40 });
  }, []);

  const { data: notificationsData, mutate, refresh } = useCachedResource<NotificationItemDTO[]>({
    cacheKey: 'notifications_feed',
    fetcher,
    refreshInterval: 30000, // 30 seconds background polling
    revalidateOnFocus: true,
    fallbackData: [],
  });

  const notifications = notificationsData || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUrgent = notifications.some(
    (n) => !n.isRead && (n.severity === 'high' || n.severity === 'critical')
  );

  // Mark single notification as read
  const handleMarkRead = useCallback(
    async (id: string) => {
      // Optimistic update
      mutate((prev) =>
        (prev || []).map((item) =>
          item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        )
      );
      await markNotificationReadAction(id);
    },
    [mutate]
  );

  // Mark all notifications as read
  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    mutate((prev) =>
      (prev || []).map((item) => ({
        ...item,
        isRead: true,
        readAt: new Date().toISOString(),
      }))
    );
    await markAllNotificationsReadAction();
  }, [mutate]);

  // Dismiss notification
  const handleDismiss = useCallback(
    async (id: string) => {
      // Optimistic update
      mutate((prev) => (prev || []).filter((item) => item.id !== id));
      await dismissNotificationAction(id);
    },
    [mutate]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="topbar-notification-bell"
        aria-label="Toggle notifications center"
        aria-expanded={isOpen}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
          isOpen
            ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
        title="Notifications Center (Alerts, Reminders & Updates)"
      >
        <Bell className="h-4 w-4" />

        {/* Unread Count Badge */}
        {mounted && unreadCount > 0 && (
          <span
            data-testid="notification-badge-count"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-mono font-bold text-white shadow-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Urgent High/Critical Priority Pulse Indicator */}
        {mounted && hasUrgent && (
          <span
            data-testid="notification-urgent-ping"
            className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <NotificationPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
