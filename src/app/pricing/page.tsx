'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PRICING_PLANS } from '@/lib/plans';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  HelpCircle,
} from 'lucide-react';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <Glasses className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground leading-tight">
                OptixOS
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Optical POS & EHR
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing Container */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50/50 px-3.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Fair, Transparent Practice Tiers</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Invest in Practice Speed & Accuracy
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Choose the ideal plan for your optical counter. All plans include 0.25 D refraction validation, spectacle pair assembly, and Indian GST tax compliance.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-4 py-1.5 transition ${
                !isAnnual ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                isAnnual ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch mb-20">
          {PRICING_PLANS.map((plan) => {
            const price = isAnnual
              ? plan.annualPrice > 0
                ? `₹${Math.round(plan.annualPrice / 12)}`
                : '₹0'
              : plan.monthlyPrice > 0
              ? `₹${plan.monthlyPrice}`
              : '₹0';

            const billingSub = isAnnual
              ? plan.annualPrice > 0
                ? `Billed ₹${plan.annualPrice} annually`
                : 'Free forever'
              : plan.monthlyPrice > 0
              ? 'Billed monthly'
              : 'Free forever';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-card p-8 shadow-sm transition ${
                  plan.isPopular
                    ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-xl'
                    : 'border-border'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground min-h-[36px]">{plan.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">{price}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{billingSub}</p>

                  <div className="mt-6 border-t border-border pt-6">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Included Capabilities:
                    </span>
                    <ul className="mt-3 space-y-2.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href={`/auth/login?mode=signup&plan=${plan.id}`}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.99] ${
                      plan.isPopular
                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                        : 'border border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{plan.buttonText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Guarantee Trust Bar */}
        <div className="rounded-2xl border border-border bg-muted/30 p-8 max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-base font-bold text-foreground">Zero Lock-in & Enterprise Data Privacy</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Every practice account runs with isolated database multi-tenancy. You can export your patient records, prescription history, and GST invoices at any time in standard CSV and JSON formats.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 text-xs text-muted-foreground text-center">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Glasses className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-foreground">OptixOS</span>
            <span>— Practice Management for Modern Opticians</span>
          </div>
          <p>© {new Date().getFullYear()} OptixOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
