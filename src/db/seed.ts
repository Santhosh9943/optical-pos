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
    .values(
      seedCustomers.map((c) => ({
        ...c,
        organizationId: '00000000-0000-0000-0000-000000000001',
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
        organizationId: '00000000-0000-0000-0000-000000000001',
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
