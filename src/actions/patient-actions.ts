'use server';

import Decimal from 'decimal.js';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  customers,
  invoices,
  invoiceItems,
  opticalPrescriptions,
  branches,
} from '@/db/schema';
import { getCurrentSession } from '@/lib/auth-utils';
import type { POSPatient } from '@/store/pos-store';

export interface CreatePatientInput {
  fullName: string;
  phone: string;
  age?: number | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  relationType?: string;
  primaryCustomerId?: string | null;
}

export interface UpdatePatientInput {
  fullName?: string;
  phone?: string;
  age?: number | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  relationType?: string;
}

export async function createPatientAction(input: CreatePatientInput): Promise<{
  success: boolean;
  patient?: typeof customers.$inferSelect;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const fullName = input.fullName.trim();
    const phone = input.phone.trim();

    if (!fullName) {
      return { success: false, error: 'Full name is required' };
    }
    if (!phone) {
      return { success: false, error: 'Phone number is required' };
    }

    const [newCustomer] = await db
      .insert(customers)
      .values({
        organizationId: session.organizationId,
        fullName,
        phone,
        age: input.age ?? null,
        gender: input.gender ?? null,
        addressLine1: input.addressLine1?.trim() || null,
        addressLine2: input.addressLine2?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        pincode: input.pincode?.trim() || null,
        relationType: input.relationType?.trim() || 'Self',
        primaryCustomerId: input.primaryCustomerId || null,
        advanceBalance: '0.00',
      })
      .returning();

    revalidatePath('/admin/patients');
    revalidatePath('/pos/new-bill');

    return { success: true, patient: newCustomer };
  } catch (err: unknown) {
    console.error('[createPatientAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create patient',
    };
  }
}

export async function updatePatientAction(
  id: string,
  input: UpdatePatientInput
): Promise<{
  success: boolean;
  patient?: typeof customers.$inferSelect;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const updateData: Partial<typeof customers.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.fullName !== undefined) {
      const name = input.fullName.trim();
      if (!name) return { success: false, error: 'Name cannot be empty' };
      updateData.fullName = name;
    }

    if (input.phone !== undefined) {
      const ph = input.phone.trim();
      if (!ph) return { success: false, error: 'Phone cannot be empty' };
      updateData.phone = ph;
    }

    if (input.age !== undefined) updateData.age = input.age;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.addressLine1 !== undefined)
      updateData.addressLine1 = input.addressLine1?.trim() || null;
    if (input.addressLine2 !== undefined)
      updateData.addressLine2 = input.addressLine2?.trim() || null;
    if (input.city !== undefined) updateData.city = input.city?.trim() || null;
    if (input.state !== undefined) updateData.state = input.state?.trim() || null;
    if (input.pincode !== undefined)
      updateData.pincode = input.pincode?.trim() || null;
    if (input.relationType !== undefined)
      updateData.relationType = input.relationType?.trim() || 'Self';

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return { success: false, error: 'Patient not found or unauthorized' };
    }

    revalidatePath('/admin/patients');
    revalidatePath('/pos/new-bill');

    return { success: true, patient: updated };
  } catch (err: unknown) {
    console.error('[updatePatientAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update patient',
    };
  }
}

export async function deletePatientAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    // Check if customer exists under tenant
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!customer) {
      return { success: false, error: 'Patient not found' };
    }

    // Soft-delete the customer to safeguard historical orders and prescriptions
    await db
      .update(customers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, session.organizationId)
        )
      );

    revalidatePath('/admin/patients');
    revalidatePath('/pos/new-bill');

    return { success: true };
  } catch (err: unknown) {
    console.error('[deletePatientAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete patient',
    };
  }
}

export interface PatientSummary {
  id: string;
  fullName: string;
  phone: string;
  age: number | null;
  gender: string | null;
  city: string | null;
  advanceBalance: string;
  totalOrders: number;
  lastVisitDate: string | null;
  lifetimeValue: string;
  relationType?: string;
  primaryCustomerId?: string | null;
}

export interface FamilyMemberLinkInfo {
  id: string;
  fullName: string;
  phone: string;
  relationType: string;
  age: number | null;
  gender: string | null;
  primaryCustomerId: string | null;
  isPrimary: boolean;
}

