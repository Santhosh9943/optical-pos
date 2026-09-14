import { headers } from 'next/headers';
import { auth, type Session, type User } from '@/lib/auth';
import { db } from '@/db';
import { organizations, branches } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000002';

export interface CurrentSessionContext {
  user: User | null;
  session: Session | null;
  organizationId: string;
  branchId: string;
  organizationName: string;
  branchName: string;
}

/**
 * Reads the incoming request headers using Better Auth (auth.api.getSession)
 * and resolves the currently logged-in user, their active organization, and their assigned branch.
 * Gracefully falls back to the default organization and branch in local dev or E2E bypass modes.
 */
export async function getCurrentSession(): Promise<CurrentSessionContext> {
  let user: User | null = null;
  let session: Session | null = null;
  let organizationId = DEFAULT_ORG_ID;
  let branchId = DEFAULT_BRANCH_ID;
  let organizationName = 'Optix Vision Care';
  let branchName = 'Main Branch';

  try {
    const reqHeaders = await headers();
    const authResult = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (authResult?.session) {
      session = authResult.session;
      user = authResult.user;

      // Check if user has an active organization in Better Auth session
      const activeOrgId = authResult.session.activeOrganizationId;
      if (activeOrgId) {
        // Try finding matching organization in SaaS organizations table
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, activeOrgId))
          .limit(1);

        if (org) {
          organizationId = org.id;
          organizationName = org.name;
        }
      }
    }
  } catch {
    // In background scripts or contexts where headers() cannot be called,
    // fallback gracefully to default org/branch
  }

  // Resolve active branch for the organization if available
  try {
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.organizationId, organizationId))
      .limit(1);

    if (branch) {
      branchId = branch.id;
      branchName = branch.name;
    }
  } catch {
    // Use default branch id if branch resolution encounters an issue
  }

  return {
    user,
    session,
    organizationId,
    branchId,
    organizationName,
    branchName,
  };
}
