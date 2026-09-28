'use server';

import { db } from '@/db';
import {
  organizations,
  user as userTable,
  member as memberTable,
  branches,
  staffStoreAssignments,
  account as accountTable,
} from '@/db/schema';
import { eq, or, ilike, and } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

export interface StaffPreflightResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  orgCode?: string;
  mustChangePassword?: boolean;
  assignedBranches?: { id: string; name: string }[];
  error?: string;
}

/**
 * Resolves an organization by either full code (e.g. "OPT-1", "opt-1") or numeric-only ID (e.g. "1").
 */
export async function resolveOrganizationByInput(input: string) {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  const prefix = process.env.ORG_CODE_PREFIX || 'OPT';
  const digitsOnly = trimmed.replace(/\D/g, '');
  const parsedNum = parseInt(digitsOnly, 10);

  if (!isNaN(parsedNum) && parsedNum > 0) {
    const [found] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        orgCode: organizations.orgCode,
        orgNumber: organizations.orgNumber,
      })
      .from(organizations)
      .where(
        or(
          eq(organizations.orgNumber, parsedNum),
          ilike(organizations.orgCode, trimmed),
          ilike(organizations.orgCode, `${prefix}-${parsedNum}`)
        )
      )
      .limit(1);

    return found || null;
  }

  // Fallback: search strictly by orgCode string
  const [found] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      orgCode: organizations.orgCode,
      orgNumber: organizations.orgNumber,
    })
    .from(organizations)
    .where(ilike(organizations.orgCode, trimmed))
    .limit(1);

  return found || null;
}

/**
 * Preflight verification before Staff Portal authentication:
 * 1. Resolves Practice/Store ID (by prefix or number)
 * 2. Confirms user exists and holds active membership in that organization
 * 3. Inspects first-login password change requirement
 */
export async function verifyStaffPortalLoginPreflightAction(data: {
  orgInput: string;
  email: string;
}): Promise<StaffPreflightResult> {
  try {
    const trimmedOrg = data.orgInput?.trim();
    const trimmedEmail = data.email?.trim().toLowerCase();

    if (!trimmedOrg) {
      return { success: false, error: 'Please enter your Practice ID (e.g. OPT-1 or 1)' };
    }
    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your staff email address' };
    }

    // 1. Resolve Organization
    const org = await resolveOrganizationByInput(trimmedOrg);
    if (!org) {
      return {
        success: false,
        error: `Optical Practice not found for Store ID "${trimmedOrg}". Please check your store ID.`,
      };
    }

    // 2. Locate User Record
    const [user] = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        mustChangePassword: userTable.mustChangePassword,
        banned: userTable.banned,
      })
      .from(userTable)
      .where(eq(userTable.email, trimmedEmail))
      .limit(1);

    if (!user) {
      return {
        success: false,
        error: `No staff user found with email "${trimmedEmail}". Please check with your store administrator.`,
      };
    }

    if (user.banned) {
      return {
        success: false,
        error: 'Your staff account has been deactivated. Please contact your store administrator.',
      };
    }

    // 3. Confirm Membership in this specific Organization
    const [membership] = await db
      .select({ id: memberTable.id, role: memberTable.role })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, org.id),
          eq(memberTable.userId, user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return {
        success: false,
        error: `Staff account is not authorized for "${org.name}". Ensure you entered the correct Practice ID.`,
      };
    }

    // 4. Fetch assigned store locations
    const assigned = await db
      .select({
        id: branches.id,
        name: branches.name,
      })
      .from(staffStoreAssignments)
      .innerJoin(branches, eq(staffStoreAssignments.branchId, branches.id))
      .where(
        and(
          eq(staffStoreAssignments.userId, user.id),
          eq(staffStoreAssignments.organizationId, org.id)
        )
      );

    return {
      success: true,
      organizationId: org.id,
      organizationName: org.name,
      orgCode: org.orgCode || `OPT-${org.orgNumber || 1}`,
      mustChangePassword: user.mustChangePassword,
      assignedBranches: assigned,
    };
  } catch (err: unknown) {
    console.error('[verifyStaffPortalLoginPreflightAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Staff authentication preflight failed',
    };
  }
}

/** Zod schema for the first-login password change payload. */
const staffInitialPasswordChangeSchema = z.object({
  newPassword: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(8, 'Password must be at least 8 characters in length').max(128)),
});

