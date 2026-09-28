'use server';

import { db } from '@/db';
import { storeProfile, invoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  verifySmtpConnection,
  sendEmail,
  sendTestEmail,
  sendInvoiceReceiptEmail,
} from '@/lib/email';
import { requireAuthSession, requireManagerOrAdmin, requireOwnerOrSuperAdmin } from '@/lib/auth-utils';
import { ensureOrgStoreProfile, findOrgStoreProfile } from '@/lib/store-profile';
import type { StoreProfile } from '@/db/schema';
import { buildCacheKey } from '@/lib/cache';
import { cacheDel } from '@/lib/redis';

const smtpSettingsSchema = z.object({
  host: z.string().trim().max(255).optional().default(''),
  port: z.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional().default(false),
  user: z.string().trim().max(255).optional().default(''),
  pass: z.string().max(255).optional(),
  fromEmail: z.string().trim().max(255).optional(),
  fromName: z.string().trim().max(255).optional(),
});
import { encryptSecret } from '@/lib/crypto-utils';

export interface SmtpSettingsResponse {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromEmail: string;
  fromName: string;
  hasPass: boolean;
}

/**
 * @description Extracts a safe error message from an unknown thrown value.
 * @param err - Caught value.
 * @param fallback - Message used when `err` is not an Error.
 * @returns Human-readable message.
 */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * @description Whether the tenant has its own complete SMTP credentials. Mirrors getSmtpConfig in
 * src/lib/email.ts: tenant SMTP is used only when BOTH user and password are set; otherwise sends
 * go through the platform default mail server (environment SMTP).
 * @param profile - The caller organization's store profile (or null when none exists).
 * @returns true when the tenant's own SMTP server is the one actually used for sending.
 */
function hasOwnTenantSmtp(profile: StoreProfile | null): boolean {
  return Boolean(profile?.smtpUser && profile?.smtpPass);
}

/**
 * @description Retrieves the caller organization's OWN SMTP settings with the password masked.
 * Never falls back to (or reveals) the platform environment SMTP: when the tenant has not
 * configured SMTP, neutral defaults are returned (host 'smtp.gmail.com', port 587, empty user /
 * from address, hasPass false).
 * @returns The tenant's SMTP settings, or an error.
 */
export async function getSmtpSettingsAction(): Promise<{
  success: boolean;
  settings?: SmtpSettingsResponse;
  error?: string;
}> {
  try {
    const session = await requireManagerOrAdmin();
    // SEC-004: read ONLY the caller organization's profile row (no platform env fallback).
    const profile = await findOrgStoreProfile(session.organizationId);
    const port = profile?.smtpPort || 587;

    return {
      success: true,
      settings: {
        host: profile?.smtpHost || 'smtp.gmail.com',
        port,
        secure: profile?.smtpSecure ?? port === 465,
        user: profile?.smtpUser || '',
        fromEmail: profile?.smtpFromEmail || '',
        fromName: profile?.smtpFromName || profile?.storeName || 'OptixOS Eyecare',
        hasPass: Boolean(profile?.smtpPass),
      },
    };
  } catch (err: unknown) {
    console.error('[getSmtpSettingsAction] Failed:', err);
    return { success: false, error: errorMessage(err, 'Failed to retrieve SMTP settings') };
  }
}

/**
 * Updates SMTP server configuration in store_profile.
 */
export async function saveSmtpSettingsAction(data: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireOwnerOrSuperAdmin();
    const parsed = smtpSettingsSchema.parse(data);

    const trimmedUser = parsed.user;
    const updateFields: Partial<typeof storeProfile.$inferInsert> = {
      smtpHost: parsed.host || 'smtp.gmail.com',
      smtpPort: parsed.port || 587,
      smtpSecure: Boolean(parsed.secure),
      smtpUser: trimmedUser || null,
      smtpFromEmail: parsed.fromEmail || trimmedUser || null,
      smtpFromName: parsed.fromName || 'OptixOS Eyecare',
      updatedAt: new Date(),
    };

    // Only update pass if a new one is explicitly supplied and not just the mask
    if (parsed.pass && parsed.pass.trim() && !parsed.pass.includes('•••')) {
      updateFields.smtpPass = encryptSecret(parsed.pass.trim());
    }

    // SEC-004: write ONLY the caller organization's profile row.
    const profile = await ensureOrgStoreProfile(session.organizationId, session.branchId || null);
    await db
      .update(storeProfile)
      .set(updateFields)
      .where(and(eq(storeProfile.id, profile.id), eq(storeProfile.organizationId, session.organizationId)));

    await cacheDel(buildCacheKey({ orgId: session.organizationId, namespace: 'settings', key: 'store_profile' }));

    return { success: true };
  } catch (err: unknown) {
    console.error('[saveSmtpSettingsAction] Failed:', err);
    return { success: false, error: errorMessage(err, 'Failed to save SMTP settings') };
  }
}

