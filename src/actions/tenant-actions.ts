'use server';

import { db } from '@/db';
import {
  organizations,
  branches,
  invoices,
  customers,
  user as userTable,
  member as memberTable,
  organization as organizationTable,
  session as sessionTable,
  approvalRequests as approvalRequestsTable,
  staffStoreAssignments,
  storeProfile,
} from '@/db/schema';
import { eq, sql, desc, and, inArray } from 'drizzle-orm';
import { getCurrentSession, isOwnerOrSuperAdmin } from '@/lib/auth-utils';
import { withCache, invalidateCache } from '@/lib/cache';
import { auth } from '@/lib/auth';
import { getSuperAdminSessionAction } from '@/actions/super-admin-auth-actions';
import { seedDefaultProductTypesForOrganization } from '@/lib/default-product-types';
import Decimal from 'decimal.js';
import { z } from 'zod';

export type RoleMode =
  | 'super_admin'
  | 'super_moderator'
  | 'super_viewer'
  | 'organizer'
  | 'moderator'
  | 'admin'
  | 'user'
  | 'viewer';

export interface TenancyContext {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  role: RoleMode;
  organizations: {
    id: string;
    name: string;
    orgCode?: string | null;
    orgNumber?: number | null;
  }[];
  branches: {
    id: string;
    name: string;
    organizationId: string;
    isActive: boolean;
  }[];
  activeOrganizationId: string;
  activeBranchId: string;
  activeOrgCode?: string | null;
}

export interface BranchDetail {
  id: string;
  name: string;
  isActive: boolean;
  userCount?: number;
}

export interface PlatformTenantDetail {
  id: string;
  name: string;
  orgCode?: string | null;
  orgNumber?: number | null;
  createdAt: string;
  branchCount: number;
  branches: BranchDetail[];
  totalUsers: number;
  isActive: boolean;
  totalInvoices?: number;
  totalRevenue?: string;
}

export interface SuperAdminPlatformMetrics {
  totalOrganizations: number;
  totalBranches: number;
  totalUsers: number;
  activeBranches: number;
  tenants: PlatformTenantDetail[];
  totalInvoices?: number;
  totalGmv?: string;
  totalPatients?: number;
}

const suspendedOrganizations = new Set<string>();

/** Result of resolving the caller's tenant scope for a tenant-actions operation. */
type TenantScopeResult =
  | {
      ok: true;
      /** Organization the operation is allowed to act on. */
      organizationId: string;
      /** Authenticated Better Auth user id (absent for OTP-only platform super admin sessions). */
      userId: string | null;
      userEmail: string;
      userName: string;
      /** True when the caller is a verified platform super admin / moderator. */
      isPlatformAdmin: boolean;
    }
  | { ok: false; error: string };

/**
 * @description Resolves and authorizes the organization an action may operate on.
 * - Verified platform super admins (via `verifySuperAdminAccessAction`) may target any organization
 *   supplied by the client (falling back to their session org). Mutations require `canMutate`.
 * - Everyone else is FORCED onto `session.organizationId`; a client-supplied organizationId is ignored.
 * - When `requireOwner` is set, non-platform callers must be the Organization Owner.
 * @param requestedOrgId - Organization id supplied by the client (only honoured for platform admins)
 * @param opts - `requireOwner` (owner-only op), `mutating` (write op; platform viewers are rejected)
 * @returns A discriminated TenantScopeResult
 */
async function resolveTenantScope(
  requestedOrgId: string | undefined | null,
  opts: { requireOwner: boolean; mutating: boolean }
): Promise<TenantScopeResult> {
  const session = await getCurrentSession();
  const platform = await verifySuperAdminAccessAction();

  if (platform.isSuperAdmin && (!opts.mutating || platform.canMutate)) {
    const orgId = (requestedOrgId || '').trim() || session.organizationId;
    if (!orgId) return { ok: false, error: 'Organization id is required' };
    return {
      ok: true,
      organizationId: orgId,
      userId: session.user?.id ?? null,
      userEmail: session.user?.email || platform.email || '',
      userName: session.user?.name || platform.name || 'Platform Admin',
      isPlatformAdmin: true,
    };
  }

  if (!session.user?.id || !session.organizationId) {
    return { ok: false, error: 'Unauthorized: Please log in' };
  }

  if (opts.requireOwner && !(await isOwnerOrSuperAdmin(session))) {
    return { ok: false, error: 'Forbidden: Only the Organization Owner can perform this action' };
  }

  return {
    ok: true,
    organizationId: session.organizationId,
    userId: session.user.id,
    userEmail: session.user.email || '',
    userName: session.user.name || '',
    isPlatformAdmin: false,
  };
}

/**
 * @description Asserts the caller is a verified platform super admin (optionally with mutate rights).
 * @param mutating - When true, read-only platform viewers are rejected.
 * @returns true when authorized
 */
async function isVerifiedPlatformAdmin(mutating: boolean): Promise<boolean> {
  const access = await verifySuperAdminAccessAction();
  return access.isSuperAdmin && (!mutating || access.canMutate);
}

/**
 * Super Admin action: Toggle active/suspended status of a SaaS practice.
 * Requires a verified platform super admin with mutate rights.
 */
export async function toggleOrganizationStatusAction(
  organizationId: string,
  isActive: boolean
): Promise<{ success: boolean; isActive: boolean }> {
  if (!(await isVerifiedPlatformAdmin(true))) {
    return { success: false, isActive: !isActive };
  }
  if (isActive) {
    suspendedOrganizations.delete(organizationId);
  } else {
    suspendedOrganizations.add(organizationId);
  }
  return { success: true, isActive };
}

/**
 * Automatically fetch the current user's tenancy context:
 * - Active Role
 * - Available organizations and branches
 * - Active organization and active branch IDs
 */
