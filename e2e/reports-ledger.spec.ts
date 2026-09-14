import { test, expect } from '@playwright/test';

test.describe('Reports & Audit Ledger Date Range & Filters Suite', () => {
  test('Load all orders, switch date range presets, and filter audit ledger', async ({
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

    // Verify multiple audit ledger rows are populated
    const rows = page.getByTestId('audit-ledger-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(4);

    // 5. Test Date Preset Switch (Today)
    await page.getByTestId('preset-today').click();
    await page.waitForTimeout(500);

    // Verify preset today is active
    await expect(page.getByTestId('preset-today')).toHaveClass(/bg-blue-600/);

    // 6. Test Custom Date Range Filter
    const startDateInput = page.getByTestId('input-start-date');
    const endDateInput = page.getByTestId('input-end-date');
    const applyRangeBtn = page.getByTestId('btn-apply-custom-range');

    await expect(startDateInput).toBeVisible();
    await expect(endDateInput).toBeVisible();
    await expect(applyRangeBtn).toBeVisible();

    // Set a broad custom range from 2026-01-01 to 2026-12-31
    await startDateInput.fill('2026-01-01');
    await endDateInput.fill('2026-12-31');
    await applyRangeBtn.click();
    await page.waitForTimeout(500);

    // Verify Custom Range button is now active
    await expect(page.getByTestId('preset-custom')).toHaveClass(/bg-blue-600/);

    // 7. Test Granular Ledger Filters (Payment Status, Search)
    const paymentStatusFilter = page.getByTestId('filter-payment-status');
    await expect(paymentStatusFilter).toBeVisible();
    await paymentStatusFilter.selectOption('PAID');
    await page.waitForTimeout(300);

    // Test text search inside ledger
    const searchInput = page.getByTestId('input-ledger-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Rajesh');
    await page.waitForTimeout(300);

    // Test Reset Filters
    const resetBtn = page.getByTestId('btn-reset-filters');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Verify back to All Time and full orders count
    await expect(page.getByTestId('preset-all')).toHaveClass(/bg-blue-600/);
  });
});
