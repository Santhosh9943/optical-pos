import { test, expect } from '@playwright/test';

test.describe('Advanced Auth, 2FA, Forgot Password & Super Admin Isolation', () => {
  test('Forgot Password page renders and dispatches reset request', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    // Verify UI branding and form elements
    await expect(page.getByRole('heading', { name: /Reset Your Password/i })).toBeVisible();
    await expect(page.getByPlaceholder('name@practice.com')).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Send Password Reset Link/i });
    await expect(submitBtn).toBeVisible();

    // Fill valid email and submit
    await page.getByPlaceholder('name@practice.com').fill('doctor@optixos.com');
    await submitBtn.click();

    // Verify submission state
    await expect(page.getByRole('heading', { name: /Check Your Email/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/We sent password reset instructions to/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Resend/i })).toBeVisible();
  });

  test('Reset Password page renders with strength meter and token validation', async ({ page }) => {
    // Navigate with a simulated token
    await page.goto('/auth/reset-password?token=test-reset-token-12345');

    await expect(page.getByRole('heading', { name: /Set New Password/i })).toBeVisible();
    const newPassInput = page.getByPlaceholder(/At least 8 characters/i);
    const confirmPassInput = page.getByPlaceholder(/Re-enter password/i);
    await expect(newPassInput).toBeVisible();
    await expect(confirmPassInput).toBeVisible();

    // Type a weak password and verify strength meter
    await newPassInput.fill('abc');
    await expect(page.getByText(/Strength: Very Weak/i)).toBeVisible();

    // Type a strong password
    await newPassInput.fill('SuperSecret123!@#');
    await expect(page.getByText(/Strength: Very Strong/i)).toBeVisible();
  });

  test('Two-Factor Authentication challenge page renders TOTP, Email OTP, and Backup tabs', async ({ page }) => {
    await page.goto('/auth/2fa');

    await expect(page.getByRole('heading', { name: /2-Step Verification/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /App \(TOTP\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Email OTP/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Backup/i })).toBeVisible();

    // Switch to Email OTP tab
    await page.getByRole('button', { name: /Email OTP/i }).click();
    await expect(page.getByText(/We will dispatch a 6-digit one-time passcode/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Code to My Email/i })).toBeVisible();

    // Switch to Backup tab
    await page.getByRole('button', { name: /Backup/i }).click();
    await expect(page.getByText(/Enter one of your 10 emergency single-use backup recovery codes/i)).toBeVisible();
  });

  test('Super Admin Login gateway page renders with platform root OTP visual tokens', async ({ page }) => {
    await page.goto('/super-admin/login');

    await expect(page.getByRole('heading', { name: /OptixOS Root Gateway/i })).toBeVisible();
    await expect(page.getByPlaceholder('superadmin@domain.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate One-Time Passcode/i })).toBeVisible();
    await expect(page.getByText('Root Governance', { exact: true })).toBeVisible();
  });

  test('Settings view displays Account & Security tab with identity and 2FA options', async ({ page }) => {
    // Using E2E bypass headers
    await page.setExtraHTTPHeaders({ 'x-e2e-bypass-auth': 'true' });
    await page.context().addCookies([
      { name: 'x-e2e-bypass-auth', value: 'true', domain: 'localhost', path: '/' },
    ]);

    await page.goto('/admin/settings');

    // Click Account & Security tab
    const accountTabBtn = page.getByTestId('tab-account-security');
    await expect(accountTabBtn).toBeVisible();
    await accountTabBtn.click();

    // Verify sections and action buttons
    await expect(page.getByText(/My Identity & Authentication Providers/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Two-Step Verification \(2FA \/ MFA\)/i)).toBeVisible();
    await expect(page.getByText(/Danger Zone/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Setup Authenticator App/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Enable Email OTP/i })).toBeVisible();
  });

  test('Two-Factor enable endpoint handles passwordless payloads without VALIDATION_ERROR', async ({ request }) => {
    // When calling two-factor/enable with empty body, schema validation should pass (allowPasswordless: true)
    // rather than rejecting with [body.password] Invalid input: expected string, received undefined
    const response = await request.post('/api/auth/two-factor/enable', {
      data: {},
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const body = await response.json().catch(() => ({}));
    // Since no valid session is provided, Better Auth returns UNAUTHORIZED, not VALIDATION_ERROR
    expect(body.code).not.toBe('VALIDATION_ERROR');
    expect(body.message).not.toContain('[body.password]');
  });

  test('TOTP Setup: handles password retry, Enter key, persistent backup codes, and text file download', async ({ page }) => {
    // 1. Ensure test admin account exists (sign up if clean DB, or sign in)
    await page.goto('/auth/login');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.getByPlaceholder('Dr. Rajesh Sharma').fill('Admin Optix');
    const orgInput = page.getByTestId('input-signup-org-name');
    if (await orgInput.isVisible()) {
      await orgInput.fill('Admin Optix Practice');
    }
    await page.getByPlaceholder('admin@optixos.com').fill('admin@optix.com');
    await page.getByPlaceholder('••••••••').fill('AdminPass123!');
    await page.getByRole('button', { name: /Create Optical Practice/i }).click();

    // If account was already registered, switch to Sign In
    await page.waitForURL(/\/pos|\/admin/, { timeout: 8000 }).catch(async () => {
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.getByPlaceholder('admin@optixos.com').fill('admin@optix.com');
      await page.getByPlaceholder('••••••••').fill('AdminPass123!');
      await page.getByRole('button', { name: /Sign In to Workspace/i }).click();
      await page.waitForURL(/\/pos|\/admin/, { timeout: 15000 });
    });

    // 2. Navigate to settings -> Account & Security tab
    await page.goto('/admin/settings');
    const accountTabBtn = page.getByTestId('tab-account-security');
    await expect(accountTabBtn).toBeVisible();
    await accountTabBtn.click();

    // 3. Wait for account security status to load
    await expect(page.getByText('Password Configured')).toBeVisible({ timeout: 10000 });

    // 4. Click Setup Authenticator App
    const setupTotpBtn = page.getByRole('button', { name: /Setup Authenticator App/i });
    await expect(setupTotpBtn).toBeVisible({ timeout: 10000 });
    await expect(setupTotpBtn).toBeEnabled({ timeout: 10000 });
    await setupTotpBtn.click();

    // 5. Verify modal opens with password prompt
    await expect(page.getByRole('heading', { name: /Verify Identity for 2FA/i })).toBeVisible({ timeout: 5000 });
    const passwordInput = page.getByPlaceholder('Enter your current password');
    await expect(passwordInput).toBeVisible();

    // Test Bug 1: Enter WRONG password first
    await passwordInput.fill('WrongPassword123!');
    await page.getByRole('button', { name: /Verify & Set Up/i }).click();

    // Verify error notification appears and modal stays open
    await expect(page.getByText(/Invalid password|Failed to initiate/i)).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('heading', { name: /Verify Identity for 2FA/i })).toBeVisible();

    // Enter CORRECT password on retry
    await passwordInput.fill('AdminPass123!');
    await page.getByRole('button', { name: /Verify & Set Up/i }).click();

    // Modal closes and QR code interface appears (no TOTP_ALREADY_ENABLED error)
    await expect(page.getByRole('heading', { name: /Verify Identity for 2FA/i })).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Scan QR Code with Google Authenticator/i)).toBeVisible({ timeout: 10000 });

    // Test Bug 2: Pin input starts empty (no stale cached value)
    const pinInput = page.getByTestId('totp-pin-input');
    await expect(pinInput).toBeVisible();
    await expect(pinInput).toHaveValue('');

    // Route verifyTotp to succeed so we can test the confirmation, backup codes stage, and download
    await page.route('**/api/auth/two-factor/verify-totp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: true }),
      });
    });

    // Test Bug 3: Enter key triggers confirmation
    await pinInput.fill('123456');
    await pinInput.press('Enter');

    // Test Bug 4 (Main Bug): Backup codes appear and PERSIST (do NOT disappear after 1 second)
    const backupTitle = page.getByText(/Save Your 10 Backup Recovery Codes/i);
    await expect(backupTitle).toBeVisible({ timeout: 8000 });

    // Wait 2.5 seconds to guarantee they remain mounted and don't unmount upon account reload
    await page.waitForTimeout(2500);
    await expect(backupTitle).toBeVisible();
    await expect(page.getByTestId('download-backup-codes-btn')).toBeVisible();
    await expect(page.getByTestId('copy-backup-codes-btn')).toBeVisible();

    // Test Bug 5: Download backup codes as .txt file with proper username naming
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-backup-codes-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^optixos-backup-codes-.*\.txt$/);

    // Click "I Have Saved My Codes (Done)" to complete flow
    await page.getByTestId('done-backup-codes-btn').click();

    // Verify UI transitions to active protected state
    await expect(page.getByText(/Your account is protected/i)).toBeVisible({ timeout: 8000 });
    const disableBtn = page.getByRole('button', { name: /Disable Two-Factor Authentication/i });
    await expect(disableBtn).toBeVisible();

    // Clean up: Disable 2FA to keep admin account in clean state
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await disableBtn.click();

    // Fill disable password modal
    await expect(page.getByRole('heading', { name: /Disable Two-Factor Authentication/i })).toBeVisible({ timeout: 5000 });
    const disablePwdInput = page.getByPlaceholder('Enter your current password');
    await disablePwdInput.fill('AdminPass123!');
    await page.getByRole('button', { name: /Confirm Disable/i }).click();

    // Verify 2FA is back to disabled
    await expect(page.getByRole('button', { name: /Setup Authenticator App/i })).toBeVisible({ timeout: 8000 });
  });

  test('Super Admin: non-authenticated accounts are intercepted and redirected to isolated login', async ({ page }) => {
    // Navigate directly to super admin dashboard
    await page.goto('/super-admin/dashboard');

    // Middleware redirects unauthenticated requests to /super-admin/login
    await expect(page).toHaveURL(/\/super-admin\/login/);
    await expect(page.getByRole('heading', { name: /OptixOS Root Gateway/i })).toBeVisible();
  });
});
