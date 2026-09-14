import { test, expect } from '@playwright/test';

test.describe('Patient and Inventory Comprehensive CRUD & UI Verification', () => {
  test('POS Quick Add Patient from POS View and select for billing', async ({ page }) => {
    // 1. Navigate to POS
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    // 2. Click "+ New Patient" button in the POS header
    const addPatientBtn = page.getByTestId('btn-pos-add-patient');
    await expect(addPatientBtn).toBeVisible({ timeout: 15000 });
    await addPatientBtn.click();

    // 3. Quick-Add modal should appear
    const modalTitle = page.locator('#quick-add-patient-title');
    await expect(modalTitle).toBeVisible();

    // 4. Fill form
    const uniqueId = Date.now().toString().slice(-4);
    const testPatientName = `POS Test Patient ${uniqueId}`;
    const testPhone = `98765${uniqueId}0`;

    await page.getByTestId('input-quick-patient-name').fill(testPatientName);
    await page.getByTestId('input-quick-patient-phone').fill(testPhone);

    // 5. Submit modal
    await page.getByTestId('btn-submit-quick-patient').click();

    // 6. Verify patient was created and selected in POS view
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    // The patient name should now appear in the POS customer bar or banner (using .first() for strict mode)
    await expect(page.locator(`text=${testPatientName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('Admin Patients Directory: Add, Edit, View History Full Sheet, and Soft Delete', async ({ page }) => {
    // 1. Navigate to /admin/patients
    await page.goto('/admin/patients');
    await page.waitForLoadState('networkidle');

    // 2. Click "+ Add Patient"
    const addBtn = page.getByTestId('btn-add-patient');
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    const uniqueId = Date.now().toString().slice(-4);
    const patientName = `Admin Patient ${uniqueId}`;
    const patientPhone = `98123${uniqueId}1`;

    // Fill form using exact testids
    await page.getByTestId('input-patient-fullname').fill(patientName);
    await page.getByTestId('input-patient-phone').fill(patientPhone);
    await page.getByTestId('input-patient-age').fill('38');
    await page.getByTestId('btn-submit-add-patient').click();

    // Verify row in table
    const patientRow = page.locator('tr', { hasText: patientName });
    await expect(patientRow).toBeVisible({ timeout: 10000 });

    // 3. Click Edit on this patient
    const editBtn = patientRow.getByTestId('btn-edit-patient');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editNameInput = page.getByTestId('input-edit-patient-fullname');
    await expect(editNameInput).toBeVisible();
    const updatedName = `${patientName} Renamed`;
    await editNameInput.fill(updatedName);
    await page.getByTestId('btn-submit-edit-patient').click();

    // Verify updated name in table
    const updatedRow = page.locator('tr', { hasText: updatedName });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });

    // 4. Click View History to check the expanded full-width sheet
    const viewBtn = updatedRow.getByTestId('btn-view-patient-history');
    await viewBtn.click();

    // Patient detail sheet opens
    const detailSheet = page.getByTestId('patient-detail-sheet');
    await expect(detailSheet).toBeVisible({ timeout: 10000 });

    // Check tabs: Click "Linked Family & Dependents" tab
    const familyTab = page.locator('button', { hasText: 'Linked Family' });
    if (await familyTab.isVisible()) {
      await familyTab.click();
      await expect(page.locator('text=No linked family members yet').or(page.locator('text=Linked Family'))).toBeVisible();
    }

    // Close sheet
    const closeBtn = detailSheet.getByTestId('btn-close-patient-sheet');
    await closeBtn.click();
    await expect(detailSheet).not.toBeVisible({ timeout: 5000 });

    // 5. Delete patient
    const deleteBtn = updatedRow.getByTestId('btn-delete-patient');
    await deleteBtn.click();

    // Confirmation dialog
    const confirmDeleteBtn = page.getByTestId('btn-confirm-delete-patient');
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
    await confirmDeleteBtn.click();

    // Verify patient is removed
    await expect(page.locator('tr', { hasText: updatedName })).not.toBeVisible({ timeout: 10000 });
  });

  test('Admin Inventory: Table responsiveness, Edit Product modal, and Delete dialog', async ({ page }) => {
    // 1. Navigate to /admin/inventory
    await page.goto('/admin/inventory');
    await page.waitForLoadState('networkidle');

    // 2. Locate an inventory row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });

    // 3. Click Edit button on the first item
    const editBtn = firstRow.getByTestId('btn-edit-inventory');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit modal should appear
    const editModalTitle = page.locator('#edit-inventory-title');
    await expect(editModalTitle).toBeVisible({ timeout: 5000 });

    // Modify SKU input with a unique tag or verify editable
    const skuInput = page.getByTestId('input-edit-inventory-sku');
    await expect(skuInput).toBeVisible();
    const currentSku = await skuInput.inputValue();
    expect(currentSku.length).toBeGreaterThan(0);

    // Close edit modal
    await page.locator('button:has-text("Cancel")').click();
    await expect(editModalTitle).not.toBeVisible();

    // 4. Click Delete button to open delete dialog
    const deleteBtn = firstRow.getByTestId('btn-delete-inventory');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify confirmation dialog opens
    const deleteDialogTitle = page.locator('#delete-inventory-dialog-title');
    await expect(deleteDialogTitle).toBeVisible({ timeout: 5000 });

    // Cancel deletion so we preserve test inventory data
    await page.locator('button:has-text("Cancel")').click();
    await expect(deleteDialogTitle).not.toBeVisible();
  });
});
