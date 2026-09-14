'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
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
      .where(eq(inventoryItems.organizationId, session.organizationId))
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