export interface PatientPrescriptionHistory {
  id: string;
  prescribedAt: string;
  patientId: string;
  patientName: string;
  relationType?: string;
  isDependent: boolean;
  // OD (Right Eye)
  odSphere: string | null;
  odCylinder: string | null;
  odAxis: number | null;
  odAdd: string | null;
  odPd: string | null;
  // OS (Left Eye)
  osSphere: string | null;
  osCylinder: string | null;
  osAxis: number | null;
  osAdd: string | null;
  osPd: string | null;
  binocularPd: string | null;
  clinicalRemarks: string | null;
}

export interface PatientOrderHistoryItem {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  grandTotal: string;
  advancePaid: string;
  balanceDue: string;
  itemCount: number;
  itemDescriptions: string[];
  billedToName?: string;
  isWearerOnly?: boolean;
  branchId?: string | null;
  branchName?: string | null;
}

export interface PatientDetailHistory {
  patient: {
    id: string;
    fullName: string;
    phone: string;
    hasOwnPhone: boolean;
    ownPhone: string | null;
    linkedPrimaryPhone: string | null;
    linkedPrimaryName: string | null;
    age: number | null;
    gender: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    advanceBalance: string;
    relationType: string;
    primaryCustomerId: string | null;
    createdAt: string;
  };
  lifetimeValue: string;
  totalBalanceDue: string;
  // Segregated Prescriptions
  personalPrescriptions: PatientPrescriptionHistory[];
  familyPrescriptions: PatientPrescriptionHistory[];
  prescriptions: PatientPrescriptionHistory[];
  // Segregated Orders
  billedOrders: PatientOrderHistoryItem[];
  patientOrders: PatientOrderHistoryItem[];
  orders: PatientOrderHistoryItem[];
  // Linked Family Members
  familyMembers: FamilyMemberLinkInfo[];
}

/**
 * Fetch all patients with aggregated order counts and most recent visit date.
 */
export async function getPatients(branchIds?: string[]): Promise<{
  success: boolean;
  patients: PatientSummary[];
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const allCustomers = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, session.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .orderBy(desc(customers.createdAt));

    const invoiceConditions = [eq(invoices.organizationId, session.organizationId)];
    if (branchIds && branchIds.length > 0 && !branchIds.includes('all')) {
      invoiceConditions.push(inArray(invoices.branchId, branchIds));
    }

    const allInvoices = await db
      .select({
        id: invoices.id,
        customerId: invoices.customerId,
        grandTotal: invoices.grandTotal,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(...invoiceConditions))
      .orderBy(desc(invoices.createdAt));

    // Group invoices by customer
    const invoicesByCustomer = new Map<
      string,
      { totalOrders: number; lastVisit: Date | null; totalLtv: Decimal }
    >();

    for (const inv of allInvoices) {
      const existing = invoicesByCustomer.get(inv.customerId) || {
        totalOrders: 0,
        lastVisit: null,
        totalLtv: new Decimal(0),
      };

      existing.totalOrders += 1;
      if (!existing.lastVisit || inv.createdAt > existing.lastVisit) {
        existing.lastVisit = inv.createdAt;
      }
      existing.totalLtv = existing.totalLtv.plus(
        new Decimal(inv.grandTotal || '0.00')
      );
      invoicesByCustomer.set(inv.customerId, existing);
    }

    const patients: PatientSummary[] = allCustomers.map((c) => {
      const stats = invoicesByCustomer.get(c.id);
      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        age: c.age,
        gender: c.gender,
        city: c.city,
        advanceBalance: c.advanceBalance || '0.00',
        totalOrders: stats?.totalOrders || 0,
        lastVisitDate: stats?.lastVisit ? stats.lastVisit.toISOString() : null,
        lifetimeValue: stats ? stats.totalLtv.toFixed(2) : '0.00',
        relationType: c.relationType || 'Self',
        primaryCustomerId: c.primaryCustomerId,
      };
    });

    // Sort by last visit date descending (or customer creation date)
    patients.sort((a, b) => {
      const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
      const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
      return dateB - dateA;
    });

    return { success: true, patients };
  } catch (err: unknown) {
    console.error('[getPatients] Error:', err);
    return {
      success: false,
      patients: [],
      error: err instanceof Error ? err.message : 'Failed to fetch patients list',
    };
  }
}

/**
 * Automatically fetch the complete linked family group for any customer.
 * Traverses both directions (parent/primary and dependents).
 */
