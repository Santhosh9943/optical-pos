'use server';

import { db } from '@/db';
import {
  user as userTable,
  account as accountTable,
  session as sessionTable,
  twoFactor as twoFactorTable,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/auth-utils';
import {
  dispatchAsyncEmail,
  sendPasswordChangedEmail,
  sendTwoFactorStatusAlertEmail,
} from '@/lib/email';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/ratelimit';

export interface UserAccountStatus {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  hasPassword: boolean;
  hasGoogleLinked: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp' | 'otp';
}

/**
 * Retrieves the current user's profile and security status.
 */
export async function getUserAccountStatusAction(): Promise<{
  success: boolean;
  account?: UserAccountStatus;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const [userRecord] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Check account records for credentials vs google
    const accounts = await db
      .select({
        providerId: accountTable.providerId,
        hasPassword: accountTable.password,
      })
      .from(accountTable)
      .where(eq(accountTable.userId, session.user.id));

    const hasGoogle = accounts.some((a) => a.providerId === 'google');
    const credentialAccount = accounts.find((a) => a.providerId === 'credential');
    const hasPassword = !!(credentialAccount?.hasPassword && credentialAccount.hasPassword.length > 0);

    return {
      success: true,
      account: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role || 'user',
        image: userRecord.image,
        hasPassword,
        hasGoogleLinked: hasGoogle,
        twoFactorEnabled: !!userRecord.twoFactorEnabled,
        twoFactorMethod: (userRecord.twoFactorMethod as 'totp' | 'otp') || 'totp',
      },
    };
  } catch (err: any) {
    console.error('[getUserAccountStatusAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to load account status' };
  }
}

/**
 * Allows Google OAuth users (without a password) to set an account password.
 */
export async function setUserPasswordAction(newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id || !session.user?.email) {
      return { success: false, error: 'Unauthorized' };
    }

    const rateLimit = await checkRateLimit(`pwd_set:${session.user.id}`, 5, 300);
    if (!rateLimit.success) {
      return { success: false, error: 'Too many password attempts. Please wait 5 minutes.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    const reqHeaders = await headers();

    // Use Better Auth's setPassword endpoint
    await auth.api.setPassword({
      body: {
        newPassword,
      },
      headers: reqHeaders,
    });

    const userEmail = session.user.email;
    dispatchAsyncEmail(() => sendPasswordChangedEmail(userEmail, 'set'));

    return { success: true };
  } catch (err: any) {
    console.error('[setUserPasswordAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to set password' };
  }
}

/**
 * Updates the user's preferred 2FA method in the database ('totp' | 'otp').
 */
export async function updateTwoFactorMethodAction(method: 'totp' | 'otp'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await db
      .update(userTable)
      .set({
        twoFactorEnabled: true,
        twoFactorMethod: method,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, session.user.id));

    return { success: true };
  } catch (err: any) {
    console.error('[updateTwoFactorMethodAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to update 2FA method' };
  }
}

/**
 * Toggles Email OTP 2FA on or off.
 */
export async function toggleEmailOtpTwoFactorAction(enabled: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id || !session.user?.email) {
      return { success: false, error: 'Unauthorized' };
    }

    await db
      .update(userTable)
      .set({
        twoFactorEnabled: enabled,
        twoFactorMethod: 'otp',
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, session.user.id));

    if (!enabled) {
      await db.delete(twoFactorTable).where(eq(twoFactorTable.userId, session.user.id));
    }

    const userEmail = session.user.email;
    dispatchAsyncEmail(() => sendTwoFactorStatusAlertEmail(userEmail, enabled, 'otp'));

    return { success: true };
  } catch (err: any) {
    console.error('[toggleEmailOtpTwoFactorAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to update Email OTP status' };
  }
}

/**
 * Fully resets/disables Two-Factor Authentication records for the current user.
 */
export async function resetTwoFactorAction(password?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id || !session.user?.email) {
      return { success: false, error: 'Unauthorized' };
    }

    const rateLimit = await checkRateLimit(`2fa_reset:${session.user.id}`, 5, 300);
    if (!rateLimit.success) {
      return { success: false, error: 'Too many attempts. Please try again later.' };
    }

    // Verify password if user has credential account
    const [credentialAccount] = await db
      .select({ password: accountTable.password })
      .from(accountTable)
      .where(and(eq(accountTable.userId, session.user.id), eq(accountTable.providerId, 'credential')))
      .limit(1);

    if (credentialAccount?.password) {
      if (!password) {
        return { success: false, error: 'Current password is required to disable Two-Factor Authentication' };
      }
      const reqHeaders = await headers();
      try {
        const verifyRes = await auth.api.signInEmail({
          body: { email: session.user.email, password },
          headers: reqHeaders,
        });
        if (!verifyRes) {
          return { success: false, error: 'Incorrect password' };
        }
      } catch {
        return { success: false, error: 'Incorrect password' };
      }
    }

    await db.delete(twoFactorTable).where(eq(twoFactorTable.userId, session.user.id));
    await db
      .update(userTable)
      .set({
        twoFactorEnabled: false,
        twoFactorMethod: 'totp',
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, session.user.id));

    return { success: true };
  } catch (err: any) {
    console.error('[resetTwoFactorAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to reset Two-Factor records' };
  }
}

/**
 * Deletes the logged-in user's account with security verification.
 */
export async function deleteUserAccountAction(params: {
  password?: string;
  confirmationPhrase?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session.user?.id || !session.user?.email) {
      return { success: false, error: 'Unauthorized' };
    }

    const accounts = await db
      .select()
      .from(accountTable)
      .where(eq(accountTable.userId, session.user.id));

    const credentialAccount = accounts.find((a) => a.providerId === 'credential');
    const hasPassword = !!(credentialAccount?.password && credentialAccount.password.length > 0);

    const reqHeaders = await headers();

    if (hasPassword) {
      if (!params.password) {
        return { success: false, error: 'Current password is required to delete your account' };
      }

      await auth.api.deleteUser({
        body: {
          password: params.password,
        },
        headers: reqHeaders,
      });
    } else {
      // Passwordless Google user requires explicit phrase confirmation
      if (params.confirmationPhrase !== 'DELETE MY ACCOUNT') {
        return { success: false, error: 'Please enter "DELETE MY ACCOUNT" exactly to confirm' };
      }

      // Delete all sessions and user records directly
      await db.delete(sessionTable).where(eq(sessionTable.userId, session.user.id));
      await db.delete(accountTable).where(eq(accountTable.userId, session.user.id));
      await db.delete(twoFactorTable).where(eq(twoFactorTable.userId, session.user.id));
      await db.delete(userTable).where(eq(userTable.id, session.user.id));
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteUserAccountAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to delete account' };
  }
}
