'use server';

import { getCurrentSession, requireOwnerOrSuperAdmin, requireManagerOrAdmin } from '@/lib/auth-utils';
import { db } from '@/db';
import { organizations, subscriptions, type Subscription } from '@/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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
 * @description Subscription order states from which a cryptographically verified payment may
 * activate the plan. 'failed' is included because Razorpay Checkout keeps the modal open after a
 * declined attempt and the customer can retry (and pay) on the SAME order; the valid payment
 * signature / webhook HMAC is the proof of payment, not the prior status.
 */
const ACTIVATABLE_SUBSCRIPTION_STATUSES: string[] = ['created', 'failed'];

/**
 * @description Validates the client payload of verifyRazorpayPaymentAction.
 * `planId` / `billingCycle` are accepted for backwards compatibility but ignored: the plan and
 * cycle are always taken from the stored subscription record.
 */
const verifyPaymentPayloadSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  paymentId: z.string().trim().min(1).max(100),
  signature: z.string().trim().min(1).max(255),
  planId: z.string().max(50).optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

/**
 * @description Validates the client payload of handlePaymentFailureAction.
 */
const paymentFailurePayloadSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  errorCode: z.string().optional().nullable(),
  errorDescription: z.string().optional().nullable(),
});

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
 * @description Builds the idempotent success result for an order that is already 'paid'
 * (e.g. activated earlier by this action or by the Razorpay webhook). Never re-activates.
 * @param organizationId - Trusted tenant id from the server-side session.
 * @param planId - Plan id stored on the subscription record.
 * @returns A successful VerifyPaymentResult reporting the stored plan.
 */
async function buildAlreadyPaidResult(
  organizationId: string,
  planId: string
): Promise<VerifyPaymentResult> {
  const paidPlan = PRICING_PLANS.find((p) => p.id === planId);
  const [org] = await db
    .select({ hasCompletedOnboarding: organizations.hasCompletedOnboarding })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return {
    success: true,
    planId,
    planName: paidPlan?.name || planId,
    requiresOnboarding: !org?.hasCompletedOnboarding,
  };
}

