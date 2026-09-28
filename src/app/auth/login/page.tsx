'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  Lock,
  Mail,
  User,
  Building2,
  Store,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { setupPracticeOnboardingAction } from '@/actions/tenant-actions';
import { verifyOwnerLoginPreflightAction } from '@/actions/staff-auth-actions';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';
  // Strict Open-Redirect Defense: Must be an internal path starting with single '/' and no protocol-relative '//' or backslash
  const callbackUrl =
    rawCallbackUrl.startsWith('/') &&
    !rawCallbackUrl.startsWith('//') &&
    !rawCallbackUrl.includes('\\')
      ? rawCallbackUrl
      : '/admin/dashboard';
  const planParam = searchParams.get('plan');
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [staffRedirectInfo, setStaffRedirectInfo] = useState<{
    isStaff: boolean;
    orgCode: string;
    email: string;
  } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setMode('signup');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStaffRedirectInfo(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const trimmedEmail = email.trim();

        // 1. Preflight check: prevent staff accounts from logging into owner portal
        const preflight = await verifyOwnerLoginPreflightAction(trimmedEmail);
        if (preflight.isStaff) {
          setErrorMsg(
            preflight.error ||
              `Staff account detected. Please sign in via the Staff Portal with your Practice ID (${preflight.orgCode || 'OPT-X'}).`
          );
          setStaffRedirectInfo({
            isStaff: true,
            orgCode: preflight.orgCode || '',
            email: trimmedEmail,
          });
          toast.warning('Staff account detected. Please sign in via the Staff Portal.');
          setLoading(false);
          return;
        }

        const res = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        });

        if (res.error) {
          setErrorMsg(res.error.message || 'Invalid email or password. Please try again.');
          toast.error(res.error.message || 'Sign in failed');
          setLoading(false);
          return;
        }

        if ((res.data as any)?.twoFactorRedirect) {
          toast.info('Two-Factor Authentication required');
          router.push('/auth/2fa');
          return;
        }

        toast.success('Signed in successfully');
        router.push(callbackUrl);
        router.refresh();
      } else {
        if (!organizationName.trim()) {
          setErrorMsg('Please enter your practice or organization name.');
          setLoading(false);
          return;
        }

        const { error } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMsg(error.message || 'Registration failed. Please try again.');
          toast.error(error.message || 'Sign up failed');
          setLoading(false);
          return;
        }

        // Automatically provision Practice Organization & Store Branch
        const finalBranch = branchName.trim() || 'Main Branch';
        try {
          const setupRes = await setupPracticeOnboardingAction({
            practiceName: organizationName.trim(),
            branchName: finalBranch,
            userEmail: email.trim(),
          });

          if (setupRes.success) {
            toast.success(`Practice workspace created! Store ID: ${setupRes.orgCode || 'Active'}`);
            router.push(callbackUrl || '/pos/new-bill');
            router.refresh();
          } else {
            toast.info('Account created. Please complete practice workspace details.');
            router.push('/onboarding');
            router.refresh();
          }
        } catch (setupErr) {
          console.warn('[handleSubmit] Automatic setup notice, routing to /onboarding:', setupErr);
          router.push('/onboarding');
          router.refresh();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      toast.error('Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setOauthLoading(true);

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      });
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'Google Sign-In failed to initialize.');
      toast.error('Google Sign-In failed');
      setOauthLoading(false);
    }
  };

  const planTitles: Record<string, string> = {
    starter: 'Starter Free Plan (₹0/mo)',
    plus: 'Growth Plus Plan (₹999/mo)',
    enterprise: 'Enterprise Pro Plan (₹2,499/mo)',
    free: 'Starter Free Plan (₹0/mo)',
    pro: 'Enterprise Pro Plan (₹2,499/mo)',
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
      {/* Return to Landing Page */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
          v2.4 Cloud
        </span>
      </div>

      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
          <Glasses className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">OptixOS</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Domain-Engineered Optical Practice & POS Cloud
        </p>

        {/* Selected Plan Indicator if redirected from Pricing */}
        {planParam && (
          <div className="mt-3 flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-50/50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Selected: {planTitles[planParam.toLowerCase()] || planParam}</span>
          </div>
        )}
      </div>

      {/* Google OAuth Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || oauthLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background py-2.5 text-sm font-semibold text-foreground shadow-xs transition hover:bg-muted active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {oauthLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="w-full border-t border-border"></div>
        <span className="absolute bg-card px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          or sign in with email
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-semibold text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg(null);
          }}
          className={`rounded-md py-1.5 transition ${
            mode === 'signin'
              ? 'bg-background text-foreground shadow-xs'
              : 'hover:text-foreground'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setErrorMsg(null);
          }}
          className={`rounded-md py-1.5 transition ${
            mode === 'signup'
              ? 'bg-background text-foreground shadow-xs'
              : 'hover:text-foreground'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Staff Portal Redirect Prompt */}
      {staffRedirectInfo?.isStaff && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-bold text-amber-800 dark:text-amber-300 text-xs mb-1">
            Store Staff Account Detected
          </p>
          <p className="mb-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
            Store staff must sign in using the dedicated Staff Portal with your Practice ID (<strong>{staffRedirectInfo.orgCode}</strong>).
          </p>
          <Link
            href={`/auth/staff-login?org=${encodeURIComponent(staffRedirectInfo.orgCode)}&email=${encodeURIComponent(staffRedirectInfo.email)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition shadow-xs text-xs"
          >
            <span>Open Staff Portal ({staffRedirectInfo.orgCode})</span>
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </Link>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="organizationName"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Organization / Practice Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="organizationName"
                  data-testid="input-signup-org-name"
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Vision Care Opticals"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="branchName"
                  className="block text-xs font-medium text-foreground"
                >
                  Store / Branch Name
                </label>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Optional (defaults to Main Branch)
                </span>
              </div>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="branchName"
                  data-testid="input-signup-branch-name"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Downtown Branch (or leave blank)"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@optixos.com"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-foreground"
            >
              Password
            </label>
            {mode === 'signin' && (
              <Link
                href="/auth/forgot-password"
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || oauthLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{mode === 'signin' ? 'Authenticating...' : 'Registering Account...'}</span>
            </>
          ) : (
            <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Optical Practice'}</span>
          )}
        </button>

        {/* Dedicated Store Staff Portal Entry Link */}
        <div className="pt-3 border-t border-border/80 text-center">
          <p className="text-xs text-muted-foreground">
            Store Staff or Optometrist?{' '}
            <Link
              href="/auth/staff-login"
              data-testid="link-staff-portal"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Sign in to Staff Portal &rarr;
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
