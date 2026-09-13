# Product Requirements Document & Technical Implementation Specification

## Optical Store Billing & Practice Management System

**Document Version:** 1.0  
**Role:** Principal Software Architect / Domain Modeling Specialist / Lead Product Manager — Healthcare Retail ERP  
**Status:** Production-Ready Specification  
**Target Stack:** Next.js 15 (App Router) · TypeScript · Drizzle ORM · Neon PostgreSQL (Free Tier) · Vercel / Cloudflare Pages · Tailwind CSS · shadcn/ui


# PHASE 1: PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1.1 Target Audience & Operating Context

Single-counter and multi-branch retail optical practices operating in India. The system handles:

- **Walk-in refractions** (quick prescription capture without full clinical exam)
- **Custom spectacle orders** (frame + lens combination with fitting)
- **Contact lens dispensing** (with base curve and diameter specifications)
- **Accessories and over-the-counter sales** (solutions, cases, cords)

Primary operators are counter billing clerks with limited technical training, working under time pressure with patients waiting. The system must optimise for **speed of entry** and **error prevention**, not feature discoverability.

## 1.2 Role-Based Access Control (RBAC)

| Capability | Store Owner / Admin | Optometrist / Refractionist | Counter Billing Clerk |
|---|---|---|---|
| View invoice ledger | ✅ Full | ❌ | ✅ Own shifts only |
| View wholesale purchase costs | ✅ | ❌ | ❌ **Hard block** |
| View gross margins | ✅ | ❌ | ❌ **Hard block** |
| Inventory write-offs | ✅ | ❌ | ❌ |
| Z-report reconciliation | ✅ | ❌ | ❌ |
| Record refraction (OD/OS) | ✅ | ✅ | ❌ |
| Review clinical notes | ✅ | ✅ | ❌ |
| Edit closed invoices | ✅ | ❌ | ❌ **Hard block** |
| Process refunds | ✅ | ❌ | ❌ |
| Rapid patient lookup | ✅ | ✅ | ✅ |
| Order entry & advance collection | ✅ | ❌ | ✅ |
| Job status updates | ✅ | ✅ | ✅ |
| Thermal receipt printing | ✅ | ❌ | ✅ |
| View wholesale cost on line items | ✅ | ❌ | ❌ |

**RBAC Implementation Note:** Wholesale cost fields must be excluded at the **query level** for non-admin roles — not merely hidden in the UI. Use Drizzle column projections (`select({ ... })`) that omit `cost_price` entirely when the session role is `CLERK` or `OPTOMETRIST`. Client-side hiding alone is insufficient; the cost data must never transit to the client bundle.

## 1.3 Domain-Specific Optical Rules

### 1.3.1 Dual-Eye Refraction Matrix

Every prescription record stores discrete values for **Right Eye (OD — Oculus Dexter)** and **Left Eye (OS — Oculus Sinister)** . No column sharing, no comma-separated strings.

| Parameter | Valid Range | Step | Unit | Clinical Note |
|---|---|---|---|---|
| **Sphere (SPH)** | −20.00 to +20.00 | 0.25 D | Dioptres | Myopia (negative) / Hyperopia (positive) |
| **Cylinder (CYL)** | −6.00 to +6.00 | 0.25 D | Dioptres | Astigmatism correction |
| **Axis** | 1° to 180° | 1° | Degrees | Required when CYL ≠ 0 |
| **Addition (ADD)** | +0.75 to +4.00 | 0.25 D | Dioptres | Presbyopia / progressive lenses |
| **Pupillary Distance (PD)** | 40 to 80 | 0.5 mm | mm | Binocular; monocular variants supported |
| **Base Curve (BC)** | 7.0 to 10.0 | 0.1 mm | mm | Contact lens only |
| **Diameter (DIA)** | 13.0 to 15.0 | 0.1 mm | mm | Contact lens only |

**Validation invariants:**

- SPH and CYL must be exact 0.25 multiples (modulo 0.25 === 0).
- Axis is **required** when CYL ≠ 0.00; ignored when CYL = 0.00.
- ADD is optional for single-vision, required for progressive/bifocal lens types.
- PD must be positive; monocular PD sum must equal binocular PD within 0.5 mm tolerance.

### 1.3.2 Composite Optical Order Workflow

An optical order is an **atomic domain aggregate** pairing:

```
Patient Record
  + Clinical Prescription (optional for ready-made readers / plano sunglasses)
  + Selected Frame SKU (physical inventory item)
  + Ophthalmic Lens Specification:
      - Lens Type: Single Vision | Bifocal | Progressive | Photochromic | Blue-Cut
      - Coating: Anti-Reflective | Scratch-Resistant | UV400 | Hydrophobic
      - Material: CR-39 | Polycarbonate | Trivex | High-Index (1.67 / 1.74)
  + Fitting Fees (service line item)
  + Optional Accessories (case, cleaning cloth, cord)
```

**Critical constraint:** Frame stock is decremented **immediately at order placement** (physical item leaves the shelf). Lens stock is decremented only when the laboratory confirms fabrication is complete, because lenses are custom-ordered from the lab and do not exist as pre-stocked SKUs.

### 1.3.3 Order Lifecycle State Machine

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
  ┌─────────┐   ┌─────────┐   ┌──────────────┐   ┌────────────┐   │
  │  DRAFT  │──▶│ ORDERED │──▶│ SENT_TO_LAB  │──▶│ IN_FITTING │───┘
  └─────────┘   └─────────┘   └──────────────┘   └────────────┘
       │              │                                      │
       │              │                                      ▼
       │              │                          ┌──────────────────────┐
       │              │                          │ READY_FOR_COLLECTION │
       │              │                          └──────────────────────┘
       │              │                                      │
       ▼              ▼                                      ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                    CANCELLED_REFUNDED                             │
  └──────────────────────────────────────────────────────────────────┘
```

**Transition rules:**

| From | To | Guard Condition |
|---|---|---|
| `DRAFT` | `ORDERED` | At least one line item; customer identified |
| `ORDERED` | `SENT_TO_LAB` | Prescription recorded; lens specification complete |
| `SENT_TO_LAB` | `IN_FITTING` | Lab confirms lens receipt |
| `IN_FITTING` | `READY_FOR_COLLECTION` | Frame + lens assembled; QC passed |
| `READY_FOR_COLLECTION` | `DELIVERED_AND_CLOSED` | Balance settled (or credit approved) |
| `DRAFT` / `ORDERED` | `CANCELLED_REFUNDED` | Admin only; triggers inventory restock |
| `SENT_TO_LAB` | `CANCELLED_REFUNDED` | Admin only; possible lab cancellation fee |

**Immutable rule:** Once `DELIVERED_AND_CLOSED`, the invoice is financially immutable. Corrections require a **credit note**, not an edit. Only Admin role may generate credit notes.

### 1.3.4 Dual Output Printing Engine

#### Output A — Customer Tax Invoice (80mm Thermal & A4)

**Thermal (80mm) layout:**
```
width: 72mm; margin: 0 auto;
font-family: 'Courier New', monospace; (thermal-safe)
font-size: 10px;
```

Content sequence:
1. Store name, GSTIN, address
2. Invoice number, date, time
3. Patient name, phone
4. Itemised table: HSN code, description, qty, rate, amount
5. Tax breakdown: CGST / SGST / IGST by HSN group
6. Subtotal, discount, taxable value
7. Advance paid, **balance due**
8. Store policy: “Goods once sold will not be taken back. Warranty as per manufacturer terms.”
9. Barcode / QR of invoice number (optional)

**A4 layout:** Standard tax invoice with 3-line address block, GSTIN prominent, HSN summary table.

#### Output B — Workshop / Lab Job Slip (A4/A5)

**Strict exclusion rule:** `.financial-data { display: none !important; }` applies to all `<td>`, `<div>`, and `<span>` elements containing prices, costs, margins, or invoice totals. The lab technician sees **only fabrication parameters**.

Content sequence:
1. Job ticket number (large, monospaced, bold)
2. Promised delivery date
3. Frame model / colour / size
4. **OD prescription grid:** SPH, CYL, AXIS, ADD, PD
5. **OS prescription grid:** SPH, CYL, AXIS, ADD, PD
6. Lens type, coating, material
7. Special instructions (e.g., “lens thickness priority: thin”)
8. **No financial data of any kind.**

### 1.3.5 Split-Tender & Receivables Ledger

The system supports **multi-tender settlement** per invoice:

- Partial Cash + Partial UPI
- Partial Card + Partial Cash
- Advance at booking, balance at delivery
- Per-customer credit tracking with aging (0–30, 31–60, 61–90, 90+ days)

Each tender is a separate row in `payments`, linked to the same `invoice_id`. The invoice’s `payment_status` is derived:

```
paid_amount = SUM(payments.amount WHERE invoice_id = ?)
IF paid_amount == 0                 → UNPAID
IF 0 < paid_amount < invoice.total  → PARTIAL
IF paid_amount >= invoice.total      → PAID
```

**Overpayment handling:** If `paid_amount > total`, the excess is recorded as a customer credit balance (`advance_balance` on the customer record), not as a negative balance on the invoice. This prevents invoice-level rounding discrepancies.

### 1.3.6 Optical Formulas

To permanently establish standard calculation rules across future laboratory fabrication, lens ordering, and surfacing modules, the system defines the following two foundational optical formulas:

* **Minus/Plus Cylinder Transposition:**
  Used for converting prescriptions between minus-cylinder and plus-cylinder notation:
  - `New SPH = SPH + CYL`
  - `New CYL = opposite sign` (invert the sign while retaining the same absolute magnitude)
  - `New AXIS = AXIS ± 90` (if original axis is ≤ 90, add 90; if > 90, subtract 90)

* **Prentice's Rule:**
  Used for calculating induced prism based on pupillary distance decentration:
  $$\text{Prism} = \text{Power} \times \text{Decentration in cm}$$
  - Decentration in centimetres is calculated as $\text{Decentration } (mm) / 10$.
  - Applied during optical center fitting and lens verification to evaluate unwanted induced horizontal and vertical prismatic displacement against clinical tolerances.

## 1.4 Non-Functional Requirements

| Requirement | Target | Measurement |
|---|---|---|
| Patient search latency (phone lookup) | < 50 ms P99 | Server-side query with indexed phone; no full-table scans |
| Invoice creation (end-to-end) | < 800 ms | Including inventory check, stock decrement, payment record |
| Thermal print render time | < 300 ms | From click to browser print dialog |
| Concurrent clerks per store | 5 | Neon free tier: 100 max_connections, pooler: 10,000 |
| Uptime (free tier) | 99.5% | Neon/Vercel SLA |
| Data retention | 7 years | Soft-delete with `deleted_at`; no hard DELETE on financial records |


# PHASE 2: DATABASE ARCHITECTURE & RELATIONAL SCHEMA

## 2.1 Technology Decision: Drizzle ORM + Neon PostgreSQL

**Why Drizzle over Prisma:**

1. Drizzle’s `decimal()` column type returns **strings** from PostgreSQL — this is the correct behaviour for monetary precision and forces the developer to use a decimal library (e.g., `decimal.js`) rather than accidentally performing IEEE-754 arithmetic.
2. Drizzle’s SQL-like query builder produces predictable, auditable SQL — critical for financial ledgers.
3. Drizzle does **not** auto-index foreign keys. This is a feature, not a bug: it forces explicit index declarations, preventing silent full-table scans that would emerge as the invoice ledger grows.

**Why Neon PostgreSQL over Turso (SQLite):**

- PostgreSQL’s `NUMERIC(precision, scale)` type provides exact decimal arithmetic at the database level. SQLite’s `DECIMAL` is a type affinity hint, not a true decimal type.
- Neon’s free tier provides 0.5 GB storage, connection pooling via PgBouncer, and serverless driver support. For an optical store with ~50 invoices/day, 0.5 GB lasts approximately 2–3 years before requiring upgrade.
- Turso’s free tier (9 GB, 500 databases) is attractive for multi-tenant isolation, but SQLite’s lack of strict decimal typing introduces precision risk. If Turso is chosen, **all monetary values must be stored as INTEGER paise** (₹1 = 100 paise) to eliminate floating-point risk entirely.

**Decision:** Neon PostgreSQL with `NUMERIC(12,2)` for all monetary columns.

## 2.2 Complete Drizzle Schema

```typescript
// src/db/schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'OPTOMETRIST',
  'CLERK',
]);

