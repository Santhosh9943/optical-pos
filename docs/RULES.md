# OptixOS Operational & AI Coding Rules

This document specifies the strict architectural invariants, mathematical standards, optical domain constraints, and AI agent operational guidelines that must be adhered to at all times.

---

## 1. Monetary Math & Financial Ledger Invariants

1. **Strictly Forbidden:** Never use native JavaScript floating-point arithmetic (`+`, `-`, `*`, `/`) for money.
   ```typescript
   // FORBIDDEN — Causes precision drift and string concatenation bugs ("100.0050.00")
   const badTotal = invoice.taxableValue + invoice.totalTax;
   ```
2. **Mandatory Decimal.js Usage:** Wrap all monetary figures in `new Decimal(...)` and format all rendered or persisted outputs using `.toFixed(2)`:
   ```typescript
   // CORRECT
   const subtotal = new Decimal(item.unitPrice).times(item.quantity);
   const total = subtotal.minus(new Decimal(item.discount || '0')).toFixed(2);
   ```
3. **Database Columns:** All monetary fields in Neon PostgreSQL use `numeric(12, 2)`. Drizzle ORM returns these as `string`. Always parse these via `new Decimal(...)`.
4. **Indian GST Splits:** 
   - Ophthalmic corrective lenses (HSN 9001): 5% GST (2.5% CGST + 2.5% SGST).
   - Frames, sunglasses, and contact lenses (HSN 9003/9004): 18% GST (9% CGST + 9% SGST).
   - Taxes must always be computed on the net taxable amount *after* deducting line-item discounts.

---

## 2. Optical Clinical & Prescription Invariants

1. **Discrete Eye Columns:** Always separate Right Eye (OD) and Left Eye (OS). Never combine powers into a single string.
2. **Quarter-Step (0.25 D) Dioptric Validation:** Validate SPH, CYL, and ADD using integer scaling to prevent IEEE-754 validation errors:
   ```typescript
   export const isQuarterStep = (val: number): boolean => {
     const scaled = Math.round(val * 100);
     return scaled % 25 === 0;
   };
   ```
3. **Axis Invariant:**
   - If `CYL !== 0` and is not null, `AXIS` is strictly mandatory and must be an integer between 1 and 180 inclusive.
   - If `CYL === 0` or is null, `AXIS` must evaluate to `null`.
4. **Decoupled Billing:** An invoice or order line must be able to exist with `prescriptionId = null` (e.g. plano sunglasses, contact lens solutions, accessories, or frame-only glazing).

---

## 3. Concurrency, Race Conditions & Database Transactions

