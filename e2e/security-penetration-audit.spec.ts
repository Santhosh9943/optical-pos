import { test, expect } from '@playwright/test';

test.describe('Zero-Trust Security, Penetration & RBAC Hardening Suite', () => {
  test('1. Unauthenticated API search routes fail-closed with 401 Unauthorized', async ({ request }) => {
    // Attempt patient search without authentication or bypass headers
    const patientRes = await request.get('/api/patients/search?q=Rajesh', {
      headers: {
        'x-e2e-bypass-auth': 'false',
      },
    });
    expect(patientRes.status()).toBe(401);
    const patientBody = await patientRes.json();
    expect(patientBody.error).toMatch(/Unauthorized/i);

    // Attempt inventory search without authentication or bypass headers
    const inventoryRes = await request.get('/api/inventory/search?q=Titan', {
      headers: {
        'x-e2e-bypass-auth': 'false',
      },
    });
    expect(inventoryRes.status()).toBe(401);
    const inventoryBody = await inventoryRes.json();
    expect(inventoryBody.error).toMatch(/Unauthorized/i);
  });

  test('2. Super Admin gateway strictly ignores x-e2e-bypass-auth and enforces login redirect', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ 'x-e2e-bypass-auth': 'true' });
    await page.goto('/super-admin/dashboard');

    // Must be redirected to /super-admin/login despite x-e2e-bypass-auth header
    await expect(page).toHaveURL(/\/super-admin\/login/);
    await expect(page.getByRole('heading', { name: /OptixOS Root Gateway/i })).toBeVisible();
  });

  test('3. Login page sanitizes external callbackUrl against Open Redirect attacks', async ({ page }) => {
    // Intercept Better Auth sign-in endpoint to simulate successful credentials
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-admin', email: 'admin@optixos.com', name: 'Test Admin' },
          session: { token: 'mock-session-token' },
        }),
      });
    });

    // 3a. Absolute external URL: https://attacker.com/malicious
    await page.goto('/auth/login?callbackUrl=https://attacker.com/malicious');
    await page.getByPlaceholder('admin@optixos.com').fill('admin@optixos.com');
    await page.getByPlaceholder('••••••••').fill('AdminPass123!');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();

    // Must be sanitized to /admin/dashboard, strictly rejecting external redirect
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
    expect(page.url()).not.toContain('attacker.com');
    expect(page.url()).toContain('/admin/dashboard');

    // 3b. Protocol-relative URL: //attacker.com
    await page.goto('/auth/login?callbackUrl=//attacker.com');
    await page.getByPlaceholder('admin@optixos.com').fill('admin@optixos.com');
    await page.getByPlaceholder('••••••••').fill('AdminPass123!');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();

    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
    expect(page.url()).not.toContain('attacker.com');
    expect(page.url()).toContain('/admin/dashboard');
  });

  test('4. Public receipt route rejects access without valid cryptographic HMAC token', async ({ page }) => {
    const testInvoiceNum = 'INV-25-000001';

    // 4a. Access without token or session is rejected with Invalid or Expired Receipt Link
    await page.context().clearCookies();
    await page.setExtraHTTPHeaders({ 'x-e2e-bypass-auth': 'false' });
    await page.goto(`/receipt/${testInvoiceNum}`);

    // Unauthenticated access without token should render the access denied state
    await expect(page.getByText(/Invalid or Expired Receipt Link/i)).toBeVisible({ timeout: 10000 });

    // 4b. Access with a forged token renders the Invalid/Expired token state
    await page.goto(`/receipt/${testInvoiceNum}?token=forged_invalid_hmac_signature_token`);
    await expect(page.getByText(/Invalid or Expired Receipt Link/i)).toBeVisible({ timeout: 10000 });
  });

  test('5. Defense-in-depth HTTP security headers are present on responses', async ({ request }) => {
    const res = await request.get('/auth/login');
    const headers = res.headers();

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toBeDefined();
  });

  test('6. Atomic stock decrement enforces strict inventory limits (Zero-Oversell Invariant)', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ 'x-e2e-bypass-auth': 'true' });
    await page.context().addCookies([
      { name: 'x-e2e-bypass-auth', value: 'true', domain: 'localhost', path: '/' },
    ]);

    await page.goto('/pos/new-bill');

    // Select patient
    const patientSearch = page.getByTestId('patient-search-input');
    await expect(patientSearch).toBeVisible({ timeout: 15000 });
    await patientSearch.fill('9876543210');
    const patientOption = page.locator('li', { hasText: 'Rajesh Kumar' });
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // Add frame to cart
    const inventorySearch = page.getByTestId('inventory-search-input');
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('Titan');
    const itemOption = page.locator('li', { hasText: 'FRM-TI-5001-GLD' });
    await expect(itemOption).toBeVisible({ timeout: 10000 });
    const frameOnlyBtn = itemOption.getByRole('button', { name: '+ Frame Only' });
    if (await frameOnlyBtn.isVisible()) {
      await frameOnlyBtn.click();
    } else {
      await itemOption.click();
    }

    // Force massive quantity exceeding available inventory
    const qtyInput = page.getByTestId('item-quantity-input').first();
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('9999');

    // Attempt complete order
    const completeBtn = page.getByRole('button', { name: /Complete Order/i });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();

    // Verify error toast for insufficient stock appears
    const errorToast = page.locator('text=/Insufficient stock/i').first();
    await expect(errorToast).toBeVisible({ timeout: 10000 });

    // Verify cart was not cleared
    await expect(page.locator('text=FRM-TI-5001-GLD').first()).toBeVisible();
  });
});
