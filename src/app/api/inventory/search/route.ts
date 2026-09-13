// src/app/api/inventory/search/route.ts
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  try {
    const searchCondition = q
      ? or(
          ilike(inventoryItems.sku, `%${q}%`),
          ilike(
            sql`${inventoryItems.brand} || ' ' || ${inventoryItems.model}`,
            `%${q}%`
          ),
          ilike(inventoryItems.description, `%${q}%`)
        )
      : undefined;

    // Strict RBAC: Omit costPrice from query projection so wholesale cost never reaches client
    const items = await db
      .select({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        barcode: inventoryItems.barcode,
        category: inventoryItems.category,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        description: inventoryItems.description,
        sellingPrice: inventoryItems.sellingPrice,
        mrp: inventoryItems.mrp,
        stockQuantity: inventoryItems.stockQuantity,
        lowStockThreshold: inventoryItems.lowStockThreshold,
        taxRate: inventoryItems.taxRate,
        hsnCode: inventoryItems.hsnCode,
        lensType: inventoryItems.lensType,
        coating: inventoryItems.coating,
        lensMaterial: inventoryItems.lensMaterial,
      })
      .from(inventoryItems)
      .where(
        searchCondition
          ? and(eq(inventoryItems.isActive, true), searchCondition)
          : eq(inventoryItems.isActive, true)
      )
      .limit(20);

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[inventory-search] Failed to query items:', err);
    return NextResponse.json(
      { error: 'Failed to search inventory', items: [] },
      { status: 500 }
    );
  }
}
