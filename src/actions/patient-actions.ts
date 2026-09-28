'use server';

import Decimal from 'decimal.js';
import { and, desc, eq, inArray, isNull, or, gt, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  customers,
  invoices,
  invoiceItems,
  opticalPrescriptions,
  branches,
} from '@/db/schema';
import { requireAuthSession, isManagerOrAdmin } from '@/lib/auth-utils';
import { z } from 'zod';
import { prescriptionSchema } from '@/lib/validators/prescription';
import { createStoreApprovalRequestAction } from '@/actions/approval-actions';
import { withCache, invalidateCache } from '@/lib/cache';
import type { POSPatient } from '@/store/pos-store';
import { formatActionError, lenientUuidSchema, requiredLenientUuidSchema } from '@/lib/action-utils';

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

const optionalTrimmedText = (max: number) => z.string().max(max).nullable().optional();
const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional();
const ageSchema = z.number().int().min(0).max(150).nullable().optional();

/** Zod schema for createPatientAction input (mirrors CreatePatientInput). */
const createPatientSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(160),
  phone: z.string().trim().min(1, 'Phone number is required').max(20),
  age: ageSchema,
  gender: genderSchema,
  addressLine1: optionalTrimmedText(255),
  addressLine2: optionalTrimmedText(255),
  city: optionalTrimmedText(120),
  state: optionalTrimmedText(120),
  pincode: optionalTrimmedText(12),
  relationType: z.string().max(40).optional(),
  primaryCustomerId: lenientUuidSchema,
});

/** Zod schema for updatePatientAction input (mirrors UpdatePatientInput). */
const updatePatientSchema = z.object({
  fullName: z.string().max(160).optional(),
  phone: z.string().max(20).optional(),
  age: ageSchema,
  gender: genderSchema,
  addressLine1: optionalTrimmedText(255),
  addressLine2: optionalTrimmedText(255),
  city: optionalTrimmedText(120),
  state: optionalTrimmedText(120),
  pincode: optionalTrimmedText(12),
  relationType: z.string().max(40).optional(),
});

/**
 * @description Creates a new patient/customer record in the caller's organization.
 * @param input - CreatePatientInput validated by `createPatientSchema`
 * @returns The created patient row or an error
 */
export async function createPatientAction(input: CreatePatientInput): Promise<{
  success: boolean;
  patient?: typeof customers.$inferSelect;
  error?: string;
}> {
  try {
    const session = await requireAuthSession();

    const parsed = createPatientSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid patient details' };
    }
    input = parsed.data;
    const fullName = parsed.data.fullName;
    const phone = parsed.data.phone;

    // Family link target must belong to the same organization
    if (input.primaryCustomerId) {
      const [primary] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.primaryCustomerId),
            eq(customers.organizationId, session.organizationId)
          )
        )
        .limit(1);
      if (!primary) {
        return { success: false, error: 'Primary family account not found' };
      }
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
    await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });

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
    const session = await requireAuthSession();

    const parsed = updatePatientSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid patient details' };
    }
    input = parsed.data;

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
    await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });

    return { success: true, patient: updated };
  } catch (err: unknown) {
    console.error('[updatePatientAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update patient',
    };
  }
}