export async function getLinkedFamilyGroup(customerId: string): Promise<{
  success: boolean;
  members: POSPatient[];
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const [target] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!target) {
      return { success: false, error: 'Customer not found', members: [] };
    }

    // Determine the root / primary ID
    const rootId = target.primaryCustomerId || target.id;

    // Fetch all related family records
    const familyRows = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, session.organizationId),
          or(
            eq(customers.id, rootId),
            eq(customers.primaryCustomerId, rootId),
            eq(customers.id, customerId)
          )
        )
      )
      .orderBy(customers.createdAt);

    const members: POSPatient[] = familyRows.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      age: c.age,
      gender: c.gender,
      relationType: c.relationType || (c.id === rootId ? 'Self' : 'Family'),
      primaryCustomerId: c.primaryCustomerId,
      advanceBalance: c.advanceBalance || '0.00',
      city: c.city,
      isPayer: c.id === target.id,
    }));

    return { success: true, members };
  } catch (err: unknown) {
    console.error('[getLinkedFamilyGroup] Error:', err);
    return {
      success: false,
      members: [],
      error: err instanceof Error ? err.message : 'Failed to load family group',
    };
  }
}

/**
 * Link an existing customer into an active family group.
 */
export async function linkExistingCustomerToFamily(
  primaryCustomerId: string,
  targetCustomerId: string,
  relationType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (primaryCustomerId === targetCustomerId) {
      return { success: false, error: 'Cannot link customer to themselves' };
    }

    await db
      .update(customers)
      .set({
        primaryCustomerId,
        relationType: relationType || 'Family',
        updatedAt: new Date(),
      })
      .where(eq(customers.id, targetCustomerId));

    return { success: true };
  } catch (err: unknown) {
    console.error('[linkExistingCustomerToFamily] Error:', err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to link customer to family',
    };
  }
}

/**
 * Safely update a customer's phone number when they get their own number.
 * Previous invoices and line items remain untouched because they bind via UUIDs.
 */
