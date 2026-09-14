'use server';

import Decimal from 'decimal.js';
import { and, desc, eq, gte, lte, inArray, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  invoices,
  payments,
  customers,
  branches,
  orderStatusEnum,
  paymentStatusEnum,
  type OrderStatus,
  type PaymentStatus,
  type PaymentMode,
} from '@/db/schema';
import { getCurrentSession } from '@/lib/auth-utils';

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
  branchId?: string | null;
  branchName?: string | null;
}

export interface DailyFinancialsReport {
  date: string; // Human-readable range or date string
  startDate?: string;
  endDate?: string;
  preset?: string;
  totalRevenue: string;
  totalTax: string;
  totalAdvancePaid: string;
  totalBalanceDue: string;
  totalOrders: number;
  activeBranchScope?: string;
  paymentSplits: {
    cash: string;
    upi: string;
    card: string;
    other: string;
    totalCollected: string;
  };
  transactions: DailyReportTransaction[];
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'all'
  | 'custom';

export interface FinancialsReportFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  preset?: DatePreset;
  paymentStatus?: string; // 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'
  paymentMode?: string; // 'ALL' | 'CASH' | 'UPI' | 'CARD'
  orderStatus?: string; // 'ALL' | OrderStatus
  branchIds?: string[];
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveDateRange(filter?: FinancialsReportFilter | string | Date) {
  const now = new Date();
  const todayStr = formatDateStr(now);

  if (!filter) {
    return {
      preset: 'all' as DatePreset,
      startDate: undefined,
      endDate: undefined,
      start: null,
      end: null,
      label: 'All Time',
    };
  }

  if (filter instanceof Date) {
    const dStr = formatDateStr(filter);
    return {
      preset: 'custom' as DatePreset,
      startDate: dStr,
      endDate: dStr,
      start: new Date(`${dStr}T00:00:00.000`),
      end: new Date(`${dStr}T23:59:59.999`),
      label: dStr,
    };
  }

  if (typeof filter === 'string') {
    const dStr = filter.trim().substring(0, 10);
    return {
      preset: 'custom' as DatePreset,
      startDate: dStr,
      endDate: dStr,
      start: new Date(`${dStr}T00:00:00.000`),
      end: new Date(`${dStr}T23:59:59.999`),
      label: dStr,
    };
  }

  const preset = filter.preset || (filter.startDate && filter.endDate ? 'custom' : 'all');

  switch (preset) {
    case 'today': {
      return {
        preset: 'today' as DatePreset,
        startDate: todayStr,
        endDate: todayStr,
        start: new Date(`${todayStr}T00:00:00.000`),
        end: new Date(`${todayStr}T23:59:59.999`),
        label: `Today (${todayStr})`,
      };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateStr(y);
      return {
        preset: 'yesterday' as DatePreset,
        startDate: yStr,
        endDate: yStr,
        start: new Date(`${yStr}T00:00:00.000`),
        end: new Date(`${yStr}T23:59:59.999`),
        label: `Yesterday (${yStr})`,
      };
    }
    case 'last7days': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      const sStr = formatDateStr(s);
      return {
        preset: 'last7days' as DatePreset,
        startDate: sStr,
        endDate: todayStr,
        start: new Date(`${sStr}T00:00:00.000`),
        end: new Date(`${todayStr}T23:59:59.999`),
        label: `Last 7 Days (${sStr} to ${todayStr})`,
      };
    }
    case 'last30days': {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      const sStr = formatDateStr(s);
      return {
        preset: 'last30days' as DatePreset,
        startDate: sStr,
        endDate: todayStr,
        start: new Date(`${sStr}T00:00:00.000`),
        end: new Date(`${todayStr}T23:59:59.999`),
        label: `Last 30 Days (${sStr} to ${todayStr})`,
      };
    }
    case 'thisMonth': {
      const sStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return {
        preset: 'thisMonth' as DatePreset,
        startDate: sStr,
        endDate: todayStr,
        start: new Date(`${sStr}T00:00:00.000`),
        end: new Date(`${todayStr}T23:59:59.999`),
        label: `This Month (${sStr} to ${todayStr})`,
      };
    }
    case 'custom': {
      const sStr = filter.startDate || todayStr;
      const eStr = filter.endDate || sStr;
      return {
        preset: 'custom' as DatePreset,
        startDate: sStr,
        endDate: eStr,
        start: new Date(`${sStr}T00:00:00.000`),
        end: new Date(`${eStr}T23:59:59.999`),
        label: `${sStr} to ${eStr}`,
      };
    }
    case 'all':
    default: {
      return {
        preset: 'all' as DatePreset,
        startDate: undefined,
        endDate: undefined,
        start: null,
        end: null,
        label: 'All Time',
      };
    }
  }
}

/**
 * Fetch financial report and audit ledger with support for custom date ranges,
 * presets, and status filtering.
 */
