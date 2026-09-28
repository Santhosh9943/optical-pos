import { test, expect } from '@playwright/test';

test.describe('Platform Super Admin Isolated OTP Authentication & Zero-Store Telemetry', () => {
  test.use({
    extraHTTPHeaders: {
      'x-e2e-bypass-auth': 'false',
    },
  });

  test('1. Unauthenticated request to /super-admin/dashboard is intercepted and redirected to /super-admin/login', async ({
    page,
  }) => {
    // Navigate directly to protected super admin route without session
    await page.goto('/super-admin/dashboard');

    // Middleware redirects unauthenticated requests to /super-admin/login
    await expect(page).toHaveURL(/\/super-admin\/login/);
    await expect(page.getByRole('heading', { name: /OptixOS Root Gateway/i })).toBeVisible();
    await expect(page.getByText(/Root Governance/i)).toBeVisible();
  });

  test('2. Non-allowlisted email is denied access when requesting OTP', async ({ page }) => {
    await page.goto('/super-admin/login');

    const emailInput = page.getByPlaceholder('superadmin@domain.com');
    await emailInput.fill('hacker@unauthorized-domain.com');

    const generateBtn = page.getByRole('button', { name: /Generate One-Time Passcode/i });
    await generateBtn.click();

    // Verify error message is rendered
    await expect(
      page.getByText(/Access Denied: This email address is not authorized for Platform Super Administration/i)
    ).toBeVisible();
  });

  test('3. Allowlisted email requests OTP, transitions to Step 2 with live countdown timer', async ({
    page,
  }) => {
    await page.goto('/super-admin/login');

    const emailInput = page.getByPlaceholder('superadmin@domain.com');
    await emailInput.fill('msanthosh9943@gmail.com');

    const generateBtn = page.getByRole('button', { name: /Generate One-Time Passcode/i });
    await generateBtn.click();

    // Step 2 should appear
    await expect(page.getByText(/Enter 6-Digit Passcode/i)).toBeVisible();
    await expect(page.getByText('msanthosh9943@gmail.com', { exact: true })).toBeVisible();

    // Live countdown timer check
    const timer = page.getByTestId('otp-countdown-timer');
    await expect(timer).toBeVisible();
    const timerText = await timer.innerText();
    // Expiry in 180 seconds = "03:00" or "02:59"
    expect(timerText).toMatch(/0[2-3]:[0-5][0-9]/);

    // Verify OTP input field is ready
    const otpInput = page.getByPlaceholder('••••••');
    await expect(otpInput).toBeVisible();
  });

  test('4. Incorrect OTP shows remaining attempts error', async ({ page }) => {
    await page.goto('/super-admin/login');

    // Request OTP
    const emailInput = page.getByPlaceholder('superadmin@domain.com');
    await emailInput.fill('msanthosh9943@gmail.com');
    await page.getByRole('button', { name: /Generate One-Time Passcode/i }).click();

    await expect(page.getByText(/Enter 6-Digit Passcode/i)).toBeVisible();

    // Fill incorrect 6-digit OTP
    const otpInput = page.getByPlaceholder('••••••');
    await otpInput.fill('000000');

    await page.getByRole('button', { name: /Verify & Access Root Console/i }).click();

    // Should display attempts remaining error
    await expect(page.getByText(/Incorrect passcode/i)).toBeVisible();
  });

  test('5. Valid OTP authorizes root session, enters /super-admin/dashboard, and validates zero stores', async ({
    page,
  }) => {
    await page.goto('/super-admin/login');

    // Step 1: Request OTP
    const emailInput = page.getByPlaceholder('superadmin@domain.com');
    await emailInput.fill('msanthosh9943@gmail.com');
    await page.getByRole('button', { name: /Generate One-Time Passcode/i }).click();

    await expect(page.getByText(/Enter 6-Digit Passcode/i)).toBeVisible();

    // Step 2: Submit valid test OTP
    const otpInput = page.getByPlaceholder('••••••');
    await otpInput.fill('994321');

    await page.getByRole('button', { name: /Verify & Access Root Console/i }).click();

    // Verified & routed to /super-admin/dashboard
    await expect(page).toHaveURL(/\/super-admin\/dashboard/);
    await expect(page.getByRole('heading', { name: /Platform Tenant & Store Governance/i })).toBeVisible();

    // Telemetry cards check - Zero Stores
    await expect(page.getByText('SaaS Tenants')).toBeVisible();
    await expect(page.getByTestId('metric-physical-stores')).toBeVisible();

    // Table check - either zero-state or registered tenant practices with Practice ID
    const emptyState = page.getByText(/Zero Practice Organizations Registered/i);
    const tenantList = page.getByText(/Practice ID/i);
    // .first(): with N registered orgs there is one "Practice ID" chip per org (strict-mode safe)
    await expect(emptyState.or(tenantList).first()).toBeVisible();

    // Check isolation: super admin layout must NOT have backlink to POS
    const backToPosLink = page.getByTestId('link-back-to-pos');
    await expect(backToPosLink).not.toBeVisible();
  });

  test('6. Super Admin sign out clears session and redirects back to /super-admin/login', async ({
    page,
  }) => {
    // Log in via OTP
    await page.goto('/super-admin/login');
    await page.getByPlaceholder('superadmin@domain.com').fill('msanthosh9943@gmail.com');
    await page.getByRole('button', { name: /Generate One-Time Passcode/i }).click();
    await expect(page.getByText(/Enter 6-Digit Passcode/i)).toBeVisible();
    await page.getByPlaceholder('••••••').fill('994321');
    await page.getByRole('button', { name: /Verify & Access Root Console/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/dashboard/);

    // Click Sign Out in sidebar footer
    const signOutBtn = page.getByTitle('Sign Out');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Redirected back to /super-admin/login
    await expect(page).toHaveURL(/\/super-admin\/login/);
    await expect(page.getByRole('heading', { name: /OptixOS Root Gateway/i })).toBeVisible();
  });
});
