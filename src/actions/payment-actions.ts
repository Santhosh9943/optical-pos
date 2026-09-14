'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  invoices,
  payments,
  type PaymentMode,
  type PaymentStatus,
  type OrderStatus,
} from '@/db/schema';
import Decimal from 'decimal.js';

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
 * Collect pending balance on an invoice upon order delivery or settlement.
 * Uses atomic db.transaction and decimal.js for financial accuracy.
 */
export async function collectBalance(
  invoiceId: string,
  amount: string,
  paymentMode: PaymentMode,
  transactionReference?: string
): Promise<CollectBalanceResult> {
  try {
    const amountDec = new Decimal(amount || '0.00');
    if (amountDec.lessThanOrEqualTo(0) || amountDec.isNaN()) {
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
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!currentInvoice) {
        throw new Error('Invoice not found.');
      }

      const currentBalanceDec = new Decimal(currentInvoice.balanceDue || '0.00');
      if (currentBalanceDec.lessThanOrEqualTo(0)) {
        throw new Error('This invoice has no pending balance to collect.');
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

      // 3. Insert payment record
      const [newPayment] = await tx
        .insert(payments)
        .values({
          invoiceId: currentInvoice.id,
          amount: amountDec.toFixed(2),
          paymentMode,
          transactionReference: transactionReference || null,
        })
        .returning();

      // 4. Update invoice record
      await tx
        .update(invoices)
        .set({
          balanceDue: newBalanceDec.toFixed(2),
          advancePaid: newAdvanceDec.toFixed(2),
          paymentStatus: newPaymentStatus,
          orderStatus: newOrderStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

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
