'use server';

import { db } from '@/db';
import {
  organizations,
  branches,
  invoices,
  customers,
  user as userTable,
} from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/auth-utils';
import Decimal from 'decimal.js';

export type RoleMode = 'super_admin' | 'organizer' | 'admin' | 'user';

export interface TenancyContext {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  role: RoleMode;
  organizations: { id: string; name: string }[];
  branches: {
    id: string;
    name: string;
    organizationId: string;
    isActive: boolean;
  }[];
  activeOrganizationId: string;
  activeBranchId: string;
}

export interface PlatformTenantDetail {
  id: string;
  name: string;
  createdAt: string;
  branchCount: number;
  branches: { id: string; name: string; isActive: boolean }[];
  totalInvoices: number;
  totalRevenue: string;
}

export interface SuperAdminPlatformMetrics {
  totalOrganizations: number;
  totalBranches: number;
  totalInvoices: number;
  totalGmv: string;
  totalPatients: number;
  tenants: PlatformTenantDetail[];
}

/**
 * Automatically fetch the current user's tenancy context:
 * - Active Role
 * - Available organizations and branches
 * - Active organization and active branch IDs
 */
export async function getUserTenancyContext(): Promise<TenancyContext> {
  const session = await getCurrentSession();

  // 1. Fetch all organizations
  const orgRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .orderBy(organizations.name);

  // 2. Fetch all branches
  let branchRows = await db
    .select({
      id: branches.id,
      name: branches.name,
      organizationId: branches.organizationId,
      isActive: branches.isActive,
    })
    .from(branches)
    .orderBy(branches.name);

  // If only 1 branch exists, let's create a 2nd demo branch for rich multi-store testing
  if (branchRows.length === 1 && orgRows.length > 0) {
    try {
      const [secondBranch] = await db
        .insert(branches)
        .values({
          organizationId: orgRows[0].id,
          name: 'Indiranagar Flagship',
          isActive: true,
        })
        .returning({
          id: branches.id,
          name: branches.name,
          organizationId: branches.organizationId,
          isActive: branches.isActive,
        });

      if (secondBranch) {
        branchRows.push(secondBranch);
      }
    } catch {
      // Ignore if concurrent creation
    }
  }

  // 3. Determine user role
  let userRole: RoleMode = 'super_admin'; // Default for admin@optix.com and root dev

  if (session.user?.email) {
    const email = session.user.email.toLowerCase();
    if (email === 'admin@optix.com' || email.includes('superadmin')) {
      userRole = 'super_admin';
    } else if (email.includes('owner') || email.includes('partner') || email.includes('practice')) {
      userRole = 'organizer';
    } else if (email.includes('optometrist') || email.includes('manager')) {
      userRole = 'admin';
    } else {
      userRole = 'user';
    }
  }

  return {
    user: session.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }
      : {
          id: 'dev-admin',
          name: 'Administrator',
          email: 'admin@optix.com',
        },
    role: userRole,
    organizations: orgRows,
    branches: branchRows,
    activeOrganizationId: session.organizationId,
    activeBranchId: session.branchId,
  };
}

/**
 * Aggregates platform-wide metrics for the dedicated Super Admin workspace:
 * - Organizations breakdown
 * - Physical stores per tenant
 * - Gross Merchandise Value (GMV) and order totals
 */
export async function getSuperAdminPlatformMetrics(): Promise<SuperAdminPlatformMetrics> {
  const allOrgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  const allBranches = await db.select().from(branches).orderBy(branches.name);
  const allInvoices = await db.select().from(invoices);
  const allCustomers = await db.select().from(customers);

  let platformGmvDec = new Decimal(0);
  const invoicesByOrg = new Map<string, { count: number; revenue: Decimal }>();

  for (const inv of allInvoices) {
    const orgId = inv.organizationId || allOrgs[0]?.id || 'unknown';
    const amountDec = new Decimal(inv.grandTotal || '0.00');
    platformGmvDec = platformGmvDec.plus(amountDec);

    const existing = invoicesByOrg.get(orgId) || {
      count: 0,
      revenue: new Decimal(0),
    };
    existing.count += 1;
    existing.revenue = existing.revenue.plus(amountDec);
    invoicesByOrg.set(orgId, existing);
  }

  const branchesByOrg = new Map<string, typeof allBranches>();
  for (const b of allBranches) {
    const list = branchesByOrg.get(b.organizationId) || [];
    list.push(b);
    branchesByOrg.set(b.organizationId, list);
  }

  const tenants: PlatformTenantDetail[] = allOrgs.map((org) => {
    const orgBranches = branchesByOrg.get(org.id) || [];
    const stats = invoicesByOrg.get(org.id);

    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
      branchCount: orgBranches.length,
      branches: orgBranches.map((b) => ({
        id: b.id,
        name: b.name,
        isActive: b.isActive,
      })),
      totalInvoices: stats?.count || 0,
      totalRevenue: stats ? stats.revenue.toFixed(2) : '0.00',
    };
  });

  return {
    totalOrganizations: allOrgs.length,
    totalBranches: allBranches.length,
    totalInvoices: allInvoices.length,
    totalGmv: platformGmvDec.toFixed(2),
    totalPatients: allCustomers.length,
    tenants,
  };
}

/**
 * Super Admin action: Add a physical store branch to an organization
 */
export async function createBranchAction(
  name: string,
  organizationId: string
): Promise<{ success: boolean; branch?: { id: string; name: string }; error?: string }> {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Branch name cannot be empty' };
    }

    const [created] = await db
      .insert(branches)
      .values({
        name: trimmed,
        organizationId,
        isActive: true,
      })
      .returning();

    return { success: true, branch: created };
  } catch (err: unknown) {
    console.error('[createBranchAction] Failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create branch',
    };
  }
}
