import { test, expect } from '@playwright/test';

test.describe('Settings Auto-Save & Unsaved Changes Navigation Guard E2E Suite', () => {
  test('Dirty form tracking, Unsaved Changes modal, and Layout auto-save behaviors', async ({ page }) => {
    // 1. Navigate to Settings page
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Store Settings & Print Engine")')).toBeVisible({ timeout: 10000 });

    // 2. Initial state: General Profile tab is clean -> Save button disabled "All Changes Saved"
    const saveBtn = page.getByTestId('btn-save-settings');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeDisabled();
    await expect(saveBtn).toContainText('All Changes Saved');

    // 3. Make an edit in Store Name
    const storeNameInput = page.getByTestId('input-store-name');
    await storeNameInput.fill('Temp Modified Optical Name');

    // Button should now be active "Save Changes"
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).toContainText('Save Changes');

    // 4. Attempt to switch to "Print Configuration" without saving
    const printTab = page.getByTestId('tab-print-config');
    await printTab.click();

    // Verify "Unsaved Changes" dialog appears
    await expect(page.getByRole('heading', { name: 'Unsaved Changes' })).toBeVisible();
    await expect(page.locator('text=Do you want to save or discard your changes before leaving?')).toBeVisible();

    // 5. Test "Keep Editing" - closes modal and stays on General Profile
    const keepEditingBtn = page.getByRole('button', { name: 'Keep Editing' });
    await keepEditingBtn.click();
    await expect(page.locator('text=Unsaved Changes')).not.toBeVisible();
    await expect(storeNameInput).toBeVisible();

    // 6. Attempt switch again, then choose "Discard Changes"
    await printTab.click();
    await expect(page.getByRole('heading', { name: 'Unsaved Changes' })).toBeVisible();

    const discardBtn = page.getByRole('button', { name: 'Discard Changes' });
    await discardBtn.click();

    // Now should have transitioned to Print Configuration tab
    await expect(page.getByTestId('card-receipt-thermal')).toBeVisible();
    await expect(page.getByTestId('card-receipt-a4')).toBeVisible();

    // 7. Verify Print Configuration has no manual save button and auto-saves
    await expect(page.getByTestId('btn-save-settings')).not.toBeVisible();

    await page.getByTestId('card-receipt-a4').click();
    await expect(page.locator('text=Print layout updated').first()).toBeVisible({ timeout: 5000 });

    // Restore to thermal
    await page.getByTestId('card-receipt-thermal').click();
    await expect(page.locator('text=Print layout updated').first()).toBeVisible({ timeout: 5000 });

    // 8. Switch to POS Counter Layout tab
    const posLayoutTab = page.getByTestId('tab-pos-layout');
    await posLayoutTab.click();

    await expect(page.getByTestId('pos-layout-dense-card')).toBeVisible();
    await page.getByTestId('pos-layout-dense-card').click();
    await expect(page.locator('text=Counter layout updated').first()).toBeVisible({ timeout: 5000 });

    // Restore to adaptive
    await page.getByTestId('pos-layout-adaptive-card').click();
    await expect(page.locator('text=Counter layout updated').first()).toBeVisible({ timeout: 5000 });
  });
});
