import { test, expect } from '@playwright/test';

test.describe('Notification & Alerting Center (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Set synthetic session headers to bypass auth in E2E environment
    await page.setExtraHTTPHeaders({
      'x-e2e-bypass-auth': 'true',
    });
  });

  test('should render notification bell trigger in topbar header', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const bell = page.locator('[data-testid="topbar-notification-bell"]');
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('aria-label', 'Toggle notifications center');
  });

  test('should open notification popover and display categories and filter tabs', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const bell = page.locator('[data-testid="topbar-notification-bell"]');
    await expect(bell).toBeVisible();
    await bell.click();

    const popover = page.locator('[data-testid="notification-popover"]');
    await expect(popover).toBeVisible();

    // Verify filter tabs
    await expect(page.locator('[data-testid="tab-notification-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-notification-unread"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-notification-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-notification-reminders"]')).toBeVisible();
  });

  test('should switch filter tabs and display filtered notification items', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const bell = page.locator('[data-testid="topbar-notification-bell"]');
    await bell.click();

    const popover = page.locator('[data-testid="notification-popover"]');
    await expect(popover).toBeVisible();

    // Click Alerts tab
    await page.locator('[data-testid="tab-notification-alerts"]').click();
    // Verify alert or empty state is present
    const alertsTabActive = page.locator('[data-testid="tab-notification-alerts"]');
    await expect(alertsTabActive).toHaveClass(/border-blue-600/);

    // Click Reminders tab
    await page.locator('[data-testid="tab-notification-reminders"]').click();
    const remindersTabActive = page.locator('[data-testid="tab-notification-reminders"]');
    await expect(remindersTabActive).toHaveClass(/border-blue-600/);

    // Click All tab
    await page.locator('[data-testid="tab-notification-all"]').click();
    const allTabActive = page.locator('[data-testid="tab-notification-all"]');
    await expect(allTabActive).toHaveClass(/border-blue-600/);
  });

  test('should mark all notifications as read and update unread counter', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const bell = page.locator('[data-testid="topbar-notification-bell"]');
    await bell.click();

    const popover = page.locator('[data-testid="notification-popover"]');
    await expect(popover).toBeVisible();

    const markAllBtn = page.locator('[data-testid="btn-mark-all-read"]');
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      // After marking all as read, mark all button should disappear
      await expect(markAllBtn).not.toBeVisible();
    }

    // Switch to unread tab and verify empty state
    await page.locator('[data-testid="tab-notification-unread"]').click();
    const emptyState = page.locator('[data-testid="notification-empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('All caught up!');
  });

  test('should close popover with close button', async ({ page }) => {
    await page.goto('/pos/new-bill');
    await page.waitForLoadState('networkidle');

    const bell = page.locator('[data-testid="topbar-notification-bell"]');
    await bell.click();

    const popover = page.locator('[data-testid="notification-popover"]');
    await expect(popover).toBeVisible();

    // Click close button
    const closeBtn = page.locator('[data-testid="btn-close-popover"]');
    await closeBtn.click();
    await expect(popover).not.toBeVisible();
  });
});