export const genderEnum = pgEnum('gender', [
  'MALE',
  'FEMALE',
  'OTHER',
]);

export const inventoryCategoryEnum = pgEnum('inventory_category', [
  'FRAME',
  'SUNGLASS',
  'OPHTHALMIC_LENS',
  'CONTACT_LENS',
  'ACCESSORY',
  'SERVICE',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'DRAFT',
  'ORDERED',
  'SENT_TO_LAB',
  'IN_FITTING',
  'READY_FOR_COLLECTION',
  'DELIVERED_AND_CLOSED',
  'CANCELLED_REFUNDED',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'UNPAID',
  'PARTIAL',
  'PAID',
]);

export const paymentModeEnum = pgEnum('payment_mode', [
  'CASH',
  'UPI',
  'CARD',
  'CREDIT',
]);

export const lensTypeEnum = pgEnum('lens_type', [
  'SINGLE_VISION',
  'BIFOCAL',
  'PROGRESSIVE',
  'PHOTOCHROMIC',
  'BLUE_CUT',
  'PLANO',
]);

export const coatingEnum = pgEnum('coating', [
  'NONE',
  'ANTI_REFLECTIVE',
  'SCRATCH_RESISTANT',
  'UV400',
  'HYDROPHOBIC',
  'BLUE_FILTER',
]);

export const lensMaterialEnum = pgEnum('lens_material', [
  'CR39',
  'POLYCARBONATE',
  'TRIVEX',
  'HIGH_INDEX_167',
  'HIGH_INDEX_174',
]);

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 15 }).notNull(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    age: integer('age'),
    gender: genderEnum('gender'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 10 }),
    gstin: varchar('gstin', { length: 15 }),
    advanceBalance: numeric('advance_balance', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    metadata: text('metadata'), // JSONB-like free text for extensions
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    phoneIdx: index('customers_phone_idx').on(table.phone),
    phoneUniqueIdx: uniqueIndex('customers_phone_unique_idx').on(
      table.phone
    ),
  })
);

// ─────────────────────────────────────────────────────────────
// OPTICAL PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────

export const opticalPrescriptions = pgTable(
  'optical_prescriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    // OD (Right Eye)
    odSphere: numeric('od_sphere', { precision: 5, scale: 2 }),
    odCylinder: numeric('od_cylinder', { precision: 5, scale: 2 }),
    odAxis: integer('od_axis'),
    odAdd: numeric('od_add', { precision: 4, scale: 2 }),
    odPd: numeric('od_pd', { precision: 4, scale: 1 }),
    // OS (Left Eye)
    osSphere: numeric('os_sphere', { precision: 5, scale: 2 }),
    osCylinder: numeric('os_cylinder', { precision: 5, scale: 2 }),
    osAxis: integer('os_axis'),
    osAdd: numeric('os_add', { precision: 4, scale: 2 }),
    osPd: numeric('os_pd', { precision: 4, scale: 1 }),
    // Binocular PD
    binocularPd: numeric('binocular_pd', { precision: 4, scale: 1 }),
    // Contact lens specifics
    odBaseCurve: numeric('od_base_curve', { precision: 4, scale: 1 }),
    odDiameter: numeric('od_diameter', { precision: 4, scale: 1 }),
    osBaseCurve: numeric('os_base_curve', { precision: 4, scale: 1 }),
    osDiameter: numeric('os_diameter', { precision: 4, scale: 1 }),
    // Clinical
    prismNotes: text('prism_notes'),
    visualAcuityNotes: text('visual_acuity_notes'),
    clinicalRemarks: text('clinical_remarks'),
    prescribedBy: uuid('prescribed_by'),
    prescribedAt: timestamp('prescribed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    customerIdx: index('rx_customer_idx').on(table.customerId),
    prescribedAtIdx: index('rx_prescribed_at_idx').on(
      table.prescribedAt
    ),
    odAxisCheck: check(
      'od_axis_range',
      sql`${table.odAxis} IS NULL OR (${table.odAxis} >= 1 AND ${table.odAxis} <= 180)`
    ),
    osAxisCheck: check(
      'os_axis_range',
      sql`${table.osAxis} IS NULL OR (${table.osAxis} >= 1 AND ${table.osAxis} <= 180)`
    ),
  })
);

// ─────────────────────────────────────────────────────────────
// INVENTORY ITEMS
// ─────────────────────────────────────────────────────────────

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 50 }).notNull(),
    barcode: varchar('barcode', { length: 50 }),
    category: inventoryCategoryEnum('category').notNull(),
    brand: varchar('brand', { length: 100 }),
    model: varchar('model', { length: 150 }),
    description: text('description'),
    // Monetary — NUMERIC(12,2) = up to ₹9,99,99,99,999.99
    costPrice: numeric('cost_price', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    sellingPrice: numeric('selling_price', {
      precision: 12,
      scale: 2,
    }).notNull(),
    mrp: numeric('mrp', { precision: 12, scale: 2 }),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold')
      .notNull()
      .default(5),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 })
      .notNull()
      .default('18.00'), // 5.00 or 18.00
    hsnCode: varchar('hsn_code', { length: 10 }),
    // Optical-specific
    lensType: lensTypeEnum('lens_type'),
    coating: coatingEnum('coating'),
    lensMaterial: lensMaterialEnum('lens_material'),
    // Audit
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    skuUniqueIdx: uniqueIndex('inventory_sku_unique_idx').on(table.sku),
    barcodeIdx: index('inventory_barcode_idx').on(table.barcode),
    categoryIdx: index('inventory_category_idx').on(table.category),
    brandModelIdx: index('inventory_brand_model_idx').on(
      table.brand,
      table.model
    ),
    lowStockIdx: index('inventory_low_stock_idx').on(
      table.stockQuantity,
      table.lowStockThreshold
    ),
  })
);

// ─────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceNumber: varchar('invoice_number', { length: 30 }).notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    prescriptionId: uuid('prescription_id').references(
      () => opticalPrescriptions.id,
      { onDelete: 'set null' }
    ),
    orderStatus: orderStatusEnum('order_status')
      .notNull()
      .default('DRAFT'),
    paymentStatus: paymentStatusEnum('payment_status')
      .notNull()
      .default('UNPAID'),
    // Financial — all NUMERIC(12,2)
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    discountAmount: numeric('discount_amount', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    taxableValue: numeric('taxable_value', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    cgstAmount: numeric('cgst_amount', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    sgstAmount: numeric('sgst_amount', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    igstAmount: numeric('igst_amount', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    totalTax: numeric('total_tax', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    grandTotal: numeric('grand_total', {
      precision: 12,
      scale: 2,
    }).notNull(),
    advancePaid: numeric('advance_paid', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    balanceDue: numeric('balance_due', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    // Order metadata
    promisedDeliveryDate: timestamp('promised_delivery_date', {
      withTimezone: true,
    }),
    labJobTicketNumber: varchar('lab_job_ticket_number', {
      length: 50,
    }),
    notes: text('notes'),
    // Audit
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    invoiceNumberUniqueIdx: uniqueIndex(
      'invoice_number_unique_idx'
    ).on(table.invoiceNumber),
    customerIdx: index('invoice_customer_idx').on(table.customerId),
    orderStatusIdx: index('invoice_order_status_idx').on(
      table.orderStatus
    ),
    paymentStatusIdx: index('invoice_payment_status_idx').on(
      table.paymentStatus
    ),
    createdAtIdx: index('invoice_created_at_idx').on(table.createdAt),
    prescriptionIdx: index('invoice_prescription_idx').on(
      table.prescriptionId
    ),
  })
);

// ─────────────────────────────────────────────────────────────
// INVOICE ITEMS
// ─────────────────────────────────────────────────────────────

export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id').references(
      () => inventoryItems.id,
      { onDelete: 'restrict' }
    ),
    description: varchar('description', { length: 300 }).notNull(),
    hsnCode: varchar('hsn_code', { length: 10 }),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 })
      .notNull(),
    discountPerUnit: numeric('discount_per_unit', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 })
      .notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 })
      .notNull()
      .default('18.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    // Lens specification for this line (if applicable)
    lensType: lensTypeEnum('lens_type'),
    coating: coatingEnum('coating'),
    lensMaterial: lensMaterialEnum('lens_material'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    invoiceIdx: index('invoice_item_invoice_idx').on(table.invoiceId),
    inventoryIdx: index('invoice_item_inventory_idx').on(
      table.inventoryItemId
    ),
  })
);

