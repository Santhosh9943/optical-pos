import { test, expect } from '@playwright/test';

test.describe('Reports & Audit Ledger Date Range, Scrolling & Pagination Suite', () => {
  test('Load all orders, switch date range presets, scroll ledger, and paginate', async ({
    page,
  }) => {
    // 1. Navigate to /admin/reports
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');

    // 2. Verify page header
    await expect(
      page.locator('h1:has-text("Financial Reports & Order Audit Ledger")')
    ).toBeVisible({ timeout: 15000 });

    // 3. Verify Preset Buttons exist
    await expect(page.getByTestId('preset-all')).toBeVisible();
    await expect(page.getByTestId('preset-today')).toBeVisible();
    await expect(page.getByTestId('preset-yesterday')).toBeVisible();
    await expect(page.getByTestId('preset-7days')).toBeVisible();
    await expect(page.getByTestId('preset-month')).toBeVisible();
    await expect(page.getByTestId('preset-custom')).toBeVisible();

    // 4. In All Time preset (default), verify total orders is greater than 4 (shows complete ledger)
    const metricOrders = page.getByTestId('total-orders-metric');
    await expect(metricOrders).toBeVisible();
    const totalCountText = await metricOrders.innerText();
    const countNum = parseInt(totalCountText, 10);
    expect(countNum).toBeGreaterThan(4);

    // 5. Test Pagination Controls: Change Rows Per Page to 5
    const pageSizeSelect = page.getByTestId('select-page-size');
    await expect(pageSizeSelect).toBeVisible();
    await pageSizeSelect.selectOption('5');
    await page.waitForTimeout(300);

    // Assert that exactly 5 rows are displayed on page 1
    let rows = page.getByTestId('audit-ledger-row');
    expect(await rows.count()).toBe(5);

    // Click Next Page button
    const nextBtn = page.getByTestId('btn-next-page');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Assert that page 2 is active and displays 5 rows
    await expect(page.locator('text=/Page 2 of/i')).toBeVisible();
    rows = page.getByTestId('audit-ledger-row');
    expect(await rows.count()).toBe(5);

    // Click Prev Page button
    const prevBtn = page.getByTestId('btn-prev-page');
    await expect(prevBtn).toBeEnabled();
    await prevBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=/Page 1 of/i')).toBeVisible();

    // Switch Rows Per Page to "All"
    await pageSizeSelect.selectOption('-1');
    await page.waitForTimeout(300);

    // Assert that more than 4 (all available) rows are now displayed in the scrollable table
    rows = page.getByTestId('audit-ledger-row');
    expect(await rows.count()).toBeGreaterThan(4);

    // 7. Test Toggle Summary Cards (Collapse / Expand)
    const toggleSummaryBtn = page.getByTestId('btn-toggle-summary');
    await expect(toggleSummaryBtn).toBeVisible();
    await toggleSummaryBtn.click();
    await page.waitForTimeout(200);

    // Assert summary cards are hidden in compact view
    await expect(page.getByTestId('total-orders-metric')).not.toBeVisible();

    // Toggle back to full view
    await toggleSummaryBtn.click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('total-orders-metric')).toBeVisible();

    // 8. Test Date Preset Switch (Today)
    await page.getByTestId('preset-today').click();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('preset-today')).toHaveClass(/bg-blue-600/);

    // 9. Test Custom Date Range Filter (Clicking Custom Range opens popover)
    await page.getByTestId('preset-custom').click();
    await page.waitForTimeout(200);

    const startDateInput = page.getByTestId('input-start-date');
    const endDateInput = page.getByTestId('input-end-date');
    const applyRangeBtn = page.getByTestId('btn-apply-custom-range');

    await expect(startDateInput).toBeVisible();
    await expect(endDateInput).toBeVisible();
    await expect(applyRangeBtn).toBeVisible();

    // Set custom range
    await startDateInput.fill('2026-01-01');
    await endDateInput.fill('2026-12-31');
    await applyRangeBtn.click();
    await page.waitForTimeout(500);

    // Verify Custom Range button is now active
    await expect(page.getByTestId('preset-custom')).toHaveClass(/bg-blue-600/);

    // 10. Test Reset Filters
    const resetBtn = page.getByTestId('btn-reset-filters');
    if (await resetBtn.isVisible().catch(() => false)) {
      await resetBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByTestId('preset-all')).toHaveClass(/bg-blue-600/);
    }
  });
});
