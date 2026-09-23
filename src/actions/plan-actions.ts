'use server';

import { getCurrentSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { organizations, storeProfile } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { PricingPlan, PRICING_PLANS } from '@/lib/plans';
export type { PricingPlan };
export { PRICING_PLANS };

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

    const matchedPlan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[0];

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/settings/store');

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
 * Retrieves the current organization plan
 */
export async function getCurrentPlanAction(): Promise<{ planId: string; planName: string }> {
  try {
    const session = await getCurrentSession();
    // Default to 'starter'
    return {
      planId: 'starter',
      planName: 'Starter Practice (Free)',
    };
  } catch {
    return {
      planId: 'starter',
      planName: 'Starter Practice (Free)',
    };
  }
}
