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
  jsonb,
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
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const paymentStatusEnum = pgEnum('payment_status', [
  'UNPAID',
  'PARTIAL',
  'PAID',
]);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

export const paymentModeEnum = pgEnum('payment_mode', [
  'CASH',
  'UPI',
  'CARD',
  'CREDIT',
]);
export type PaymentMode = (typeof paymentModeEnum.enumValues)[number];

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

export const receiptTypeEnum = pgEnum('receipt_type', [
  'THERMAL_80MM',
  'A4_INVOICE',
]);
export type ReceiptType = (typeof receiptTypeEnum.enumValues)[number];

// ─────────────────────────────────────────────────────────────
// SEQUENCES
// ─────────────────────────────────────────────────────────────

export const invoiceNumberSeq = pgSequence('invoice_number_seq', { startWith: 1 });

// ─────────────────────────────────────────────────────────────
// ORGANIZATIONS (SAAS TENANTS)
// ─────────────────────────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  planId: varchar('plan_id', { length: 50 }).notNull().default('starter'),
  subscriptionStatus: varchar('subscription_status', { length: 50 }).notNull().default('active'),
  subscriptionPeriod: varchar('subscription_period', { length: 20 }).default('monthly'),
  subscriptionEndsAt: timestamp('subscription_ends_at', { withTimezone: true }),
  hasCompletedOnboarding: boolean('has_completed_onboarding').notNull().default(false),
  orgCode: varchar('org_code', { length: 50 }).unique(),
  orgNumber: integer('org_number').unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// ─────────────────────────────────────────────────────────────
// SAAS SUBSCRIPTIONS & RAZORPAY AUDIT LOG
// ─────────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planId: varchar('plan_id', { length: 50 }).notNull(),
    billingCycle: varchar('billing_cycle', { length: 20 }).notNull().default('monthly'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    razorpayOrderId: varchar('razorpay_order_id', { length: 100 }),
    razorpayPaymentId: varchar('razorpay_payment_id', { length: 100 }),
    razorpaySignature: varchar('razorpay_signature', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('created'), // 'created' | 'paid' | 'failed' | 'canceled'
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('subscriptions_org_idx').on(table.organizationId),
    index('subscriptions_order_idx').on(table.razorpayOrderId),
    index('subscriptions_payment_idx').on(table.razorpayPaymentId),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

// ─────────────────────────────────────────────────────────────
// BRANCHES (PHYSICAL STORES)
// ─────────────────────────────────────────────────────────────

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    organizationIdx: index('branches_organization_idx').on(table.organizationId),
  })
);

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;

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
    primaryCustomerId: uuid('primary_customer_id'),
    relationType: varchar('relation_type', { length: 50 }).notNull().default('Self'),
    advanceBalance: numeric('advance_balance', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0.00'),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
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
    primaryCustomerIdx: index('customers_primary_customer_idx').on(
      table.primaryCustomerId
    ),
    orgIdx: index('customers_organization_idx').on(table.organizationId),
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
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    // Custom Merchant Taxonomy & Tax Exemption
    customCategory: varchar('custom_category', { length: 100 }),
    isGstExempt: boolean('is_gst_exempt').notNull().default(false),
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
    orgIdx: index('inventory_organization_idx').on(table.organizationId),
    branchIdx: index('inventory_branch_idx').on(table.branchId),
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
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
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
    orgIdx: index('invoice_organization_idx').on(table.organizationId),
    branchIdx: index('invoice_branch_idx').on(table.branchId),
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
    // Family & Clinical mapping
    patientId: uuid('patient_id').references(() => customers.id, { onDelete: 'set null' }),
    prescriptionId: uuid('prescription_id').references(() => opticalPrescriptions.id, { onDelete: 'set null' }),
    isCustomerOwnFrame: boolean('is_customer_own_frame').notNull().default(false),
    fittingNote: text('fitting_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    invoiceIdx: index('invoice_item_invoice_idx').on(table.invoiceId),
    inventoryIdx: index('invoice_item_inventory_idx').on(
      table.inventoryItemId
    ),
    patientIdx: index('invoice_item_patient_idx').on(table.patientId),
    prescriptionIdx: index('invoice_item_prescription_idx').on(table.prescriptionId),
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
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
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
    orgIdx: index('payment_organization_idx').on(table.organizationId),
    branchIdx: index('payment_branch_idx').on(table.branchId),
  })
);

