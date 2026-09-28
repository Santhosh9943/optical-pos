'use server';

/**
 * OptixOS Operational Dashboard Server Actions
 * 
 * Provides live operational telemetry, real-time KPI aggregations,
 * recent orders feed, workshop Kanban snapshot, payment mode splits,
 * and low stock warnings calculated with decimal.js.
 */

import { db } from '@/db';
import {
  invoices,
  customers,
  branches,
  inventoryItems,
  payments,
} from '@/db/schema';
import { eq, and, desc, sql, gte, lt, inArray } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { getCurrentSession } from '@/lib/auth-utils';
import { withCache } from '@/lib/cache';

export interface DashboardOperationalMetrics {
  kpis: {
    todayRevenue: string;
    revenueChangePct: number;
    orderCount: number;
    balanceDue: string;
    activeLabOrders: number;
    lowStockCount: number;
  };
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    patientName: string;
    phone: string;
    total: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  labOrderSummary: Array<{
    id: string;
    patientName: string;
    status: string;
    promisedDate: string;
    isOverdue: boolean;
  }>;
  paymentModeSplit: Array<{
    mode: string;
    total: string;
    percentage: number;
  }>;
  lowStockItems: Array<{
    id: string;
    sku: string;
    itemName: string;
    stockQuantity: number;
    threshold: number;
  }>;
  activeBranchName: string;
}

