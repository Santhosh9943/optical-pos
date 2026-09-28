'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Pencil,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
  Flame,
  Zap,
  Coffee,
  Store,
} from 'lucide-react';
import { PriorityNote, PriorityTier } from '@/store/priority-notes-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PriorityNoteCardProps {
  note: PriorityNote;
  isBatchMode?: boolean;
  showBranchBadge?: boolean;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onChangePriority: (id: string, priority: PriorityTier) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
}

export function PriorityNoteCard({
  note,
  isBatchMode = false,
  showBranchBadge = false,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onChangePriority,
  onDragStart,
}: PriorityNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);

  useEffect(() => {
    setEditText(note.text);
  }, [note.text]);

  const handleSaveInline = () => {
    if (editText.trim() && editText.trim() !== note.text) {
      onUpdateText(note.id, editText);
    }
    setIsEditing(false);
  };

  const handleCancelInline = () => {
    setEditText(note.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveInline();
    } else if (e.key === 'Escape') {
      handleCancelInline();
    }
  };

  // Priority metadata styling
  const priorityConfig: Record<
    PriorityTier,
    { label: string; badgeVariant: 'destructive' | 'warning' | 'success'; icon: React.ReactNode }
  > = {
    high: {
      label: 'High',
      badgeVariant: 'destructive',
      icon: <Flame className="h-3 w-3 text-red-500" />,
    },
    medium: {
      label: 'Med',
      badgeVariant: 'warning',
      icon: <Zap className="h-3 w-3 text-amber-500" />,
    },
    low: {
      label: 'Low',
      badgeVariant: 'success',
      icon: <Coffee className="h-3 w-3 text-emerald-500" />,
    },
  };

  const config = priorityConfig[note.priority];

  return (
    <div
      draggable={isBatchMode}
      onDragStart={(e) => onDragStart?.(e, note.id)}
      data-testid={`note-card-${note.id}`}
      className={`group relative flex flex-col rounded-lg border bg-card p-3 shadow-2xs transition-all duration-150 ${
        note.completed ? 'opacity-60 bg-muted/40 border-muted' : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
      } ${isBatchMode ? 'cursor-grab active:cursor-grabbing hover:shadow-xs' : ''}`}
    >
      {/* Batch Mode: Drag handle + Quick Priority Switch */}
      {isBatchMode ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <GripVertical className="h-4 w-4 text-muted-foreground/70" />
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
                Drag to shift
              </span>
            </div>
            <div className="flex items-center gap-1">
              {(['high', 'medium', 'low'] as PriorityTier[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangePriority(note.id, p)}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded transition ${
                    note.priority === p
                      ? p === 'high'
                        ? 'bg-red-600 text-white'
                        : p === 'medium'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p === 'high' ? 'High' : p === 'medium' ? 'Med' : 'Low'}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value);
              onUpdateText(note.id, e.target.value);
            }}
            className="w-full text-xs bg-background border border-input rounded px-2 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            placeholder="Edit note text..."
          />
          {showBranchBadge && note.branchName && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
              <Store className="h-3 w-3" />
              <span>{note.branchName}</span>
            </div>
          )}
        </div>
      ) : isEditing ? (
        /* Single Item Inline Edit Mode */
        <div className="flex flex-col gap-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={2}
            className="w-full text-xs bg-background border border-input rounded-md p-1.5 text-foreground resize-none focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-between gap-1.5">
            {showBranchBadge && note.branchName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Store className="h-2.5 w-2.5" />
                <span>{note.branchName}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                size="iconSm"
                variant="ghost"
                onClick={handleCancelInline}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                size="iconSm"
                variant="success"
                onClick={handleSaveInline}
                title="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Normal Card View */
        <div className="flex items-start gap-2.5">
          {/* Circular Completion Checkbox */}
          <button
            type="button"
            onClick={() => onToggleComplete(note.id)}
            data-testid={`checkbox-complete-${note.id}`}
            aria-label={note.completed ? 'Mark uncompleted' : 'Mark completed'}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition focus-visible:outline-hidden"
          >
            {note.completed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-primary" />
            )}
          </button>

          {/* Note Body Text */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs leading-relaxed break-words ${
                note.completed
                  ? 'line-through text-muted-foreground'
                  : 'text-foreground'
              }`}
            >
              {note.text}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
              <Badge
                variant={config.badgeVariant}
                size="sm"
                className="gap-1 px-1.5 py-0 text-[10px]"
              >
                {config.icon}
                <span>{config.label}</span>
              </Badge>

              {showBranchBadge && note.branchName && (
                <span
                  data-testid={`badge-branch-${note.id}`}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium"
                >
                  <Store className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="truncate max-w-[140px]">{note.branchName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Hover Actions (Pencil & Trash) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              data-testid={`btn-edit-note-${note.id}`}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
              title="Edit note"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              data-testid={`btn-delete-note-${note.id}`}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
              title="Move to trash"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
