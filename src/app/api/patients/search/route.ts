import { db } from '@/db';
import { customers } from '@/db/schema';
import { like, or, eq, ilike } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('phone') ?? searchParams.get('q') ?? '').trim();

  if (!query) {
    return NextResponse.json({ patients: [] });
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
      or(
        like(customers.phone, `${query}%`),
        ilike(customers.fullName, `%${query}%`)
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

  return NextResponse.json({ patients: allPatients });
}
