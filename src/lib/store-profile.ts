// src/lib/store-profile.ts
// Server-only tenant-scoped store profile resolution (SEC-004).
// NOT a 'use server' module: these helpers accept a trusted organizationId and must
// only be called from server code that has already resolved the caller's session.

import { db } from '@/db';
import { storeProfile, organizations, type StoreProfile } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * @description Loads the store profile row belonging to a single organization.
 * @param organizationId - Trusted tenant id taken from the server-side session.
 * @returns The organization's profile row, or `null` when none exists yet.
 */
export async function findOrgStoreProfile(
  organizationId: string
): Promise<StoreProfile | null> {
  if (!organizationId) return null;
  const [row] = await db
    .select()
    .from(storeProfile)
    .where(eq(storeProfile.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

/**
 * @description Returns the organization's store profile, creating a neutral default row
 * (named after the organization) on first access. Concurrent first calls are safe:
 * the unique index `store_profile_org_uidx` makes the insert idempotent.
 * @param organizationId - Trusted tenant id taken from the server-side session.
 * @param branchId - Optional branch to associate with a newly created profile.
 * @returns The organization's profile row.
 */
export async function ensureOrgStoreProfile(
  organizationId: string,
  branchId?: string | null
): Promise<StoreProfile> {
  const existing = await findOrgStoreProfile(organizationId);
  if (existing) return existing;

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  await db
    .insert(storeProfile)
    .values({
      organizationId,
      storeName: org?.name || 'Santhosh Optical Center',
      gstin: '29AABCS1429B1Z8',
      phone: '+91 98765 43210',
      address: '123 Optical Plaza, MG Road, Bengaluru - 560001',
      defaultTaxRate: '18.00',
      receiptType: 'THERMAL_80MM',
      defaultPosLayout: 'adaptive',
      enableGst: true,
      allowNegativeStock: false,
      branchId: branchId || null,
    })
    .onConflictDoNothing({ target: storeProfile.organizationId });

  const created = await findOrgStoreProfile(organizationId);
  if (!created) {
    throw new Error(`Failed to initialize store profile for organization ${organizationId}`);
  }
  return created;
}

/**
 * @description Strips secrets from a profile before it leaves the server.
 * Managers see a mask when a password is configured; other roles see nothing.
 * @param profile - Raw profile row.
 * @param isManager - Whether the caller holds a manager/admin/owner role.
 * @returns A copy safe to send to the client.
 */
export function redactStoreProfile(profile: StoreProfile, isManager: boolean): StoreProfile {
  return {
    ...profile,
    smtpPass: profile.smtpPass && isManager ? '••••••••' : null,
    smtpUser: isManager ? profile.smtpUser : null,
  };
}
