import nodemailer from 'nodemailer';
import type { StoreProfile } from '@/db/schema';
import { findOrgStoreProfile } from '@/lib/store-profile';
import { getPublicReceiptAction } from '@/actions/receipt-actions';
import { decryptSecret, generateReceiptToken } from '@/lib/crypto-utils';

/** Escapes user-controlled text before interpolating it into email HTML. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

/**
 * @description Resolves the SMTP configuration for a send.
 * - With an `organizationId`, the tenant's own SMTP settings are used when fully configured
 *   (user + password); otherwise the platform SMTP from environment variables is used.
 * - Without an `organizationId` (system mail: password resets, OTPs, alerts) only the
 *   platform SMTP from environment variables is used — never another tenant's credentials.
 * @param organizationId - Trusted tenant id from the server-side session, if any.
 * @returns The resolved SMTP configuration (password decrypted).
 */
export async function getSmtpConfig(organizationId?: string | null): Promise<SmtpConfig> {
  let dbProfile: StoreProfile | null = null;
  if (organizationId) {
    try {
      const found = await findOrgStoreProfile(organizationId);
      dbProfile = found?.smtpUser && found?.smtpPass ? found : null;
    } catch (err) {
      console.warn('[getSmtpConfig] Could not load tenant SMTP settings, using platform SMTP:', err);
    }
  }

  const host = dbProfile?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = dbProfile?.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = dbProfile?.smtpSecure !== undefined && dbProfile?.smtpSecure !== null
    ? dbProfile.smtpSecure
    : process.env.SMTP_SECURE === 'true' || port === 465;

  const user = dbProfile?.smtpUser || process.env.SMTP_USER || '';
  const rawPass = dbProfile?.smtpPass || process.env.SMTP_PASS || '';
  const pass = rawPass.startsWith('enc:') ? decryptSecret(rawPass) : rawPass;
  const fromEmail = dbProfile?.smtpFromEmail || process.env.SMTP_FROM_EMAIL || user;
  const fromName = dbProfile?.smtpFromName || dbProfile?.storeName || process.env.SMTP_FROM_NAME || 'OptixOS Eyecare';

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
  };
}

/**
 * Creates a Nodemailer transporter instance using current SMTP configuration.
 */
export async function createEmailTransporter(
  overrideConfig?: Partial<SmtpConfig>,
  organizationId?: string | null
) {
  const config = { ...(await getSmtpConfig(organizationId)), ...(overrideConfig || {}) };

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    // Useful socket timeouts for serverless environments
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Verifies live connectivity with Gmail SMTP server.
 */
export async function verifySmtpConnection(
  overrideConfig?: Partial<SmtpConfig>,
  organizationId?: string | null
): Promise<{
  success: boolean;
  message: string;
  config: Omit<SmtpConfig, 'pass'> & { hasPass: boolean };
}> {
  const config = { ...(await getSmtpConfig(organizationId)), ...(overrideConfig || {}) };

  const safeConfig = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    hasPass: Boolean(config.pass && config.pass.trim().length > 0),
  };

  if (!config.pass || config.pass.trim().length === 0) {
    return {
      success: false,
      message: 'SMTP Password is missing. Please provide your 16-character Google App Password.',
      config: safeConfig,
    };
  }

  try {
    const transporter = await createEmailTransporter(config);
    await transporter.verify();

    return {
      success: true,
      message: `Successfully connected and authenticated with ${config.host}:${config.port} as ${config.user}`,
      config: safeConfig,
    };
  } catch (error: any) {
    console.error('[verifySmtpConnection] SMTP Verification failed:', error);
    const errorMsg = error?.message || 'Failed to verify SMTP credentials';
    return {
      success: false,
      message: errorMsg,
      config: safeConfig,
    };
  }
}

