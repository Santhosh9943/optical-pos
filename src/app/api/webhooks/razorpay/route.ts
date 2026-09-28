/**
 * Razorpay Webhook Route Handler
 * Endpoint: POST /api/webhooks/razorpay
 *
 * Verifies the x-razorpay-signature header using HMAC SHA-256 over the raw request body.
 * Asynchronously processes:
 * - order.paid
 * - payment.captured
 * - payment.failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/cache';

/** Minimal shape of a Razorpay payment / order entity used by this handler. */
interface RazorpayWebhookEntity {
  id?: string;
  order_id?: string;
  error_description?: string;
}

/** Minimal shape of a Razorpay webhook body used by this handler. */
interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayWebhookEntity };
    order?: { entity?: RazorpayWebhookEntity };
  };
}

/**
 * Subscription order states from which a verified (HMAC-signed) paid event may activate the plan.
 * 'failed' is included because Razorpay Checkout lets the customer retry on the SAME order after a
 * declined attempt (which the checkout / payment.failed webhook already recorded as 'failed').
 */
const ACTIVATABLE_SUBSCRIPTION_STATUSES: string[] = ['created', 'failed'];

/**
 * @description Razorpay webhook receiver. Verifies the HMAC signature over the raw body, then
 * activates the stored subscription on order.paid / payment.captured (from 'created' or 'failed';
 * 'paid' is an idempotent no-op) and records payment.failed only on still-pending ('created') orders.
 * @param req - Incoming webhook request.
 * @returns JSON acknowledgement (400 on bad signature, 500 on processing error).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 1. Cryptographic HMAC-SHA256 signature verification
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('[Razorpay Webhook] Invalid signature received');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookBody;
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const entity = paymentEntity || payload.payload?.order?.entity;

    console.log(`[Razorpay Webhook] Processing event: ${event}`, {
      orderId: entity?.order_id || entity?.id,
      paymentId: entity?.id,
    });

    // 2. Handle order.paid and payment.captured
    //    Plan, cycle and organization are taken from the server-side subscriptions record
    //    (looked up by Razorpay order id). Activation happens from 'created' or 'failed'
    //    (retry after a declined attempt on the same order); 'paid' records are skipped, so
    //    replays / duplicate events are idempotent no-ops.
    if (event === 'order.paid' || event === 'payment.captured') {
      const orderId: string | undefined = entity?.order_id || entity?.id;
      const paymentId: string | undefined = paymentEntity?.id;

      if (orderId) {
        const [subRecord] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.razorpayOrderId, orderId))
          .limit(1);

        if (subRecord && ACTIVATABLE_SUBSCRIPTION_STATUSES.includes(subRecord.status)) {
          const billingCycle = subRecord.billingCycle === 'annual' ? 'annual' : 'monthly';
          const endsAt = new Date();
          if (billingCycle === 'annual') {
            endsAt.setFullYear(endsAt.getFullYear() + 1);
          } else {
            endsAt.setDate(endsAt.getDate() + 30);
          }

          const activated = await db.transaction(async (tx) => {
            // Conditional transition (created | failed) -> paid: a concurrent verify / duplicate
            // event that already moved the record to 'paid' gets 0 rows and skips activation.
            const transitioned = await tx
              .update(subscriptions)
              .set({
                status: 'paid',
                ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
                failureReason: null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(subscriptions.id, subRecord.id),
                  eq(subscriptions.organizationId, subRecord.organizationId),
                  inArray(subscriptions.status, ACTIVATABLE_SUBSCRIPTION_STATUSES)
                )
              )
              .returning({ id: subscriptions.id });

            if (transitioned.length === 0) return false;

            await tx
              .update(organizations)
              .set({
                planId: subRecord.planId,
                subscriptionStatus: 'active',
                subscriptionPeriod: billingCycle,
                subscriptionEndsAt: endsAt,
                updatedAt: new Date(),
              })
              .where(eq(organizations.id, subRecord.organizationId));

            return true;
          });

          if (activated) {
            revalidatePath('/');
            revalidatePath('/pricing');
            await invalidateCache({ orgId: subRecord.organizationId, namespace: 'plan' });
          }
        }
      }
    }

    // 3. Handle payment.failed: only a still-pending ('created') order can fail. A 'paid' order is
    //    never overwritten, and a 'failed' order stays activatable by a later successful retry.
    if (event === 'payment.failed') {
      const orderId: string | undefined = entity?.order_id;
      const errorDescription = String(entity?.error_description || 'Payment failed').slice(0, 500);

      if (orderId) {
        await db
          .update(subscriptions)
          .set({
            status: 'failed',
            failureReason: errorDescription,
            updatedAt: new Date(),
          })
          .where(and(eq(subscriptions.razorpayOrderId, orderId), eq(subscriptions.status, 'created')));
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: unknown) {
    console.error('[Razorpay Webhook Handler] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook error' },
      { status: 500 }
    );
  }
}
