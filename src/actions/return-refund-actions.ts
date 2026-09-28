'use server';

/**
 * OptixOS Return, Refund & Store Credit Management
 * 
 * Handles customer returns, restocks optical inventory, and credits the refund
 * amount to the customer's wallet / Store Credit (advanceBalance) or original tender.
 * Strictly uses decimal.js for all financial calculations.
 */

import { db } from '@/db';
import {
  invoices,
  invoiceItems,
  inventoryItems,
  customers,
  payments,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireManagerOrAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/cache';

export interface ProcessReturnRefundInput {
  invoiceId: string;
  itemId?: string; // Specific line item being returned
  returnQuantity?: number;
  refundAmount: string; // Amount to refund (in INR)
  refundMode: 'STORE_CREDIT' | 'CASH' | 'UPI' | 'CARD';
  reason: string;
}

const returnRefundSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice id'),
  itemId: z.string().uuid().optional(),
  returnQuantity: z.number().int().min(0).max(99999).optional(),
  refundAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Refund amount must be a rupee value (max 2 decimals)'),
  refundMode: z.enum(['STORE_CREDIT', 'CASH', 'UPI', 'CARD']),
  reason: z.string().trim().max(500).default(''),
});

/**
 * @description Processes a customer return and refund (manager/admin only), atomically:
 * - the invoice row is locked (`FOR UPDATE`) so concurrent refunds serialize;
 * - total refunds can never exceed the net amount actually collected (Σ payments, refunds negative);
 * - returned units are bounded by the sold quantity via `returned_quantity` (conditional update);
 * - store credit is credited with an atomic SQL increment (no lost updates).
 * @param input - Return/refund request.
 * @returns New store credit balance (if credited) and a refund reference.
 */
export async function processReturnRefundAction(
  input: ProcessReturnRefundInput
): Promise<{
  success: boolean;
  newStoreCredit?: string;
  refundReference?: string;
  error?: string;
}> {
  try {
    const session = await requireManagerOrAdmin();

    const parsed = returnRefundSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid return request' };
    }
    const data = parsed.data;
    const refundDecimal = new Decimal(data.refundAmount);
    if (refundDecimal.lessThanOrEqualTo(0)) {
      return { success: false, error: 'Refund amount must be a positive number' };
    }

    const result = await db.transaction(async (tx) => {
      // 1. Fetch Invoice
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, data.invoiceId),
            eq(invoices.organizationId, session.organizationId)
          )
        )
        .for('update')
        .limit(1);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Financial Invariant: cumulative refunds can never exceed the net amount collected.
      // Refunds are stored as negative payment rows, so Σ(amount) is the refundable remainder.
      const [paidRow] = await tx
        .select({ net: sql<string>`COALESCE(SUM(${payments.amount}), 0)::text` })
        .from(payments)
        .where(and(eq(payments.invoiceId, invoice.id), eq(payments.organizationId, session.organizationId)));
      const refundable = Decimal.max(0, new Decimal(paidRow?.net ?? '0'));
      if (refundDecimal.greaterThan(refundable)) {
        throw new Error(
          `Refund amount (₹${refundDecimal.toFixed(2)}) exceeds the refundable balance (₹${refundable.toFixed(2)}) on this invoice`
        );
      }

      // 2. Fetch Customer
      const [customer] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, invoice.customerId),
            eq(customers.organizationId, session.organizationId)
          )
        )
        .limit(1);

      if (!customer) {
        throw new Error('Customer account not found');
      }

      // 3. Restock returned units — bounded by (sold − already returned) via a conditional update.
      if (data.itemId && data.returnQuantity && data.returnQuantity > 0) {
        const returnedLine = await tx
          .update(invoiceItems)
          .set({ returnedQuantity: sql`${invoiceItems.returnedQuantity} + ${data.returnQuantity}` })
          .where(
            and(
              eq(invoiceItems.id, data.itemId),
              eq(invoiceItems.invoiceId, invoice.id),
              sql`${invoiceItems.quantity} - ${invoiceItems.returnedQuantity} >= ${data.returnQuantity}`
            )
          )
          .returning({ inventoryItemId: invoiceItems.inventoryItemId });

        if (returnedLine.length === 0) {
          throw new Error('Return quantity exceeds the units still eligible for return on this line');
        }

        if (returnedLine[0].inventoryItemId) {
          await tx
            .update(inventoryItems)
            .set({
              stockQuantity: sql`${inventoryItems.stockQuantity} + ${data.returnQuantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventoryItems.id, returnedLine[0].inventoryItemId),
                eq(inventoryItems.organizationId, session.organizationId)
              )
            );
        }
      }

      let updatedStoreCredit: string | undefined;

      // 4. Store credit: atomic increment (concurrent refunds cannot lose updates).
      if (data.refundMode === 'STORE_CREDIT') {
        const [credited] = await tx
          .update(customers)
          .set({
            advanceBalance: sql`${customers.advanceBalance} + ${refundDecimal.toFixed(2)}::numeric`,
            updatedAt: new Date(),
          })
          .where(and(eq(customers.id, customer.id), eq(customers.organizationId, session.organizationId)))
          .returning({ advanceBalance: customers.advanceBalance });
        updatedStoreCredit = credited ? new Decimal(credited.advanceBalance).toFixed(2) : undefined;
      }

      // 5. Record refund transaction in payments
      const refundRef = `REF-${Date.now().toString(36).toUpperCase()}`;
      await tx.insert(payments).values({
        invoiceId: invoice.id,
        amount: refundDecimal.negated().toFixed(2), // Negative to indicate refund/outflow
        paymentMode: data.refundMode === 'STORE_CREDIT' ? 'CREDIT' : data.refundMode,
        transactionReference: `${refundRef}: ${data.reason || 'Customer Return'}`.slice(0, 100),
        organizationId: session.organizationId,
        branchId: invoice.branchId || session.branchId,
      });

      // 6. Update invoice notes with return audit trail
      const auditNote = `\n[Return ${new Date().toLocaleDateString('en-IN')}: Refunded ₹${refundDecimal.toFixed(2)} via ${data.refundMode}. Reason: ${data.reason}]`;
      await tx
        .update(invoices)
        .set({
          notes: invoice.notes ? `${invoice.notes} ${auditNote}` : auditNote,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, invoice.id), eq(invoices.organizationId, session.organizationId)));

      return {
        newStoreCredit: updatedStoreCredit,
        refundReference: refundRef,
      };
    });

    revalidatePath('/admin/patients');
    revalidatePath('/admin/reports');
    revalidatePath('/admin/inventory');
    await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });
    await invalidateCache({ orgId: session.organizationId, namespace: 'invoices' });
    await invalidateCache({ orgId: session.organizationId, namespace: 'inventory' });

    return {
      success: true,
      newStoreCredit: result.newStoreCredit,
      refundReference: result.refundReference,
    };
  } catch (err: unknown) {
    console.error('[processReturnRefundAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process return and refund',
    };
  }
}