export async function updateCustomerPhone(
  customerId: string,
  newPhone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = newPhone.trim();
    if (!trimmed) {
      return { success: false, error: 'Phone number cannot be empty' };
    }

    await db
      .update(customers)
      .set({
        phone: trimmed,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    return { success: true };
  } catch (err: unknown) {
    console.error('[updateCustomerPhone] Error:', err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to update phone number',
    };
  }
}

/**
 * Fetch a specific patient's full clinical history, partitioned into personal and family records.
 */
export async function getPatientHistory(
  patientId: string
): Promise<{
  success: boolean;
  data?: PatientDetailHistory;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, patientId),
          eq(customers.organizationId, session.organizationId)
        )
      );

    if (!customer) {
      return { success: false, error: 'Patient not found' };
    }

    // Determine root/primary account
    const rootId = customer.primaryCustomerId || customer.id;

    // Fetch full family network
    const familyMembersRows = await db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        relationType: customers.relationType,
        age: customers.age,
        gender: customers.gender,
        primaryCustomerId: customers.primaryCustomerId,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, session.organizationId),
          or(
            eq(customers.id, rootId),
            eq(customers.primaryCustomerId, rootId),
            eq(customers.id, patientId)
          )
        )
      );

    const familyIds = familyMembersRows.map((m) => m.id);
    const memberMap = new Map(familyMembersRows.map((m) => [m.id, m]));

    const familyMembers: FamilyMemberLinkInfo[] = familyMembersRows.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      phone: m.phone,
      relationType: m.relationType || (m.id === rootId ? 'Primary' : 'Family'),
      age: m.age,
      gender: m.gender,
      primaryCustomerId: m.primaryCustomerId,
      isPrimary: m.id === rootId,
    }));

    // 1. Fetch prescriptions for this patient and all family members
    const rxRows = await db
      .select()
      .from(opticalPrescriptions)
      .where(inArray(opticalPrescriptions.customerId, familyIds))
      .orderBy(desc(opticalPrescriptions.prescribedAt));

    const allPrescriptions: PatientPrescriptionHistory[] = rxRows.map((rx) => {
      const patientInfo = memberMap.get(rx.customerId);
      const isDependent = rx.customerId !== customer.id;
      return {
        id: rx.id,
        prescribedAt: rx.prescribedAt.toISOString(),
        patientId: rx.customerId,
        patientName: patientInfo?.fullName || customer.fullName,
        relationType:
          patientInfo?.relationType || (isDependent ? 'Family' : 'Self'),
        isDependent,
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
        clinicalRemarks: rx.clinicalRemarks,
      };
    });

    const personalPrescriptions = allPrescriptions.filter(
      (rx) => rx.patientId === customer.id
    );
    const familyPrescriptions = allPrescriptions.filter(
      (rx) => rx.patientId !== customer.id
    );

    // 2. Fetch invoices directly billed to this patient
    const directInvoiceRows = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, session.organizationId),
          eq(invoices.customerId, patientId)
        )
      )
      .orderBy(desc(invoices.createdAt));

    // 3. Fetch invoice items where this patient was the assigned wearer on someone else's bill
    const wearerItems = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        quantity: invoiceItems.quantity,
        description: invoiceItems.description,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.patientId, patientId));

    const wearerInvoiceIds = Array.from(
      new Set(
        wearerItems
          .map((w) => w.invoiceId)
          .filter((invId) => !directInvoiceRows.some((di) => di.id === invId))
      )
    );

    let wearerInvoiceRows: typeof directInvoiceRows = [];
    if (wearerInvoiceIds.length > 0) {
      wearerInvoiceRows = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, session.organizationId),
            inArray(invoices.id, wearerInvoiceIds)
          )
        )
        .orderBy(desc(invoices.createdAt));
    }

    // Collect all invoice IDs to batch-fetch item descriptions
    const allRelevantInvoiceIds = [
      ...directInvoiceRows.map((i) => i.id),
      ...wearerInvoiceRows.map((i) => i.id),
    ];

    const itemsByInvoice = new Map<string, string[]>();
    if (allRelevantInvoiceIds.length > 0) {
      const items = await db
        .select()
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, allRelevantInvoiceIds));

      for (const it of items) {
        const list = itemsByInvoice.get(it.invoiceId) || [];
        list.push(`${it.quantity}x ${it.description}`);
        itemsByInvoice.set(it.invoiceId, list);
      }
    }

    const orgBranches = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.organizationId, session.organizationId));
    const branchMap = new Map(orgBranches.map((b) => [b.id, b.name]));

    let ltvDec = new Decimal(0);
    let balanceDueDec = new Decimal(0);

    const mapInvoiceToItem = (
      inv: (typeof directInvoiceRows)[0],
      isWearerOnly: boolean
    ): PatientOrderHistoryItem => {
      const grandTotalDec = new Decimal(inv.grandTotal || '0.00');
      const balanceDec = new Decimal(inv.balanceDue || '0.00');

      if (!isWearerOnly) {
        ltvDec = ltvDec.plus(grandTotalDec);
        balanceDueDec = balanceDueDec.plus(balanceDec);
      }

      const itemDescriptions = itemsByInvoice.get(inv.id) || [];
      const payerCustomer = memberMap.get(inv.customerId);

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt.toISOString(),
        orderStatus: inv.orderStatus,
        paymentStatus: inv.paymentStatus,
        grandTotal: grandTotalDec.toFixed(2),
        advancePaid: new Decimal(inv.advancePaid || '0.00').toFixed(2),
        balanceDue: balanceDec.toFixed(2),
        itemCount: itemDescriptions.length,
        itemDescriptions,
        branchId: inv.branchId,
        branchName: inv.branchId ? branchMap.get(inv.branchId) || null : null,
        billedToName: isWearerOnly
          ? payerCustomer?.fullName || 'Family Account'
          : undefined,
        isWearerOnly,
      };
    };

    const billedOrders = directInvoiceRows.map((inv) =>
      mapInvoiceToItem(inv, false)
    );
    const patientOrders = wearerInvoiceRows.map((inv) =>
      mapInvoiceToItem(inv, true)
    );
    const allOrders = [...billedOrders, ...patientOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const primaryMember = customer.primaryCustomerId
      ? memberMap.get(customer.primaryCustomerId)
      : null;

    const linkedPrimaryPhone = primaryMember?.phone || null;
    const linkedPrimaryName = primaryMember?.fullName || null;

    // A dependent has their own phone if customer.phone is not empty/placeholder
    // AND is distinct from the primary customer's phone.
    const hasDistinctPhone = Boolean(
      customer.phone &&
        customer.phone.trim() !== '' &&
        customer.phone !== '0000000000' &&
        (!primaryMember || customer.phone !== primaryMember.phone)
    );

    const hasOwnPhone = customer.primaryCustomerId ? hasDistinctPhone : true;
    const ownPhone = hasOwnPhone ? customer.phone : null;

    const data: PatientDetailHistory = {
      patient: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        hasOwnPhone,
        ownPhone,
        linkedPrimaryPhone,
        linkedPrimaryName,
        age: customer.age,
        gender: customer.gender,
        addressLine1: customer.addressLine1,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        advanceBalance: customer.advanceBalance || '0.00',
        relationType: customer.relationType || 'Self',
        primaryCustomerId: customer.primaryCustomerId,
        createdAt: customer.createdAt.toISOString(),
      },
      lifetimeValue: ltvDec.toFixed(2),
      totalBalanceDue: balanceDueDec.toFixed(2),
      personalPrescriptions,
      familyPrescriptions,
      prescriptions: allPrescriptions,
      billedOrders,
      patientOrders,
      orders: allOrders,
      familyMembers,
    };

    return { success: true, data };
  } catch (err: unknown) {
    console.error('[getPatientHistory] Error:', err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to fetch patient history',
    };
  }
}

