'use server';

import { and, desc, eq, notInArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  invoices,
  orderStatusEnum,
  type OrderStatus,
} from '@/db/schema';
import { getCurrentSession } from '@/lib/auth-utils';
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
export async function getActiveLabOrders(): Promise<LabOrderSummary[]> {
  try {
    const session = await getCurrentSession();

    const rawInvoices = await db.query.invoices.findMany({
      where: and(
        or(
          eq(invoices.organizationId, session.organizationId),
          isNull(invoices.organizationId)
        ),
        notInArray(invoices.orderStatus, ['DRAFT', 'CANCELLED_REFUNDED'])
      ),
      with: {
        customer: true,
        prescription: true,
        items: {
          with: {
            inventoryItem: true,
            patient: true,
            prescription: true,
          },
        },
        payments: true,
      },
      orderBy: [desc(invoices.createdAt)],
    });

    let completedCount = 0;
    const filteredOrders: typeof rawInvoices = [];

    for (const inv of rawInvoices) {
      if (inv.orderStatus === 'DELIVERED_AND_CLOSED') {
        if (completedCount < 50) {
          completedCount++;
          filteredOrders.push(inv);
        }
      } else {
        filteredOrders.push(inv);
      }
    }

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
        items: itemsList.map((i) => ({
          id: i.id,
          sku: i.sku || undefined,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: '18.00',
          category: i.category,
          brand: i.brand,
          model: i.model,
          lensType: i.lensType,
          coating: i.coating,
          lensMaterial: i.lensMaterial,
          patientName: i.patientName,
          isCustomerOwnFrame: i.isCustomerOwnFrame,
          fittingNote: i.fittingNote,
        })),
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

/**
 * Update the order status of a specific invoice.
 */
export async function updateOrderStatus(
  invoiceId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; invoiceId: string; newStatus: OrderStatus }> {
  try {
    if (!orderStatusEnum.enumValues.includes(newStatus)) {
      throw new Error(`Invalid order status: ${newStatus}`);
    }

    await db
      .update(invoices)
      .set({
        orderStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    revalidatePath('/admin/lab-orders');

    return {
      success: true,
      invoiceId,
      newStatus,
    };
  } catch (error) {
    console.error(`Failed to update order status for invoice ${invoiceId}:`, error);
    throw new Error('Failed to update order status');
  }
}