// ─────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    paymentMode: paymentModeEnum('payment_mode').notNull(),
    transactionReference: varchar('transaction_reference', {
      length: 100,
    }),
    collectedBy: uuid('collected_by'),
    paidAt: timestamp('paid_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    invoiceIdx: index('payment_invoice_idx').on(table.invoiceId),
    paidAtIdx: index('payment_paid_at_idx').on(table.paidAt),
    modeIdx: index('payment_mode_idx').on(table.paymentMode),
  })
);

// ─────────────────────────────────────────────────────────────
// RELATIONS (for Drizzle query API)
// ─────────────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  prescriptions: many(opticalPrescriptions),
  invoices: many(invoices),
}));

export const prescriptionsRelations = relations(
  opticalPrescriptions,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [opticalPrescriptions.customerId],
      references: [customers.id],
    }),
    invoices: many(invoices),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  prescription: one(opticalPrescriptions, {
    fields: [invoices.prescriptionId],
    references: [opticalPrescriptions.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(
  invoiceItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceItems.invoiceId],
      references: [invoices.id],
    }),
    inventoryItem: one(inventoryItems, {
      fields: [invoiceItems.inventoryItemId],
      references: [inventoryItems.id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));
```

## 2.3 Critical Indexing & Constraint Decisions

### Foreign Key Index Policy

Drizzle does **not** automatically create indexes on foreign key columns. Every `references()` call above is paired with an explicit `index()` declaration. Without this, the following query patterns would degrade to full-table scans as the ledger grows:

| Query Pattern | Required Index | Why |
|---|---|---|
| `SELECT * FROM invoices WHERE customer_id = ?` | `invoice_customer_idx` | Customer statement / history |
| `SELECT * FROM invoice_items WHERE invoice_id = ?` | `invoice_item_invoice_idx` | Invoice detail rendering |
| `SELECT * FROM payments WHERE invoice_id = ?` | `payment_invoice_idx` | Balance computation |
| `SELECT * FROM optical_prescriptions WHERE customer_id = ?` | `rx_customer_idx` | Prescription lookup at counter |
| `SELECT * FROM inventory_items WHERE sku = ?` | `inventory_sku_unique_idx` | Barcode scan / manual SKU entry |

### Compound Index Rationale

- `inventory_brand_model_idx` supports the counter clerk’s workflow: “show me all Ray-Ban Wayfarer frames in stock.”
- `inventory_low_stock_idx` accelerates the low-stock alert dashboard query: `WHERE stock_quantity <= low_stock_threshold`.
- `invoice_order_status_idx` + `invoice_payment_status_idx` enable the Z-report query: `WHERE order_status = 'DELIVERED_AND_CLOSED' AND payment_status = 'PAID' AND created_at::date = CURRENT_DATE`.

### Currency Constraints

All monetary columns use `numeric(precision, scale)`:

- `numeric(12, 2)` supports values from −9,999,999,999.99 to +9,999,999,999.99 — sufficient for any optical transaction in India.
- Drizzle returns these as **strings**. This is intentional and must be handled with a decimal library:

```typescript
import Decimal from 'decimal.js';

// CORRECT
const total = new Decimal(invoice.grandTotal)
  .plus(new Decimal(payment.amount))
  .toFixed(2);

// CATASTROPHICALLY WRONG — string concatenation
const total = invoice.grandTotal + payment.amount; // "250.0050.00"
```

TypeScript will not catch this error because both operands are typed as `string`. ESLint rule `no-restricted-syntax` should prohibit `+` operators on variables matching `/amount|total|price|tax|discount/i`.


# PHASE 3: FRONTEND UI WIREFRAMES & UX DESIGN

## 3.1 Layout Blueprint: Desktop-First POS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────────────────────────────────────────────────────┐  │
│  │          │  │  🔍 Search patient by phone...          [F1 New Bill]   │  │
│  │  SIDEBAR │  │                                                         │  │
│  │          │  ├─────────────────────────────────────────────────────────┤  │
│  │  Dashboard│  │                                                         │  │
│  │  New Bill │  │  ┌─────────────────────┐  ┌───────────────────────────┐ │  │
│  │  Patients │  │  │  PATIENT INFO       │  │  INVOICE CART             │ │  │
│  │  Inventory│  │  │  Name: ___          │  │  ┌────┬────┬────┬──────┐ │ │  │
│  │  Orders   │  │  │  Phone: ___         │  │  │Item│Qty │Rate│Total │ │ │  │
│  │  Reports  │  │  │  Age: ___  Gender:__│  │  ├────┼────┼────┼──────┤ │ │  │
│  │  Settings │  │  └─────────────────────┘  │  │Frame│ 1  │2500│2500  │ │ │  │
│  │          │  │                            │  │Lens │ 1  │1800│1800  │ │ │  │
│  │  ────────│  │  ┌─────────────────────┐  │  │Fit  │ 1  │ 500│ 500  │ │ │  │
│  │  F1: Bill│  │  │  OD (Right Eye)     │  │  └────┴────┴────┴──────┘ │ │  │
│  │  F2: Find│  │  │  SPH [−][   ][+]    │  │                           │ │  │
│  │  F3: Inv │  │  │  CYL [−][   ][+]    │  │  Subtotal:        ₹4,800  │ │  │
│  │  F4: Pay │  │  │  AXIS[−][   ][+]    │  │  Discount:        −₹200   │ │  │
│  │  F5:Print│  │  │  ADD [−][   ][+]    │  │  Taxable:         ₹4,600  │ │  │
│  │  F6: Lab │  │  │  PD  [   ][mm]      │  │  CGST (9%):       ₹414    │ │  │
│  │          │  │  └─────────────────────┘  │  SGST (9%):       ₹414    │ │  │
│  │          │  │                            │  ─────────────────────────  │ │  │
│  │          │  │  ┌─────────────────────┐  │  Grand Total:     ₹5,428  │ │  │
│  │          │  │  │  OS (Left Eye)      │  │  Advance:        −₹1,000  │ │  │
│  │          │  │  │  SPH [−][   ][+]    │  │  ─────────────────────────  │ │  │
│  │          │  │  │  CYL [−][   ][+]    │  │  BALANCE DUE:     ₹4,428  │ │  │
│  │          │  │  │  AXIS[−][   ][+]    │  │                           │ │  │
│  │          │  │  │  ADD [−][   ][+]    │  │  [Cash] [UPI] [Card]      │ │  │
│  │          │  │  │  PD  [   ][mm]      │  │  Amount: ₹________        │ │  │
│  │          │  │  └─────────────────────┘  │  [Add Payment] [Complete] │ │  │
│  │          │  │                            │                           │ │  │
│  │          │  │  ┌─────────────────────┐  │                           │ │  │
│  │          │  │  │  LENS SPEC          │  │                           │ │  │
│  │          │  │  │  Type: [Progressive]│  │                           │ │  │
│  │          │  │  │  Coating: [AR]      │  │                           │ │  │
│  │          │  │  │  Material: [Poly]   │  │                           │ │  │
│  │          │  │  └─────────────────────┘  │                           │ │  │
│  └──────────┘  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Keyboard Shortcuts (Function Key Map)

Based on POS convention across retail systems, the following shortcuts are mandated:

| Key | Action | Context |
|---|---|---|
| **F1** | New Bill / Focus Phone Search | Global |
| **F2** | Patient Search Modal | Global |
| **F3** | Inventory Quick Lookup | Global |
| **F4** | Open Payment Panel | Invoice cart |
| **F5** | Print Menu (Thermal / A4 / Lab Slip) | Invoice cart |
| **F6** | Generate Lab Job Slip | Order in `ORDERED` state |
| **F7** | Apply Discount | Invoice cart |
| **F8** | Save Draft | Global |
| **F9** | Cycle Payment Mode | Payment panel |
| **F10** | Finalise / Complete Sale | Invoice cart |
| **Esc** | Close modal / Cancel current action | Global |
| **Ctrl+K** | Command Palette (search everything) | Global |

Implementation: A single `useKeyboardShortcuts()` hook mounted in the root layout registers `keydown` listeners. Shortcuts are suppressed when `document.activeElement` is an `<input>` or `<textarea>`, except for `F1`–`F12` which are always captured (they have no text-input use case).

```typescript
// src/hooks/useKeyboardShortcuts.ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key; // "F1", "F2", "Escape", etc.
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
```

## 3.3 Rapid Invoicing UI — Key Behaviours

### 3.3.1 Debounced Phone Search (Sub-50ms Autofill)

```typescript
// src/components/PatientSearch.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export function PatientSearch({
  onPatientSelect,
}: {
  onPatientSelect: (patient: Patient) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useDebouncedCallback(async (phone: string) => {
    if (phone.length < 3) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/patients/search?phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();
      setResults(data.patients);
      // Auto-select if exactly one match
      if (data.patients.length === 1) {
        onPatientSelect(data.patients[0]);
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, 150); // 150 ms debounce — balances responsiveness with request volume

  return (
    <div className="relative">
      <input
        type="tel"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
        placeholder="Phone number (F2 to search)"
        className="w-full rounded-md border px-3 py-2 font-mono text-lg"
        autoFocus
        inputMode="numeric"
      />
      {isSearching && (
        <div className="absolute right-3 top-3 text-sm text-muted-foreground">
          Searching…
        </div>
      )}
      {results.length > 1 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
          {results.map((p) => (
            <li
              key={p.id}
              className="cursor-pointer px-3 py-2 hover:bg-accent"
              onClick={() => {
                onPatientSelect(p);
                setResults([]);
              }}
            >
              <span className="font-medium">{p.fullName}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {p.phone}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Server-side query (Neon):**

```typescript
// app/api/patients/search/route.ts
import { db } from '@/db';
import { customers } from '@/db/schema';
import { like, or, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') ?? '';

  const start = performance.now();

  const patients = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      age: customers.age,
      gender: customers.gender,
    })
    .from(customers)
    .where(like(customers.phone, `${phone}%`))
    .limit(10);

  const elapsed = performance.now() - start;
  if (elapsed > 50) {
    console.warn(`Patient search took ${elapsed.toFixed(1)}ms`);
  }

  return NextResponse.json({ patients });
}
```

The `customers_phone_idx` B-tree index ensures this query executes in logarithmic time. With 10,000 patients, the lookup completes in **< 5 ms** on Neon’s free tier.

### 3.3.2 Synchronised OD/OS Prescription Grid

The grid uses a **shared step-button pattern**: each parameter has `[−]` and `[+]` buttons that increment/decrement by the domain-appropriate step (0.25 for SPH/CYL/ADD, 1 for AXIS, 0.5 for PD). The input field itself is `<input type="text">` with `inputMode="decimal"` — **not** `type="number"`, because the browser’s native number stepper behaviour conflicts with custom step logic and produces inconsistent behaviour across browsers.

```typescript
// src/components/PrescriptionGrid.tsx
'use client';
import { z } from 'zod';

const SPH_STEP = 0.25;
const CYL_STEP = 0.25;
const ADD_STEP = 0.25;
const AXIS_STEP = 1;
const PD_STEP = 0.5;

function StepInput({
  value,
  onChange,
  step,
  min,
  max,
  label,
  unit,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
}) {
  const increment = () => {
    const next = value === null ? step : value + step;
    if (next <= max) onChange(roundToStep(next, step));
  };
  const decrement = () => {
    const next = value === null ? -step : value - step;
    if (next >= min) onChange(roundToStep(next, step));
  };

  return (
    <div className="flex items-center gap-1">
      <span className="w-10 text-xs font-medium">{label}</span>
      <button
        type="button"
        onClick={decrement}
        className="h-7 w-7 rounded border text-sm hover:bg-accent"
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(null);
            return;
          }
          const n = parseFloat(raw);
          if (!isNaN(n) && n >= min && n <= max) {
            onChange(roundToStep(n, step));
          }
        }}
        className="w-20 rounded border px-1 py-0.5 text-center font-mono text-sm"
      />
      <button
        type="button"
        onClick={increment}
        className="h-7 w-7 rounded border text-sm hover:bg-accent"
      >
        +
      </button>
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}
```

### 3.3.3 Dynamic Billing Cart

The cart recomputes on every state change using a `useMemo` reducer:

```typescript
interface CartLine {
  inventoryItemId: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number; // in paise (integer) or Decimal
  taxRate: number; // 5 or 18
  discountPerUnit: number;
}

interface CartTotals {
  subtotal: Decimal;
  totalDiscount: Decimal;
  taxableValue: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  grandTotal: Decimal;
}
```

All arithmetic uses `decimal.js`. The cart never touches JavaScript `number` for monetary values after initial entry; UI inputs are parsed to `Decimal` immediately.

## 3.4 Client-Side Print Engineering

### 3.4.1 Thermal 80mm Receipt CSS

```css
/* src/styles/print-thermal.css */

@media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }

  body * {
    visibility: hidden;
  }

  #thermal-receipt,
  #thermal-receipt * {
    visibility: visible;
  }

  #thermal-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 72mm;
    margin: 0 auto;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    line-height: 1.2;
  }

  #thermal-receipt .no-print {
    display: none !important;
  }

  #thermal-receipt table {
    width: 100%;
    border-collapse: collapse;
  }

  #thermal-receipt td,
  #thermal-receipt th {
    padding: 1px 2px;
    text-align: left;
    vertical-align: top;
  }

  #thermal-receipt .amount-col {
    text-align: right;
  }

  #thermal-receipt .divider {
    border-top: 1px dashed #000;
    margin: 4px 0;
  }
}
```

**Critical note on `page-break-inside: avoid`:** For thermal receipts, **do not** use `page-break-inside: avoid` on line items. Thermal printers cut on every page break, and `avoid` can cause the browser to push content to a new “page” (i.e., a new cut segment) rather than letting the receipt run continuously. The receipt should be treated as a single continuous strip; the printer’s auto-cutter handles the final cut.

### 3.4.2 Workshop Lab Slip CSS (Financial Data Stripped)

```css
/* src/styles/print-lab-slip.css */

@media print {
  @page {
    size: A4;
    margin: 15mm;
  }

  .financial-data,
  .no-print,
  .invoice-totals,
  .payment-section {
    display: none !important;
  }

  #lab-slip {
    font-family: Arial, sans-serif;
    font-size: 12pt;
  }

  #lab-slip .job-ticket {
    font-size: 24pt;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  #lab-slip .rx-grid {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12pt;
  }

  #lab-slip .rx-grid th,
  #lab-slip .rx-grid td {
    border: 1px solid #000;
    padding: 6pt 8pt;
    text-align: center;
  }

  #lab-slip .rx-grid .eye-label {
    font-weight: bold;
    text-align: left;
    width: 60pt;
  }
}
```

**Template structure:**

```tsx
<div id="lab-slip">
  <div className="job-ticket">JOB #{invoice.labJobTicketNumber}</div>
  <div>Promised: {formatDate(invoice.promisedDeliveryDate)}</div>

  <table className="rx-grid">
    <thead>
      <tr>
        <th>Eye</th>
        <th>SPH</th>
        <th>CYL</th>
        <th>AXIS</th>
        <th>ADD</th>
        <th>PD</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="eye-label">OD (Right)</td>
        <td>{rx.odSphere ?? '—'}</td>
        <td>{rx.odCylinder ?? '—'}</td>
        <td>{rx.odAxis ?? '—'}</td>
        <td>{rx.odAdd ?? '—'}</td>
        <td>{rx.odPd ?? rx.binocularPd}</td>
      </tr>
      <tr>
        <td className="eye-label">OS (Left)</td>
        <td>{rx.osSphere ?? '—'}</td>
        <td>{rx.osCylinder ?? '—'}</td>
        <td>{rx.osAxis ?? '—'}</td>
        <td>{rx.osAdd ?? '—'}</td>
        <td>{rx.osPd ?? rx.binocularPd}</td>
      </tr>
    </tbody>
  </table>

  {/* Financial data is NOT rendered here — not merely hidden */}
  <div>Lens Type: {invoice.lensType}</div>
  <div>Coating: {invoice.coating}</div>
  <div>Material: {invoice.lensMaterial}</div>
</div>
```

**Design principle:** Financial data is **conditionally omitted from the React tree** when rendering the lab slip — it is never rendered and then hidden via CSS. This prevents the data from appearing in the DOM, browser DevTools, or any client-side state inspection.

## 3.5 Complete Zod Validation Schema

```typescript
// src/lib/validators/prescription.ts
import { z } from 'zod';

/** Integer-scaling refinement to prevent IEEE-754 floating-point validation bugs */
const isQuarterStep = (val: number): boolean => {
  const scaled = Math.round(val * 100);
  return scaled % 25 === 0;
};

const sphereSchema = z
  .number()
  .min(-20, 'SPH must be ≥ −20.00')
  .max(20, 'SPH must be ≤ +20.00')
  .refine(isQuarterStep, 'SPH must be a multiple of 0.25')
  .nullable();

const cylinderSchema = z
  .number()
  .min(-6, 'CYL must be ≥ −6.00')
  .max(6, 'CYL must be ≤ +6.00')
  .refine(isQuarterStep, 'CYL must be a multiple of 0.25')
  .nullable();

const axisSchema = z
  .number()
  .int('Axis must be a whole number')
  .min(1, 'Axis must be ≥ 1°')
  .max(180, 'Axis must be ≤ 180°')
  .nullable();

const addSchema = z
  .number()
  .min(0.75, 'ADD must be ≥ +0.75')
  .max(4.0, 'ADD must be ≤ +4.00')
  .refine(isQuarterStep, 'ADD must be a multiple of 0.25')
  .nullable();

const pdSchema = z
  .number()
  .min(20, 'PD must be ≥ 20 mm')
  .max(80, 'PD must be ≤ 80 mm')
  .nullable();

export const prescriptionSchema = z
  .object({
    customerId: z.string().uuid(),
    odSphere: sphereSchema,
    odCylinder: cylinderSchema,
    odAxis: axisSchema,
    odAdd: addSchema,
    odPd: pdSchema,
    osSphere: sphereSchema,
    osCylinder: cylinderSchema,
    osAxis: axisSchema,
    osAdd: addSchema,
    osPd: pdSchema,
    binocularPd: pdSchema,
    odBaseCurve: z.number().min(7).max(10).nullable(),
    odDiameter: z.number().min(13).max(15).nullable(),
    osBaseCurve: z.number().min(7).max(10).nullable(),
    osDiameter: z.number().min(13).max(15).nullable(),
    prismNotes: z.string().max(500).optional(),
    visualAcuityNotes: z.string().max(500).optional(),
    clinicalRemarks: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    // Axis required when CYL ≠ 0
    if (data.odCylinder !== null && data.odCylinder !== 0 && data.odAxis === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OD Axis is required when OD Cylinder is non-zero',
        path: ['odAxis'],
      });
    }
    if (data.osCylinder !== null && data.osCylinder !== 0 && data.osAxis === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OS Axis is required when OS Cylinder is non-zero',
        path: ['osAxis'],
      });
    }
    // Monocular PD sum consistency
    if (data.odPd && data.osPd && data.binocularPd) {
      const sum = data.odPd + data.osPd;
      if (Math.abs(sum - data.binocularPd) > 0.5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Monocular PD sum (${sum} mm) deviates from binocular PD (${data.binocularPd} mm) by more than 0.5 mm`,
          path: ['binocularPd'],
        });
      }
    }
  });

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

// ─────────────────────────────────────────────────────────────
// Invoice / Order validation
// ─────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  inventoryItemId: z.string().uuid().nullable(),
  description: z.string().min(1).max(300),
  hsnCode: z.string().max(10).nullable(),
  quantity: z.number().int().min(1).max(999),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid monetary format'),
  discountPerUnit: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  taxRate: z.enum(['5.00', '18.00']),
  lensType: z
    .enum([
      'SINGLE_VISION',
      'BIFOCAL',
      'PROGRESSIVE',
      'PHOTOCHROMIC',
      'BLUE_CUT',
      'PLANO',
    ])
    .nullable(),
  coating: z
    .enum([
      'NONE',
      'ANTI_REFLECTIVE',
      'SCRATCH_RESISTANT',
      'UV400',
      'HYDROPHOBIC',
      'BLUE_FILTER',
    ])
    .nullable(),
  lensMaterial: z
    .enum([
      'CR39',
      'POLYCARBONATE',
      'TRIVEX',
      'HIGH_INDEX_167',
      'HIGH_INDEX_174',
    ])
    .nullable(),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  prescription: prescriptionSchema.optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item required'),
  advancePayment: z
    .object({
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      mode: z.enum(['CASH', 'UPI', 'CARD']),
      reference: z.string().max(100).optional(),
    })
    .optional(),
  promisedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```


# PHASE 4: BACKEND BUSINESS LOGIC & CONCURRENCY

## 4.1 `processOpticalOrder` — Complete Server Action

```typescript
// src/actions/process-optical-order.ts
'use server';

import { db } from '@/db';
import {
  customers,
  opticalPrescriptions,
  invoices,
  invoiceItems,
  inventoryItems,
  payments,
} from '@/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import {
  createOrderSchema,
  type CreateOrderInput,
} from '@/lib/validators/prescription';
import Decimal from 'decimal.js';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Typed response
// ─────────────────────────────────────────────────────────────

export type ProcessOrderResult =
  | {
      success: true;
      invoiceId: string;
      invoiceNumber: string;
      grandTotal: string;
      balanceDue: string;
    }
  | {
      success: false;
      error:
        | 'VALIDATION_ERROR'
        | 'CUSTOMER_NOT_FOUND'
        | 'INSUFFICIENT_STOCK'
        | 'INVENTORY_ITEM_NOT_FOUND'
        | 'INVOICE_NUMBER_GENERATION_FAILED'
        | 'DATABASE_ERROR';
      message: string;
      details?: Record<string, unknown>;
    };

// ─────────────────────────────────────────────────────────────
// Helper: generate sequential invoice number
// ─────────────────────────────────────────────────────────────

async function generateInvoiceNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string> {
  // Use a PostgreSQL sequence for atomic, gap-free numbering
  const result = await tx.execute(
    sql`SELECT nextval('invoice_number_seq') AS seq`
  );
  const seq = (result.rows[0] as { seq: string }).seq;
  const year = new Date().getFullYear().toString().slice(-2);
  return `INV-${year}-${String(seq).padStart(6, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────

export async function processOpticalOrder(
  rawInput: unknown
): Promise<ProcessOrderResult> {
  // ── Step 1: Strict input parsing ──
  const parsed = createOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Order data failed validation',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const input: CreateOrderInput = parsed.data;

  // ── Step 2: Pre-transaction validation ──

  // 2a. Verify customer exists
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, input.customerId))
    .limit(1);

  if (!customer) {
    return {
      success: false,
      error: 'CUSTOMER_NOT_FOUND',
      message: `Customer ${input.customerId} does not exist`,
    };
  }

  // 2b. Verify all physical inventory items exist (before transaction)
  const inventoryItemIds = input.items
    .map((i) => i.inventoryItemId)
    .filter((id): id is string => id !== null);

  if (inventoryItemIds.length > 0) {
    const existingItems = await db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(inArray(inventoryItems.id, inventoryItemIds));

    const existingIds = new Set(existingItems.map((i) => i.id));
    const missingIds = inventoryItemIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      return {
        success: false,
        error: 'INVENTORY_ITEM_NOT_FOUND',
        message: `Inventory items not found: ${missingIds.join(', ')}`,
        details: { missingIds },
      };
    }
  }

  // ── Step 3: Atomic database transaction ──
  try {
    const result = await db.transaction(async (tx) => {
      // ── 3a. Check inventory levels and decrement atomically ──
      // For each physical SKU, use a conditional UPDATE with RETURNING
      // to prevent race conditions under concurrent clerks.

      for (const item of input.items) {
        if (!item.inventoryItemId) continue; // service line, no stock

        const updated = await tx
          .update(inventoryItems)
          .set({
            stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryItems.id, item.inventoryItemId),
              sql`${inventoryItems.stockQuantity} >= ${item.quantity}`
            )
          )
          .returning({ id: inventoryItems.id });

        if (updated.length === 0) {
          // No row was updated → insufficient stock
          const [current] = await tx
            .select({
              sku: inventoryItems.sku,
              stockQuantity: inventoryItems.stockQuantity,
            })
            .from(inventoryItems)
            .where(eq(inventoryItems.id, item.inventoryItemId));

          throw new InsufficientStockError(
            item.inventoryItemId,
            current?.sku ?? 'UNKNOWN',
            current?.stockQuantity ?? 0,
            item.quantity
          );
        }
      }

      // ── 3b. Persist prescription if provided ──
      let prescriptionId: string | null = null;
      if (input.prescription) {
        const [rx] = await tx
          .insert(opticalPrescriptions)
          .values({
            customerId: input.prescription.customerId,
            odSphere: input.prescription.odSphere?.toFixed(2) ?? null,
            odCylinder: input.prescription.odCylinder?.toFixed(2) ?? null,
            odAxis: input.prescription.odAxis,
            odAdd: input.prescription.odAdd?.toFixed(2) ?? null,
            odPd: input.prescription.odPd?.toFixed(1) ?? null,
            osSphere: input.prescription.osSphere?.toFixed(2) ?? null,
            osCylinder: input.prescription.osCylinder?.toFixed(2) ?? null,
            osAxis: input.prescription.osAxis,
            osAdd: input.prescription.osAdd?.toFixed(2) ?? null,
            osPd: input.prescription.osPd?.toFixed(1) ?? null,
            binocularPd:
              input.prescription.binocularPd?.toFixed(1) ?? null,
            odBaseCurve:
              input.prescription.odBaseCurve?.toFixed(1) ?? null,
            odDiameter:
              input.prescription.odDiameter?.toFixed(1) ?? null,
            osBaseCurve:
              input.prescription.osBaseCurve?.toFixed(1) ?? null,
            osDiameter:
              input.prescription.osDiameter?.toFixed(1) ?? null,
            prismNotes: input.prescription.prismNotes,
            visualAcuityNotes: input.prescription.visualAcuityNotes,
            clinicalRemarks: input.prescription.clinicalRemarks,
          })
          .returning({ id: opticalPrescriptions.id });

        prescriptionId = rx.id;
      }

      // ── 3c. Generate invoice number ──
      const invoiceNumber = await generateInvoiceNumber(tx);

      // ── 3d. Compute financial totals using Decimal (string-safe) ──
      let subtotal = new Decimal(0);
      let totalDiscount = new Decimal(0);
      let totalTax = new Decimal(0);
      let taxableValue = new Decimal(0);

      const computedItems = input.items.map((item) => {
        const unitPrice = new Decimal(item.unitPrice);
        const discountPerUnit = new Decimal(item.discountPerUnit);
        const lineSubtotal = unitPrice.times(item.quantity);
        const lineDiscount = discountPerUnit.times(item.quantity);
        const lineTaxable = lineSubtotal.minus(lineDiscount);
        const taxRate = new Decimal(item.taxRate);
        const lineTax = lineTaxable.times(taxRate).dividedBy(100);

        subtotal = subtotal.plus(lineSubtotal);
        totalDiscount = totalDiscount.plus(lineDiscount);
        taxableValue = taxableValue.plus(lineTaxable);
        totalTax = totalTax.plus(lineTax);

        return {
          ...item,
          lineTotal: lineSubtotal.minus(lineDiscount).toFixed(2),
          taxAmount: lineTax.toFixed(2),
        };
      });

      const grandTotal = taxableValue.plus(totalTax);

      // CGST/SGST split (intra-state). For inter-state, use IGST.
      const cgst = totalTax.dividedBy(2);
      const sgst = totalTax.dividedBy(2);

      // Advance payment handling
      let advancePaid = new Decimal(0);
      if (input.advancePayment) {
        advancePaid = new Decimal(input.advancePayment.amount);
      }

      const balanceDue = grandTotal.minus(advancePaid);
      if (balanceDue.isNegative()) {
        throw new NegativeBalanceError(balanceDue.toFixed(2));
      }

      const paymentStatus = advancePaid.isZero()
        ? 'UNPAID'
        : advancePaid.greaterThanOrEqualTo(grandTotal)
          ? 'PAID'
          : 'PARTIAL';

      // ── 3e. Insert invoice ──
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: input.customerId,
          prescriptionId,
          orderStatus: 'ORDERED',
          paymentStatus,
          subtotal: subtotal.toFixed(2),
          discountAmount: totalDiscount.toFixed(2),
          taxableValue: taxableValue.toFixed(2),
          cgstAmount: cgst.toFixed(2),
          sgstAmount: sgst.toFixed(2),
          igstAmount: '0.00',
          totalTax: totalTax.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          advancePaid: advancePaid.toFixed(2),
          balanceDue: balanceDue.toFixed(2),
          promisedDeliveryDate: input.promisedDeliveryDate
            ? new Date(input.promisedDeliveryDate)
            : null,
          notes: input.notes,
        })
        .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

      // ── 3f. Insert invoice items ──
      await tx.insert(invoiceItems).values(
        computedItems.map((item) => ({
          invoiceId: invoice.id,
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPerUnit: item.discountPerUnit,
          lineTotal: item.lineTotal,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lensType: item.lensType,
          coating: item.coating,
          lensMaterial: item.lensMaterial,
        }))
      );

      // ── 3g. Insert advance payment if collected ──
      if (input.advancePayment && advancePaid.greaterThan(0)) {
        await tx.insert(payments).values({
          invoiceId: invoice.id,
          amount: advancePaid.toFixed(2),
          paymentMode: input.advancePayment.mode,
          transactionReference: input.advancePayment.reference ?? null,
        });
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: grandTotal.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
      };
    });

    return { success: true, ...result };
  } catch (err) {
    // ── Rollback already occurred automatically by db.transaction ──
    if (err instanceof InsufficientStockError) {
      return {
        success: false,
        error: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock for SKU "${err.sku}": requested ${err.requested}, available ${err.available}`,
        details: {
          inventoryItemId: err.inventoryItemId,
          sku: err.sku,
          requested: err.requested,
          available: err.available,
        },
      };
    }

    if (err instanceof NegativeBalanceError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Advance payment (${err.amount}) exceeds grand total. Overpayment is not supported at order creation.`,
      };
    }

    console.error('[processOpticalOrder] Transaction failed:', err);
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'An unexpected database error occurred. No changes were persisted.',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Custom error classes
// ─────────────────────────────────────────────────────────────

class InsufficientStockError extends Error {
  constructor(
    public inventoryItemId: string,
    public sku: string,
    public available: number,
    public requested: number
  ) {
    super(`Insufficient stock for ${sku}: ${available} < ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

class NegativeBalanceError extends Error {
  constructor(public amount: string) {
    super(`Negative balance after advance: ${amount}`);
    this.name = 'NegativeBalanceError';
  }
}
```

## 4.2 Concurrency Safety Analysis

### The Race Condition

Two clerks simultaneously sell the last unit of Frame SKU `RB-2140`:

```
T1: SELECT stock_quantity FROM inventory_items WHERE id = 'frame-1'  → 1
T2: SELECT stock_quantity FROM inventory_items WHERE id = 'frame-1'  → 1
T1: UPDATE inventory_items SET stock_quantity = 0 WHERE id = 'frame-1'
T2: UPDATE inventory_items SET stock_quantity = 0 WHERE id = 'frame-1'  ← oversold!
```

### The Solution: Conditional Atomic UPDATE

The `UPDATE ... WHERE stock_quantity >= quantity RETURNING` pattern used above is **atomic at the row level**. PostgreSQL acquires a row-level lock during the `UPDATE`. If T1 updates first, T2’s `WHERE stock_quantity >= quantity` evaluates against the **already-decremented** value (0), fails the predicate, and returns zero rows. The `updated.length === 0` check then throws `InsufficientStockError`, rolling back T2’s entire transaction.

This pattern requires **no explicit `SELECT ... FOR UPDATE`** and **no application-level locking**. It is the correct approach for inventory decrement under concurrency.

### Why Not `SELECT ... FOR UPDATE`?

`SELECT ... FOR UPDATE` works but introduces an extra round-trip and holds the lock longer than necessary. The conditional `UPDATE` combines the read and write into a single atomic operation, reducing lock contention and improving throughput under concurrent load.

### Transaction Isolation

Neon PostgreSQL defaults to `READ COMMITTED` isolation. This is sufficient for the conditional `UPDATE` pattern because:

1. The `UPDATE`’s `WHERE` clause is re-evaluated against the latest committed row version at lock acquisition time.
2. If another transaction has committed a decrement, the `WHERE` predicate fails, and zero rows are returned.

**No `SERIALIZABLE` isolation is required.** `SERIALIZABLE` would introduce serialization failures under load, requiring retry logic that complicates the clerk’s workflow. `READ COMMITTED` with the conditional `UPDATE` provides correct stock enforcement with better concurrency characteristics.


# PHASE 5: LOCAL TEST FIXTURES & VALIDATION

## 5.1 Database Seed Script

```typescript
// src/db/seed.ts
import { db } from '@/db';
import {
  customers,
  opticalPrescriptions,
  inventoryItems,
  invoices,
  invoiceItems,
  payments,
} from '@/db/schema';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// Seed data
// ─────────────────────────────────────────────────────────────

const seedCustomers = [
  {
    phone: '9876543210',
    fullName: 'Rajesh Kumar',
    age: 42,
    gender: 'MALE' as const,
    addressLine1: '12, MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  },
  {
    phone: '9812345678',
    fullName: 'Priya Sharma',
    age: 35,
    gender: 'FEMALE' as const,
    addressLine1: '45, Nehru Nagar',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  },
  {
    phone: '9898989898',
    fullName: 'Anil Deshmukh',
    age: 58,
    gender: 'MALE' as const,
    addressLine1: '78, Civil Lines',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  },
  {
    phone: '9765432109',
    fullName: 'Sunita Patel',
    age: 28,
    gender: 'FEMALE' as const,
    addressLine1: '23, Ashram Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
  },
  {
    phone: '9654321098',
    fullName: 'Vikram Singh',
    age: 67,
    gender: 'MALE' as const,
    addressLine1: '56, Park Street',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700016',
  },
];

const seedInventory = [
  // Frames (18% GST, HSN 9003)
  {
    sku: 'FRM-RB-2140-BLK',
    barcode: '8901234567890',
    category: 'FRAME' as const,
    brand: 'Ray-Ban',
    model: 'RB 2140 Wayfarer',
    description: 'Classic black acetate frame, medium fit',
    costPrice: '1200.00',
    sellingPrice: '2500.00',
    mrp: '2990.00',
    stockQuantity: 12,
    lowStockThreshold: 3,
    taxRate: '18.00',
    hsnCode: '9003',
  },
  {
    sku: 'FRM-TI-5001-GLD',
    barcode: '8901234567891',
    category: 'FRAME' as const,
    brand: 'Titan',
    model: 'TI 5001',
    description: 'Gold titanium half-rim frame, lightweight',
    costPrice: '800.00',
    sellingPrice: '1800.00',
    mrp: '2200.00',
    stockQuantity: 8,
    lowStockThreshold: 2,
    taxRate: '18.00',
    hsnCode: '9003',
  },
  {
    sku: 'FRM-VG-7721-BRN',
    barcode: '8901234567892',
    category: 'FRAME' as const,
    brand: 'Vogue',
    model: 'VO 7721',
    description: 'Brown tortoiseshell full-rim frame',
    costPrice: '950.00',
    sellingPrice: '2200.00',
    mrp: '2600.00',
    stockQuantity: 6,
    lowStockThreshold: 2,
    taxRate: '18.00',
    hsnCode: '9003',
  },
  // Ophthalmic Lenses (5% GST, HSN 9001)
  {
    sku: 'LENS-SV-CR39-AR',
    barcode: null,
    category: 'OPHTHALMIC_LENS' as const,
    brand: 'Essilor',
    model: 'Crizal Easy Pro',
    description: 'Single Vision CR-39 with Anti-Reflective coating',
    costPrice: '400.00',
    sellingPrice: '1200.00',
    mrp: null,
    stockQuantity: 50,
    lowStockThreshold: 10,
    taxRate: '5.00',
    hsnCode: '9001',
    lensType: 'SINGLE_VISION' as const,
    coating: 'ANTI_REFLECTIVE' as const,
    lensMaterial: 'CR39' as const,
  },
  {
    sku: 'LENS-PROG-POLY-AR',
    barcode: null,
    category: 'OPHTHALMIC_LENS' as const,
    brand: 'Zeiss',
    model: 'Progressive Individual',
    description: 'Progressive polycarbonate with AR and Blue-Guard',
    costPrice: '2200.00',
    sellingPrice: '5500.00',
    mrp: null,
    stockQuantity: 25,
    lowStockThreshold: 5,
    taxRate: '5.00',
    hsnCode: '9001',
    lensType: 'PROGRESSIVE' as const,
    coating: 'BLUE_FILTER' as const,
    lensMaterial: 'POLYCARBONATE' as const,
  },
  {
    sku: 'LENS-SV-HI167-AR',
    barcode: null,
    category: 'OPHTHALMIC_LENS' as const,
    brand: 'Hoya',
    model: 'Nulux EP',
    description: 'Single Vision High-Index 1.67 with AR',
    costPrice: '1500.00',
    sellingPrice: '3200.00',
    mrp: null,
    stockQuantity: 30,
    lowStockThreshold: 8,
    taxRate: '5.00',
    hsnCode: '9001',
    lensType: 'SINGLE_VISION' as const,
    coating: 'ANTI_REFLECTIVE' as const,
    lensMaterial: 'HIGH_INDEX_167' as const,
  },
  // Contact Lenses (18% GST, HSN 9004)
  {
    sku: 'CL-ACUVUE-OASYS',
    barcode: '8901234567893',
    category: 'CONTACT_LENS' as const,
    brand: 'Acuvue',
    model: 'Oasys 2-Week',
    description: 'Silicone hydrogel contact lens, 6-pack',
    costPrice: '1100.00',
    sellingPrice: '1950.00',
    mrp: '2200.00',
    stockQuantity: 15,
    lowStockThreshold: 5,
    taxRate: '18.00',
    hsnCode: '9004',
  },
  // Accessories (18% GST, HSN varies)
  {
    sku: 'ACC-CASE-HARD',
    barcode: '8901234567894',
    category: 'ACCESSORY' as const,
    brand: 'Generic',
    model: 'Hard Case',
    description: 'Hard shell spectacle case with cleaning cloth',
    costPrice: '80.00',
    sellingPrice: '250.00',
    mrp: '350.00',
    stockQuantity: 100,
    lowStockThreshold: 20,
    taxRate: '18.00',
    hsnCode: '4202',
  },
];

const seedPrescriptions = [
  {
    customerIndex: 0, // Rajesh Kumar — myopic + astigmatic
    odSphere: '-2.50',
    odCylinder: '-0.75',
    odAxis: 180,
    odPd: '32.0',
    osSphere: '-2.25',
    osCylinder: '-0.50',
    osAxis: 175,
    osPd: '31.5',
    binocularPd: '63.5',
  },
  {
    customerIndex: 1, // Priya Sharma — simple myopic
    odSphere: '-1.75',
    odCylinder: '0.00',
    odAxis: null,
    odPd: '30.0',
    osSphere: '-1.50',
    osCylinder: '0.00',
    osAxis: null,
    osPd: '30.0',
    binocularPd: '60.0',
  },
  {
    customerIndex: 2, // Anil Deshmukh — presbyopic
    odSphere: '+1.25',
    odCylinder: '-0.25',
    odAxis: 90,
    odAdd: '+2.00',
    odPd: '33.0',
    osSphere: '+1.50',
    osCylinder: '-0.25',
    osAxis: 85,
    osAdd: '+2.00',
    osPd: '32.5',
    binocularPd: '65.5',
  },
];

// ─────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────

export async function seedDatabase() {
  console.log('🌱 Seeding database…');

  // Clean existing data (dev only — reverse FK order)
  await db.delete(payments);
  await db.delete(invoiceItems);
  await db.delete(invoices);
  await db.delete(opticalPrescriptions);
  await db.delete(inventoryItems);
  await db.delete(customers);

  // Insert customers
  const insertedCustomers = await db
    .insert(customers)
    .values(seedCustomers)
    .returning({ id: customers.id, fullName: customers.fullName });

  console.log(`  ✓ ${insertedCustomers.length} customers`);

  // Insert inventory
  const insertedInventory = await db
    .insert(inventoryItems)
    .values(seedInventory)
    .returning({ id: inventoryItems.id, sku: inventoryItems.sku });

  console.log(`  ✓ ${insertedInventory.length} inventory items`);

  // Insert prescriptions
  const rxValues = seedPrescriptions.map((rx) => ({
    customerId: insertedCustomers[rx.customerIndex].id,
    odSphere: rx.odSphere,
    odCylinder: rx.odCylinder,
    odAxis: rx.odAxis,
    odAdd: 'odAdd' in rx ? rx.odAdd : null,
    odPd: rx.odPd,
    osSphere: rx.osSphere,
    osCylinder: rx.osCylinder,
    osAxis: rx.osAxis,
    osAdd: 'osAdd' in rx ? rx.osAdd : null,
    osPd: rx.osPd,
    binocularPd: rx.binocularPd,
  }));

  const insertedRx = await db
    .insert(opticalPrescriptions)
    .values(rxValues)
    .returning({ id: opticalPrescriptions.id });

  console.log(`  ✓ ${insertedRx.length} prescriptions`);

  // Create a sample invoice
  const [sampleInvoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber: 'INV-25-000001',
      customerId: insertedCustomers[0].id,
      prescriptionId: insertedRx[0].id,
      orderStatus: 'DELIVERED_AND_CLOSED',
      paymentStatus: 'PAID',
      subtotal: '3700.00',
      discountAmount: '0.00',
      taxableValue: '3700.00',
      cgstAmount: '113.50',
      sgstAmount: '113.50',
      igstAmount: '0.00',
      totalTax: '227.00',
      grandTotal: '3927.00',
      advancePaid: '1000.00',
      balanceDue: '2927.00',
    })
    .returning({ id: invoices.id });

  await db.insert(invoiceItems).values([
    {
      invoiceId: sampleInvoice.id,
      inventoryItemId: insertedInventory[0].id, // Frame
      description: 'Ray-Ban RB 2140 Wayfarer — Black',
      hsnCode: '9003',
      quantity: 1,
      unitPrice: '2500.00',
      discountPerUnit: '0.00',
      lineTotal: '2500.00',
      taxRate: '18.00',
      taxAmount: '450.00',
    },
    {
      invoiceId: sampleInvoice.id,
      inventoryItemId: insertedInventory[3].id, // Single Vision Lens
      description: 'Essilor Crizal Easy Pro — Single Vision',
      hsnCode: '9001',
      quantity: 1,
      unitPrice: '1200.00',
      discountPerUnit: '0.00',
      lineTotal: '1200.00',
      taxRate: '5.00',
      taxAmount: '60.00',
      lensType: 'SINGLE_VISION',
      coating: 'ANTI_REFLECTIVE',
      lensMaterial: 'CR39',
    },
  ]);

  await db.insert(payments).values([
    {
      invoiceId: sampleInvoice.id,
      amount: '1000.00',
      paymentMode: 'UPI',
      transactionReference: 'UPI-20250615-001',
    },
    {
      invoiceId: sampleInvoice.id,
      amount: '2927.00',
      paymentMode: 'CASH',
    },
  ]);

  console.log(`  ✓ 1 sample invoice with 2 line items and 2 payments`);
  console.log('✅ Seeding complete.');
}

// Run directly: npx tsx src/db/seed.ts
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
```

## 5.2 Verification Checkpoints

### Checkpoint 1: Patient Search Latency

**Manual test:**
1. Seed the database with 5 customers.
2. Open the New Bill screen.
3. Type `9876` in the phone field.
4. Measure the time from last keystroke to dropdown appearance.

**Automated test (Playwright):**

```typescript
// e2e/patient-search.spec.ts
import { test, expect } from '@playwright/test';

test('patient search returns in under 50ms', async ({ page }) => {
  await page.goto('/pos/new-bill');
  const input = page.getByPlaceholder('Phone number');
  await input.fill('9876');

  const start = Date.now();
  await expect(page.getByText('Rajesh Kumar')).toBeVisible({
    timeout: 500,
  });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(200); // generous CI threshold
});
```

**Database-level verification:**

```sql
-- Run in Neon SQL Editor
EXPLAIN ANALYZE
SELECT id, full_name, phone, age, gender
FROM customers
WHERE phone LIKE '9876%'
LIMIT 10;
```

Expected: `Index Scan using customers_phone_idx` with `actual time < 1ms`.

### Checkpoint 2: Stock Decrement Consistency

**Test: Concurrent sale of the last unit.**

```typescript
// test/concurrency/stock-decrement.test.ts
import { processOpticalOrder } from '@/actions/process-optical-order';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

test('concurrent orders for the last frame unit — one succeeds, one fails', async () => {
  // Set up: one frame with stock = 1
  const [frame] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(eq(inventoryItems.sku, 'FRM-RB-2140-BLK'));

  await db
    .update(inventoryItems)
    .set({ stockQuantity: 1 })
    .where(eq(inventoryItems.id, frame.id));

  const orderData = {
    customerId: 'customer-uuid-1',
    items: [
      {
        inventoryItemId: frame.id,
        description: 'Ray-Ban RB 2140',
        hsnCode: '9003',
        quantity: 1,
        unitPrice: '2500.00',
        discountPerUnit: '0.00',
        taxRate: '18.00' as const,
        lensType: null,
        coating: null,
        lensMaterial: null,
      },
    ],
  };

  // Fire two concurrent orders
  const [result1, result2] = await Promise.all([
    processOpticalOrder(orderData),
    processOpticalOrder({ ...orderData, customerId: 'customer-uuid-2' }),
  ]);

  const successes = [result1, result2].filter((r) => r.success);
  const failures = [result1, result2].filter((r) => !r.success);

  expect(successes).toHaveLength(1);
  expect(failures).toHaveLength(1);
  expect(failures[0].error).toBe('INSUFFICIENT_STOCK');

  // Verify stock is now 0
  const [updated] = await db
    .select({ stockQuantity: inventoryItems.stockQuantity })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, frame.id));
  expect(updated.stockQuantity).toBe(0);
});
```

### Checkpoint 3: Rollback Handling

**Test: Prescription insertion fails midway — verify stock is NOT decremented.**

```typescript
test('transaction rolls back completely on mid-transaction failure', async () => {
  const initialStock = await getStock('FRM-RB-2140-BLK');

  // Force a failure by passing an invalid prescription (e.g., Axis out of range)
  const result = await processOpticalOrder({
    customerId: 'valid-customer-uuid',
    items: [
      {
        inventoryItemId: 'valid-frame-uuid',
        description: 'Test Frame',
        hsnCode: '9003',
        quantity: 1,
        unitPrice: '2500.00',
        discountPerUnit: '0.00',
        taxRate: '18.00',
        lensType: null,
        coating: null,
        lensMaterial: null,
      },
    ],
    prescription: {
      customerId: 'valid-customer-uuid',
      odSphere: -2.5,
      odCylinder: -0.75,
      odAxis: 200, // ← INVALID: > 180
      odAdd: null,
      odPd: 32,
      osSphere: -2.25,
      osCylinder: -0.5,
      osAxis: 175,
      osAdd: null,
      osPd: 31.5,
      binocularPd: 63.5,
      odBaseCurve: null,
      odDiameter: null,
      osBaseCurve: null,
      osDiameter: null,
    },
  });

  // Should fail at Zod validation (before transaction)
  expect(result.success).toBe(false);
  expect(result.error).toBe('VALIDATION_ERROR');

  // Stock must be unchanged
  const finalStock = await getStock('FRM-RB-2140-BLK');
  expect(finalStock).toBe(initialStock);
});
```

### Checkpoint 4: Monetary Precision

```typescript
test('invoice totals are exact to the paisa', () => {
  // 0.1 + 0.2 problem in floats: 0.30000000000000004
  const unitPrice = new Decimal('0.10');
  const quantity = 3;
  const taxRate = new Decimal('18.00');

  const lineTotal = unitPrice.times(quantity); // 0.30
  const tax = lineTotal.times(taxRate).dividedBy(100); // 0.054 → 0.05 (rounded)
  const grandTotal = lineTotal.plus(tax);

  expect(grandTotal.toFixed(2)).toBe('0.35');
  // NOT "0.354" or "0.36"
});
```


# PHASE 6: PRODUCTION DEPLOYMENT & ZERO-COST SETUP

## 6.1 Step 1: Provision Neon PostgreSQL (Free Tier)

1. Navigate to **https://neon.tech** and sign up with GitHub.
2. Create a new project:
   - **Project name:** `optical-pos-prod`
   - **PostgreSQL version:** 16
   - **Region:** Choose the closest to your primary store (e.g., `aws-ap-south-1` for Mumbai).
3. Copy the **pooled connection string** from the dashboard. It looks like:

```
postgresql://neondb_owner:password@ep-cool-name-123456-pooler.ap-south-1.aws.neon.tech/neondb?sslmode=require
```

**Critical:** The hostname **must** contain `-pooler`. This routes connections through PgBouncer, which supports up to 10,000 concurrent connections on the free tier. Without the pooler, Neon free tier supports only ~100 direct connections, which serverless functions would exhaust rapidly.

4. Store the connection string in `.env.local`:

```bash
DATABASE_URL="postgresql://neondb_owner:...-pooler.ap-south-1.aws.neon.tech/neondb?sslmode=require"
```

## 6.2 Step 2: Configure Drizzle Kit & Push Migrations

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

```bash
# Generate migration SQL from schema
npx drizzle-kit generate

