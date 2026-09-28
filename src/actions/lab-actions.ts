'use server';

import { and, desc, eq, notInArray, isNull, or, inArray, type SQL } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import Decimal from 'decimal.js';
import {
  invoices,
  orderStatusEnum,
  type OrderStatus,
} from '@/db/schema';
import { requireAuthSession } from '@/lib/auth-utils';
import type { PrintOrderData } from '@/components/pos/print-layouts';

export interface LabOrderItemDetail {
  id: string;
  inventoryItemId: string | null;
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  discountPerUnit: string;
  lineTotal: string;
  category?: string;
  brand?: string | null;
  model?: string | null;
  lensType: string | null;
  coating: string | null;
  lensMaterial: string | null;
  patientId: string | null;
  patientName: string | null;
  patientRelation?: string | null;
  prescriptionId: string | null;
  isCustomerOwnFrame: boolean;
  fittingNote: string | null;
}

export interface LabOrderSummary {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGender: string | null;
  customerAge: number | null;
  orderStatus: OrderStatus;
  paymentStatus: string;
  grandTotal: string;
  advancePaid: string;
  balanceDue: string;
  promisedDeliveryDate: string | null;
  labJobTicketNumber: string | null;
  notes: string | null;
  branchId?: string | null;
  branchName?: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  items: LabOrderItemDetail[];
  printOrderData: PrintOrderData;
}

/**
 * Fetch all active lab orders (invoices where orderStatus is NOT DRAFT and NOT CANCELLED_REFUNDED).
 * Completed orders (DELIVERED_AND_CLOSED) are limited to the most recent 50 for performance.
 */
