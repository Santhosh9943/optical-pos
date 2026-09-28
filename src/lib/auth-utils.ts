import { headers, cookies } from 'next/headers';
import { auth, type Session, type User } from '@/lib/auth';
import { db } from '@/db';
import { organizations, branches, member as memberTable, staffStoreAssignments } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000002';

export interface CurrentSessionContext {
  user: User | null;
  session: Session | null;
  organizationId: string;
  branchId: string;
  organizationName: string;
  branchName: string;
  hasOrganization: boolean;
}

/**
 * Reads the incoming request headers using Better Auth (auth.api.getSession)
 * and resolves the currently logged-in user, their active organization, and their assigned branch.
 * For newly authenticated Google/Email users, queries memberTable to locate their registered practice.
 * 
 * Strict Security Invariant:
 * - Unauthenticated requests return user: null, organizationId: '', and hasOrganization: false.
 * - Silent default fallback to DEFAULT_ORG_ID is strictly eliminated.
 * - E2E bypass is only available in non-production environments.
 */
export async function getCurrentSession(): Promise<CurrentSessionContext> {
  let user: User | null = null;
  let session: Session | null = null;
  let organizationId = '';
  let branchId = '';
  let organizationName = '';
  let branchName = '';
  let hasOrganization = false;

  try {
    const reqHeaders = await headers();
    let hasE2ECookie = false;
    try {
      const reqCookies = await cookies();
      hasE2ECookie = reqCookies.get('x-e2e-bypass-auth')?.value === 'true';
    } catch {
      // In contexts where cookies() is not available
    }

    const isE2EBypass =
      process.env.NODE_ENV !== 'production' &&
      (reqHeaders.get('x-e2e-bypass-auth') === 'true' || hasE2ECookie);

    const authResult = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (authResult?.session) {
      session = authResult.session;
      user = authResult.user;

      // 1. Check if user has an active organization in Better Auth session
      const activeOrgId = authResult.session.activeOrganizationId;
      if (activeOrgId) {
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, activeOrgId))
          .limit(1);

        if (org) {
          organizationId = org.id;
          organizationName = org.name;
          hasOrganization = true;
        }
      }

      // 2. If not active in session, query memberTable for user's practice
      if (!hasOrganization && user?.id) {
        const [userMember] = await db
          .select({
            organizationId: memberTable.organizationId,
          })
          .from(memberTable)
          .where(eq(memberTable.userId, user.id))
          .limit(1);

        if (userMember) {
          const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, userMember.organizationId))
            .limit(1);

          if (org) {
            organizationId = org.id;
            organizationName = org.name;
            hasOrganization = true;
          }
        }
      }

      // 3. Resolve active branch for the organization if available
      if (hasOrganization && user?.id) {
        // First check staff_store_assignments for user's primary or assigned store
        try {
          const [primaryAssignment] = await db
            .select({
              branchId: staffStoreAssignments.branchId,
            })
            .from(staffStoreAssignments)
            .where(
              and(
                eq(staffStoreAssignments.userId, user.id),
                eq(staffStoreAssignments.organizationId, organizationId)
              )
            )
            .orderBy(desc(staffStoreAssignments.isPrimary))
            .limit(1);

          if (primaryAssignment?.branchId) {
            const [assignedBranch] = await db
              .select()
              .from(branches)
              .where(
                and(
                  eq(branches.id, primaryAssignment.branchId),
                  eq(branches.organizationId, organizationId)
                )
              )
              .limit(1);

            if (assignedBranch) {
              branchId = assignedBranch.id;
              branchName = assignedBranch.name;
            }
          }
        } catch (assignErr) {
          console.warn('[getCurrentSession] Store assignment resolution note:', assignErr);
        }

        // If no specific store assignment, fallback to the organization's primary branch
        if (!branchId) {
          const [branch] = await db
            .select()
            .from(branches)
            .where(eq(branches.organizationId, organizationId))
            .limit(1);

          if (branch) {
            branchId = branch.id;
            branchName = branch.name;
          }
        }
      }
    } else if (isE2EBypass) {
      hasOrganization = true;
      organizationId = DEFAULT_ORG_ID;
      branchId = DEFAULT_BRANCH_ID;
      organizationName = 'Optix Vision Care';
      branchName = 'Main Branch';
      user = {
        id: 'e2e-super-admin-user-id',
        name: 'Super Admin',
        email: 'msanthosh9943@gmail.com',
        emailVerified: true,
        banned: false,
        twoFactorEnabled: false,
        role: 'super_admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch {
    // In background scripts or CLI contexts where headers() cannot be called
    hasOrganization = false;
  }

  return {
    user,
    session,
    organizationId,
    branchId,
    organizationName,
    branchName,
    hasOrganization,
  };
}

/**
 * Asserts that the caller has an authenticated user session and an active organization.
 * Throws an immediate Error if unauthenticated (fails closed).
 */
export async function requireAuthSession(): Promise<
  CurrentSessionContext & { user: User; organizationId: string }
> {
  const sessionContext = await getCurrentSession();
  if (!sessionContext.user?.id || !sessionContext.organizationId) {
    throw new Error('Unauthorized: Active user session and organization required');
  }
  return sessionContext as CurrentSessionContext & { user: User; organizationId: string };
}

