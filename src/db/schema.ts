// src/db/schema.ts
import {
  pgTable,
  pgEnum,
  pgSequence,
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
// SEQUENCES
// ─────────────────────────────────────────────────────────────

export const invoiceNumberSeq = pgSequence('invoice_number_seq', { startWith: 1 });

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
