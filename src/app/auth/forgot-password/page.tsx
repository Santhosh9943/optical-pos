'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Glasses,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || cooldown > 0) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : '/auth/reset-password';

      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });

      if (error) {
        setErrorMsg(error.message || 'Unable to process reset request. Please check the email address.');
        toast.error('Reset request failed');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setCooldown(60);
      toast.success('Password reset email dispatched!');
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl dark:shadow-2xl sm:p-8">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Glasses className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {submitted ? 'Check Your Email' : 'Reset Your Password'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {submitted
              ? `We sent password reset instructions to ${email}. Check your inbox and click the reset link.`
              : 'Enter your registered email address and we will dispatch a secure 15-minute reset link.'}
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

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/30 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>, you will receive an email shortly. The link expires in <strong className="text-foreground">15 minutes</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={cooldown > 0 || loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-muted transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                <span>
                  {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Reset Link'}
                </span>
              </button>

              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@practice.com"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Dispatching Reset Link...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Remember your password?{' '}
              <Link
                href="/auth/login"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
