'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { superAdminOtps } from '@/db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { sendSuperAdminOtpEmail, dispatchAsyncEmail } from '@/lib/email';

import {
  SUPER_ADMIN_SESSION_COOKIE,
  isEmailInSuperAdminAllowlist,
  hashOtp,
  createSessionToken,
  verifySessionToken,
  getSuperAdminSessionExpirySeconds,
} from '@/lib/super-admin-session';

/**
 * Returns the configured OTP expiry duration and session lifetime in seconds from environment variables.
 */
export async function getSuperAdminOtpConfigAction(): Promise<{ expirySeconds: number; sessionExpirySeconds: number }> {
  const raw = process.env.SUPER_ADMIN_OTP_EXPIRY_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : 180;
  const expirySeconds = isNaN(parsed) || parsed <= 0 ? 180 : parsed;
  return {
    expirySeconds,
    sessionExpirySeconds: getSuperAdminSessionExpirySeconds(),
  };
}

/**
 * Server Action: Requests a single-use One-Time Password (OTP) for Super Admin login.
 * Validates allowlist, records cryptographically hashed code, dispatches email & prints to console.
 */
export async function requestSuperAdminOtpAction(
  rawEmail: string
): Promise<{ success: boolean; expirySeconds?: number; error?: string }> {
  try {
    const normalizedEmail = (rawEmail || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Check allowlist
    if (!isEmailInSuperAdminAllowlist(normalizedEmail)) {
      return {
        success: false,
        error:
          'Access Denied: This email address is not authorized for Platform Super Administration.',
      };
    }

    const { expirySeconds } = await getSuperAdminOtpConfigAction();

    // Check for rapid repeated requests within 10 seconds to prevent spamming
    const [recent] = await db
      .select({ createdAt: superAdminOtps.createdAt })
      .from(superAdminOtps)
      .where(
        and(
          eq(superAdminOtps.email, normalizedEmail),
          isNull(superAdminOtps.consumedAt)
        )
      )
      .orderBy(desc(superAdminOtps.createdAt))
      .limit(1);

    if (recent && process.env.NODE_ENV === 'production') {
      const elapsedMs = Date.now() - new Date(recent.createdAt).getTime();
      if (elapsedMs < 10000) {
        const waitSec = Math.ceil((10000 - elapsedMs) / 1000);
        return {
          success: false,
          error: `Please wait ${waitSec} second(s) before requesting another code.`,
        };
      }
    }

    // Generate 6-digit cryptographically secure OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // Invalidate any existing unconsumed OTPs for this email
    await db
      .update(superAdminOtps)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(superAdminOtps.email, normalizedEmail),
          isNull(superAdminOtps.consumedAt)
        )
      );

    // Insert new OTP record
    await db.insert(superAdminOtps).values({
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
    });

    // Console broadcast for immediate local developer verification
    console.log('\n============================================================');
    console.log('🔑 [OPTIXOS PLATFORM SUPER ADMIN OTP GATEWAY]');
    console.log(`👤 Target Email:    ${normalizedEmail}`);
    console.log(`🔢 One-Time Code:   ${otp}`);
    console.log(`⏱️  Lifetime:       ${expirySeconds} seconds (Expires: ${expiresAt.toLocaleTimeString()})`);
    console.log('============================================================\n');

    // Dispatch transactional email asynchronously
    dispatchAsyncEmail(() =>
      sendSuperAdminOtpEmail(normalizedEmail, otp, expirySeconds)
    );

    return {
      success: true,
      expirySeconds,
    };
  } catch (err: any) {
    console.error('[requestSuperAdminOtpAction] Error:', err);
    return {
      success: false,
      error: 'An internal error occurred while generating your access passcode.',
    };
  }
}

/**
 * Server Action: Verifies the provided OTP, enforces expiration & attempt limits,
 * and sets the isolated HTTP-only Super Admin session cookie.
 */
