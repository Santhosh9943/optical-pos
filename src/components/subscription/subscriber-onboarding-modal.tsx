'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Glasses,
  Receipt,
  Layers,
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
} from 'lucide-react';
import { completeOnboardingAction } from '@/actions/subscription-actions';
import { useRouter } from 'next/navigation';

interface StepContent {
  icon: React.ElementType;
  tag: string;
  title: string;
  description: string;
  highlights: string[];
  color: string;
}

const TOUR_STEPS: StepContent[] = [
  {
    icon: Glasses,
    tag: 'Step 1 of 4: Counter Speed',
    title: 'POS Terminal & 4 Viewport Modes',
    description:
      'OptixOS is engineered for peak dispensary flow. Press F4 at any counter to toggle between 4 viewports:',
    highlights: [
      'Adaptive Mode (7:5 balance for high-volume retail)',
      'Rx-Focus Mode (9:3 expanded clinical prescription matrix)',
      'Billing-Focus Mode (Ultra-fast 8-column cart scanning)',
      'Dense-Split Mode (50/50 sticky bar for compact counter touchscreens)',
    ],
    color: 'from-blue-600 to-indigo-600',
  },
  {
    icon: Layers,
    tag: 'Step 2 of 4: Clinical Precision',
    title: '0.25 D Refraction & Spectacle Pair Assembly',
    description:
      'Never worry about manual diopter typos again. The clinical engine validates every power entry strictly:',
    highlights: [
      'Enforces statutory 0.25 D quarter-step diopters on SPH, CYL, and ADD',
      'Mandatory Axis validation [1, 180] whenever Cylinder is non-zero',
      'Intelligent Pair Wizard connects frame inventory with left & right ophthalmic lenses',
      'Automatic HSN code assignment (9003 for frames, 9001 for lenses)',
    ],
    color: 'from-emerald-600 to-teal-600',
  },
  {
    icon: Receipt,
    tag: 'Step 3 of 4: Compliance & Workshop',
    title: 'Laser GST Invoices & Redacted Lab Slips',
    description:
      'Produce fully compliant tax documents and protect your wholesale margins effortlessly:',
    highlights: [
      'Indian GST split calculation (5% lenses, 18% frames & accessories)',
      'One-click toggle between 80mm thermal receipts and formal A4 Laser invoices',
      'Workshop Lab Slips: DOM-level wholesale cost redaction so technicians never see purchase margins',
      'Instant QR code generation for digital receipt viewing on customer smartphones',
    ],
    color: 'from-amber-600 to-orange-600',
  },
  {
    icon: Store,
    tag: 'Step 4 of 4: Practice Scale',
    title: 'Multi-Branch Inventory & Super Admin Console',
    description:
      'Scale from a single store to a multi-city optical chain without switching software:',
    highlights: [
      'High-speed barcode scanner input with <10ms database search indexing',
      'Atomic stock locks prevent double-selling across shared branch warehouses',
      'Super Admin Perspective Simulator lets you view and test any cashier or optometrist station',
      'Unified daily GMV, tax liabilities, and pending optical lab orders in one dashboard',
    ],
    color: 'from-purple-600 to-pink-600',
  },
];

interface SubscriberOnboardingModalProps {
  isOpen: boolean;
  planName: string;
  onClose: () => void;
}

export function SubscriberOnboardingModal({
  isOpen,
  planName,
  onClose,
}: SubscriberOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  const handleFinishOrSkip = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboardingAction();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      onClose();
      router.push('/pos/new-bill');
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinishOrSkip();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

        {/* Top Header / Close */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Welcome to {planName || 'OptixOS'}!
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinishOrSkip}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Skip onboarding tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tour Body */}
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
            >
              <StepIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {step.tag}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {step.title}
              </h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          <div className="mt-5 rounded-2xl border border-border/80 bg-muted/40 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Key Practice Superpowers:
            </h3>
            <ul className="space-y-2">
              {step.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span className="text-foreground/90 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Step Indicators & Action Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to tour step ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleFinishOrSkip}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Skip Tour
            </button>

            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.98] transition"
            >
              <span>
                {currentStep === TOUR_STEPS.length - 1
                  ? 'Launch POS Counter 🚀'
                  : 'Next Superpower'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
