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
import { getCurrentSession, requireManagerOrAdmin } from '@/lib/auth-utils';
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

    if (!input.refundAmount || isNaN(Number(input.refundAmount)) || Number(input.refundAmount) <= 0) {
      return { success: false, error: 'Refund amount must be a positive number' };
    }

    const refundDecimal = new Decimal(input.refundAmount);

    const result = await db.transaction(async (tx) => {
      // 1. Fetch Invoice
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.invoiceId),
            eq(invoices.organizationId, session.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Financial Invariant: Refund cannot exceed total paid on this invoice
      const advancePaidDecimal = new Decimal(invoice.advancePaid || '0.00');
      if (refundDecimal.greaterThan(advancePaidDecimal)) {
        throw new Error(`Refund amount (₹${refundDecimal.toFixed(2)}) cannot exceed advance paid (₹${advancePaidDecimal.toFixed(2)})`);
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

      // 3. Restock inventory if line item returned (strictly verify item belongs to this invoice)
      if (input.itemId && input.returnQuantity && input.returnQuantity > 0) {
        const [lineItem] = await tx
          .select()
          .from(invoiceItems)
          .where(
            and(
              eq(invoiceItems.id, input.itemId),
              eq(invoiceItems.invoiceId, invoice.id)
            )
          )
          .limit(1);

        if (lineItem?.inventoryItemId) {
          await tx
            .update(inventoryItems)
            .set({
              stockQuantity: sql`${inventoryItems.stockQuantity} + ${input.returnQuantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventoryItems.id, lineItem.inventoryItemId),
                eq(inventoryItems.organizationId, session.organizationId)
              )
            );
        }
      }

      let updatedStoreCredit: string | undefined;

      // 4. Handle Store Credit vs Cash/Online Refund
      if (input.refundMode === 'STORE_CREDIT') {
        const currentBal = new Decimal(customer.advanceBalance || '0.00');
        const newBal = currentBal.plus(refundDecimal).toFixed(2);
        updatedStoreCredit = newBal;

        await tx
          .update(customers)
          .set({
            advanceBalance: newBal,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id));
      }

      // 5. Record refund transaction in payments
      const refundRef = `REF-${Date.now().toString(36).toUpperCase()}`;
      await tx.insert(payments).values({
        invoiceId: invoice.id,
        amount: refundDecimal.negated().toFixed(2), // Negative to indicate refund/outflow
        paymentMode: input.refundMode === 'STORE_CREDIT' ? 'CREDIT' : input.refundMode,
        transactionReference: `${refundRef}: ${input.reason.trim() || 'Customer Return'}`,
        organizationId: session.organizationId,
        branchId: invoice.branchId || session.branchId,
      });

      // 6. Update invoice notes with return audit trail
      const auditNote = `\n[Return ${new Date().toLocaleDateString('en-IN')}: Refunded ₹${refundDecimal.toFixed(2)} via ${input.refundMode}. Reason: ${input.reason}]`;
      await tx
        .update(invoices)
        .set({
          notes: invoice.notes ? `${invoice.notes} ${auditNote}` : auditNote,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));

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
