// src/app/api/patients/search/route.ts
import { db } from '@/db';
import { customers } from '@/db/schema';
import { like } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = (searchParams.get('phone') ?? '').trim();

  if (!phone) {
    return NextResponse.json({ patients: [] });
  }

  const start = performance.now();

  const patients = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      age: customers.age,
      gender: customers.gender,
      advanceBalance: customers.advanceBalance,
      city: customers.city,
    })
    .from(customers)
    .where(like(customers.phone, `${phone}%`))
    .limit(10);

  const elapsed = performance.now() - start;
  if (elapsed > 50) {
    console.warn(`[patient-search] Query took ${elapsed.toFixed(1)}ms`);
  }

  return NextResponse.json({ patients });
}
