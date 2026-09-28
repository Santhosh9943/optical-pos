'use client';

import React, { useState, useEffect } from 'react';
import { StickyNote } from 'lucide-react';
import { usePriorityNotesStore } from '@/store/priority-notes-store';
import { useTenantStore } from '@/store/tenant-store';

export function PriorityNotesTrigger() {
  const { notes, isOpen, toggleDrawer, drawerBranchFilter } = usePriorityNotesStore();
  const { activeRoleMode, selectedBranchId, branches } = useTenantStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveBranchId =
    selectedBranchId ||
    branches[0]?.id ||
    '00000000-0000-0000-0000-000000000002';

  // Filter active uncompleted notes according to active store scope
  const activeUncompletedNotes = mounted
    ? notes.filter((n) => {
        if (n.deleted || n.completed) return false;
        return n.branchId === effectiveBranchId;
      })
    : [];

  const hasHighPriority = activeUncompletedNotes.some((n) => n.priority === 'high');
  const count = activeUncompletedNotes.length;

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      data-testid="topbar-priority-notes-trigger"
      aria-label="Toggle Priority Notes Drawer"
      aria-expanded={isOpen}
      className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
        isOpen
          ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
      title="Priority Notes (Temporary Tasks & Scratchpad)"
    >
      <StickyNote className="h-4 w-4" />

      {/* Active Uncompleted Count Badge */}
      {mounted && count > 0 && (
        <span
          data-testid="priority-notes-badge-count"
          className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-mono font-bold text-white shadow-xs"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}

      {/* Urgent High-Priority Pulse Indicator */}
      {mounted && hasHighPriority && (
        <span
          data-testid="priority-notes-urgent-ping"
          className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
        </span>
      )}
    </button>
  );
}
