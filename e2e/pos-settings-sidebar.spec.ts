import { test, expect } from '@playwright/test';

test.describe('POS Screen Settings & Categorized Grouped Sidebar E2E Suite', () => {
  test('POS header contains Settings button, navigates to settings, displays categorized sidebar, and returns to POS', async ({
    page,
  }) => {
    // 1. Navigate to POS Billing Screen
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // 2. Verify Quick-Access Settings button in POS header
    const posSettingsBtn = page.getByTestId('btn-pos-settings');
    await expect(posSettingsBtn).toBeVisible({ timeout: 10000 });
    await expect(posSettingsBtn).toContainText('Settings');

    // 3. Click Settings button -> Transitions to /admin/settings
    await posSettingsBtn.click();
    await page.waitForURL(/\/admin\/settings/);

    // 4. Verify Categorized Settings Navigation Sidebar is rendered
    const settingsSidebar = page.getByTestId('settings-navigation-sidebar');
    await expect(settingsSidebar).toBeVisible({ timeout: 10000 });

    // Verify 6 Category Group Labels
    await expect(settingsSidebar.locator('text=Store & Practice')).toBeVisible();
    await expect(settingsSidebar.locator('text=Catalog & Dispensing')).toBeVisible();
    await expect(settingsSidebar.locator('text=Profile & Security')).toBeVisible();
    await expect(settingsSidebar.locator('text=Team & Permissions')).toBeVisible();
    await expect(settingsSidebar.locator('text=Communications & Alerts')).toBeVisible();
    await expect(settingsSidebar.locator('text=Subscription & System')).toBeVisible();

    // 5. Test navigation across categorized groups:

    // 5a. POS Viewport & Counter Layout
    const posLayoutItem = page.getByTestId('tab-pos-layout');
    await expect(posLayoutItem).toBeVisible();
    await posLayoutItem.click();
    await expect(page).toHaveURL(/tab=pos-layout/);
    await expect(page.getByTestId('pos-layout-adaptive-card')).toBeVisible();
    await expect(page.getByTestId('pos-layout-dense-card')).toBeVisible();

    // 5b. Product Types & Workflows
    const productTypesItem = page.getByTestId('tab-product-types');
    await expect(productTypesItem).toBeVisible();
    await productTypesItem.click();
    await expect(page).toHaveURL(/tab=products/);
    await expect(page.getByTestId('product-types-settings-card')).toBeVisible();

    // 5c. Email & SMTP Gateway
    const emailItem = page.getByTestId('tab-email-smtp');
    await expect(emailItem).toBeVisible();
    await emailItem.click();
    await expect(page).toHaveURL(/tab=email/);
    await expect(page.getByTestId('input-smtp-host')).toBeVisible();

    // 5d. System Engine & Cache Purge
    const systemItem = page.getByTestId('tab-system-engine');
    await expect(systemItem).toBeVisible();
    await systemItem.click();
    await expect(page).toHaveURL(/tab=system/);
    await expect(page.getByTestId('btn-clear-application-cache')).toBeVisible();

    // 6. Test "← Back to Billing (POS) [F1]" button
    const backToPosBtn = page.getByTestId('btn-back-to-pos');
    await expect(backToPosBtn).toBeVisible();
    await expect(backToPosBtn).toContainText('POS Billing');
    await backToPosBtn.click();

    // 7. Verify returned to POS Billing Counter
    await page.waitForURL(/\/pos\/new-bill/);
    await expect(page.getByTestId('btn-pos-settings')).toBeVisible();
  });
});
