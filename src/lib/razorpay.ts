/**
 * OptixOS Razorpay Payment Gateway Client
 * Handles Razorpay Orders API, Payment Link Generation, and Cryptographic HMAC-SHA256 Verification.
 *
 * All financial math uses decimal.js to convert INR into integer paise without floating-point drift.
 */

import crypto from 'crypto';
import Decimal from 'decimal.js';

export interface CreateOrderParams {
  amountRupees: number | string;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentLinkParams {
  amountRupees: number | string;
  currency?: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  callbackUrl?: string;
}

export interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Returns the configured Razorpay API credentials.
 * Throws a descriptive error if environment variables are missing.
 */
export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local'
    );
  }

  return { keyId, keySecret };
}

/**
 * Converts INR Rupees to integer paise using Decimal.js.
 * Example: ₹999.00 -> 99900 paise.
 */
export function rupeesToPaise(amountRupees: number | string): number {
  return new Decimal(amountRupees).times(100).round().toNumber();
}

/**
 * Converts integer paise back to Rupee string with 2 decimal places.
 * Example: 99900 paise -> "999.00"
 */
export function paiseToRupees(amountPaise: number): string {
  return new Decimal(amountPaise).dividedBy(100).toFixed(2);
}

/**
 * Creates a Razorpay Order via the official Orders API (POST https://api.razorpay.com/v1/orders).
 * The resulting orderId is passed to Razorpay Checkout.js on the client.
 */
export async function createRazorpayOrder(
  params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const amountPaise = rupeesToPaise(params.amountRupees);

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Razorpay createOrder] API error:', data);
    throw new Error(
      data?.error?.description || 'Failed to create Razorpay payment order'
    );
  }

  return data as RazorpayOrderResponse;
}

/**
 * Creates a Razorpay Hosted Payment Link via POST https://api.razorpay.com/v1/payment_links
 * Used as a seamless fallback if in-app modal popups are blocked by client browser or ad-blockers.
 */
export async function createRazorpayPaymentLink(
  params: RazorpayPaymentLinkParams
): Promise<RazorpayPaymentLinkResponse> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const amountPaise = rupeesToPaise(params.amountRupees);

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: params.currency || 'INR',
      description: params.description,
      customer: params.customer,
      notify: {
        sms: false,
        email: true,
      },
      reminder_enable: true,
      notes: params.notes || {},
      callback_url: params.callbackUrl,
      callback_method: 'get',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Razorpay createPaymentLink] API error:', data);
    throw new Error(
      data?.error?.description || 'Failed to create Razorpay payment link'
    );
  }

  return data as RazorpayPaymentLinkResponse;
}

/**
 * Cryptographically verifies a Razorpay payment signature using HMAC SHA-256.
 * Formula: HMAC_SHA256(orderId + "|" + paymentId, secret) === signature
 *
 * Uses crypto.timingSafeEqual to defend against timing attack vulnerabilities.
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  try {
    const { keySecret } = getRazorpayCredentials();

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const providedBuffer = Buffer.from(params.signature, 'utf-8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error('[verifyRazorpayPaymentSignature] Error:', err);
    return false;
  }
}

/**
 * Cryptographically verifies a Razorpay webhook signature.
 * Formula: HMAC_SHA256(rawBody, webhookSecret) === signatureHeader
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[verifyRazorpayWebhookSignature] RAZORPAY_WEBHOOK_SECRET not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const providedBuffer = Buffer.from(signatureHeader, 'utf-8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error('[verifyRazorpayWebhookSignature] Error:', err);
    return false;
  }
}
