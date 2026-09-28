'use server';

import { db } from '@/db';
import { storeProfile, invoices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  getSmtpConfig,
  verifySmtpConnection,
  sendTestEmail,
  sendInvoiceReceiptEmail,
  type SmtpConfig,
} from '@/lib/email';
import { getCurrentSession, requireManagerOrAdmin, requireOwnerOrSuperAdmin } from '@/lib/auth-utils';
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
 * Retrieves the current SMTP server settings with password masked for security.
 */
export async function getSmtpSettingsAction(): Promise<{
  success: boolean;
  settings?: SmtpSettingsResponse;
  error?: string;
}> {
  try {
    await requireManagerOrAdmin();
    const config = await getSmtpConfig();

    return {
      success: true,
      settings: {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        hasPass: Boolean(config.pass && config.pass.trim().length > 0),
      },
    };
  } catch (err: any) {
    console.error('[getSmtpSettingsAction] Failed:', err);
    return { success: false, error: err?.message || 'Failed to retrieve SMTP settings' };
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
    await requireOwnerOrSuperAdmin();

    const trimmedHost = data.host?.trim() || 'smtp.gmail.com';
    const port = data.port || 587;
    const secure = Boolean(data.secure);
    const trimmedUser = data.user?.trim() || 'msanthosh9943@gmail.com';
    const trimmedFromEmail = data.fromEmail?.trim() || trimmedUser;
    const trimmedFromName = data.fromName?.trim() || 'OptixOS Eyecare';

    const [existing] = await db.select().from(storeProfile).limit(1);

    const updateFields: Partial<typeof storeProfile.$inferInsert> = {
      smtpHost: trimmedHost,
      smtpPort: port,
      smtpSecure: secure,
      smtpUser: trimmedUser,
      smtpFromEmail: trimmedFromEmail,
      smtpFromName: trimmedFromName,
      updatedAt: new Date(),
    };

    // Only update pass if a new one is explicitly supplied and not just dots
    if (data.pass && data.pass.trim() && !data.pass.includes('•••')) {
      updateFields.smtpPass = encryptSecret(data.pass.trim());
    }

    if (existing) {
      await db.update(storeProfile).set(updateFields);
    } else {
      await db.insert(storeProfile).values({
        storeName: 'Santhosh Optical Center',
        phone: '+91 98765 43210',
        address: '123 Optical Plaza, MG Road, Bengaluru - 560001',
        ...updateFields,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[saveSmtpSettingsAction] Failed:', err);
    return { success: false, error: err?.message || 'Failed to save SMTP settings' };
  }
}

/**
 * Diagnostic test action: verifies connection and optionally sends a real test email.
 */
export async function testSmtpConnectionAction(targetEmail?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await requireManagerOrAdmin();

    const verification = await verifySmtpConnection();
    if (!verification.success) {
      return { success: false, message: verification.message };
    }

    if (targetEmail && targetEmail.trim().length > 0) {
      const sendRes = await sendTestEmail(targetEmail.trim());
      if (!sendRes.success) {
        return {
          success: false,
          message: `Connected to SMTP server, but failed to deliver test email: ${sendRes.error}`,
        };
      }
      return {
        success: true,
        message: `Successfully connected to ${verification.config.host} and sent test email to ${targetEmail.trim()}!`,
      };
    }

    return {
      success: true,
      message: verification.message,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'SMTP diagnostic test failed' };
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
    const session = await getCurrentSession();
    if (session.organizationId) {
      const [inv] = await db
        .select({ id: invoices.id, organizationId: invoices.organizationId })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!inv || inv.organizationId !== session.organizationId) {
        return { success: false, error: 'Unauthorized: Invoice not found or access denied' };
      }
    }

    const trimmed = recipientEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      return { success: false, error: 'A valid email address is required' };
    }

    const res = await sendInvoiceReceiptEmail(invoiceId, trimmed, originBaseUrl);
    return res;
  } catch (err: any) {
    console.error('[sendReceiptEmailAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to dispatch email receipt' };
  }
}
