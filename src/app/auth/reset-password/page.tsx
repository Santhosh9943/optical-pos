'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  Lock,
  KeyRound,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password strength scoring
  const strength = useMemo(() => {
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  }, [newPassword]);

  const strengthLabel = useMemo(() => {
    if (strength <= 1) return { text: 'Very Weak', color: 'bg-red-500' };
    if (strength === 2) return { text: 'Weak', color: 'bg-orange-500' };
    if (strength === 3) return { text: 'Moderate', color: 'bg-yellow-500' };
    if (strength === 4) return { text: 'Strong', color: 'bg-blue-500' };
    return { text: 'Very Strong', color: 'bg-emerald-500' };
  }, [strength]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token.trim()) {
      setErrorMsg('A valid password reset token is required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token: token.trim(),
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid or expired reset token. Please request a new link.');
        toast.error('Reset failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success('Password successfully reset!');
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl dark:shadow-2xl sm:p-8">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Glasses className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {success ? 'Password Reset Complete' : 'Set New Password'}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          {success
            ? 'Your credentials have been securely updated. You can now log in.'
            : 'Establish a strong, new password for your OptixOS practice account.'}
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your new password is now active across all OptixOS POS terminals and management interfaces.
            </p>
          </div>

          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            Sign In with New Password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!urlToken && (
            <div>
              <label
                htmlFor="token"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Reset Security Token
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from reset email"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="newPassword"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Strength: {strengthLabel.text}</span>
                  <span>{strength}/5 criteria</span>
                </div>
                <div className="flex h-1.5 w-full gap-1 rounded-full bg-muted overflow-hidden">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-full flex-1 transition-all ${
                        strength >= level ? strengthLabel.color : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="mt-1 text-[11px] text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground selection:bg-blue-600 selection:text-white">
      {/* Absolute Header Controls */}
      <div className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center gap-3">
        <Link
          href="/auth/login"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="absolute right-4 top-4 md:right-8 md:top-8 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <Suspense
        fallback={
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
