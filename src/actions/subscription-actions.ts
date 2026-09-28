'use server';

import { getCurrentSession, requireOwnerOrSuperAdmin, requireManagerOrAdmin } from '@/lib/auth-utils';
import { db } from '@/db';
import { organizations, subscriptions, type Subscription } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { PRICING_PLANS, type PricingPlan } from '@/lib/plans';
import {
  createRazorpayOrder,
  createRazorpayPaymentLink,
  verifyRazorpayPaymentSignature,
  getRazorpayCredentials,
} from '@/lib/razorpay';
import Decimal from 'decimal.js';
import { invalidateCache } from '@/lib/cache';

export interface CreateSubscriptionOrderResult {
  success: boolean;
  isFree?: boolean;
  orderId?: string;
  amountPaise?: number;
  amountRupees?: string;
  currency?: string;
  keyId?: string;
  planName?: string;
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
  error?: string;
  hostedPaymentUrl?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  planId?: string;
  planName?: string;
  requiresOnboarding?: boolean;
  error?: string;
}

/**
 * Creates a Razorpay Order for a SaaS plan subscription.
 * If the selected plan is free ('starter'), activates it immediately without opening payment.
 */
export async function createRazorpaySubscriptionOrderAction(
  planId: string,
  billingCycle: 'monthly' | 'annual' = 'monthly'
): Promise<CreateSubscriptionOrderResult> {
  try {
    const session = await requireOwnerOrSuperAdmin();

    const matchedPlan = PRICING_PLANS.find((p) => p.id === planId);
    if (!matchedPlan) {
      return {
        success: false,
        error: `Invalid plan selected: "${planId}".`,
      };
    }

    // Free plan (Starter) activation without payment gateway
    if (matchedPlan.id === 'starter' || matchedPlan.monthlyPrice === 0) {
      await db
        .update(organizations)
        .set({
          planId: 'starter',
          subscriptionStatus: 'active',
          subscriptionPeriod: billingCycle,
          subscriptionEndsAt: null, // lifetime free
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, session.organizationId));

      revalidatePath('/');
      revalidatePath('/pricing');
      await invalidateCache({ orgId: session.organizationId, namespace: 'plan' });

      return {
        success: true,
        isFree: true,
        planId: 'starter',
        planName: matchedPlan.name,
      };
    }

    // Paid Plan: Calculate exact price via Decimal.js
    const priceRupees =
      billingCycle === 'annual'
        ? new Decimal(matchedPlan.annualPrice).toFixed(2)
        : new Decimal(matchedPlan.monthlyPrice).toFixed(2);

    const receiptId = `sub_${session.organizationId.substring(0, 8)}_${Date.now()}`;

    // 1. Call Razorpay Orders API
    const rzpOrder = await createRazorpayOrder({
      amountRupees: priceRupees,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        organizationId: session.organizationId,
        organizationName: session.organizationName,
        planId: matchedPlan.id,
        planName: matchedPlan.name,
        billingCycle,
        userEmail: session.user?.email || '',
      },
    });

    // 2. Record pending transaction in PostgreSQL subscriptions audit table
    await db.insert(subscriptions).values({
      organizationId: session.organizationId,
      planId: matchedPlan.id,
      billingCycle,
      amount: priceRupees,
      currency: 'INR',
      razorpayOrderId: rzpOrder.id,
      status: 'created',
    });

    const { keyId } = getRazorpayCredentials();

    return {
      success: true,
      isFree: false,
      orderId: rzpOrder.id,
      amountPaise: rzpOrder.amount,
      amountRupees: priceRupees,
      currency: rzpOrder.currency,
      keyId,
      planName: matchedPlan.name,
      planId: matchedPlan.id,
      billingCycle,
    };
  } catch (err: unknown) {
    console.error('[createRazorpaySubscriptionOrderAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to initiate payment',
    };
  }
}

/**
 * Cryptographically verifies Razorpay payment completion, activates the customer's plan in DB,
 * and updates the financial subscriptions ledger.
 */
