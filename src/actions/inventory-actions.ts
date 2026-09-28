'use server';

import { GST_RATES, type GstRate } from '@/lib/gst';
import { revalidatePath } from 'next/cache';
import { and, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { db } from '@/db';
import { inventoryItems, invoiceItems, branches, inventoryCategoryEnum } from '@/db/schema';
import {
  getCurrentSession,
  isManagerOrAdmin,
  requireAuthSession,
  requireManagerOrAdmin,
  canAccessBranches,
} from '@/lib/auth-utils';
import { z } from 'zod';
import {
  createInventoryItemSchema,
  type CreateInventoryItemInput,
} from '@/lib/validators/inventory';
import { withCache, invalidateCache } from '@/lib/cache';
import { dispatchNotificationInternal } from '@/lib/notifications-internal';
import { createStoreApprovalRequestAction } from '@/actions/approval-actions';

export type InventoryRow = Omit<typeof inventoryItems.$inferSelect, 'costPrice'> & {
  costPrice?: string | null;
  branchName?: string | null;
};

export async function getInventoryList(branchIds?: string[]): Promise<{
  success: boolean;
  items: InventoryRow[];
  error?: string;
}> {
  try {
    const session = await requireAuthSession();
    const isManager = await isManagerOrAdmin(session);

    // Branch isolation: every client-chosen branch must belong to the caller's org & be accessible
    const requestedBranchIds = (branchIds || []).filter((b) => b && b !== 'all');
    if (!(await canAccessBranches(session, requestedBranchIds))) {
      return { success: false, items: [], error: 'Forbidden: Branch not accessible' };
    }

    const branchKey = branchIds && branchIds.length > 0 ? branchIds.slice().sort().join(',') : 'all';

    return await withCache(
      {
        orgId: session.organizationId,
        namespace: 'inventory',
        key: `list:${branchKey}:${isManager ? 'mgr' : 'staff'}`,
        ttl: 300,
      },
      async () => {
        const conditions: SQL[] = [
          eq(inventoryItems.organizationId, session.organizationId),
          eq(inventoryItems.isActive, true),
        ];

        if (branchIds && branchIds.length > 0 && !branchIds.includes('all')) {
          conditions.push(
            or(
              inArray(inventoryItems.branchId, branchIds),
              isNull(inventoryItems.branchId)
            )!
          );
        }

        const items = await db
          .select({
            id: inventoryItems.id,
            sku: inventoryItems.sku,
            barcode: inventoryItems.barcode,
            category: inventoryItems.category,
            brand: inventoryItems.brand,
            model: inventoryItems.model,
            description: inventoryItems.description,
            costPrice: isManager ? inventoryItems.costPrice : sql<string | null>`NULL`,
            sellingPrice: inventoryItems.sellingPrice,
            mrp: inventoryItems.mrp,
            stockQuantity: inventoryItems.stockQuantity,
            lowStockThreshold: inventoryItems.lowStockThreshold,
            taxRate: inventoryItems.taxRate,
            hsnCode: inventoryItems.hsnCode,
            lensType: inventoryItems.lensType,
            coating: inventoryItems.coating,
            lensMaterial: inventoryItems.lensMaterial,
            customCategory: inventoryItems.customCategory,
            isGstExempt: inventoryItems.isGstExempt,
            organizationId: inventoryItems.organizationId,
            branchId: inventoryItems.branchId,
            branchName: branches.name,
            isActive: inventoryItems.isActive,
            createdAt: inventoryItems.createdAt,
            updatedAt: inventoryItems.updatedAt,
          })
          .from(inventoryItems)
          .leftJoin(branches, eq(inventoryItems.branchId, branches.id))
          .where(and(...conditions))
          .orderBy(desc(inventoryItems.createdAt));

        return { success: true, items };
      }
    );
  } catch (error: unknown) {
    console.error('[getInventoryList] Failed:', error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'Failed to fetch inventory list',
    };
  }
}

export async function addInventoryItem(rawInput: CreateInventoryItemInput): Promise<{
  success: boolean;
  item?: InventoryRow;
  error?: string;
}> {
  try {
    const session = await requireManagerOrAdmin();
    const parsed = createInventoryItemSchema.parse(rawInput);

    // Auto-generate a random SKU if left blank
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestampSuffix = Date.now().toString(36).slice(-4).toUpperCase();
    const prefix = parsed.category.substring(0, 3);
    const sku =
      parsed.sku && parsed.sku.trim() !== ''
        ? parsed.sku.trim().toUpperCase()
        : `${prefix}-${randomSuffix}-${timestampSuffix}`;

    // Monetary formatting strictly using decimal.js
    const costPrice = new Decimal(parsed.costPrice || '0.00').toFixed(2);
    const sellingPrice = new Decimal(parsed.sellingPrice).toFixed(2);
    const mrp =
      parsed.mrp && parsed.mrp.trim() !== ''
        ? new Decimal(parsed.mrp).toFixed(2)
        : null;
    const taxRate = parsed.isGstExempt
      ? '0.00'
      : new Decimal(parsed.taxRate || '18.00').toFixed(2);

    // Default HSN code based on category if omitted
    let hsnCode = parsed.hsnCode?.trim() || null;
    if (!hsnCode) {
      if (parsed.category === 'FRAME') hsnCode = '9003';
      else if (parsed.category === 'SUNGLASS') hsnCode = '9004';
      else if (parsed.category === 'OPHTHALMIC_LENS') hsnCode = '9001';
      else if (parsed.category === 'CONTACT_LENS') hsnCode = '9001';
      else if (parsed.category === 'ACCESSORY') hsnCode = '9003';
    }

    const targetBranchId = parsed.branchId || session.branchId;
    if (targetBranchId && !(await canAccessBranches(session, [targetBranchId]))) {
      return { success: false, error: 'Forbidden: Branch does not belong to your organization' };
    }

    const [inserted] = await db
      .insert(inventoryItems)
      .values({
        sku,
        barcode: parsed.barcode?.trim() || null,
        category: parsed.category,
        brand: parsed.brand?.trim() || null,
        model: parsed.model?.trim() || null,
        description: parsed.description?.trim() || null,
        costPrice,
        sellingPrice,
        mrp,
        stockQuantity: parsed.stockQuantity,
        lowStockThreshold: parsed.lowStockThreshold,
        taxRate,
        hsnCode,
        customCategory: parsed.customCategory?.trim() || null,
        isGstExempt: parsed.isGstExempt ?? false,
        organizationId: session.organizationId,
        branchId: targetBranchId,
        isActive: true,
      })
      .returning();

    let branchName: string | null = null;
    if (inserted?.branchId) {
      const [branch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, inserted.branchId));
      branchName = branch?.name || null;
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/');
    await invalidateCache({ orgId: session.organizationId, namespace: 'inventory' });
    return { success: true, item: { ...inserted, branchName } };
  } catch (error: unknown) {
    console.error('[addInventoryItem] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add inventory item',
    };
  }
}

export interface UpdateInventoryItemInput {
  sku?: string;
  barcode?: string | null;
  category?: CreateInventoryItemInput['category'];
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  costPrice?: string;
  sellingPrice?: string;
  mrp?: string | null;
  stockQuantity?: number;
  lowStockThreshold?: number;
  taxRate?: GstRate;
  hsnCode?: string | null;
  branchId?: string | null;
}

const moneyString = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Invalid monetary format');

/** Zod schema for updateInventoryItem input (mirrors UpdateInventoryItemInput). */
const updateInventoryItemSchema = z.object({
  sku: z.string().max(64).optional(),
  barcode: z.string().max(64).nullable().optional(),
  category: z
    .enum(inventoryCategoryEnum.enumValues)
    .optional(),
  brand: z.string().max(120).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  costPrice: z.union([moneyString, z.literal('')]).optional(),
  sellingPrice: z.string().max(20).optional(),
  mrp: z.union([moneyString, z.literal('')]).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
  taxRate: z.enum(GST_RATES).optional(),
  hsnCode: z.string().max(10).nullable().optional(),
  // Lenient UUID shape: seeded ids like 00000000-0000-0000-0000-000000000002 fail Zod 4's strict .uuid()
  branchId: z
    .string()
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid branch id')
    .nullable()
    .optional(),
});

/**
 * @description Updates an inventory item in the caller's organization (manager/admin only).
 * A new `branchId` must belong to the caller's organization.
 * @param id - Inventory item id
 * @param rawInput - Partial fields validated by `updateInventoryItemSchema`
 * @returns The updated row (cost price included, as caller is a manager)
 */
export async function updateInventoryItem(
  id: string,
  rawInput: UpdateInventoryItemInput
): Promise<{
  success: boolean;
  item?: InventoryRow;
  error?: string;
}> {
  try {
    const session = await requireManagerOrAdmin();

    const parsedInput = updateInventoryItemSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0]?.message || 'Invalid inventory update' };
    }
    rawInput = parsedInput.data as UpdateInventoryItemInput;

    const updateData: Partial<typeof inventoryItems.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (rawInput.branchId !== undefined) {
      // Branch isolation: never allow pointing an item at another organization's branch
      if (rawInput.branchId !== null && !(await canAccessBranches(session, [rawInput.branchId]))) {
        return { success: false, error: 'Forbidden: Branch does not belong to your organization' };
      }
      updateData.branchId = rawInput.branchId;
    }

    if (rawInput.sku !== undefined) {
      const sku = rawInput.sku.trim();
      if (!sku) return { success: false, error: 'SKU cannot be empty' };
      updateData.sku = sku.toUpperCase();
    }

    if (rawInput.barcode !== undefined) {
      updateData.barcode = rawInput.barcode?.trim() || null;
    }

    if (rawInput.category !== undefined) {
      updateData.category = rawInput.category;
    }

    if (rawInput.brand !== undefined) {
      updateData.brand = rawInput.brand?.trim() || null;
    }

    if (rawInput.model !== undefined) {
      updateData.model = rawInput.model?.trim() || null;
    }

    if (rawInput.description !== undefined) {
      updateData.description = rawInput.description?.trim() || null;
    }

    if (rawInput.costPrice !== undefined) {
      updateData.costPrice = new Decimal(rawInput.costPrice || '0.00').toFixed(2);
    }

    if (rawInput.sellingPrice !== undefined) {
      const sp = rawInput.sellingPrice.trim();
      if (!sp || isNaN(Number(sp)) || Number(sp) < 0) {
        return { success: false, error: 'Valid selling price is required' };
      }
      updateData.sellingPrice = new Decimal(sp).toFixed(2);
    }

    if (rawInput.mrp !== undefined) {
      updateData.mrp =
        rawInput.mrp && rawInput.mrp.trim() !== ''
          ? new Decimal(rawInput.mrp).toFixed(2)
          : null;
    }

    if (rawInput.stockQuantity !== undefined) {
      updateData.stockQuantity = Math.max(0, Math.floor(rawInput.stockQuantity));
    }

    if (rawInput.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Math.max(0, Math.floor(rawInput.lowStockThreshold));
    }

    if (rawInput.taxRate !== undefined) {
      updateData.taxRate = new Decimal(rawInput.taxRate || '18.00').toFixed(2);
    }

    if (rawInput.hsnCode !== undefined) {
      updateData.hsnCode = rawInput.hsnCode?.trim() || null;
    }

    const [updated] = await db
      .update(inventoryItems)
      .set(updateData)
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, session.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return { success: false, error: 'Inventory item not found or unauthorized' };
    }

    let branchName: string | null = null;
    if (updated?.branchId) {
      const [branch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, updated.branchId));
      branchName = branch?.name || null;
    }

    // Automated Alert: If stock is at or below threshold, dispatch low stock notification
    if (updated.stockQuantity <= updated.lowStockThreshold) {
      await dispatchNotificationInternal({
        type: 'inventory.low_stock',
        organizationId: session.organizationId,
        branchId: updated.branchId || undefined,
        severity: updated.stockQuantity === 0 ? 'critical' : 'high',
        dedupKey: `low_stock:${updated.id}:${updated.stockQuantity}`,
        payload: {
          itemId: updated.id,
          itemName: `${updated.brand || ''} ${updated.model || ''}`.trim() || updated.sku,
          sku: updated.sku,
          currentStock: updated.stockQuantity,
          threshold: updated.lowStockThreshold,
          branchId: updated.branchId || '',
          branchName: branchName || undefined,
        },
      });
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/');
    await invalidateCache({ orgId: session.organizationId, namespace: 'inventory' });
    return { success: true, item: { ...updated, branchName } };
  } catch (error: unknown) {
    console.error('[updateInventoryItem] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inventory item',
    };
  }
}

