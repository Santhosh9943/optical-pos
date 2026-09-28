import { test, expect } from '@playwright/test';

test.describe('POS Viewport Modes E2E Suite', () => {
  test('Direct Viewport Switcher (Rx, Split, Cart), F4 Hotkey, and Persistence', async ({ page }) => {
    // 1. Navigate to POS new billing view
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // Layout switcher must be mounted in header with direct buttons (no select dropdown or adaptive tag)
    const layoutSwitcher = page.getByTestId('pos-layout-switcher');
    await expect(layoutSwitcher).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('pos-layout-type-select')).not.toBeVisible();

    // Verify the 3 direct buttons are visible
    const rxFocusBtn = page.getByTestId('btn-mode-rx-focus');
    const splitBtn = page.getByTestId('btn-mode-split');
    const billingFocusBtn = page.getByTestId('btn-mode-billing-focus');

    await expect(rxFocusBtn).toBeVisible();
    await expect(splitBtn).toBeVisible();
    await expect(billingFocusBtn).toBeVisible();

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

    // 3. Test Viewport Mode Toggles: Rx Focus ↔ Billing Focus ↔ Split
    // Click "Rx Focus" button
    await rxFocusBtn.click();

    // In Rx focus, clinical refraction matrix is prominent and mini-cart drawer shows items count
    await expect(page.locator('text=Clinical Refraction & Rx Matrix').first()).toBeVisible();
    await expect(page.locator('text=Cart (1)').first()).toBeVisible();

    // Click "Billing Focus" (Cart Focus) button
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

    // 4. Verify Viewport Mode persistence via localStorage
    await billingFocusBtn.click();
    await expect(compactStrip).toBeVisible();

    // Reload page and verify billing focus persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('btn-mode-billing-focus')).toHaveClass(/bg-blue-600/);

    // Restore to split mode
    await page.getByTestId('btn-mode-split').click();
    await page.evaluate(() => localStorage.removeItem('optixos_pos_mode'));
  });
});
