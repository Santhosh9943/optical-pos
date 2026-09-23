'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PRICING_PLANS } from '@/lib/plans';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  Check,
  Sparkles,
  Shield,
  Zap,
  Building2,
  Printer,
  Eye,
  Layers,
  Store,
  Receipt,
  ArrowRight,
  ChevronRight,
  Star,
  CheckCircle2,
  HelpCircle,
  Activity,
  Percent,
  Sliders,
  Maximize2,
  Columns,
  Laptop,
} from 'lucide-react';

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activeModeTab, setActiveModeTab] = useState<'adaptive' | 'rx' | 'billing' | 'dense'>('adaptive');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const posModes = [
    {
      id: 'adaptive' as const,
      name: 'Adaptive Split',
      badge: 'Default',
      icon: Columns,
      description: 'Balanced split layout displaying the customer profile, clinical Rx editor, and cart items side-by-side.',
      bestFor: 'Daily general optical sales and customer consultations on 1080p desktop monitors.',
      previewKey: '50% Clinical Rx • 50% Active Cart & Billing',
    },
    {
      id: 'rx' as const,
      name: 'Rx Focus',
      badge: 'Optometrist Desk',
      icon: Eye,
      description: 'Expands the clinical refraction matrix and historical vision timeline to full width with quick diopter selectors.',
      bestFor: 'In-clinic optometrists performing eye examinations, refraction tests, and contact lens fittings.',
      previewKey: '70% Refraction Matrix • 30% Compact Cart Summary',
    },
    {
      id: 'billing' as const,
      name: 'Billing Focus',
      badge: 'Express Checkout',
      icon: Receipt,
      description: 'Prioritizes high-speed barcode scanning, cart adjustments, payment splits, and receipt printing.',
      bestFor: 'Cashier checkout counters during peak festival or weekend retail rush hours.',
      previewKey: '75% Cart & Payment Settlement • 25% Collapsed Rx Pill',
    },
    {
      id: 'dense' as const,
      name: 'Dense Split',
      badge: 'High Productivity',
      icon: Maximize2,
      description: 'Compact tabular data view with micro-padding and small typography for high-volume retail stores.',
      bestFor: 'Experienced counter operators on wide touch displays who want zero scrolling.',
      previewKey: 'Compact Grid • 100% Screen Real-Estate Utilization',
    },
  ];

  const faqs = [
    {
      q: 'How does OptixOS handle Indian GST rates for spectacles and lenses?',
      a: 'OptixOS automatically handles dual-rate GST compliance out of the box. Spectacle frames and standard optical lenses are billed at 5% GST (HSN 9003/9004), while premium lens coatings (anti-reflective, blue cut) and contact lens solutions are calculated at 18% GST (HSN 3307). Invoices clearly present CGST, SGST, or IGST breakdowns.',
    },
    {
      q: 'Will my existing barcode scanner and thermal receipt printer work?',
      a: 'Yes! OptixOS supports any standard USB or wireless HID barcode scanner with instantaneous sub-10ms auto-focus detection. It prints on standard 80mm/58mm ESC/POS thermal printers as well as A4 laser printers for formal GST tax invoices.',
    },
    {
      q: 'How does the 0.25 D clinical diopter validation work?',
      a: 'All optical fields (Sphere, Cylinder, Addition) enforce standard 0.25 Diopter increments in integer-scaled math. If Cylinder power is entered, Axis is mandatory between 1° and 180°. This eliminates manual typing typos during dispensing.',
    },
    {
      q: 'Can workshop technicians see wholesale purchase costs or customer prices?',
      a: 'No. OptixOS features strict document and query-level redaction. Workshop Lab Job Slips completely strip out all pricing, discounts, and margins. Technicians only receive clinical parameters, lens material, coating specifications, and frame tracing data.',
    },
    {
      q: 'Can I manage multiple physical store branches with one account?',
      a: 'Yes. With Growth Plus or Enterprise Pro, you can create and manage multiple physical stores. Stock is tracked by branch, and staff members are securely scoped to their designated branch with real-time switching.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-500/20 selection:text-blue-500">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
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

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#pos-modes" className="transition hover:text-foreground">
              POS Modes
            </a>
            <a href="#clinical" className="transition hover:text-foreground">
              Clinical Diopters
            </a>
            <a href="#pricing" className="transition hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-foreground">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              Sign In
            </Link>
            <Link
              href="/pos/new-bill"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <span>Launch POS</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
          {/* Subtle Background Radial Gradients */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute top-40 right-10 -z-10 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[90px]" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Country Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/50 px-3.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Cloud Optical POS & Practice Management • Made for India 🇮🇳</span>
            </div>

            {/* Main Headline */}
            <h1 className="mx-auto max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              The Modern Operating System for{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Optical Retail & Eye Clinics
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Purpose-engineered for independent opticians and multi-branch retail chains.
              Unifies clinical 0.25 D refraction matrices, guided spectacle wizards, dual-rate GST (5% & 18%),
              barcode checkout, and price-redacted optical lab slips in one lightning-fast web platform.
            </p>

            {/* Dual Hero CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/auth/login?mode=signup&plan=starter"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99]"
              >
                <span>Start Free Practice</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pos/new-bill"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 backdrop-blur px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]"
              >
                <Glasses className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Try Live POS Counter</span>
              </Link>
            </div>

            {/* Micro Highlights Pill Row */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs text-muted-foreground">
                <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                <span>&lt;10ms Barcode Response</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs text-muted-foreground">
                <Eye className="h-4 w-4 shrink-0 text-blue-500" />
                <span>0.25 D Clinical Precision</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs text-muted-foreground">
                <Receipt className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Dual 5% & 18% GST Invoicing</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 p-2.5 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 text-indigo-500" />
                <span>100% Tenant Isolation</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Interactive POS Viewport Modes Section */}
        <section id="pos-modes" className="border-t border-border/60 bg-muted/20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Tailored Ergonomics
              </span>
              <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                4 Specialized POS Viewport Modes
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                Different optical tasks demand different layouts. Switch layouts with a single click or keyboard shortcut (F4) to give your optometrists and cashiers the exact view they need.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto mb-8">
              {posModes.map((m) => {
                const Icon = m.icon;
                const isActive = activeModeTab === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModeTab(m.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition cursor-pointer ${
                      isActive
                        ? 'border-blue-600 bg-card shadow-md text-foreground'
                        : 'border-border bg-card/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                    <span className="text-xs font-bold">{m.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Mode Card Demonstration */}
            {(() => {
              const currentMode = posModes.find((m) => m.id === activeModeTab) || posModes[0];
              return (
                <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-foreground">{currentMode.name} Mode</h3>
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {currentMode.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                        {currentMode.description}
                      </p>
                    </div>
                    <Link
                      href="/pos/new-bill"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                    >
                      <span>Try This Mode</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
                      <span className="font-semibold text-foreground block mb-1">Recommended Usage:</span>
                      <p className="text-muted-foreground">{currentMode.bestFor}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
                      <span className="font-semibold text-foreground block mb-1">Layout Geometry:</span>
                      <p className="text-blue-600 dark:text-blue-400 font-mono font-medium">{currentMode.previewKey}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* 4. Core Domain Optical Features Grid */}
        <section id="features" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Built For Optics
              </span>
              <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Domain-Engineered for Optical Workflows
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                General retail POS systems fail in optical clinics because spectacles are custom medical devices. OptixOS was built specifically around ophthalmic diopters, spectacle assembly, and lab workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:border-blue-500/40">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
                  <Eye className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Clinical Refraction Matrix</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Strict 0.25 D validation across SPH, CYL, and ADD. Mandatory Axis bounds (1°–180°) whenever CYL is non-zero. Stores historical prescription changes per patient.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:border-blue-500/40">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mb-4">
                  <Glasses className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Spectacle Pair Guided Wizard</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Seamlessly bundles frame + left & right lenses + anti-reflective or blue-cut coatings into a single cohesive line item with real-time stock deduction.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:border-blue-500/40">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                  <Percent className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Dual-Rate GST Tax Engine</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Automatic split taxation for Indian optical retail: 5% on frames/lenses (HSN 9003/9004) and 18% on coatings/accessories (HSN 3307), formatted cleanly on A4 and 80mm bills.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:border-blue-500/40">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-4">
                  <Printer className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Redacted Workshop Lab Slips</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Generates price-free workshop fitting slips. Optical lab technicians see pupillary distance, axis, and fitting instructions with zero commercial price or margin leakage.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:border-blue-500/40">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Multi-Branch Architecture</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Manage multiple physical store locations under one practice account. Monitor consolidated GMV, transfer inventory, and scope staff permissions securely by branch.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg hover:border-blue-500/40">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-4">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Family Billing & WhatsApp Sync</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Group dependents under a primary contact number. Trigger instant WhatsApp order readiness alerts and annual eye checkup recall reminders with one click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Interactive Pricing Section */}
        <section id="pricing" className="border-t border-border/60 bg-muted/20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Predictable Subscription
              </span>
              <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Simple, Transparent Practice Pricing
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                Start completely free with zero credit card required. Upgrade as your practice opens more branches and counters.
              </p>

              {/* Monthly vs Annual Toggle */}
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1 text-xs font-semibold">
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

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
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
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground min-h-[36px]">{plan.tagline}</p>

                      <div className="mt-6 flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold tracking-tight text-foreground">{price}</span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{billingSub}</p>

                      {/* Feature List */}
                      <div className="mt-6 border-t border-border pt-6">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          What&apos;s Included:
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
          </div>
        </section>

        {/* 6. FAQ Accordion Section */}
        <section id="faq" className="py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Common Questions
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-border bg-card transition overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-foreground hover:bg-muted/50 transition cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? 'rotate-90 text-blue-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-border/60 bg-muted/20 p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Bottom High-Converting CTA Banner */}
        <section className="border-t border-border/60 bg-gradient-to-b from-card to-muted/40 py-16 text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Upgrade Your Optical Counter Today
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Join leading Indian opticians and retail practices running on OptixOS. Set up in less than 2 minutes.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/login?mode=signup&plan=starter"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition"
              >
                <span>Sign In with Google</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-border bg-card py-10 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Glasses className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-foreground">OptixOS</span>
            <span>— The Domain-Engineered Optical Cloud</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </span>
            <span>•</span>
            <span>© {new Date().getFullYear()} OptixOS. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
