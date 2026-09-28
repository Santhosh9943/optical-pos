'use client';

import React, { useState } from 'react';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { PRICING_PLANS } from '@/lib/plans';
import { FEATURE_METADATA, type FeatureKey, type PlanTier } from '@/lib/feature-gate';
import { useRazorpayCheckout } from '@/hooks/use-razorpay-checkout';
import { Button, Badge } from '@/components/ui';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  featureKey: FeatureKey;
  currentPlan?: string;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
}

export function PlanUpgradeModal({
  isOpen,
  featureKey,
  currentPlan = 'starter',
  onClose,
  onUpgradeSuccess,
}: PlanUpgradeModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { startCheckout, isProcessing } = useRazorpayCheckout();

  if (!isOpen) return null;

  const feature = FEATURE_METADATA[featureKey];
  const requiredPlanTier: PlanTier = feature ? feature.requiredPlan : 'plus';
  const targetPlan =
    PRICING_PLANS.find((p) => p.id === requiredPlanTier) || PRICING_PLANS[1];

  const price =
    billingCycle === 'annual'
      ? `₹${Math.round(targetPlan.annualPrice / 12)} / mo (₹${targetPlan.annualPrice} billed annually)`
      : `₹${targetPlan.monthlyPrice} / month`;

  const handleUpgrade = () => {
    startCheckout({
      planId: targetPlan.id,
      billingCycle,
      onSuccess: () => {
        if (onUpgradeSuccess) onUpgradeSuccess();
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Unlock {targetPlan.name}
              </span>
              <h2 className="text-lg font-bold text-foreground">
                {feature?.name || 'Pro Practice Feature'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close upgrade dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description & Feature highlights */}
        <div className="mt-5">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {feature?.description ||
              'This advanced feature is locked on your current plan. Upgrade your optical practice today to unlock full potential.'}
          </p>

          {/* Billing Switcher */}
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 rounded-lg py-1.5 transition ${
                billingCycle === 'monthly'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition ${
                billingCycle === 'annual'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] text-emerald-600 font-bold">
                Save 20%
              </span>
            </button>
          </div>

          {/* Target Plan Card preview */}
          <div className="mt-5 rounded-2xl border border-blue-600/30 bg-blue-50/30 dark:bg-blue-950/20 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {targetPlan.name}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">{price}</p>
              </div>
              <Badge variant="info" size="sm">
                Instant Activation
              </Badge>
            </div>

            <ul className="mt-3 space-y-1.5">
              {targetPlan.features.slice(0, 4).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>

          <Button
            variant="primary"
            onClick={handleUpgrade}
            isLoading={isProcessing}
            loadingText="Opening Razorpay..."
            leftIcon={<CreditCard className="h-4 w-4" />}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="w-full sm:w-auto"
          >
            Upgrade with Razorpay
          </Button>
        </div>
      </div>
    </div>
  );
}