export async function verifyRazorpayPaymentAction(payload: {
  orderId: string;
  paymentId: string;
  signature: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
}): Promise<VerifyPaymentResult> {
  try {
    const session = await requireOwnerOrSuperAdmin();

    // Verify order exists and belongs to this organization
    const [subRecord] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.razorpayOrderId, payload.orderId),
          eq(subscriptions.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!subRecord) {
      return { success: false, error: 'Subscription order not found or access denied' };
    }

    // 1. Verify HMAC SHA-256 signature
    const isValid = verifyRazorpayPaymentSignature({
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      signature: payload.signature,
    });

    if (!isValid) {
      // Mark as failed in DB
      await db
        .update(subscriptions)
        .set({
          status: 'failed',
          failureReason: 'Cryptographic signature mismatch / Tampered payment callback',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.razorpayOrderId, payload.orderId),
            eq(subscriptions.organizationId, session.organizationId)
          )
        );

      return {
        success: false,
        error: 'Payment verification failed: Invalid cryptographic signature.',
      };
    }

    // 2. Calculate subscription duration
    const endsAt = new Date();
    if (payload.billingCycle === 'annual') {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setDate(endsAt.getDate() + 30);
    }

    // 3. Update organization's active plan in database
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        planId: payload.planId,
        subscriptionStatus: 'active',
        subscriptionPeriod: payload.billingCycle,
        subscriptionEndsAt: endsAt,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, session.organizationId))
      .returning();

    // 4. Update subscriptions audit record to 'paid'
    await db
      .update(subscriptions)
      .set({
        status: 'paid',
        razorpayPaymentId: payload.paymentId,
        razorpaySignature: payload.signature,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.razorpayOrderId, payload.orderId));

    const matchedPlan = PRICING_PLANS.find((p) => p.id === payload.planId);

    revalidatePath('/');
    revalidatePath('/pricing');
    revalidatePath('/settings/store');
    await invalidateCache({ orgId: session.organizationId, namespace: 'plan' });

    return {
      success: true,
      planId: payload.planId,
      planName: matchedPlan?.name || payload.planId,
      requiresOnboarding: !updatedOrg?.hasCompletedOnboarding,
    };
  } catch (err: unknown) {
    console.error('[verifyRazorpayPaymentAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Verification failed',
    };
  }
}

/**
 * Handles explicit payment failures or cancellations reported by Razorpay Checkout.
 */
export async function handlePaymentFailureAction(payload: {
  orderId: string;
  errorCode?: string;
  errorDescription?: string;
}) {
  try {
    if (!payload.orderId) return { success: false };

    await db
      .update(subscriptions)
      .set({
        status: 'failed',
        failureReason: `${payload.errorCode || 'PAYMENT_FAILED'}: ${payload.errorDescription || 'Payment declined or cancelled by user'}`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.razorpayOrderId, payload.orderId));

    return { success: true };
  } catch (err) {
    console.error('[handlePaymentFailureAction] Error:', err);
    return { success: false };
  }
}

/**
 * Marks the new subscriber onboarding tour as completed or skipped.
 */
export async function completeOnboardingAction(): Promise<{ success: boolean }> {
  try {
    const session = await requireManagerOrAdmin();

    await db
      .update(organizations)
      .set({
        hasCompletedOnboarding: true,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, session.organizationId));

    await invalidateCache({ orgId: session.organizationId, namespace: 'plan' });
    return { success: true };
  } catch (err) {
    console.error('[completeOnboardingAction] Error:', err);
    return { success: false };
  }
}

/**
 * Retrieves the comprehensive subscription and plan status for the active practice.
 */
export async function getOrganizationSubscriptionStatusAction(): Promise<{
  planId: string;
  planName: string;
  subscriptionStatus: string;
  subscriptionPeriod: string;
  subscriptionEndsAt: string | null;
  hasCompletedOnboarding: boolean;
  recentTransactions: Subscription[];
}> {
  try {
    const session = await getCurrentSession();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    const transactions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, session.organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(5);

    const planId = org?.planId || 'starter';
    const matchedPlan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[0];

    return {
      planId,
      planName: matchedPlan.name,
      subscriptionStatus: org?.subscriptionStatus || 'active',
      subscriptionPeriod: org?.subscriptionPeriod || 'monthly',
      subscriptionEndsAt: org?.subscriptionEndsAt ? org.subscriptionEndsAt.toISOString() : null,
      hasCompletedOnboarding: Boolean(org?.hasCompletedOnboarding),
      recentTransactions: transactions,
    };
  } catch (err) {
    console.error('[getOrganizationSubscriptionStatusAction] Error:', err);
    return {
      planId: 'starter',
      planName: 'Starter Practice',
      subscriptionStatus: 'active',
      subscriptionPeriod: 'monthly',
      subscriptionEndsAt: null,
      hasCompletedOnboarding: true,
      recentTransactions: [],
    };
  }
}

/**
 * Checks whether the current organization can access a specific feature based on its active plan in DB.
 */
export async function checkOrganizationFeatureAccessAction(
  feature: import('@/lib/feature-gate').FeatureKey
) {
  const { canAccessFeature, FEATURE_METADATA } = await import('@/lib/feature-gate');
  const session = await getCurrentSession();

  const [org] = await db
    .select({ planId: organizations.planId })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  const currentPlan = (org?.planId?.toLowerCase() || 'starter') as import('@/lib/feature-gate').PlanTier;
  const metadata = FEATURE_METADATA[feature];
  const allowed = canAccessFeature(currentPlan, feature);

  return {
    allowed,
    currentPlan,
    requiredPlan: metadata.requiredPlan,
    metadata,
  };
}
