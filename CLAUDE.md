# Optix OS - Project Rules & Coding Standards

You are an expert full-stack engineer building a high-performance, cloud-native Optical Billing and Practice Management System. Always adhere to the authoritative specifications outlined in the `docs/` suite:
- [`docs/PRD.md`](file:///f:/hobby-projects/optical-pos/docs/PRD.md): Product Requirements, User Journeys, and Master Roadmap.
- [`docs/ARCHITECTURE.md`](file:///f:/hobby-projects/optical-pos/docs/ARCHITECTURE.md): Full-stack Topology, 3-Tier Layering, Neon Pooler, Redis Fallback.
- [`docs/DESIGN.md`](file:///f:/hobby-projects/optical-pos/docs/DESIGN.md): Design Tokens, WCAG AA Dark Mode Contrast, and the 4 POS Viewport Modes.
- [`docs/RULES.md`](file:///f:/hobby-projects/optical-pos/docs/RULES.md): Strict Coding Invariants (decimal.js, 0.25 D diopters, atomic stock locks).
- [`docs/DECISIONS.md`](file:///f:/hobby-projects/optical-pos/docs/DECISIONS.md): Architectural Decision Records (ADR-001 through ADR-008).
- [`docs/SECURITY.md`](file:///f:/hobby-projects/optical-pos/docs/SECURITY.md): Multi-tenant Segregation, 4-Tier RBAC, and Cost Price Redaction.
- [`docs/TEST_PLAN.md`](file:///f:/hobby-projects/optical-pos/docs/TEST_PLAN.md): Playwright E2E Strategy and 13-Workflow Test Matrix.
- [`docs/TASKS.md`](file:///f:/hobby-projects/optical-pos/docs/TASKS.md): Task Ledger, Roadmap, and Definition of Done.
- [`docs/MEMORY.md`](file:///f:/hobby-projects/optical-pos/docs/MEMORY.md): Current Tech Stack, Test Pass Rates, and Developer Gotchas.
- [`docs/VIBE_WORKFLOW.md`](file:///f:/hobby-projects/optical-pos/docs/VIBE_WORKFLOW.md): The 9-Step Vibe Coding Playbook and Quality Gates.
- [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md): Universal Active Session Ledger, In-Flight Work & Cross-Agent Handoff.
- [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md): Compact Bug Fix Memory Ledger (12+ historical bugs and invariants).
- [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md): Security Vulnerability & Technical Debt Registry (`SEC-XXX`).
- [`docs/agent-memory/AGENT_HANDOFF_PROTOCOL.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/AGENT_HANDOFF_PROTOCOL.md): Universal Cross-Agent Operating Lifecycle.
- [`specs/README.md`](file:///f:/hobby-projects/optical-pos/specs/README.md): Spec-Driven Vibe Coding Engine (`specs/TEMPLATE/`, `specs/024-gst-e-invoicing/`).
- [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md): Archive ledger of superseded or retired documentation.

---

## 1. Stack & Runtime
- **Framework:** Next.js 16 (App Router, Server Components & Server Actions, React 19)
- **Language:** TypeScript (strict mode, zero `any`)
- **Database:** Neon Serverless PostgreSQL using connection pooler (`DATABASE_URL` must use `-pooler`)
- **ORM:** Drizzle ORM (`drizzle-orm/pg-core`)
- **High-Speed Caching (Redis):** Always evaluate if a new feature requires caching. For high-frequency reads (e.g., settings, search autocomplete, catalog lookups, tenant configs), you MUST implement Upstash Redis. Always include a graceful fallback to the primary Neon database if Redis environment variables are missing.
- **Styling & UI:** Tailwind CSS, Radix Primitives via shadcn/ui, Lucide Icons
  - **Theme Mandate:** All UI components MUST support dark mode natively. Use shadcn/ui CSS variables (e.g., `bg-background`, `text-foreground`, `border-border`) instead of hardcoded colors. If hardcoded utility classes are required, you must include the `dark:` variant (e.g., `bg-white dark:bg-zinc-900`).
  - **Fluid Full-Width Layouts:** All primary views (e.g., POS, Inventory, Reports) must utilize the full available width of the main content area. Use `w-full`, `h-full`, and `flex-1` with consistent padding (e.g., `p-4` or `p-6`). NEVER use `container`, `max-w-7xl`, or `mx-auto` wrapper classes on main dashboard views. Constrained widths are strictly reserved for standalone auth screens or modal dialogs.
  - **Strict WCAG AA Compliance:** 
    - **Color Contrast (4.5:1 Minimum):** All text must maintain a 4.5:1 contrast ratio. In dark mode, strictly avoid `opacity-*` classes on text. Never use muted grays like `dark:text-slate-500` or `dark:text-zinc-500` for readable text; use `dark:text-slate-300` or `dark:text-zinc-300` minimum.
    - **Label in Name (WCAG 2.5.3):** If an interactive element (`<button>`, `<Link>`) has visible text, its `aria-label` MUST begin with or exactly match that visible text. If the visible text is fully descriptive, omit the `aria-label` entirely.
    - **Semantic HTML & Form Labels:** Always use `<button>` for actions, never `<div onClick>`. Every `<input>` or `<Select>` must have a programmatic `<label>` or an explicit `aria-label`.
    - **Focus States:** All interactive elements must have visible focus rings (`focus-visible:ring`).
  - **Global Spacing & UI Uniformity:** All dashboard pages MUST follow a strict, unified spacing architecture. 
    - **Page Wrapper:** Every page root must use EXACTLY `className="flex flex-col h-full w-full p-4 md:p-6 gap-6"`. Do not use arbitrary `mt-*` or `pt-*` to push content down.
    - **Page Headers:** Use a standardized header block for admin pages: `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">`. 
    - **Card & Table Gaps:** Internal component spacing should consistently use `gap-4`. 
    - **Layout Delegation:** The shared `layout.tsx` is responsible for the top navigation bar and sidebar; it must provide a clean `flex-1 overflow-auto` container for the children. Pages must NEVER try to adjust for the navigation bar using margins.
  - **POS Counter Viewport Modes:**
    - Supports 4 modes: `adaptive` (7:5 default), `rx-focus` (9:3 clinical matrix), `billing-focus` (1-line patient strip, 8-column cart), `dense-split` (50/50 ultra-compact, sticky `DenseBottomBar`).
    - Hotkey switchable via `F4` and persisted in store settings.
  - **Super Admin Perspective Simulator:**
    - Platform admins can simulate roles/branches at `/admin/perspective`. Always render persistent `PerspectiveBanner.tsx` during active simulation.
- **Validation:** Zod v3+
- **Math Library:** `decimal.js` for all financial calculations

---

## 2. Strict Monetary & Accounting Rules
1. **Never use native JavaScript floating-point math (`+`, `-`, `*`, `/`) for money.**
2. All monetary columns in the database are `numeric(12, 2)`. Drizzle returns these as `string`.
3. Wrap all monetary values in `new Decimal(...)` before calculation, and use `.toFixed(2)` when persisting or rendering:
   ```typescript
   // CORRECT
   const total = new Decimal(invoice.taxableValue).plus(new Decimal(invoice.totalTax)).toFixed(2);

   // FORBIDDEN - Causes string concatenation bugs ("100.0050.00")
   const badTotal = invoice.taxableValue + invoice.totalTax;

```

4. Tax calculations must be computed on the net taxable amount after discounts, maintaining distinct 5% (corrective lenses - HSN 9001) and 18% (frames/sunglasses - HSN 9003/9004) splits.
5. **Single GST engine:** All line/invoice GST math — server checkout, invoice edits, cart preview, modals and every print layout — MUST use `computeGstLine` / `computeGstInvoice` from `src/lib/gst.ts` (per-line paise ROUND_HALF_UP; CGST = round(tax/2), SGST = tax − CGST). Discounts are whole-line amounts; never re-derive them from display-rounded `discountPerUnit`.
6. **Server-authoritative pricing:** For inventory-backed lines the server takes tax rate/HSN from the catalog and rejects prices below `sellingPrice` unless the caller is manager/admin/owner.
7. **Money display:** Use `formatINR()` from `src/lib/format.ts` and `tabular-nums` on money cells.

---

## 3. Optical Domain & Prescription Rules

1. **Discrete Eye Schema:** Prescriptions must separate Right Eye (OD) and Left Eye (OS). Never store combined comma-separated strings.
2. **Dioptric Validation:** Validate SPH, CYL, and ADD using integer scaling to prevent IEEE-754 floating-point validation failures:
```typescript
const isQuarterStep = (val: number): boolean => {
  const scaled = Math.round(val * 100);
  return scaled % 25 === 0;
};

```


3. **Axis Invariant:** If `CYL != 0`, `AXIS` is strictly mandatory and must be an integer between 1 and 180. If `CYL === 0`, `AXIS` evaluates to `null`.
4. **Decoupled Billing:** An order must be able to exist with `prescriptionId = null` (e.g., OTC solutions or plano sunglasses).

---

## 4. Concurrency & Transaction Safety

1. **Atomic Inventory Decrement:** Do not rely on application-level locks or pre-checking inventory before updating. Always decrement physical stock using conditional atomic updates with `RETURNING`:
```typescript
const updated = await tx
  .update(inventoryItems)
  .set({ stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}` })
  .where(and(eq(inventoryItems.id, item.id), sql`${inventoryItems.stockQuantity} >= ${item.quantity}`))
  .returning({ id: inventoryItems.id });

if (updated.length === 0) throw new InsufficientStockError(item.id);

```


2. **Transaction Isolation:** Run all checkout procedures (inventory deduction, prescription saving, invoice generation, payment logging) inside `db.transaction()`. If any step fails, the entire transaction must abort and roll back.

---

## 5. Security & RBAC Enforcement

1. **Query-Level Data Redaction:** Non-admin roles (`CLERK`, `OPTOMETRIST`) must never receive wholesale costs (`cost_price`) or profit margins. Omit these fields in Drizzle query projections (`select({ ... })`). Never send cost data to the client and hide it with CSS.
2. **Immutable Invoices:** Once an invoice transitions to `DELIVERED_AND_CLOSED`, it cannot be modified. Corrections require an admin credit note.

---

## 6. Document Output & Printing Rules

1. **Thermal 80mm Receipt:**
* Use `@media print` with container width strictly locked to `72mm` and zero margins.
* Do NOT use `page-break-inside: avoid` on line items (it triggers premature page cutting on thermal roll printers).


2. **Workshop Lab Slip:**
* Strictly omit all pricing, line totals, discounts, and payments from the React component tree (do not render financial DOM elements).
* Display Job Ticket ID, delivery date, frame chassis details, and full OD/OS refraction parameters for lens edging.



---

## 7. Code Organization & Workflow

* Place database schemas in `src/db/schema.ts` and exports in `src/db/index.ts`.
* **Store profile access:** never query `store_profile` directly — use `findOrgStoreProfile` / `ensureOrgStoreProfile` / `redactStoreProfile` from `src/lib/store-profile.ts` with the session org (SEC-004).
* **Schema changes on the live DB:** write an idempotent SQL file in `scripts/migrations/` mirroring the `schema.ts` change and apply with `npx tsx scripts/run-sql-migration.ts <file>` (the `drizzle/` snapshot history is stale; avoid `db:push` against shared DBs).
* **Tailwind is v3.4:** v4-only utilities (`shadow-xs`, `outline-hidden`, `backdrop-blur-xs`, `animate-in`) work only because they are shimmed in `tailwind.config.ts` / `tailwindcss-animate`. Verify any other v4 utility exists before using it.
* **Server action auth:** every exported action starts with `requireAuthSession()` / `requireManagerOrAdmin()` / `requireOwnerOrSuperAdmin()`; tenant ids and branch ids from the client are never trusted (use `resolveTenantScope`, `getAuthorizedBranchIds`).
* Keep Zod schemas in `src/lib/validators/`.
* Server Actions live under `src/actions/`.
* Follow a vertical slice flow: **Database Schema & Seed -> Backend Action -> UI Components -> Print Layouts**.
* If a proposed implementation contradicts `docs/PRD.md`, stop and flag the discrepancy.

---

## 8. SPA Architecture & Navigation
- **Native SPA Routing:** Use Next.js native routing (`/pos/new-bill`, `/admin/inventory`) with `<Link>` components to maintain URL integrity. 
- **Persistent Layouts:** The Top Action Bar and side navigation must live in a shared `layout.tsx` so they never unmount during navigation.
- **Global State for Persistence:** Any critical volatile state (like the active POS Cart, Selected Patient, and Rx Matrix) MUST be stored in a global state manager (Zustand) so it survives route transitions.

---

## 9. Zero-Regression Testing Strategy
- **E2E Virtual Testing:** No core POS or Inventory feature is considered complete without automated End-to-End tests using **Playwright**.
- **Coverage Requirements:** Tests must simulate real user workflows (clicking, typing, route navigating) to verify UI state, Zustand store persistence, and database interactions (mocked or isolated test DB).
- **Loophole Validation:** Every test suite must explicitly cover edge cases: insufficient stock, missing mandatory fields, family billing tab switching, and SPA state retention during navigation.

---

## 10. Automated AI Code Review, Security Auditing & Technical Debt Protocol

- **8-Point AI Code Review Invariants**:
  Every code change, Server Action, and schema update must strictly satisfy the 8 core domain invariants:
  1. **Exact Monetary Math:** `decimal.js` for all financial logic (zero native JS floats).
  2. **Optical Diopters:** 0.25 D step validation (`Math.round(val * 100) % 25 === 0`).
  3. **Axis Invariant:** `[1, 180]` if CYL != 0, null if CYL == 0.
  4. **Multi-Tenant Scoping:** All business queries MUST filter by `organization_id`.
  5. **Atomic Stock Decrement:** `WHERE stock_quantity >= :qty RETURNING id` inside `db.transaction()`. Never pre-check in memory.
  6. **Wholesale Cost Price Redaction:** Wholesale `cost_price` must be omitted in SQL projections for non-manager roles.
  7. **Document / Print Redaction:** Zero financial/wholesale data in workshop lab slips or receipt DOM trees.
  8. **Strict Input Validation:** Zod schemas for all client-facing Server Actions.

- **Unresolved Vulnerability & Bug Protocol ("Zero Untracked Debt")**:
  If an agent or engineer discovers a security vulnerability, code smell, or bug that **cannot be resolved immediately within the current task scope**, the agent MUST:
  1. **Tag in code**: Add standardized annotation directly above the affected line(s):
     - `// TODO(security-SEC-XXX): <description and remediation plan>`
     - `// TODO(bug-BUG-XXX): <description and root cause>`
  2. **Register in Registry**:
     - For security vulnerabilities, add a formal entry to [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md) (Severity, Location, CWE, Finding, Remediation, Status).
     - For functional defects/bugs, add an entry to [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).
  3. **Track in Backlog**: Add the item under the "Active Security & Technical Debt Backlog" in [`docs/TASKS.md`](file:///f:/hobby-projects/optical-pos/docs/TASKS.md).
  4. **Hand Off**: Record the item in [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) under Pending Work.
  5. **Verification**: Run `npm run audit:security` to confirm all tags are properly registered. Naked `TODO(security)` tags without an ID or with an unregistered ID will fail CI.

---

- **Spec-Driven Feature Execution (`specs/`)**:
  - When implementing, expanding, or refactoring features, check `specs/{feature-id}/` for `spec.md`, `plan.md`, and `tasks.md`.
  - For new features, duplicate `specs/TEMPLATE/` to `specs/{feature-id}-{name}/`.
  - Execute tasks incrementally from `tasks.md`, updating checkboxes upon passing tests. Archive to `specs/archive/` upon completion.
- **Universal In-Project Agent Memory Protocol:**
  - Before starting any task, ALWAYS read [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) to ingest the latest session state, recent changes, and current goals.
  - Review [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) to avoid repeating past solved bugs.
  - When closing a task, if any bug was fixed, append a compact entry to `BUG_FIX_LOG.md`, and update `SESSION_HANDOFF.md` with your session summary and next steps.
- **Pre-Implementation Root Cause & Blast Radius Analysis:**
  - Before touching, modifying, or deleting code, diagnose the fundamental root cause. Never apply superficial monkey-patches.
  - Trace callers, callees, and dependencies via `graphify explain "<Symbol>"`.
  - Atomically update all tiers in the vertical slice (`Schema -> Validator -> Action -> Store -> UI -> Test`).
- **Quality & Bug-Free Correctness Over Token Optimization ("Think & Verify Twice"):**
  - Clean, robust, bug-free production code is the paramount priority over saving tokens. Never rush, truncate necessary research, or skip validation steps to minimize token count.
  - Before writing code, take time to think through existing architecture, invariants, and edge cases twice. Inspect existing files, schemas, and actions using `graphify explain` and code reviews.
- **Autonomous Official Documentation & MCP Protocol:**
  - If a task lacks explicit technical documentation or specifications from the user, NEVER guess, hallucinate, or rely on outdated training memory.
  - Proactively use MCP servers (e.g., Notion, Figma, Lovable, Chrome DevTools, database tools) and web search / URL reading tools (`search_web`, `read_url_content`, `browser_subagent`) to read the **latest official documentation** directly from official sources.
  - Verify API signatures, breaking changes, and version parity before implementation.
- **No Fresh Exploration From Scratch ("Graphify First"):** Never explore or re-learn the codebase blindly on every task. The project maintains an indexed knowledge graph in `graphify-out/`. Always consult `graphify` first:
  - `graphify query "<topic or feature>"` to pinpoint relevant symbols and files without reading unnecessary code.
  - `graphify explain "<Symbol>"` to view callers, callees, dependencies, and immediate neighborhood.
  - `graphify path "<Source>" "<Target>" --undirected` to trace architectural connections.
- **Write "Graphifyable" Code:** Before running graphify or completing tasks, ensure all code changes are easily graphifyable and self-explanatory:
  - Provide complete JSDoc / TSDoc docstrings on all exported Server Actions, React components, Zod schemas, Drizzle models, and utility functions (`@description`, `@param`, `@returns`).
  - Use clear, descriptive named exports (avoid anonymous functions/exports).
  - Explicitly type all function signatures, arguments, and return types.
- **The Validation Loop:** You are strictly forbidden from declaring a feature 'complete' without passing the local CI pipeline. Once you finish writing code for a task, you MUST run `npm run validate` (or `npm run check` for minor static updates).
- **Continuous Knowledge Graph Sync (`graphify update .`):** To keep the architectural knowledge graph in `graphify-out/` synced with the codebase, you MUST automatically run `graphify update .` at the end of every completed task or code modification, immediately after CI passes and before notifying the user.
- **On Success & Deep Verification:** When validation passes with exit code 0, confirm with the user and provide a clear, structured summary with clickable file links. Do NOT run dev servers or open browsers unless requested.
- **On Failure (Auto-Correction):** If the validation script fails, you are authorized to ingest the error logs. You must independently analyze the TypeScript, ESLint, or Playwright errors, apply the necessary code fixes, and re-run `npm run validate` until it passes completely.

---

## Meta-Rule: Self-Evolving Guidelines & Elastic Documentation
- **Continuous Rule Refinement:** Whenever you successfully implement a new foundational technology (e.g., Redis, Better Auth, new UI spacing architecture), you MUST evaluate if it establishes a new project standard. If it does, you are required to automatically update this `CLAUDE.md` file to instruct future AI sessions to utilize this new standard. Do not wait for the user to tell you to update the rules for newly established infrastructure.
- **Dynamically Elastic Documentation:** Active documents in `docs/` must expand when new features are added and contract/prune when features are refactored, reduced, or deprecated. Never leave stale or conflicting content in active documentation.
- **Archive Protocol & Strict Isolation:** Superseded or obsolete documents are moved to `docs/archive/` and logged in `docs/archive/ARCHIVE_LOG.md`. Agents must ONLY inspect `docs/archive/` when explicitly requested by the user or when researching historical context. All active development must use only active `docs/`.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
