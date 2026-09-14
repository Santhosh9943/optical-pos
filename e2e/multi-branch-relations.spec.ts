import { test, expect } from '@playwright/test';

test.describe('Multi-Branch Relations & Dynamic Multi-Select Data Loading E2E', () => {
  test('BranchSwitcher supports single, multiple, and all branch selection modes', async ({ page }) => {
    await page.goto('/pos/new-bill');

    const branchBtn = page.getByTestId('branch-switcher-btn');
    await expect(branchBtn).toBeVisible();

    // 1. Initial default is "All Branches"
    await expect(branchBtn).toContainText('All Branches');

    // 2. Open popover
    await branchBtn.click();
    const popover = page.getByTestId('branch-switcher-popover');
    await expect(popover).toBeVisible();

    // 3. Find individual branch options
    const allOption = page.getByTestId('branch-option-all');
    await expect(allOption).toBeVisible();

    // Find the first branch "Only" button to select a single store
    const firstOnlyBtn = page.locator('[data-testid^="branch-only-"]').first();
    await expect(firstOnlyBtn).toBeVisible();
    await firstOnlyBtn.click();

    // 4. Verify trigger updates to that specific store name (not "All Branches")
    await expect(branchBtn).not.toContainText('All Branches');

    // 5. Open popover again and toggle a second branch to test multi-selection
    await branchBtn.click();
    await expect(popover).toBeVisible();

    // Click the checkbox of another branch
    const branchCheckboxes = page.locator('[data-testid^="branch-checkbox-"]');
    const checkboxCount = await branchCheckboxes.count();
    if (checkboxCount > 1) {
      // Click the second branch checkbox
      await branchCheckboxes.nth(1).click();

      // Trigger should now show "2 Branches Selected"
      await expect(branchBtn).toContainText('Branches Selected');
    }

    // 6. Reset back to "All Branches" via "All" shortcut
    const selectAllBtn = page.getByTestId('branch-btn-select-all');
    if (!(await selectAllBtn.isVisible())) {
      await branchBtn.click();
    }
    await expect(selectAllBtn).toBeVisible();
    await selectAllBtn.click();

    await expect(branchBtn).toContainText('All Branches');
  });

  test('Inventory Management dynamically scopes by branch and provides branch location selector in modal', async ({ page }) => {
    await page.goto('/admin/inventory');

    // 1. Verify Inventory Table renders Branch column
    const branchCol = page.locator('th', { hasText: 'Branch' });
    await expect(branchCol).toBeVisible();

    // 2. Header displays active branch scope chip
    const scopeBadge = page.getByTestId('inventory-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).toContainText('All Branches');

    // 3. Open Add Product modal and check Branch selection dropdown
    const addProductBtn = page.getByTestId('btn-add-product');
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    const branchSelect = page.getByTestId('select-inventory-branch');
    await expect(branchSelect).toBeVisible();

    // Verify option exists in dropdown
    const options = branchSelect.locator('option');
    expect(await options.count()).toBeGreaterThan(0);

    // Close modal
    await page.getByTestId('btn-cancel-add-inventory').click();
  });

  test('Financial Reports & Audit Ledger dynamically reflects selected branch scope', async ({ page }) => {
    await page.goto('/admin/reports');

    // 1. Active branch scope badge in reports header
    const scopeBadge = page.getByTestId('reports-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).toContainText('All Branches');

    // 2. Audit Ledger Table includes Branch column
    const ledgerTable = page.getByTestId('reports-ledger-table');
    await expect(ledgerTable).toBeVisible();
    const branchHeader = ledgerTable.locator('th', { hasText: 'Branch' });
    await expect(branchHeader).toBeVisible();

    // 3. Switch branch in switcher and verify reports badge updates
    const branchBtn = page.getByTestId('branch-switcher-btn');
    await branchBtn.click();

    const firstOnlyBtn = page.locator('[data-testid^="branch-only-"]').first();
    await firstOnlyBtn.click();

    // Scope badge in reports should no longer say "All Branches"
    await expect(scopeBadge).not.toContainText('All Branches');

    // Reset back to All Branches
    await branchBtn.click();
    await page.getByTestId('branch-btn-select-all').click();
    await expect(scopeBadge).toContainText('All Branches');
  });

  test('Lab Orders & Workshop Kanban displays branch scope badge and store location pills', async ({ page }) => {
    await page.goto('/admin/lab-orders');

    // 1. Active branch scope badge in header
    const scopeBadge = page.getByTestId('lab-orders-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).toContainText('All Branches');

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

  test('Patients Directory re-scopes by branch and shows branch badges in history', async ({ page }) => {
    await page.goto('/admin/patients');

    // 1. Active branch scope badge in header
    const scopeBadge = page.getByTestId('patients-scope-badge');
    await expect(scopeBadge).toBeVisible();
    await expect(scopeBadge).toContainText('All Branches');

    // 2. Switch branch and verify patient scope updates
    const branchBtn = page.getByTestId('branch-switcher-btn');
    await branchBtn.click();

    const firstOnlyBtn = page.locator('[data-testid^="branch-only-"]').first();
    await firstOnlyBtn.click();

    await expect(scopeBadge).not.toContainText('All Branches');

    // Reset back to All Branches
    await branchBtn.click();
    await page.getByTestId('branch-btn-select-all').click();
    await expect(scopeBadge).toContainText('All Branches');
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
