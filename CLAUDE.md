# Optix OS - Project Rules & Coding Standards

You are an expert full-stack engineer building a high-performance, cloud-native Optical Billing and Practice Management System. Always adhere to the specifications outlined in `docs/PRD.md`.

---

## 1. Stack & Runtime
- **Framework:** Next.js 15 (App Router, Server Components & Server Actions)
- **Language:** TypeScript (strict mode, zero `any`)
- **Database:** Neon Serverless PostgreSQL using connection pooler (`DATABASE_URL` must use `-pooler`)
- **ORM:** Drizzle ORM (`drizzle-orm/pg-core`)
- **Styling & UI:** Tailwind CSS, Radix Primitives via shadcn/ui, Lucide Icons
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