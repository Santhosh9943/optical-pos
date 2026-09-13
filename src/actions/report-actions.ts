'use server';

import Decimal from 'decimal.js';
import { and, desc, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  invoices,
  payments,
  customers,
} from '@/db/schema';

export interface DailyReportTransaction {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  grandTotal: string;
  advancePaid: string;
  balanceDue: string;
  paymentMode: string;
  paymentStatus: string;
  orderStatus: string;
}

export interface DailyFinancialsReport {
  date: string; // YYYY-MM-DD
  totalRevenue: string;
  totalTax: string;
  totalAdvancePaid: string;
  totalBalanceDue: string;
  totalOrders: number;
  paymentSplits: {
    cash: string;
    upi: string;
    card: string;
    other: string;
    totalCollected: string;
  };
  transactions: DailyReportTransaction[];
}

export async function getDailyFinancials(
  targetDate?: Date | string
): Promise<{
  success: boolean;
  data?: DailyFinancialsReport;
  error?: string;
}> {
  try {
    // 1. Resolve target date string (YYYY-MM-DD)
    let dateStr: string;
    if (!targetDate) {
      const now = new Date();
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else if (targetDate instanceof Date) {
      dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    } else {
      dateStr = String(targetDate).trim().substring(0, 10);
    }

    // 2. Define day boundaries
    const startOfDay = new Date(`${dateStr}T00:00:00.000`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999`);

    // 3. Query all invoices created within this day, joined with customer info
    const dailyInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        orderStatus: invoices.orderStatus,
        paymentStatus: invoices.paymentStatus,
        subtotal: invoices.subtotal,
        discountAmount: invoices.discountAmount,
        taxableValue: invoices.taxableValue,
        cgstAmount: invoices.cgstAmount,
        sgstAmount: invoices.sgstAmount,
        igstAmount: invoices.igstAmount,
        totalTax: invoices.totalTax,
        grandTotal: invoices.grandTotal,
        advancePaid: invoices.advancePaid,
        balanceDue: invoices.balanceDue,
        createdAt: invoices.createdAt,
        customerName: customers.fullName,
        customerPhone: customers.phone,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          gte(invoices.createdAt, startOfDay),
          lte(invoices.createdAt, endOfDay)
        )
      )
      .orderBy(desc(invoices.createdAt));

    // 4. Fetch payments associated with either the invoices of today OR logged today
    const invoiceIds = dailyInvoices.map((inv) => inv.id);

    let dailyPayments: (typeof payments.$inferSelect)[] = [];
    if (invoiceIds.length > 0) {
      dailyPayments = await db
        .select()
        .from(payments)
        .where(
          inArray(payments.invoiceId, invoiceIds)
        );
    }

    // Map payments by invoiceId for fast lookup
    const paymentsByInvoice = new Map<string, (typeof payments.$inferSelect)[]>();
    for (const p of dailyPayments) {
      const existing = paymentsByInvoice.get(p.invoiceId) || [];
      existing.push(p);
      paymentsByInvoice.set(p.invoiceId, existing);
    }

    // 5. Aggregate metrics strictly using decimal.js
    let totalRevenueDec = new Decimal(0);
    let totalTaxDec = new Decimal(0);
    let totalAdvancePaidDec = new Decimal(0);
    let totalBalanceDueDec = new Decimal(0);

    const transactions: DailyReportTransaction[] = dailyInvoices.map((inv) => {
      const grandTotalDec = new Decimal(inv.grandTotal || '0.00');
      const taxDec = new Decimal(inv.totalTax || '0.00');
      const advanceDec = new Decimal(inv.advancePaid || '0.00');
      const balanceDec = new Decimal(inv.balanceDue || '0.00');

      totalRevenueDec = totalRevenueDec.plus(grandTotalDec);
      totalTaxDec = totalTaxDec.plus(taxDec);
      totalAdvancePaidDec = totalAdvancePaidDec.plus(advanceDec);
      totalBalanceDueDec = totalBalanceDueDec.plus(balanceDec);

      // Determine primary payment mode
      const orderPayments = paymentsByInvoice.get(inv.id) || [];
      let paymentModeStr = 'UNPAID';
      if (orderPayments.length > 0) {
        const modes = Array.from(new Set(orderPayments.map((p) => p.paymentMode)));
        paymentModeStr = modes.join(' + ');
      } else if (advanceDec.isZero()) {
        paymentModeStr = 'PAYMENT PENDING';
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt.toISOString(),
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        grandTotal: grandTotalDec.toFixed(2),
        advancePaid: advanceDec.toFixed(2),
        balanceDue: balanceDec.toFixed(2),
        paymentMode: paymentModeStr,
        paymentStatus: inv.paymentStatus,
        orderStatus: inv.orderStatus,
      };
    });

    // 6. Aggregate Payment Mode Splits strictly using decimal.js
    let cashDec = new Decimal(0);
    let upiDec = new Decimal(0);
    let cardDec = new Decimal(0);
    let otherDec = new Decimal(0);
    let totalCollectedDec = new Decimal(0);

    for (const p of dailyPayments) {
      const amountDec = new Decimal(p.amount || '0.00');
      totalCollectedDec = totalCollectedDec.plus(amountDec);

      if (p.paymentMode === 'CASH') {
        cashDec = cashDec.plus(amountDec);
      } else if (p.paymentMode === 'UPI') {
        upiDec = upiDec.plus(amountDec);
      } else if (p.paymentMode === 'CARD') {
        cardDec = cardDec.plus(amountDec);
      } else {
        otherDec = otherDec.plus(amountDec);
      }
    }

    const report: DailyFinancialsReport = {
      date: dateStr,
      totalRevenue: totalRevenueDec.toFixed(2),
      totalTax: totalTaxDec.toFixed(2),
      totalAdvancePaid: totalAdvancePaidDec.toFixed(2),
      totalBalanceDue: totalBalanceDueDec.toFixed(2),
      totalOrders: dailyInvoices.length,
      paymentSplits: {
        cash: cashDec.toFixed(2),
        upi: upiDec.toFixed(2),
        card: cardDec.toFixed(2),
        other: otherDec.toFixed(2),
        totalCollected: totalCollectedDec.toFixed(2),
      },
      transactions,
    };

    return { success: true, data: report };
  } catch (error: unknown) {
    console.error('[getDailyFinancials] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate daily report',
    };
  }
}
