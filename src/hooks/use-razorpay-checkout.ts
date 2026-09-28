'use client';

import { useState, useCallback } from 'react';
import {
  createRazorpaySubscriptionOrderAction,
  verifyRazorpayPaymentAction,
  handlePaymentFailureAction,
  type VerifyPaymentResult,
} from '@/actions/subscription-actions';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Dynamically loads the official Razorpay Checkout.js script
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface CheckoutOptions {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  userProfile?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess?: (result: VerifyPaymentResult) => void;
  onFailure?: (error: string) => void;
}

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);

  const startCheckout = useCallback(
    async ({
      planId,
      billingCycle,
      userProfile,
      onSuccess,
      onFailure,
    }: CheckoutOptions) => {
      setIsProcessing(true);

      try {
        // 1. Create order on server
        const orderResult = await createRazorpaySubscriptionOrderAction(
          planId,
          billingCycle
        );

        if (!orderResult.success) {
          throw new Error(orderResult.error || 'Failed to initialize subscription');
        }

        // 2. If free tier (Starter), activated immediately without payment gateway
        if (orderResult.isFree) {
          toast.success(
            `You are now active on ${orderResult.planName || 'Starter Practice'}!`
          );
          if (onSuccess) {
            onSuccess({
              success: true,
              planId: 'starter',
              planName: orderResult.planName,
              requiresOnboarding: true,
            });
          }
          setIsProcessing(false);
          return;
        }

        // 3. Paid plan: Load Razorpay Checkout.js
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          throw new Error(
            'Unable to load Razorpay payment gateway. Please check your internet connection or disable ad-blockers.'
          );
        }

        const rzpOptions = {
          key: orderResult.keyId,
          amount: orderResult.amountPaise,
          currency: orderResult.currency || 'INR',
          name: 'OptixOS Eyecare POS',
          description: `${orderResult.planName} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
          image: '/logo.png', // Fallback
          order_id: orderResult.orderId,
          prefill: {
            name: userProfile?.name || 'OptixOS Practice Admin',
            email: userProfile?.email || 'admin@optixos.com',
            contact: userProfile?.phone || '9876543210',
          },
          theme: {
            color: '#2563eb', // OptixOS brand blue
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'UPI / QR',
                  instruments: [
                    {
                      method: 'upi',
                    },
                  ],
                },
                other: {
                  name: 'Other Payment Methods',
                  instruments: [
                    { method: 'card' },
                    { method: 'netbanking' },
                    { method: 'wallet' },
                  ],
                },
              },
              sequence: ['block.upi', 'block.other'],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyToastId = toast.loading('Verifying secure payment...');

              const verifyResult = await verifyRazorpayPaymentAction({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId,
                billingCycle,
              });

              toast.dismiss(verifyToastId);

              if (verifyResult.success) {
                toast.success(
                  `🎉 Payment Successful! Welcome to ${verifyResult.planName}!`
                );
                if (onSuccess) {
                  onSuccess(verifyResult);
                }
              } else {
                toast.error(
                  verifyResult.error || 'Payment verification failed'
                );
                if (onFailure) {
                  onFailure(verifyResult.error || 'Verification failed');
                }
              }
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : 'Verification error';
              toast.error(msg);
              if (onFailure) onFailure(msg);
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: async () => {
              setIsProcessing(false);
              toast.info('Payment was cancelled.');
              if (orderResult.orderId) {
                await handlePaymentFailureAction({
                  orderId: orderResult.orderId,
                  errorCode: 'USER_CANCELLED',
                  errorDescription: 'User closed payment window before completion',
                });
              }
            },
          },
        };

        const razorpayInstance = new window.Razorpay(rzpOptions);

        razorpayInstance.on('payment.failed', async (response: any) => {
          setIsProcessing(false);
          const reason =
            response.error?.description || 'Your payment was declined.';
          toast.error(`Payment Failed: ${reason}`);

          if (orderResult.orderId) {
            await handlePaymentFailureAction({
              orderId: orderResult.orderId,
              errorCode: response.error?.code,
              errorDescription: reason,
            });
          }

          if (onFailure) onFailure(reason);
        });

        razorpayInstance.open();
      } catch (err: unknown) {
        setIsProcessing(false);
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Payment initialization failed. Please try again.';
        toast.error(errorMsg);
        if (onFailure) onFailure(errorMsg);
      }
    },
    []
  );

  return {
    startCheckout,
    isProcessing,
  };
}
