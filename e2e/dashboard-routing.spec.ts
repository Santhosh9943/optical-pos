import { test, expect } from '@playwright/test';

test.describe('Operational Dashboard & Customer Routing (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Set synthetic session headers to bypass auth in E2E environment
    await page.setExtraHTTPHeaders({
      'x-e2e-bypass-auth': 'true',
    });
  });

  test('should render Executive Dashboard with KPIs and quick actions', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify root dashboard container
    const dashboard = page.locator('[data-testid="operational-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Verify Quick Action Buttons
    const quickBillBtn = page.locator('[data-testid="dashboard-quick-bill-btn"]');
    await expect(quickBillBtn).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-quick-stock-btn"]')).toBeVisible();

    // Verify KPI sections
    await expect(page.getByText("Today's Revenue")).toBeVisible();
    await expect(page.getByText('Orders Completed')).toBeVisible();
    await expect(page.getByText('Pending Balance')).toBeVisible();
    await expect(page.getByText('Workshop Lab Orders', { exact: true })).toBeVisible();

    // Verify widgets
    await expect(page.getByText('Live Orders & Settlements')).toBeVisible();
    await expect(page.getByText('Workshop Lab Orders Status')).toBeVisible();
    await expect(page.getByText('Tender Settlement Split')).toBeVisible();
    await expect(page.getByText('Low Stock Warnings')).toBeVisible();
  });

  test('should navigate to POS billing from dashboard quick action', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const quickBillBtn = page.locator('[data-testid="dashboard-quick-bill-btn"]');
    await quickBillBtn.click();

    await page.waitForURL('**/pos/new-bill');
    await expect(page).toHaveURL(/.*\/pos\/new-bill/);
  });

  test('should display Dashboard link in persistent sidebar navigation', async ({ page }) => {
    await page.goto('/admin/inventory');
    await page.waitForLoadState('networkidle');

    const navDashboard = page.locator('[data-testid="nav-dashboard"]');
    await expect(navDashboard).toBeVisible();
    await navDashboard.click();

    await page.waitForURL('**/admin/dashboard');
    await expect(page.locator('[data-testid="operational-dashboard"]')).toBeVisible();
  });

  test('should render Customer Portal view at /portal', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    const portalView = page.locator('[data-testid="customer-dashboard-view"]');
    await expect(portalView).toBeVisible();

    await expect(page.getByText('Patient Account')).toBeVisible();
    await expect(page.getByText('Your Spectacle Orders')).toBeVisible();
    await expect(page.getByText('Refraction & Rx History')).toBeVisible();
    await expect(page.locator('[data-testid="customer-logout-btn"]')).toBeVisible();
  });
});
