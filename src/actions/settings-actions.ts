'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { storeProfile, type StoreProfile, type ReceiptType } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import Decimal from 'decimal.js';

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
});

export type StoreProfileInput = z.infer<typeof storeProfileSchema>;

export interface StoreProfileResult {
  success: boolean;
  data?: StoreProfile;
  error?: string;
}

/**
 * Fetch the singleton store profile row.
 * If none exists, creates a default row and returns it.
 */
export async function getStoreProfile(): Promise<StoreProfile> {
  try {
    const existing = await db.select().from(storeProfile).limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Initialize default profile row if table is empty
    const [newProfile] = await db
      .insert(storeProfile)
      .values({
        storeName: 'Santhosh Optical Center',
        gstin: '29AABCS1429B1Z8',
        phone: '+91 98765 43210',
        address: '123 Optical Plaza, MG Road, Bengaluru - 560001',
        defaultTaxRate: '18.00',
        receiptType: 'THERMAL_80MM',
      })
      .returning();

    return newProfile;
  } catch (error) {
    console.error('Failed to get or initialize store profile:', error);
    // Return safe in-memory fallback if database query encounters an issue
    return {
      id: 'default',
      storeName: 'Santhosh Optical Center',
      gstin: '29AABCS1429B1Z8',
      phone: '+91 98765 43210',
      address: '123 Optical Plaza, MG Road, Bengaluru - 560001',
      defaultTaxRate: '18.00',
      receiptType: 'THERMAL_80MM' as ReceiptType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Update the singleton store profile row.
 */
export async function updateStoreProfile(
  input: StoreProfileInput
): Promise<StoreProfileResult> {
  try {
    const validated = storeProfileSchema.parse(input);

    const currentProfile = await getStoreProfile();

    const formattedTaxRate = new Decimal(validated.defaultTaxRate).toFixed(2);

    const [updated] = await db
      .update(storeProfile)
      .set({
        storeName: validated.storeName.trim(),
        gstin: validated.gstin?.trim() || null,
        phone: validated.phone.trim(),
        address: validated.address.trim(),
        defaultTaxRate: formattedTaxRate,
        receiptType: validated.receiptType,
        updatedAt: new Date(),
      })
      .where(eq(storeProfile.id, currentProfile.id))
      .returning();

    revalidatePath('/admin/settings');
    revalidatePath('/pos/new-bill');
    revalidatePath('/admin/patients');
    revalidatePath('/admin/lab-orders');

    return {
      success: true,
      data: updated,
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
    const profile = await getStoreProfile();

    const inv = await db.query.invoices.findFirst({
      where: (invoices, { eq }) => eq(invoices.id, invoiceId),
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
