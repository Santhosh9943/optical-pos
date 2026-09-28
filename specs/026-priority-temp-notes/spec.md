# Feature Specification: Priority Notes (Temp Notes) Floating Drawer / Widget

- **Feature ID**: `026-priority-temp-notes`
- **Status**: `In Progress`
- **Owner**: `OptixOS Agentic Pair`
- **Target Release**: `Phase 26 / Productivity Suite`

---

## 1. Problem Statement & Business Objective
- **Problem**: Optical store managers, cashiers, and optometrists frequently need to capture quick, ephemeral reminders (e.g. "Call Dr. Sharma regarding progressives", "Unpack Zeiss 1.67 shipment at 4 PM", "Customer Patel wants silver case") without creating dummy clinical records, polluting inventory databases, or losing focus during busy billing shifts.
- **Objective**: Provide a self-contained, lightweight, persistent floating scratchpad widget ("Priority Notes") accessible directly from the topbar across all dashboard views. It features priority grouping (High, Medium, Low), circular task completion, soft-deletion Trash with restore, batch edit mode, drag-and-drop reprioritization, and pinned/floating drawer display modes.

---

## 2. User Stories & Personas

- **Store Cashier / POS Operator**:
  - *As a cashier, I want to quickly jot down a customer request or reminder from the topbar without leaving the checkout flow.*
- **Optometrist / Lab Technician**:
  - *As a technician, I want to pin high-priority temporary notes to the side of my screen while reviewing workshop jobs.*
- **Store Manager**:
  - *As a manager, I want to re-prioritize and batch-edit scratchpad notes, mark tasks complete, and restore accidentally discarded notes from the trash.*

---

## 3. Data Model & Schema

Each note strictly conforms to:
```ts
export type PriorityTier = 'high' | 'medium' | 'low';

export interface PriorityNote {
  id: string; // Unique timestamp or UUID
  text: string; // Body content of the temporary note
  priority: PriorityTier; // 'high' | 'medium' | 'low'
  completed: boolean; // Completion flag
  deleted: boolean; // Soft-delete flag (moves to Trash bin)
  createdAt: number; // Timestamp for ordering
  branchId: string; // ID of the store branch this note belongs to
  branchName: string; // Name of the store branch for display
}
```

Storage:
- Persisted in browser `localStorage` under key `'priority_notes_cache'`.
- Pinned layout preference and drawer branch filter stored under `'priority_notes_cache'`.

---

## 4. Multi-Store Branch Scoping & Role-Based Access Rules

### 4.1 Branch-Specific Isolation
- Every note is explicitly linked to a store branch (`branchId` and `branchName`).
- Store branch staff, cashiers, optometrists, and store admins only see and interact with notes created for their active branch.

### 4.2 Organization Admin Privilege (`organizer` | `super_admin`)
- Only Organization Admins have permission to view "All Branches (Merged)" and multi-branch notes.
- When an Org Admin opens the notes panel, they can:
  1. Select a specific branch to view/add notes for that branch.
  2. Or select **"All Branches (Merged)"** to view notes across all branches in the organization.
  3. In Merged View, notes are automatically grouped by branch (`🏢 Main Store`, `🏢 Mall Branch`), with priority buckets inside each branch group.
  4. Quick Add card allows Org Admin to choose which branch the new note belongs to (defaults to active branch).

### 4.3 Store Admin & Staff Access
- Store Admins and store users (even if assigned permissions to multiple branches by the org admin) can **only select and view ONE branch at a time**.
- The "All Branches (Merged)" option is strictly hidden from non-org-admins.
- If a store admin has access to multiple branches, they can switch between them one-by-one, but never view merged stores.
- Topbar trigger badge count and urgent pulse indicator only reflect the user's currently selected branch.

---

## 5. Functional Requirements

### 4.1 Quick Action Topbar Trigger
- Mounted in the top global navigation header.
- Sticky note icon (`StickyNote`) with active uncompleted note count badge.
- Pulsing red indicator when uncompleted High Priority items exist.
- Clicking toggles the drawer open/closed with active highlight state.

### 4.2 Slide-Over Panel & Drawer Modes
- Width: `340px` to `360px`, full container height (`100vh`).
- Modes:
  1. **Floating / Overlay Mode (Default)**: Slides in from right with deep drop-shadow (`shadow-2xl`), floating above content with backdrop dismissal.
  2. **Pinned Mode**: Drawer pins alongside page content (`pr-[360px]`), sitting side-by-side with no backdrop.
  3. Pin button with rotational animation (`-rotate-45` when unpinned; `text-blue-600 rotate-0` when pinned).

### 4.3 Quick Add Card
- Multiline / 2-row auto-expanding textarea with placeholder `"Write a temporary note..."`.
- Priority Pill Selector: `High` (Red), `Med` (Amber), `Low` (Green). Default: `Med`.
- Add button: Primary button, disabled when input is empty or whitespace-only. Keyboard shortcut `Enter` submits (unless Shift is held).

### 4.4 Grouped Notes List
- 3 priority sections:
  - 🔥 **High Priority** (Red badge, urgent flame icon)
  - ⚡ **Medium Priority** (Amber badge, bolt icon)
  - ☕ **Low Priority** (Emerald badge, coffee icon)
- Circular checkbox for task completion with strikethrough text and muted opacity.
- Tip banner when completed notes exist: `"Tip: Delete completed notes for a cleaner experience."` with 1-click `"Clear Completed"` action.
- Hover actions: Single-item inline edit (pencil) and soft delete (trash).

### 4.5 Batch Edit Mode & Drag-and-Drop Reprioritization
- Header `"Edit"` button toggles batch edit mode.
- Deep snapshot backup taken on entry; `"Cancel"` reverts, `"Save"` commits.
- Native HTML5 Drag and Drop between High, Medium, and Low buckets with dashed drop zones.
- Direct inline text editing and quick priority change controls.

### 4.6 Trash Bin & Restoration
- Collapsible bottom bar visible when `deletedNotes.length > 0`.
- Displays `Trash (N)` counter.
- Shows soft-deleted items with `"Restore"` button returning note to active list.
- `"Empty Trash"` permanently wipes soft-deleted items with confirmation.

---

## 5. Acceptance Criteria (Gherkin Scenarios)

```gherkin
Scenario: Adding a High Priority Note
  Given the user opens the Priority Notes drawer from the topbar
  When the user types "Order special high-index lenses"
  And selects the "High" priority pill
  And clicks "Add Note"
  Then the note is added under the High Priority section
  And the topbar trigger badge displays an active count with a high-priority dot
  And the note persists in localStorage under "priority_notes_cache"

Scenario: Toggling Task Completion
  Given an active note in the drawer
  When the user clicks the circular checkbox
  Then the note text displays strikethrough styling and muted opacity
  And a tip banner "Tip: Delete completed notes for a cleaner experience." appears

Scenario: Soft Deletion and Trash Restoration
  Given an active note
  When the user clicks the trash icon
  Then the note disappears from the priority group
  And appears in the collapsible Trash bin at the bottom
  When the user clicks "Restore"
  Then the note returns to its original priority list
```
