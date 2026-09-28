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
  branches,
} from '@/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import {
  createOrderSchema,
  type CreateOrderInput,
} from '@/lib/validators/prescription';
import {
  InsufficientStockError,
  InsufficientStoreCreditError,
  NegativeBalanceError,
} from '@/lib/errors';
import Decimal from 'decimal.js';
import { requireAuthSession, isManagerOrAdmin } from '@/lib/auth-utils';
import { findOrgStoreProfile } from '@/lib/store-profile';
import { computeGstLine, roundPaise, normalizeGstRate } from '@/lib/gst';
import { invalidateCache } from '@/lib/cache';
import { checkRateLimit } from '@/lib/ratelimit';
import { generateReceiptToken } from '@/lib/crypto-utils';

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
      receiptToken?: string;
    }
  | {
      success: false;
      error:
        | 'VALIDATION_ERROR'
        | 'CUSTOMER_NOT_FOUND'
        | 'INSUFFICIENT_STOCK'
        | 'INVENTORY_ITEM_NOT_FOUND'
        | 'PRICE_OVERRIDE_NOT_ALLOWED'
        | 'INSUFFICIENT_STORE_CREDIT'
        | 'UNAUTHORIZED'
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
  let session: Awaited<ReturnType<typeof requireAuthSession>>;
  try {
    session = await requireAuthSession();
  } catch {
    return { success: false, error: 'UNAUTHORIZED', message: 'Please sign in to complete checkout.' };
  }
  const orgId = session.organizationId;
  const rateLimitResult = await checkRateLimit(`checkout:${session.organizationId || session.user.id}`, 30, 60);
  if (!rateLimitResult.success) {
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Too many order submissions. Please wait a moment and try again.',
    };
  }

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

  // Catalog values are authoritative for inventory-backed lines (price floor, tax class, HSN).
  const catalogById = new Map<
    string,
    { sellingPrice: string; taxRate: string; hsnCode: string | null; isGstExempt: boolean }
  >();
  if (inventoryItemIds.length > 0) {
    const existingItems = await db
      .select({
        id: inventoryItems.id,
        sellingPrice: inventoryItems.sellingPrice,
        taxRate: inventoryItems.taxRate,
        hsnCode: inventoryItems.hsnCode,
        isGstExempt: inventoryItems.isGstExempt,
      })
      .from(inventoryItems)
      .where(
        and(
          inArray(inventoryItems.id, inventoryItemIds),
          eq(inventoryItems.organizationId, session.organizationId)
        )
      );

    for (const row of existingItems) catalogById.set(row.id, row);
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

  // 2c. Price integrity: tax class & HSN always come from the catalog; selling below the
  // catalog price is a manager-only override. Service / custom lens lines (no inventory id)
  // are priced at the counter by design.
  const canOverridePrice = await isManagerOrAdmin(session);
  for (const item of input.items) {
    if (!item.inventoryItemId) continue;
    const catalog = catalogById.get(item.inventoryItemId);
    if (!catalog) continue;
    // Catalog slab is authoritative (GST-exempt items bill at 0%); unknown slabs keep the validated client slab.
    item.taxRate = catalog.isGstExempt ? '0.00' : normalizeGstRate(catalog.taxRate) ?? item.taxRate;
    item.hsnCode = catalog.hsnCode ?? item.hsnCode ?? null;
    if (!canOverridePrice && new Decimal(item.unitPrice).lessThan(catalog.sellingPrice)) {
      return {
        success: false,
        error: 'PRICE_OVERRIDE_NOT_ALLOWED',
        message: `"${item.description}" is priced below its catalog price (₹${new Decimal(catalog.sellingPrice).toFixed(2)}). Only a manager can override catalog prices.`,
      };
    }
  }

  // 2d. Branch must belong to the caller's organization.
  let effectiveBranchId: string | null = session.branchId || null;
  if (input.branchId && input.branchId !== session.branchId) {
    const [ownBranch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, input.branchId), eq(branches.organizationId, orgId)))
      .limit(1);
    if (!ownBranch) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Selected branch does not belong to your practice.',
      };
    }
    effectiveBranchId = ownBranch.id;
  }

  // 2e. Client-referenced prescriptions must belong to this organization's patients.
  const referencedRxIds = Array.from(
    new Set(input.items.map((i) => i.prescriptionId).filter((id): id is string => !!id))
  );
  if (referencedRxIds.length > 0) {
    const ownedRx = await db
      .select({ id: opticalPrescriptions.id })
      .from(opticalPrescriptions)
      .innerJoin(customers, eq(opticalPrescriptions.customerId, customers.id))
      .where(
        and(inArray(opticalPrescriptions.id, referencedRxIds), eq(customers.organizationId, orgId))
      );
    const ownedRxIds = new Set(ownedRx.map((r) => r.id));
    for (const item of input.items) {
      if (item.prescriptionId && !ownedRxIds.has(item.prescriptionId)) item.prescriptionId = null;
    }
  }

  // 2f. Tenant-scoped stock policy, read BEFORE the transaction: a failed read inside `tx`
  // would put Postgres into an aborted state (25P02) and fail every later statement.
  const orgProfile = await findOrgStoreProfile(orgId).catch(() => null);
  const allowNegativeStock = orgProfile?.allowNegativeStock === true;

  // ── Step 3: Atomic database transaction ──
  try {
    const result = await db.transaction(async (tx) => {
      // ── 3a. Check inventory levels and decrement atomically ──
      // Invariant #5: Strict atomic decrement requiring stockQuantity >= quantity unless the
      // organization's own store profile explicitly enables allowNegativeStock.

      for (const item of input.items) {
        if (!item.inventoryItemId) continue; // service line, no stock

        if (allowNegativeStock) {
          // Allow negative stock decrement directly without blocking checkout
          await tx
            .update(inventoryItems)
            .set({
              stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventoryItems.id, item.inventoryItemId),
                eq(inventoryItems.organizationId, session.organizationId)
              )
            );
        } else {
          const updated = await tx
            .update(inventoryItems)
            .set({
              stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventoryItems.id, item.inventoryItemId),
                eq(inventoryItems.organizationId, session.organizationId),
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
              .where(and(eq(customers.id, p.id), eq(customers.organizationId, orgId)))
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
              .where(and(eq(customers.id, mappedPrimary), eq(customers.organizationId, orgId)))
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
            // Axis invariant: AXIS is null whenever CYL is 0 / absent.
            odAxis: rxData.odCylinder ? rxData.odAxis : null,
            odAdd: rxData.odAdd != null ? rxData.odAdd.toFixed(2) : null,
            odPd: rxData.odPd != null ? rxData.odPd.toFixed(1) : null,
            osSphere: rxData.osSphere != null ? rxData.osSphere.toFixed(2) : null,
            osCylinder: rxData.osCylinder != null ? rxData.osCylinder.toFixed(2) : null,
            osAxis: rxData.osCylinder ? rxData.osAxis : null,
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

      // ── 3e. Compute financial totals via the shared GST engine (per-line paise rounding) ──
      let subtotal = new Decimal(0);
      let totalDiscount = new Decimal(0);
      let totalTax = new Decimal(0);
      let taxableValue = new Decimal(0);
      let cgst = new Decimal(0);
      let sgst = new Decimal(0);

      const computedItems = input.items.map((item) => {
        const line = computeGstLine({
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          // Prefer the exact whole-line discount; fall back to legacy per-unit × qty.
          lineDiscount:
            item.lineDiscount ?? new Decimal(item.discountPerUnit || '0.00').times(item.quantity),
          taxRate: item.taxRate,
        });

        subtotal = subtotal.plus(line.gross);
        totalDiscount = totalDiscount.plus(line.discount);
        taxableValue = taxableValue.plus(line.taxable);
        totalTax = totalTax.plus(line.tax);
        cgst = cgst.plus(line.cgst);
        sgst = sgst.plus(line.sgst);

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
          // Display value only — the exact line discount is preserved via lineTotal/taxAmount.
          discountPerUnit: roundPaise(line.discount.dividedBy(item.quantity)).toFixed(2),
          patientId: realPatientId,
          prescriptionId: realRxId,
          lineTotal: line.total.toFixed(2),
          taxAmount: line.tax.toFixed(2),
        };
      });

      // Sum of paise-rounded lines, so header totals always equal Σ line totals.
      // CGST/SGST split per line (intra-state); IGST inter-state detection is not yet modelled.
      const grandTotal = taxableValue.plus(totalTax);

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
          branchId: effectiveBranchId,
        })
        .returning({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          createdAt: invoices.createdAt,
        });

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
        // Store Credit / Wallet: debit atomically, and ONLY if the balance covers it.
        if (input.advancePayment.mode === 'CREDIT') {
          const debited = await tx
            .update(customers)
            .set({
              advanceBalance: sql`${customers.advanceBalance} - ${advancePaid.toFixed(2)}::numeric`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(customers.id, finalInvoiceCustomerId),
                eq(customers.organizationId, orgId),
                sql`${customers.advanceBalance} >= ${advancePaid.toFixed(2)}::numeric`
              )
            )
            .returning({ id: customers.id });

          if (debited.length === 0) {
            throw new InsufficientStoreCreditError(advancePaid.toFixed(2));
          }
        }

        await tx.insert(payments).values({
          invoiceId: invoice.id,
          amount: advancePaid.toFixed(2),
          paymentMode: input.advancePayment.mode,
          transactionReference: input.advancePayment.reference ?? null,
          organizationId: orgId,
          branchId: effectiveBranchId,
        });
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: grandTotal.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        receiptToken: generateReceiptToken(invoice.id, invoice.createdAt),
      };
    });

    // Stock, patients and ledgers changed: drop stale tenant caches (best-effort, post-commit).
    await Promise.allSettled([
      invalidateCache({ orgId, namespace: 'inventory' }),
      invalidateCache({ orgId, namespace: 'patients' }),
      invalidateCache({ orgId, namespace: 'invoices' }),
      invalidateCache({ orgId, namespace: 'dashboard' }),
    ]);

    return { success: true, ...result };
  } catch (err) {
    if (err instanceof InsufficientStoreCreditError) {
      return {
        success: false,
        error: 'INSUFFICIENT_STORE_CREDIT',
        message: `The customer's store credit does not cover ₹${err.amount}. Reduce the credit amount or choose another payment mode.`,
      };
    }

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

