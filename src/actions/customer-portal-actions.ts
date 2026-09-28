'use server';

/**
 * Customer Portal Server Actions
 * 
 * Provides authenticated customer/patient data:
 * active spectacle orders, refraction/prescription history, digital receipts,
 * and linked family members.
 */

import { db } from '@/db';
import {
  customers,
  invoices,
  opticalPrescriptions,
  branches,
  organizations,
} from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/auth-utils';

export interface CustomerOrderSummary {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  grandTotal: string;
  advancePaid: string;
  balanceDue: string;
  branchName: string;
}

export interface CustomerPrescriptionSummary {
  id: string;
  prescribedAt: string;
  odSphere: string | null;
  odCylinder: string | null;
  odAxis: number | null;
  odAdd: string | null;
  osSphere: string | null;
  osCylinder: string | null;
  osAxis: number | null;
  osAdd: string | null;
}

export interface CustomerPortalData {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  orders: CustomerOrderSummary[];
  prescriptions: CustomerPrescriptionSummary[];
  practiceName: string;
}

export async function getCustomerPortalDataAction(): Promise<CustomerPortalData | null> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId || !session.user?.id) {
      return null;
    }

    // Locate customer record strictly matching the logged-in user's name
    let customerRecord = null;
    if (session.user.name) {
      const [matched] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, session.organizationId),
            eq(customers.fullName, session.user.name)
          )
        )
        .limit(1);
      if (matched) {
        customerRecord = matched;
      }
    }

    if (!customerRecord) {
      return {
        customer: {
          id: session.user.id,
          fullName: session.user.name || 'Valued Patient',
          phone: '',
          email: session.user.email,
        },
        orders: [],
        prescriptions: [],
        practiceName: session.organizationName || 'Optix Practice',
      };
    }

    // Fetch customer invoices/orders
    const rawInvoices = await db
      .select({
        invoice: invoices,
        branch: branches,
      })
      .from(invoices)
      .leftJoin(branches, eq(invoices.branchId, branches.id))
      .where(
        and(
          eq(invoices.organizationId, session.organizationId),
          eq(invoices.customerId, customerRecord.id)
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(10);

    const orders: CustomerOrderSummary[] = rawInvoices.map(({ invoice, branch }) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt.toISOString(),
      orderStatus: invoice.orderStatus,
      paymentStatus: invoice.paymentStatus,
      grandTotal: invoice.grandTotal,
      advancePaid: invoice.advancePaid,
      balanceDue: invoice.balanceDue,
      branchName: branch?.name || 'Main Branch',
    }));

    // Fetch customer prescriptions
    const rawRx = await db
      .select()
      .from(opticalPrescriptions)
      .where(eq(opticalPrescriptions.customerId, customerRecord.id))
      .orderBy(desc(opticalPrescriptions.prescribedAt))
      .limit(5);

    const prescriptions: CustomerPrescriptionSummary[] = rawRx.map((rx) => ({
      id: rx.id,
      prescribedAt: rx.prescribedAt.toISOString(),
      odSphere: rx.odSphere,
      odCylinder: rx.odCylinder,
      odAxis: rx.odAxis,
      odAdd: rx.odAdd,
      osSphere: rx.osSphere,
      osCylinder: rx.osCylinder,
      osAxis: rx.osAxis,
      osAdd: rx.osAdd,
    }));

    return {
      customer: {
        id: customerRecord.id,
        fullName: customerRecord.fullName,
        phone: customerRecord.phone,
        email: session.user?.email,
      },
      orders,
      prescriptions,
      practiceName: session.organizationName || 'Optix Practice',
    };
  } catch (error) {
    console.error('Error fetching customer portal data:', error);
    return null;
  }
}