/**
 * Sends a generic transactional email.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  overrideConfig,
  organizationId,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  overrideConfig?: Partial<SmtpConfig>;
  /** Tenant whose SMTP settings should be used; omit for platform/system mail. */
  organizationId?: string | null;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = { ...(await getSmtpConfig(organizationId)), ...(overrideConfig || {}) };

    if (!config.pass || config.pass.trim().length === 0) {
      return {
        success: false,
        error: 'SMTP Password is not configured. Please input your 16-character Google App Password in Settings.',
      };
    }

    const transporter = await createEmailTransporter(config);

    const fromAddress = `"${config.fromName}" <${config.fromEmail}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[sendEmail] Failed to send email:', err);
    return {
      success: false,
      error: err?.message || 'An error occurred while sending email.',
    };
  }
}

/**
 * Dispatches a styled test email to verify credentials and connectivity.
 */
export async function sendTestEmail(
  targetEmail: string,
  overrideConfig?: Partial<SmtpConfig>,
  organizationId?: string | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = { ...(await getSmtpConfig(organizationId)), ...(overrideConfig || {}) };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 28px 24px; text-align: center; }
          .title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; }
          .subtitle { margin-top: 6px; font-size: 13px; opacity: 0.9; }
          .content { padding: 24px; }
          .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          .info-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
          .info-table td:first-child { color: #64748b; font-weight: 500; width: 40%; }
          .info-table td:last-child { color: #0f172a; font-weight: 600; font-family: monospace; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">OptixOS Email Engine</h1>
            <p class="subtitle">Gmail SMTP Gateway Diagnostic Test</p>
          </div>
          <div class="content">
            <div class="badge">Connection Verified ✓</div>
            <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              Hello! This is a test email sent from <strong>${config.fromName}</strong> to verify that your Gmail SMTP server configuration is functioning properly.
            </p>
            
            <table class="info-table">
              <tr>
                <td>SMTP Host</td>
                <td>${config.host}</td>
              </tr>
              <tr>
                <td>Port & Security</td>
                <td>${config.port} (${config.secure ? 'SSL' : 'STARTTLS/TLS'})</td>
              </tr>
              <tr>
                <td>Authenticated User</td>
                <td>${config.user}</td>
              </tr>
              <tr>
                <td>Sender Address</td>
                <td>${config.fromEmail}</td>
              </tr>
              <tr>
                <td>Timestamp</td>
                <td>${new Date().toUTCString()}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            OptixOS Practice Management & Point of Sale System
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: targetEmail,
    subject: `OptixOS SMTP Test Delivery — ${new Date().toLocaleTimeString()}`,
    html,
    overrideConfig: config,
    organizationId,
  });
}

/**
 * Dispatches an optical digital tax invoice & refraction receipt email to a customer.
 */
export async function sendInvoiceReceiptEmail(
  invoiceId: string,
  recipientEmail: string,
  originBaseUrl?: string,
  organizationId?: string | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await getPublicReceiptAction(invoiceId);
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Invoice not found' };
    }

    const data = res.data;
    const baseUrl = originBaseUrl || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    // The public receipt page requires an HMAC access token — without it the customer's link fails.
    const receiptToken = generateReceiptToken(data.id, new Date(data.createdAt));
    const digitalReceiptUrl = `${baseUrl}/receipt/${data.id}?token=${encodeURIComponent(receiptToken)}`;

    const itemsHtml = data.items
      .map(
        (it) => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
              <strong>${escapeHtml(it.description)}</strong>
              ${it.lensType ? `<br><span style="font-size: 11px; color: #64748b;">${escapeHtml(it.lensType)} · ${escapeHtml(it.coating || 'Standard')}</span>` : ''}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">${it.quantity}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right;">₹${it.lineTotal}</td>
          </tr>
        `
      )
      .join('');

    const rx = data.prescription;
    const rxHtml = rx
      ? `
        <div style="margin-top: 20px; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Prescription Refraction Matrix</div>
          <table style="width: 100%; font-size: 12px; text-align: center; border-collapse: collapse;">
            <tr style="background: #e2e8f0; font-weight: 600;">
              <th style="padding: 4px;">Eye</th>
              <th style="padding: 4px;">SPH</th>
              <th style="padding: 4px;">CYL</th>
              <th style="padding: 4px;">AXIS</th>
              <th style="padding: 4px;">ADD</th>
              <th style="padding: 4px;">PD</th>
            </tr>
            <tr>
              <td style="padding: 4px; font-weight: 600;">OD (Right)</td>
              <td style="padding: 4px;">${rx.odSphere ?? '—'}</td>
              <td style="padding: 4px;">${rx.odCylinder ?? '—'}</td>
              <td style="padding: 4px;">${rx.odAxis ? `${rx.odAxis}°` : '—'}</td>
              <td style="padding: 4px;">${rx.odAdd ?? '—'}</td>
              <td style="padding: 4px;">${rx.odPd ? `${rx.odPd}mm` : '—'}</td>
            </tr>
            <tr>
              <td style="padding: 4px; font-weight: 600;">OS (Left)</td>
              <td style="padding: 4px;">${rx.osSphere ?? '—'}</td>
              <td style="padding: 4px;">${rx.osCylinder ?? '—'}</td>
              <td style="padding: 4px;">${rx.osAxis ? `${rx.osAxis}°` : '—'}</td>
              <td style="padding: 4px;">${rx.osAdd ?? '—'}</td>
              <td style="padding: 4px;">${rx.osPd ? `${rx.osPd}mm` : '—'}</td>
            </tr>
          </table>
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #0f172a; color: white; padding: 24px; text-align: left; }
            .store-name { font-size: 20px; font-weight: 800; margin: 0; }
            .inv-meta { font-size: 13px; color: #94a3b8; margin-top: 4px; }
            .content { padding: 24px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .items-table th { padding: 8px 12px; background: #f8fafc; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            .btn-cta { display: inline-block; background: #2563eb; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 24px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="store-name">${data.organization.name}</div>
              <div class="inv-meta">Invoice #${data.invoiceNumber} · ${new Date(data.createdAt).toLocaleDateString()}</div>
            </div>

            <div class="content">
              <p style="font-size: 15px; margin: 0 0 16px;">
                Dear <strong>${data.customer.fullName}</strong>,<br>
                Thank you for your visit. Here is the optical tax invoice receipt for your eyewear order.
              </p>

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #0f172a; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Subtotal:</span>
                  <span style="font-weight: 600;">₹${data.subtotal}</span>
                </div>
                ${parseFloat(data.discountAmount) > 0 ? `<div style="display: flex; justify-content: space-between; color: #16a34a; margin-bottom: 4px;"><span>Discount:</span><span>−₹${data.discountAmount}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b; font-size: 13px;">
                  <span>GST Tax:</span>
                  <span>₹${data.totalTax}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; margin-top: 8px;">
                  <span>Grand Total:</span>
                  <span>₹${data.grandTotal}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
                  <span>Advance Paid:</span>
                  <span style="font-weight: 600; color: #16a34a;">₹${data.advancePaid}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #dc2626; margin-top: 4px;">
                  <span>Balance Due:</span>
                  <span>₹${data.balanceDue}</span>
                </div>
              </div>

              ${rxHtml}

              <div style="text-align: center;">
                <a href="${digitalReceiptUrl}" class="btn-cta" target="_blank">
                  View Full Digital Tax Receipt & Lab Status
                </a>
              </div>
            </div>

            <div class="footer">
              Thank you for trusting ${data.organization.name} with your vision care!
            </div>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: recipientEmail,
      subject: `Your Optical Eyewear Receipt — ${data.invoiceNumber} (${data.organization.name})`,
      html,
      organizationId,
    });
  } catch (err: any) {
    console.error('[sendInvoiceReceiptEmail] Error:', err);
    return { success: false, error: err?.message || 'Failed to dispatch invoice receipt' };
  }
}

