import { test, expect } from '@playwright/test';

test.describe('POS Adaptive & Dense View Modes E2E Suite', () => {
  test('Layout Switcher, Adaptive Modes (Rx, Split, Billing Focus), F4 Hotkey, and Admin Settings Persistence', async ({ page }) => {
    // 1. Navigate to POS new billing view
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // Layout switcher select must be mounted in header
    const layoutSelect = page.getByTestId('pos-layout-type-select');
    await expect(layoutSelect).toBeVisible({ timeout: 15000 });

    // Ensure we are in Adaptive Modes layout
    await layoutSelect.selectOption('adaptive');

    // 2. Select a patient (Rajesh Kumar)
    const patientSearch = page.getByTestId('patient-search-input');
    await patientSearch.fill('Rajesh');
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // Add a frame to cart
    const inventorySearch = page.getByTestId('inventory-search-input');
    await inventorySearch.fill('Ray-Ban');
    const inventoryOption = page.locator('li', { hasText: 'FRM-RB-2140-BLK' });
    await expect(inventoryOption).toBeVisible({ timeout: 10000 });
    const frameOnlyBtn = inventoryOption.getByRole('button', { name: '+ Frame Only' });
    if (await frameOnlyBtn.isVisible()) {
      await frameOnlyBtn.click();
    } else {
      await inventoryOption.click();
    }

    // Assert item is in cart
    await expect(page.locator('text=FRM-RB-2140-BLK').first()).toBeVisible();

    // 3. Test Adaptive Mode Toggles: Rx Focus ↔ Billing Focus ↔ Split
    // Click "Rx Focus" button
    const rxFocusBtn = page.getByTestId('btn-mode-rx-focus');
    await expect(rxFocusBtn).toBeVisible({ timeout: 5000 });
    await rxFocusBtn.click();

    // In Rx focus, clinical refraction matrix is prominent and mini-cart drawer shows items count
    await expect(page.locator('text=Clinical Refraction & Rx Matrix').first()).toBeVisible();
    await expect(page.locator('text=Cart (1)').first()).toBeVisible();

    // Click "Billing Focus" (Cart Focus) button
    const billingFocusBtn = page.getByTestId('btn-mode-billing-focus');
    await expect(billingFocusBtn).toBeVisible();
    await billingFocusBtn.click();

    // In Billing Focus, compact patient strip is visible
    const compactStrip = page.getByTestId('compact-patient-strip');
    await expect(compactStrip).toBeVisible();
    await expect(compactStrip.locator('text=Rajesh Kumar').first()).toBeVisible();
    await expect(compactStrip.locator('text=9876543210').first()).toBeVisible();

    // In Billing Focus, separate Checkout Ledger Pane is visible
    await expect(page.locator('text=Payment & Settlement').first()).toBeVisible();

    // Toggle back to Split via F4 hotkey
    await page.keyboard.press('F4');
    // In Split mode, compact strip is hidden and balanced patient workspace is shown
    await expect(compactStrip).not.toBeVisible();

    // 4. Test Switching to Dense Split Layout
    await layoutSelect.selectOption('dense');
    // Verify Dense Bottom Bar is visible
    const denseBottomBar = page.getByTestId('dense-bottom-bar');
    await expect(denseBottomBar).toBeVisible({ timeout: 5000 });
    await expect(denseBottomBar.locator('text=1 Item').first()).toBeVisible();
    await expect(denseBottomBar.getByTestId('btn-complete-order')).toBeVisible();

    // 5. Test Switching to Classic Split Layout
    await layoutSelect.selectOption('split');
    // Dense bottom bar should no longer be rendered
    await expect(denseBottomBar).not.toBeVisible();

    // 6. Test Settings Persistence in /admin/settings
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    // Click the POS Counter Layout tab
    const posLayoutTab = page.getByTestId('tab-pos-layout');
    await expect(posLayoutTab).toBeVisible({ timeout: 10000 });
    await posLayoutTab.click();

    // Select the "Dense Split" card
    const denseCard = page.getByTestId('pos-layout-dense-card');
    await expect(denseCard).toBeVisible();
    await denseCard.click();

    // Save preferences
    const saveBtn = page.getByTestId('btn-save-settings');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify success toast appears
    await expect(page.locator('text=Store profile updated successfully').first()).toBeVisible({ timeout: 5000 });

    // Clear local storage layout override if any, so database default takes effect
    await page.evaluate(() => localStorage.removeItem('optixos_pos_layout'));

    // 7. Re-open /pos/new-bill and verify Dense Split is active by default from DB
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // Layout switcher value should be 'dense'
    await expect(page.getByTestId('pos-layout-type-select')).toHaveValue('dense');
    // Dense bottom bar should be mounted
    await expect(page.getByTestId('dense-bottom-bar')).toBeVisible();

    // 8. Clean up: Restore default layout in settings to 'adaptive'
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-pos-layout').click();
    await page.getByTestId('pos-layout-adaptive-card').click();
    await page.getByTestId('btn-save-settings').click();
    await expect(page.locator('text=Store profile updated successfully').first()).toBeVisible({ timeout: 5000 });
    await page.evaluate(() => localStorage.removeItem('optixos_pos_layout'));
  });
});
