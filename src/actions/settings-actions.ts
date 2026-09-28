'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { storeProfile, type StoreProfile, type ReceiptType } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis';
import { buildCacheKey } from '@/lib/cache';
import { ensureOrgStoreProfile, redactStoreProfile } from '@/lib/store-profile';
import { getCurrentSession, requireAuthSession, requireManagerOrAdmin, isManagerOrAdmin } from '@/lib/auth-utils';
import { encryptSecret } from '@/lib/crypto-utils';

const STORE_PROFILE_CACHE_TTL = 86400; // 24 hours

/** Tenant-scoped cache key for the store profile (SEC-004: never share across organizations). */
function storeProfileCacheKey(organizationId: string): string {
  return buildCacheKey({ orgId: organizationId, namespace: 'settings', key: 'store_profile' });
}

const storeProfileSchema = z.object({
  storeName: z.string().min(1, 'Store Name is required'),
  gstin: z.string().max(15, 'GSTIN must not exceed 15 characters').optional().nullable(),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Store address is required'),
  defaultTaxRate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
      message: 'Default tax rate must be a percentage between 0 and 100',
    }),
  receiptType: z.enum(['THERMAL_80MM', 'A4_INVOICE']),
  defaultPosLayout: z.enum(['adaptive', 'dense', 'split']).optional().default('adaptive'),
  enableGst: z.boolean().optional().default(true),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().optional().nullable(),
  smtpSecure: z.boolean().optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpFromEmail: z.string().optional().nullable(),
  smtpFromName: z.string().optional().nullable(),
});

export type StoreProfileInput = z.infer<typeof storeProfileSchema>;

export interface StoreProfileResult {
  success: boolean;
  data?: StoreProfile;
  error?: string;
}

/**
 * @description Neutral, secret-free profile returned when no tenant can be resolved
 * (unauthenticated callers or database outage). Never contains another tenant's data.
 */