export async function deleteInventoryItem(
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
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: false, error: 'Unauthorized: Session required' };
    }

    // Verify item belongs to tenant
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Inventory item not found' };
    }

    const itemName = `${existing.brand || ''} ${existing.model || ''}`.trim() || existing.sku;

    // RBAC Check: If non-admin, route to Maker-Checker Approval Request
    const isAdmin = await isManagerOrAdmin(session);
    if (!isAdmin) {
      const approvalResult = await createStoreApprovalRequestAction({
        type: 'delete_inventory',
        targetId: id,
        targetName: itemName,
        reason: reason?.trim() || 'Staff requested inventory deletion / deactivation',
      });

      if (!approvalResult.success) {
        return { success: false, error: approvalResult.error || 'Failed to submit approval request' };
      }

      return {
        success: true,
        requiresApproval: true,
        requestId: approvalResult.requestId,
        message: 'Approval request submitted to store administrator. Item will be removed once approved.',
      };
    }

    // Check if referenced in historical invoices
    const [usage] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoiceItems)
      .where(eq(invoiceItems.inventoryItemId, id));

    const isUsed = Number(usage?.count || 0) > 0;

    if (isUsed) {
      // Soft-archive to protect historical invoices
      await db
        .update(inventoryItems)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryItems.id, id),
            eq(inventoryItems.organizationId, session.organizationId)
          )
        );
    } else {
      // No historical usage: safe to hard-delete
      await db
        .delete(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, id),
            eq(inventoryItems.organizationId, session.organizationId)
          )
        );
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/');
    await invalidateCache({ orgId: session.organizationId, namespace: 'inventory' });
    return { success: true };
  } catch (error: unknown) {
    console.error('[deleteInventoryItem] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete inventory item',
    };
  }
}

