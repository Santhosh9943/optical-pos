import { test, expect } from '@playwright/test';

test.describe('Phase 12: User Profile Nav, Multi-Branch Switcher & Super Admin Console E2E', () => {
  test('UserNav renders in header, opens dropdown, and displays profile details', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // 1. User profile button must be visible in the header
    const profileBtn = page.getByTestId('user-profile-btn');
    await expect(profileBtn).toBeVisible();

    // 2. Click profile button to open dropdown
    await profileBtn.click();

    // 3. Dropdown content checks
    await expect(page.getByText(/admin@optix.com/i).first()).toBeVisible();
    await expect(page.getByTestId('btn-sign-out')).toBeVisible();

    // 4. Super Admin console link in dropdown should navigate to /admin/super-admin
    const superAdminLink = page.getByTestId('link-super-admin-console');
    await expect(superAdminLink).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Optix OS' })).toBeVisible();
  });

  test('BranchSwitcher renders in header and allows switching active store view', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // 1. Branch switcher button must be visible
    const branchBtn = page.getByTestId('branch-switcher-btn');
    await expect(branchBtn).toBeVisible();

    // 2. Click to open branch selector popover
    await branchBtn.click();

    // 3. Check for "All Branches (Consolidated)" option
    const allBranchesBtn = page.getByTestId('branch-option-all');
    await expect(allBranchesBtn).toBeVisible();

    // 4. Select "All Branches"
    await allBranchesBtn.click();

    // 5. Popover closes and button reflects "All Branches"
    await expect(branchBtn).toContainText('All Branches');
  });

  test('Sidebar contains Super Admin navigation link', async ({ page }) => {
    await page.goto('/pos/new-bill');

    const superAdminNav = page.getByTestId('nav-super-admin');
    await expect(superAdminNav).toBeVisible();
    await expect(superAdminNav).toHaveAttribute('href', '/admin/super-admin');
  });

  test('Super Admin Console (/admin/super-admin) renders 4-mode tabs and live perspective simulation', async ({ page }) => {
    await page.goto('/admin/super-admin');

    // 1. Verify Page Title and Description
    await expect(page.getByRole('heading', { name: /Super Admin Governance Console/i })).toBeVisible();

    // 2. Verify 4 Mode Switcher Tabs
    const tabSuperAdmin = page.getByTestId('mode-tab-super_admin');
    const tabOrganizer = page.getByTestId('mode-tab-organizer');
    const tabAdmin = page.getByTestId('mode-tab-admin');
    const tabUser = page.getByTestId('mode-tab-user');

    await expect(tabSuperAdmin).toBeVisible();
    await expect(tabOrganizer).toBeVisible();
    await expect(tabAdmin).toBeVisible();
    await expect(tabUser).toBeVisible();

    // 3. Verify Platform Analytics Cards
    await expect(page.getByText('SaaS Tenants')).toBeVisible();
    await expect(page.getByText('Physical Stores')).toBeVisible();
    await expect(page.getByText('Total Orders')).toBeVisible();
    await expect(page.getByText('Platform GMV')).toBeVisible();

    // 4. Test Switching Operating Mode to "Organizer"
    await tabOrganizer.click();
    await expect(page.getByTestId('active-perspective-indicator')).toContainText('organizer');

    // 5. Test Switching Operating Mode to "Store Admin"
    await tabAdmin.click();
    await expect(page.getByTestId('active-perspective-indicator')).toContainText('admin');

    // 6. Test Switching Operating Mode to "Store Staff (User)"
    await tabUser.click();
    await expect(page.getByTestId('active-perspective-indicator')).toContainText('user');

    // 7. Reset to Super Admin
    await tabSuperAdmin.click();
    await expect(page.getByTestId('active-perspective-indicator')).toContainText('super admin');

    // 8. Verify "Add Physical Store" button is present
    await expect(page.getByTestId('btn-add-store')).toBeVisible();
  });
});