function buildFallbackStoreProfile(): StoreProfile {
  return {
    id: 'default',
    organizationId: null,
    storeName: 'My Optical Store',
    gstin: null,
    phone: '',
    address: '',
    defaultTaxRate: '18.00',
    receiptType: 'THERMAL_80MM' as ReceiptType,
    defaultPosLayout: 'adaptive',
    enableGst: true,
    allowNegativeStock: false,
    smtpHost: null,
    smtpPort: null,
    smtpSecure: null,
    smtpUser: null,
    smtpPass: null,
    smtpFromEmail: null,
    smtpFromName: null,
    branchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * @description Fetches the store profile of the caller's organization.
 * Reads the tenant-scoped cache first (TTL 24h), falls back to the database, and
 * lazily creates a default row on first access. Secrets are redacted on every path.
 * @returns The caller's store profile with `smtpPass` masked (managers) or removed (other roles).
 */
export async function getStoreProfile(): Promise<StoreProfile> {
  try {
    const session = await getCurrentSession();
    if (!session.user || !session.organizationId) {
      return buildFallbackStoreProfile();
    }
    const isManager = await isManagerOrAdmin(session);
    const cacheKey = storeProfileCacheKey(session.organizationId);

    const cached = await cacheGet<StoreProfile>(cacheKey);
    if (cached) {
      return redactStoreProfile(
        { ...cached, createdAt: new Date(cached.createdAt), updatedAt: new Date(cached.updatedAt) },
        isManager
      );
    }

    const profile = await ensureOrgStoreProfile(session.organizationId, session.branchId || null);
    await cacheSet(cacheKey, profile, STORE_PROFILE_CACHE_TTL);
    return redactStoreProfile(profile, isManager);
  } catch (error) {
    console.error('Failed to get or initialize store profile:', error);
    return buildFallbackStoreProfile();
  }
}

/**
 * @description Updates the caller organization's store profile (manager/admin only).
 * Invalidates the tenant-scoped cache key on success.
 * @param input - Validated store profile form values.
 * @returns The updated profile (secrets redacted) or an error message.
 */
export async function updateStoreProfile(
  input: StoreProfileInput
): Promise<StoreProfileResult> {
  try {
    const session = await requireManagerOrAdmin();
    const validated = storeProfileSchema.parse(input);

    const currentProfile = await ensureOrgStoreProfile(session.organizationId, session.branchId || null);

    const formattedTaxRate = new Decimal(validated.defaultTaxRate).toFixed(2);

    const updateSet: Partial<typeof storeProfile.$inferInsert> = {
      storeName: validated.storeName.trim(),
      gstin: validated.gstin?.trim() || null,
      phone: validated.phone.trim(),
      address: validated.address.trim(),
      defaultTaxRate: formattedTaxRate,
      receiptType: validated.receiptType,
      defaultPosLayout: validated.defaultPosLayout || 'adaptive',
      enableGst: validated.enableGst ?? true,
      updatedAt: new Date(),
    };

    if (validated.smtpHost !== undefined) updateSet.smtpHost = validated.smtpHost?.trim() || 'smtp.gmail.com';
    if (validated.smtpPort !== undefined) updateSet.smtpPort = validated.smtpPort || 587;
    if (validated.smtpSecure !== undefined) updateSet.smtpSecure = Boolean(validated.smtpSecure);
    if (validated.smtpUser !== undefined) updateSet.smtpUser = validated.smtpUser?.trim() || null;
    if (validated.smtpFromEmail !== undefined) updateSet.smtpFromEmail = validated.smtpFromEmail?.trim() || null;
    if (validated.smtpFromName !== undefined) updateSet.smtpFromName = validated.smtpFromName?.trim() || null;
    if (validated.smtpPass && validated.smtpPass.trim() && !validated.smtpPass.includes('•••')) {
      updateSet.smtpPass = encryptSecret(validated.smtpPass.trim());
    }

    const [updated] = await db
      .update(storeProfile)
      .set(updateSet)
      .where(
        and(
          eq(storeProfile.id, currentProfile.id),
          eq(storeProfile.organizationId, session.organizationId)
        )
      )
      .returning();

    await cacheDel(storeProfileCacheKey(session.organizationId));

    revalidatePath('/admin/settings');
    revalidatePath('/pos/new-bill');
    revalidatePath('/admin/patients');
    revalidatePath('/admin/lab-orders');

    return {
      success: true,
      data: redactStoreProfile(updated, true),
    };
  } catch (error) {
    console.error('Failed to update store profile:', error);
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? error.issues[0]?.message
          : error instanceof Error
          ? error.message
          : 'Failed to update store profile',
    };
  }
}

/**
 * Fetch full invoice details formatted for printing (Thermal Receipt or A4 Laser Invoice).
 */
export async function getInvoicePrintData(
  invoiceId: string
): Promise<{
  success: boolean;
  order?: import('@/components/pos/print-layouts').PrintOrderData;
  receiptType?: ReceiptType;
  error?: string;
}> {
  try {
    const session = await requireAuthSession();
    const profile = await getStoreProfile();

    // Tenant isolation is enforced in the query itself — never fetch another org's invoice.
    const inv = await db.query.invoices.findFirst({
      where: (invoices, { eq, and }) =>
        and(eq(invoices.id, invoiceId), eq(invoices.organizationId, session.organizationId)),
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
    });

    if (!inv) {
      return { success: false, error: 'Invoice not found' };
    }

    const itemsList = (inv.items || []).map((item) => ({
      id: item.id,
      sku: item.inventoryItem?.sku || undefined,
      description: item.description,
      hsnCode: item.hsnCode || item.inventoryItem?.hsnCode || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPerUnit: item.discountPerUnit,
      // Exact stored line discount = gross − taxable, where taxable = lineTotal − taxAmount.
      // Printing from persisted values keeps receipts identical to the server-computed invoice.
      discount: Decimal.max(
        0,
        new Decimal(item.unitPrice)
          .times(item.quantity)
          .minus(new Decimal(item.lineTotal).minus(item.taxAmount))
      ).toFixed(2),
      taxRate: item.taxRate || '18.00',
      category: item.inventoryItem?.category || undefined,
      brand: item.inventoryItem?.brand || null,
      model: item.inventoryItem?.model || null,
      lensType: item.lensType || item.inventoryItem?.lensType || null,
      coating: item.coating || item.inventoryItem?.coating || null,
      lensMaterial: item.lensMaterial || item.inventoryItem?.lensMaterial || null,
      patientId: item.patientId,
      patientName: item.patient?.fullName || null,
      isCustomerOwnFrame: item.isCustomerOwnFrame,
      fittingNote: item.fittingNote,
    }));

    const prescriptionsList: any[] = [];
    const seenRxIds = new Set<string>();

    if (inv.prescription) {
      seenRxIds.add(inv.prescription.id);
      prescriptionsList.push({
        patientId: inv.customer?.id,
        patientName: inv.customer?.fullName,
        relationType: inv.customer?.relationType || 'Primary',
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
          patientName: it.patient?.fullName || 'Family Member',
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

    const orderData: import('@/components/pos/print-layouts').PrintOrderData = {
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.id,
      createdAt: inv.createdAt.toISOString(),
      promisedDeliveryDate: inv.promisedDeliveryDate
        ? inv.promisedDeliveryDate.toISOString()
        : null,
      customer: {
        name: inv.customer?.fullName || 'Customer',
        phone: inv.customer?.phone || '—',
        age: inv.customer?.age,
        gender: inv.customer?.gender,
        address: inv.customer?.addressLine1 || undefined,
        gstin: inv.customer?.gstin || undefined,
      },
      items: itemsList,
      prescription: prescriptionsList[0] || null,
      prescriptions: prescriptionsList,
      grandTotal: inv.grandTotal,
      advancePaid: inv.advancePaid,
      balanceDue: inv.balanceDue,
      paymentMode: primaryPayment?.paymentMode || 'CASH',
      paymentReference: primaryPayment?.transactionReference || undefined,
      storeName: profile.storeName,
      storeGstin: profile.gstin || undefined,
      storeAddress: profile.address,
      storePhone: profile.phone,
    };

    return {
      success: true,
      order: orderData,
      receiptType: profile.receiptType,
    };
  } catch (error) {
    console.error('Failed to get invoice print data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get print data',
    };
  }
}

/**
 * Purges all server and Redis cache entries across namespaces.
 */
export async function clearApplicationCacheAction(): Promise<{ success: boolean; message: string }> {
  try {
    await requireManagerOrAdmin();
    const { cacheFlush } = await import('@/lib/cache');
    await cacheFlush();
    revalidatePath('/', 'layout');
    return { success: true, message: 'All server and memory caches flushed successfully.' };
  } catch (error) {
    console.error('Failed to clear application cache:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear cache',
    };
  }
}