/**
 * Queue-ready asynchronous email dispatcher.
 * Executes detached so UI requests never block waiting on SMTP socket handshakes.
 */
export function dispatchAsyncEmail(fn: () => Promise<any>): void {
  // Fire-and-forget execution with detached error catching
  Promise.resolve().then(async () => {
    try {
      await fn();
    } catch (err) {
      console.warn('[dispatchAsyncEmail] Detached background email error:', err);
    }
  });
}

/**
 * Common OptixOS security email wrapper styling.
 */
function getSecurityEmailWrapper(title: string, badge: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(59, 130, 246, 0.4); margin-bottom: 8px; }
          .title { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: #ffffff; }
          .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
          .otp-badge { display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 14px 28px; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; color: #0f172a; margin: 20px 0; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin: 20px 0; text-align: center; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
          .footer { background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 16px 0; font-size: 13px; }
          .warning { color: #dc2626; font-size: 12px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">${badge}</div>
            <h1 class="title">${title}</h1>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            OptixOS Optical POS & Practice Management Platform<br>
            If you did not make this request, please contact your store administrator immediately.
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Dispatches a password reset link and token.
 */
export async function sendPasswordResetEmail(toEmail: string, resetUrl: string, token: string) {
  const content = `
    <p>Hello,</p>
    <p>We received a request to reset your OptixOS account password. Click the button below to establish a new password:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
    </div>
    <div class="info-box">
      <strong>Security Token:</strong> <code style="font-family: monospace; font-size: 13px; color: #2563eb;">${token}</code><br>
      <small style="color: #64748b;">This reset link and token will expire in <strong>15 minutes</strong>.</small>
    </div>
    <p class="warning">If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: 'Reset Your OptixOS Password',
    html: getSecurityEmailWrapper('Password Reset Request', 'Security Alert', content),
  });
}

/**
 * Dispatches a 6-digit Two-Factor Authentication OTP code.
 */
export async function sendTwoFactorOtpEmail(toEmail: string, otpCode: string) {
  const content = `
    <p>Hello,</p>
    <p>Here is your OptixOS 2-Step Verification Code:</p>
    <div style="text-align: center;">
      <div class="otp-badge">${otpCode}</div>
    </div>
    <div class="info-box">
      This code is valid for <strong>10 minutes</strong> and can only be used once. Never share this code with anyone.
    </div>
    <p class="warning">If you did not attempt to sign in to OptixOS, your credentials may be compromised. Please reset your password immediately.</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Your OptixOS Verification Code: ${otpCode}`,
    html: getSecurityEmailWrapper('2-Step Verification Code', 'Authentication', content),
  });
}

/**
 * Dispatches a login security alert on new sign-ins.
 */
export async function sendLoginSecurityAlertEmail(
  toEmail: string,
  details?: { ip?: string; userAgent?: string; time?: string }
) {
  const time = details?.time || new Date().toUTCString();
  const ip = details?.ip || 'Unknown IP';
  const ua = details?.userAgent || 'Unknown Device / Browser';

  const content = `
    <p>Hello,</p>
    <p>Your OptixOS account was just accessed from a new session:</p>
    <div class="info-box">
      <div><strong>Date & Time:</strong> ${time}</div>
      <div style="margin-top: 4px;"><strong>IP Address:</strong> ${ip}</div>
      <div style="margin-top: 4px;"><strong>Device & Browser:</strong> ${ua}</div>
    </div>
    <p>If this was you, you can disregard this alert.</p>
    <p class="warning">If you do not recognize this activity, please immediately change your password and enable Two-Factor Authentication in Store Settings.</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: 'Security Alert: New Sign-In to Your OptixOS Account',
    html: getSecurityEmailWrapper('New Sign-In Detected', 'Security Notice', content),
  });
}

/**
 * Dispatches a welcome notification on new account registration.
 */
export async function sendWelcomeEmail(toEmail: string, name?: string) {
  const displayName = name ? ` ${name}` : '';
  const content = `
    <p>Hello${displayName},</p>
    <p>Welcome to <strong>OptixOS</strong> — the enterprise-grade optical point-of-sale and clinical practice management cloud!</p>
    <p>Your account is ready. You can now:</p>
    <ul style="color: #475569; padding-left: 20px;">
      <li>Manage clinical refraction matrices and patient spectacle histories</li>
      <li>Perform lightning-fast optical billing with automated Indian GST calculation</li>
      <li>Track optical lab orders on our 4-column workshop Kanban</li>
      <li>Dispatch real-time WhatsApp & email digital receipts to your clients</li>
    </ul>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/pos/new-bill" class="btn" target="_blank">Launch Optical POS Counter</a>
    </div>
    <p>Thank you for choosing OptixOS for your optical retail operations!</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: 'Welcome to OptixOS Optical Practice Management!',
    html: getSecurityEmailWrapper('Welcome to OptixOS', 'Account Created', content),
  });
}

/**
 * Dispatches a confirmation email when password is set, changed, or reset.
 */
export async function sendPasswordChangedEmail(toEmail: string, actionType: 'reset' | 'set' | 'change' = 'change') {
  const actionText = actionType === 'set' ? 'established' : actionType === 'reset' ? 'reset' : 'changed';
  const content = `
    <p>Hello,</p>
    <p>This is a confirmation that the password for your OptixOS account was successfully <strong>${actionText}</strong> on ${new Date().toUTCString()}.</p>
    <div class="info-box">
      You can now use your email and new password to log in to all OptixOS terminals and admin consoles.
    </div>
    <p class="warning">If you did not perform this change, your account has been compromised. Please contact your organization administrator immediately.</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `OptixOS Security Notice: Password Successfully ${actionType === 'set' ? 'Set' : 'Updated'}`,
    html: getSecurityEmailWrapper('Password Updated', 'Security Notice', content),
  });
}

