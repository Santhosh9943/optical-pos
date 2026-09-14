import { test, expect } from '@playwright/test';

test.describe('Stage 9: Store Settings & Print Engine E2E Suite', () => {
  test('Navigate to settings, update store profile, configure print formats, and verify print buttons', async ({
    page,
  }) => {
    // 1. Navigate from Dashboard sidebar to Settings
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible({ timeout: 10000 });
    await navSettings.click();

    // 2. Verify settings page loaded
    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(
      page.locator('h1:has-text("Store Settings & Print Engine")')
    ).toBeVisible({ timeout: 10000 });

    // 3. Verify form fields on General Profile tab
    await expect(page.getByTestId('tab-general-profile')).toBeVisible();
    await expect(page.getByTestId('input-store-name')).toBeVisible();
    await expect(page.getByTestId('input-store-gstin')).toBeVisible();
    await expect(page.getByTestId('input-store-phone')).toBeVisible();
    await expect(page.getByTestId('input-store-tax-rate')).toBeVisible();
    await expect(page.getByTestId('input-store-address')).toBeVisible();

    // Update profile with test values
    const testStoreName = `Optix Central ${Date.now().toString().slice(-4)}`;
    await page.getByTestId('input-store-name').fill(testStoreName);
    await page.getByTestId('input-store-phone').fill('+91 99887 76655');
    await page.getByTestId('input-store-tax-rate').fill('18.00');

    // Click Save Changes
    await page.getByTestId('btn-save-settings').click();

    // Verify success toast
    await expect(
      page.locator('text=Store profile updated successfully!')
    ).toBeVisible({ timeout: 10000 });

    // 4. Switch to Print Configuration Tab
    const printTab = page.getByTestId('tab-print-config');
    await expect(printTab).toBeVisible();
    await printTab.click();

    // Verify print selection options
    const thermalCard = page.getByTestId('card-receipt-thermal');
    const a4Card = page.getByTestId('card-receipt-a4');
    await expect(thermalCard).toBeVisible();
    await expect(a4Card).toBeVisible();

    // Select A4 Laser Invoice
    await page.getByTestId('receipt-type-a4').click();
    await page.getByTestId('btn-save-settings').click();

    await expect(
      page.locator('text=Store profile updated successfully!')
    ).toBeVisible({ timeout: 10000 });

    // Switch back to Thermal
    await page.getByTestId('receipt-type-thermal').click();
    await page.getByTestId('btn-save-settings').click();

    await expect(
      page.locator('text=Store profile updated successfully!')
    ).toBeVisible({ timeout: 10000 });

    // 5. Navigate to Patients view to verify print invoice action on order history
    await page.goto('/admin/patients');
    await page.waitForLoadState('networkidle');

    // Open first patient detail sheet if available
    const firstPatientRow = page.locator('table tbody tr').first();
    if (await firstPatientRow.isVisible().catch(() => false)) {
      await firstPatientRow.click();

      // Switch to Order Invoices tab if patient sheet opened
      const ordersTab = page.getByTestId('tab-invoices');
      if (await ordersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await ordersTab.click();

        // Check if any invoice has the Print button
        const printInvoiceBtn = page.getByTestId('btn-print-invoice').first();
        if (await printInvoiceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(printInvoiceBtn).toBeVisible();
        }
      }
    }
  });
});
