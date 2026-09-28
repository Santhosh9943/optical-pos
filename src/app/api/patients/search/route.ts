import { db } from '@/db';
import { customers } from '@/db/schema';
import { and, eq, ilike, isNull, like, or, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { withCache } from '@/lib/cache';
import { getCurrentSession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

const PATIENTS_SEARCH_CACHE_TTL = 300; // 5 minutes

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.organizationId || !session.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized: Active user session required', patients: [] },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (
    searchParams.get('phone') ??
    searchParams.get('q') ??
    searchParams.get('query') ??
    ''
  ).trim();

  if (!query || query.length < 2) {
    if (searchParams.get('recent') === 'true' || searchParams.has('recent')) {
      try {
        const recent = await db
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
              isNull(customers.deletedAt)
            )
          )
          .orderBy(desc(customers.updatedAt))
          .limit(6);

        return NextResponse.json({ patients: recent, isRecent: true });
      } catch {
        return NextResponse.json({ patients: [] });
      }
    }
    return NextResponse.json({ patients: [] });
  }

  try {
    const allPatients = await withCache(
      {
        orgId: session.organizationId,
        namespace: 'patients',
        key: `search:${query.toLowerCase()}`,
        ttl: PATIENTS_SEARCH_CACHE_TTL,
      },
      async () => {
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
              isNull(customers.deletedAt),
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

        const result = [...matchingPatients];

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
            .where(
              and(
                isNull(customers.deletedAt),
                or(...primaryIds.map((pid) => eq(customers.primaryCustomerId, pid)))
              )
            );

          for (const dep of dependents) {
            if (!result.some((p) => p.id === dep.id)) {
              result.push(dep);
            }
          }
        }

        return result;
      }
    );

    return NextResponse.json({ patients: allPatients });
  } catch (err) {
    console.error('[patient-search] Failed to search patients:', err);
    return NextResponse.json(
      { error: 'Failed to search patients', patients: [] },
      { status: 500 }
    );
  }
}
