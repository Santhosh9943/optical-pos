'use server';

import { db } from '@/db';
import {
  invoices,
  invoiceItems,
  customers,
  branches,
  organizations,
  opticalPrescriptions,
  payments,
} from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/auth-utils';
import { generateReceiptToken, verifyReceiptToken } from '@/lib/crypto-utils';

export interface PublicReceiptItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  discountPerUnit: string;
  lineTotal: string;
  taxRate: string;
  lensType?: string | null;
  coating?: string | null;
  lensMaterial?: string | null;
  fittingNote?: string | null;
  isCustomerOwnFrame?: boolean;
}

export interface PublicPrescription {
  odSphere: string | null;
  odCylinder: string | null;
  odAxis: number | null;
  odAdd: string | null;
  odPd: string | null;
  osSphere: string | null;
  osCylinder: string | null;
  osAxis: number | null;
  osAdd: string | null;
  osPd: string | null;
  binocularPd: string | null;
  prescribedAt: string;
}

export interface PublicReceiptData {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: string;
  discountAmount: string;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  totalTax: string;
  grandTotal: string;
  advancePaid: string;
  balanceDue: string;
  notes?: string | null;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    city?: string | null;
  };
  organization: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  } | null;
  items: PublicReceiptItem[];
  prescription: PublicPrescription | null;
  payments: {
    id: string;
    amount: string;
    paymentMode: string;
    reference?: string | null;
    paidAt: string;
  }[];
  receiptToken?: string;
}

export async function getPublicReceiptAction(
  idOrNumber: string,
  token?: string
): Promise<{ success: boolean; data?: PublicReceiptData; error?: string }> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);

    const condition = isUuid
      ? or(eq(invoices.id, idOrNumber), eq(invoices.invoiceNumber, idOrNumber))
      : eq(invoices.invoiceNumber, idOrNumber);

    const invoiceRows = await db
      .select({
        invoice: invoices,
        customer: customers,
        branch: branches,
        org: organizations,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(branches, eq(invoices.branchId, branches.id))
      .leftJoin(organizations, eq(invoices.organizationId, organizations.id))
      .where(condition)
      .limit(1);

    if (invoiceRows.length === 0 || !invoiceRows[0].invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    const { invoice, customer, branch, org } = invoiceRows[0];

    // Cryptographic Access Control: Check tenant session or valid receipt token
    const session = await getCurrentSession();
    const isTenantMember = Boolean(
      session?.organizationId && session.organizationId === invoice.organizationId
    );

    if (!isTenantMember && token) {
      const isTokenValid = verifyReceiptToken(invoice.id, invoice.createdAt, token);
      if (!isTokenValid) {
        return { success: false, error: 'Unauthorized: Invalid or expired receipt access token' };
      }
    } else if (!isTenantMember && !token) {
      return { success: false, error: 'Unauthorized: Receipt access token is required' };
    }

    // Fetch line items
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    // Fetch prescription if attached
    let prescription: PublicPrescription | null = null;
    if (invoice.prescriptionId) {
      const rxRows = await db
        .select()
        .from(opticalPrescriptions)
        .where(eq(opticalPrescriptions.id, invoice.prescriptionId))
        .limit(1);

      if (rxRows.length > 0) {
        const rx = rxRows[0];
        prescription = {
          odSphere: rx.odSphere,
          odCylinder: rx.odCylinder,
          odAxis: rx.odAxis,
          odAdd: rx.odAdd,
          odPd: rx.odPd,
          osSphere: rx.osSphere,
          osCylinder: rx.osCylinder,
          osAxis: rx.osAxis,
          osAdd: rx.osAdd,
          osPd: rx.osPd,
          binocularPd: rx.binocularPd,
          prescribedAt: rx.prescribedAt ? rx.prescribedAt.toISOString() : rx.createdAt.toISOString(),
        };
      }
    }

    // Fetch payments
    const paymentsList = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id));

    const receiptData: PublicReceiptData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt.toISOString(),
      orderStatus: invoice.orderStatus,
      paymentStatus: invoice.paymentStatus,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxableValue: invoice.taxableValue,
      cgstAmount: invoice.cgstAmount,
      sgstAmount: invoice.sgstAmount,
      totalTax: invoice.totalTax,
      grandTotal: invoice.grandTotal,
      advancePaid: invoice.advancePaid,
      balanceDue: invoice.balanceDue,
      notes: invoice.notes,
      customer: {
        id: customer?.id || '',
        fullName: customer?.fullName || 'Valued Customer',
        phone: customer?.phone || '',
        city: customer?.city || null,
      },
      organization: {
        id: org?.id || '',
        name: org?.name || 'Optix Vision Care',
      },
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
          }
        : null,
      items: items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPerUnit: i.discountPerUnit,
        lineTotal: i.lineTotal,
        taxRate: i.taxRate,
        lensType: i.lensType,
        coating: i.coating,
        lensMaterial: i.lensMaterial,
        fittingNote: i.fittingNote,
        isCustomerOwnFrame: i.isCustomerOwnFrame,
      })),
      prescription,
      payments: paymentsList.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentMode: p.paymentMode,
        reference: p.transactionReference,
        paidAt: p.createdAt.toISOString(),
      })),
      receiptToken: generateReceiptToken(invoice.id, invoice.createdAt),
    };

    return { success: true, data: receiptData };
  } catch (err: any) {
    console.error('[getPublicReceiptAction] Error:', err);
    return { success: false, error: err.message || 'Failed to fetch invoice' };
  }
}