/**
 * @description Cryptographically verifies Razorpay payment completion, activates the customer's
 * plan in DB, and updates the financial subscriptions ledger.
 * Activation is allowed from 'created' OR 'failed' (a declined attempt followed by a successful
 * retry on the same Razorpay order); 'paid' is an idempotent no-op success. Plan and billing cycle
 * always come from the stored subscription record, never from the client payload.
 * @param payload - Razorpay checkout callback (order id, payment id, signature); plan fields are ignored.
 * @returns VerifyPaymentResult with the activated plan, or an error.
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

    const parsed = verifyPaymentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: 'Invalid payment verification payload.' };
    }
    const { orderId, paymentId, signature } = parsed.data;

    // Verify order exists and belongs to this organization
    const [subRecord] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.razorpayOrderId, orderId),
          eq(subscriptions.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!subRecord) {
      return { success: false, error: 'Subscription order not found or access denied' };
    }

    // Idempotency: a previously verified order is a no-op that reports the stored plan
    if (subRecord.status === 'paid') {
      return await buildAlreadyPaidResult(session.organizationId, subRecord.planId);
    }

    if (!ACTIVATABLE_SUBSCRIPTION_STATUSES.includes(subRecord.status)) {
      return { success: false, error: `Subscription order is ${subRecord.status}; it cannot be activated.` };
    }

    // 1. Verify HMAC SHA-256 signature
    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      // Mark as failed in DB (only from the pending 'created' state; never overwrites 'paid')
      await db
        .update(subscriptions)
        .set({
          status: 'failed',
          failureReason: 'Cryptographic signature mismatch / Tampered payment callback',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.id, subRecord.id),
            eq(subscriptions.organizationId, session.organizationId),
            eq(subscriptions.status, 'created')
          )
        );

      return {
        success: false,
        error: 'Payment verification failed: Invalid cryptographic signature.',
      };
    }

    // SECURITY: plan & billing cycle come from the server-side order record, never from the client payload
    const planId = subRecord.planId;
    const billingCycle: 'monthly' | 'annual' = subRecord.billingCycle === 'annual' ? 'annual' : 'monthly';

    // 2. Calculate subscription duration
    const endsAt = new Date();
    if (billingCycle === 'annual') {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setDate(endsAt.getDate() + 30);
    }

    const result = await db.transaction(async (tx) => {
      // 3. Atomically transition the audit record (created | failed) -> paid.
      //    A second concurrent call (or the webhook) finds 'paid' and gets 0 rows.
      const transitioned = await tx
        .update(subscriptions)
        .set({
          status: 'paid',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          failureReason: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.id, subRecord.id),
            eq(subscriptions.organizationId, session.organizationId),
            inArray(subscriptions.status, ACTIVATABLE_SUBSCRIPTION_STATUSES)
          )
        )
        .returning({ id: subscriptions.id });

      if (transitioned.length === 0) {
        return { activated: false as const, org: null };
      }

      // 4. Update organization's active plan in database
      const [updatedOrg] = await tx
        .update(organizations)
        .set({
          planId,
          subscriptionStatus: 'active',
          subscriptionPeriod: billingCycle,
          subscriptionEndsAt: endsAt,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, session.organizationId))
        .returning();

      return { activated: true as const, org: updatedOrg ?? null };
    });

    const matchedPlan = PRICING_PLANS.find((p) => p.id === planId);

    if (!result.activated) {
      // Lost the race: re-read the record. If it was activated concurrently (e.g. by the webhook)
      // this is an idempotent success without re-activation; any other state is a real failure.
      const [latest] = await db
        .select({ status: subscriptions.status })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, subRecord.id),
            eq(subscriptions.organizationId, session.organizationId)
          )
        )
        .limit(1);

      if (latest?.status === 'paid') {
        return await buildAlreadyPaidResult(session.organizationId, planId);
      }
      return {
        success: false,
        error: `Subscription order is ${latest?.status ?? 'unavailable'}; it cannot be activated.`,
      };
    }

    revalidatePath('/');
    revalidatePath('/pricing');
    revalidatePath('/settings/store');
    await invalidateCache({ orgId: session.organizationId, namespace: 'plan' });

    return {
      success: true,
      planId,
      planName: matchedPlan?.name || planId,
      requiresOnboarding: !result.org?.hasCompletedOnboarding,
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
 * @description Handles explicit payment failures or cancellations reported by Razorpay Checkout.
 * Requires Organization Owner / Super Admin; only the caller's own pending ('created') order
 * can transition to 'failed' — a 'paid' (or already 'failed') order is never overwritten.
 * A 'failed' order can still be activated by a later successful retry on the same Razorpay order
 * (see verifyRazorpayPaymentAction).
 * @param payload - Razorpay order id plus optional error code / description from Checkout.
 * @returns `{ success: true }` when a pending order was marked failed, otherwise `{ success: false }`.
 */
export async function handlePaymentFailureAction(payload: {
  orderId: string;
  errorCode?: string;
  errorDescription?: string;
}): Promise<{ success: boolean }> {
  try {
    const session = await requireOwnerOrSuperAdmin();
    const parsed = paymentFailurePayloadSchema.safeParse(payload);
    if (!parsed.success) return { success: false };

    const errorCode = (parsed.data.errorCode || 'PAYMENT_FAILED').slice(0, 100);
    const errorDescription = (parsed.data.errorDescription || 'Payment declined or cancelled by user').slice(0, 500);

    const updated = await db
      .update(subscriptions)
      .set({
        status: 'failed',
        failureReason: `${errorCode}: ${errorDescription}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.razorpayOrderId, parsed.data.orderId),
          eq(subscriptions.organizationId, session.organizationId),
          eq(subscriptions.status, 'created')
        )
      )
      .returning({ id: subscriptions.id });

    return { success: updated.length > 0 };
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
