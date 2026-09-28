import { test, expect } from '@playwright/test';
import { db } from '../src/db';
import { organizations, branches, member as memberTable, staffStoreAssignments, user as userTable } from '../src/db/schema';
import { eq } from 'drizzle-orm';

test.describe('Practice Owner Account Creation & Automated Store Setup', () => {
  let createdOrgId: string | null = null;
  let testEmail: string = '';

  test.afterEach(async () => {
    if (createdOrgId) {
      await db.delete(staffStoreAssignments).where(eq(staffStoreAssignments.organizationId, createdOrgId));
      await db.delete(memberTable).where(eq(memberTable.organizationId, createdOrgId));
      await db.delete(branches).where(eq(branches.organizationId, createdOrgId));
      await db.delete(organizations).where(eq(organizations.id, createdOrgId));
    }
    if (testEmail) {
      await db.delete(userTable).where(eq(userTable.email, testEmail));
    }
  });

  test('1. Sign Up form renders Organization Name and optional Branch Name input with Main Branch default hint', async ({ page }) => {
    await page.goto('/auth/login?mode=signup');

    // Switch to or verify signup tab
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();

    // Verify Organization Name input
    const orgInput = page.getByTestId('input-signup-org-name');
    await expect(orgInput).toBeVisible();
    await expect(page.locator('label[for="organizationName"]')).toContainText(/Organization \/ Practice Name/i);

    // Verify Optional Branch Name input
    const branchInput = page.getByTestId('input-signup-branch-name');
    await expect(branchInput).toBeVisible();
    await expect(page.locator('label[for="branchName"]')).toContainText(/Store \/ Branch Name/i);
    await expect(page.getByText(/Optional \(defaults to Main Branch\)/i)).toBeVisible();
  });

  test('2. Submitting sign up without optional branch creates organization with env prefix and defaults to Main Branch', async ({ page }) => {
    testEmail = `dr_optician_${Date.now()}@optixos-test.com`;
    const practiceName = `Shine Vision Care ${Date.now()}`;

    await page.goto('/auth/login?mode=signup');

    // Fill in sign up details
    await page.fill('#name', 'Dr. Alok Verma');
    await page.fill('[data-testid="input-signup-org-name"]', practiceName);
    // Leave branchName blank to test default behavior!
    await page.fill('#email', testEmail);
    await page.fill('#password', 'SecurePass123!@#');

    // Submit registration
    await page.click('button[type="submit"]');

    // Expect navigation to workspace (POS or Admin)
    await page.waitForURL(/\/(pos|admin)/i, { timeout: 15000 });

    // Verify in database that organization was created with correct prefix and branch
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, practiceName))
      .limit(1);

    expect(org).toBeDefined();
    expect(org.orgCode).toMatch(/^OPT-\d+$/);
    createdOrgId = org.id;

    // Verify branch was created with default name 'Main Branch'
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.organizationId, org.id))
      .limit(1);

    expect(branch).toBeDefined();
    expect(branch.name).toBe('Main Branch');

    // Verify user role is 'owner'
    const [u] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, testEmail))
      .limit(1);

    expect(u).toBeDefined();
    expect(u.role).toBe('owner');

    const [member] = await db
      .select()
      .from(memberTable)
      .where(eq(memberTable.organizationId, org.id))
      .limit(1);

    expect(member).toBeDefined();
    expect(member.role).toBe('owner');
  });
});