export async function deletePatientAction(
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  requestId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const session = await requireAuthSession();
    if (!session?.organizationId) {
      return { success: false, error: 'Unauthorized: Session required' };
    }

    // 1. Check if customer exists under tenant
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

    // 2. Safety Invariant: Check for active, unclosed optical orders
    const activeInvoices = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, id),
          eq(invoices.organizationId, session.organizationId),
          inArray(invoices.orderStatus, [
            'ORDERED',
            'SENT_TO_LAB',
            'IN_FITTING',
            'READY_FOR_COLLECTION',
          ])
        )
      );

    if (activeInvoices.length > 0) {
      return {
        success: false,
        error: `Cannot delete or archive patient. Patient has ${activeInvoices.length} active unclosed order(s) (e.g. #${activeInvoices[0].invoiceNumber}). Please deliver or close active orders first.`,
      };
    }

    // 3. Safety Invariant: Check for pending balance due on any invoice
    const pendingBalanceInvoices = await db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        balanceDue: invoices.balanceDue,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, id),
          eq(invoices.organizationId, session.organizationId),
          gt(sql`CAST(${invoices.balanceDue} AS NUMERIC)`, 0)
        )
      );

    if (pendingBalanceInvoices.length > 0) {
      return {
        success: false,
        error: `Cannot delete or archive patient. Patient has outstanding unpaid balance of ₹${pendingBalanceInvoices[0].balanceDue} on invoice #${pendingBalanceInvoices[0].invoiceNumber}. All balances must be settled before deletion.`,
      };
    }

    // 4. RBAC Check: If non-admin, route to Maker-Checker Approval Request
    const isAdmin = await isManagerOrAdmin(session);
    if (!isAdmin) {
      const approvalResult = await createStoreApprovalRequestAction({
        type: 'delete_customer',
        targetId: id,
        targetName: customer.fullName,
        reason: reason?.trim() || 'Staff requested patient record deletion / archive',
      });

      if (!approvalResult.success) {
        return { success: false, error: approvalResult.error || 'Failed to submit approval request' };
      }

      return {
        success: true,
        requiresApproval: true,
        requestId: approvalResult.requestId,
        message: 'Approval request submitted to store administrator. Record will be archived once approved.',
      };
    }

    // 5. Admin execution: Soft-delete the customer (preserves historical orders & prescriptions)
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
    await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });

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
    const session = await requireAuthSession();
    const branchKey = branchIds && branchIds.length > 0 ? branchIds.slice().sort().join(',') : 'all';

    return await withCache(
      {
        orgId: session.organizationId,
        namespace: 'patients',
        key: `list:${branchKey}`,
        ttl: 300,
      },
      async () => {
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
      }
    );
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
    const session = await requireAuthSession();

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
    const session = await requireAuthSession();

    const parsed = z
      .object({
        primaryCustomerId: requiredLenientUuidSchema,
        targetCustomerId: requiredLenientUuidSchema,
        relationType: z.string().max(40),
      })
      .safeParse({ primaryCustomerId, targetCustomerId, relationType: relationType ?? '' });
    if (!parsed.success) {
      return { success: false, error: 'Invalid family link request' };
    }

    if (primaryCustomerId === targetCustomerId) {
      return { success: false, error: 'Cannot link customer to themselves' };
    }

    // Both customers must belong to the caller's organization
    const pair = await db
      .select({ id: customers.id, primaryCustomerId: customers.primaryCustomerId })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, session.organizationId),
          inArray(customers.id, [primaryCustomerId, targetCustomerId]),
          isNull(customers.deletedAt)
        )
      );
    const primaryRow = pair.find((c) => c.id === primaryCustomerId);
    if (!primaryRow || !pair.some((c) => c.id === targetCustomerId)) {
      return { success: false, error: 'Customer not found' };
    }
    if (primaryRow.primaryCustomerId === targetCustomerId) {
      return { success: false, error: 'Cannot create a circular family link' };
    }

    const updated = await db
      .update(customers)
      .set({
        primaryCustomerId,
        relationType: parsed.data.relationType.trim() || 'Family',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, targetCustomerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .returning({ id: customers.id });

    if (updated.length === 0) {
      return { success: false, error: 'Customer not found' };
    }

    await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });
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
    const session = await requireAuthSession();

    const parsed = z
      .object({ customerId: requiredLenientUuidSchema, phone: z.string().trim().min(1, 'Phone number cannot be empty').max(20) })
      .safeParse({ customerId, phone: newPhone ?? '' });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid phone update' };
    }

    const updated = await db
      .update(customers)
      .set({
        phone: parsed.data.phone,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, parsed.data.customerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .returning({ id: customers.id });

    if (updated.length === 0) {
      return { success: false, error: 'Customer not found' };
    }

    await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });
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
    const session = await requireAuthSession();

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
    const session = await requireAuthSession();

    // 0. Customer must belong to the caller's organization
    const [owned] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .limit(1);
    if (!owned) {
      return { success: false, orders: [], error: 'Patient not found' };
    }

    // 1. Direct invoices billed to this customer
    const directInvoiceRows = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, customerId),
          eq(invoices.organizationId, session.organizationId)
        )
      )
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
        .where(
          and(
            inArray(invoices.id, wearerInvoiceIds),
            eq(invoices.organizationId, session.organizationId)
          )
        )
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
    const session = await requireAuthSession();

    const [customer] = await db
      .select({ fullName: customers.fullName, relationType: customers.relationType })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!customer) {
      return { success: false, prescriptions: [], error: 'Patient not found' };
    }

    // Join to customers so prescriptions are strictly tenant-scoped
    const rxRows = await db
      .select({
        id: opticalPrescriptions.id,
        prescribedAt: opticalPrescriptions.prescribedAt,
        customerId: opticalPrescriptions.customerId,
        odSphere: opticalPrescriptions.odSphere,
        odCylinder: opticalPrescriptions.odCylinder,
        odAxis: opticalPrescriptions.odAxis,
        odAdd: opticalPrescriptions.odAdd,
        odPd: opticalPrescriptions.odPd,
        osSphere: opticalPrescriptions.osSphere,
        osCylinder: opticalPrescriptions.osCylinder,
        osAxis: opticalPrescriptions.osAxis,
        osAdd: opticalPrescriptions.osAdd,
        osPd: opticalPrescriptions.osPd,
        binocularPd: opticalPrescriptions.binocularPd,
        clinicalRemarks: opticalPrescriptions.clinicalRemarks,
      })
      .from(opticalPrescriptions)
      .innerJoin(customers, eq(opticalPrescriptions.customerId, customers.id))
      .where(
        and(
          eq(opticalPrescriptions.customerId, customerId),
          eq(customers.organizationId, session.organizationId)
        )
      )
      .orderBy(desc(opticalPrescriptions.prescribedAt));

    const prescriptions: PatientPrescriptionHistory[] = rxRows.map((rx) => ({
      id: rx.id,
      prescribedAt: rx.prescribedAt.toISOString(),
      patientId: rx.customerId,
      patientName: customer.fullName || 'Patient',
      relationType: customer.relationType || 'Self',
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
    const session = await requireAuthSession();

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

    // Authoritative clinical validation: 0.25 D steps, AXIS 1-180 required iff CYL != 0, ADD/PD ranges
    const parsedRx = prescriptionSchema.safeParse({
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
      clinicalRemarks: rx.clinicalRemarks ?? null,
    });
    if (!parsedRx.success) {
      return { success: false, error: parsedRx.error.issues[0]?.message || 'Invalid prescription values' };
    }
    const v = parsedRx.data;

    // Axis invariant: AXIS is persisted only when CYL != 0; otherwise null
    const hasOdCyl = v.odCylinder !== null && v.odCylinder !== 0;
    const hasOsCyl = v.osCylinder !== null && v.osCylinder !== 0;
    const fmt = (val: number | null, dp: number): string | null =>
      val === null ? null : new Decimal(val).toFixed(dp);

    const [inserted] = await db
      .insert(opticalPrescriptions)
      .values({
        customerId,
        odSphere: fmt(v.odSphere, 2),
        odCylinder: fmt(v.odCylinder, 2),
        odAxis: hasOdCyl ? v.odAxis : null,
        odAdd: fmt(v.odAdd, 2),
        odPd: fmt(v.odPd, 1),
        osSphere: fmt(v.osSphere, 2),
        osCylinder: fmt(v.osCylinder, 2),
        osAxis: hasOsCyl ? v.osAxis : null,
        osAdd: fmt(v.osAdd, 2),
        osPd: fmt(v.osPd, 1),
        binocularPd: fmt(v.binocularPd, 1),
        clinicalRemarks: v.clinicalRemarks || null,
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