export async function getUserTenancyContext(): Promise<TenancyContext> {
  const session = await getCurrentSession();

  // 1. Determine user role and Super Admin status
  const superAdminEnv = process.env.SUPER_ADMIN_EMAILS || 'msanthosh9943@gmail.com';
  const superAdminEmails = superAdminEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isRootSuperAdmin = session.user?.email && superAdminEmails.includes(session.user.email.toLowerCase());

  let userRole: RoleMode = 'user';

  if (isRootSuperAdmin) {
    userRole = 'super_admin';
  } else if (session.user?.id) {
    // Check if user has a platform role in userTable
    const [userRecord] = await db
      .select({ role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);

    if (userRecord?.role === 'super_moderator') {
      userRole = 'super_moderator';
    } else if (userRecord?.role === 'super_viewer') {
      userRole = 'super_viewer';
    } else {
      // Check tenant membership in memberTable
      try {
        const [userMember] = await db
          .select({ role: memberTable.role })
          .from(memberTable)
          .where(eq(memberTable.userId, session.user.id))
          .limit(1);

        if (userMember) {
          const r = userMember.role.toLowerCase();
          const roles = r.split(',').map((s) => s.trim());

          // STRICT: Only the sovereign practice proprietor with role 'owner' becomes 'organizer'
          if (roles.includes('owner') || r === 'owner' || r === 'organizer') {
            userRole = 'organizer';
          } else if (roles.includes('admin') || roles.includes('manager') || r.includes('manager')) {
            userRole = 'admin'; // Store Manager / Store Admin (NOT Owner!)
          } else if (roles.includes('optometrist')) {
            userRole = 'admin'; // Clinical Optometrist
          } else if (roles.includes('moderator')) {
            userRole = 'moderator';
          } else if (roles.includes('viewer') || roles.includes('readonly')) {
            userRole = 'viewer';
          } else {
            userRole = 'user'; // Sales Staff / Cashier
          }
        } else {
          userRole = 'user';
        }
      } catch {
        userRole = 'user';
      }
    }
  }

  // 2. Fetch organizations and branches scoped strictly by user authorization
  let orgRows: { id: string; name: string; orgCode?: string | null; orgNumber?: number | null }[] = [];
  let branchRows: { id: string; name: string; organizationId: string; isActive: boolean }[] = [];

  if (userRole === 'super_admin') {
    orgRows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        orgCode: organizations.orgCode,
        orgNumber: organizations.orgNumber,
      })
      .from(organizations)
      .orderBy(organizations.name);

    branchRows = await db
      .select({
        id: branches.id,
        name: branches.name,
        organizationId: branches.organizationId,
        isActive: branches.isActive,
      })
      .from(branches)
      .orderBy(branches.name);
  } else if (session.organizationId) {
    // Non-super-admins strictly only see their own registered organization
    orgRows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        orgCode: organizations.orgCode,
        orgNumber: organizations.orgNumber,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId));

    if (userRole === 'organizer') {
      // Organization owner can view and switch between all branches in their organization
      branchRows = await db
        .select({
          id: branches.id,
          name: branches.name,
          organizationId: branches.organizationId,
          isActive: branches.isActive,
        })
        .from(branches)
        .where(eq(branches.organizationId, session.organizationId))
        .orderBy(branches.name);
    } else if (session.user?.id) {
      // Store Staff / Managers: strictly fetch only stores assigned to them in staffStoreAssignments
      try {
        const assignedRows = await db
          .select({
            id: branches.id,
            name: branches.name,
            organizationId: branches.organizationId,
            isActive: branches.isActive,
          })
          .from(staffStoreAssignments)
          .innerJoin(branches, eq(staffStoreAssignments.branchId, branches.id))
          .where(
            and(
              eq(staffStoreAssignments.userId, session.user.id),
              eq(staffStoreAssignments.organizationId, session.organizationId)
            )
          )
          .orderBy(branches.name);

        if (assignedRows.length > 0) {
          branchRows = assignedRows;
        } else {
          // Fallback to org's branches if no explicit assignment table row exists yet
          branchRows = await db
            .select({
              id: branches.id,
              name: branches.name,
              organizationId: branches.organizationId,
              isActive: branches.isActive,
            })
            .from(branches)
            .where(eq(branches.organizationId, session.organizationId))
            .orderBy(branches.name);
        }
      } catch (err) {
        console.warn('[getUserTenancyContext] Staff store assignment lookup note:', err);
      }
    }
  }

  const activeOrg = orgRows.find((o) => o.id === (session.organizationId || orgRows[0]?.id));
  const activeOrgCode = activeOrg?.orgCode || (activeOrg?.orgNumber ? `OPT-${activeOrg.orgNumber}` : null);

  return {
    user: session.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }
      : null,
    role: userRole,
    organizations: orgRows,
    branches: branchRows,
    activeOrganizationId: session.organizationId || orgRows[0]?.id || '',
    activeBranchId: session.branchId || branchRows[0]?.id || '',
    activeOrgCode,
  };
}

/**
 * Aggregates platform-wide governance metrics for the dedicated Super Admin workspace:
 * - Focuses strictly on SaaS Practices, Physical Store Branches, and Branch Users
 * - Enforces customer privacy by omitting patient optical records & retail invoices
 */
export async function getSuperAdminPlatformMetrics(): Promise<SuperAdminPlatformMetrics> {
  if (!(await isVerifiedPlatformAdmin(false))) {
    throw new Error('Unauthorized: Platform super admin access required');
  }
  const allOrgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  const allBranches = await db.select().from(branches).orderBy(branches.name);

  const branchesByOrg = new Map<string, typeof allBranches>();
  for (const b of allBranches) {
    const list = branchesByOrg.get(b.organizationId) || [];
    list.push(b);
    branchesByOrg.set(b.organizationId, list);
  }

  // Fetch registered team members from memberTable
  let allMembers: { organizationId: string; userId: string; role: string }[] = [];
  try {
    allMembers = await db
      .select({
        organizationId: memberTable.organizationId,
        userId: memberTable.userId,
        role: memberTable.role,
      })
      .from(memberTable);
  } catch (err) {
    console.warn('[getSuperAdminPlatformMetrics] Member table warning:', err);
  }

  const tenants: PlatformTenantDetail[] = allOrgs.map((org) => {
    const orgBranches = branchesByOrg.get(org.id) || [];
    const orgMembers = allMembers.filter((m) => m.organizationId === org.id);
    const totalOrgUsers = orgMembers.length;
    const orgCode = org.orgCode || (org.orgNumber ? `OPT-${org.orgNumber}` : 'OPT-1');

    return {
      id: org.id,
      name: org.name,
      orgCode,
      orgNumber: org.orgNumber,
      createdAt: org.createdAt.toISOString(),
      branchCount: orgBranches.length,
      branches: orgBranches.map((b) => ({
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        userCount: orgMembers.length || 0,
      })),
      totalUsers: totalOrgUsers,
      isActive: !suspendedOrganizations.has(org.id),
      totalInvoices: 0,
      totalRevenue: '0.00',
    };
  });

  const activeBranchCount = allBranches.filter((b) => b.isActive).length;
  const totalPlatformUsers = tenants.reduce((acc, t) => acc + t.totalUsers, 0);

  return {
    totalOrganizations: allOrgs.length,
    totalBranches: allBranches.length,
    totalUsers: totalPlatformUsers,
    activeBranches: activeBranchCount,
    tenants,
    totalInvoices: 0,
    totalGmv: '0.00',
    totalPatients: 0,
  };
}

/** Zod schema for a branch display name. */
const branchNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().min(1, 'Branch name cannot be empty').max(120));

/**
 * Add a physical store branch to an organization.
 * Organization Owners may only add to their own session organization; verified platform super
 * admins may target any organization.
 */
