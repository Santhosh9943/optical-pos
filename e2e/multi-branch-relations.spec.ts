import { test, expect } from '@playwright/test';

test.describe('Single-Store Operation & Consolidated Multi-Store Reporting E2E', () => {
  test('BranchSwitcher enforces active single-store selection with quick consolidated reports link', async ({ page }) => {
    await page.goto('/pos/new-bill');

    const branchBtn = page.getByTestId('branch-switcher-btn');
    await expect(branchBtn).toBeVisible();

    // 1. Initial selection shows an active store name (never 'All Branches')
    await expect(branchBtn).not.toContainText('All Branches');

    // 2. Open store switcher popover
    await branchBtn.click();
    const popover = page.getByTestId('branch-switcher-popover');
    await expect(popover).toBeVisible();

    // 3. Verify physical store options and quick link to consolidated practice reports
    const storeOptions = page.locator('[data-testid^="branch-option-"]');
    expect(await storeOptions.count()).toBeGreaterThan(0);

    const reportsLink = page.getByTestId('link-consolidated-reports');
    await expect(reportsLink).toBeVisible();

    // 4. Click a store option to switch active store
    const secondOption = storeOptions.nth(1);
    if (await secondOption.isVisible().catch(() => false)) {
      const targetName = await secondOption.textContent();
      await secondOption.click();

      // Trigger updates immediately
      if (targetName) {
        await expect(branchBtn).toContainText(targetName.trim().slice(0, 10));
      }
    } else {
      await storeOptions.first().click();
    }
  });

  test('Inventory Management scopes by active store and pre-selects location in Add Product modal', async ({ page }) => {
    await page.goto('/admin/inventory');

    // 1. Verify Inventory Table renders Branch column
    const branchCol = page.locator('th', { hasText: 'Branch' });
    await expect(branchCol).toBeVisible();

    // 2. Header displays active store scope badge
    const scopeBadge = page.getByTestId('inventory-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).not.toContainText('All Branches');

    // 3. Open Add Product modal and check Branch selection dropdown
    const addProductBtn = page.getByTestId('btn-add-product');
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // The "Store Branch" select now lives in the collapsed "More Options" section of AddInventoryForm
    // (the old data-testid="select-inventory-branch" no longer exists).
    await page.getByRole('button', { name: /More Options/ }).click();
    const branchSelect = page.getByLabel('Store Branch');
    await expect(branchSelect).toBeVisible();

    // Verify option exists in dropdown
    const options = branchSelect.locator('option');
    expect(await options.count()).toBeGreaterThan(0);

    // Location is pre-selected to the active store shown in the scope badge ("Store: <name>")
    const activeStoreName = ((await scopeBadge.textContent()) ?? '').replace(/^\s*Store:\s*/, '').trim();
    await expect(branchSelect.locator('option:checked')).toHaveText(activeStoreName);

    // Close modal
    await page.getByTestId('btn-cancel-add-inventory').click();
  });

  test('Financial Reports & Audit Ledger provides dedicated store scope selector and multi-store performance breakdown', async ({ page }) => {
    await page.goto('/admin/reports');

    // 1. Reports header displays scope badge and dedicated Store Scope filter
    const scopeBadge = page.getByTestId('reports-scope-badge');
    await expect(scopeBadge).toBeVisible();

    const storeScopeSelect = page.getByTestId('select-report-store-scope');
    await expect(storeScopeSelect).toBeVisible();

    // 2. Multi-Store Performance Breakdown section is rendered when data exists
    const breakdownSection = page.getByTestId('multi-store-breakdown-section');
    await expect(breakdownSection).toBeVisible();

    // 3. Audit Ledger Table includes Branch column
    const ledgerTable = page.getByTestId('reports-ledger-table');
    await expect(ledgerTable).toBeVisible();
    const branchHeader = ledgerTable.locator('th', { hasText: 'Branch' });
    await expect(branchHeader).toBeVisible();

    // 4. Test selecting a single store in reports filter
    const options = storeScopeSelect.locator('option');
    if ((await options.count()) > 1) {
      const secondVal = await options.nth(1).getAttribute('value');
      if (secondVal) {
        await storeScopeSelect.selectOption(secondVal);
        await expect(scopeBadge).not.toContainText('All Branches');
      }
    }
  });

  test('Lab Orders & Workshop Kanban displays active store scope badge and location pills', async ({ page }) => {
    await page.goto('/admin/lab-orders');

    // 1. Active branch scope badge in header
    const scopeBadge = page.getByTestId('lab-orders-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).not.toContainText('All Branches');

    // 2. Switch to Table List view and check Branch column
    const tableToggle = page.getByTestId('view-toggle-table');
    await expect(tableToggle).toBeVisible();
    await tableToggle.click();

    const branchHeader = page.locator('th', { hasText: 'Branch' });
    await expect(branchHeader).toBeVisible();

    // Switch back to Kanban
    const kanbanToggle = page.getByTestId('view-toggle-kanban');
    await kanbanToggle.click();
    await expect(page.getByTestId('kanban-column-action-required')).toBeVisible();
  });

  test('Patients Directory scopes by active store', async ({ page }) => {
    await page.goto('/admin/patients');

    // 1. Active branch scope badge in header
    const scopeBadge = page.getByTestId('patients-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).not.toContainText('All Branches');
  });

  test('POS billing counter renders store location indicator', async ({ page }) => {
    await page.goto('/pos/new-bill');

    // 1. Counter location container must be present in POS sub-header
    const counterContainer = page.getByTestId('pos-billing-branch-container');
    await expect(counterContainer).toBeVisible();

    // 2. Check that store location name or dropdown is rendered
    const hasActiveBranchName = await page.getByTestId('pos-active-branch-name').isVisible().catch(() => false);
    const hasBranchSelect = await page.getByTestId('select-pos-branch').isVisible().catch(() => false);
    expect(hasActiveBranchName || hasBranchSelect).toBeTruthy();
  });
});