/**
 * Searches an active inventory product by barcode or SKU for instant hardware barcode scans.
 */
export async function searchBarcodeItemAction(
  barcode: string,
  branchId?: string
): Promise<{
  success: boolean;
  item?: InventoryRow;
  error?: string;
}> {
  try {
    const session = await requireAuthSession();
    const isManager = await isManagerOrAdmin(session);
    const query = barcode.trim();
    if (!query) {
      return { success: false, error: 'Empty barcode' };
    }

    const conditions: SQL[] = [
      eq(inventoryItems.organizationId, session.organizationId),
      eq(inventoryItems.isActive, true),
      sql`(${inventoryItems.barcode} = ${query} OR ${inventoryItems.sku} = ${query})`,
    ];

    if (branchId && branchId !== 'all') {
      conditions.push(eq(inventoryItems.branchId, branchId));
    }

    const [item] = await db
      .select({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        barcode: inventoryItems.barcode,
        category: inventoryItems.category,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        description: inventoryItems.description,
        costPrice: isManager ? inventoryItems.costPrice : sql<string | null>`NULL`,
        sellingPrice: inventoryItems.sellingPrice,
        mrp: inventoryItems.mrp,
        stockQuantity: inventoryItems.stockQuantity,
        lowStockThreshold: inventoryItems.lowStockThreshold,
        taxRate: inventoryItems.taxRate,
        hsnCode: inventoryItems.hsnCode,
        lensType: inventoryItems.lensType,
        coating: inventoryItems.coating,
        lensMaterial: inventoryItems.lensMaterial,
        customCategory: inventoryItems.customCategory,
        isGstExempt: inventoryItems.isGstExempt,
        organizationId: inventoryItems.organizationId,
        branchId: inventoryItems.branchId,
        branchName: branches.name,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .leftJoin(branches, eq(inventoryItems.branchId, branches.id))
      .where(and(...conditions))
      .limit(1);

    if (!item) {
      return { success: false, error: `No item found for barcode: ${query}` };
    }

    return { success: true, item };
  } catch (err: unknown) {
    console.error('[searchBarcodeItemAction] Failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Barcode lookup failed',
    };
  }
}