export async function createBranchAction(
  name: string,
  organizationId: string
): Promise<{ success: boolean; branch?: { id: string; name: string }; error?: string }> {
  try {
    const parsed = branchNameSchema.safeParse(name);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Branch name cannot be empty' };
    }
    const trimmed = parsed.data;

    const scope = await resolveTenantScope(organizationId, { requireOwner: true, mutating: true });
    if (!scope.ok) return { success: false, error: scope.error };
    const targetOrgId = scope.organizationId;

    const [created] = await db
      .insert(branches)
      .values({
        name: trimmed,
        organizationId: targetOrgId,
        isActive: true,
      })
      .returning();

    await invalidateCache({ orgId: targetOrgId, namespace: 'branches' });

    // Automatically ensure default product types and workflows exist for this practice
    try {
      await seedDefaultProductTypesForOrganization(targetOrgId);
    } catch (seedErr) {
      console.warn('[createBranchAction] Default product types seed note:', seedErr);
    }

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
): Promise<{ success: boolean; organization?: { id: string; name: string; orgCode?: string | null }; error?: string }> {
  try {
    if (!(await isVerifiedPlatformAdmin(true))) {
      return { success: false, error: 'Unauthorized: Platform super admin access required' };
    }

    const parsed = z
      .string()
      .transform((v) => v.trim())
      .pipe(z.string().min(1, 'Organization name cannot be empty').max(160))
      .safeParse(name);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Organization name cannot be empty' };
    }
    const trimmed = parsed.data;

    const prefix = (process.env.ORG_CODE_PREFIX || 'OPT').trim().toUpperCase();
    const [maxRow] = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(org_number), 0)` })
      .from(organizations);
    const nextOrgNumber = Number(maxRow?.maxNum || 0) + 1;
    const orgCode = `${prefix}-${nextOrgNumber}`;

    const [createdOrg] = await db
      .insert(organizations)
      .values({
        name: trimmed,
        orgCode,
        orgNumber: nextOrgNumber,
        hasCompletedOnboarding: true,
        planId: 'starter',
        subscriptionStatus: 'active',
      })
      .returning();

    if (createdOrg) {
      // Sync with Better Auth organization table for member relations
      try {
        await db.insert(organizationTable).values({
          id: createdOrg.id,
          name: trimmed,
          slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + nextOrgNumber,
          createdAt: new Date(),
        });
      } catch (authOrgErr) {
        console.warn('[createOrganizationAction] Auth organization sync warning:', authOrgErr);
      }

      // Automatically create a default main branch for the newly registered organization
      await db.insert(branches).values({
        name: 'Main Branch',
        organizationId: createdOrg.id,
        isActive: true,
      });

      // Automatically seed default product types and workflows for this organization
      try {
        await seedDefaultProductTypesForOrganization(createdOrg.id);
      } catch (seedErr) {
        console.warn('[createOrganizationAction] Default product types seed note:', seedErr);
      }
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
    const scope = await resolveTenantScope(organizationId, { requireOwner: false, mutating: false });
    if (!scope.ok) return { success: false, branches: [], error: scope.error };

    const list = await db
      .select({
        id: branches.id,
        name: branches.name,
        organizationId: branches.organizationId,
        isActive: branches.isActive,
      })
      .from(branches)
      .where(eq(branches.organizationId, scope.organizationId))
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
    const parsed = z.object({ branchId: z.string().min(1), isActive: z.boolean() }).safeParse({ branchId, isActive });
    if (!parsed.success) return { success: false, error: 'Invalid branch status payload' };

    const platformAdmin = await isVerifiedPlatformAdmin(true);
    let whereClause = eq(branches.id, branchId);
    let scopedOrgId: string | null = null;
    if (!platformAdmin) {
      const scope = await resolveTenantScope(null, { requireOwner: true, mutating: true });
      if (!scope.ok) return { success: false, error: scope.error };
      scopedOrgId = scope.organizationId;
      whereClause = and(eq(branches.id, branchId), eq(branches.organizationId, scope.organizationId)) ?? whereClause;
    }

    const [updated] = await db
      .update(branches)
      .set({ isActive })
      .where(whereClause)
      .returning();

    if (!updated) {
      return { success: false, error: 'Store branch not found in this organization' };
    }

    await invalidateCache({ orgId: scopedOrgId || updated.organizationId, namespace: 'branches' });
    return { success: true, branch: updated };
  } catch (err: unknown) {
    console.error('[toggleBranchStatusAction] Failed:', err);
    return { success: false, error: 'Failed to update branch status' };
  }
}

/**
 * Sovereign Organization Owner action: Delete a physical store branch directly.
 * Does NOT require Super Admin approval.
 * Invariants enforced:
 * 1. Must be executed by Organization Owner or Platform Super Admin.
 * 2. Organization must retain at least one active branch (cannot delete sole branch).
 * 3. Safely cleans up staff store assignments and invalidates cache.
 */
export async function deleteBranchAction(
  branchId: string,
  requestedOrganizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const scope = await resolveTenantScope(requestedOrganizationId, { requireOwner: true, mutating: true });
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }
    const organizationId = scope.organizationId;

    // 1. Confirm branch belongs to this organization
    const [targetBranch] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.organizationId, organizationId)))
      .limit(1);

    if (!targetBranch) {
      return { success: false, error: 'Store branch not found in this organization' };
    }

    // 2. Invariant: Practice must have at least one remaining branch
    const allOrgBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.organizationId, organizationId));

    if (allOrgBranches.length <= 1) {
      return {
        success: false,
        error: 'Cannot delete the sole remaining branch. An organization must maintain at least one store location.',
      };
    }

    // 3. Atomically delete staff store assignments for this branch, then delete the branch
    await db
      .delete(staffStoreAssignments)
      .where(
        and(
          eq(staffStoreAssignments.organizationId, organizationId),
          eq(staffStoreAssignments.branchId, branchId)
        )
      );

    await db
      .delete(branches)
      .where(and(eq(branches.id, branchId), eq(branches.organizationId, organizationId)));

    await invalidateCache({ orgId: organizationId, namespace: 'branches' });
    await invalidateCache({ orgId: organizationId, namespace: 'staff' });

    return { success: true };
  } catch (err: unknown) {
    console.error('[deleteBranchAction] Failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete branch',
    };
  }
}

/**
 * Sovereign Organization Owner action: Request complete deletion of their organization from OptixOS SaaS.
 * This is the ONLY operation that requires Super Admin review and approval!
 */
export async function requestOrganizationDeletionAction(data: {
  organizationId: string;
  reason: string;
}): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id || !session.organizationId) {
      return { success: false, error: 'Unauthorized: Session missing' };
    }

    const isOwner = await isOwnerOrSuperAdmin(session);
    if (!isOwner) {
      return { success: false, error: 'Forbidden: Only the Organization Owner can request organization deletion' };
    }

    // Owners may only request deletion of their own session organization (client org id is ignored)
    const targetOrgId = session.organizationId;
    const reason = z.string().max(2000).safeParse(data?.reason ?? '');
    if (!reason.success) {
      return { success: false, error: 'Reason is too long' };
    }

    const [org] = await db
      .select({ name: organizations.name, orgCode: organizations.orgCode })
      .from(organizations)
      .where(eq(organizations.id, targetOrgId))
      .limit(1);

    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    const [req] = await db
      .insert(approvalRequestsTable)
      .values({
        type: 'delete_organization',
        targetId: targetOrgId,
        targetName: `Delete Practice: ${org.name} (${org.orgCode || 'NO-CODE'})`,
        requesterId: session.user.id,
        requesterEmail: session.user.email || '',
        requesterName: session.user.name || 'Organization Owner',
        reason: reason.data.trim() || 'Organization owner requested deletion of practice',
        status: 'pending',
        organizationId: targetOrgId,
      })
      .returning();

    return { success: true, requestId: req.id };
  } catch (err: unknown) {
    console.error('[requestOrganizationDeletionAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit organization deletion request',
    };
  }
}

export type OperationalRole = 'admin' | 'optometrist' | 'staff';

export interface StaffStoreAccess {
  branchId: string;
  branchName: string;
  role: string;
  isPrimary: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  roles: OperationalRole[];
  organizationId: string;
  branchId: string;
  branchName?: string;
  stores?: StaffStoreAccess[];
  storeCount?: number;
  mustChangePassword?: boolean;
  isActive: boolean;
  createdAt: string;
}

/**
 * Fetch staff members for an organization and optional branch filter (single, multiple, or all)
 */
export async function getStaffMembersAction(
  requestedOrganizationId: string,
  branchFilter?: string | string[]
): Promise<{ success: boolean; staff: StaffMember[]; error?: string }> {
  try {
    const scope = await resolveTenantScope(requestedOrganizationId, { requireOwner: false, mutating: false });
    if (!scope.ok) return { success: false, staff: [], error: scope.error };
    const organizationId = scope.organizationId;

    const branchKey = Array.isArray(branchFilter)
      ? branchFilter.slice().sort().join(',')
      : (branchFilter || 'all');

    return await withCache(
      {
        orgId: organizationId,
        namespace: 'staff',
        key: `list:${branchKey}`,
        ttl: 300,
      },
      async () => {
        const isValidUuid = (val: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        // Strict tenant scoping: never fall back to listing every organization's branches
        const allBranches = isValidUuid(organizationId)
          ? await db
              .select({ id: branches.id, name: branches.name })
              .from(branches)
              .where(eq(branches.organizationId, organizationId))
          : [];

        const branchNameMap = new Map(allBranches.map((b) => [b.id, b.name]));

        // 1. Query users associated with THIS SPECIFIC organization in memberTable
        let memberRows: {
          id: string;
          name: string;
          email: string;
          role: string;
          mustChangePassword: boolean;
          createdAt: Date;
        }[] = [];

        try {
          memberRows = await db
            .select({
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              role: memberTable.role,
              mustChangePassword: userTable.mustChangePassword,
              createdAt: memberTable.createdAt,
            })
            .from(memberTable)
            .innerJoin(userTable, eq(memberTable.userId, userTable.id))
            .where(eq(memberTable.organizationId, organizationId));
        } catch (e) {
          console.warn('[getStaffMembersAction] Member table query warning:', e);
        }

        // 2. Fetch all store assignments for this organization
        let allAssignments: {
          userId: string;
          branchId: string;
          branchName: string;
          role: string;
          isPrimary: boolean;
        }[] = [];

        try {
          allAssignments = await db
            .select({
              userId: staffStoreAssignments.userId,
              branchId: staffStoreAssignments.branchId,
              branchName: branches.name,
              role: staffStoreAssignments.role,
              isPrimary: staffStoreAssignments.isPrimary,
            })
            .from(staffStoreAssignments)
            .innerJoin(branches, eq(staffStoreAssignments.branchId, branches.id))
            .where(eq(staffStoreAssignments.organizationId, organizationId));
        } catch (e) {
          console.warn('[getStaffMembersAction] Store assignments query warning:', e);
        }

        const assignmentsByUser = new Map<string, StaffStoreAccess[]>();
        for (const a of allAssignments) {
          const list = assignmentsByUser.get(a.userId) || [];
          list.push({
            branchId: a.branchId,
            branchName: a.branchName,
            role: a.role,
            isPrimary: a.isPrimary,
          });
          assignmentsByUser.set(a.userId, list);
        }

        const merged: StaffMember[] = [];
        const defaultBranchId = (typeof branchFilter === 'string' && branchFilter !== 'all')
          ? branchFilter
          : (Array.isArray(branchFilter) && branchFilter.length > 0 && !branchFilter.includes('all'))
          ? branchFilter[0]
          : allBranches[0]?.id || 'default-branch';

        for (const m of memberRows) {
          if (m.email === 'admin@optix.com' || m.email === 'admin@optixos.com') continue; // Skip super admin

          // INVARIANT: Organization Owner is NOT a store employee. They have sovereign access across all branches by default.
          const rawRoleStr = (m.role || '').toLowerCase();
          if (rawRoleStr === 'owner' || rawRoleStr.includes('owner')) {
            continue;
          }

          // Parse multi-roles from comma-separated string
          const rawRoles = rawRoleStr.split(',').map((s) => s.trim()).filter(Boolean);
          const parsedRoles: OperationalRole[] = [];
          if (rawRoles.includes('admin') || rawRoles.includes('manager')) parsedRoles.push('admin');
          if (rawRoles.includes('optometrist')) parsedRoles.push('optometrist');
          if (rawRoles.includes('staff') || rawRoles.includes('clerk') || parsedRoles.length === 0) parsedRoles.push('staff');

          const userStores = assignmentsByUser.get(m.id) || [];
          const primaryStore = userStores.find((s) => s.isPrimary) || userStores[0];
          const assignedBranchId = primaryStore?.branchId || defaultBranchId;
          const assignedBranchName = primaryStore?.branchName || branchNameMap.get(assignedBranchId) || 'Main Branch';

          merged.push({
            id: m.id,
            name: m.name,
            email: m.email,
            role: parsedRoles.join(','),
            roles: parsedRoles,
            organizationId,
            branchId: assignedBranchId,
            branchName: assignedBranchName,
            stores: userStores,
            storeCount: userStores.length,
            mustChangePassword: m.mustChangePassword,
            isActive: true,
            createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
          });
        }

        let filtered = merged;
        if (Array.isArray(branchFilter)) {
          if (branchFilter.length > 0 && !branchFilter.includes('all')) {
            filtered = merged.filter((s) =>
              s.stores?.some((st) => branchFilter.includes(st.branchId)) || branchFilter.includes(s.branchId)
            );
          }
        } else if (branchFilter && branchFilter !== 'all') {
          filtered = merged.filter((s) =>
            s.stores?.some((st) => st.branchId === branchFilter) || s.branchId === branchFilter
          );
        }

        return { success: true, staff: filtered };
      }
    );
  } catch (err: unknown) {
    console.error('[getStaffMembersAction] Failed:', err);
    return { success: false, staff: [], error: 'Failed to load staff members' };
  }
}

/** Zod schema for createStaffMemberAction input (mirrors the legacy param shape). */
const createStaffMemberSchema = z.object({
  name: z.string().trim().min(1, 'Name and email are required').max(120),
  email: z.string().trim().toLowerCase().email('A valid email address is required').max(254),
  password: z.string().max(128).optional(),
  mustChangePassword: z.boolean().optional(),
  roles: z.array(z.enum(['admin', 'optometrist', 'staff'])).optional(),
  role: z.string().max(40).optional(),
  organizationId: z.string().optional(),
  branchId: z.string().optional(),
  branchIds: z.array(z.string()).optional(),
  primaryBranchId: z.string().optional(),
});

/**
 * Add / Invite a new staff member to an organization and branch(es) with password and governance.
 *
 * Security invariants:
 * - Organization is ALWAYS the caller's session organization (verified platform super admins may target any org).
 * - Only the Organization Owner / platform super admin may call this.
 * - Branch assignments must belong to the target organization.
 * - An existing user's password is NEVER reset by this action, and a user that already belongs to
 *   a different organization is rejected.
 */
export async function createStaffMemberAction(data: {
  name: string;
  email: string;
  password?: string;
  mustChangePassword?: boolean;
  roles?: OperationalRole[];
  role?: 'admin' | 'staff' | 'optometrist' | string;
  organizationId: string;
  branchId?: string;
  branchIds?: string[];
  primaryBranchId?: string;
}): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
  try {
    const scope = await resolveTenantScope(data?.organizationId, { requireOwner: true, mutating: true });
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const parsedInput = createStaffMemberSchema.safeParse(data);
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0]?.message || 'Invalid staff member details' };
    }
    const input = parsedInput.data;

    const trimmedName = input.name;
    const trimmedEmail = input.email;

    // Resolve assigned roles (defaults to ['staff']); only known operational roles are accepted
    const allowedRoles: OperationalRole[] = ['admin', 'optometrist', 'staff'];
    const legacyRole = input.role && (allowedRoles as string[]).includes(input.role)
      ? (input.role as OperationalRole)
      : null;
    const effectiveRoles: OperationalRole[] = (input.roles && input.roles.length > 0)
      ? Array.from(new Set(input.roles))
      : legacyRole
      ? [legacyRole]
      : ['staff'];

    const roleString = effectiveRoles.join(',');

    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const targetOrgId = scope.organizationId;

    // Fetch branches for this org (strictly scoped; no cross-tenant fallback)
    const orgBranches: { id: string; name: string }[] = isValidUuid(targetOrgId)
      ? await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.organizationId, targetOrgId))
      : [];

    if (orgBranches.length === 0) {
      return { success: false, error: 'Organization has no store branches to assign staff to' };
    }
    const orgBranchIds = new Set(orgBranches.map((b) => b.id));

    // Resolve chosen branches
    const effectiveBranchIds: string[] = (input.branchIds && input.branchIds.length > 0)
      ? input.branchIds
      : input.branchId
      ? [input.branchId]
      : [orgBranches[0].id];

    if (effectiveBranchIds.some((bId) => !orgBranchIds.has(bId))) {
      return { success: false, error: 'Forbidden: One or more selected branches do not belong to this organization' };
    }

    const primaryBranchId = input.primaryBranchId && orgBranchIds.has(input.primaryBranchId)
      ? input.primaryBranchId
      : effectiveBranchIds[0];
    const primaryBranchObj = orgBranches.find((b) => b.id === primaryBranchId) || orgBranches[0];

    // Persist into user table, Better Auth, and member table for strict tenant isolation
    try {
      // 1. Ensure organization exists in Better Auth organizationTable
      const [existingAuthOrg] = await db
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(eq(organizationTable.id, targetOrgId))
        .limit(1);

      if (!existingAuthOrg) {
        let orgName = 'Optix Vision Care';
        if (isValidUuid(targetOrgId)) {
          const [bizOrg] = await db
            .select({ name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, targetOrgId))
            .limit(1);
          if (bizOrg?.name) orgName = bizOrg.name;
        }

        const orgSlug = (orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'org') + '-' + targetOrgId.slice(0, 8);
        await db
          .insert(organizationTable)
          .values({
            id: targetOrgId,
            name: orgName,
            slug: orgSlug,
            createdAt: new Date(),
          })
          .onConflictDoNothing();
      }

      // 2. Ensure user exists in userTable and Better Auth credential account
      const [existingUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, trimmedEmail))
        .limit(1);

      let userId = existingUser?.id;
      const isExistingUser = Boolean(existingUser?.id);
      const initialPassword = input.password?.trim() || 'OptixPass@123';
      const requirePasswordChange = input.mustChangePassword !== undefined ? input.mustChangePassword : true;

      if (existingUser?.id) {
        // SECURITY: Reject users that already belong to a different organization
        const otherMemberships = await db
          .select({ organizationId: memberTable.organizationId })
          .from(memberTable)
          .where(eq(memberTable.userId, existingUser.id));
        if (otherMemberships.some((m) => m.organizationId !== targetOrgId)) {
          return {
            success: false,
            error: 'This email is already registered with another practice and cannot be added here',
          };
        }
      }

      if (!userId) {
        try {
          const authUser = await auth.api.createUser({
            body: {
              name: trimmedName,
              email: trimmedEmail,
              password: initialPassword,
              role: 'user',
            },
          });
          userId = authUser.user.id;
        } catch (authCreateErr) {
          console.warn('[createStaffMemberAction] auth.api.createUser fallback:', authCreateErr);
          userId = `staff-${Date.now()}`;
          await db.insert(userTable).values({
            id: userId,
            name: trimmedName,
            email: trimmedEmail,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      // SECURITY: an existing user's password is never overwritten here (account takeover vector).

      // Set mustChangePassword flag (only for accounts freshly provisioned by this action)
      if (userId && !isExistingUser) {
        await db
          .update(userTable)
          .set({ mustChangePassword: requirePasswordChange })
          .where(eq(userTable.id, userId));
      }

      // 3. Ensure membership in memberTable with multi-roles
      const [existingMember] = await db
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.organizationId, targetOrgId),
            eq(memberTable.userId, userId)
          )
        )
        .limit(1);

      if (!existingMember) {
        await db.insert(memberTable).values({
          id: `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          organizationId: targetOrgId,
          userId,
          role: roleString,
          createdAt: new Date(),
        });
      } else {
        await db
          .update(memberTable)
          .set({ role: roleString })
          .where(eq(memberTable.id, existingMember.id));
      }

      // 4. Record store assignments for all chosen branches in staffStoreAssignments
      for (const bId of effectiveBranchIds) {
        if (!isValidUuid(bId)) continue;
        await db
          .insert(staffStoreAssignments)
          .values({
            organizationId: targetOrgId,
            branchId: bId,
            userId,
            role: roleString,
            isPrimary: bId === primaryBranchId,
          })
          .onConflictDoNothing();
      }

      const createdStaff: StaffMember = {
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        role: roleString,
        roles: effectiveRoles,
        organizationId: targetOrgId,
        branchId: primaryBranchId,
        branchName: primaryBranchObj?.name || 'Main Branch',
        storeCount: effectiveBranchIds.length,
        mustChangePassword: isExistingUser ? undefined : requirePasswordChange,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await invalidateCache({ orgId: targetOrgId, namespace: 'staff' });
      return { success: true, staff: createdStaff };
    } catch (e) {
      console.error('[createStaffMemberAction] DB sync error:', e);
      return { success: false, error: 'Failed to record staff member in database' };
    }
  } catch (err: unknown) {
    console.error('[createStaffMemberAction] Failed:', err);
    return { success: false, error: 'Failed to create staff member' };
  }
}