/**
 * @description Completes the mandatory initial password change on first sign-in for store staff.
 * Security: the target user is ALWAYS the authenticated Better Auth session user (the client can
 * no longer supply a userId), and the change is only permitted while that user's
 * `mustChangePassword` flag is true. This prevents pre-auth account takeover.
 * @param data - `{ newPassword }` (any extra fields such as a legacy `userId` are ignored)
 * @returns `{ success, error? }`
 */
export async function completeStaffInitialPasswordChangeAction(data: {
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = staffInitialPasswordChangeSchema.safeParse({ newPassword: data?.newPassword ?? '' });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid password' };
    }
    const trimmedPassword = parsed.data.newPassword;

    // 1. Resolve the caller strictly from the authenticated session (never from client input)
    const authResult = await auth.api.getSession({ headers: await headers() });
    const sessionUserId = authResult?.user?.id;
    if (!sessionUserId) {
      return { success: false, error: 'Unauthorized: please sign in with your temporary password first' };
    }

    // 2. Only allow while an administrator-issued first-login change is pending
    const [targetUser] = await db
      .select({ id: userTable.id, mustChangePassword: userTable.mustChangePassword, banned: userTable.banned })
      .from(userTable)
      .where(eq(userTable.id, sessionUserId))
      .limit(1);

    if (!targetUser || targetUser.banned) {
      return { success: false, error: 'Unauthorized' };
    }
    if (targetUser.mustChangePassword !== true) {
      return { success: false, error: 'No pending initial password change for this account' };
    }

    const hashedPassword = await hashPassword(trimmedPassword);

    // 3. Update password in Better Auth credential account
    const [existingAccount] = await db
      .select({ id: accountTable.id })
      .from(accountTable)
      .where(
        and(
          eq(accountTable.userId, targetUser.id),
          eq(accountTable.providerId, 'credential')
        )
      )
      .limit(1);

    if (existingAccount) {
      await db
        .update(accountTable)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(accountTable.id, existingAccount.id));
    } else {
      await db.insert(accountTable).values({
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        accountId: targetUser.id,
        providerId: 'credential',
        userId: targetUser.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 4. Clear mustChangePassword flag
    await db
      .update(userTable)
      .set({
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, targetUser.id));

    return { success: true };
  } catch (err: unknown) {
    console.error('[completeStaffInitialPasswordChangeAction] Error:', err);
    return {
      success: false,
      error: 'Failed to update initial password',
    };
  }
}

export interface OwnerPreflightResult {
  isStaff: boolean;
  mustChangePassword?: boolean;
  orgCode?: string;
  error?: string;
}

/**
 * Preflight verification on the main Owner/SaaS login portal (/auth/login).
 * If a store staff member attempts to sign in via the owner portal, informs
 * them to sign in through the dedicated Staff Portal with their Practice ID.
 */
export async function verifyOwnerLoginPreflightAction(email: string): Promise<OwnerPreflightResult> {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { isStaff: false };

    // 1. Locate user
    const [user] = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        role: userTable.role,
        mustChangePassword: userTable.mustChangePassword,
      })
      .from(userTable)
      .where(eq(userTable.email, cleanEmail))
      .limit(1);

    if (!user) return { isStaff: false };

    // 2. Platform Super Admin can always access /auth/login
    if (user.role === 'super_admin') return { isStaff: false };

    // 3. Check organization membership
    const [membership] = await db
      .select({
        role: memberTable.role,
        organizationId: memberTable.organizationId,
      })
      .from(memberTable)
      .where(eq(memberTable.userId, user.id))
      .limit(1);

    if (!membership) return { isStaff: false };

    const memberRole = (membership.role || '').toLowerCase();
    const roles = memberRole.split(',').map((s) => s.trim());

    // If they hold the owner role, they are the practice owner and belong in /auth/login
    if (roles.includes('owner') || memberRole === 'owner') {
      return { isStaff: false };
    }

    // Otherwise, this is a store staff account (cashier, optometrist, store manager)
    const [org] = await db
      .select({
        orgCode: organizations.orgCode,
        orgNumber: organizations.orgNumber,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, membership.organizationId))
      .limit(1);

    const practiceCode = org?.orgCode || `OPT-${org?.orgNumber || 1}`;

    return {
      isStaff: true,
      mustChangePassword: user.mustChangePassword,
      orgCode: practiceCode,
      error: `Staff account detected for "${org?.name || 'Practice'}". Please sign in via the Staff Portal with your Practice ID (${practiceCode}).`,
    };
  } catch (err: unknown) {
    console.error('[verifyOwnerLoginPreflightAction] Error:', err);
    return { isStaff: false };
  }
}