export async function getFinancialsReport(
  filterInput?: FinancialsReportFilter | string | Date
): Promise<{
  success: boolean;
  data?: DailyFinancialsReport;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    const range = resolveDateRange(filterInput);
    const filterObj = typeof filterInput === 'object' && !(filterInput instanceof Date) ? filterInput : {};

    const conditions: SQL[] = [eq(invoices.organizationId, session.organizationId)];

    // Date range filter
    if (range.start) {
      conditions.push(gte(invoices.createdAt, range.start));
    }
    if (range.end) {
      conditions.push(lte(invoices.createdAt, range.end));
    }

    // Payment status filter
    if (
      filterObj.paymentStatus &&
      filterObj.paymentStatus !== 'ALL' &&
      paymentStatusEnum.enumValues.includes(filterObj.paymentStatus as PaymentStatus)
    ) {
      conditions.push(eq(invoices.paymentStatus, filterObj.paymentStatus as PaymentStatus));
    }

    // Order status filter
    if (
      filterObj.orderStatus &&
      filterObj.orderStatus !== 'ALL' &&
      orderStatusEnum.enumValues.includes(filterObj.orderStatus as OrderStatus)
    ) {
      conditions.push(eq(invoices.orderStatus, filterObj.orderStatus as OrderStatus));
    }

    // Branch filter
    if (
      filterObj.branchIds &&
      filterObj.branchIds.length > 0 &&
      !filterObj.branchIds.includes('all')
    ) {
      conditions.push(inArray(invoices.branchId, filterObj.branchIds));
    }

    // Query invoices joined with customer and branch
    const baseQuery = db
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
        branchId: invoices.branchId,
        branchName: branches.name,
        createdAt: invoices.createdAt,
        customerName: customers.fullName,
        customerPhone: customers.phone,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(branches, eq(invoices.branchId, branches.id));

    const matchingInvoices = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(invoices.createdAt))
      : await baseQuery.orderBy(desc(invoices.createdAt));

    // Fetch payments associated with matching invoices
    const invoiceIds = matchingInvoices.map((inv) => inv.id);

    let associatedPayments: (typeof payments.$inferSelect)[] = [];
    if (invoiceIds.length > 0) {
      associatedPayments = await db
        .select()
        .from(payments)
        .where(inArray(payments.invoiceId, invoiceIds));
    }

    // Map payments by invoiceId for fast lookup
    const paymentsByInvoice = new Map<string, (typeof payments.$inferSelect)[]>();
    for (const p of associatedPayments) {
      const existing = paymentsByInvoice.get(p.invoiceId) || [];
      existing.push(p);
      paymentsByInvoice.set(p.invoiceId, existing);
    }

    // Filter by payment mode if requested
    let finalInvoices = matchingInvoices;
    if (filterObj.paymentMode && filterObj.paymentMode !== 'ALL') {
      const targetMode = filterObj.paymentMode;
      finalInvoices = matchingInvoices.filter((inv) => {
        const orderPayments = paymentsByInvoice.get(inv.id) || [];
        return orderPayments.some((p) => p.paymentMode === targetMode);
      });
    }

    // Aggregate metrics using decimal.js
    let totalRevenueDec = new Decimal(0);
    let totalTaxDec = new Decimal(0);
    let totalAdvancePaidDec = new Decimal(0);
    let totalBalanceDueDec = new Decimal(0);

    const transactions: DailyReportTransaction[] = finalInvoices.map((inv) => {
      const grandTotalDec = new Decimal(inv.grandTotal || '0.00');
      const taxDec = new Decimal(inv.totalTax || '0.00');
      const advanceDec = new Decimal(inv.advancePaid || '0.00');
      const balanceDec = new Decimal(inv.balanceDue || '0.00');

      totalRevenueDec = totalRevenueDec.plus(grandTotalDec);
      totalTaxDec = totalTaxDec.plus(taxDec);
      totalAdvancePaidDec = totalAdvancePaidDec.plus(advanceDec);
      totalBalanceDueDec = totalBalanceDueDec.plus(balanceDec);

      // Determine payment mode label
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
        branchId: inv.branchId,
        branchName: inv.branchName,
      };
    });

    // Payment Mode Splits for matching invoices
    let cashDec = new Decimal(0);
    let upiDec = new Decimal(0);
    let cardDec = new Decimal(0);
    let otherDec = new Decimal(0);
    let totalCollectedDec = new Decimal(0);

    const finalInvoiceIdSet = new Set(finalInvoices.map((inv) => inv.id));
    for (const p of associatedPayments) {
      if (!finalInvoiceIdSet.has(p.invoiceId)) continue;

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
      date: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      preset: range.preset,
      totalRevenue: totalRevenueDec.toFixed(2),
      totalTax: totalTaxDec.toFixed(2),
      totalAdvancePaid: totalAdvancePaidDec.toFixed(2),
      totalBalanceDue: totalBalanceDueDec.toFixed(2),
      totalOrders: finalInvoices.length,
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
    console.error('[getFinancialsReport] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate financial report',
    };
  }
}

/**
 * Backward compatibility alias for getFinancialsReport.
 */
export async function getDailyFinancials(
  targetDate?: Date | string | FinancialsReportFilter
): Promise<{
  success: boolean;
  data?: DailyFinancialsReport;
  error?: string;
}> {
  return getFinancialsReport(targetDate);
}
