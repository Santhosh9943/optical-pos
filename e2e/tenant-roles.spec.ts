import { test, expect } from '@playwright/test';

test.describe('Phase 12: Dedicated /super-admin/ & Role-Scoped Panels E2E', () => {
  test('UserNav in header displays profile details and isolates super admin console', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // 1. User profile button must be visible in the header
    const profileBtn = page.getByTestId('user-profile-btn');
    await expect(profileBtn).toBeVisible();

    // 2. Click profile button to open dropdown
    await profileBtn.click();

    // 3. Dropdown content checks
    await expect(page.getByText(/admin@optix.com/i).first()).toBeVisible();
    await expect(page.getByTestId('btn-sign-out')).toBeVisible();

    // 4. Super Admin console link is decoupled and NOT attached to regular user nav
    const superAdminLink = page.getByTestId('link-super-admin-console');
    await expect(superAdminLink).not.toBeVisible();
  });

  test('BranchSwitcher in header allows switching active store view', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // 1. Branch switcher button must be visible
    const branchBtn = page.getByTestId('branch-switcher-btn');
    await expect(branchBtn).toBeVisible();

    // 2. Click to open branch selector popover
    await branchBtn.click();

    // 3. Check for physical store options and quick link to reports
    const storeOptions = page.locator('[data-testid^="branch-option-"]');
    expect(await storeOptions.count()).toBeGreaterThan(0);
    await expect(page.getByTestId('link-consolidated-reports')).toBeVisible();

    // 4. Click the first store
    await storeOptions.first().click();
    await expect(page.getByTestId('branch-switcher-popover')).not.toBeVisible();
  });

  test('Sidebar isolates super admin platform navigation from practice stores', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // Super Admin navigation is decoupled and NOT attached to practice sidebar
    const superAdminNav = page.getByTestId('nav-super-admin');
    await expect(superAdminNav).not.toBeVisible();
  });

  test('Dedicated /super-admin/dashboard renders global platform telemetry and navigation', async ({ page }) => {
    // 0a. Isolation: middleware deliberately excludes /super-admin from the E2E
    //     auth bypass header, so an unauthenticated visit lands on the OTP gateway.
    await page.goto('/super-admin/dashboard');
    await expect(page).toHaveURL(/\/super-admin\/login/);
    await expect(page.getByRole('heading', { name: /OptixOS Root Gateway/i })).toBeVisible();

    // 0b. Obtain a real root session via the non-production deterministic OTP
    //     (same flow as e2e/super-admin-otp-auth.spec.ts).
    await page.getByPlaceholder('superadmin@domain.com').fill('msanthosh9943@gmail.com');
    await page.getByRole('button', { name: /Generate One-Time Passcode/i }).click();
    await expect(page.getByText(/Enter 6-Digit Passcode/i)).toBeVisible();
    await page.getByPlaceholder('••••••').fill('994321');
    await page.getByRole('button', { name: /Verify & Access Root Console/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/dashboard/);

    // 1. Verify Page Title
    await expect(page.getByRole('heading', { name: /Platform Tenant & Store Governance/i })).toBeVisible();

    // 2. Verify Platform Metrics Cards (Stores & Users)
    await expect(page.getByText('SaaS Tenants')).toBeVisible();
    await expect(page.getByTestId('metric-physical-stores')).toBeVisible();
    await expect(page.getByText('Branch Staff & Users')).toBeVisible();
    await expect(page.getByText('Platform Infrastructure')).toBeVisible();

    // 3. Verify Dedicated Super Admin Sidebar Links
    await expect(page.getByTestId('nav-super-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-super-organizations')).toBeVisible();
    await expect(page.getByTestId('nav-super-branches')).toBeVisible();
    await expect(page.getByTestId('nav-super-settings')).toBeVisible();
  });

  test('Organizer panel: Manage Branches (/admin/branches) lists physical stores and creates new branch', async ({ page }) => {
    await page.goto('/admin/branches');

    // 1. Verify Page Title
    await expect(page.getByRole('heading', { name: /Manage Physical Branches/i })).toBeVisible();

    // 2. Open Add Store Modal
    const addBtn = page.getByTestId('btn-add-branch');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 3. Fill Branch Name
    const uniqueBranchName = `Store Branch ${Date.now().toString().slice(-4)}`;
    await page.getByTestId('input-branch-name').fill(uniqueBranchName);

    // 4. Submit
    await page.getByTestId('btn-submit-branch').click();

    // 5. Verify new branch appears in list
    await expect(page.getByRole('heading', { name: uniqueBranchName })).toBeVisible();
  });

  test('Store Admin & Organizer panel: Manage Staff (/admin/staff) lists and invites team members', async ({ page }) => {
    await page.goto('/admin/staff');

    // 1. Verify Page Title
    await expect(page.getByRole('heading', { name: /Store Staff & Team Members/i })).toBeVisible();

    // 2. Open Add Staff Modal
    const addStaffBtn = page.getByTestId('btn-add-staff');
    await expect(addStaffBtn).toBeVisible();
    await addStaffBtn.click();

    // 3. Fill Staff Details
    const uniqueName = `Dr. Rohan Verma ${Date.now().toString().slice(-4)}`;
    const uniqueEmail = `optom.${Date.now().toString().slice(-4)}@optix.com`;
    await page.getByTestId('input-staff-name').fill(uniqueName);
    await page.getByTestId('input-staff-email').fill(uniqueEmail);

    // 4. Submit
    await page.getByTestId('btn-submit-staff').click();

    // 5. Verify newly created staff member appears in the table
    await expect(page.getByRole('table').getByText(uniqueName)).toBeVisible();
    await expect(page.getByRole('table').getByText(uniqueEmail)).toBeVisible();
  });

  test('UserNav sign out button triggers logout and redirects to /auth/login', async ({ page }) => {
    await page.goto('/pos/new-bill');

    const profileBtn = page.getByTestId('user-profile-btn');
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    const signOutBtn = page.getByTestId('btn-sign-out');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify navigation to login page
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /OptixOS|Optix OS/i })).toBeVisible();
  });
});
