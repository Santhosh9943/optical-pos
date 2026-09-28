'use client';

import React, { useState, useMemo } from 'react';
import {
  Pin,
  X,
  StickyNote,
  Flame,
  Zap,
  Coffee,
  Trash2,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Store,
  Lock,
} from 'lucide-react';
import {
  usePriorityNotesStore,
  PriorityTier,
  PriorityNote,
} from '@/store/priority-notes-store';
import { useTenantStore } from '@/store/tenant-store';
import { PriorityNoteCard } from './priority-note-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DEFAULT_MAIN_BRANCH_ID = '00000000-0000-0000-0000-000000000002';
const DEFAULT_MAIN_BRANCH_NAME = 'Main Branch';
const DEFAULT_SECOND_BRANCH_ID = '00000000-0000-0000-0000-000000000003';
const DEFAULT_SECOND_BRANCH_NAME = 'Downtown Flagship';

export function PriorityNotesDrawer() {
  const {
    notes,
    isOpen,
    isPinned,
    isBatchEditing,
    trashExpanded,
    drawerBranchFilter,
    setIsOpen,
    togglePin,
    toggleTrash,
    setDrawerBranchFilter,
    addNote,
    toggleComplete,
    updateNoteText,
    changePriority,
    softDeleteNote,
    restoreNote,
    emptyTrash,
    clearCompleted,
    startBatchEdit,
    cancelBatchEdit,
    saveBatchEdit,
  } = usePriorityNotesStore();

  const {
    activeRoleMode,
    branches,
    selectedBranchId,
    setSelectedBranch,
  } = useTenantStore();

  const [newText, setNewText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityTier>('medium');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  // Available branches list with fallback defaults
  const availableBranches = useMemo(() => {
    if (branches && branches.length > 0) {
      return branches;
    }
    return [
      {
        id: DEFAULT_MAIN_BRANCH_ID,
        name: DEFAULT_MAIN_BRANCH_NAME,
        organizationId: '00000000-0000-0000-0000-000000000001',
        isActive: true,
      },
      {
        id: DEFAULT_SECOND_BRANCH_ID,
        name: DEFAULT_SECOND_BRANCH_NAME,
        organizationId: '00000000-0000-0000-0000-000000000001',
        isActive: true,
      },
    ];
  }, [branches]);

  // Determine if user is Organization Admin
  const isOrgAdmin =
    activeRoleMode === 'super_admin' || activeRoleMode === 'organizer';

  // Effective active branch for single-store notes
  const activeSingleBranchId = useMemo(() => {
    if (selectedBranchId && selectedBranchId !== 'all') {
      const match = availableBranches.find((b) => b.id === selectedBranchId);
      if (match) return match.id;
    }
    return availableBranches[0]?.id || DEFAULT_MAIN_BRANCH_ID;
  }, [selectedBranchId, availableBranches]);

  const activeBranchName = useMemo(() => {
    const match = availableBranches.find((b) => b.id === activeSingleBranchId);
    return match ? match.name : DEFAULT_MAIN_BRANCH_NAME;
  }, [activeSingleBranchId, availableBranches]);

  // Notes are strictly scoped to the active selected store
  const activeNotesInScope = notes.filter((n) => {
    if (n.deleted) return false;
    return n.branchId === activeSingleBranchId;
  });

  const deletedNotesInScope = notes.filter((n) => {
    if (!n.deleted) return false;
    return n.branchId === activeSingleBranchId;
  });

  const completedCount = activeNotesInScope.filter((n) => n.completed).length;

  if (!isOpen) return null;

  // Single branch notes lists
  const highNotes = activeNotesInScope.filter((n) => n.priority === 'high');
  const medNotes = activeNotesInScope.filter((n) => n.priority === 'medium');
  const lowNotes = activeNotesInScope.filter((n) => n.priority === 'low');

  const handleAddSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newText.trim()) return;

    const targetBranch =
      availableBranches.find((b) => b.id === activeSingleBranchId) ||
      availableBranches[0];

    addNote(newText, selectedPriority, targetBranch?.id, targetBranch?.name);
    setNewText('');
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSubmit();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNoteId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnBucket = (priority: PriorityTier) => {
    if (!draggedNoteId) return;
    changePriority(draggedNoteId, priority);
    setDraggedNoteId(null);
  };

  return (
    <>
      {/* Backdrop overlay for floating mode only */}
      {!isPinned && (
        <div
          data-testid="priority-notes-backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs transition-opacity duration-200"
        />
      )}

      {/* Slide-Over Drawer Container */}
      <aside
        data-testid="priority-notes-drawer"
        className="fixed top-0 right-0 z-50 flex h-full w-[340px] sm:w-[360px] flex-col border-l border-border bg-slate-50 dark:bg-slate-900 shadow-2xl transition-transform duration-300"
      >
        {/* ── 1. Panel Header ── */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
          {/* Left: Pin Toggle Button */}
          <button
            type="button"
            onClick={togglePin}
            data-testid="btn-pin-drawer"
            className={`p-1.5 rounded-md transition focus-visible:outline-hidden ${
              isPinned
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rotate-0'
                : 'text-muted-foreground hover:bg-muted -rotate-45'
            }`}
            title={isPinned ? 'Unpin (Floating mode)' : 'Pin alongside dashboard'}
          >
            <Pin className="h-4 w-4" />
          </button>

          {/* Center: Title Area */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <StickyNote className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">Priority Notes</span>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                {activeNotesInScope.length}
              </Badge>
            </div>
          </div>

          {/* Right: Action Controls */}
          <div className="flex items-center gap-1">
            {isBatchEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelBatchEdit}
                  data-testid="btn-cancel-batch"
                  className="h-8 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => saveBatchEdit()}
                  data-testid="btn-save-batch"
                  className="h-8 px-2 text-xs"
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startBatchEdit}
                  data-testid="btn-edit-batch"
                  className="h-8 px-2 text-xs"
                >
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  data-testid="btn-close-drawer"
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 2. Store Branch Scope Bar ── */}
        <div
          data-testid="store-scope-bar"
          className="border-b border-border bg-muted/40 px-3 py-2 shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground min-w-0 flex-1">
              <Store className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Store:
              </span>
              {availableBranches.length > 1 ? (
                <select
                  data-testid="select-branch-filter"
                  value={activeSingleBranchId}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setDrawerBranchFilter(e.target.value);
                  }}
                  className="h-7 text-xs font-medium bg-background border border-input rounded px-2 py-0.5 text-foreground truncate focus:outline-hidden focus:ring-1 focus:ring-primary max-w-[180px]"
                >
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  data-testid="label-single-branch"
                  className="text-xs font-medium text-foreground truncate max-w-[180px]"
                >
                  {activeBranchName}
                </span>
              )}
            </div>

            {/* Role Scope Badge */}
            {isOrgAdmin ? (
              <Badge
                variant="outline"
                size="sm"
                data-testid="badge-org-admin-access"
                className="text-[9px] font-mono px-1 py-0 shrink-0 border-blue-500/30 text-blue-600 dark:text-blue-400"
              >
                Org Admin
              </Badge>
            ) : (
              <span
                data-testid="badge-single-store-locked"
                title="Store staff access (single branch view only)"
                className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0"
              >
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                <span>Single Store</span>
              </span>
            )}
          </div>
        </div>

        {/* ── 3. Quick Add Card (Top Input) ── */}
        <div className="border-b border-border bg-card p-3 shrink-0 space-y-2">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-2">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDownTextarea}
              placeholder="Write a temporary note..."
              rows={2}
              data-testid="input-quick-note"
              className="w-full resize-none rounded-lg border border-input bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />

            <div className="flex items-center justify-between">
              {/* Priority Pill Selector */}
              <div className="flex items-center gap-1">
                {(['high', 'medium', 'low'] as PriorityTier[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPriority(p)}
                    data-testid={`pill-priority-${p}`}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                      selectedPriority === p
                        ? p === 'high'
                          ? 'bg-red-600 text-white shadow-2xs'
                          : p === 'medium'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p === 'high' ? 'High' : p === 'medium' ? 'Med' : 'Low'}
                  </button>
                ))}
              </div>

              {/* Add / Save Button */}
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!newText.trim()}
                data-testid="btn-add-note"
                className="h-7 text-xs font-semibold px-3"
              >
                Add Note
              </Button>
            </div>
          </form>
        </div>

        {/* ── Tip Banner (Tip to delete completed notes) ── */}
        {completedCount > 0 && (
          <div
            data-testid="tip-banner-completed"
            className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300 shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
              <span>Tip: Delete completed notes for cleaner view.</span>
            </div>
            <button
              type="button"
              onClick={() => clearCompleted(activeSingleBranchId)}
              data-testid="btn-clear-completed"
              className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 transition"
            >
              Clear
            </button>
          </div>
        )}

        {/* ── 4. Notes List (Scrollable Body) ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-4" data-testid="container-single-branch">
            {/* High Priority Group */}
            <PriorityBucketSection
              title="High Priority"
              icon={<Flame className="h-3.5 w-3.5 text-red-500" />}
              priority="high"
              notes={highNotes}
              isBatchMode={isBatchEditing}
              showBranchBadge={false}
              onDrop={() => handleDropOnBucket('high')}
              onDragStart={handleDragStart}
              onToggleComplete={toggleComplete}
              onDelete={softDeleteNote}
              onUpdateText={updateNoteText}
              onChangePriority={changePriority}
            />

            {/* Medium Priority Group */}
            <PriorityBucketSection
              title="Medium Priority"
              icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
              priority="medium"
              notes={medNotes}
              isBatchMode={isBatchEditing}
              showBranchBadge={false}
              onDrop={() => handleDropOnBucket('medium')}
              onDragStart={handleDragStart}
              onToggleComplete={toggleComplete}
              onDelete={softDeleteNote}
              onUpdateText={updateNoteText}
              onChangePriority={changePriority}
            />

            {/* Low Priority Group */}
            <PriorityBucketSection
              title="Low Priority"
              icon={<Coffee className="h-3.5 w-3.5 text-emerald-500" />}
              priority="low"
              notes={lowNotes}
              isBatchMode={isBatchEditing}
              showBranchBadge={false}
              onDrop={() => handleDropOnBucket('low')}
              onDragStart={handleDragStart}
              onToggleComplete={toggleComplete}
              onDelete={softDeleteNote}
              onUpdateText={updateNoteText}
              onChangePriority={changePriority}
            />
          </div>

          {activeNotesInScope.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <StickyNote className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold">No active temporary notes</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                No notes for {activeBranchName}. Add one above.
              </p>
            </div>
          )}
        </div>

        {/* ── 5. Trash Bin (Collapsible / Bottom Bar) ── */}
        {deletedNotesInScope.length > 0 && (
          <div
            data-testid="trash-bin-section"
            className="border-t border-border bg-card shrink-0"
          >
            {/* Collapsible Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
              <button
                type="button"
                onClick={toggleTrash}
                data-testid="btn-toggle-trash"
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Trash ({deletedNotesInScope.length})</span>
                {trashExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              <button
                type="button"
                onClick={() => emptyTrash(activeSingleBranchId)}
                data-testid="btn-empty-trash"
                className="text-[11px] font-semibold text-destructive hover:underline transition"
              >
                Empty Trash
              </button>
            </div>

            {/* Trash Items List */}
            {trashExpanded && (
              <div className="max-h-40 overflow-y-auto p-2 space-y-1.5 bg-muted/20">
                {deletedNotesInScope.map((note) => (
                  <div
                    key={note.id}
                    data-testid={`trash-item-${note.id}`}
                    className="flex items-center justify-between rounded border border-border/40 bg-card p-2 text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="line-through text-muted-foreground truncate block">
                        {note.text}
                      </span>
                    </div>
                    <Button
                      size="iconSm"
                      variant="ghost"
                      onClick={() => restoreNote(note.id)}
                      data-testid={`btn-restore-${note.id}`}
                      title="Restore note"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

interface PriorityBucketSectionProps {
  title: string;
  icon: React.ReactNode;
  priority: PriorityTier;
  notes: PriorityNote[];
  isBatchMode: boolean;
  showBranchBadge?: boolean;
  onDrop: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onChangePriority: (id: string, priority: PriorityTier) => void;
}

function PriorityBucketSection({
  title,
  icon,
  priority,
  notes,
  isBatchMode,
  showBranchBadge = false,
  onDrop,
  onDragStart,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onChangePriority,
}: PriorityBucketSectionProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => {
        setIsOver(false);
        onDrop();
      }}
      data-testid={`priority-bucket-${priority}`}
      className={`rounded-lg transition-colors ${
        isOver ? 'bg-primary/5 ring-1 ring-primary/40' : ''
      }`}
    >
      {/* Bucket Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/70">
          ({notes.length})
        </span>
      </div>

      {/* Bucket Notes Cards */}
      <div className="space-y-2">
        {notes.map((note) => (
          <PriorityNoteCard
            key={note.id}
            note={note}
            isBatchMode={isBatchMode}
            showBranchBadge={showBranchBadge}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onUpdateText={onUpdateText}
            onChangePriority={onChangePriority}
            onDragStart={onDragStart}
          />
        ))}

        {/* Empty Drop Zone indicator in Batch Mode or when bucket is empty */}
        {(notes.length === 0 || isBatchMode) && (
          <div
            className={`flex items-center justify-center rounded-lg border border-dashed border-border/80 p-2.5 text-center text-[10px] font-medium text-muted-foreground/60 transition ${
              isOver ? 'border-primary text-primary bg-primary/10' : ''
            }`}
          >
            {notes.length === 0
              ? `No ${title.toLowerCase()} notes`
              : 'Drop card here to change priority'}
          </div>
        )}
      </div>
    </div>
  );
}
