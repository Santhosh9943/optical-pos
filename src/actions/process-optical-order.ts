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
import {
  InsufficientStockError,
  NegativeBalanceError,
} from '@/lib/errors';
import Decimal from 'decimal.js';
import { getCurrentSession } from '@/lib/auth-utils';

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
  const row = result.rows[0] as { seq?: string | number | bigint };
  const seq = row?.seq ?? '1';
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
      details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
    };
  }

  const input: CreateOrderInput = parsed.data;
  const session = await getCurrentSession();

  // ── Step 2: Pre-transaction validation ──

  // 2a. Verify customer exists or is provided in patients list
  const [existingCustomer] = await db
    .select({ id: customers.id, phone: customers.phone })
    .from(customers)
    .where(
      and(
        eq(customers.id, input.customerId),
        eq(customers.organizationId, session.organizationId)
      )
    )
    .limit(1);

  const customerInPatients = input.patients?.find(
    (p) => p.id === input.customerId
  );

  if (!existingCustomer && !customerInPatients) {
    return {
      success: false,
      error: 'CUSTOMER_NOT_FOUND',
      message: `Customer ${input.customerId} does not exist and was not provided in patient list`,
    };
  }

  const primaryPhone =
    existingCustomer?.phone || customerInPatients?.phone || '0000000000';

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

      // ── 3b. Persist family members & patients if provided ──
      const patientIdMap = new Map<string, string>(); // temp/provided id -> real DB id
      if (existingCustomer) {
        patientIdMap.set(existingCustomer.id, existingCustomer.id);
      }

      if (input.patients && input.patients.length > 0) {
        for (const p of input.patients) {
          if (!p.fullName) continue;

          if (p.id) {
            // Check if patient exists
            const [existing] = await tx
              .select({ id: customers.id })
              .from(customers)
              .where(eq(customers.id, p.id))
              .limit(1);

            if (existing) {
              patientIdMap.set(p.id, existing.id);
              continue;
            }
          }

          let validPrimaryId: string | null = null;
          if (p.primaryCustomerId && p.primaryCustomerId !== p.id) {
            const mappedPrimary =
              patientIdMap.get(p.primaryCustomerId) || p.primaryCustomerId;
            const [checkPrimary] = await tx
              .select({ id: customers.id })
              .from(customers)
              .where(eq(customers.id, mappedPrimary))
              .limit(1);
            if (checkPrimary) {
              validPrimaryId = checkPrimary.id;
            }
          }

          // Insert new family member / dependent
          const [newPatient] = await tx
            .insert(customers)
            .values({
              fullName: p.fullName,
              phone: p.phone || primaryPhone,
              age: p.age ?? null,
              gender: p.gender ?? null,
              relationType: p.relationType || 'Other',
              primaryCustomerId: validPrimaryId,
              organizationId: session.organizationId,
            })
            .returning({ id: customers.id });

          if (p.id) {
            patientIdMap.set(p.id, newPatient.id);
          }
          patientIdMap.set(newPatient.id, newPatient.id);
        }
      }

      // ── 3c. Persist prescriptions ──
      const savedPrescriptionIds = new Map<string, string>(); // patientId -> prescriptionId
      let primaryPrescriptionId: string | null = null;

      // Helper to insert optical prescription
      const insertPrescription = async (
        targetPatientId: string,
        rxData: NonNullable<typeof input.prescription>
      ) => {
        const [rx] = await tx
          .insert(opticalPrescriptions)
          .values({
            customerId: targetPatientId,
            odSphere: rxData.odSphere != null ? rxData.odSphere.toFixed(2) : null,
            odCylinder: rxData.odCylinder != null ? rxData.odCylinder.toFixed(2) : null,
            odAxis: rxData.odAxis,
            odAdd: rxData.odAdd != null ? rxData.odAdd.toFixed(2) : null,
            odPd: rxData.odPd != null ? rxData.odPd.toFixed(1) : null,
            osSphere: rxData.osSphere != null ? rxData.osSphere.toFixed(2) : null,
            osCylinder: rxData.osCylinder != null ? rxData.osCylinder.toFixed(2) : null,
            osAxis: rxData.osAxis,
            osAdd: rxData.osAdd != null ? rxData.osAdd.toFixed(2) : null,
            osPd: rxData.osPd != null ? rxData.osPd.toFixed(1) : null,
            binocularPd:
              rxData.binocularPd != null
                ? rxData.binocularPd.toFixed(1)
                : null,
            odBaseCurve:
              rxData.odBaseCurve != null
                ? rxData.odBaseCurve.toFixed(1)
                : null,
            odDiameter:
              rxData.odDiameter != null
                ? rxData.odDiameter.toFixed(1)
                : null,
            osBaseCurve:
              rxData.osBaseCurve != null
                ? rxData.osBaseCurve.toFixed(1)
                : null,
            osDiameter:
              rxData.osDiameter != null
                ? rxData.osDiameter.toFixed(1)
                : null,
            prismNotes: rxData.prismNotes ?? null,
            visualAcuityNotes: rxData.visualAcuityNotes ?? null,
            clinicalRemarks: rxData.clinicalRemarks ?? null,
          })
          .returning({ id: opticalPrescriptions.id });

        return rx.id;
      };

      // 1. Process array of prescriptions if provided
      if (input.prescriptions && input.prescriptions.length > 0) {
        for (const rxItem of input.prescriptions) {
          const rawPid =
            rxItem.patientId ||
            ('customerId' in rxItem ? (rxItem as any).customerId : input.customerId);
          const targetPid = patientIdMap.get(rawPid) || rawPid;
          const rxData = 'data' in rxItem ? rxItem.data : (rxItem as any);
          const rxId = await insertPrescription(targetPid, rxData);
          savedPrescriptionIds.set(targetPid, rxId);
          if (rawPid) savedPrescriptionIds.set(rawPid, rxId);
          if (targetPid === input.customerId && !primaryPrescriptionId) {
            primaryPrescriptionId = rxId;
          }
        }
      }

      // 2. Legacy / single prescription fallback
      if (input.prescription && !savedPrescriptionIds.has(input.customerId)) {
        const rxId = await insertPrescription(input.customerId, input.prescription);
        savedPrescriptionIds.set(input.customerId, rxId);
        primaryPrescriptionId = rxId;
      }

      if (!primaryPrescriptionId && savedPrescriptionIds.size > 0) {
        primaryPrescriptionId = Array.from(savedPrescriptionIds.values())[0];
      }

      // ── 3d. Generate invoice number ──
      const invoiceNumber = await generateInvoiceNumber(tx);

      // ── 3e. Compute financial totals using Decimal (string-safe) ──
      let subtotal = new Decimal(0);
      let totalDiscount = new Decimal(0);
      let totalTax = new Decimal(0);
      let taxableValue = new Decimal(0);

      const computedItems = input.items.map((item) => {
        const unitPrice = new Decimal(item.unitPrice);
        const discountPerUnit = new Decimal(item.discountPerUnit || '0.00');
        const lineSubtotal = unitPrice.times(item.quantity);
        const lineDiscount = discountPerUnit.times(item.quantity);
        const diff = lineSubtotal.minus(lineDiscount);
        const lineTaxable = diff.isNegative() ? new Decimal(0) : diff;
        const taxRate = new Decimal(item.taxRate);
        const lineTax = lineTaxable.times(taxRate).dividedBy(100);

        subtotal = subtotal.plus(lineSubtotal);
        totalDiscount = totalDiscount.plus(lineDiscount);
        taxableValue = taxableValue.plus(lineTaxable);
        totalTax = totalTax.plus(lineTax);

        const realPatientId = item.patientId
          ? patientIdMap.get(item.patientId) || item.patientId
          : null;

        const realRxId =
          item.prescriptionId ??
          (realPatientId ? savedPrescriptionIds.get(realPatientId) : null) ??
          primaryPrescriptionId ??
          null;

        return {
          ...item,
          patientId: realPatientId,
          prescriptionId: realRxId,
          lineTotal: lineTaxable.plus(lineTax).toFixed(2),
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
        advancePaid = new Decimal(input.advancePayment.amount || '0.00');
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

      // ── 3f. Insert invoice ──
      const finalInvoiceCustomerId =
        patientIdMap.get(input.customerId) || input.customerId;

      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: finalInvoiceCustomerId,
          prescriptionId: primaryPrescriptionId,
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
          notes:
            input.billingDetails?.notes ||
            input.notes ||
            (input.billingDetails?.billingName
              ? `Billed to: ${input.billingDetails.billingName}`
              : null),
          organizationId: session.organizationId,
          branchId: input.branchId || session.branchId,
        })
        .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

      // ── 3g. Insert invoice items ──
      await tx.insert(invoiceItems).values(
        computedItems.map((item) => ({
          invoiceId: invoice.id,
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          hsnCode: item.hsnCode ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPerUnit: item.discountPerUnit,
          lineTotal: item.lineTotal,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lensType: item.lensType ?? null,
          coating: item.coating ?? null,
          lensMaterial: item.lensMaterial ?? null,
          patientId: item.patientId ?? null,
          prescriptionId: item.prescriptionId ?? null,
          isCustomerOwnFrame: item.isCustomerOwnFrame ?? false,
          fittingNote: item.fittingNote ?? null,
        }))
      );

      // ── 3h. Insert advance payment if collected ──
      if (input.advancePayment && advancePaid.greaterThan(0)) {
        await tx.insert(payments).values({
          invoiceId: invoice.id,
          amount: advancePaid.toFixed(2),
          paymentMode: input.advancePayment.mode,
          transactionReference: input.advancePayment.reference ?? null,
          organizationId: session.organizationId,
          branchId: input.branchId || session.branchId,
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