export async function verifySuperAdminOtpAction(
  rawEmail: string,
  rawOtp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = (rawEmail || '').trim().toLowerCase();
    const cleanOtp = (rawOtp || '').trim().replace(/\D/g, '');

    if (!normalizedEmail || !cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter a complete 6-digit passcode.' };
    }

    // Double check allowlist
    if (!isEmailInSuperAdminAllowlist(normalizedEmail)) {
      return { success: false, error: 'Unauthorized email address.' };
    }

    // Fetch the latest unconsumed OTP record
    const [record] = await db
      .select()
      .from(superAdminOtps)
      .where(
        and(
          eq(superAdminOtps.email, normalizedEmail),
          isNull(superAdminOtps.consumedAt)
        )
      )
      .orderBy(desc(superAdminOtps.createdAt))
      .limit(1);

    if (!record) {
      return {
        success: false,
        error: 'No active passcode request found. Please request a new code.',
      };
    }

    // Check expiration
    if (new Date() > new Date(record.expiresAt)) {
      // Mark consumed so it can't be reused
      await db
        .update(superAdminOtps)
        .set({ consumedAt: new Date() })
        .where(eq(superAdminOtps.id, record.id));

      return {
        success: false,
        error: 'Passcode has expired. Please request a new access code.',
      };
    }

    // Check attempts
    if (record.attempts >= record.maxAttempts) {
      // Consume record due to brute-force lockout
      await db
        .update(superAdminOtps)
        .set({ consumedAt: new Date() })
        .where(eq(superAdminOtps.id, record.id));

      return {
        success: false,
        error:
          'Maximum verification attempts exceeded. Passcode invalidated. Please request a new code.',
      };
    }

    // Timing-safe comparison of OTP hashes
    const submittedHash = await hashOtp(cleanOtp);
    const submittedBuf = Buffer.from(submittedHash, 'hex');
    const storedBuf = Buffer.from(record.otpHash, 'hex');

    const isHmacMatch =
      submittedBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(submittedBuf, storedBuf);

    // Development & E2E deterministic test code in non-production
    const isTestMatch = process.env.NODE_ENV !== 'production' && cleanOtp === '994321';
    const isMatch = isHmacMatch || isTestMatch;

    if (!isMatch) {
      const nextAttempts = record.attempts + 1;
      const remaining = record.maxAttempts - nextAttempts;

      await db
        .update(superAdminOtps)
        .set({ attempts: nextAttempts })
        .where(eq(superAdminOtps.id, record.id));

      return {
        success: false,
        error:
          remaining > 0
            ? `Incorrect passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }

    // Consume OTP on successful verification
    await db
      .update(superAdminOtps)
      .set({ consumedAt: new Date() })
      .where(eq(superAdminOtps.id, record.id));

    // Create session token and issue HTTP-only cookie
    const token = await createSessionToken(normalizedEmail);
    const sessionExpirySeconds = getSuperAdminSessionExpirySeconds();
    const cookieStore = await cookies();
    cookieStore.set(SUPER_ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionExpirySeconds,
    });

    return { success: true };
  } catch (err: any) {
    console.error('[verifySuperAdminOtpAction] Error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred during verification. Please try again.',
    };
  }
}

/**
 * Server Action: Validates the active Super Admin session from the cookie.
 */
export async function getSuperAdminSessionAction(): Promise<{
  isAuthenticated: boolean;
  user?: { email: string; role: string; name: string };
}> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);

    if (!tokenCookie?.value) {
      return { isAuthenticated: false };
    }

    const payload = await verifySessionToken(tokenCookie.value);
    if (!payload) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      user: {
        email: payload.email,
        role: 'super_admin',
        name: 'Platform Super Admin',
      },
    };
  } catch {
    return { isAuthenticated: false };
  }
}

/**
 * Server Action: Terminate Super Admin session and remove the session cookie.
 */
export async function superAdminSignOutAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SUPER_ADMIN_SESSION_COOKIE);
    return { success: true };
  } catch {
    return { success: true };
  }
}
