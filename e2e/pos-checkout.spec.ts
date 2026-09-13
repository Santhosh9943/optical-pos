import { test, expect } from '@playwright/test';

test.describe('POS Core Workflows & Zero-Regression Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to POS new billing view
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');
  });

  test('Test Case 1: SPA State Persistence across Route Navigation', async ({ page }) => {
    // 1. Search and select a patient
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('Rajesh');

    // Wait for dropdown to populate and select Rajesh Kumar
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // Verify patient is selected in the UI card
    await expect(page.locator('text=Rajesh Kumar').first()).toBeVisible();
    await expect(page.locator('text=9876543210').first()).toBeVisible();

    // 2. Add an item to the cart (using direct + Frame Only button)
    const inventorySearch = page.getByTestId('inventory-search-input');
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('Ray-Ban');

    // Select the Ray-Ban frame from results
    const inventoryOption = page.locator('li', { hasText: 'FRM-RB-2140-BLK' });
    await expect(inventoryOption).toBeVisible({ timeout: 10000 });
    const frameOnlyBtn = inventoryOption.getByRole('button', { name: '+ Frame Only' });
    if (await frameOnlyBtn.isVisible()) {
      await frameOnlyBtn.click();
    } else {
      await inventoryOption.click();
    }

    // Assert item is in the cart
    await expect(page.locator('text=FRM-RB-2140-BLK').first()).toBeVisible();
    await expect(page.getByTestId('item-quantity-input').first()).toHaveValue('1');

    // 3. Click the "Inventory" navigation link in the sidebar
    const inventoryNavLink = page.locator('aside a[href="/admin/inventory"]');
    await inventoryNavLink.click();

    // Verify URL changed to /admin/inventory
    await expect(page).toHaveURL(/\/admin\/inventory/);
    await expect(page.locator('text=Inventory Management').first()).toBeVisible({ timeout: 10000 });

    // 4. Click the "Billing (POS)" navigation link in the sidebar
    const billingNavLink = page.locator('aside a[href="/pos/new-bill"]');
    await billingNavLink.click();

    // Verify URL changed back to /pos/new-bill
    await expect(page).toHaveURL(/\/pos\/new-bill/);

    // 5. Assert that the previously selected patient and cart items are STILL present in the UI (Zustand state survived)
    await expect(page.locator('text=Rajesh Kumar').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=9876543210').first()).toBeVisible();
    await expect(page.locator('text=FRM-RB-2140-BLK').first()).toBeVisible();
    await expect(page.getByTestId('item-quantity-input').first()).toHaveValue('1');
  });

  test('Test Case 2: Atomic Inventory Lock (Insufficient Stock)', async ({ page }) => {
    // 1. Select a patient so checkout button is enabled
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('9876543210');

    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Add an item to the cart (using direct + Frame Only)
    const inventorySearch = page.getByTestId('inventory-search-input');
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('Titan');

    const inventoryOption = page.locator('li', { hasText: 'FRM-TI-5001-GLD' });
    await expect(inventoryOption).toBeVisible({ timeout: 10000 });
    const frameOnlyBtn = inventoryOption.getByRole('button', { name: '+ Frame Only' });
    if (await frameOnlyBtn.isVisible()) {
      await frameOnlyBtn.click();
    } else {
      await inventoryOption.click();
    }

    const qtyInput = page.getByTestId('item-quantity-input').first();
    await expect(qtyInput).toBeVisible();
    await expect(qtyInput).toHaveValue('1');

    // 3. Force the quantity input to 9999 (guaranteed to exceed available stock of 8)
    await qtyInput.fill('9999');
    await expect(qtyInput).toHaveValue('9999');

    // 4. Click "Complete Order"
    const completeOrderBtn = page.getByRole('button', { name: /Complete Order/i });
    await expect(completeOrderBtn).toBeEnabled();
    await completeOrderBtn.click();

    // 5. Assert that the UI displays a clear error toast/message ("Insufficient stock")
    const errorToast = page.locator('text=/Insufficient stock/i').first();
    await expect(errorToast).toBeVisible({ timeout: 10000 });

    // 6. Assert cart is NOT cleared
    await expect(qtyInput).toBeVisible();
    await expect(qtyInput).toHaveValue('9999');
    await expect(page.locator('text=FRM-TI-5001-GLD').first()).toBeVisible();
  });

  test('Test Case 3: The Family Billing UI Workflow', async ({ page }) => {
    // 1. Search a primary patient ("Rajesh")
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('Rajesh');

    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    await expect(page.locator('text=Rajesh Kumar').first()).toBeVisible();

    // 2. Click "+ Add Family Member" and create a dependent
    const addMemberBtn = page.getByTestId('add-family-member-btn');
    await expect(addMemberBtn).toBeVisible();
    await addMemberBtn.click();

    // If modal defaulted to Existing Family members, click + Create New Member tab
    const createNewTab = page.getByTestId('tab-create-new-member');
    if (await createNewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createNewTab.click();
    }

    // Fill in family member name
    const memberNameInput = page.getByTestId('family-member-name-input');
    await expect(memberNameInput).toBeVisible({ timeout: 5000 });
    await memberNameInput.fill('Sneha Kumar');

    // Submit dependent form
    const submitMemberBtn = page.getByTestId('add-family-member-submit');
    await submitMemberBtn.click();

    // 3. Assert that the Clinical Matrix UI now renders two distinct tabs (one for Rajesh, one for the dependent)
    const rajeshTab = page.locator('[role="tab"], [data-testid="rx-patient-tab"]').filter({ hasText: 'Rajesh' });
    const snehaTab = page.locator('[role="tab"], [data-testid="rx-patient-tab"]').filter({ hasText: 'Sneha' });

    await expect(rajeshTab.first()).toBeVisible({ timeout: 10000 });
    await expect(snehaTab.first()).toBeVisible({ timeout: 10000 });

    // 4. Enter OD/OS values into the dependent's tab
    await snehaTab.first().click();

    const odSphereInput = page.getByTestId('od-sphere-input');
    await expect(odSphereInput).toBeVisible();
    await odSphereInput.fill('-1.50');
    await odSphereInput.blur();

    const osSphereInput = page.getByTestId('os-sphere-input');
    await expect(osSphereInput).toBeVisible();
    await osSphereInput.fill('-2.00');
    await osSphereInput.blur();

    await expect(odSphereInput).toHaveValue('-1.50');
    await expect(osSphereInput).toHaveValue('-2.00');

    // 5. Add a lens to the cart and assert the presence of the "Assign to Patient:" dropdown
    const inventorySearch = page.getByTestId('inventory-search-input');
    await inventorySearch.fill('Crizal');

    const lensOption = page.locator('li', { hasText: 'LENS-SV-CR39-AR' });
    await expect(lensOption).toBeVisible({ timeout: 10000 });
    await lensOption.click();

    // Assert the presence of the "Assign to Patient:" dropdown
    const assignDropdownLabel = page.locator('text=Assign to Patient:').first();
    await expect(assignDropdownLabel).toBeVisible({ timeout: 10000 });

    const patientSelect = page.getByRole('combobox', { name: /Assign to Patient/i }).first();
    await expect(patientSelect).toBeVisible();

    // Check options contain both Rajesh Kumar and Sneha Kumar
    await expect(patientSelect.locator('option', { hasText: 'Rajesh' })).toHaveCount(1);
    await expect(patientSelect.locator('option', { hasText: 'Sneha' })).toHaveCount(1);
  });

  test('Test Case 4: Spectacle Pair Guided Wizard (Frame -> Lens -> Power)', async ({ page }) => {
    // 1. Select a patient
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('Rajesh');

    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Search for a Frame and click on the item row to trigger the Spectacle Wizard
    const inventorySearch = page.getByTestId('inventory-search-input');
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('Ray-Ban');

    const frameItem = page.locator('li', { hasText: 'FRM-RB-2140-BLK' });
    await expect(frameItem).toBeVisible({ timeout: 10000 });
    // Click the item row (which triggers onSelectFrame)
    await frameItem.click();

    // 3. Verify Spectacle Wizard Modal launches (Step 1: Frame Confirmation & Patient Assignment)
    const wizardModal = page.getByTestId('spectacle-wizard-modal');
    await expect(wizardModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=FRM-RB-2140-BLK').first()).toBeVisible();

    // Click Next to proceed to Step 2 (Lens Selection)
    const nextStepBtn = page.getByTestId('wizard-next-step-btn');
    await expect(nextStepBtn).toBeVisible();
    await page.waitForTimeout(300);
    await nextStepBtn.click();

    // 4. Verify Step 2: Choose Lens Type & Coatings
    await expect(page.locator('text=/Step 2 of 3/i').first()).toBeVisible({ timeout: 5000 });
    // Select Blue-Cut Digital lens
    const blueCutOption = page.locator('button', { hasText: 'Blue-Cut Digital' });
    if (await blueCutOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await blueCutOption.click();
    }

    // Click Next to proceed to Step 3 (Assign Power)
    const nextToStep3 = page.getByRole('button', { name: /Next: Assign Power/i });
    await expect(nextToStep3).toBeVisible({ timeout: 5000 });
    await nextToStep3.click();

    // 5. Verify Step 3: Refraction Power assignment
    await expect(page.locator('text=/Step 3 of 3/i').first()).toBeVisible({ timeout: 5000 });

    // Confirm and Add Spectacle Pair to Cart
    const confirmBtn = page.getByTestId('confirm-spectacle-pair-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 6. Assert that both Frame and Custom Lens are added to the Invoice Cart
    await expect(page.locator('text=FRM-RB-2140-BLK').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/LENS-BLUE|Blue-Cut/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Test Case 5: Link Existing Patient to Family Account via Modal Search', async ({ page }) => {
    // 1. Search and select primary patient ("Rajesh")
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('Rajesh');

    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    await expect(page.locator('text=Rajesh Kumar').first()).toBeVisible();

    // 2. Open Add Family Member Modal
    const addMemberBtn = page.getByTestId('add-family-member-btn');
    await expect(addMemberBtn).toBeVisible();
    await addMemberBtn.click();

    // 3. Switch to "Link Existing Patient" tab
    const linkTab = page.getByTestId('tab-link-existing-member');
    await expect(linkTab).toBeVisible({ timeout: 5000 });
    await linkTab.click();

    // 4. Search for an existing customer in DB (e.g. Priya)
    const searchExistingInput = page.getByTestId('search-existing-patient-input');
    await expect(searchExistingInput).toBeVisible({ timeout: 5000 });
    await searchExistingInput.fill('Priya');

    // Wait for search result and click "Link Member"
    const linkMemberBtn = page.getByTestId('link-existing-submit').first();
    await expect(linkMemberBtn).toBeVisible({ timeout: 10000 });
    await linkMemberBtn.click();

    // 5. Assert that the family member is linked and now appears in the Invoice Account selector
    const invoiceAcctSelect = page.getByTestId('select-invoice-account');
    await expect(invoiceAcctSelect).toBeVisible({ timeout: 10000 });
    await expect(invoiceAcctSelect).toContainText('Priya');
  });

  test('Test Case 6: Prescription History Auto-Loading & "+ Add New Power" Workflow', async ({ page }) => {
    // 1. Search and select Rajesh Kumar (existing patient)
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('Rajesh');

    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Check if prescription history view or matrix mode is displayed
    const addNewPowerBtn = page.getByTestId('btn-add-new-power');
    const matrixContainer = page.getByTestId('prescription-matrix');

    if (await addNewPowerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Patient already has previous history cards: click "+ Add New Power"
      await addNewPowerBtn.click();
      await expect(matrixContainer).toBeVisible({ timeout: 5000 });
    } else {
      // Baseline entry: matrix is already open
      await expect(matrixContainer).toBeVisible({ timeout: 5000 });
    }

    // 3. Enter OD SPH power (+1.50) using the first dioptre input
    const odSphInput = page.locator('input[placeholder="0.00"]').first();
    await odSphInput.fill('+1.50');

    // 4. Click "Save & Apply New Power"
    const saveNewPowerBtn = page.getByTestId('btn-save-new-power');
    await expect(saveNewPowerBtn).toBeVisible();
    await saveNewPowerBtn.click();

    // 5. Verify screen reloads to history view showing the newly applied power at the top
    const historyContainer = page.getByTestId('prescription-history-container');
    await expect(historyContainer).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=+1.50').first()).toBeVisible();

    // 6. Test toggling between history and matrix via "+ Add New Power" and "View History"
    await expect(page.getByTestId('btn-add-new-power')).toBeVisible();
    await page.getByTestId('btn-add-new-power').click();
    await expect(matrixContainer).toBeVisible({ timeout: 5000 });

    const backToHistoryBtn = page.getByTestId('btn-back-to-history');
    await expect(backToHistoryBtn).toBeVisible();
    await backToHistoryBtn.click();
    await expect(historyContainer).toBeVisible({ timeout: 5000 });
  });

  test('Test Case 7: Product Dispatcher [F2] 6-Category Workflows (Lens Only & Sunglasses Direct Add)', async ({ page }) => {
    // 1. Select patient
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('9876543210');
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Open Product Dispatcher via "+ Add Product [F2]"
    const addProductBtn = page.getByTestId('add-product-btn');
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // Verify all 6 category dispatch buttons are visible
    await expect(page.getByTestId('category-btn-power_glasses')).toBeVisible();
    await expect(page.getByTestId('category-btn-blue_cut')).toBeVisible();
    await expect(page.getByTestId('category-btn-sunglasses')).toBeVisible();
    await expect(page.getByTestId('category-btn-contact_lenses')).toBeVisible();
    await expect(page.getByTestId('category-btn-lens_only')).toBeVisible();
    await expect(page.getByTestId('category-btn-frame_only')).toBeVisible();

    // 3. Execute "Lens Only (Customer's Own Frame)" Workflow
    await page.getByTestId('category-btn-lens_only').click();

    // Fill customer frame details & notes
    const frameMakeInput = page.getByTestId('input-customer-frame-make');
    await expect(frameMakeInput).toBeVisible();
    await frameMakeInput.fill('Titan Edge Gold Rimless');

    const frameNotesInput = page.getByTestId('input-customer-frame-notes');
    await frameNotesInput.fill('Patient own frame; rimless groove fitting');

    const lensPriceInput = page.getByTestId('input-lens-only-price');
    await lensPriceInput.fill('1500.00');

    // Confirm addition
    const confirmLensOnlyBtn = page.getByTestId('btn-confirm-lens-only');
    await confirmLensOnlyBtn.click();

    // Assert cart has ₹0.00 Customer Frame and ₹1500.00 Lens
    await expect(page.locator('text=CUST-FRAME').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=₹0.00').first()).toBeVisible();
    await expect(page.locator('text=₹1500.00').first()).toBeVisible();

    // 4. Execute "Sunglasses" 1-Click Direct Add Workflow
    await addProductBtn.click();
    await page.getByTestId('category-btn-sunglasses').click();

    // Check sunglasses catalog and click 1-Click Add
    const directAddSunglassBtn = page.getByTestId('btn-add-sunglass-direct').first();
    await expect(directAddSunglassBtn).toBeVisible({ timeout: 10000 });
    await directAddSunglassBtn.click();

    // Verify sunglasses added to cart
    await expect(page.locator('text=UV400').first()).toBeVisible({ timeout: 5000 });
  });

  test('Test Case 8: Cart Item Detail Inspector & Invoice Custom Details Override', async ({ page }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

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

    // 3. Click Edit on the cart item
    const editCartItemBtn = page.getByTestId('edit-cart-item-btn').first();
    await expect(editCartItemBtn).toBeVisible({ timeout: 5000 });
    await editCartItemBtn.click({ force: true });

    // In CartItemEditModal, update line discount
    const discountInput = page.getByTestId('edit-cart-item-discount');
    await expect(discountInput).toBeVisible();
    await discountInput.fill('500');

    // Save changes
    const saveCartItemBtn = page.getByTestId('btn-save-cart-item-edit');
    await saveCartItemBtn.click();

    // Verify Cart Total Discount reflects ₹500
    await expect(page.locator('text=−₹500.00').first()).toBeVisible({ timeout: 5000 });

    // 4. Click "Edit Invoice Details"
    const editInvoiceBtn = page.getByTestId('edit-invoice-details-btn');
    await expect(editInvoiceBtn).toBeVisible();
    await editInvoiceBtn.click();

    // In InvoiceDetailsModal, fill corporate billing details
    const billingNameInput = page.getByTestId('input-invoice-billing-name');
    await expect(billingNameInput).toBeVisible();
    await billingNameInput.fill('Kumar Optical Enterprises');

    const gstinInput = page.getByTestId('input-invoice-gstin');
    await gstinInput.fill('33AABCK1234F1Z5');

    const notesInput = page.getByTestId('input-invoice-notes');
    await notesInput.fill('Urgent Delivery requested for Monday');

    // Save invoice details
    const saveInvoiceBtn = page.getByTestId('btn-save-invoice-details');
    await saveInvoiceBtn.click();
    await expect(page.locator('text=Invoice & Billing Customer Details')).not.toBeVisible();

    // Verify invoice summary reflects the customized name and GSTIN
    await expect(page.locator('text=Kumar Optical Enterprises').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=GSTIN: 33AABCK1234F1Z5').first()).toBeVisible();

    // 5. Complete Order Checkout
    const completeOrderBtn = page.getByTestId('btn-complete-order');
    await expect(completeOrderBtn).toBeEnabled();
    await completeOrderBtn.scrollIntoViewIfNeeded();
    await completeOrderBtn.click();

    // 6. Verify Completed Order modal and print triggers
    await expect(page.locator('text=Order Successfully Completed').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Print Thermal Receipt")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Print A4 Invoice")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Print Lab Slip")').first()).toBeVisible();
  });

  test('Test Case 9: Clean Patient Loading, Existing Family Member Addition & POS Purchase History', async ({ page }) => {
    // 1. Search and select primary patient ("Rajesh")
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('Rajesh');

    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // 2. Assert clean single-customer load (only Rajesh is on this order, no bulk clutter)
    await expect(page.locator('text=Rajesh Kumar').first()).toBeVisible({ timeout: 10000 });
    // "Family Members on this Order" should NOT appear when only 1 member is on order
    await expect(page.locator('text=Family Members on this Order')).not.toBeVisible();

    // Verify "Patient & Family Profile" header title was removed
    await expect(page.locator('text=Patient & Family Profile')).not.toBeVisible();

    // Verify Invoice Account select is disabled when only 1 member is on order
    const invoiceAcctSelect = page.getByTestId('select-invoice-account');
    await expect(invoiceAcctSelect).toBeVisible();
    await expect(invoiceAcctSelect).toBeDisabled();

    // 3. Test Purchase Order History Tab
    const purchaseHistoryBtn = page.getByTestId('btn-patient-past-purchases');
    await expect(purchaseHistoryBtn).toBeVisible({ timeout: 5000 });
    await purchaseHistoryBtn.click();

    // Verify Purchase History panel is active and lists past invoices
    await expect(page.locator('text=/Purchase Invoices for Rajesh Kumar/i').first()).toBeVisible({ timeout: 10000 });

    // 4. Switch back to Clinical Refraction Tab
    const rxTabBtn = page.getByTestId('tab-view-clinical-power');
    await expect(rxTabBtn).toBeVisible();
    await rxTabBtn.click();
    await expect(page.locator('text=/Prescription History|Clinical Refraction/i').first()).toBeVisible();

    // 5. Click "+ Add Family Member" and add an existing linked family member to the current order
    const addMemberBtn = page.getByTestId('add-family-member-btn');
    await expect(addMemberBtn).toBeVisible();
    await addMemberBtn.click();

    // Check if existing linked members tab is present
    const existingFamilyTab = page.getByTestId('tab-existing-family-members');
    if (await existingFamilyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await existingFamilyTab.click();
      const addToOrderBtn = page.getByTestId('btn-add-existing-to-order').first();
      if (await addToOrderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addToOrderBtn.click();
        // Assert that Family Members on this Order is never rendered
        await expect(page.locator('text=Family Members on this Order')).not.toBeVisible();

        // Verify Invoice Account select is now ENABLED because >1 member is in family
        await expect(invoiceAcctSelect).toBeEnabled();

        // Switch invoice account to the second member
        const options = await invoiceAcctSelect.locator('option').all();
        if (options.length > 1) {
          const secondMemberVal = await options[1].getAttribute('value');
          if (secondMemberVal) {
            await invoiceAcctSelect.selectOption(secondMemberVal);
            await expect(invoiceAcctSelect).toHaveValue(secondMemberVal);
          }
        }
      }
    }
  });

  test('Test Case 10: Dependent Phone Architecture & Family Links in Patient Detail Sheet', async ({ page }) => {
    // 1. Navigate to /admin/patients
    await page.goto('/admin/patients');
    await page.waitForLoadState('networkidle');

    // 2. Click on a patient row (e.g., Rajesh Kumar) to open the Patient Detail Sheet
    const patientRow = page.locator('tr', { hasText: 'Rajesh Kumar' }).first();
    await expect(patientRow).toBeVisible({ timeout: 10000 });
    const viewBtn = patientRow.locator('[data-testid="btn-view-patient-history"]');
    if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewBtn.click();
    } else {
      await patientRow.click();
    }

    // 3. Verify Patient Detail Sheet is open
    await expect(page.locator('text=Clinical History & Profile').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Rajesh Kumar').first()).toBeVisible();

    // 4. Verify Tab 3 ("Linked Family") displays connected family accounts with segregated phone info
    const familyTab = page.getByTestId('tab-family-history');
    await expect(familyTab).toBeVisible({ timeout: 5000 });
    await familyTab.click();

    await expect(page.locator('text=Connected Family Members').first()).toBeVisible({ timeout: 5000 });

    // 5. Close sheet via ESC key or close button
    const closeSheetBtn = page.getByRole('button', { name: /Close sheet/i }).first();
    if (await closeSheetBtn.isVisible().catch(() => false)) {
      await closeSheetBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await expect(page.locator('text=Clinical History & Profile')).not.toBeVisible({ timeout: 5000 });
  });
});

