'use server';

import { db } from '@/db';
import { invoices, invoiceItems, customers } from '@/db/schema';
import { getCurrentSession, requireAuthSession, requireManagerOrAdmin } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { z } from 'zod';

const updateInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  customerName: z.string().min(1, 'Customer name is required').max(100),
  customerPhone: z.string().min(10, 'Valid phone number is required').max(20),
  customerAddress: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  promisedDeliveryDate: z.string().optional().nullable(),
  includeGst: z.boolean(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export async function getInvoiceForEditAction(invoiceId: string) {
  try {
    const session = await requireAuthSession();

    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        orderStatus: invoices.orderStatus,
        paymentStatus: invoices.paymentStatus,
        subtotal: invoices.subtotal,
        discountAmount: invoices.discountAmount,
        taxableValue: invoices.taxableValue,
        cgstAmount: invoices.cgstAmount,
        sgstAmount: invoices.sgstAmount,
        totalTax: invoices.totalTax,
        grandTotal: invoices.grandTotal,
        advancePaid: invoices.advancePaid,
        balanceDue: invoices.balanceDue,
        notes: invoices.notes,
        promisedDeliveryDate: invoices.promisedDeliveryDate,
        createdAt: invoices.createdAt,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerAddress: customers.addressLine1,
        customerGstin: customers.gstin,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, error: 'Invoice not found or access denied' };
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    return {
      success: true,
      data: {
        ...invoice,
        items,
        hasGst: new Decimal(invoice.totalTax || '0').greaterThan(0),
      },
    };
  } catch (err: unknown) {
    console.error('[getInvoiceForEditAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to retrieve invoice details',
    };
  }
}

export async function updateInvoiceDetailsAction(input: UpdateInvoiceInput) {
  try {
    const session = await requireManagerOrAdmin();
    const validated = updateInvoiceSchema.parse(input);

    return await db.transaction(async (tx) => {
      // 1. Fetch current invoice with items
      const [inv] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, validated.invoiceId),
            eq(invoices.organizationId, session.organizationId)
          )
        )
        .limit(1);

      if (!inv) {
        throw new Error('Invoice not found or permission denied');
      }

      const items = await tx
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, validated.invoiceId));

      // 2. Recalculate totals strictly using decimal.js
      let recalculatedSubtotal = new Decimal(0);
      let recalculatedDiscount = new Decimal(0);
      let recalculatedTaxable = new Decimal(0);
      let recalculatedTotalTax = new Decimal(0);
      let recalculatedCgst = new Decimal(0);
      let recalculatedSgst = new Decimal(0);
      let recalculatedGrandTotal = new Decimal(0);

      for (const item of items) {
        const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
        const unitPrice = new Decimal(item.unitPrice || '0.00');
        const discountPerUnit = new Decimal(item.discountPerUnit || '0.00');
        const lineDiscount = discountPerUnit.times(qty);

        const lineSubtotal = unitPrice.times(qty);
        const lineTaxable = lineSubtotal.minus(lineDiscount);
        const taxableVal = lineTaxable.isNegative() ? new Decimal(0) : lineTaxable;

        // Apply GST if includeGst is true, else 0%
        let lineTax = new Decimal(0);
        let taxRate = new Decimal(0);

        if (validated.includeGst) {
          taxRate = new Decimal(item.taxRate || '0.00');
          lineTax = taxableVal.times(taxRate).dividedBy(100);
        }

        const lineTotal = taxableVal.plus(lineTax);

        // Update item line totals if tax status changed
        await tx
          .update(invoiceItems)
          .set({
            taxAmount: lineTax.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
          })
          .where(eq(invoiceItems.id, item.id));

        recalculatedSubtotal = recalculatedSubtotal.plus(lineSubtotal);
        recalculatedDiscount = recalculatedDiscount.plus(lineDiscount);
        recalculatedTaxable = recalculatedTaxable.plus(taxableVal);
        recalculatedTotalTax = recalculatedTotalTax.plus(lineTax);
        recalculatedGrandTotal = recalculatedGrandTotal.plus(lineTotal);
      }

      recalculatedCgst = recalculatedTotalTax.dividedBy(2);
      recalculatedSgst = recalculatedTotalTax.dividedBy(2);

      const advancePaid = new Decimal(inv.advancePaid || '0.00');
      const balanceDue = recalculatedGrandTotal.minus(advancePaid);
      const normalizedBalance = balanceDue.isNegative() ? new Decimal(0) : balanceDue;

      // 3. Update invoice header
      await tx
        .update(invoices)
        .set({
          subtotal: recalculatedSubtotal.toFixed(2),
          discountAmount: recalculatedDiscount.toFixed(2),
          taxableValue: recalculatedTaxable.toFixed(2),
          cgstAmount: recalculatedCgst.toFixed(2),
          sgstAmount: recalculatedSgst.toFixed(2),
          totalTax: recalculatedTotalTax.toFixed(2),
          grandTotal: recalculatedGrandTotal.toFixed(2),
          balanceDue: normalizedBalance.toFixed(2),
          notes: validated.notes?.trim() || null,
          promisedDeliveryDate: validated.promisedDeliveryDate
            ? new Date(validated.promisedDeliveryDate)
            : inv.promisedDeliveryDate,
          paymentStatus: advancePaid.greaterThanOrEqualTo(recalculatedGrandTotal)
            ? 'PAID'
            : advancePaid.greaterThan(0)
            ? 'PARTIAL'
            : 'UNPAID',
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, validated.invoiceId));

      // 4. Update customer record
      await tx
        .update(customers)
        .set({
          fullName: validated.customerName.trim(),
          phone: validated.customerPhone.trim(),
          addressLine1: validated.customerAddress?.trim() || null,
          gstin: validated.gstin?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, inv.customerId));

      revalidatePath('/admin/reports');
      revalidatePath('/admin/lab-orders');
      revalidatePath('/pos/new-bill');

      return {
        success: true,
        data: {
          invoiceNumber: inv.invoiceNumber,
          newGrandTotal: recalculatedGrandTotal.toFixed(2),
          newBalanceDue: normalizedBalance.toFixed(2),
        },
      };
    });
  } catch (err: unknown) {
    console.error('[updateInvoiceDetailsAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update invoice details',
    };
  }
}