/**
 * Fetch a customer's complete purchase / invoice history, including both
 * direct purchases and items billed under family accounts.
 */
export async function getPatientOrderHistory(
  customerId: string
): Promise<{
  success: boolean;
  orders: PatientOrderHistoryItem[];
  error?: string;
}> {
  try {
    // 1. Direct invoices billed to this customer
    const directInvoiceRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.createdAt));

    // 2. Invoices where customer was the wearer on someone else's bill
    const wearerItems = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        quantity: invoiceItems.quantity,
        description: invoiceItems.description,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.patientId, customerId));

    const wearerInvoiceIds = Array.from(
      new Set(
        wearerItems
          .map((w) => w.invoiceId)
          .filter((invId) => !directInvoiceRows.some((di) => di.id === invId))
      )
    );

    let wearerInvoiceRows: typeof directInvoiceRows = [];
    if (wearerInvoiceIds.length > 0) {
      wearerInvoiceRows = await db
        .select()
        .from(invoices)
        .where(inArray(invoices.id, wearerInvoiceIds))
        .orderBy(desc(invoices.createdAt));
    }

    const allRelevantInvoiceIds = [
      ...directInvoiceRows.map((i) => i.id),
      ...wearerInvoiceRows.map((i) => i.id),
    ];

    const itemsByInvoice = new Map<string, string[]>();
    if (allRelevantInvoiceIds.length > 0) {
      const items = await db
        .select()
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, allRelevantInvoiceIds));

      for (const it of items) {
        const list = itemsByInvoice.get(it.invoiceId) || [];
        list.push(`${it.quantity}x ${it.description}`);
        itemsByInvoice.set(it.invoiceId, list);
      }
    }

    const mapInvoiceToItem = (
      inv: (typeof directInvoiceRows)[0],
      isWearerOnly: boolean
    ): PatientOrderHistoryItem => {
      const grandTotalDec = new Decimal(inv.grandTotal || '0.00');
      const balanceDec = new Decimal(inv.balanceDue || '0.00');
      const itemDescriptions = itemsByInvoice.get(inv.id) || [];

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt.toISOString(),
        orderStatus: inv.orderStatus,
        paymentStatus: inv.paymentStatus,
        grandTotal: grandTotalDec.toFixed(2),
        advancePaid: new Decimal(inv.advancePaid || '0.00').toFixed(2),
        balanceDue: balanceDec.toFixed(2),
        itemCount: itemDescriptions.length,
        itemDescriptions,
        isWearerOnly,
      };
    };

    const directOrders = directInvoiceRows.map((inv) =>
      mapInvoiceToItem(inv, false)
    );
    const wearerOrders = wearerInvoiceRows.map((inv) =>
      mapInvoiceToItem(inv, true)
    );
    const orders = [...directOrders, ...wearerOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, orders };
  } catch (err: unknown) {
    console.error('[getPatientOrderHistory] Error:', err);
    return {
      success: false,
      orders: [],
      error:
        err instanceof Error ? err.message : 'Failed to fetch order history',
    };
  }
}

/**
 * Fetch all clinical prescriptions for a specific customer.
 */