// ─────────────────────────────────────────────────────────────
// STORE PROFILE (SINGLETON CONFIGURATION)
// ─────────────────────────────────────────────────────────────

export const storeProfile = pgTable('store_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeName: varchar('store_name', { length: 200 })
    .notNull()
    .default('Santhosh Optical Center'),
  gstin: varchar('gstin', { length: 15 }),
  phone: varchar('phone', { length: 20 })
    .notNull()
    .default('+91 98765 43210'),
  address: text('address')
    .notNull()
    .default('123 Optical Plaza, MG Road, Bengaluru - 560001'),
  defaultTaxRate: numeric('default_tax_rate', {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default('18.00'),
  receiptType: receiptTypeEnum('receipt_type')
    .notNull()
    .default('THERMAL_80MM'),
  defaultPosLayout: varchar('default_pos_layout', { length: 50 })
    .notNull()
    .default('adaptive'),
  enableGst: boolean('enable_gst').notNull().default(true),
  allowNegativeStock: boolean('allow_negative_stock').notNull().default(false),
  branchId: uuid('branch_id').references(() => branches.id, {
    onDelete: 'set null',
  }),
  // SMTP Email Server Configuration
  smtpHost: varchar('smtp_host', { length: 255 }).default('smtp.gmail.com'),
  smtpPort: integer('smtp_port').default(587),
  smtpSecure: boolean('smtp_secure').default(false),
  smtpUser: varchar('smtp_user', { length: 255 }),
  smtpPass: varchar('smtp_pass', { length: 255 }),
  smtpFromEmail: varchar('smtp_from_email', { length: 255 }),
  smtpFromName: varchar('smtp_from_name', { length: 255 }).default('OptixOS Eyecare'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StoreProfile = typeof storeProfile.$inferSelect;
export type NewStoreProfile = typeof storeProfile.$inferInsert;

// ─────────────────────────────────────────────────────────────
// RELATIONS (for Drizzle query API)
// ─────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  branches: many(branches),
  customers: many(customers),
  inventoryItems: many(inventoryItems),
  invoices: many(invoices),
  payments: many(payments),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [branches.organizationId],
    references: [organizations.id],
  }),
  inventoryItems: many(inventoryItems),
  invoices: many(invoices),
  payments: many(payments),
  storeProfiles: many(storeProfile),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  primaryCustomer: one(customers, {
    fields: [customers.primaryCustomerId],
    references: [customers.id],
    relationName: 'familyMembers',
  }),
  familyMembers: many(customers, { relationName: 'familyMembers' }),
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

export const inventoryItemsRelations = relations(
  inventoryItems,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [inventoryItems.organizationId],
      references: [organizations.id],
    }),
    branch: one(branches, {
      fields: [inventoryItems.branchId],
      references: [branches.id],
    }),
    invoiceItems: many(invoiceItems),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [invoices.branchId],
    references: [branches.id],
  }),
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
    patient: one(customers, {
      fields: [invoiceItems.patientId],
      references: [customers.id],
    }),
    prescription: one(opticalPrescriptions, {
      fields: [invoiceItems.prescriptionId],
      references: [opticalPrescriptions.id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [payments.branchId],
    references: [branches.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// BETTER AUTH TABLES & RELATIONS
// ─────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorMethod: text("two_factor_method").default("totp"),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(false).notNull(),
    failedVerificationCount: integer("failed_verification_count").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("two_factor_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)],
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ],
);

export const staffStoreAssignments = pgTable(
  "staff_store_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("staff"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("staff_store_assignments_org_idx").on(table.organizationId),
    index("staff_store_assignments_branch_idx").on(table.branchId),
    index("staff_store_assignments_user_idx").on(table.userId),
    uniqueIndex("staff_store_assignments_user_branch_uidx").on(
      table.userId,
      table.branchId
    ),
  ]
);

export type StaffStoreAssignment = typeof staffStoreAssignments.$inferSelect;
export type NewStaffStoreAssignment = typeof staffStoreAssignments.$inferInsert;

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  twoFactors: many(twoFactor),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// PRIVILEGED APPROVAL REQUESTS (MAKER-CHECKER GOVERNANCE)
// ─────────────────────────────────────────────────────────────

export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 50 }).notNull(), // 'delete_organization' | 'delete_branch' | 'purge_data' | 'system_config'
    targetId: text('target_id').notNull(),
    targetName: varchar('target_name', { length: 255 }).notNull(),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requesterEmail: varchar('requester_email', { length: 255 }).notNull(),
    requesterName: varchar('requester_name', { length: 255 }).notNull(),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 30 }).default('pending').notNull(), // 'pending' | 'approved' | 'rejected'
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    organizationId: uuid('organization_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('approval_status_idx').on(table.status),
    index('approval_requester_idx').on(table.requesterId),
  ]
);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS & ALERTING SUBSYSTEM
// ─────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id').references(() => user.id, { onDelete: 'cascade' }),
    targetRole: varchar('target_role', { length: 50 }), // 'all' | 'admin' | 'optometrist' | 'clerk' | 'super_admin'
    category: varchar('category', { length: 30 }).notNull(), // 'system' | 'alert' | 'reminder'
    type: varchar('type', { length: 100 }).notNull(), // e.g. 'inventory.low_stock'
    severity: varchar('severity', { length: 20 }).default('medium').notNull(), // 'low' | 'medium' | 'high' | 'critical'
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata'), // structured context
    actionUrl: text('action_url'), // deep link e.g. '/admin/lab-orders'
    actionLabel: varchar('action_label', { length: 50 }), // e.g. 'View Order'
    dedupKey: varchar('dedup_key', { length: 255 }), // deduplication key to throttle repetitive alerts
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_org_idx').on(table.organizationId),
    index('notifications_branch_idx').on(table.branchId),
    index('notifications_recipient_idx').on(table.recipientId),
    index('notifications_category_idx').on(table.category),
    index('notifications_created_at_idx').on(table.createdAt),
    index('notifications_dedup_idx').on(table.dedupKey),
  ]
);

