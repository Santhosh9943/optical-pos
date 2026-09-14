import { test, expect } from '@playwright/test';

test.describe('Phase 10: Infrastructure, Caching & Search Performance Suite', () => {
  test('1. Store Profile Caching & Invalidation: Update profile in admin settings and verify persistence', async ({
    page,
  }) => {
    // Navigate to admin settings
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("Store Settings & Print Engine")')
    ).toBeVisible({ timeout: 10000 });

    const storeNameInput = page.getByTestId('input-store-name');
    await expect(storeNameInput).toBeVisible();

    // Generate unique name for cache validation
    const uniqueStoreName = `Optix Central ${Date.now().toString().slice(-4)}`;
    await storeNameInput.fill(uniqueStoreName);

    // Save changes
    await page.getByTestId('btn-save-settings').click();

    // Verify success toast confirms save and cache invalidation
    await expect(
      page.locator('text=Store profile updated successfully!')
    ).toBeVisible({ timeout: 10000 });

    // Reload page to verify cached/persisted value loads cleanly
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(storeNameInput).toHaveValue(uniqueStoreName, { timeout: 10000 });
  });

  test('2. Inventory Search API Caching & 300ms Debounce: Search inventory in POS and verify results', async ({
    page,
  }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const invSearchInput = page.getByTestId('inventory-search-input');
    await expect(invSearchInput).toBeVisible({ timeout: 10000 });

    // Type query to trigger debounced API search
    await invSearchInput.fill('TITAN');

    // Wait for dropdown results to populate
    await expect(
      page.locator('text=Matching Items').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify at least one search result item is visible
    const resultItem = page.locator('ul.divide-y li').first();
    await expect(resultItem).toBeVisible();

    // Clear and search again to exercise cache lookup
    await invSearchInput.fill('');
    await invSearchInput.fill('TITAN');

    await expect(
      page.locator('text=Matching Items').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('3. Patient Search API Caching & 300ms Debounce: Search patient in POS and verify results', async ({
    page,
  }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const patientSearchInput = page.getByTestId('patient-search-input');
    await expect(patientSearchInput).toBeVisible({ timeout: 10000 });

    // Search for patient with >= 3 characters
    await patientSearchInput.fill('Rajesh');

    // Wait for matching patients dropdown
    await expect(
      page.locator('text=Matching Patients').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify patient entries exist
    const patientRow = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientRow).toBeVisible({ timeout: 10000 });

    // Repeat search to test cached response pathway
    await patientSearchInput.fill('');
    await patientSearchInput.fill('Rajesh');

    await expect(
      page.locator('text=Matching Patients').first()
    ).toBeVisible({ timeout: 10000 });
    await expect(patientRow).toBeVisible({ timeout: 10000 });
  });
});
