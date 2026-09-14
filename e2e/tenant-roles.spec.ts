import { test, expect } from '@playwright/test';

test.describe('Phase 12: Dedicated /super-admin/, Perspective Simulator & Role-Scoped Panels E2E', () => {
  test('UserNav in header links to /super-admin/dashboard and displays profile details', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // 1. User profile button must be visible in the header
    const profileBtn = page.getByTestId('user-profile-btn');
    await expect(profileBtn).toBeVisible();

    // 2. Click profile button to open dropdown
    await profileBtn.click();

    // 3. Dropdown content checks
    await expect(page.getByText(/admin@optix.com/i).first()).toBeVisible();
    await expect(page.getByTestId('btn-sign-out')).toBeVisible();

    // 4. Super Admin console link in dropdown should navigate to /super-admin/dashboard
    const superAdminLink = page.getByTestId('link-super-admin-console');
    await expect(superAdminLink).toBeVisible();
    await expect(superAdminLink).toHaveAttribute('href', '/super-admin/dashboard');
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

  test('BranchSwitcher in header allows switching active store view', async ({ page }) => {
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

  test('Sidebar contains Super Admin Platform link pointing to /super-admin/dashboard', async ({ page }) => {
    await page.goto('/pos/new-bill');

    const superAdminNav = page.getByTestId('nav-super-admin');
    await expect(superAdminNav).toBeVisible();
    await expect(superAdminNav).toHaveAttribute('href', '/super-admin/dashboard');
  });

  test('Dedicated /super-admin/dashboard renders global platform telemetry and navigation', async ({ page }) => {
    await page.goto('/super-admin/dashboard');

    // 1. Verify Page Title
    await expect(page.getByRole('heading', { name: /Global Platform Telemetry/i })).toBeVisible();

    // 2. Verify Platform Metrics Cards
    await expect(page.getByText('SaaS Tenants')).toBeVisible();
    await expect(page.getByTestId('metric-physical-stores')).toBeVisible();
    await expect(page.getByText('Total Orders')).toBeVisible();
    await expect(page.getByText('Platform GMV')).toBeVisible();

    // 3. Verify Dedicated Super Admin Sidebar Links
    await expect(page.getByTestId('nav-super-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-super-simulator')).toBeVisible();
    await expect(page.getByTestId('nav-super-organizations')).toBeVisible();
    await expect(page.getByTestId('nav-super-branches')).toBeVisible();
    await expect(page.getByTestId('nav-super-settings')).toBeVisible();

    // 4. Verify Open Simulator button
    await expect(page.getByTestId('btn-open-simulator')).toBeVisible();
  });

  test('Interactive Simulator (/super-admin/simulator) launches simulation with real scoped app and persistent banner', async ({ page }) => {
    await page.goto('/super-admin/simulator');

    // 1. Verify Heading
    await expect(page.getByRole('heading', { name: /Perspective Simulator & Impersonation Engine/i })).toBeVisible();

    // 2. Select Practice & Branch
    await expect(page.getByTestId('sim-org-select')).toBeVisible();
    await expect(page.getByTestId('sim-branch-select')).toBeVisible();

    // 3. Select Organizer Role
    await page.getByTestId('btn-select-role-organizer').click();

    // 4. Click Launch Simulated Session
    const launchBtn = page.getByTestId('btn-launch-simulation');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // 5. Verify live application loaded with top persistent simulation banner
    const simBanner = page.getByTestId('simulation-banner');
    await expect(simBanner).toBeVisible();
    await expect(simBanner).toContainText('Simulation Active');
    await expect(simBanner).toContainText('Organizer (Org Owner)');

    // 6. In Organizer mode, sidebar must show Manage Branches and Manage Staff
    await expect(page.getByTestId('nav-branches')).toBeVisible();
    await expect(page.getByTestId('nav-staff')).toBeVisible();

    // 7. Test on-the-fly role switching to Store Staff (POS) via quick dropdown
    const quickRoleSelect = page.getByTestId('sim-quick-role-select');
    await expect(quickRoleSelect).toBeVisible();
    await quickRoleSelect.selectOption('user');

    // Banner updates to Store Staff
    await expect(simBanner).toContainText('Store Staff');

    // In Staff mode, Management section (Branches & Settings) must disappear
    await expect(page.getByTestId('nav-branches')).not.toBeVisible();
    await expect(page.getByTestId('nav-settings')).not.toBeVisible();

    // 8. Click Exit Simulation & Return button in the banner
    const exitBtn = page.getByTestId('btn-exit-simulation');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // 9. Verify redirected back to /super-admin/simulator and banner is gone
    await expect(page).toHaveURL(/\/super-admin\/simulator/);
    await expect(page.getByTestId('simulation-banner')).not.toBeVisible();
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
});