export async function getPatientPrescriptions(
  customerId: string
): Promise<{
  success: boolean;
  prescriptions: PatientPrescriptionHistory[];
  error?: string;
}> {
  try {
    const rxRows = await db
      .select()
      .from(opticalPrescriptions)
      .where(eq(opticalPrescriptions.customerId, customerId))
      .orderBy(desc(opticalPrescriptions.prescribedAt));

    const [customer] = await db
      .select({ fullName: customers.fullName, relationType: customers.relationType })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    const prescriptions: PatientPrescriptionHistory[] = rxRows.map((rx) => ({
      id: rx.id,
      prescribedAt: rx.prescribedAt.toISOString(),
      patientId: rx.customerId,
      patientName: customer?.fullName || 'Patient',
      relationType: customer?.relationType || 'Self',
      isDependent: false,
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
      clinicalRemarks: rx.clinicalRemarks,
    }));

    return { success: true, prescriptions };
  } catch (err: unknown) {
    console.error('[getPatientPrescriptions] Error:', err);
    return {
      success: false,
      prescriptions: [],
      error: err instanceof Error ? err.message : 'Failed to fetch prescriptions',
    };
  }
}

/**
 * Save a newly recorded clinical refraction directly to a patient's record.
 */
export async function saveNewPrescription(
  customerId: string,
  rx: {
    odSphere: number | null;
    odCylinder: number | null;
    odAxis: number | null;
    odAdd: number | null;
    odPd: number | null;
    osSphere: number | null;
    osCylinder: number | null;
    osAxis: number | null;
    osAdd: number | null;
    osPd: number | null;
    binocularPd: number | null;
    clinicalRemarks?: string;
  }
): Promise<{
  success: boolean;
  prescription?: PatientPrescriptionHistory;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const hasOdCyl =
      rx.odCylinder !== null &&
      rx.odCylinder !== undefined &&
      rx.odCylinder !== 0;
    const hasOsCyl =
      rx.osCylinder !== null &&
      rx.osCylinder !== undefined &&
      rx.osCylinder !== 0;

    const [inserted] = await db
      .insert(opticalPrescriptions)
      .values({
        customerId,
        odSphere: rx.odSphere != null ? rx.odSphere.toFixed(2) : null,
        odCylinder: rx.odCylinder != null ? rx.odCylinder.toFixed(2) : null,
        odAxis:
          hasOdCyl && rx.odAxis != null && rx.odAxis >= 1 && rx.odAxis <= 180
            ? rx.odAxis
            : null,
        odAdd:
          rx.odAdd != null && rx.odAdd >= 0.75 && rx.odAdd <= 4.0
            ? rx.odAdd.toFixed(2)
            : null,
        odPd:
          rx.odPd != null && rx.odPd >= 20 && rx.odPd <= 80
            ? rx.odPd.toFixed(1)
            : null,
        osSphere: rx.osSphere != null ? rx.osSphere.toFixed(2) : null,
        osCylinder: rx.osCylinder != null ? rx.osCylinder.toFixed(2) : null,
        osAxis:
          hasOsCyl && rx.osAxis != null && rx.osAxis >= 1 && rx.osAxis <= 180
            ? rx.osAxis
            : null,
        osAdd:
          rx.osAdd != null && rx.osAdd >= 0.75 && rx.osAdd <= 4.0
            ? rx.osAdd.toFixed(2)
            : null,
        osPd:
          rx.osPd != null && rx.osPd >= 20 && rx.osPd <= 80
            ? rx.osPd.toFixed(1)
            : null,
        binocularPd:
          rx.binocularPd != null &&
          rx.binocularPd >= 20 &&
          rx.binocularPd <= 80
            ? rx.binocularPd.toFixed(1)
            : null,
        clinicalRemarks: rx.clinicalRemarks || null,
      })
      .returning();

    const formatted: PatientPrescriptionHistory = {
      id: inserted.id,
      prescribedAt: inserted.prescribedAt.toISOString(),
      patientId: customerId,
      patientName: customer.fullName,
      relationType: customer.relationType || 'Self',
      isDependent: false,
      odSphere: inserted.odSphere,
      odCylinder: inserted.odCylinder,
      odAxis: inserted.odAxis,
      odAdd: inserted.odAdd,
      odPd: inserted.odPd,
      osSphere: inserted.osSphere,
      osCylinder: inserted.osCylinder,
      osAxis: inserted.osAxis,
      osAdd: inserted.osAdd,
      osPd: inserted.osPd,
      binocularPd: inserted.binocularPd,
      clinicalRemarks: inserted.clinicalRemarks,
    };

    return { success: true, prescription: formatted };
  } catch (err: unknown) {
    console.error('[saveNewPrescription] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save prescription',
    };
  }
}

