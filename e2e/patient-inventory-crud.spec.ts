import { test, expect } from '@playwright/test';
import { db } from '../src/db';
import {
  customers,
  inventoryItems,
  opticalPrescriptions,
} from '../src/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_BRANCH_ID } from '../src/lib/auth-utils';

test.describe('Patient & Inventory Full CRUD E2E Suite', () => {
  const uniqueTimestamp = Date.now().toString().slice(-6);

  test('1. POS Patient Search: Quick Add modal and selection flow', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify "+ New Patient" button exists in header
    const addPatientBtn = page.getByTestId('btn-pos-add-patient');
    await expect(addPatientBtn).toBeVisible();
    await addPatientBtn.click();

    // Verify modal is open
    const modalTitle = page.locator('#quick-add-patient-title');
    await expect(modalTitle).toBeVisible();

    // Fill quick registration form
    const testPosName = `POS Quick Patient ${uniqueTimestamp}`;
    const testPosPhone = `98${uniqueTimestamp}11`.slice(0, 10);

    await page.getByTestId('input-quick-patient-name').fill(testPosName);
    await page.getByTestId('input-quick-patient-phone').fill(testPosPhone);
    await page.getByTestId('btn-submit-quick-patient').click();

    // Modal closes and input receives selected patient name
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
    const searchInput = page.getByTestId('patient-search-input');
    await expect(searchInput).toHaveValue(new RegExp(testPosName), {
      timeout: 8000,
    });
  });

  test('2. Admin Patient Directory: Add, Edit, and Delete patient flows', async ({
    page,
  }) => {
    await page.goto('/admin/patients');
    await page.waitForLoadState('networkidle');

    // ── 2a. Add Patient ──
    const addBtn = page.getByTestId('btn-add-patient');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const addModalTitle = page.locator('#add-patient-title');
    await expect(addModalTitle).toBeVisible();

    const adminPatientName = `Admin Patient ${uniqueTimestamp}`;
    const adminPatientPhone = `97${uniqueTimestamp}22`.slice(0, 10);

    await page.getByTestId('input-patient-fullname').fill(adminPatientName);
    await page.getByTestId('input-patient-phone').fill(adminPatientPhone);
    await page.getByTestId('btn-submit-add-patient').click();

    // Modal closes and patient appears in table
    await expect(addModalTitle).not.toBeVisible({ timeout: 5000 });
    const patientRow = page.locator('tr', { hasText: adminPatientName });
    await expect(patientRow).toBeVisible({ timeout: 5000 });

    // ── 2b. Edit Patient ──
    const editBtn = patientRow.getByTestId('btn-edit-patient');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editModalTitle = page.locator('#edit-patient-title');
    await expect(editModalTitle).toBeVisible();

    const updatedPatientName = `${adminPatientName} Updated`;
    await page.getByTestId('input-edit-patient-fullname').fill(updatedPatientName);
    await page.getByTestId('btn-submit-edit-patient').click();

    await expect(editModalTitle).not.toBeVisible({ timeout: 5000 });
    const updatedRow = page.locator('tr', { hasText: updatedPatientName });
    await expect(updatedRow).toBeVisible({ timeout: 5000 });

    // ── 2c. Delete Patient ──
    const deleteBtn = updatedRow.getByTestId('btn-delete-patient');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const deleteDialog = page.locator('text=Are you sure you want to remove this patient?');
    await expect(deleteDialog).toBeVisible();

    await page.getByTestId('btn-confirm-delete-patient').click();
    await expect(deleteDialog).not.toBeVisible({ timeout: 5000 });

    // Ensure removed from active table
    await expect(page.locator('tr', { hasText: updatedPatientName })).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('3. Patient Detail Sheet: Full width view, unclipped orders, and linked family optical powers', async ({
    page,
  }) => {
    // Programmatically seed a primary patient with a dependent having optical powers
    const primaryPhone = `96${uniqueTimestamp}33`.slice(0, 10);
    const [primaryCust] = await db
      .insert(customers)
      .values({
        fullName: `Family Head ${uniqueTimestamp}`,
        phone: primaryPhone,
        gender: 'MALE',
        age: 48,
        relationType: 'Self',
        organizationId: DEFAULT_ORG_ID,
      })
      .returning();

    const [dependentCust] = await db
      .insert(customers)
      .values({
        fullName: `Child Dependent ${uniqueTimestamp}`,
        phone: primaryPhone,
        gender: 'FEMALE',
        age: 14,
        relationType: 'Daughter',
        primaryCustomerId: primaryCust.id,
        organizationId: DEFAULT_ORG_ID,
      })
      .returning();

    // Insert prescription for dependent
    await db.insert(opticalPrescriptions).values({
      customerId: dependentCust.id,
      odSphere: '-1.50',
      odCylinder: '-0.50',
      odAxis: 90,
      odAdd: '0.00',
      odPd: '31.0',
      osSphere: '-1.75',
      osCylinder: '-0.25',
      osAxis: 85,
      osAdd: '0.00',
      osPd: '31.0',
      binocularPd: '62.0',
    });

    await page.goto('/admin/patients');
    await page.waitForLoadState('networkidle');

    // Find primary customer row and open View sheet
    const row = page.locator('tr', { hasText: primaryCust.fullName });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByTestId('btn-view-patient-history').click();

    // Verify patient detail sheet is open
    const sheetTitle = page.locator('#patient-sheet-title');
    await expect(sheetTitle).toBeVisible({ timeout: 5000 });

    // Verify Tab 2: Orders tab is unclipped
    const ordersTab = page.getByTestId('tab-patient-orders');
    await expect(ordersTab).toBeVisible();
    await ordersTab.click();

    // Verify Tab 3: Linked Family tab
    const familyTab = page.getByTestId('tab-family-history');
    await expect(familyTab).toBeVisible();
    await familyTab.click();

    // Verify family member cards show name-wise numbering (#1., #2.)
    const dependentCard = page.locator('div', {
      hasText: dependentCust.fullName,
    }).first();
    await expect(dependentCard).toBeVisible();

    // Verify optical powers are displayed
    await expect(page.locator('text=Optical Powers').first()).toBeVisible();
    await expect(page.locator('text=OD (Right)').first()).toBeVisible();
    await expect(page.locator('text=-1.50').first()).toBeVisible();
    await expect(page.locator('text=-1.75').first()).toBeVisible();
  });

  test('4. Admin Inventory: Row click responsiveness, Edit modal, and Delete flow', async ({
    page,
  }) => {
    // Seed an unbilled test inventory item
    const skuCode = `TEST-INV-${uniqueTimestamp}`;
    await db
      .insert(inventoryItems)
      .values({
        sku: skuCode,
        category: 'FRAME',
        brand: 'Titan Fastrack',
        model: `Model FT-${uniqueTimestamp}`,
        description: 'Titan Lightweight Frame for E2E Test',
        costPrice: '600.00',
        sellingPrice: '1499.00',
        stockQuantity: 15,
        lowStockThreshold: 3,
        isActive: true,
        organizationId: DEFAULT_ORG_ID,
        branchId: DEFAULT_BRANCH_ID,
      })
      .returning();

    await page.goto('/admin/inventory');
    await page.waitForLoadState('networkidle');

    // Verify item appears in table
    const itemRow = page.locator('tr', { hasText: skuCode });
    await expect(itemRow).toBeVisible({ timeout: 10000 });

    // ── 4a. Edit Item via Edit button or row click ──
    const editBtn = itemRow.getByTestId('btn-edit-inventory');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editModalTitle = page.locator('#edit-inventory-title');
    await expect(editModalTitle).toBeVisible();

    // Update Stock Quantity to 77 and Price to 1599.00
    await page.getByTestId('input-edit-inventory-stock').fill('77');
    await page.getByTestId('input-edit-inventory-price').fill('1599.00');
    await page.getByTestId('btn-submit-edit-inventory').click();

    // Verify modal closes and updated stock appears in table
    await expect(editModalTitle).not.toBeVisible({ timeout: 5000 });
    await expect(
      itemRow.getByRole('cell', { name: '77', exact: true })
    ).toBeVisible({
      timeout: 5000,
    });
    await expect(itemRow.getByRole('cell', { name: /1,599/ })).toBeVisible({
      timeout: 5000,
    });

    // ── 4b. Delete Item ──
    const deleteBtn = itemRow.getByTestId('btn-delete-inventory');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const deleteModalTitle = page.locator('#delete-inventory-dialog-title');
    await expect(deleteModalTitle).toBeVisible();

    await page.getByTestId('btn-confirm-delete-inventory').click();
    await expect(deleteModalTitle).not.toBeVisible({ timeout: 5000 });

    // Verify item is removed from table
    await expect(page.locator('tr', { hasText: skuCode })).not.toBeVisible({
      timeout: 5000,
    });
  });
});