/** Zod schema for updateStaffMemberRolesAction input. */
const updateStaffRolesSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().optional(),
  roles: z.array(z.enum(['admin', 'optometrist', 'staff'])).min(1, 'Staff member must have at least one role assigned'),
});

/**
 * Update assigned roles for an existing staff member (supporting single or multi-roles).
 * The organization is forced to the caller's session org unless the caller is a verified platform super admin.
 */
export async function updateStaffMemberRolesAction(data: {
  userId: string;
  organizationId: string;
  roles: OperationalRole[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Security Guard 1: Only the Organization Owner or Super Admin can edit staff roles
    const scope = await resolveTenantScope(data?.organizationId, { requireOwner: true, mutating: true });
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }
    const organizationId = scope.organizationId;

    const parsed = updateStaffRolesSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid staff role payload' };
    }
    const input = parsed.data;

    // Security Guard 2: No user can edit their own roles to prevent privilege self-elevation
    if (scope.userId && scope.userId === input.userId) {
      return {
        success: false,
        error: 'Forbidden: You cannot modify your own roles',
      };
    }

    // Verify target user is a member of this organization and NOT the organization owner
    const [targetMember] = await db
      .select({ role: memberTable.role })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, organizationId),
          eq(memberTable.userId, input.userId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return { success: false, error: 'Staff member not found in this organization' };
    }

    if (targetMember.role?.toLowerCase().includes('owner')) {
      return { success: false, error: 'Forbidden: Organization Owner privileges cannot be altered via staff management' };
    }

    const roleString = Array.from(new Set(input.roles)).join(',');
    await db
      .update(memberTable)
      .set({ role: roleString })
      .where(
        and(
          eq(memberTable.organizationId, organizationId),
          eq(memberTable.userId, input.userId)
        )
      );

    // Also update role in staffStoreAssignments
    await db
      .update(staffStoreAssignments)
      .set({ role: roleString })
      .where(
        and(
          eq(staffStoreAssignments.organizationId, organizationId),
          eq(staffStoreAssignments.userId, input.userId)
        )
      );

    await invalidateCache({ orgId: organizationId, namespace: 'staff' });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateStaffMemberRolesAction] Failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update staff roles' };
  }
}