/**
 * @description Test email body used when the tenant has no own SMTP and the platform default mail
 * server sends. Unlike sendTestEmail's diagnostic body it contains no SMTP host / login details.
 * @returns Static HTML for the platform-default test email.
 */
function buildPlatformDefaultTestEmailHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
    <h1 style="margin: 0 0 12px; font-size: 20px;">OptixOS Email Test</h1>
    <p style="font-size: 14px; line-height: 1.5; margin: 0;">
      This test email was delivered using the platform default mail server. Configure your own SMTP
      settings in OptixOS to send receipts from your store's mailbox.
    </p>
    <p style="font-size: 12px; color: #475569; margin: 16px 0 0;">Sent ${new Date().toUTCString()}</p>
  </div>
</body></html>`;
}

/**
 * @description Diagnostic test action: verifies the SMTP connection that will actually be used for
 * the caller's organization and optionally sends a real test email. When the tenant has no own
 * SMTP (platform default mail server), messages never reveal the platform host, login or errors.
 * @param targetEmail - Optional recipient for a real test email.
 * @returns Success flag and a user-facing message.
 */
export async function testSmtpConnectionAction(targetEmail?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const session = await requireManagerOrAdmin();
    const recipient = typeof targetEmail === 'string' ? targetEmail.trim() : '';
    if (recipient && !z.string().email().max(255).safeParse(recipient).success) {
      return { success: false, message: 'Please enter a valid recipient email address.' };
    }

    const profile = await findOrgStoreProfile(session.organizationId);
    const usingTenantSmtp = hasOwnTenantSmtp(profile);

    const verification = await verifySmtpConnection(undefined, session.organizationId);
    if (!verification.success) {
      if (!usingTenantSmtp) {
        console.error('[testSmtpConnectionAction] Platform default mail server check failed:', verification.message);
        return {
          success: false,
          message: 'The platform default mail server is currently unavailable. Configure your own SMTP settings to send email.',
        };
      }
      return { success: false, message: verification.message };
    }

    if (recipient) {
      const sendRes = usingTenantSmtp
        ? await sendTestEmail(recipient, undefined, session.organizationId)
        : await sendEmail({
            to: recipient,
            subject: `OptixOS Test Email — ${new Date().toLocaleTimeString()}`,
            html: buildPlatformDefaultTestEmailHtml(),
            organizationId: session.organizationId,
          });

      if (!sendRes.success) {
        if (!usingTenantSmtp) {
          console.error('[testSmtpConnectionAction] Platform default test email failed:', sendRes.error);
          return {
            success: false,
            message: 'Connected using platform default mail server, but failed to deliver the test email.',
          };
        }
        return {
          success: false,
          message: `Connected to SMTP server, but failed to deliver test email: ${sendRes.error}`,
        };
      }
      return {
        success: true,
        message: usingTenantSmtp
          ? `Successfully connected to ${verification.config.host} and sent test email to ${recipient}!`
          : `Sent test email to ${recipient} using platform default mail server.`,
      };
    }

    return {
      success: true,
      message: usingTenantSmtp
        ? verification.message
        : 'Connection verified using platform default mail server.',
    };
  } catch (err: unknown) {
    return { success: false, message: errorMessage(err, 'SMTP diagnostic test failed') };
  }
}

/**
 * Sends digital optical receipt to customer email.
 */
export async function sendReceiptEmailAction(
  invoiceId: string,
  recipientEmail: string,
  originBaseUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only signed-in staff of the owning organization may email a receipt (prevents spam relay).
    const session = await requireAuthSession();
    const [inv] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, session.organizationId)))
      .limit(1);

    if (!inv) {
      return { success: false, error: 'Unauthorized: Invoice not found or access denied' };
    }

    const trimmed = recipientEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      return { success: false, error: 'A valid email address is required' };
    }

    const res = await sendInvoiceReceiptEmail(invoiceId, trimmed, originBaseUrl, session.organizationId);
    return res;
  } catch (err: unknown) {
    console.error('[sendReceiptEmailAction] Error:', err);
    return { success: false, error: errorMessage(err, 'Failed to dispatch email receipt') };
  }
}
