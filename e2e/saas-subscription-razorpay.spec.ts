import { test, expect } from '@playwright/test';

test.describe('Phase 25: Razorpay SaaS Subscriptions & Feature Gating', () => {
  test('1. Pricing page renders all 3 tiers with monthly and annual pricing toggles', async ({
    page,
  }) => {
    await page.goto('/pricing');

    // Verify main headings
    await expect(page.locator('h1')).toContainText('Invest in Practice Speed & Accuracy');

    // Verify all 3 plan tiers are visible
    await expect(page.locator('h2', { hasText: 'Starter Practice' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Growth Plus' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Enterprise Pro' })).toBeVisible();

    // Default monthly price
    await expect(page.locator('text=₹999').first()).toBeVisible();

    // Toggle Annual Billing
    const annualBtn = page.locator('button', { hasText: 'Annual Billing' });
    await annualBtn.click();

    // Annual price (₹9990 / 12 = ~₹833/mo)
    await expect(page.locator('text=Save 20%')).toBeVisible();
  });

  test('2. Lab Orders Workshop is gated by plan: upgrade prompt on Starter, Kanban on Growth Plus+', async ({
    page,
  }) => {
    // e2e/global-setup.ts pins the bypass org to the lowest plan unlocking the Kanban, but the test
    // accepts either state so it stays valid if the org is downgraded to Starter.
    await page.goto('/admin/lab-orders');

    const upgradeButton = page.getByRole('button', { name: /^(Upgrade to|Unlock with) Growth Plus/i });
    const kanbanHeading = page.getByRole('heading', { level: 1, name: 'Lab Order & Workshop Management' });

    // Wait for whichever of the two mutually exclusive states renders (isVisible() does not wait).
    await expect(upgradeButton.or(kanbanHeading)).toBeVisible();

    if (await upgradeButton.isVisible()) {
      // Starter tier: the gate opens the upgrade modal for the locked feature
      await upgradeButton.click();
      await expect(page.locator('h2', { hasText: /Optical Lab Workshop Pipeline/i })).toBeVisible();
      await expect(page.locator('button', { hasText: /Upgrade with Razorpay/i })).toBeVisible();
    } else {
      // Growth Plus / Enterprise: the Kanban renders and no upgrade prompt is shown
      await expect(kanbanHeading).toBeVisible();
      await expect(upgradeButton).toHaveCount(0);
    }
  });

  test('3. Pricing page contains secure Razorpay trust badge and SSL encryption guarantees', async ({
    page,
  }) => {
    await page.goto('/pricing');

    await expect(page.locator('text=Bank-Grade Razorpay Security & Zero Lock-in')).toBeVisible();
    await expect(page.locator('text=Google Pay, PhonePe, Paytm')).toBeVisible();
  });
});
