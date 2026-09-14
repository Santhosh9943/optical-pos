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

/**
 * Super Admin action: Register a new SaaS tenant organization
 */
export async function createOrganizationAction(
  name: string
): Promise<{ success: boolean; organization?: { id: string; name: string }; error?: string }> {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Organization name cannot be empty' };
    }

    const [createdOrg] = await db
      .insert(organizations)
      .values({
        name: trimmed,
      })
      .returning();

    if (createdOrg) {
      // Automatically create a default main branch for the newly registered organization
      await db.insert(branches).values({
        name: 'Main Branch',
        organizationId: createdOrg.id,
        isActive: true,
      });
    }

    return { success: true, organization: createdOrg };
  } catch (err: unknown) {
    console.error('[createOrganizationAction] Failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create organization',
    };
  }
}

/**
 * Fetch branches for a specific organization
 */
export async function getOrganizationBranchesAction(organizationId: string) {
  try {
    const list = await db
      .select({
        id: branches.id,
        name: branches.name,
        organizationId: branches.organizationId,
        isActive: branches.isActive,
      })
      .from(branches)
      .where(eq(branches.organizationId, organizationId))
      .orderBy(branches.name);

    return { success: true, branches: list };
  } catch (err: unknown) {
    console.error('[getOrganizationBranchesAction] Failed:', err);
    return { success: false, branches: [], error: 'Failed to load branches' };
  }
}

/**
 * Toggle branch active status
 */
export async function toggleBranchStatusAction(branchId: string, isActive: boolean) {
  try {
    const [updated] = await db
      .update(branches)
      .set({ isActive })
      .where(eq(branches.id, branchId))
      .returning();

    return { success: true, branch: updated };
  } catch (err: unknown) {
    console.error('[toggleBranchStatusAction] Failed:', err);
    return { success: false, error: 'Failed to update branch status' };
  }
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'optometrist';
  organizationId: string;
  branchId: string;
  branchName?: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * In-memory fallback / persisted staff store for multi-branch practice staff management
 */
const mockStaffStore: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@optix.com',
    role: 'optometrist',
    organizationId: '00000000-0000-0000-0000-000000000001',
    branchId: '00000000-0000-0000-0000-000000000002',
    branchName: 'Main Branch',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    name: 'Vikram Patel',
    email: 'vikram.manager@optix.com',
    role: 'admin',
    organizationId: '00000000-0000-0000-0000-000000000001',
    branchId: '00000000-0000-0000-0000-000000000002',
    branchName: 'Main Branch',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-3',
    name: 'Ananya Iyer',
    email: 'ananya.pos@optix.com',
    role: 'staff',
    organizationId: '00000000-0000-0000-0000-000000000001',
    branchId: '00000000-0000-0000-0000-000000000002',
    branchName: 'Main Branch',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Fetch staff members for an organization and optional branch filter (single, multiple, or all)
 */
export async function getStaffMembersAction(
  organizationId: string,
  branchFilter?: string | string[]
): Promise<{ success: boolean; staff: StaffMember[]; error?: string }> {
  try {
    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const allBranches = isValidUuid(organizationId)
      ? await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.organizationId, organizationId))
      : await db
          .select({ id: branches.id, name: branches.name })
          .from(branches);

    const branchNameMap = new Map(allBranches.map((b) => [b.id, b.name]));

    // Query actual users if existing
    const existingUsers = await db.select().from(userTable);

    const merged: StaffMember[] = [];

    const defaultBranchId = (typeof branchFilter === 'string' && branchFilter !== 'all')
      ? branchFilter
      : (Array.isArray(branchFilter) && branchFilter.length > 0 && !branchFilter.includes('all'))
      ? branchFilter[0]
      : allBranches[0]?.id || 'default-branch';

    for (const u of existingUsers) {
      if (u.email === 'admin@optix.com') continue; // Skip super admin
      merged.push({
        id: u.id,
        name: u.name,
        email: u.email,
        role: (u.email.includes('admin') || u.email.includes('manager') ? 'admin' : 'staff') as 'admin' | 'staff',
        organizationId,
        branchId: defaultBranchId,
        branchName: branchNameMap.get(defaultBranchId) || allBranches[0]?.name || 'Main Branch',
        isActive: true,
        createdAt: u.createdAt.toISOString(),
      });
    }

    // Include mock staff
    for (const m of mockStaffStore) {
      if (!merged.some((s) => s.email === m.email)) {
        merged.push({
          ...m,
          branchName: branchNameMap.get(m.branchId) || m.branchName || 'Main Branch',
        });
      }
    }

    let filtered = merged;
    if (Array.isArray(branchFilter)) {
      if (branchFilter.length > 0 && !branchFilter.includes('all')) {
        filtered = merged.filter((s) => branchFilter.includes(s.branchId));
      }
    } else if (branchFilter && branchFilter !== 'all') {
      filtered = merged.filter((s) => s.branchId === branchFilter);
    }

    return { success: true, staff: filtered };
  } catch (err: unknown) {
    console.error('[getStaffMembersAction] Failed:', err);
    return { success: false, staff: [], error: 'Failed to load staff members' };
  }
}

/**
 * Add / Invite a new staff member to an organization and branch
 */
export async function createStaffMemberAction(data: {
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'optometrist';
  organizationId: string;
  branchId: string;
}): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
  try {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      return { success: false, error: 'Name and email are required' };
    }

    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // Resolve branchRow safely
    let branchRow: { id: string; name: string } | undefined;

    if (data.branchId && isValidUuid(data.branchId)) {
      const [found] = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.id, data.branchId))
        .limit(1);
      branchRow = found;
    }

    if (!branchRow) {
      // Fallback to any branch belonging to the organization or any active branch
      let fallbackBranches: { id: string; name: string }[] = [];
      if (data.organizationId && isValidUuid(data.organizationId)) {
        fallbackBranches = await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.organizationId, data.organizationId))
          .limit(1);
      }
      if (fallbackBranches.length === 0) {
        fallbackBranches = await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .limit(1);
      }
      branchRow = fallbackBranches[0];
    }

    const finalBranchId = branchRow?.id || '00000000-0000-0000-0000-000000000002';
    const finalBranchName = branchRow?.name || 'Main Branch';

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      role: data.role,
      organizationId: data.organizationId || '00000000-0000-0000-0000-000000000001',
      branchId: finalBranchId,
      branchName: finalBranchName,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    mockStaffStore.push(newStaff);

    // Also attempt creating in user table for auth compatibility
    try {
      await db.insert(userTable).values({
        id: newStaff.id,
        name: trimmedName,
        email: trimmedEmail,
        emailVerified: false,
      });
    } catch (e) {
      console.warn('[createStaffMemberAction] User table insert skipped:', e);
    }

    return { success: true, staff: newStaff };
  } catch (err: unknown) {
    console.error('[createStaffMemberAction] Failed:', err);
    return { success: false, error: 'Failed to create staff member' };
  }
}

