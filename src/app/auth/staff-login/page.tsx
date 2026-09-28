'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  verifyStaffPortalLoginPreflightAction,
  completeStaffInitialPasswordChangeAction,
} from '@/actions/staff-auth-actions';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Building2,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function StaffLoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form states
  const [orgInput, setOrgInput] = useState(searchParams.get('org') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const urlOrg = searchParams.get('org');
    const urlEmail = searchParams.get('email');
    if (urlOrg) setOrgInput(urlOrg);
    if (urlEmail) setEmail(urlEmail);
  }, [searchParams]);

  // Forced Password Change Modal State
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [pendingPasswordChange, setPendingPasswordChange] = useState(false);
  const [pendingOrgName, setPendingOrgName] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedOrg = orgInput.trim();
    const trimmedEmail = email.trim();

    if (!trimmedOrg || !trimmedEmail || !password) {
      setErrorMsg('Please enter Practice ID, Email, and Password');
      return;
    }

    setLoading(true);

    try {
      // 1. Preflight check: verify Practice ID & staff membership
      const preflight = await verifyStaffPortalLoginPreflightAction({
        orgInput: trimmedOrg,
        email: trimmedEmail,
      });

      if (!preflight.success) {
        setErrorMsg(preflight.error || 'Authentication preflight failed');
        toast.error(preflight.error || 'Invalid credentials or store ID');
        setLoading(false);
        return;
      }

      // 2. Authenticate credentials via Better Auth
      const res = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });

      if (res.error) {
        setErrorMsg(res.error.message || 'Invalid email or password. Please verify your credentials.');
        toast.error(res.error.message || 'Authentication failed');
        setLoading(false);
        return;
      }

      if ((res.data as any)?.twoFactorRedirect) {
        toast.info('Two-Factor Authentication required');
        router.push('/auth/2fa');
        return;
      }

      // 3. If administrator required first-login password change, open forced modal
      if (preflight.mustChangePassword) {
        setPendingPasswordChange(true);
        setPendingOrgName(preflight.organizationName || 'your optical practice');
        setShowForceChangeModal(true);
        setLoading(false);
        return;
      }

      toast.success(`Welcome back to ${preflight.organizationName || 'OptixOS'}!`);
      router.push('/pos/new-bill');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMsg(msg);
      toast.error('Authentication error');
      setLoading(false);
    }
  };

  const handleCompletePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPasswordChange) return;

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await completeStaffInitialPasswordChangeAction({
        newPassword,
      });

      if (res.success) {
        toast.success('Password updated successfully! Entering store workspace...');
        setShowForceChangeModal(false);
        router.push('/pos/new-bill');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update password');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        {/* Navigation Back */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Practice Admin Sign In</span>
          </Link>
          <span className="text-[11px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
            Store Staff Portal
          </span>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Store Staff Portal
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs">
            Sign in to your assigned optical branch counter
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            data-testid="staff-login-error"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Staff Login Form */}
        <form onSubmit={handleStaffLogin} className="space-y-4">
          {/* Field 1: Organization Code / Number */}
          <div>
            <label
              htmlFor="orgInput"
              className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between"
            >
              <span>Practice / Store ID <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-muted-foreground font-normal">Accepts OPT-1 or 1</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="orgInput"
                type="text"
                required
                data-testid="input-staff-org-id"
                value={orgInput}
                onChange={(e) => setOrgInput(e.target.value)}
                placeholder="e.g. OPT-1 or 1"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground uppercase placeholder:normal-case placeholder:text-muted-foreground focus:border-purple-600 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Enter the Practice ID provided by your practice owner (e.g. <span className="font-mono font-semibold text-foreground">OPT-1</span> or <span className="font-mono font-semibold text-foreground">1</span>). Practice owners can find this in their admin header or Staff Management screen.
            </p>
          </div>

          {/* Field 2: Staff Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Staff Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                data-testid="input-staff-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@practice.com"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-600 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Field 3: Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                data-testid="input-staff-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-600 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
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
            disabled={loading}
            data-testid="btn-staff-signin"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-purple-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying & Signing In...</span>
              </>
            ) : (
              <span>Sign In to Store Workspace</span>
            )}
          </button>
        </form>

        {/* Bottom Helper */}
        <div className="mt-6 pt-4 border-t border-border/80 text-center">
          <p className="text-xs text-muted-foreground">
            Are you the Optical Practice Owner?{' '}
            <Link
              href="/auth/login"
              data-testid="link-owner-login"
              className="font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Go to Owner Login &rarr;
            </Link>
          </p>
        </div>
      </div>

      {/* Mandatory First-Time Password Change Modal */}
      {showForceChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Set Your Personal Password
                </h3>
                <p className="text-xs text-muted-foreground">
                  Welcome to {pendingOrgName}! Please create your new private password.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Your store administrator required a password change on first login for enhanced optical security.
              </span>
            </div>

            <form onSubmit={handleCompletePasswordChange} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    data-testid="input-first-login-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    data-testid="input-first-login-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                data-testid="btn-first-login-submit"
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Save Password & Access Store</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <StaffLoginFormContent />
    </Suspense>
  );
}
