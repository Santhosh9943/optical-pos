'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Filter,
  AlertTriangle,
  Clock,
  Sparkles,
  Inbox,
  Settings,
  X,
} from 'lucide-react';
import { NotificationItemCard } from './notification-item-card';
import type { NotificationItemDTO } from '@/lib/notifications/types';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItemDTO[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

type TabType = 'all' | 'unread' | 'alerts' | 'reminders';

export function NotificationPopover({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
}: NotificationPopoverProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter items based on active tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'alerts') return item.severity === 'high' || item.severity === 'critical';
    if (activeTab === 'reminders') return item.category === 'reminder';
    return true;
  });

  return (
    <div
      ref={popoverRef}
      data-testid="notification-popover"
      className="absolute right-0 top-12 z-50 flex w-[360px] sm:w-[420px] max-h-[560px] flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-950/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Bell className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span
              data-testid="popover-unread-count-badge"
              className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              data-testid="btn-mark-all-read"
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-popover"
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close notifications popover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 px-2 pt-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          data-testid="tab-notification-all"
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition border-b-2 ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          data-testid="tab-notification-unread"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-md transition border-b-2 ${
            activeTab === 'unread'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          data-testid="tab-notification-alerts"
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition border-b-2 ${
            activeTab === 'alerts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Alerts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          data-testid="tab-notification-reminders"
          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition border-b-2 ${
            activeTab === 'reminders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Reminders
        </button>
      </div>

      {/* Notification Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[380px]">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItemCard
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onDismiss={onDismiss}
              onClosePopover={onClose}
            />
          ))
        ) : (
          <div
            data-testid="notification-empty-state"
            className="flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {activeTab === 'unread'
                ? 'All caught up!'
                : activeTab === 'alerts'
                ? 'No active alerts'
                : activeTab === 'reminders'
                ? 'No due-date reminders'
                : 'No notifications'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
              {activeTab === 'unread'
                ? 'You have reviewed all incoming notifications.'
                : 'New alerts, system updates, and reminders will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="text-[11px] font-mono">Real-time SWR Sync Active</span>
        <Link
          href="/admin/settings"
          onClick={onClose}
          data-testid="link-notification-settings"
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <Settings className="h-3 w-3" />
          <span>Preferences</span>
        </Link>
      </div>
    </div>
  );
}
