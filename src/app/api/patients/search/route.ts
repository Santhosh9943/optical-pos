import { db } from '@/db';
import { customers } from '@/db/schema';
import { like, or, eq, ilike, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';
import { getCurrentSession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

const PATIENTS_SEARCH_CACHE_TTL = 300; // 5 minutes

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('phone') ?? searchParams.get('q') ?? '').trim();

  if (!query) {
    return NextResponse.json({ patients: [] });
  }

  // Cache key: cache:patients:search:{orgId}:{query}
  const cacheKey = `cache:patients:search:${session.organizationId}:${query.toLowerCase()}`;

  try {
    // 1. Check Redis cache first
    const cachedPatients = await cacheGet<any[]>(cacheKey);
    if (cachedPatients) {
      return NextResponse.json({ patients: cachedPatients, cached: true });
    }

    const start = performance.now();

  const matchingPatients = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      age: customers.age,
      gender: customers.gender,
      relationType: customers.relationType,
      primaryCustomerId: customers.primaryCustomerId,
      advanceBalance: customers.advanceBalance,
      city: customers.city,
    })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, session.organizationId),
        or(
          like(customers.phone, `${query}%`),
          ilike(customers.fullName, `%${query}%`)
        )
      )
    )
    .limit(20);

  // If we matched any primary customers, let's also fetch their dependents even if their phone prefix differed
  const primaryIds = matchingPatients
    .filter((p) => !p.primaryCustomerId)
    .map((p) => p.id);

  let allPatients = [...matchingPatients];

  if (primaryIds.length > 0) {
    const dependents = await db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        age: customers.age,
        gender: customers.gender,
        relationType: customers.relationType,
        primaryCustomerId: customers.primaryCustomerId,
        advanceBalance: customers.advanceBalance,
        city: customers.city,
      })
      .from(customers)
      .where(or(...primaryIds.map((pid) => eq(customers.primaryCustomerId, pid))));

    for (const dep of dependents) {
      if (!allPatients.some((p) => p.id === dep.id)) {
        allPatients.push(dep);
      }
    }
  }

  const elapsed = performance.now() - start;
  if (elapsed > 50) {
    console.warn(`[patient-search] Query took ${elapsed.toFixed(1)}ms`);
  }

  // Set Redis cache with 5-minute TTL
  await cacheSet(cacheKey, allPatients, PATIENTS_SEARCH_CACHE_TTL);

  return NextResponse.json({ patients: allPatients, cached: false });
} catch (err) {
  console.error('[patient-search] Failed to search patients:', err);
  return NextResponse.json(
    { error: 'Failed to search patients', patients: [] },
    { status: 500 }
  );
}
}
