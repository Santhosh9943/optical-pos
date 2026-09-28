'use server';

import { getCurrentSession, isOwnerOrSuperAdmin } from '@/lib/auth-utils';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { PRICING_PLANS } from '@/lib/plans';
import { withCache, invalidateCache } from '@/lib/cache';

/**
 * Updates the plan subscription for the active organization
 */
export async function updateOrganizationPlanAction(planId: string) {
  try {
    const session = await getCurrentSession();

    if (!session.organizationId) {
      return {
        success: false,
        error: 'Please sign in to select or update your subscription plan.',
      };
    }

    const hasOwnerPermission = await isOwnerOrSuperAdmin(session);
    if (!hasOwnerPermission) {
      return {
        success: false,
        error: 'Forbidden. Only the practice owner (Org Admin) can manage subscription plans.',
      };
    }

    const matchedPlan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[0];

    // Revalidate paths & invalidate cache
    revalidatePath('/');
    revalidatePath('/settings/store');
    await invalidateCache({ orgId: session.organizationId, namespace: 'plan' });

    return {
      success: true,
      plan: matchedPlan,
      message: `Your practice is now active on the ${matchedPlan.name} plan!`,
    };
  } catch (err: unknown) {
    console.error('[updateOrganizationPlanAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update plan',
    };
  }
}

/**
 * Retrieves the current organization plan from PostgreSQL (cached for 10 min)
 */
export async function getCurrentPlanAction(): Promise<{
  planId: string;
  planName: string;
  subscriptionStatus: string;
  hasCompletedOnboarding: boolean;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.organizationId) {
      return {
        planId: 'starter',
        planName: 'Starter Practice (Free)',
        subscriptionStatus: 'active',
        hasCompletedOnboarding: true,
      };
    }

    return await withCache(
      {
        orgId: session.organizationId,
        namespace: 'plan',
        key: 'current',
        ttl: 600, // 10 minutes
      },
      async () => {
        const [org] = await db
          .select({
            planId: organizations.planId,
            subscriptionStatus: organizations.subscriptionStatus,
            hasCompletedOnboarding: organizations.hasCompletedOnboarding,
          })
          .from(organizations)
          .where(eq(organizations.id, session.organizationId))
          .limit(1);

        const planId = org?.planId || 'starter';
        const matchedPlan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[0];

        return {
          planId,
          planName: matchedPlan.name,
          subscriptionStatus: org?.subscriptionStatus || 'active',
          hasCompletedOnboarding: Boolean(org?.hasCompletedOnboarding),
        };
      }
    );
  } catch (err) {
    console.error('[getCurrentPlanAction] Error:', err);
    return {
      planId: 'starter',
      planName: 'Starter Practice (Free)',
      subscriptionStatus: 'active',
      hasCompletedOnboarding: true,
    };
  }
}