/**
 * Remove a staff member from an organization, enforcing Maker-Checker for Store Managers
 */
export async function deleteStaffMemberAction(data: {
  userId: string;
  organizationId: string;
}): Promise<{ success: boolean; requiresApproval?: boolean; error?: string; message?: string }> {
  try {
    const scope = await resolveTenantScope(data?.organizationId, { requireOwner: false, mutating: true });
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }
    const organizationId = scope.organizationId;
    const parsedIds = z.object({ userId: z.string().min(1) }).safeParse(data);
    if (!parsedIds.success) {
      return { success: false, error: 'Invalid staff member id' };
    }
    const targetUserId = parsedIds.data.userId;

    // Check caller role in this organization (must be a member unless verified platform admin)
    let callerRole = '';
    if (!scope.isPlatformAdmin) {
      const [callerMember] = await db
        .select({ role: memberTable.role })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.organizationId, organizationId),
            eq(memberTable.userId, scope.userId ?? '')
          )
        )
        .limit(1);

      if (!callerMember) {
        return { success: false, error: 'Forbidden: You are not a member of this organization' };
      }
      callerRole = (callerMember.role || '').toLowerCase();
      const callerRoles = callerRole.split(',').map((r) => r.trim());
      const canManageStaff =
        callerRole.includes('owner') ||
        callerRoles.includes('admin') ||
        callerRoles.includes('manager') ||
        callerRole.includes('manager');
      if (!canManageStaff) {
        return { success: false, error: 'Forbidden: Only store managers or the Organization Owner can remove staff' };
      }
    }

    if (scope.userId && scope.userId === targetUserId) {
      return { success: false, error: 'Forbidden: You cannot remove yourself' };
    }

    const isOwnerOrPlatformAdmin =
      scope.isPlatformAdmin ||
      callerRole.includes('owner') ||
      (callerRole.includes('admin') && !callerRole.includes('store'));

    // Fetch target user info
    const [targetUser] = await db
      .select({ name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, targetUserId))
      .limit(1);

    const targetName = targetUser?.name || targetUser?.email || 'Staff Member';

    // Verify target user is NOT the organization owner
    const [targetMember] = await db
      .select({ role: memberTable.role })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, organizationId),
          eq(memberTable.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return { success: false, error: 'Staff member not found in this organization' };
    }

    if (targetMember.role?.toLowerCase().includes('owner')) {
      return { success: false, error: 'Forbidden: Organization Owner cannot be deleted' };
    }

    // If caller is a Store Manager (not Org Owner), enforce Maker-Checker approval request
    if (!isOwnerOrPlatformAdmin) {
      await db.insert(approvalRequestsTable).values({
        type: 'delete_staff',
        targetId: targetUserId,
        targetName: `Remove staff: ${targetName}`,
        requesterId: scope.userId ?? '',
        requesterEmail: scope.userEmail,
        requesterName: scope.userName || 'Store Manager',
        reason: `Store manager requested removal of staff member ${targetName}`,
        status: 'pending',
        organizationId: organizationId,
      });

      return {
        success: true,
        requiresApproval: true,
        message: `Staff removal request for "${targetName}" submitted to Organization Owner for approval.`,
      };
    }

    // Direct removal for Organization Owner or Platform Super Admin
    await db
      .delete(staffStoreAssignments)
      .where(
        and(
          eq(staffStoreAssignments.organizationId, organizationId),
          eq(staffStoreAssignments.userId, targetUserId)
        )
      );

    await db
      .delete(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, organizationId),
          eq(memberTable.userId, targetUserId)
        )
      );

    await invalidateCache({ orgId: organizationId, namespace: 'staff' });
    return { success: true, message: `Staff member "${targetName}" removed successfully.` };
  } catch (err: unknown) {
    console.error('[deleteStaffMemberAction] Failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to remove staff member' };
  }
}

