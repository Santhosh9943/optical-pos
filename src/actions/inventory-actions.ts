'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { db } from '@/db';
import { inventoryItems, invoiceItems } from '@/db/schema';
import { getCurrentSession } from '@/lib/auth-utils';
import {
  createInventoryItemSchema,
  type CreateInventoryItemInput,
} from '@/lib/validators/inventory';

export type InventoryRow = typeof inventoryItems.$inferSelect;

export async function getInventoryList(): Promise<{
  success: boolean;
  items: InventoryRow[];
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const items = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.organizationId, session.organizationId),
          eq(inventoryItems.isActive, true)
        )
      )
      .orderBy(desc(inventoryItems.createdAt));

    return { success: true, items };
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
    const taxRate = new Decimal(parsed.taxRate || '18.00').toFixed(2);

    // Default HSN code based on category if omitted
    let hsnCode = parsed.hsnCode?.trim() || null;
    if (!hsnCode) {
      if (parsed.category === 'FRAME') hsnCode = '9003';
      else if (parsed.category === 'SUNGLASS') hsnCode = '9004';
      else if (parsed.category === 'OPHTHALMIC_LENS') hsnCode = '9001';
      else if (parsed.category === 'CONTACT_LENS') hsnCode = '9001';
      else if (parsed.category === 'ACCESSORY') hsnCode = '9003';
    }

    const session = await getCurrentSession();

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
        organizationId: session.organizationId,
        branchId: session.branchId,
        isActive: true,
      })
      .returning();

    revalidatePath('/admin/inventory');
    revalidatePath('/');
    return { success: true, item: inserted };
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
  taxRate?: '5.00' | '18.00';
  hsnCode?: string | null;
}

export async function updateInventoryItem(
  id: string,
  rawInput: UpdateInventoryItemInput
): Promise<{
  success: boolean;
  item?: InventoryRow;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    const updateData: Partial<typeof inventoryItems.$inferInsert> = {
      updatedAt: new Date(),
    };

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

    revalidatePath('/admin/inventory');
    revalidatePath('/');
    return { success: true, item: updated };
  } catch (error: unknown) {
    console.error('[updateInventoryItem] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inventory item',
    };
  }
}

export async function deleteInventoryItem(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

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
    return { success: true };
  } catch (error: unknown) {
    console.error('[deleteInventoryItem] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete inventory item',
    };
  }
}
