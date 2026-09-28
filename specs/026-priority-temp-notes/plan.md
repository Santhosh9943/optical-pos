# Implementation Plan: Priority Notes (Temp Notes) Floating Drawer / Widget

- **Feature ID**: `026-priority-temp-notes`
- **Specification**: [`specs/026-priority-temp-notes/spec.md`](file:///f:/hobby-projects/optical-pos/specs/026-priority-temp-notes/spec.md)
- **Task Tracker**: [`specs/026-priority-temp-notes/tasks.md`](file:///f:/hobby-projects/optical-pos/specs/026-priority-temp-notes/tasks.md)

---

## 1. Architectural Strategy

- **Self-Contained Client State**: Avoid backend database schema changes or foreign keys; temporary scratchpad notes are store-clerk and device-specific.
- **Zustand with LocalStorage Persistence**:
  - Store key: `'priority_notes_cache'`.
  - Replaces fragile standalone state with unified state machine supporting batch edit snapshots, soft deletes, drag-and-drop, and pinned viewports.
- **Component-First Design System**:
  - Centralized UI components from `@/components/ui/` (`Button`, `Badge`, `Input`, `Dialog`).
  - Semantic tokens strictly without arbitrary hex colors.
- **Native HTML5 Drag-and-Drop**:
  - Zero third-party library dependencies, eliminating React 19 peer-dependency conflicts.
  - Simple `dataTransfer.setData` and priority drop target detection.

---

## 2. File Organization & Vertical Slice

```
src/
├── store/
│   └── priority-notes-store.ts        # Zustand store with persistence & action reducers
├── components/
│   └── priority-notes/
│       ├── priority-notes-trigger.tsx  # Topbar icon launcher with badge & ping indicator
│       ├── priority-notes-drawer.tsx   # Slide-over panel (header, quick add, list, trash)
│       └── priority-note-card.tsx      # Individual note card (normal, edit, DnD states)
├── app/
│   └── (dashboard)/layout.tsx         # Mount trigger in topbar & drawer in main container
e2e/
└── priority-notes.spec.ts             # Comprehensive Playwright E2E test suite
```

---

## 3. Implementation Steps

1. **Zustand Store**: Define `PriorityNote`, `PriorityTier`, actions (`addNote`, `toggleComplete`, `updateText`, `changePriority`, `softDelete`, `restore`, `emptyTrash`, `clearCompleted`, `batchSave`, `toggleDrawer`, `togglePin`).
2. **Components**:
   - `PriorityNotesTrigger`: Sticky note icon button, badge count, pulse dot for high priority, keyboard accessibility.
   - `PriorityNoteCard`: Card with checkbox, text, badge, hover pencil/trash, inline edit inputs, drag handles in batch mode.
   - `PriorityNotesDrawer`: Slide-out container, pin toggle with rotation, quick add card with priority pills, grouped priority lists, empty drop-zones, tip banner, collapsible trash bin.
3. **Integration**: Wire `<PriorityNotesTrigger>` and `<PriorityNotesDrawer>` into `DashboardLayout`.
4. **Validation**: Execute `npm run check`, `npm run audit:design`, `npm run audit:security`, author Playwright tests in `e2e/priority-notes.spec.ts`, and run `npm run test:pos`.