export async function getDashboardOperationalMetricsAction(
  branchId?: string
): Promise<DashboardOperationalMetrics> {
  const session = await getCurrentSession();
  const effectiveBranchId = branchId || session.branchId;
  const orgId = session.organizationId;

  return await withCache(
    {
      orgId,
      namespace: 'dashboard',
      key: `metrics:${effectiveBranchId}`,
      ttl: 30, // 30-second TTL
    },
    async () => {
      // 1. Date Windows: Today and Yesterday
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

      // Fetch active branch name
      const [branchRecord] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, effectiveBranchId))
        .limit(1);

      const activeBranchName = branchRecord?.name || 'Main Branch';

      // 2. Today's Invoices & Revenue
      const todayInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          grandTotal: invoices.grandTotal,
          balanceDue: invoices.balanceDue,
          paymentStatus: invoices.paymentStatus,
          orderStatus: invoices.orderStatus,
          createdAt: invoices.createdAt,
          patientName: customers.fullName,
          phone: customers.phone,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(
          and(
            eq(invoices.organizationId, orgId),
            eq(invoices.branchId, effectiveBranchId),
            gte(invoices.createdAt, todayStart),
            lt(invoices.createdAt, tomorrowStart)
          )
        )
        .orderBy(desc(invoices.createdAt));

      // Calculate Today's Revenue and Balance with decimal.js
      let todayRevenueDec = new Decimal(0);
      let balanceDueDec = new Decimal(0);
      for (const inv of todayInvoices) {
        todayRevenueDec = todayRevenueDec.plus(new Decimal(inv.grandTotal || 0));
        balanceDueDec = balanceDueDec.plus(new Decimal(inv.balanceDue || 0));
      }

      // 3. Yesterday's Revenue for % Trend
      const yesterdayInvoices = await db
        .select({ grandTotal: invoices.grandTotal })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, orgId),
            eq(invoices.branchId, effectiveBranchId),
            gte(invoices.createdAt, yesterdayStart),
            lt(invoices.createdAt, todayStart)
          )
        );

      let yesterdayRevenueDec = new Decimal(0);
      for (const yInv of yesterdayInvoices) {
        yesterdayRevenueDec = yesterdayRevenueDec.plus(new Decimal(yInv.grandTotal || 0));
      }

      let revenueChangePct = 0;
      if (!yesterdayRevenueDec.isZero()) {
        revenueChangePct = todayRevenueDec
          .minus(yesterdayRevenueDec)
          .dividedBy(yesterdayRevenueDec)
          .times(100)
          .toDecimalPlaces(1)
          .toNumber();
      } else if (!todayRevenueDec.isZero()) {
        revenueChangePct = 100;
      }

      // 4. Recent Invoices (Last 6 overall for this store)
      const rawRecent = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.grandTotal,
          paymentStatus: invoices.paymentStatus,
          createdAt: invoices.createdAt,
          patientName: customers.fullName,
          phone: customers.phone,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(
          and(
            eq(invoices.organizationId, orgId),
            eq(invoices.branchId, effectiveBranchId)
          )
        )
        .orderBy(desc(invoices.createdAt))
        .limit(6);

      const recentOrders = rawRecent.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        patientName: r.patientName || 'Customer',
        phone: r.phone || '',
        total: r.total,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt.toISOString(),
      }));

      // 5. Active Workshop Lab Orders
      const activeLabStatuses = [
        'ORDERED',
        'SENT_TO_LAB',
        'IN_FITTING',
        'READY_FOR_COLLECTION',
      ] as const;

      const rawLabOrders = await db
        .select({
          id: invoices.id,
          orderStatus: invoices.orderStatus,
          promisedDate: invoices.promisedDeliveryDate,
          patientName: customers.fullName,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(
          and(
            eq(invoices.organizationId, orgId),
            eq(invoices.branchId, effectiveBranchId),
            inArray(invoices.orderStatus, activeLabStatuses)
          )
        )
        .orderBy(desc(invoices.createdAt))
        .limit(5);

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const labOrderSummary = rawLabOrders.map((lo) => {
        const isOverdue = lo.promisedDate ? new Date(lo.promisedDate) < todayMidnight : false;
        return {
          id: lo.id,
          patientName: lo.patientName || 'Patient',
          status: lo.orderStatus,
          promisedDate: lo.promisedDate
            ? new Date(lo.promisedDate).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })
            : 'Unscheduled',
          isOverdue,
        };
      });

      // 6. Payment Modes Breakdown for Today
      const todayPayments = await db
        .select({
          paymentMode: payments.paymentMode,
          amount: payments.amount,
        })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, orgId),
            eq(payments.branchId, effectiveBranchId),
            gte(payments.createdAt, todayStart),
            lt(payments.createdAt, tomorrowStart)
          )
        );

      const modeTotals: Record<string, Decimal> = {
        CASH: new Decimal(0),
        UPI: new Decimal(0),
        CARD: new Decimal(0),
        CREDIT: new Decimal(0),
      };

      let totalCollectedDec = new Decimal(0);
      for (const p of todayPayments) {
        const mode = p.paymentMode || 'CASH';
        const amt = new Decimal(p.amount || 0);
        if (!modeTotals[mode]) modeTotals[mode] = new Decimal(0);
        modeTotals[mode] = modeTotals[mode].plus(amt);
        totalCollectedDec = totalCollectedDec.plus(amt);
      }

      const paymentModeSplit = Object.entries(modeTotals).map(([mode, dec]) => {
        const pct = totalCollectedDec.isZero()
          ? 0
          : dec.dividedBy(totalCollectedDec).times(100).toDecimalPlaces(0).toNumber();
        return {
          mode,
          total: dec.toFixed(2),
          percentage: pct,
        };
      });

      // 7. Low Stock Alerts
      const rawLowStock = await db
        .select({
          id: inventoryItems.id,
          sku: inventoryItems.sku,
          brand: inventoryItems.brand,
          model: inventoryItems.model,
          stockQuantity: inventoryItems.stockQuantity,
          lowStockThreshold: inventoryItems.lowStockThreshold,
        })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.organizationId, orgId),
            eq(inventoryItems.branchId, effectiveBranchId),
            eq(inventoryItems.isActive, true),
            sql`${inventoryItems.stockQuantity} <= ${inventoryItems.lowStockThreshold}`
          )
        )
        .limit(5);

      const lowStockItems = rawLowStock.map((item) => ({
        id: item.id,
        sku: item.sku,
        itemName: `${item.brand || ''} ${item.model || ''}`.trim() || item.sku,
        stockQuantity: item.stockQuantity,
        threshold: item.lowStockThreshold,
      }));

      return {
        kpis: {
          todayRevenue: todayRevenueDec.toFixed(2),
          revenueChangePct,
          orderCount: todayInvoices.length,
          balanceDue: balanceDueDec.toFixed(2),
          activeLabOrders: rawLabOrders.length,
          lowStockCount: rawLowStock.length,
        },
        recentOrders,
        labOrderSummary,
        paymentModeSplit,
        lowStockItems,
        activeBranchName,
      };
    }
  );
}