/**
 * Checks whether the current session context holds administrative or management privileges.
 * Used for query-level data masking (e.g. redacting wholesale costPrice for cashiers and floor staff).
 */
export async function isManagerOrAdmin(sessionContext: CurrentSessionContext): Promise<boolean> {
  const { user, organizationId } = sessionContext;
  if (!user?.id) return false;

  // Check platform super_admin / admin role
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }

  // Check tenant membership role in memberTable
  try {
    const [memberRecord] = await db
      .select({ role: memberTable.role })
      .from(memberTable)
      .where(and(eq(memberTable.userId, user.id), eq(memberTable.organizationId, organizationId)))
      .limit(1);

    if (memberRecord?.role) {
      const r = memberRecord.role.toLowerCase();
      return (
        r.includes('admin') ||
        r.includes('owner') ||
        r.includes('manager') ||
        r.includes('organizer')
      );
    }
  } catch {
    // Fallback to unprivileged on error
  }

  return false;
}

/**
 * Asserts that the caller has Store Manager / Administrator privileges.
 * Throws an Error if unauthorized.
 */
export async function requireManagerOrAdmin(): Promise<
  CurrentSessionContext & { user: User; organizationId: string }
> {
  const sessionContext = await requireAuthSession();
  const isManager = await isManagerOrAdmin(sessionContext);
  if (!isManager) {
    throw new Error('Forbidden: Store manager or administrator privileges required');
  }
  return sessionContext;
}

/**
 * Checks whether the current session user is the Organization Owner (Org Admin) or Platform Super Admin.
 * Used for high-stakes operational controls like SaaS subscriptions, billing plans, and hard deletions.
 */
export async function isOwnerOrSuperAdmin(sessionContext: CurrentSessionContext): Promise<boolean> {
  const { user, organizationId } = sessionContext;
  if (!user?.id) return false;

  const superAdminEnv = process.env.SUPER_ADMIN_EMAILS || 'msanthosh9943@gmail.com';
  const superAdminEmails = superAdminEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.role === 'super_admin' || (user.email && superAdminEmails.includes(user.email.toLowerCase()))) {
    return true;
  }

  try {
    const [memberRecord] = await db
      .select({ role: memberTable.role })
      .from(memberTable)
      .where(and(eq(memberTable.userId, user.id), eq(memberTable.organizationId, organizationId)))
      .limit(1);

    if (memberRecord?.role) {
      const r = memberRecord.role.toLowerCase();
      return r === 'owner' || r === 'organizer';
    }
  } catch {
    // Fallback
  }

  return false;
}

/**
 * Asserts that the caller is the Organization Owner or Platform Super Admin.
 * Throws an Error if unauthorized.
 */
export async function requireOwnerOrSuperAdmin(): Promise<
  CurrentSessionContext & { user: User; organizationId: string }
> {
  const sessionContext = await requireAuthSession();
  const isOwner = await isOwnerOrSuperAdmin(sessionContext);
  if (!isOwner) {
    throw new Error('Forbidden: Organization Owner or Platform Super Admin privileges required');
  }
  return sessionContext;
}

/**
 * @description Returns the branch ids of the caller's organization that the caller may access.
 * - Platform super admins, Organization Owners and Store Managers/Admins: every branch of `organizationId`.
 * - Other staff: branches assigned in `staff_store_assignments`; if the user has no assignment rows at all,
 *   falls back to every branch of the organization (mirrors getUserTenancyContext behaviour).
 * Branches are ALWAYS restricted to `sessionContext.organizationId` (multi-tenant invariant).
 * @param sessionContext - The authenticated session context
 * @returns Array of authorized branch ids (empty when unauthenticated)
 */
export async function getAuthorizedBranchIds(sessionContext: CurrentSessionContext): Promise<string[]> {
  const { user, organizationId } = sessionContext;
  if (!user?.id || !organizationId) return [];

  const orgBranches = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.organizationId, organizationId));
  const orgBranchIds = orgBranches.map((b) => b.id);

  if (await isManagerOrAdmin(sessionContext)) {
    return orgBranchIds;
  }

  const assigned = await db
    .select({ branchId: staffStoreAssignments.branchId })
    .from(staffStoreAssignments)
    .where(
      and(
        eq(staffStoreAssignments.userId, user.id),
        eq(staffStoreAssignments.organizationId, organizationId)
      )
    );

  if (assigned.length === 0) {
    return orgBranchIds;
  }

  const orgSet = new Set(orgBranchIds);
  return assigned.map((a) => a.branchId).filter((id) => orgSet.has(id));
}

/**
 * @description Verifies that every requested branch id belongs to the caller's organization and is
 * accessible to the caller (see getAuthorizedBranchIds).
 * @param sessionContext - The authenticated session context
 * @param branchIds - Branch ids supplied by the client
 * @returns true when all ids are authorized
 */
export async function canAccessBranches(
  sessionContext: CurrentSessionContext,
  branchIds: string[]
): Promise<boolean> {
  if (branchIds.length === 0) return true;
  const allowed = new Set(await getAuthorizedBranchIds(sessionContext));
  return branchIds.every((id) => allowed.has(id));
}
