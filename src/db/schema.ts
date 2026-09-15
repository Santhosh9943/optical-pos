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
  branchId: uuid('branch_id').references(() => branches.id, {
    onDelete: 'set null',
  }),
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
  },
  (table) => [index("session_userId_idx").on(table.userId)],
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