/**
 * Dispatches a confirmation email when 2FA is turned on or off.
 */
export async function sendTwoFactorStatusAlertEmail(toEmail: string, enabled: boolean, method: 'totp' | 'otp' = 'totp') {
  const methodLabel = method === 'totp' ? 'Authenticator App (TOTP)' : 'Email OTP';
  const statusText = enabled ? `enabled using ${methodLabel}` : 'disabled';

  const content = `
    <p>Hello,</p>
    <p>Two-Factor Authentication (2FA) was just <strong>${statusText}</strong> on your OptixOS account.</p>
    <div class="info-box">
      ${enabled
        ? `Your account is now protected with multi-factor verification. Every sign-in will require a 6-digit verification code.`
        : `<span style="color: #dc2626;">Your account is no longer protected by Two-Factor Authentication. We strongly recommend keeping 2FA enabled for enterprise retail security.</span>`}
    </div>
    <p class="warning">If you did not make this change, please sign in and review your active sessions immediately.</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `OptixOS Security Notice: 2FA ${enabled ? 'Enabled' : 'Disabled'}`,
    html: getSecurityEmailWrapper(`2FA ${enabled ? 'Enabled' : 'Disabled'}`, 'Account Security', content),
  });
}

/**
 * Dispatches an isolated Super Admin One-Time Password (OTP) passcode.
 */
export async function sendSuperAdminOtpEmail(toEmail: string, otpCode: string, expirySeconds: number) {
  const expiryMinutes = Math.floor(expirySeconds / 60);
  const expiryRemainderSec = expirySeconds % 60;
  const expiryText = expiryMinutes > 0 && expiryRemainderSec === 0
    ? `${expiryMinutes} minute${expiryMinutes > 1 ? 's' : ''}`
    : `${expirySeconds} seconds`;

  const content = `
    <p>Greetings Super Administrator,</p>
    <p>An authentication attempt was initiated for the <strong>OptixOS Platform Super Admin Portal</strong>. Your isolated one-time access passcode is:</p>
    <div style="text-align: center;">
      <div class="otp-badge" style="letter-spacing: 8px; font-size: 34px; color: #1e3a8a; border-color: #3b82f6; background: #eff6ff;">${otpCode}</div>
    </div>
    <div class="info-box">
      <strong>CRITICAL SECURITY NOTICE:</strong> This single-use OTP is valid for exactly <strong>${expiryText}</strong> (${expirySeconds} seconds). It will expire automatically.
    </div>
    <p class="warning">If you did not initiate this login, unauthorized root access may have been attempted. All access attempts are permanently audited with IP and device metadata.</p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `OptixOS Super Admin Passcode: ${otpCode} (Expires in ${expiryText})`,
    html: getSecurityEmailWrapper('Platform Super Admin Access Passcode', 'SUPER ADMIN SECURITY', content),
  });
}


