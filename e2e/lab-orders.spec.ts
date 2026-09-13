import { test, expect } from '@playwright/test';

test.describe('Stage 7: Lab Order & Workshop Management E2E Suite', () => {
  test('Track and update customer order status in Lab Orders dashboard', async ({ page }) => {
    // 1. Navigate to /admin/lab-orders
    await page.goto('/admin/lab-orders');
    await page.waitForLoadState('networkidle');

    // 2. Verify page header and status tabs/columns
    await expect(page.locator('h1:has-text("Lab Order & Workshop Management")')).toBeVisible({
      timeout: 10000,
    });

    // Verify presence of status tabs
    await expect(page.getByTestId('tab-all')).toBeVisible();
    await expect(page.getByTestId('tab-ordered')).toBeVisible();
    await expect(page.getByTestId('tab-in-fitting')).toBeVisible();
    await expect(page.getByTestId('tab-ready')).toBeVisible();
    await expect(page.getByTestId('tab-completed')).toBeVisible();

    // Verify Kanban columns
    await expect(page.locator('text=1. Action Required')).toBeVisible();
    await expect(page.locator('text=2. At Lab / In Fitting')).toBeVisible();
    await expect(page.locator('text=3. Ready for Pickup')).toBeVisible();
    await expect(page.locator('text=4. Completed')).toBeVisible();

    // 3. Find an active test order and click status update to move it to READY_FOR_COLLECTION
    // We locate an order card in the Action Required or In Fitting column
    const orderCard = page.getByTestId('order-card').first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });

    // Read the invoice number from this card to track it
    const invoiceNumText = await orderCard.locator('.font-mono').first().innerText();
    expect(invoiceNumText).toBeTruthy();

    // Find the "Mark Ready" button or use the status select dropdown
    const markReadyBtn = orderCard.getByTestId('btn-mark-ready');
    if (await markReadyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await markReadyBtn.click();
    } else {
      const statusSelect = orderCard.getByTestId('select-order-status');
      await statusSelect.selectOption('READY_FOR_COLLECTION');
    }

    // 4. Assert that the UI successfully reflects the new status
    // Verify toast or updated card status badge
    await expect(
      page.locator(`text=${invoiceNumText}`).first()
    ).toBeVisible({ timeout: 5000 });

    // The order should now be reflected with Ready for Pickup / READY_FOR_COLLECTION
    const updatedCard = page.locator('[data-testid="order-card"]', {
      hasText: invoiceNumText,
    });
    await expect(updatedCard).toBeVisible();
    await expect(updatedCard.getByTestId('select-order-status')).toHaveValue(
      'READY_FOR_COLLECTION'
    );

    // 5. Verify Workshop Lab Slip Modal
    const labSlipBtn = updatedCard.getByTestId('btn-view-lab-slip');
    await expect(labSlipBtn).toBeVisible();
    await labSlipBtn.click();

    // Verify modal opened with fabrication order details
    const modal = page.getByTestId('lab-slip-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(
      modal.locator('text=OPTICAL WORKSHOP FABRICATION ORDER').first()
    ).toBeVisible();
    await expect(modal.locator(`text=JOB #${invoiceNumText}`).first()).toBeVisible();

    // Close modal
    const closeBtn = modal.getByTestId('btn-close-lab-slip');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // 6. Verify Table List view mode
    const tableViewBtn = page.getByTestId('view-toggle-table');
    await tableViewBtn.click();

    // Verify table row for this order exists
    const orderRow = page.locator('tr[data-testid="order-row"]', {
      hasText: invoiceNumText,
    });
    await expect(orderRow).toBeVisible();
    await expect(orderRow.getByTestId('order-status-badge')).toContainText(
      'Ready for Pickup'
    );

    // 7. Verify Navigation from Sidebar
    const navLabLink = page.getByTestId('nav-lab-orders');
    await expect(navLabLink).toBeVisible();
  });
});
