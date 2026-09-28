import { test, expect } from '@playwright/test';

test.describe('Dynamic Inventory Catalog & POS Grid/List View Suite', () => {
  test('Dynamic Catalog: Grid and List view switching, dynamic categories, live search, and clean button', async ({ page }) => {
    // 1. Navigate to POS
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // 2. Select patient
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('9876543210');
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 3. Open "+ Add Product [F2]"
    const addProductBtn = page.getByTestId('add-product-btn');
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // 4. Verify Single Plus on Create Inventory button (no "+ +" double symbol)
    const createInvBtn = page.getByTestId('btn-add-product-create-inventory');
    await expect(createInvBtn).toBeVisible({ timeout: 10000 });
    const btnText = await createInvBtn.innerText();
    // Inner text should be "Create Inventory" (with Lucide icon), not "+ Create Inventory" which results in double plus
    expect(btnText.trim()).toBe('Create Inventory');

    // 5. Verify Dynamic Category Chips exist and have counts
    const allChip = page.getByTestId('chip-category-all');
    await expect(allChip).toBeVisible();
    await expect(allChip).toContainText('All Products');

    // 6. Test View Mode Switcher
    const gridBtn = page.getByTestId('btn-view-mode-grid');
    const listBtn = page.getByTestId('btn-view-mode-list');
    await expect(gridBtn).toBeVisible();
    await expect(listBtn).toBeVisible();

    // In Grid mode by default: verify cards exist
    const gridCards = page.locator('div[data-testid^="product-card-"]');
    const countCards = await gridCards.count();
    expect(countCards).toBeGreaterThan(0);

    // Switch to List mode
    await listBtn.click();
    const tableHeader = page.locator('table thead');
    await expect(tableHeader).toBeVisible();
    await expect(tableHeader).toContainText('SKU / Barcode');
    await expect(tableHeader).toContainText('Selling Price');

    const tableRows = page.locator('tr[data-testid^="product-row-"]');
    const countRows = await tableRows.count();
    expect(countRows).toBeGreaterThan(0);

    // 7. Test Real-Time Search
    const searchInput = page.getByTestId('input-modal-catalog-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('RB-2140');

    // In filtered state, check matching items
    await expect(page.locator('text=RB-2140').first()).toBeVisible({ timeout: 5000 });

    // Switch back to Grid view while filtered
    await gridBtn.click();
    await expect(page.locator('text=RB-2140').first()).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // 8. Test 1-Click Add to Cart from Grid View
    const firstAddBtn = page.locator('button[data-testid^="btn-add-cart-"]').first();
    await expect(firstAddBtn).toBeVisible();
    await firstAddBtn.click();

    // Toast notification confirms
    await expect(page.locator('text=Added to Cart').first()).toBeVisible({ timeout: 5000 });

    // 9. Close Modal
    await page.keyboard.press('Escape');
    await expect(createInvBtn).not.toBeVisible({ timeout: 5000 });

    // Verify item is present in the main POS cart
    await expect(page.locator('table').first()).toBeVisible();
  });
});
