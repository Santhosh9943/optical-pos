import { db } from '@/db';
import { inventoryItems, branches } from '@/db/schema';
import { and, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';
import { getCurrentSession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

const INVENTORY_SEARCH_CACHE_TTL = 300; // 5 minutes

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const category = (searchParams.get('category') ?? '').trim();
  const branchParam = (searchParams.get('branchId') ?? '').trim();

  // Cache key: cache:inventory:search:{orgId}:{branch}:{category}:{query}
  const cacheKey = `cache:inventory:search:${session.organizationId}:${branchParam || 'all'}:${category || 'all'}:${q.toLowerCase()}`;

  try {
    // 1. Check Redis cache first
    const cachedItems = await cacheGet<any[]>(cacheKey);
    if (cachedItems) {
      return NextResponse.json({ items: cachedItems, cached: true });
    }

    const conditions = [
      eq(inventoryItems.isActive, true),
      eq(inventoryItems.organizationId, session.organizationId),
    ];

    if (category) {
      conditions.push(eq(inventoryItems.category, category as any));
    }

    if (branchParam && branchParam !== 'all') {
      const ids = branchParam.split(',').filter(Boolean);
      if (ids.length === 1) {
        conditions.push(
          or(
            eq(inventoryItems.branchId, ids[0]),
            isNull(inventoryItems.branchId)
          )!
        );
      } else if (ids.length > 1) {
        conditions.push(
          or(
            inArray(inventoryItems.branchId, ids),
            isNull(inventoryItems.branchId)
          )!
        );
      }
    }

    if (q) {
      conditions.push(
        or(
          ilike(inventoryItems.sku, `%${q}%`),
          ilike(
            sql`${inventoryItems.brand} || ' ' || ${inventoryItems.model}`,
            `%${q}%`
          ),
          ilike(inventoryItems.description, `%${q}%`)
        )!
      );
    }

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
        branchId: inventoryItems.branchId,
        branchName: branches.name,
      })
      .from(inventoryItems)
      .leftJoin(branches, eq(inventoryItems.branchId, branches.id))
      .where(and(...conditions))
      .limit(30);

    // Set Redis cache with 5-minute TTL
    await cacheSet(cacheKey, items, INVENTORY_SEARCH_CACHE_TTL);

    return NextResponse.json({ items, cached: false });
  } catch (err) {
    console.error('[inventory-search] Failed to query items:', err);
    return NextResponse.json(
      { error: 'Failed to search inventory', items: [] },
      { status: 500 }
    );
  }
}