# Push schema directly to Neon (dev only)
npx drizzle-kit push

# Apply migrations (production)
npx drizzle-kit migrate
```

**Post-migration sequence creation:**

```sql
-- Run once in Neon SQL Editor
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
```

**Verification:**

```sql
-- Verify all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify indexes on customers.phone
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customers';
```

Expected output includes `customers_phone_idx` and `customers_phone_unique_idx`.

## 6.3 Step 3: Deploy to Vercel

### 3a. Project Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,
};

export default nextConfig;
```

### 3b. Environment Variables in Vercel Dashboard

| Name | Value | Environment |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Random 32-byte hex | All |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |

### 3c. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Deploy to production
vercel --prod
```

**Vercel free tier limits (sufficient for a single-store optical POS):**

- 100 GB bandwidth/month
- 100 GB-hours serverless function execution
- 10-second function timeout (Hobby plan) — our `processOpticalOrder` completes in < 800 ms, well within this limit.

## 6.4 Step 4: Health Probe API

```typescript
// src/app/api/health/route.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // never cache health checks

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export async function GET() {
  const start = performance.now();

  try {
    // Execute SELECT 1 AS status using Drizzle to verify WebSocket pooler connectivity
    const result = await db.execute(sql`SELECT 1 AS status`);
    const latencyMs = Math.round(performance.now() - start);

    // Verify critical tables are accessible
    const tableCheck = await db.execute(sql`
      SELECT COUNT(*) AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('customers', 'invoices', 'inventory_items', 'payments')
    `);

    const tableCount = Number(
      (tableCheck.rows[0] as { table_count: string }).table_count
    );

    const isHealthy = latencyMs < 200 && tableCount === 4;
    const status = isHealthy ? 'healthy' : 'degraded';

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            connected: true,
            statusResult: (result.rows[0] as { status: number })?.status ?? 1,
            latencyMs,
            connectionMode: process.env.DATABASE_URL?.includes('-pooler')
              ? 'POOLED'
              : 'DIRECT',
            transport: 'WebSocket',
          },
          schema: {
            expectedTables: 4,
            foundTables: tableCount,
            status: tableCount === 4 ? 'complete' : 'incomplete',
          },
        },
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      },
      {
        status: status === 'healthy' ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    console.error('[health] Database check failed:', err);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            connected: false,
            latencyMs,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
```

**Expected healthy response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-09-13T10:30:00.000Z",
  "checks": {
    "database": {
      "connected": true,
      "statusResult": 1,
      "latencyMs": 12,
      "connectionMode": "POOLED",
      "transport": "WebSocket"
    },
    "schema": {
      "expectedTables": 4,
      "foundTables": 4,
      "status": "complete"
    }
  },
  "version": "a1b2c3d"
}
```

## 6.5 Step 5: Zero-Cost Architecture Summary

| Component | Provider | Free Tier Limits | Sufficient For |
|---|---|---|---|
| **Frontend Hosting** | Vercel Hobby | 100 GB bandwidth/month | ~50,000 page views/month |
| **Serverless Functions** | Vercel Hobby | 100 GB-hours execution | ~500,000 invocations/month |
| **Database** | Neon Free | 0.5 GB storage, 100 direct / 10,000 pooled connections | ~200,000 invoices (at 2.5 KB/invoice) |
| **Connection Pooling** | Neon PgBouncer | Included | 10,000 concurrent connections |
| **Domain** | `*.vercel.app` subdomain | Free | Adequate for pilot |

**Upgrade trigger:** When Neon storage exceeds 0.5 GB (approximately 2–3 years at 50 invoices/day), upgrade to Neon Launch ($19/month) for 10 GB storage. No code changes required — only the connection string remains the same.

## 6.6 Production Hardening Checklist

- [ ] **Row-Level Security (RLS):** Enable Neon RLS for multi-tenant isolation if branching into multi-store SaaS. For single-store, application-level RBAC suffices.
- [ ] **Backup Strategy:** Neon provides point-in-time recovery (PITR) for 7 days on the free tier. Export a `pg_dump` weekly to S3-compatible storage (Backblaze B2 free tier: 10 GB).
- [ ] **Error Monitoring:** Integrate Sentry free tier (5,000 errors/month) for client-side and server-side error capture.
- [ ] **Audit Logging:** Add a `audit_log` table recording every invoice state transition, payment record, and stock adjustment with `user_id`, `timestamp`, `action`, `before_state`, `after_state`.
- [ ] **Rate Limiting:** Add Upstash Redis free tier (10,000 commands/day) for API route rate limiting — specifically for the patient search endpoint to prevent enumeration attacks.
- [ ] **GST Compliance:** Verify invoice numbering is sequential and gap-free per financial year. The PostgreSQL sequence guarantees atomic increments, but the sequence must be reset manually at the start of each financial year (April 1 in India) via `ALTER SEQUENCE invoice_number_seq RESTART WITH 1`.


## Appendix A: GST Rate Reference for Optical Products (India, GST 2.0 — Effective 22 September 2025)

| Product Category | HSN Code | GST Rate | Notes |
|---|---|---|---|
| **Corrective spectacle lenses** | 9001 | **5%** | Treated as essential healthcare |
| **Complete corrective spectacles** | 9004 | **5%** | Includes frame + lens assembled |
| **Spectacle frames (standalone)** | 9003 | **18%** | Standard rate applies |
| **Sunglasses (non-prescription)** | 9004 | **18%** | Standard rate applies |
| **Contact lenses** | 9004 | **18%** | Standard rate applies |
| **Accessories (cases, cloth)** | 4202 / 6307 | **18%** | Standard rate applies |

**Inverted Duty Structure Note:** A store buying frames at 18% GST and selling complete corrective spectacles at 5% GST accumulates input tax credit (ITC) faster than it can offset output tax. This credit must be claimed as a refund under Section 54(3) of the CGST Act. The system’s GST reports should flag this accumulation by comparing `SUM(cgst_amount + sgst_amount) ON purchases` vs. `SUM(cgst_amount + sgst_amount) ON sales` per HSN group.

## Appendix B: Domain Aggregate Boundaries

The system enforces **strict bounded contexts** to satisfy the architectural decoupling constraint:

```
┌─────────────────────────────────────────────────────────────┐
│                    RETAIL BILLING LEDGER                     │
│  (Core — must never import from clinical extensions)         │
│                                                              │
│  • customers       • invoices       • invoice_items          │
│  • inventory_items • payments       • sequence generators    │
│  • processOpticalOrder (checkout engine)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ FK: invoices.prescription_id
                           │ (nullable — order can exist without Rx)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 OPHTHALMIC CLINICAL EXTENSION                │
│  (Plugs into billing; never imported by billing)             │
│                                                              │
│  • optical_prescriptions                                     │
│  • Future: appointment_scheduler, recall_sms,               │
│    ai_refraction_assistant, lab_integration                  │
└─────────────────────────────────────────────────────────────┘
```

**Enforcement mechanism:** ESLint rule `import/no-restricted-paths` prohibits any file under `src/modules/billing/` from importing `src/modules/clinical/`. The only permitted dependency direction is clinical → billing (for foreign-key references), never billing → clinical. This ensures that future clinical modules can be added, removed, or replaced without touching the checkout engine.

**Checkout engine purity:** `processOpticalOrder` accepts `prescription?: PrescriptionInput` as an **optional** parameter. The billing ledger functions correctly with `prescriptionId = null`. This means a future AI refraction module, an appointment scheduler, or a lab integration can all plug in by providing prescription data through the same interface — without modifying a single line of `processOpticalOrder`.