'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import type { NotificationItemDTO, NotificationSeverity, NotificationCategory } from '@/lib/notifications/types';

interface NotificationItemCardProps {
  notification: NotificationItemDTO;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClosePopover?: () => void;
}

function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getCategoryIcon(category: NotificationCategory, severity: NotificationSeverity) {
  if (severity === 'critical') {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  if (severity === 'high') {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  switch (category) {
    case 'system':
      return <Sparkles className="h-4 w-4 text-blue-500" />;
    case 'alert':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'reminder':
      return <Clock className="h-4 w-4 text-emerald-500" />;
    default:
      return <Bell className="h-4 w-4 text-slate-500" />;
  }
}

function getSeverityBadge(severity: NotificationSeverity) {
  switch (severity) {
    case 'critical':
      return (
        <span className="rounded bg-red-100 dark:bg-red-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:text-red-300">
          Critical
        </span>
      );
    case 'high':
      return (
        <span className="rounded bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
          Warning
        </span>
      );
    case 'medium':
      return (
        <span className="rounded bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-300">
          Attention
        </span>
      );
    case 'low':
    default:
      return (
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-slate-300">
          Info
        </span>
      );
  }
}

export function NotificationItemCard({
  notification,
  onMarkRead,
  onDismiss,
  onClosePopover,
}: NotificationItemCardProps) {
  return (
    <div
      data-testid={`notification-item-${notification.id}`}
      className={`group relative flex flex-col gap-1.5 p-3 transition border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
        !notification.isRead
          ? 'bg-blue-50/30 dark:bg-blue-950/20'
          : 'bg-white dark:bg-slate-900'
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
            {getCategoryIcon(notification.category, notification.severity)}
          </div>
          {getSeverityBadge(notification.severity)}
          <span className="text-[10px] text-muted-foreground truncate">
            {getRelativeTime(notification.createdAt)}
          </span>
        </div>

        {/* Action Controls & Unread Dot */}
        <div className="flex items-center gap-1 shrink-0">
          {!notification.isRead && (
            <span
              data-testid="notification-unread-dot"
              className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"
              title="Unread"
            />
          )}

          {/* Quick Mark Read Button */}
          {!notification.isRead && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              data-testid={`btn-mark-read-${notification.id}`}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition"
              title="Mark as read"
              aria-label="Mark as read"
            >
              <Check className="h-3 w-3" />
            </button>
          )}

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(notification.id);
            }}
            data-testid={`btn-dismiss-${notification.id}`}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="pl-7">
        <h4 className="text-xs font-semibold text-foreground leading-snug">
          {notification.title}
        </h4>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {/* Action Link Button if Available */}
        {notification.actionUrl && (
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={notification.actionUrl}
              onClick={() => {
                if (!notification.isRead) {
                  onMarkRead(notification.id);
                }
                onClosePopover?.();
              }}
              data-testid={`notification-action-${notification.id}`}
              className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition"
            >
              <span>{notification.actionLabel || 'View Details'}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
