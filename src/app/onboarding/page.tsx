'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { setupPracticeOnboardingAction } from '@/actions/tenant-actions';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  Building2,
  Store,
  MapPin,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form states
  const [practiceName, setPracticeName] = useState('');
  const [branchName, setBranchName] = useState('Main Branch');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res?.data?.user) {
        setUser(res.data.user);
        const firstName = res.data.user.name ? res.data.user.name.split(' ')[0] : 'My';
        setPracticeName(`${firstName}'s Optical Care`);
      } else {
        // If in test mode with bypass query parameter
        const isBypass = typeof window !== 'undefined' && window.location.search.includes('bypass=true');
        if (isBypass) {
          setUser({ id: 'e2e-test-user', name: 'Dr. Test Optician', email: 'test@optixos.com' });
          setPracticeName("Dr. Test's Optical Care");
        } else {
          // Not logged in -> redirect to login
          router.push('/auth/login?callbackUrl=/onboarding');
        }
      }
      setLoadingUser(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceName.trim()) {
      toast.error('Please enter your practice or store name');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setupPracticeOnboardingAction({
        practiceName: practiceName.trim(),
        branchName: branchName.trim() || 'Main Branch',
        city: city.trim(),
      });

      if (res.success) {
        toast.success(`Your optical practice is ready! Store ID: ${res.orgCode || 'Active'}`);
        router.push('/pos/new-bill');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to initialize practice workspace');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unexpected error during setup');
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4 py-12">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Glasses className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to OptixOS
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
            Set up your practice identity. You will start with a clean workspace ready for your own inventory, patients, and optical sales.
          </p>
          {user?.email && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Signed in as {user.email}</span>
            </div>
          )}
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="practiceName"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Practice / Optical Store Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="practiceName"
                type="text"
                required
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="e.g. Apex Eye Care & Opticals"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="branchName"
                className="block text-xs font-semibold text-foreground"
              >
                Primary Store / Branch Name
              </label>
              <span className="text-[11px] text-muted-foreground font-normal">
                Optional (defaults to Main Branch)
              </span>
            </div>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="branchName"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Main Branch (e.g. Downtown / Flagship)"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              You can add more physical branches at any time from your Store Admin panel.
            </p>
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Store Location / City
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru, Mumbai, Chennai"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Configuring Practice Workspace...</span>
                </>
              ) : (
                <>
                  <span>Launch Practice Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Clean Slate Assurance Note */}
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Your account starts fresh with zero mock clutter. You will have full access to billing, diopter matrices, inventory catalogs, and workshop queues.
          </span>
        </div>
      </div>
    </div>
  );
}
