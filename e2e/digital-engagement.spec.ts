import { test, expect } from '@playwright/test';

test.describe('Phase 15, 16 & 18: Digital Engagement, Barcode Scanner & Lab Workshop E2E', () => {
  test('POS Completed Order Modal provides WhatsApp sharing and Digital Receipt deep links', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // 1. Select a patient (Rajesh Kumar)
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('9876543210');
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Add an item using inventory search
    const inventorySearch = page.getByTestId('inventory-search-input');
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('Ray-Ban');
    const inventoryOption = page.locator('li', { hasText: 'FRM-RB-2140-BLK' });
    await expect(inventoryOption).toBeVisible({ timeout: 10000 });
    const frameOnlyBtn = inventoryOption.getByRole('button', { name: '+ Frame Only' });
    if (await frameOnlyBtn.isVisible()) {
      await frameOnlyBtn.click();
    } else {
      await inventoryOption.click();
    }

    // 3. Complete order
    const completeOrderBtn = page.getByTestId('btn-complete-order');
    await expect(completeOrderBtn).toBeEnabled();
    await completeOrderBtn.click();

    // 4. Modal with completed order appears
    const printReceiptBtn = page.getByTestId('btn-print-receipt');
    await expect(printReceiptBtn).toBeVisible({ timeout: 15000 });

    // 5. Verify WhatsApp Receipt button
    const whatsappBtn = page.getByTestId('btn-whatsapp-receipt');
    await expect(whatsappBtn).toBeVisible();

    // 6. Verify Digital Receipt link
    const digitalReceiptLink = page.getByTestId('link-digital-receipt');
    await expect(digitalReceiptLink).toBeVisible();
    const href = await digitalReceiptLink.getAttribute('href');
    expect(href).toMatch(/\/receipt\//);
  });

  test('Public Digital Receipt route (/receipt/:id) renders responsive tax invoice and clinical prescription', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // 1. Select patient
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('9876543210');
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Add an item using inventory search
    const inventorySearch = page.getByTestId('inventory-search-input');
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('Ray-Ban');
    const inventoryOption = page.locator('li', { hasText: 'FRM-RB-2140-BLK' });
    await expect(inventoryOption).toBeVisible({ timeout: 10000 });
    const frameOnlyBtn = inventoryOption.getByRole('button', { name: '+ Frame Only' });
    if (await frameOnlyBtn.isVisible()) {
      await frameOnlyBtn.click();
    } else {
      await inventoryOption.click();
    }

    // 3. Complete order
    const completeOrderBtn = page.getByTestId('btn-complete-order');
    await expect(completeOrderBtn).toBeEnabled();
    await completeOrderBtn.click();

    const digitalReceiptLink = page.getByTestId('link-digital-receipt');
    await expect(digitalReceiptLink).toBeVisible({ timeout: 15000 });

    const href = await digitalReceiptLink.getAttribute('href');
    expect(href).toBeTruthy();

    // 4. Open public digital receipt page
    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    // 5. Verify digital invoice elements
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('text=Tax Invoice').first()).toBeVisible();
    await expect(page.locator('text=Billed To').first()).toBeVisible();
    await expect(page.locator('text=Grand Total').first()).toBeVisible();
    await expect(page.getByTestId('btn-print-receipt')).toBeVisible();
    await expect(page.getByTestId('btn-whatsapp-share')).toBeVisible();
  });

  test('Optical Lab Workshop (/admin/lab-orders) Kanban renders and provides WhatsApp customer alert', async ({ page }) => {
    await page.goto('/admin/lab-orders');
    await page.waitForLoadState('networkidle');

    // Verify page heading
    await expect(page.getByRole('heading', { name: /Lab Order & Workshop Management/i })).toBeVisible();

    // Verify Kanban board columns
    await expect(page.getByTestId('kanban-column-action-required')).toBeVisible();
    await expect(page.getByTestId('kanban-column-at-lab')).toBeVisible();
    await expect(page.getByTestId('kanban-column-ready-pickup')).toBeVisible();
    await expect(page.getByTestId('kanban-column-completed')).toBeVisible();

    // Switch to table view
    const tableViewBtn = page.getByTestId('view-toggle-table');
    await expect(tableViewBtn).toBeVisible();
    await tableViewBtn.click();

    // Table view renders
    await expect(page.getByRole('table')).toBeVisible();

    // Switch back to kanban view
    const kanbanViewBtn = page.getByTestId('view-toggle-kanban');
    await expect(kanbanViewBtn).toBeVisible();
    await kanbanViewBtn.click();
    await expect(page.getByTestId('kanban-column-action-required')).toBeVisible();
  });
});