/** Zod schema for practice onboarding input. `userEmail` is accepted for caller compatibility but ignored. */
const setupPracticeOnboardingSchema = z.object({
  practiceName: z.string().trim().min(1, 'Practice name is required').max(160),
  branchName: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  userEmail: z.string().optional(),
});

/**
 * First-time onboarding for authenticated Google/Email user:
 * - Creates their real Organization with prefix from env
 * - Creates their primary store (defaults to 'Main Branch' if empty)
 * - Assigns user as Organization Owner (role: 'owner') in member table, staff assignments, and user profile
 */
export async function setupPracticeOnboardingAction(data: {
  practiceName: string;
  branchName?: string;
  city?: string;
  userEmail?: string;
}): Promise<{ success: boolean; organizationId?: string; branchId?: string; orgCode?: string; error?: string }> {
  try {
    // SECURITY: an authenticated session is mandatory. The legacy anonymous `userEmail`
    // fallback (which let anyone attach a new practice to an arbitrary account) is removed.
    const session = await getCurrentSession();
    const userId = session.user?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized: Please sign in first' };
    }

    // Prevent a user who already belongs to a practice from spawning additional owner orgs
    const [existingMembership] = await db
      .select({ organizationId: memberTable.organizationId })
      .from(memberTable)
      .where(eq(memberTable.userId, userId))
      .limit(1);
    if (existingMembership) {
      return { success: false, error: 'Your account is already linked to an optical practice' };
    }

    const parsed = setupPracticeOnboardingSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Practice name is required' };
    }
    const trimmedPractice = parsed.data.practiceName;
    const branchName = (parsed.data.branchName || '').trim() || 'Main Branch';
    const city = parsed.data.city?.trim() || '';

    // 1. Calculate next sequential orgNumber and formatted orgCode using ORG_CODE_PREFIX from env
    const prefix = (process.env.ORG_CODE_PREFIX || 'OPT').trim().toUpperCase();
    const [maxRow] = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(org_number), 0)` })
      .from(organizations);
    const nextOrgNumber = Number(maxRow?.maxNum || 0) + 1;
    const orgCode = `${prefix}-${nextOrgNumber}`;

    // 2. Create Organization in business table with isolated onboarding flag
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: trimmedPractice,
        orgCode,
        orgNumber: nextOrgNumber,
        hasCompletedOnboarding: true,
        planId: 'starter',
        subscriptionStatus: 'active',
      })
      .returning();

    if (!newOrg) {
      return { success: false, error: 'Failed to create organization record' };
    }

    // 3. Sync to Better Auth organization table
    try {
      const slug =
        trimmedPractice.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
        '-' +
        nextOrgNumber;

      await db
        .insert(organizationTable)
        .values({
          id: newOrg.id,
          name: trimmedPractice,
          slug,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    } catch (authErr) {
      console.warn('[setupPracticeOnboardingAction] Auth org sync note:', authErr);
    }

    // 4. Create Main Branch for this practice (defaulting to 'Main Branch' if empty)
    const [newBranch] = await db
      .insert(branches)
      .values({
        name: branchName,
        organizationId: newOrg.id,
        isActive: true,
      })
      .returning();

    // Automatically seed default product types & workflow schemas for the newly created practice
    try {
      await seedDefaultProductTypesForOrganization(newOrg.id);
    } catch (seedErr) {
      console.warn('[setupPracticeOnboardingAction] Default product types seed note:', seedErr);
    }

    // 5. Assign current user as Organization Owner in member table
    const memberId = `member-${Date.now()}`;
    await db.insert(memberTable).values({
      id: memberId,
      organizationId: newOrg.id,
      userId: userId,
      role: 'owner', // Tagged as owner
      createdAt: new Date(),
    });

    // 6. Assign current user to primary branch in staffStoreAssignments as owner
    if (newBranch?.id) {
      await db.insert(staffStoreAssignments).values({
        organizationId: newOrg.id,
        branchId: newBranch.id,
        userId: userId,
        role: 'owner', // Tagged as owner
        isPrimary: true,
      });
    }

    // 7. Update user profile role in userTable to owner
    await db
      .update(userTable)
      .set({ role: 'owner' })
      .where(eq(userTable.id, userId));

    // 7. Seed store profile for this branch
    try {
      if (newBranch?.id) {
        await db
          .insert(storeProfile)
          .values({
            organizationId: newOrg.id,
            branchId: newBranch.id,
            storeName: trimmedPractice,
            phone: '+91 98765 43210',
            address: city ? `${trimmedPractice}, ${city}` : 'Main Street',
            defaultTaxRate: '12.00',
            enableGst: true,
          })
          .onConflictDoNothing();
      }
    } catch (profileErr) {
      console.warn('[setupPracticeOnboardingAction] Store profile setup note:', profileErr);
    }

    // 8. Invalidate tenancy caches
    await invalidateCache({ orgId: newOrg.id, namespace: 'staff' });
    await invalidateCache({ orgId: newOrg.id, namespace: 'branches' });

    return {
      success: true,
      organizationId: newOrg.id,
      branchId: newBranch?.id,
      orgCode,
    };
  } catch (err: unknown) {
    console.error('[setupPracticeOnboardingAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Onboarding failed',
    };
  }
}

export type SuperAdminRole = 'super_admin' | 'super_moderator' | 'super_viewer' | 'none';

export interface SuperAdminAccessResult {
  isSuperAdmin: boolean;
  role: SuperAdminRole;
  email?: string;
  name?: string;
  canMutate: boolean;
  canPerformCritical: boolean;
}

/**
 * Verifies if the currently logged in user has platform root access:
 * - 'super_admin': Root Super Admin (allowlisted in SUPER_ADMIN_EMAILS). Can do everything.
 * - 'super_moderator': Platform Moderator (database user.role). Normal operations; critical actions require approval.
 * - 'super_viewer': Platform Viewer (database user.role). Strictly read-only observation.
 */
export async function verifySuperAdminAccessAction(): Promise<SuperAdminAccessResult> {
  try {
    // 0. Dedicated Super Admin OTP Session Check
    const superAdminSession = await getSuperAdminSessionAction();
    if (superAdminSession.isAuthenticated && superAdminSession.user?.email) {
      return {
        isSuperAdmin: true,
        role: 'super_admin',
        email: superAdminSession.user.email,
        name: superAdminSession.user.name || 'Platform Super Admin',
        canMutate: true,
        canPerformCritical: true,
      };
    }

    const session = await getCurrentSession();
    if (!session.user?.email || !session.user?.id) {
      return { isSuperAdmin: false, role: 'none', canMutate: false, canPerformCritical: false };
    }

    const superAdminEnv = process.env.SUPER_ADMIN_EMAILS || 'msanthosh9943@gmail.com';
    const superAdminEmails = superAdminEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = session.user.email.toLowerCase();
    const isAllowlisted = superAdminEmails.includes(userEmail);

    const [userRecord] = await db
      .select({ role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);

    // 1. Root Super Admin (Allowlisted)
    if (isAllowlisted) {
      if (userRecord && userRecord.role !== 'super_admin') {
        await db
          .update(userTable)
          .set({ role: 'super_admin', updatedAt: new Date() })
          .where(eq(userTable.id, session.user.id));
      }

      return {
        isSuperAdmin: true,
        role: 'super_admin',
        email: session.user.email,
        name: session.user.name,
        canMutate: true,
        canPerformCritical: true,
      };
    }

    // 2. Platform Moderator
    if (userRecord?.role === 'super_moderator') {
      return {
        isSuperAdmin: true,
        role: 'super_moderator',
        email: session.user.email,
        name: session.user.name,
        canMutate: true,
        canPerformCritical: false,
      };
    }

    // 3. Platform Viewer (Auditor / Read-Only)
    if (userRecord?.role === 'super_viewer') {
      return {
        isSuperAdmin: true,
        role: 'super_viewer',
        email: session.user.email,
        name: session.user.name,
        canMutate: false,
        canPerformCritical: false,
      };
    }

    // 4. Non-allowlisted user who had stale super_admin role -> demote
    if (userRecord?.role === 'super_admin') {
      await db
        .update(userTable)
        .set({ role: 'user', updatedAt: new Date() })
        .where(eq(userTable.id, session.user.id));
    }

    return { isSuperAdmin: false, role: 'none', canMutate: false, canPerformCritical: false };
  } catch (err) {
    console.error('[verifySuperAdminAccessAction] Error:', err);
    return { isSuperAdmin: false, role: 'none', canMutate: false, canPerformCritical: false };
  }
}

/**
 * Instantly revokes a target user's Super Admin privileges and deletes all active sessions.
 */
export async function revokeSuperAdminAccessAction(targetUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const caller = await verifySuperAdminAccessAction();
    if (!caller.isSuperAdmin || !caller.canPerformCritical) {
      return { success: false, error: 'Unauthorized: Only Root Super Admin can revoke access.' };
    }

    await db
      .update(userTable)
      .set({ role: 'user', updatedAt: new Date() })
      .where(eq(userTable.id, targetUserId));

    await db
      .delete(sessionTable)
      .where(eq(sessionTable.userId, targetUserId));

    return { success: true };
  } catch (err: unknown) {
    console.error('[revokeSuperAdminAccessAction] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to revoke access' };
  }
}

/**
 * Create a new privileged approval request (submitted by a Platform Moderator)
 */
export async function createApprovalRequestAction(data: {
  type: 'delete_organization' | 'purge_data' | 'system_config';
  targetId: string;
  targetName: string;
  reason: string;
  organizationId?: string;
}): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id || !session.user?.email) {
      return { success: false, error: 'Unauthorized: Session missing' };
    }

    const access = await verifySuperAdminAccessAction();
    if (!access.isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Platform access required' };
    }

    const [created] = await db
      .insert(approvalRequestsTable)
      .values({
        type: data.type,
        targetId: data.targetId,
        targetName: data.targetName,
        requesterId: session.user.id,
        requesterEmail: session.user.email,
        requesterName: session.user.name || 'Platform Moderator',
        reason: data.reason.trim() || 'Action requested by moderator',
        status: 'pending',
        organizationId: data.organizationId || null,
      })
      .returning();

    return { success: true, requestId: created?.id };
  } catch (err: unknown) {
    console.error('[createApprovalRequestAction] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit request' };
  }
}

/**
 * Fetch approval requests for Root Super Admin review
 */
export async function getApprovalRequestsAction(filterStatus?: 'pending' | 'all'): Promise<{
  success: boolean;
  requests: any[];
  error?: string;
}> {
  try {
    const access = await verifySuperAdminAccessAction();
    if (!access.isSuperAdmin) {
      return { success: false, requests: [], error: 'Unauthorized' };
    }

    const rows = await db
      .select()
      .from(approvalRequestsTable)
      .where(filterStatus === 'pending' ? eq(approvalRequestsTable.status, 'pending') : undefined)
      .orderBy(desc(approvalRequestsTable.createdAt));

    return { success: true, requests: rows };
  } catch (err: unknown) {
    console.error('[getApprovalRequestsAction] Error:', err);
    return { success: false, requests: [], error: 'Failed to load approval requests' };
  }
}

/**
 * Approve & execute or reject an approval request (Root Super Admin only)
 */
export async function resolveApprovalRequestAction(
  requestId: string,
  decision: 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifySuperAdminAccessAction();
    if (!access.isSuperAdmin || !access.canPerformCritical) {
      return { success: false, error: 'Forbidden: Only Root Super Admin can review approval requests' };
    }

    const [request] = await db
      .select()
      .from(approvalRequestsTable)
      .where(eq(approvalRequestsTable.id, requestId))
      .limit(1);

    if (!request) {
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: `Request already marked as ${request.status}` };
    }

    // If approved, execute the corresponding critical operation!
    if (decision === 'approved') {
      if (request.type === 'delete_organization') {
        await db.delete(organizations).where(eq(organizations.id, request.targetId));
        await db.delete(organizationTable).where(eq(organizationTable.id, request.targetId));
      }
    }

    // Update approval status
    await db
      .update(approvalRequestsTable)
      .set({
        status: decision,
        reviewedBy: access.email,
        reviewedAt: new Date(),
      })
      .where(eq(approvalRequestsTable.id, requestId));

    return { success: true };
  } catch (err: unknown) {
    console.error('[resolveApprovalRequestAction] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to resolve request' };
  }
}

/**
 * Delete an organization practice.
 * - Root Super Admin: Executed immediately!
 * - Platform Moderator: Requires submitting an approval request.
 * - Platform Viewer: Forbidden (Read-only).
 */
export async function deleteOrganizationAction(organizationId: string): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  error?: string;
}> {
  try {
    const access = await verifySuperAdminAccessAction();
    if (!access.isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Platform access required' };
    }

    if (access.role === 'super_viewer') {
      return { success: false, error: 'Forbidden: Platform Viewer has read-only access' };
    }

    if (access.role === 'super_moderator') {
      return {
        success: false,
        requiresApproval: true,
        error: 'Critical action: Platform Moderators must submit an approval request to delete an organization.',
      };
    }

    // Root Super Admin direct deletion
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db.delete(organizationTable).where(eq(organizationTable.id, organizationId));

    return { success: true };
  } catch (err: unknown) {
    console.error('[deleteOrganizationAction] Failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete organization' };
  }
}

/**
 * Fetch platform staff members (Super Admins, Moderators, Viewers)
 */
export async function getPlatformTeamAction(): Promise<{
  success: boolean;
  team: { id: string; name: string; email: string; role: string; createdAt: Date }[];
  error?: string;
}> {
  try {
    const access = await verifySuperAdminAccessAction();
    if (!access.isSuperAdmin) {
      return { success: false, team: [], error: 'Unauthorized' };
    }

    const rows = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .where(
        sql`${userTable.role} IN ('super_admin', 'super_moderator', 'super_viewer')`
      )
      .orderBy(userTable.name);

    const sanitizedTeam = rows.map((r) => ({
      ...r,
      role: r.role || 'super_viewer',
    }));

    return { success: true, team: sanitizedTeam };
  } catch (err: unknown) {
    console.error('[getPlatformTeamAction] Failed:', err);
    return { success: false, team: [], error: 'Failed to load platform team' };
  }
}

/**
 * Assign platform governance role to a user (Root Super Admin only)
 */
export async function assignPlatformRoleAction(
  targetEmail: string,
  role: 'super_admin' | 'super_moderator' | 'super_viewer' | 'user'
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifySuperAdminAccessAction();
    if (!access.isSuperAdmin || !access.canPerformCritical) {
      return { success: false, error: 'Forbidden: Only Root Super Admin can assign platform roles' };
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    const [targetUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, cleanEmail))
      .limit(1);

    if (!targetUser) {
      return { success: false, error: `User with email "${cleanEmail}" does not exist in the system.` };
    }

    await db
      .update(userTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(userTable.id, targetUser.id));

    return { success: true };
  } catch (err: unknown) {
    console.error('[assignPlatformRoleAction] Failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to assign platform role' };
  }
}


