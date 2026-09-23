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

1. **Mandatory Tenant Scoping:** Every SQL query selecting or mutating `customers`, `inventory_items`, `invoices`, or `staff` must include `eq(table.organizationId, session.organizationId)`.
2. **Query-Level Cost Price Redaction:** Non-admin roles (`CLERK`, `OPTOMETRIST`) must never receive wholesale costs (`cost_price`) or profit margins. Omit `costPrice` in Drizzle query projections (`select({ ... })`). Never send cost data to the client and hide it with CSS.
3. **Immutable Closed Orders:** Invoices marked `DELIVERED_AND_CLOSED` cannot be updated directly. Any post-delivery financial adjustments require a supervisor credit note or refund payment entry.

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
3. **Graphify Sync:** At the end of every completed feature, task, or significant refactor, execute `graphify .` right before notifying the user.
4. **Self-Evolving Rules:** When a new foundational architectural pattern is introduced (e.g. Upstash Redis, Better Auth, POS view modes), update `CLAUDE.md`, `AGENTS.md`, and relevant `.cursor/rules/` files immediately.

---

## 9. Dynamically Elastic Documentation & Archival Protocol

1. **Dynamic Elasticity:**
   - **Expansion:** When building new capabilities, schemas, or features, expand the active documentation suite (`ARCHITECTURE.md`, `DESIGN.md`, `RULES.md`, `DECISIONS.md`, `TEST_PLAN.md`, `TASKS.md`, `MEMORY.md`).
   - **Pruning & Reduction:** When features are removed, streamlined, or deprecated, prune and condense the active documentation content immediately to avoid stale bloat.
2. **Archive Isolation:**
   - Retired or superseded documents must be moved to `docs/archive/` and recorded in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
   - **Strict Access Constraint:** AI agents and developers must ONLY inspect `docs/archive/` when specifically instructed by the user or when investigating historical context. All standard development queries must operate strictly on the active `docs/` suite.