1. **Atomic Inventory Decrement:** Never verify stock in application memory before issuing an update. Always perform conditional atomic SQL decrements using `RETURNING`:
   ```typescript
   const [updated] = await tx
     .update(inventoryItems)
     .set({ stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}` })
     .where(
       and(
         eq(inventoryItems.id, item.id),
         sql`${inventoryItems.stockQuantity} >= ${item.quantity}`
       )
     )
     .returning({ id: inventoryItems.id });

   if (!updated) throw new Error(`Insufficient stock for item ${item.id}`);
   ```
2. **Transaction Rollback Boundaries:** All multi-table checkout operations (prescription creation, order record, line items insertion, inventory stock deduction, payment ledger logging) must be wrapped inside `db.transaction()`. If any step fails, the entire transaction rolls back cleanly.

---

## 4. Multi-Tenant SaaS & Security Invariants

1. **Mandatory Tenant Scoping:** Every SQL query selecting or mutating `branches`, `customers`, `inventory_items`, `invoices`, `prescriptions`, `payments`, or `staff` must include `eq(table.organizationId, session.organizationId)` (or `eq(table.organizationId, scope.organizationId)`). Cross-tenant table scans are strictly prohibited.
2. **Absolute Branch & Operational Data Isolation:**
   - Physical store locations (`branches`) belong strictly to their owning organization. Under NO circumstances may branches belonging to Organization A appear in the branch switcher, inventory tables, or POS dropdowns of Organization B.
   - Even when a Root Super Admin is logged in and operating within a practice session (`(dashboard)` or `/pos/`), all operational layouts, branch switchers, and list queries MUST be strictly quarantined to that active practice (`session.organizationId`).
   - Cross-practice aggregation is strictly restricted to dedicated, isolated platform management routes (`/super-admin/*`) using dedicated super-admin actions (`getAllPlatformBranchesForSuperAdminAction`). Operational context endpoints (`getUserTenancyContext`) must NEVER dump platform-wide branches into store state.
3. **Query-Level Cost Price Redaction:** Non-admin roles (`CLERK`, `OPTOMETRIST`) must never receive wholesale costs (`cost_price`) or profit margins. Omit `costPrice` in Drizzle query projections (`select({ ... })`). Never send cost data to the client and hide it with CSS.
4. **Immutable Closed Orders:** Invoices marked `DELIVERED_AND_CLOSED` cannot be updated directly. Any post-delivery financial adjustments require a supervisor credit note or refund payment entry.

---

## 5. UI Layout & Accessibility Mandates

1. **Page Root Wrapper:** Every operational page root must strictly use:
   ```html
   <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
   ```
2. **Zero Artificial Constraints:** Never use `container`, `max-w-7xl`, or `mx-auto` on operational dashboard pages.
3. **WCAG AA Dark Mode Contrast:** Readable text in dark mode must achieve a minimum 4.5:1 contrast ratio. Never use muted grays like `dark:text-slate-500` or `opacity-*` classes on text; use `dark:text-slate-300` minimum.
4. **WCAG 2.5.3 (Label in Name):** If an element has visible text, its `aria-label` must match or begin with that text.

---

## 6. Document Output & Hardware Printing Invariants

1. **Thermal 80mm Roll:**
   - Container width strictly locked to `72mm` with zero margin in `@media print`.
   - Never use `page-break-inside: avoid` on line items (it causes premature cutting on receipt printers).
2. **Workshop Lab Slip:**
   - Financial totals, item prices, discounts, and payments must be strictly omitted from the React component tree (do not render financial DOM elements).

---

## 7. AI Agent Operational Constraints & CI Pipeline

1. **The Local CI Validation Loop:** You are strictly forbidden from declaring a feature complete without executing the local CI pipeline:
   - For static/type changes: `npm run check` (runs `next lint` and `tsc --noEmit`).
   - For functional changes: `npm run validate` (runs `next lint`, `tsc --noEmit`, and Playwright E2E tests).
2. **Zero-Regression Mandate:** If any Playwright test or TypeScript check fails, analyze the logs, apply the minimum necessary fix, and re-run the validation until 100% pass rate is achieved.
3. **Continuous Knowledge Graph Sync:** Run `graphify update .` to sync `graphify-out/` immediately after validation passes on any code change.
4. **Self-Evolving Rules:** When a new foundational architectural pattern is introduced (e.g. Upstash Redis, Better Auth, POS view modes), update `CLAUDE.md`, `AGENTS.md`, and relevant `.cursor/rules/` files immediately.

---

## 8. Knowledge Graph-First Exploration & Graphifyable Code Standards

1. **Never Explore from Scratch ("No Blind Fresh Exploration"):**
   - Do NOT discover the codebase freshly by running broad directory scans, recursive searches, or unguided grep queries.
   - Always query the pre-built knowledge graph first:
     - `graphify query "<natural language query>"` — Find relevant symbols, files, and architectural communities.
     - `graphify explain "<Symbol>"` — Inspect callers, callees, and the 2-hop dependency radius.
     - `graphify path "<SymbolA>" "<SymbolB>" --undirected` — Trace execution or dependency paths.
   - Reference `graphify-out/GRAPH_REPORT.md` for architectural community structure.
2. **Graphifyable Code Standards (Before Graphifying):**
   - Code must be easily understandable and graphifyable so AST and semantic extractors build high-fidelity nodes:
     - **JSDoc / TSDoc Documentation:** Provide clear JSDoc descriptions on all exported Server Actions, React components, Zod schemas, Drizzle models, and utilities (`@description`, `@param`, `@returns`).
     - **Explicit Named Exports:** Always use named functions and constants. Avoid anonymous default exports.
     - **Strict Typing:** Annotate function parameters and return types explicitly.
     - **Modular Structure:** Group logic by vertical domain slice to maintain distinct community boundaries.
3. **Mandatory Graph Update on Code Changes:**
   - Execute `graphify update .` after every code modification to keep the knowledge graph in sync.


---

## 9. Autonomous Official Documentation & MCP Research Protocol

1. **Zero Guesswork or Hallucination:** If the user provides a task without explicit documentation, API signatures, or schema definitions, never attempt to guess or rely on outdated memory.
2. **MCP Server Integration:** Utilize active Model Context Protocol (MCP) tools (Notion, Figma, Lovable, Chrome DevTools, DB proxy tools) to retrieve authoritative source context, design mockups, and database state.
3. **Live Vendor Documentation Retrieval:** Proactively use web search and URL extraction (`search_web`, `read_url_content`, `browser_subagent`) to fetch and read the latest official documentation directly from vendors (Next.js 16, React 19, Better Auth, Drizzle ORM, Neon, Upstash Redis, Tailwind v4, Zod).
4. **Version Parity Check:** Always cross-reference proposed APIs against exact package versions in `package.json` to prevent deprecated syntax.

---

## 10. Quality & Pre-Implementation Verification ("Think & Verify Twice")

1. **Uncompromising Quality Over Token Optimization:** Producing clean, resilient, bug-free, production-grade code strictly supersedes any token-saving considerations. Never rush implementations or omit necessary validation to conserve tokens.
2. **The "Think & Verify Twice" Protocol:**
   - Pre-Implementation: Thoroughly inspect existing schemas, actions, and UI components using `graphify explain` and direct file analysis before drafting changes.
   - Anticipate Regressions: Evaluate concurrency race conditions, multi-tenant leaks, optical invariants (0.25 D quarter steps, axis bounds), and financial rounding prior to execution.
   - Post-Implementation: Ensure comprehensive compiler checks (`npm run check`) and regression tests pass with 100% green status.

---

## 11. Pre-Implementation Root Cause Analysis & Blast Radius Mapping

1. **Root Cause Analysis (Before Touching Code):**
   - Always identify the fundamental underlying cause of a defect, refactoring need, or user requirement.
   - Strictly avoid superficial monkey-patches, temporary try/catch masks, or symptom-only wrappers that leave structural bugs latent.
2. **Blast Radius Mapping:**
   - Trace all affected callers, callees, and dependencies via `graphify explain "<Symbol>"`.
   - Audit the entire vertical slice before making edits:
     `Drizzle DB Schema -> Zod Validator -> Server Action -> Zustand Store -> React Component -> Print / E2E Test`
3. **Atomic Multi-Tier Alignment:**
   - Whenever an interface or data structure is modified, update all connected tiers atomically in the same task.

---

## 12. Universal In-Project Agent Memory & Bug Fix Logging Protocol

1. **In-Project Memory Sovereignty:**
   - Institutional memory, active goals, and session handoffs must live **inside the project repository** (`docs/agent-memory/`), making the codebase 100% portable and independent of any single AI agent platform.
2. **Session Start — Ingestion Invariant:**
   - At the very start of any task, all AI agents (Gemini, Claude, Cursor, Antigravity) must read:
     - [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md): To ingest the previous agent's completed work, recent modifications, and active goals.
     - [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md): To review historical bugs (BUG-001 through BUG-012+) and invariants to prevent repeating past mistakes.
3. **Session Closure — Automatic Memory & Bug Logging:**
   - Whenever a bug is investigated and resolved, append a new compact entry to [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) detailing Component, Symptom, Root Cause, The Fix, and Permanent Invariant.
   - Update [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) with session accomplishments, modified files, test pass results, and specific instructions for whichever agent takes the next task.

---

## 13. Spec-Driven Vibe Coding Engine (`specs/`)

1. **Encapsulated Feature Specs:**
   - When building, expanding, or refactoring features, do NOT rely on sprawling monolithic PRD files. Check the encapsulated directory in `specs/{feature-id}/` (`spec.md`, `plan.md`, `tasks.md`).
   - For new features, duplicate `specs/TEMPLATE/` to `specs/{feature-id}-{name}/` and draft requirements in `spec.md`.
2. **Linked Chain Workflow:**
   - `spec.md` (Requirements & Gherkin scenarios) -> `plan.md` (Architecture, Drizzle schema, blast radius) -> `tasks.md` (Atomic checklist).
3. **Atomic Progression & Archival:**
   - Execute tasks in `tasks.md` sequentially, checking off boxes only after passing static type checks (`npm run check`) and tests.
   - Upon completion, move the feature directory to `specs/archive/`.

---

## 14. Dynamically Elastic Documentation & Archival Protocol

1. **Dynamic Elasticity:**
   - **Expansion:** When building new capabilities, schemas, or features, expand the active documentation suite (`ARCHITECTURE.md`, `DESIGN.md`, `RULES.md`, `DECISIONS.md`, `TEST_PLAN.md`, `TASKS.md`, `MEMORY.md`).
   - **Pruning & Reduction:** When features are removed, streamlined, or deprecated, prune and condense the active documentation content immediately to avoid stale bloat.
2. **Archive Isolation:**
   - Retired or superseded documents must be moved to `docs/archive/` and recorded in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
   - **Strict Access Constraint:** AI agents and developers must ONLY inspect `docs/archive/` when specifically instructed by the user or when investigating historical context. All standard development queries must operate strictly on the active `docs/` suite.

---

## 15. Automated Code Reviews, Security Audits & Technical Debt Protocol

1. **Mandatory Automated Security Gate:**
   - Every code modification must satisfy the 8-point security gate (Multi-tenant scoping, costPrice masking, secret protection, rate-limiting, exact financial math, 0.25 D diopters, workshop slip redaction, and parameterized SQL).
2. **Unresolved Risk & Security Debt Invariant:**
   - If an AI agent identifies a security flaw, vulnerability, or architectural debt that **cannot be resolved immediately**:
     - **Annotate in Code**: Add `// TODO(security-SEC-XXX): [Details and mitigation]`.
     - **Log in Registry**: Record in [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md).
     - **Track in Backlog**: Add to pending security tasks in `docs/TASKS.md`.
     - **Session Handoff**: Include in [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) under `Active Security Findings`.
     - **Scanner Check**: Run `npm run audit:security` to verify all tags are indexed.

---

## 16. Component-First UI Primitives & Design System Invariant

1. **Mandatory UI Primitives Usage:** Never write raw, ad-hoc interactive HTML elements (`<button>`, unstandardized inputs, raw card wrappers) with arbitrary utility strings in dashboard or management views. Always import and compose from the centralized UI primitives kit in `@/components/ui`:
   - Buttons: `<Button variant="primary | secondary | outline | ghost | destructive | success | warning" size="default | sm | lg | icon">` with built-in `isLoading`, `leftIcon`, and `rightIcon`.
   - Badges: `<Badge variant="default | secondary | success | warning | destructive | info">`.
   - Cards: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, `<CardFooter>`.
   - Inputs: `<Input>` with consistent focus rings and `hasError` state.
   - Dialogs: `<Dialog>` with backdrop blur, keyboard `Escape` dismissal, and responsive max widths.
   - Page Headers: `<PageHeader>` enforcing standard icon, title, description, and action button alignment.
   - Empty States: `<EmptyState>` for empty tables, lists, and search queries.
   - Metrics: `<StatCard>` for dashboard KPI summaries.
2. **Semantic Design Tokens:** Strictly use semantic CSS variables (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-card`). Arbitrary hardcoded hex colors (e.g. `bg-[#2563eb]`) are strictly forbidden and blocked.
3. **Fluid Full-Width Layout Mandate:** All top-level page views must use `<div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">`. Constrained containers (`max-w-* mx-auto`) are strictly forbidden on operational views.
4. **Continuous Quality Gate:** Every pull request and AI coding task must pass `npm run audit:design` with 0 critical violations.

---

## 17. The Zero-Wasted-Space & Viewport Ergonomics Invariant

1. **Eliminate Dead Whitespace on Wide Displays:**
   - Operational dashboards and administration views must never squeeze forms into narrow centered single columns (`max-w-3xl`) when horizontal screen space is available.
   - Use responsive **Dual-Pane Layouts** (`grid grid-cols-1 lg:grid-cols-12 gap-6`):
     - Left Pane: Interactive inputs and settings (`lg:col-span-7`).
     - Right Pane: Live realistic document/receipt specimens, hardware previews, or contextual metrics (`lg:col-span-5`).
2. **Compact Vertical Table Rhythm:**
   - Table rows must use crisp, compact padding (`py-2` to `py-2.5`) with high contrast text.
   - Present 15+ records above the fold on 1080p and 768p displays without forcing unnecessary vertical scroll chasing.
3. **Above-the-Fold Primary Controls:**
   - Primary action triggers (Save, Discard, New Order, Add Member) must remain immediately accessible above the fold.
4. **Adaptive Multi-Column Expansion:**
   - Card decks (Branches, Store Profiles, POS Modes) must scale up to 4 columns on wide displays (`xl:grid-cols-4`).

---

## 18. Zero-Latency Stale-While-Revalidate (SWR) & 3-Tier Caching Invariant

1. **Zero-Spinner Client Invariant:**
   - Primary listing and directory views (Inventory, Patients, Staff, Invoices, Lab Orders) must NEVER mount with empty state `[]` and `isLoading = true`.
   - Always use the universal SWR hook `useCachedResource` (`src/hooks/use-cached-resource.ts`) to synchronously hydrate initial data from local browser cache (`optix_client_cache:{key}`) in 0ms on the first render frame.
   - Full-page blocking loading spinners are strictly forbidden on subsequent page visits. A spinner is permitted ONLY on a cold device with zero cached records.
2. **Silent Non-Blocking Background Revalidation:**
   - Revalidations must execute silently in the background without locking, hiding, or causing layout shifts in the UI.
   - Use subtle live-sync indicators (e.g. small pulsing blue indicator or "Syncing" text in the header badge) when `isRevalidating` is true.
   - Configure background auto-refresh intervals (e.g., 60 seconds) so POS terminals and dashboards stay fresh without customer disruption.
3. **Tier 2 Server Action Caching:**
   - All read-heavy Server Actions (`getInventoryList`, `getPatients`, `getStaffMembersAction`, `getActiveLabOrders`) must be wrapped with `withCache` in `src/lib/cache.ts`.
   - Cache keys must be strictly tenant-scoped (`optix:{orgId}:{namespace}:{scope}`).
4. **Atomic Invalidation on Mutations:**
   - Any Server Action that creates, updates, deletes, or modifies entities must call `await invalidateCache({ orgId, namespace })`.
   - Client components must optimistically call `mutate(...)` to update the local browser cache and state immediately (0ms latency) without waiting for server network hops.
