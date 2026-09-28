# Task Tracker: Priority Notes (Temp Notes) Floating Drawer / Widget

- **Feature ID**: `026-priority-temp-notes`
- **Spec**: [`specs/026-priority-temp-notes/spec.md`](file:///f:/hobby-projects/optical-pos/specs/026-priority-temp-notes/spec.md)
- **Plan**: [`specs/026-priority-temp-notes/plan.md`](file:///f:/hobby-projects/optical-pos/specs/026-priority-temp-notes/plan.md)

---

## Task Checklist

### Phase 1: State Store & Persistence
- [x] Task 1.1: Create `src/store/priority-notes-store.ts` with `PriorityNote`, `PriorityTier`, Zustand `persist` (`'priority_notes_cache'`), and action methods.

### Phase 2: UI Components
- [x] Task 2.1: Create `src/components/priority-notes/priority-note-card.tsx` supporting normal mode, completion checkbox, hover actions, inline edit, and batch mode drag handles.
- [x] Task 2.2: Create `src/components/priority-notes/priority-notes-drawer.tsx` with header (pin toggle, edit/save/cancel, close), quick add card (priority pills), grouped priority sections, dashed drop-zones, tip banner, and collapsible trash bin.
- [x] Task 2.3: Create `src/components/priority-notes/priority-notes-trigger.tsx` with sticky note icon, uncompleted count badge, and urgent high-priority indicator dot.

### Phase 3: Layout Integration
- [x] Task 3.1: Mount `PriorityNotesTrigger` into the topbar header of `src/app/(dashboard)/layout.tsx`.
- [x] Task 3.2: Mount `PriorityNotesDrawer` in `src/app/(dashboard)/layout.tsx` supporting floating overlay and pinned side-by-side mode.

### Phase 4: Verification & Quality Gate
- [x] Task 4.1: Author Playwright test suite `e2e/priority-notes.spec.ts` (6/6 passed).
- [x] Task 4.2: Run `npm run check` (0 errors, 0 warnings).
- [x] Task 4.3: Run `npm run audit:design` (0 violations).
- [x] Task 4.4: Run `npm run audit:security` (0 critical violations).
- [x] Task 4.5: Run `npm run test:pos` (12/12 passed).
- [x] Task 4.6: Update knowledge graph (`graphify update .`).
- [x] Task 4.7: Update `docs/agent-memory/SESSION_HANDOFF.md` and `docs/TASKS.md`.
