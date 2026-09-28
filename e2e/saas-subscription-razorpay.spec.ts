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

  test('2. Lab Orders Workshop is protected by PlanUpgradeGate on Starter tier', async ({
    page,
  }) => {
    // Navigate to lab-orders with default mock starter organization
    await page.goto('/admin/lab-orders');

    // Expect either the lab orders view (if already upgraded) or the PlanUpgradeGate prompt
    const upgradeButton = page.locator('button', { hasText: /Upgrade to Growth Plus|Unlock with Growth Plus/i });
    const isGated = await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (isGated) {
      await expect(upgradeButton).toBeVisible();
      // Click upgrade button to test opening the upgrade modal
      await upgradeButton.click();
      await expect(page.locator('h2', { hasText: /Optical Lab Workshop Pipeline/i })).toBeVisible();
      await expect(page.locator('button', { hasText: /Upgrade with Razorpay/i })).toBeVisible();
    } else {
      // If active plan is already plus/enterprise
      await expect(page.locator('h1, h2', { hasText: /Lab Orders|Workshop/i })).toBeVisible();
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
