# Optix OS - Project Rules & Coding Standards

You are an expert full-stack engineer building a high-performance, cloud-native Optical Billing and Practice Management System. Always adhere to the specifications outlined in `docs/PRD.md`.

---

## 1. Stack & Runtime
- **Framework:** Next.js 15 (App Router, Server Components & Server Actions)
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

## 10. AI Agent Operational Constraints & CI Pipeline
- **The Validation Loop:** You are strictly forbidden from declaring a feature 'complete' without passing the local CI pipeline. Once you finish writing code for a task, you MUST run `npm run validate` (or `npm run check` for minor static updates).
- **On Success (Token Optimization):** If the validation script passes with exit code 0, DO NOT ingest or analyze the terminal logs. Output a brief confirmation token (e.g., '✅ CI Passed') and stop. Wait for my manual UI verification. Do NOT run dev servers or open browsers yourself.
- **On Failure (Auto-Correction):** If the validation script fails, you are authorized to ingest the error logs. You must independently analyze the TypeScript, ESLint, or Playwright errors, apply the necessary code fixes, and re-run `npm run validate` until it passes completely.
- **Continuous Graphify Updates:** To keep the architectural knowledge graph perfectly synced with the codebase, you MUST automatically run the `graphify .` command at the very end of every completed feature, task, or significant refactor. Execute this step immediately after the CI validation (`npm run validate`) passes, right before notifying the user that the task is complete.

---

## Meta-Rule: Self-Evolving Guidelines
- **Continuous Rule Refinement:** Whenever you successfully implement a new foundational technology (e.g., Redis, Better Auth, new UI spacing architecture), you MUST evaluate if it establishes a new project standard. If it does, you are required to automatically update this `CLAUDE.md` file to instruct future AI sessions to utilize this new standard. Do not wait for the user to tell you to update the rules for newly established infrastructure.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
