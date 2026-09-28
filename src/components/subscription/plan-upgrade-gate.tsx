'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { canAccessFeature, type FeatureKey, FEATURE_METADATA } from '@/lib/feature-gate';
import { PlanUpgradeModal } from './plan-upgrade-modal';

interface PlanUpgradeGateProps {
  featureKey: FeatureKey;
  currentPlan?: string;
  children: React.ReactNode;
  fallbackMode?: 'locked-card' | 'inline-button' | 'hidden';
}

export function PlanUpgradeGate({
  featureKey,
  currentPlan = 'starter',
  children,
  fallbackMode = 'locked-card',
}: PlanUpgradeGateProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isAllowed = canAccessFeature(currentPlan, featureKey);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallbackMode === 'hidden') {
    return null;
  }

  const feature = FEATURE_METADATA[featureKey];

  if (fallbackMode === 'inline-button') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-50/50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 transition"
        >
          <Lock className="h-3 w-3" />
          <span>Unlock with {feature?.planBadge || 'Pro'}</span>
        </button>

        <PlanUpgradeModal
          isOpen={isModalOpen}
          featureKey={featureKey}
          currentPlan={currentPlan}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative rounded-2xl border border-dashed border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10 p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-foreground">
          {feature?.name || 'Feature Locked'}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          {feature?.description ||
            `This feature requires the ${feature?.planBadge || 'Growth Plus'} tier.`}
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Upgrade to {feature?.planBadge || 'Pro'}</span>
          </button>
        </div>
      </div>

      <PlanUpgradeModal
        isOpen={isModalOpen}
        featureKey={featureKey}
        currentPlan={currentPlan}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
