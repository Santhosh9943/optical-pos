import { test, expect } from '@playwright/test';

test.describe('Phase 12: Better Auth & Route Protection E2E', () => {
  test('redirects unauthenticated users from protected routes to /auth/login', async ({ browser }) => {
    // Create an isolated context without the bypass header
    const unauthContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-e2e-bypass-auth': 'false',
      },
    });
    const page = await unauthContext.newPage();

    // Attempt to access protected POS page
    await page.goto('/pos/new-bill');

    // Should be redirected to /auth/login with callbackUrl
    await expect(page).toHaveURL(/\/auth\/login.*callbackUrl=%2Fpos%2Fnew-bill/);

    // Verify login page elements
    await expect(page.getByRole('heading', { name: 'Optix OS' })).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In to Practice/i })).toBeVisible();

    await unauthContext.close();
  });

  test('redirects unauthenticated users from /admin to /auth/login', async ({ browser }) => {
    const unauthContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-e2e-bypass-auth': 'false',
      },
    });
    const page = await unauthContext.newPage();

    await page.goto('/admin/inventory');
    await expect(page).toHaveURL(/\/auth\/login.*callbackUrl=%2Fadmin%2Finventory/);

    await unauthContext.close();
  });

  test('renders login UI, toggles mode to Create Account and supports demo quick fill', async ({ page }) => {
    await page.goto('/auth/login');

    // Check heading
    await expect(page.getByRole('heading', { name: 'Optix OS' })).toBeVisible();

    // Verify initial Sign In mode
    await expect(page.getByRole('button', { name: 'Sign In to Practice' })).toBeVisible();

    // Click "Create Account" tab
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Verify registration fields appear
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register Practice' })).toBeVisible();

    // Switch back to Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByLabel(/Full Name/i)).not.toBeVisible();

    // Test Quick Fill Demo button
    await page.getByRole('button', { name: 'Admin Demo' }).click();
    await expect(page.getByLabel(/Email Address/i)).toHaveValue('admin@optix.com');
    await expect(page.getByLabel(/Password/i)).toHaveValue('AdminPass123!');
  });

  test('Better Auth API returns session status', async ({ request }) => {
    const response = await request.get('/api/auth/get-session');
    expect(response.status()).toBe(200);
    const body = await response.json();
    // In unauthenticated state, session is null or empty
    expect(body?.session ?? null).toBeNull();
  });
});
