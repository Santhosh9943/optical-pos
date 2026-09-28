'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Mail,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  requestSuperAdminOtpAction,
  verifySuperAdminOtpAction,
} from '@/actions/super-admin-auth-actions';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  // Multi-step state: 'EMAIL' | 'OTP'
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Countdown timer state
  const [expirySeconds, setExpirySeconds] = useState<number>(180);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [canResend, setCanResend] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Live countdown timer effect
  useEffect(() => {
    if (step !== 'OTP' || secondsRemaining <= 0) {
      if (secondsRemaining <= 0) {
        setCanResend(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, secondsRemaining]);

  // Focus OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrator email.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestSuperAdminOtpAction(cleanEmail);
      if (res.success && res.expirySeconds) {
        setExpirySeconds(res.expirySeconds);
        setSecondsRemaining(res.expirySeconds);
        setCanResend(false);
        setStep('OTP');
        setOtp('');
        toast.success(`One-Time Passcode sent to ${cleanEmail}`);
      } else {
        setErrorMsg(res.error || 'Failed to dispatch access passcode.');
        toast.error('Passcode request rejected');
      }
    } catch {
      setErrorMsg('An unexpected error occurred while requesting passcode.');
      toast.error('Network request failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your one-time passcode.');
      return;
    }

    if (secondsRemaining <= 0) {
      setErrorMsg('Passcode has expired. Please click "Resend Passcode" to generate a new one.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifySuperAdminOtpAction(email.trim(), cleanOtp);
      if (res.success) {
        toast.success('Root authorization verified!');
        router.push('/super-admin/dashboard');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Invalid one-time passcode.');
        toast.error('Verification failed');
      }
    } catch {
      setErrorMsg('An unexpected verification error occurred.');
      toast.error('Verification error');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await requestSuperAdminOtpAction(email.trim());
      if (res.success && res.expirySeconds) {
        setExpirySeconds(res.expirySeconds);
        setSecondsRemaining(res.expirySeconds);
        setCanResend(false);
        setOtp('');
        toast.success(`Fresh passcode dispatched to ${email.trim()}`);
      } else {
        setErrorMsg(res.error || 'Failed to resend passcode.');
      }
    } catch {
      setErrorMsg('Failed to resend passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background glowing ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-purple-600/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Header Badge */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <ShieldCheck className="h-4 w-4 text-purple-400" />
          <span>OptixOS Enterprise Platform</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 bg-purple-950/70 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
          Root Governance
        </span>
      </div>

      {/* Card container */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-900/40 mb-3 ring-4 ring-purple-500/20">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>OptixOS Root Gateway</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {step === 'EMAIL'
              ? 'Multi-tenant root portal. OTP authentication required.'
              : 'Enter the 6-digit one-time passcode dispatched to your email.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── STEP 1: EMAIL INPUT ── */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Root Administrator Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@domain.com"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Only email addresses registered in the platform allowlist can generate an access passcode.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validating Allowlist & Sending Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Generate One-Time Passcode</span>
                  <ArrowRight className="h-4 w-4 ml-0.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP VERIFICATION ── */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between text-xs">
              <div className="truncate max-w-[240px]">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Passcode Sent To</span>
                <span className="font-mono text-purple-300 font-medium truncate block">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('EMAIL');
                  setErrorMsg(null);
                }}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition cursor-pointer underline underline-offset-2"
              >
                Change
              </button>
            </div>

            {/* Countdown Timer Display */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-300">
                Enter 6-Digit Passcode
              </span>
              <div
                data-testid="otp-countdown-timer"
                className={`flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                  secondsRemaining > 30
                    ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                    : secondsRemaining > 0
                    ? 'text-amber-400 bg-amber-950/40 border border-amber-800/40 animate-pulse'
                    : 'text-red-400 bg-red-950/40 border border-red-800/40'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>{secondsRemaining > 0 ? formatTime(secondsRemaining) : 'Expired'}</span>
              </div>
            </div>

            {/* OTP 6-Digit Input */}
            <div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  ref={otpInputRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[12px] text-2xl font-bold font-mono rounded-xl border border-slate-700/80 bg-slate-950/80 py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-600 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <p className="mt-1 text-center text-[11px] text-slate-400">
                Code expires in {expirySeconds} seconds ({Math.floor(expirySeconds / 60)} minutes).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || secondsRemaining <= 0}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verify & Access Root Console</span>
                </>
              )}
            </button>

            {/* Resend button */}
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || (!canResend && secondsRemaining > 0)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {canResend || secondsRemaining <= 0
                    ? 'Resend Passcode Now'
                    : `Resend Passcode (${formatTime(secondsRemaining)})`}
                </span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center text-[10px] text-slate-500 space-y-1">
          <p>Strictly isolated Platform Governance Environment.</p>
          <p>Zero password storage · Single-use cryptographically signed OTP.</p>
        </div>
      </div>
    </div>
  );
}