export const notificationReads = pgTable(
  'notification_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('notification_user_read_unique_idx').on(table.notificationId, table.userId),
    index('notification_reads_user_idx').on(table.userId),
  ]
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    inAppAlerts: boolean('in_app_alerts').default(true).notNull(),
    emailAlerts: boolean('email_alerts').default(true).notNull(),
    browserPush: boolean('browser_push').default(false).notNull(),
    lowStockAlerts: boolean('low_stock_alerts').default(true).notNull(),
    labOrderReminders: boolean('lab_order_reminders').default(true).notNull(),
    paymentReminders: boolean('payment_reminders').default(true).notNull(),
    systemUpdates: boolean('system_updates').default(true).notNull(),
    soundEnabled: boolean('sound_enabled').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_pref_user_org_idx').on(table.userId, table.organizationId),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationRead = typeof notificationReads.$inferSelect;
export type NewNotificationRead = typeof notificationReads.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

// ─────────────────────────────────────────────────────────────
// PRODUCT TYPES & DYNAMIC WORKFLOW BUILDER
// ─────────────────────────────────────────────────────────────

export interface WorkflowStepOption {
  label: string;
  value: string;
  surcharge?: number;
  showIfParent?: string[];
  description?: string;
}

export interface WorkflowDependency {
  stepId: string;
  whenValueEquals: string | string[];
  showOptions: WorkflowStepOption[];
}

export interface WorkflowStep {
  id: string;
  stepName: string;
  inputType: 'single_select' | 'multi_select' | 'text';
  options: WorkflowStepOption[];
  dependency?: WorkflowDependency;
}

export const productTypes = pgTable(
  'product_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }).default('Glasses'),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    isSystemDefault: boolean('is_system_default').notNull().default(false),
    isEnabled: boolean('is_enabled').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    requiresFrame: boolean('requires_frame').notNull().default(false),
    requiresPrescription: boolean('requires_prescription').notNull().default(false),
    workflowSteps: jsonb('workflow_steps').$type<WorkflowStep[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_types_org_idx').on(table.organizationId),
    index('product_types_code_idx').on(table.code),
  ]
);
export type ProductType = typeof productTypes.$inferSelect;
export type NewProductType = typeof productTypes.$inferInsert;

// ─────────────────────────────────────────────────────────────
// SUPER ADMIN OTP-ONLY AUTHENTICATION
// ─────────────────────────────────────────────────────────────

export const superAdminOtps = pgTable(
  'super_admin_otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    otpHash: text('otp_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('super_admin_otps_email_idx').on(table.email),
    index('super_admin_otps_created_at_idx').on(table.createdAt),
  ]
);

export type SuperAdminOtp = typeof superAdminOtps.$inferSelect;
export type NewSuperAdminOtp = typeof superAdminOtps.$inferInsert;



