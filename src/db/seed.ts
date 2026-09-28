// src/db/seed.ts
import { db } from '@/db';
import {
  customers,
  opticalPrescriptions,
  inventoryItems,
  invoices,
  invoiceItems,
  payments,
  organizations,
  branches,
  organization,
} from '@/db/schema';
import { sql } from 'drizzle-orm';
import { redis } from '@/lib/redis';
import Decimal from 'decimal.js';
import { DEFAULT_ORG_ID, DEFAULT_BRANCH_ID } from '@/lib/auth-utils';
import { seedDefaultProductTypesForOrganization } from '@/lib/default-product-types';

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
  // Sunglasses (18% GST, HSN 9004)
  {
    sku: 'SG-RB-3025-GLD',
    barcode: '8901234567895',
    category: 'SUNGLASS' as const,
    brand: 'Ray-Ban',
    model: 'RB 3025 Aviator',
    description: 'Gold classic aviator sunglasses with UV400 polarized lenses',
    costPrice: '1800.00',
    sellingPrice: '4500.00',
    mrp: '5490.00',
    stockQuantity: 10,
    lowStockThreshold: 2,
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

  if (redis) {
    try {
      await redis.flushdb();
      console.log('  ✓ Redis cache flushed');
    } catch (e) {
      console.warn('Could not flush Redis:', e);
    }
  }

  // Clean existing data (dev only — reverse FK order)
  await db.delete(payments);
  await db.delete(invoiceItems);
  await db.delete(invoices);
  await db.delete(opticalPrescriptions);
  await db.delete(inventoryItems);
  await db.delete(customers);

  // Ensure default organization & branches exist for multi-tenant FK integrity
  const defaultOrgId = DEFAULT_ORG_ID;
  const defaultBranchId = DEFAULT_BRANCH_ID;

  await db
    .insert(organizations)
    .values({
      id: defaultOrgId,
      name: 'Santhosh Optical Center',
    })
    .onConflictDoNothing();

  await db
    .insert(organization)
    .values({
      id: defaultOrgId,
      name: 'Santhosh Optical Center',
      slug: 'santhosh-optical-center',
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(branches)
    .values([
      {
        id: defaultOrgId,
        organizationId: defaultOrgId,
        name: 'Main Flagship Store',
        isActive: true,
      },
      {
        id: defaultBranchId,
        organizationId: defaultOrgId,
        name: 'Downtown Clinic Branch',
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  // Ensure default product types & sequential workflows exist
  await seedDefaultProductTypesForOrganization(defaultOrgId);

  // Insert customers
  const insertedCustomers = await db
    .insert(customers)
    .values(
      seedCustomers.map((c) => ({
        ...c,
        organizationId: defaultOrgId,
      }))
    )
    .returning({ id: customers.id, fullName: customers.fullName });

  console.log(`  ✓ ${insertedCustomers.length} customers`);

  // Insert inventory
  const insertedInventory = await db
    .insert(inventoryItems)
    .values(
      seedInventory.map((item) => ({
        ...item,
        organizationId: defaultOrgId,
        branchId: defaultBranchId,
      }))
    )
    .returning({ id: inventoryItems.id, sku: inventoryItems.sku });

  console.log(`  ✓ ${insertedInventory.length} inventory items`);

  // Insert prescriptions
  const rxValues = seedPrescriptions.map((rx) => ({
    customerId: insertedCustomers[rx.customerIndex].id,
    odSphere: rx.odSphere,
    odCylinder: rx.odCylinder,
    odAxis: rx.odAxis,
    odAdd: 'odAdd' in rx ? (rx as { odAdd?: string }).odAdd ?? null : null,
    odPd: rx.odPd,
    osSphere: rx.osSphere,
    osCylinder: rx.osCylinder,
    osAxis: rx.osAxis,
    osAdd: 'osAdd' in rx ? (rx as { osAdd?: string }).osAdd ?? null : null,
    osPd: rx.osPd,
    binocularPd: rx.binocularPd,
  }));

  const insertedRx = await db
    .insert(opticalPrescriptions)
    .values(rxValues)
    .returning({ id: opticalPrescriptions.id });

  console.log(`  ✓ ${insertedRx.length} prescriptions`);

  // 12 Diverse Sample Invoices spanning all 4 Kanban Columns and Audit Ledger
  const now = new Date();
  const daysFromNow = (days: number) => {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  };

  interface SeedInvoiceItemDef {
    inventoryIndex: number;
    description: string;
    hsnCode: string;
    quantity: number;
    unitPrice: string;
    taxRate: string;
    lensType?: 'SINGLE_VISION' | 'PROGRESSIVE' | 'BIFOCAL';
    coating?: 'ANTI_REFLECTIVE' | 'BLUE_FILTER';
    lensMaterial?: 'CR39' | 'POLYCARBONATE' | 'HIGH_INDEX_167';
  }

  interface SeedPaymentDef {
    amount: string;
    paymentMode: 'UPI' | 'CASH' | 'CARD';
    transactionReference?: string;
  }

  interface SeedInvoiceDef {
    invoiceNumber: string;
    customerIndex: number;
    prescriptionIndex?: number;
    orderStatus:
      | 'ORDERED'
      | 'SENT_TO_LAB'
      | 'IN_FITTING'
      | 'READY_FOR_COLLECTION'
      | 'DELIVERED_AND_CLOSED';
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    promisedDeliveryDate: Date | null;
    notes: string;
    items: SeedInvoiceItemDef[];
    payments: SeedPaymentDef[];
  }

  const sampleInvoicesDef: SeedInvoiceDef[] = [
    {
      invoiceNumber: 'INV-25-000001',
      customerIndex: 0,
      prescriptionIndex: 0,
      orderStatus: 'DELIVERED_AND_CLOSED',
      paymentStatus: 'PAID',
      promisedDeliveryDate: null,
      notes: 'Initial consultation pair — Delivered & fully settled',
      items: [
        {
          inventoryIndex: 0,
          description: 'Ray-Ban RB 2140 Wayfarer — Black',
          hsnCode: '9003',
          quantity: 1,
          unitPrice: '2500.00',
          taxRate: '18.00',
        },
        {
          inventoryIndex: 3,
          description: 'Essilor Crizal Easy Pro — Single Vision',
          hsnCode: '9001',
          quantity: 1,
          unitPrice: '1200.00',
          taxRate: '5.00',
          lensType: 'SINGLE_VISION',
          coating: 'ANTI_REFLECTIVE',
          lensMaterial: 'CR39',
        },
      ],
      payments: [
        { amount: '1000.00', paymentMode: 'UPI', transactionReference: 'UPI-20250615-001' },
      ],
    },
    {
      invoiceNumber: 'INV-25-000002',
      customerIndex: 1,
      prescriptionIndex: 1,
      orderStatus: 'ORDERED',
      paymentStatus: 'PARTIAL',
      promisedDeliveryDate: daysFromNow(2),
      notes: 'Customer requested anti-glare coating',
      items: [
        {
          inventoryIndex: 1,
          description: 'Titan TI 5001 — Gold',
          hsnCode: '9003',
          quantity: 1,
          unitPrice: '1800.00',
          taxRate: '18.00',
        },
        {
          inventoryIndex: 3,
          description: 'Essilor Crizal Easy Pro — Single Vision',
          hsnCode: '9001',
          quantity: 1,
          unitPrice: '1200.00',
          taxRate: '5.00',
          lensType: 'SINGLE_VISION',
          coating: 'ANTI_REFLECTIVE',
          lensMaterial: 'CR39',
        },
      ],
      payments: [
        { amount: '1000.00', paymentMode: 'UPI', transactionReference: 'UPI-20250616-002' },
      ],
    },
    {
      invoiceNumber: 'INV-25-000003',
      customerIndex: 2,
      prescriptionIndex: 2,
      orderStatus: 'SENT_TO_LAB',
      paymentStatus: 'PARTIAL',
      promisedDeliveryDate: daysFromNow(3),
      notes: 'Progressive lenses sent to Zeiss optical lab',
      items: [
        {
          inventoryIndex: 2,
          description: 'Vogue VO 7721 — Brown Tortoise',
          hsnCode: '9003',
          quantity: 1,
          unitPrice: '2200.00',
          taxRate: '18.00',
        },
        {
          inventoryIndex: 4,
          description: 'Zeiss Progressive Individual — Blue-Guard',
          hsnCode: '9001',
          quantity: 1,
          unitPrice: '5500.00',
          taxRate: '5.00',
          lensType: 'PROGRESSIVE',
          coating: 'BLUE_FILTER',
          lensMaterial: 'POLYCARBONATE',
        },
      ],
      payments: [
        { amount: '3000.00', paymentMode: 'CARD', transactionReference: 'TXN-CC-9943' },
      ],
    },
    {
      invoiceNumber: 'INV-25-000004',
      customerIndex: 3,
      orderStatus: 'IN_FITTING',
      paymentStatus: 'PAID',
      promisedDeliveryDate: daysFromNow(1),
      notes: 'Frame fitting in progress',
      items: [
        {
          inventoryIndex: 0,
          description: 'Ray-Ban RB 2140 Wayfarer — Black',
          hsnCode: '9003',
          quantity: 1,
          unitPrice: '2500.00',
          taxRate: '18.00',
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-25-000005',
      customerIndex: 4,
      orderStatus: 'READY_FOR_COLLECTION',
      paymentStatus: 'PARTIAL',
      promisedDeliveryDate: daysFromNow(-2), // OVERDUE!
      notes: 'Awaiting customer pickup and balance collection',
      items: [
        {
          inventoryIndex: 7,
          description: 'Ray-Ban RB 3025 Aviator — Gold',
          hsnCode: '9004',
          quantity: 1,
          unitPrice: '4500.00',
          taxRate: '18.00',
        },
        {
          inventoryIndex: 8,
          description: 'Hard Case — Protective Shell',
          hsnCode: '4202',
          quantity: 1,
          unitPrice: '250.00',
          taxRate: '18.00',
        },
      ],
      payments: [
        { amount: '2000.00', paymentMode: 'CASH' },
      ],
    },
    {
      invoiceNumber: 'INV-25-000006',
      customerIndex: 0,
      prescriptionIndex: 0,
      orderStatus: 'ORDERED',
      paymentStatus: 'PAID',
      promisedDeliveryDate: daysFromNow(0), // Due today
      notes: 'Spare reading frame pair',
      items: [
        {
          inventoryIndex: 1,
          description: 'Titan TI 5001 — Gold',
          hsnCode: '9003',
          quantity: 1,
          unitPrice: '1800.00',
          taxRate: '18.00',
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-25-000007',
      customerIndex: 1,
      orderStatus: 'SENT_TO_LAB',
      paymentStatus: 'PARTIAL',
      promisedDeliveryDate: daysFromNow(4),
      notes: 'High-index 1.67 edging at lab',
      items: [
        {
          inventoryIndex: 5,
          description: 'Hoya Nulux EP — High-Index 1.67',
          hsnCode: '9001',
          quantity: 1,
          unitPrice: '3200.00',
          taxRate: '5.00',
          lensType: 'SINGLE_VISION',
          coating: 'ANTI_REFLECTIVE',
          lensMaterial: 'HIGH_INDEX_167',
        },
      ],
      payments: [
        { amount: '1500.00', paymentMode: 'UPI', transactionReference: 'UPI-20250621-007' },
      ],
    },
    {
      invoiceNumber: 'INV-25-000008',
      customerIndex: 2,
      orderStatus: 'IN_FITTING',
      paymentStatus: 'PARTIAL',
      promisedDeliveryDate: daysFromNow(2),
      notes: 'Workshop assembling lenses into frame',
      items: [
        {
          inventoryIndex: 2,
          description: 'Vogue VO 7721 — Brown',
          hsnCode: '9003',
          quantity: 1,
          unitPrice: '2200.00',
          taxRate: '18.00',
        },
        {
          inventoryIndex: 5,
          description: 'Hoya Nulux EP — High-Index 1.67',
          hsnCode: '9001',
          quantity: 1,
          unitPrice: '3200.00',
          taxRate: '5.00',
          lensType: 'SINGLE_VISION',
          coating: 'ANTI_REFLECTIVE',
          lensMaterial: 'HIGH_INDEX_167',
        },
      ],
      payments: [
        { amount: '2500.00', paymentMode: 'CASH' },
      ],
    },
    {
      invoiceNumber: 'INV-25-000009',
      customerIndex: 3,
      orderStatus: 'READY_FOR_COLLECTION',
      paymentStatus: 'PAID',
      promisedDeliveryDate: daysFromNow(1),
      notes: 'Contact lenses packed and ready',
      items: [
        {
          inventoryIndex: 6,
          description: 'Acuvue Oasys 2-Week — 6 Pack',
          hsnCode: '9004',
          quantity: 1,
          unitPrice: '1950.00',
          taxRate: '18.00',
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-25-000010',
      customerIndex: 4,
      orderStatus: 'DELIVERED_AND_CLOSED',
      paymentStatus: 'PAID',
      promisedDeliveryDate: null,
      notes: 'Direct sunglass purchase delivered',
      items: [
        {
          inventoryIndex: 7,
          description: 'Ray-Ban RB 3025 Aviator — Gold',
          hsnCode: '9004',
          quantity: 1,
          unitPrice: '4500.00',
          taxRate: '18.00',
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-25-000011',
      customerIndex: 0,
      orderStatus: 'DELIVERED_AND_CLOSED',
      paymentStatus: 'PAID',
      promisedDeliveryDate: null,
      notes: 'Bi-weekly replenishment delivered',
      items: [
        {
          inventoryIndex: 6,
          description: 'Acuvue Oasys 2-Week — 6 Pack',
          hsnCode: '9004',
          quantity: 1,
          unitPrice: '1950.00',
          taxRate: '18.00',
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-25-000012',
      customerIndex: 1,
      orderStatus: 'DELIVERED_AND_CLOSED',
      paymentStatus: 'PAID',
      promisedDeliveryDate: null,
      notes: 'Accessory walk-in purchase',
      items: [
        {
          inventoryIndex: 8,
          description: 'Hard Case — Protective Shell',
          hsnCode: '4202',
          quantity: 1,
          unitPrice: '250.00',
          taxRate: '18.00',
        },
      ],
      payments: [],
    },
  ];

  for (const invDef of sampleInvoicesDef) {
    let subtotalDec = new Decimal(0);
    let taxableDec = new Decimal(0);
    let totalTaxDec = new Decimal(0);
    let cgstDec = new Decimal(0);
    let sgstDec = new Decimal(0);

    const calculatedItems = invDef.items.map((item) => {
      const lineTotalDec = new Decimal(item.unitPrice).times(item.quantity);
      const taxAmountDec = lineTotalDec.times(new Decimal(item.taxRate).dividedBy(100));
      const halfTax = taxAmountDec.dividedBy(2);

      subtotalDec = subtotalDec.plus(lineTotalDec);
      taxableDec = taxableDec.plus(lineTotalDec);
      totalTaxDec = totalTaxDec.plus(taxAmountDec);
      cgstDec = cgstDec.plus(halfTax);
      sgstDec = sgstDec.plus(halfTax);

      return {
        inventoryItemId: insertedInventory[item.inventoryIndex].id,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPerUnit: '0.00',
        lineTotal: lineTotalDec.toFixed(2),
        taxRate: item.taxRate,
        taxAmount: taxAmountDec.toFixed(2),
        lensType: item.lensType,
        coating: item.coating,
        lensMaterial: item.lensMaterial,
      };
    });

    const grandTotalDec = taxableDec.plus(totalTaxDec);
    let advancePaidDec = new Decimal(0);
    const invoicePaymentsList: Array<{
      amount: string;
      paymentMode: 'UPI' | 'CASH' | 'CARD';
      transactionReference?: string;
    }> = [];

    if (invDef.paymentStatus === 'PAID') {
      if (invDef.payments.length > 0) {
        for (const p of invDef.payments) {
          advancePaidDec = advancePaidDec.plus(new Decimal(p.amount));
          invoicePaymentsList.push(p);
        }
        const remainder = grandTotalDec.minus(advancePaidDec);
        if (remainder.greaterThan(0)) {
          invoicePaymentsList.push({
            amount: remainder.toFixed(2),
            paymentMode: 'CASH',
            transactionReference: 'AUTO-SETTLE-CASH',
          });
          advancePaidDec = advancePaidDec.plus(remainder);
        }
      } else {
        invoicePaymentsList.push({
          amount: grandTotalDec.toFixed(2),
          paymentMode: 'UPI',
          transactionReference: `UPI-SETTLE-${invDef.invoiceNumber}`,
        });
        advancePaidDec = grandTotalDec;
      }
    } else {
      for (const p of invDef.payments) {
        advancePaidDec = advancePaidDec.plus(new Decimal(p.amount));
        invoicePaymentsList.push(p);
      }
    }

    const balanceDueDec = grandTotalDec.minus(advancePaidDec);

    const [createdInv] = await db
      .insert(invoices)
      .values({
        invoiceNumber: invDef.invoiceNumber,
        customerId: insertedCustomers[invDef.customerIndex].id,
        prescriptionId:
          invDef.prescriptionIndex !== undefined
            ? insertedRx[invDef.prescriptionIndex]?.id ?? null
            : null,
        orderStatus: invDef.orderStatus,
        paymentStatus: invDef.paymentStatus,
        subtotal: subtotalDec.toFixed(2),
        discountAmount: '0.00',
        taxableValue: taxableDec.toFixed(2),
        cgstAmount: cgstDec.toFixed(2),
        sgstAmount: sgstDec.toFixed(2),
        igstAmount: '0.00',
        totalTax: totalTaxDec.toFixed(2),
        grandTotal: grandTotalDec.toFixed(2),
        advancePaid: advancePaidDec.toFixed(2),
        balanceDue: balanceDueDec.toFixed(2),
        promisedDeliveryDate: invDef.promisedDeliveryDate,
        notes: invDef.notes,
        organizationId: defaultOrgId,
        branchId: defaultBranchId,
      })
      .returning({ id: invoices.id });

    if (calculatedItems.length > 0) {
      await db.insert(invoiceItems).values(
        calculatedItems.map((ci) => ({
          ...ci,
          invoiceId: createdInv.id,
        }))
      );
    }

    if (invoicePaymentsList.length > 0) {
      await db.insert(payments).values(
        invoicePaymentsList.map((p) => ({
          invoiceId: createdInv.id,
          amount: p.amount,
          paymentMode: p.paymentMode,
          transactionReference: p.transactionReference ?? null,
          organizationId: defaultOrgId,
          branchId: defaultBranchId,
        }))
      );
    }
  }

  console.log(`  ✓ ${sampleInvoicesDef.length} sample invoices created across all workflow stages`);
  console.log('✅ Seeding complete.');
}


// Run directly: npx tsx src/db/seed.ts
const isDirectRun =
  (typeof require !== 'undefined' && require.main === module) ||
  (typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('src/db/seed.ts'));

if (isDirectRun) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
