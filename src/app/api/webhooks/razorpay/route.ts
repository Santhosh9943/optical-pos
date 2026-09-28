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
import { eq } from 'drizzle-orm';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
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

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity;

    console.log(`[Razorpay Webhook] Processing event: ${event}`, {
      orderId: entity?.order_id || entity?.id,
      paymentId: entity?.id,
    });

    // 2. Handle order.paid and payment.captured
    if (event === 'order.paid' || event === 'payment.captured') {
      const orderId = entity.order_id || entity.id;
      const paymentId = entity.id;
      const notes = entity.notes || {};
      const organizationId = notes.organizationId;
      const planId = notes.planId;
      const billingCycle = notes.billingCycle || 'monthly';

      if (organizationId && planId) {
        // Calculate subscription expiry
        const endsAt = new Date();
        if (billingCycle === 'annual') {
          endsAt.setFullYear(endsAt.getFullYear() + 1);
        } else {
          endsAt.setDate(endsAt.getDate() + 30);
        }

        // Activate plan in organizations table
        await db
          .update(organizations)
          .set({
            planId,
            subscriptionStatus: 'active',
            subscriptionPeriod: billingCycle,
            subscriptionEndsAt: endsAt,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organizationId));

        // Update subscriptions record
        if (orderId) {
          await db
            .update(subscriptions)
            .set({
              status: 'paid',
              razorpayPaymentId: paymentId,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.razorpayOrderId, orderId));
        }

        revalidatePath('/');
        revalidatePath('/pricing');
      }
    }

    // 3. Handle payment.failed
    if (event === 'payment.failed') {
      const orderId = entity.order_id;
      const errorDescription = entity.error_description || 'Payment failed';

      if (orderId) {
        await db
          .update(subscriptions)
          .set({
            status: 'failed',
            failureReason: errorDescription,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.razorpayOrderId, orderId));
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
