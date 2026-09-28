'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ShieldCheck,
  Smartphone,
  Mail,
  Key,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function TwoFactorChallengePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'totp' | 'otp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const handleSendEmailOtp = async () => {
    if (otpCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    setErrorMsg(null);

    try {
      const { error } = await authClient.twoFactor.sendOtp();
      if (error) {
        setErrorMsg(error.message || 'Failed to dispatch email verification code.');
        toast.error('Failed to send OTP email');
      } else {
        toast.success('6-digit code dispatched to your registered email!');
        setOtpCooldown(60);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with verification service.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      let res;
      if (activeTab === 'totp') {
        res = await authClient.twoFactor.verifyTotp({
          code: code.trim(),
        });
      } else if (activeTab === 'otp') {
        res = await authClient.twoFactor.verifyOtp({
          code: code.trim(),
        });
      } else {
        res = await authClient.twoFactor.verifyBackupCode({
          code: code.trim(),
        });
      }

      if (res.error) {
        setErrorMsg(res.error.message || 'Invalid verification code. Please check and try again.');
        toast.error('Verification failed');
        setLoading(false);
        return;
      }

      toast.success('Identity verified successfully');
      router.push('/pos/new-bill');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
      toast.error('Verification error');
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
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            2-Step Verification
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Enter the 6-digit security code to confirm your identity and access your practice POS.
          </p>
        </div>

        {/* Tab selection */}
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-xs font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setActiveTab('totp');
              setCode('');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
              activeTab === 'totp'
                ? 'bg-background text-foreground shadow-xs'
                : 'hover:text-foreground'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>App (TOTP)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('otp');
              setCode('');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
              activeTab === 'otp'
                ? 'bg-background text-foreground shadow-xs'
                : 'hover:text-foreground'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email OTP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              setCode('');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
              activeTab === 'backup'
                ? 'bg-background text-foreground shadow-xs'
                : 'hover:text-foreground'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Backup</span>
          </button>
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

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          {activeTab === 'totp' && (
            <p className="text-xs text-muted-foreground text-center">
              Open your <strong>Google Authenticator</strong> or <strong>Authy</strong> app and enter the current 6-digit code.
            </p>
          )}

          {activeTab === 'otp' && (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                We will dispatch a 6-digit one-time passcode to your registered email address.
              </p>
              <button
                type="button"
                onClick={handleSendEmailOtp}
                disabled={otpCooldown > 0 || sendingOtp}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
              >
                {sendingOtp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                <span>
                  {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Send Code to My Email'}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'backup' && (
            <p className="text-xs text-muted-foreground text-center">
              Enter one of your 10 emergency single-use backup recovery codes.
            </p>
          )}

          <div>
            <div className="relative">
              <input
                type="text"
                autoFocus
                required
                maxLength={activeTab === 'backup' ? 12 : 6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
                placeholder={activeTab === 'backup' ? 'e.g. 1a2b3c4d5e' : '000000'}
                className="w-full text-center tracking-[8px] font-mono text-xl py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground placeholder:tracking-widest focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying Security Code...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
