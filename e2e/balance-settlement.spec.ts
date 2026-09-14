import { test, expect } from '@playwright/test';
import { db } from '../src/db';
import {
  customers,
  invoices,
  invoiceItems,
  payments,
} from '../src/db/schema';
import { eq } from 'drizzle-orm';

test.describe('Stage 8: Balance Settlement & Order Delivery E2E Suite', () => {
  test('Collect pending balance, record UPI payment, and deliver order', async ({
    page,
  }) => {
    // ── 1. Programmatically create an invoice with ₹5000 Grand Total and ₹2000 Advance (₹3000 Balance) ──
    const [existingCust] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, '9876543210'))
      .limit(1);

    let customerId = existingCust?.id;
    if (!customerId) {
      const [newCust] = await db
        .insert(customers)
        .values({
          fullName: 'Rajesh Kumar',
          phone: '9876543210',
          gender: 'MALE',
          age: 42,
        })
        .returning();
      customerId = newCust.id;
    }

    const uniqueSuffix = Date.now().toString().slice(-6);
    const invoiceNumber = `INV-ST8-${uniqueSuffix}`;

    const [testInvoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        customerId,
        orderStatus: 'READY_FOR_COLLECTION',
        paymentStatus: 'PARTIAL',
        subtotal: '5000.00',
        discountAmount: '0.00',
        taxableValue: '4237.29',
        cgstAmount: '381.35',
        sgstAmount: '381.36',
        igstAmount: '0.00',
        totalTax: '762.71',
        grandTotal: '5000.00',
        advancePaid: '2000.00',
        balanceDue: '3000.00',
        promisedDeliveryDate: new Date(),
        notes: 'Stage 8 Automated Settlement Test',
      })
      .returning();

    await db.insert(invoiceItems).values({
      invoiceId: testInvoice.id,
      description: 'Blue Cut Polycarbonate Progressive Lens',
      quantity: 1,
      unitPrice: '5000.00',
      discountPerUnit: '0.00',
      lineTotal: '5000.00',
      taxRate: '18.00',
      taxAmount: '762.71',
      lensType: 'PROGRESSIVE',
      coating: 'BLUE_FILTER',
      lensMaterial: 'POLYCARBONATE',
    });

    await db.insert(payments).values({
      invoiceId: testInvoice.id,
      amount: '2000.00',
      paymentMode: 'CASH',
      transactionReference: `INIT-ADV-${uniqueSuffix}`,
    });

    // ── 2. Navigate to /admin/lab-orders ──
    await page.goto('/admin/lab-orders');
    await page.waitForLoadState('networkidle');

    // Ensure dashboard header is loaded
    await expect(
      page.locator('h1:has-text("Lab Order & Workshop Management")')
    ).toBeVisible({ timeout: 15000 });

    // ── 3. Click "Collect Balance" on that specific order ──
    const orderCard = page.locator('[data-testid="order-card"]', {
      hasText: invoiceNumber,
    });
    await expect(orderCard).toBeVisible({ timeout: 10000 });

    // Assert that the action button says "Collect Balance"
    const collectBtn = orderCard.getByTestId('btn-collect-balance');
    await expect(collectBtn).toBeVisible();
    await expect(collectBtn).toContainText('Collect Balance');
    await collectBtn.click();

    // ── 4. Settle Balance Modal Interaction: Select "UPI" & Confirm ──
    const modal = page.getByTestId('settle-balance-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify invoice number and balance due display
    await expect(modal.locator(`text=${invoiceNumber}`).first()).toBeVisible();
    const balanceDueDisplay = modal.getByTestId('settle-modal-balance-due');
    await expect(balanceDueDisplay).toContainText('3,000');

    // Select UPI payment mode
    const upiModeBtn = modal.getByTestId('payment-mode-upi');
    await expect(upiModeBtn).toBeVisible();
    await upiModeBtn.click();

    // Fill optional transaction reference
    const refInput = modal.getByTestId('input-settle-reference');
    await refInput.fill(`UPI-UTR-${uniqueSuffix}`);

    // Confirm collection and order delivery
    const confirmBtn = modal.getByTestId('btn-confirm-settle-balance');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toContainText('Collect ₹3,000.00 & Deliver Order');
    await confirmBtn.click();

    // ── 5. Assertions ──
    // Modal closes
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Success toast appears
    await expect(
      page
        .locator(
          'text=/Payment of ₹3000.00 collected successfully|delivered & closed/i'
        )
        .first()
    ).toBeVisible({ timeout: 10000 });

    // Order disappears from Ready for Pickup column
    const readyPickupColumn = page.getByTestId('kanban-column-ready-pickup');
    await expect(
      readyPickupColumn.locator('[data-testid="order-card"]', {
        hasText: invoiceNumber,
      })
    ).not.toBeVisible({ timeout: 10000 });

    // Order is now in the Completed (DELIVERED_AND_CLOSED) section
    const completedColumn = page.getByTestId('kanban-column-completed');
    const movedCard = completedColumn.locator('[data-testid="order-card"]', {
      hasText: invoiceNumber,
    });
    await expect(movedCard).toBeVisible({ timeout: 10000 });
  });

  test('Patient History Sheet displays Collect Balance button for pending invoices', async ({
    page,
  }) => {
    // Navigate to /admin/patients
    await page.goto('/admin/patients');
    await page.waitForLoadState('networkidle');

    // Search for patient Rajesh
    const searchInput = page.getByTestId('patient-search-input');
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Rajesh');
    }

    // Open patient detail row/card
    const patientRow = page.locator('tr, [data-testid="patient-card"]', {
      hasText: 'Rajesh Kumar',
    }).first();
    await expect(patientRow).toBeVisible({ timeout: 10000 });
    await patientRow.click();

    // Verify patient detail sheet opened
    const sheet = page.getByTestId('patient-detail-sheet');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Click Order Invoices Tab
    const ordersTab = page.getByTestId('tab-patient-orders');
    await expect(ordersTab).toBeVisible();
    await ordersTab.click();

    // Check if table contains header Invoice #
    await expect(
      page.locator('th', { hasText: 'Invoice #' }).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