export async function getActiveLabOrders(branchIds?: string[]): Promise<LabOrderSummary[]> {
  try {
    const session = await requireAuthSession();

    const whereConditions: (SQL | undefined)[] = [
      // Strict tenant scope — rows without an organization are never visible to any tenant.
      eq(invoices.organizationId, session.organizationId),
      notInArray(invoices.orderStatus, ['DRAFT', 'CANCELLED_REFUNDED']),
    ];

    if (branchIds && branchIds.length > 0 && !branchIds.includes('all')) {
      whereConditions.push(
        or(
          inArray(invoices.branchId, branchIds),
          isNull(invoices.branchId)
        )
      );
    }

    const relations = {
      customer: true,
      prescription: true,
      branch: true,
      items: {
        with: {
          inventoryItem: true,
          patient: true,
          prescription: true,
        },
      },
      payments: true,
    } as const;

    // Two bounded queries instead of loading the whole invoice history: every open order,
    // plus only the 50 most recent completed ones.
    const [openOrders, completedOrders] = await Promise.all([
      db.query.invoices.findMany({
        where: and(...whereConditions, notInArray(invoices.orderStatus, ['DELIVERED_AND_CLOSED'])),
        with: relations,
        orderBy: [desc(invoices.createdAt)],
      }),
      db.query.invoices.findMany({
        where: and(...whereConditions, eq(invoices.orderStatus, 'DELIVERED_AND_CLOSED')),
        with: relations,
        orderBy: [desc(invoices.createdAt)],
        limit: 50,
      }),
    ]);
    const filteredOrders = [...openOrders, ...completedOrders];

    return filteredOrders.map((inv) => {
      const itemsList: LabOrderItemDetail[] = (inv.items || []).map((item) => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        sku: item.inventoryItem?.sku || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPerUnit: item.discountPerUnit,
        lineTotal: item.lineTotal,
        category: item.inventoryItem?.category || undefined,
        brand: item.inventoryItem?.brand || null,
        model: item.inventoryItem?.model || null,
        lensType: item.lensType || item.inventoryItem?.lensType || null,
        coating: item.coating || item.inventoryItem?.coating || null,
        lensMaterial: item.lensMaterial || item.inventoryItem?.lensMaterial || null,
        patientId: item.patientId,
        patientName: item.patient?.fullName || null,
        patientRelation: item.patient?.relationType || null,
        prescriptionId: item.prescriptionId,
        isCustomerOwnFrame: item.isCustomerOwnFrame,
        fittingNote: item.fittingNote,
      }));

      // Collect distinct prescriptions for multi-family orders
      const prescriptionsList: any[] = [];
      const seenRxIds = new Set<string>();

      if (inv.prescription) {
        seenRxIds.add(inv.prescription.id);
        prescriptionsList.push({
          patientId: inv.customer?.id,
          patientName: inv.customer?.fullName,
          relationType: inv.customer?.relationType || 'Self',
          odSphere: inv.prescription.odSphere,
          odCylinder: inv.prescription.odCylinder,
          odAxis: inv.prescription.odAxis,
          odAdd: inv.prescription.odAdd,
          odPd: inv.prescription.odPd,
          osSphere: inv.prescription.osSphere,
          osCylinder: inv.prescription.osCylinder,
          osAxis: inv.prescription.osAxis,
          osAdd: inv.prescription.osAdd,
          osPd: inv.prescription.osPd,
          binocularPd: inv.prescription.binocularPd,
          notes: inv.prescription.clinicalRemarks,
        });
      }

      for (const it of inv.items || []) {
        if (it.prescription && !seenRxIds.has(it.prescription.id)) {
          seenRxIds.add(it.prescription.id);
          prescriptionsList.push({
            patientId: it.patient?.id || it.patientId,
            patientName: it.patient?.fullName || 'Patient',
            relationType: it.patient?.relationType || 'Family',
            odSphere: it.prescription.odSphere,
            odCylinder: it.prescription.odCylinder,
            odAxis: it.prescription.odAxis,
            odAdd: it.prescription.odAdd,
            odPd: it.prescription.odPd,
            osSphere: it.prescription.osSphere,
            osCylinder: it.prescription.osCylinder,
            osAxis: it.prescription.osAxis,
            osAdd: it.prescription.osAdd,
            osPd: it.prescription.osPd,
            binocularPd: it.prescription.binocularPd,
            notes: it.prescription.clinicalRemarks,
          });
        }
      }

      const primaryPayment = (inv.payments && inv.payments[0]) || null;

      const printOrderData: PrintOrderData = {
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        createdAt: inv.createdAt.toISOString(),
        promisedDeliveryDate: inv.promisedDeliveryDate
          ? inv.promisedDeliveryDate.toISOString()
          : null,
        customer: {
          name: inv.customer?.fullName || 'Walk-in Customer',
          phone: inv.customer?.phone || '—',
          age: inv.customer?.age,
          gender: inv.customer?.gender,
          address: inv.customer?.addressLine1 || undefined,
          gstin: inv.customer?.gstin || undefined,
        },
        items: itemsList.map((i, idx) => {
          const stored = inv.items[idx];
          // Exact persisted line discount (gross − taxable) and the line's real GST slab,
          // so reprints match the original invoice (never a hardcoded 18%).
          const lineDiscount = Decimal.max(
            0,
            new Decimal(stored.unitPrice)
              .times(stored.quantity)
              .minus(new Decimal(stored.lineTotal).minus(stored.taxAmount))
          ).toFixed(2);
          return {
          id: i.id,
          sku: i.sku || undefined,
          description: i.description,
          hsnCode: stored.hsnCode || stored.inventoryItem?.hsnCode || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: lineDiscount,
          taxRate: stored.taxRate || '18.00',
          category: i.category,
          brand: i.brand,
          model: i.model,
          lensType: i.lensType,
          coating: i.coating,
          lensMaterial: i.lensMaterial,
          patientName: i.patientName,
          isCustomerOwnFrame: i.isCustomerOwnFrame,
          fittingNote: i.fittingNote,
          };
        }),
        prescription: prescriptionsList[0] || null,
        prescriptions: prescriptionsList,
        grandTotal: inv.grandTotal,
        advancePaid: inv.advancePaid,
        balanceDue: inv.balanceDue,
        paymentMode: primaryPayment?.paymentMode || 'CASH',
        paymentReference: primaryPayment?.transactionReference || undefined,
      };

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.fullName || 'Walk-in Customer',
        customerPhone: inv.customer?.phone || '—',
        customerGender: inv.customer?.gender || null,
        customerAge: inv.customer?.age || null,
        orderStatus: inv.orderStatus as OrderStatus,
        paymentStatus: inv.paymentStatus,
        grandTotal: inv.grandTotal,
        advancePaid: inv.advancePaid,
        balanceDue: inv.balanceDue,
        promisedDeliveryDate: inv.promisedDeliveryDate
          ? inv.promisedDeliveryDate.toISOString()
          : null,
        labJobTicketNumber: inv.labJobTicketNumber || null,
        notes: inv.notes || null,
        branchId: inv.branchId,
        branchName: inv.branch?.name || null,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
        itemsCount: itemsList.reduce((acc, item) => acc + item.quantity, 0),
        items: itemsList,
        printOrderData,
      };
    });
  } catch (error) {
    console.error('Failed to fetch active lab orders:', error);
    throw new Error('Could not retrieve active lab orders');
  }
}

/** Terminal states: an order in one of these can never be moved again (closed invoices are immutable). */
const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'DELIVERED_AND_CLOSED',
  'CANCELLED_REFUNDED',
]);

/**
 * @description Moves an order through the lab workflow for the caller's organization.
 * Closed (`DELIVERED_AND_CLOSED`) and cancelled orders are immutable; corrections require a credit note.
 * @param invoiceId - Invoice to update.
 * @param newStatus - Target workflow status.
 * @returns The applied status.
 */
export async function updateOrderStatus(
  invoiceId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; invoiceId: string; newStatus: OrderStatus }> {
  try {
    const session = await requireAuthSession();
    if (!orderStatusEnum.enumValues.includes(newStatus) || newStatus === 'DRAFT') {
      throw new Error(`Invalid order status: ${newStatus}`);
    }

    // Conditional update: tenant-scoped and refuses to touch terminal (immutable) orders.
    const updated = await db
      .update(invoices)
      .set({
        orderStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, session.organizationId),
          notInArray(invoices.orderStatus, Array.from(TERMINAL_ORDER_STATUSES))
        )
      )
      .returning({ id: invoices.id });

    if (updated.length === 0) {
      throw new Error('Order not found, or it is already closed and can no longer be changed.');
    }

    revalidatePath('/admin/lab-orders');

    return {
      success: true,
      invoiceId,
      newStatus,
    };
  } catch (error) {
    console.error(`Failed to update order status for invoice ${invoiceId}:`, error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update order status');
  }
}
