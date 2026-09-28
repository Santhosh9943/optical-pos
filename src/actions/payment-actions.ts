'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  invoices,
  payments,
  customers,
  type PaymentMode,
  type PaymentStatus,
  type OrderStatus,
} from '@/db/schema';
import { requireAuthSession } from '@/lib/auth-utils';
import { invalidateCache } from '@/lib/cache';
import Decimal from 'decimal.js';
import { z } from 'zod';

const collectBalanceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice id'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive rupee value (max 2 decimals)'),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT']),
  transactionReference: z.string().trim().max(100).optional(),
});

export interface CollectBalanceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  amountCollected?: string;
  newBalance?: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  error?: string;
}

/**
 * @description Collects a pending balance on an invoice (delivery / settlement).
 * Runs in a transaction with the invoice row locked (`FOR UPDATE`) so concurrent collections
 * serialize; the amount may never exceed the outstanding balance. A full settlement closes the order.
 * @param invoiceId - Invoice to settle (must belong to the caller's organization).
 * @param amount - Rupee amount as a decimal string.
 * @param paymentMode - Tender used.
 * @param transactionReference - Optional UPI/card reference.
 * @returns Settlement result with the new balance and statuses.
 */
export async function collectBalance(
  invoiceId: string,
  amount: string,
  paymentMode: PaymentMode,
  transactionReference?: string
): Promise<CollectBalanceResult> {
  try {
    const session = await requireAuthSession();
    const parsed = collectBalanceSchema.safeParse({ invoiceId, amount, paymentMode, transactionReference });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid payment details.' };
    }

    const amountDec = new Decimal(parsed.data.amount);
    if (amountDec.lessThanOrEqualTo(0)) {
      return {
        success: false,
        error: 'Payment collection amount must be greater than zero.',
      };
    }

    const result = await db.transaction(async (tx) => {
      // 1. Fetch current invoice within transaction
      const [currentInvoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, session.organizationId)
          )
        )
        .for('update')
        .limit(1);

      if (!currentInvoice) {
        throw new Error('Invoice not found.');
      }

      if (currentInvoice.orderStatus === 'CANCELLED_REFUNDED') {
        throw new Error('Cannot collect payment on a cancelled / refunded order.');
      }

      const currentBalanceDec = new Decimal(currentInvoice.balanceDue || '0.00');
      if (currentBalanceDec.lessThanOrEqualTo(0)) {
        throw new Error('This invoice has no pending balance to collect.');
      }
      if (amountDec.greaterThan(currentBalanceDec)) {
        throw new Error(
          `Amount ₹${amountDec.toFixed(2)} exceeds the outstanding balance of ₹${currentBalanceDec.toFixed(2)}.`
        );
      }

      const currentAdvanceDec = new Decimal(currentInvoice.advancePaid || '0.00');

      // 2. Compute new balance using decimal.js
      const rawNewBalance = currentBalanceDec.minus(amountDec);
      const newBalanceDec = rawNewBalance.isNegative()
        ? new Decimal(0)
        : rawNewBalance;

      const newAdvanceDec = currentAdvanceDec.plus(amountDec);
      const isFullySettled = rawNewBalance.lessThanOrEqualTo(0);

      const newPaymentStatus: PaymentStatus = isFullySettled ? 'PAID' : 'PARTIAL';
      // When balance is fully settled, transition order status to DELIVERED_AND_CLOSED
      const newOrderStatus: OrderStatus = isFullySettled
        ? 'DELIVERED_AND_CLOSED'
        : currentInvoice.orderStatus;

      // 3. Store Credit / Wallet settlement: debit atomically, only if the balance covers it.
      if (parsed.data.paymentMode === 'CREDIT') {
        const debited = await tx
          .update(customers)
          .set({
            advanceBalance: sql`${customers.advanceBalance} - ${amountDec.toFixed(2)}::numeric`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(customers.id, currentInvoice.customerId),
              eq(customers.organizationId, session.organizationId),
              sql`${customers.advanceBalance} >= ${amountDec.toFixed(2)}::numeric`
            )
          )
          .returning({ id: customers.id });
        if (debited.length === 0) {
          throw new Error(`Customer's store credit does not cover ₹${amountDec.toFixed(2)}.`);
        }
      }

      // 4. Insert payment record
      const [newPayment] = await tx
        .insert(payments)
        .values({
          invoiceId: currentInvoice.id,
          amount: amountDec.toFixed(2),
          paymentMode: parsed.data.paymentMode,
          transactionReference: parsed.data.transactionReference || null,
          organizationId: currentInvoice.organizationId || session.organizationId,
          branchId: currentInvoice.branchId || session.branchId,
        })
        .returning();

      // 5. Update invoice record
      await tx
        .update(invoices)
        .set({
          balanceDue: newBalanceDec.toFixed(2),
          advancePaid: newAdvanceDec.toFixed(2),
          paymentStatus: newPaymentStatus,
          orderStatus: newOrderStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, session.organizationId)));

      return {
        invoiceId: currentInvoice.id,
        invoiceNumber: currentInvoice.invoiceNumber,
        paymentId: newPayment.id,
        amountCollected: amountDec.toFixed(2),
        newBalance: newBalanceDec.toFixed(2),
        paymentStatus: newPaymentStatus,
        orderStatus: newOrderStatus,
      };
    });

    // 5. Revalidate affected pages
    revalidatePath('/admin/lab-orders');
    revalidatePath('/admin/patients');
    revalidatePath('/pos/new-bill');
    await Promise.allSettled([
      invalidateCache({ orgId: session.organizationId, namespace: 'invoices' }),
      invalidateCache({ orgId: session.organizationId, namespace: 'patients' }),
      invalidateCache({ orgId: session.organizationId, namespace: 'dashboard' }),
    ]);

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error(`Failed to collect balance for invoice ${invoiceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to collect balance.',
    };
  }
}
