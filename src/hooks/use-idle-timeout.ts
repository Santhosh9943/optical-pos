'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

interface UseIdleTimeoutOptions {
  timeoutMs?: number; // Total idle duration before logout (default: 15 minutes)
  warningMs?: number; // Warning threshold before timeout (default: 60 seconds)
  enabled?: boolean;  // Whether the idle watcher is active
}

export function useIdleTimeout({
  timeoutMs = 15 * 60 * 1000, // 15 minutes
  warningMs = 60 * 1000,      // 60 seconds
  enabled = true,
}: UseIdleTimeoutOptions = {}) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(warningMs / 1000));

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    try {
      await authClient.signOut();
    } catch {
      // Ignore network errors during signout
    }
    toast.warning('Super Admin session expired due to 15 minutes of inactivity.');
    router.push('/super-admin/login?reason=idle_timeout');
  }, [clearAllTimers, router]);

  const startCountdown = useCallback(() => {
    setSecondsRemaining(Math.floor(warningMs / 1000));
    setShowWarning(true);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningMs]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(Math.floor(warningMs / 1000));

    const warningDelay = Math.max(0, timeoutMs - warningMs);

    // Schedule warning modal
    warningTimerRef.current = setTimeout(() => {
      startCountdown();
    }, warningDelay);

    // Schedule hard auto-logout
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningMs, clearAllTimers, startCountdown, handleLogout]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleUserActivity = () => {
      // Only reset timer if warning modal is not currently showing
      // (Once warning modal shows, user must explicitly click "Extend Session")
      if (!showWarning) {
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      clearAllTimers();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [enabled, showWarning, resetTimer, clearAllTimers]);

  return {
    showWarning,
    secondsRemaining,
    extendSession: resetTimer,
    logoutNow: handleLogout,
  };
}
