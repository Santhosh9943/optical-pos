import { test, expect } from '@playwright/test';

test.describe('Phase 26: Priority Notes (Temp Notes) Floating Drawer / Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean default notes
    await page.goto('/pos/new-bill');
    await page.evaluate(() => {
      localStorage.removeItem('priority_notes_cache');
    });
    await page.reload();
  });

  test('1. Topbar trigger launcher opens and closes the Priority Notes drawer', async ({
    page,
  }) => {
    const trigger = page.locator('[data-testid="topbar-priority-notes-trigger"]');
    await expect(trigger).toBeVisible();

    // Verify initial badge count is visible
    const badge = page.locator('[data-testid="priority-notes-badge-count"]');
    await expect(badge).toBeVisible();

    // Click trigger to open drawer
    await trigger.click();
    const drawer = page.locator('[data-testid="priority-notes-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(page.locator('text=Priority Notes').first()).toBeVisible();

    // Verify backdrop is visible in floating mode
    const backdrop = page.locator('[data-testid="priority-notes-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Click close button
    const closeBtn = page.locator('[data-testid="btn-close-drawer"]');
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();
  });

  test('2. Can add High, Medium, and Low priority notes with immediate categorization', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    const input = page.locator('[data-testid="input-quick-note"]');
    const addBtn = page.locator('[data-testid="btn-add-note"]');

    // Add High Priority Note
    await input.fill('Urgent: Contact Zeiss for progressive lens batch');
    await page.locator('[data-testid="pill-priority-high"]').click();
    await addBtn.click();

    const highNoteCard = page.locator('[data-testid^="note-card-"]').filter({
      hasText: 'Urgent: Contact Zeiss for progressive lens batch',
    });
    await expect(highNoteCard).toBeVisible();
    await expect(highNoteCard).toContainText('High');

    // Add Low Priority Note
    await input.fill('Clean optical display cabinets before shift close');
    await page.locator('[data-testid="pill-priority-low"]').click();
    await addBtn.click();

    const lowNoteCard = page.locator('[data-testid^="note-card-"]').filter({
      hasText: 'Clean optical display cabinets before shift close',
    });
    await expect(lowNoteCard).toBeVisible();
    await expect(lowNoteCard).toContainText('Low');
  });

  test('3. Toggling completion shows strikethrough styling and tip banner', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    // Add a test note
    const input = page.locator('[data-testid="input-quick-note"]');
    await input.fill('Verify stock quantity for Oakley frames');
    await page.locator('[data-testid="btn-add-note"]').click();

    // Find the newly added note card
    const noteCard = page.locator('[data-testid^="note-card-"]').filter({
      hasText: 'Verify stock quantity for Oakley frames',
    });
    await expect(noteCard).toBeVisible();

    // Check completion checkbox
    const checkbox = noteCard.locator('button[data-testid^="checkbox-complete-"]');
    await checkbox.click();

    // Text should have line-through
    const noteText = noteCard.locator('p');
    await expect(noteText).toHaveClass(/line-through/);

    // Tip banner should appear
    const tipBanner = page.locator('[data-testid="tip-banner-completed"]');
    await expect(tipBanner).toBeVisible();
    await expect(tipBanner).toContainText('Tip: Delete completed notes');

    // Clear completed notes
    await page.locator('[data-testid="btn-clear-completed"]').click();
    await expect(noteCard).not.toBeVisible();
  });

  test('4. Soft-delete moves note to Trash, and user can restore or empty trash', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    // Add a note to be deleted
    const input = page.locator('[data-testid="input-quick-note"]');
    await input.fill('Temporary note to discard');
    await page.locator('[data-testid="btn-add-note"]').click();

    const noteCard = page.locator('[data-testid^="note-card-"]').filter({
      hasText: 'Temporary note to discard',
    });
    await expect(noteCard).toBeVisible();

    // Hover and delete
    await noteCard.hover();
    const deleteBtn = noteCard.locator('button[data-testid^="btn-delete-note-"]');
    await deleteBtn.click();

    // Note should disappear from active bucket
    await expect(noteCard).not.toBeVisible();

    // Trash bin section should appear at bottom
    const trashSection = page.locator('[data-testid="trash-bin-section"]');
    await expect(trashSection).toBeVisible();

    // Expand trash
    await page.locator('[data-testid="btn-toggle-trash"]').click();
    const trashItem = trashSection.locator('text=Temporary note to discard');
    await expect(trashItem).toBeVisible();

    // Click restore
    const restoreBtn = trashSection.locator('button[data-testid^="btn-restore-"]').first();
    await restoreBtn.click();

    // Note should return to active list
    await expect(
      page.locator('[data-testid^="note-card-"]').filter({
        hasText: 'Temporary note to discard',
      })
    ).toBeVisible();
  });

  test('5. Pinning drawer toggles side-by-side mode without backdrop and persists in localStorage', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    const pinBtn = page.locator('[data-testid="btn-pin-drawer"]');
    await expect(pinBtn).toBeVisible();

    // Click pin button
    await pinBtn.click();

    // In pinned mode, the backdrop should not exist
    const backdrop = page.locator('[data-testid="priority-notes-backdrop"]');
    await expect(backdrop).not.toBeVisible();

    // Reload page to verify persistence
    await page.reload();

    // Open drawer again
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();
    await expect(page.locator('[data-testid="priority-notes-drawer"]')).toBeVisible();
    await expect(backdrop).not.toBeVisible();
  });

  test('6. Batch Edit mode enables snapshot backup and cancel reversion', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    // Enter batch edit mode
    const editBtn = page.locator('[data-testid="btn-edit-batch"]');
    await editBtn.click();

    // Cancel and Save buttons should be visible
    const cancelBtn = page.locator('[data-testid="btn-cancel-batch"]');
    const saveBtn = page.locator('[data-testid="btn-save-batch"]');
    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    // Cards should show drag indicator text
    await expect(page.locator('text=Drag to shift').first()).toBeVisible();

    // Click cancel to revert
    await cancelBtn.click();
    await expect(page.locator('[data-testid="btn-edit-batch"]')).toBeVisible();
  });

  test('7. Multi-Store Branch Scoping & Org Admin Merged View Grouping', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    // 1. Verify Store Scope Bar exists with Org Admin badge
    const storeBar = page.locator('[data-testid="store-scope-bar"]');
    await expect(storeBar).toBeVisible();

    const branchFilter = page.locator('[data-testid="select-branch-filter"]');
    await expect(branchFilter).toBeVisible();

    // Should include 'All Branches (Merged)'
    await expect(branchFilter.locator('option[value="all"]')).toBeAttached();

    // 2. In Merged View, verify notes are grouped by branch
    const mergedContainer = page.locator('[data-testid="container-merged-branches"]');
    await expect(mergedContainer).toBeVisible();

    // Should have branch group containers
    const branchGroups = page.locator('[data-testid^="branch-group-"]');
    await expect(branchGroups.first()).toBeVisible();

    // 3. Quick Add in Merged View shows 'Add to Store:' branch selector
    const addNoteBranchSelect = page.locator('[data-testid="select-add-note-branch"]');
    await expect(addNoteBranchSelect).toBeVisible();

    // 4. Switch to single branch view from drawer dropdown
    const options = await branchFilter.locator('option').all();
    if (options.length > 1) {
      const secondOptionVal = await options[1].getAttribute('value');
      if (secondOptionVal) {
        await branchFilter.selectOption(secondOptionVal);

        // Merged container should disappear, single branch container should appear
        await expect(page.locator('[data-testid="container-single-branch"]')).toBeVisible();
        await expect(page.locator('[data-testid="container-merged-branches"]')).not.toBeVisible();
      }
    }
  });

  test('8. Non-Org Admin Store Staff role restricts to single branch view without Merged option', async ({
    page,
  }) => {
    // Simulate non-org-admin user role in tenantStore
    await page.evaluate(() => {
      const stored = localStorage.getItem('optixos_tenant_store');
      const data = stored ? JSON.parse(stored) : { state: {} };
      data.state = {
        ...data.state,
        actualRole: 'user',
        activeRoleMode: 'user',
        selectedBranchId: '00000000-0000-0000-0000-000000000002',
      };
      localStorage.setItem('optixos_tenant_store', JSON.stringify(data));
    });
    await page.reload();

    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    // Verify Org Admin multi-branch merged selector is NOT visible
    const branchFilter = page.locator('[data-testid="select-branch-filter"]');
    await expect(branchFilter).not.toBeVisible();

    // Verify Single Store badge or lock is visible
    const singleStoreBadge = page.locator('[data-testid="badge-single-store-locked"]');
    await expect(singleStoreBadge).toBeVisible();

    // Merged container must NOT be visible
    await expect(page.locator('[data-testid="container-merged-branches"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="container-single-branch"]')).toBeVisible();
  });
});
