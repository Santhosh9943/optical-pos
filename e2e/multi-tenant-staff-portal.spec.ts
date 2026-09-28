import { test, expect } from '@playwright/test';

test.describe('Phase 27: Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal', () => {
  test('1. Main login screen renders Staff Portal entrypoint without disrupting existing UI', async ({ page }) => {
    await page.goto('/auth/login');

    // Verify main brand and login components
    await expect(page.getByRole('heading', { name: /OptixOS/i })).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();

    // Verify dedicated Staff Portal button is visible
    const staffPortalLink = page.getByTestId('link-staff-portal');
    await expect(staffPortalLink).toBeVisible();
    await expect(staffPortalLink).toContainText(/Staff Portal/i);

    // Clicking Staff Portal link navigates to /auth/staff-login
    await staffPortalLink.click();
    await expect(page).toHaveURL(/\/auth\/staff-login/);
  });

  test('2. Staff Portal renders 3-field authentication form with Org ID, Email, and Password', async ({ page }) => {
    await page.goto('/auth/staff-login');

    // Verify Staff Portal brand and header
    await expect(page.locator('h1')).toContainText(/Store Staff Portal/i);
    await expect(page.locator('text=Sign in to your assigned optical branch counter')).toBeVisible();

    // Verify 3 distinct fields
    const orgInput = page.getByPlaceholder(/e\.g\. OPT-1 or 1/i);
    const emailInput = page.getByPlaceholder(/staff@practice\.com/i);
    const passwordInput = page.locator('input[type="password"]');

    await expect(orgInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Verify org code helper badge/hint
    await expect(page.locator('text=Accepts OPT-1 or 1')).toBeVisible();

    // Test filling with practice code and credentials
    await orgInput.fill('OPT-1');
    await emailInput.fill('staff.test@optical.com');
    await passwordInput.fill('StaffSecret123!');

    await expect(orgInput).toHaveValue('OPT-1');
    await expect(emailInput).toHaveValue('staff.test@optical.com');
    await expect(passwordInput).toHaveValue('StaffSecret123!');

    // Test back-link to practice owner login
    const backToOwnerLink = page.getByTestId('link-owner-login');
    await expect(backToOwnerLink).toBeVisible();
    await backToOwnerLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('3. Staff Portal validates invalid organization code with clean error feedback', async ({ page }) => {
    await page.goto('/auth/staff-login');

    // Fill completely invalid non-existent org
    await page.getByPlaceholder(/e\.g\. OPT-1 or 1/i).fill('OPT-999999');
    await page.getByPlaceholder(/staff@practice\.com/i).fill('nonexistent@optical.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');

    // Click Sign In button
    await page.getByTestId('btn-staff-signin').click();

    // Verify error banner is displayed
    const errorBanner = page.getByTestId('staff-login-error');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(errorBanner).toContainText(/Practice not found/i);
  });

  test('4. Staff Management UI in Admin dashboard supports multi-store assignment and password provisioning', async ({ page }) => {
    await page.goto('/admin/staff');

    // Verify staff management page header
    await expect(page.locator('h1', { hasText: /Store Staff & Team Members/i })).toBeVisible();

    // Click "Add Staff Member" button
    const addStaffBtn = page.getByTestId('btn-add-staff');
    await expect(addStaffBtn).toBeVisible();
    await addStaffBtn.click();

    // Verify the new multi-store and password fields exist in the dialog
    await expect(page.locator('text=Initial Password').first()).toBeVisible();
    await expect(page.locator('text=Require password reset on first login')).toBeVisible();
    await expect(page.locator('text=Assigned Store Locations')).toBeVisible();

    // Close modal via Escape or cancel button
    await page.keyboard.press('Escape');
  });

  test('5. Practice Onboarding requires Practice Name and displays Store ID info', async ({ page }) => {
    await page.goto('/onboarding?bypass=true');

    // Verify onboarding screen header
    await expect(page.locator('h1')).toContainText(/Welcome to OptixOS/i);
    await expect(page.getByLabel(/Practice \/ Optical Store Name/i)).toBeVisible();
    await expect(page.getByLabel(/Primary Store \/ Branch Name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Launch Practice Workspace/i })).toBeVisible();
  });
});
