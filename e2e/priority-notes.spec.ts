import { test, expect, type Page } from '@playwright/test';

/**
 * Adds a note through the drawer's Quick Add card (drawer must already be open).
 * Default sample notes were purged in Phase 31 (store initialises `notes: []`),
 * so any test that needs existing cards must create them first.
 */
async function addNoteViaUI(
  page: Page,
  text: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  await page.locator('[data-testid="input-quick-note"]').fill(text);
  await page.locator(`[data-testid="pill-priority-${priority}"]`).click();
  await page.locator('[data-testid="btn-add-note"]').click();
  await expect(
    page.locator('[data-testid^="note-card-"]').filter({ hasText: text })
  ).toBeVisible();
}

test.describe('Phase 26: Priority Notes (Temp Notes) Floating Drawer / Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with an empty notes store (no default sample notes since Phase 31)
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

    // Clean store: no default notes, so no uncompleted-count badge yet
    const badge = page.locator('[data-testid="priority-notes-badge-count"]');
    await expect(badge).not.toBeVisible();

    // Click trigger to open drawer
    await trigger.click();
    const drawer = page.locator('[data-testid="priority-notes-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(page.locator('text=Priority Notes').first()).toBeVisible();

    // Verify backdrop is visible in floating mode
    const backdrop = page.locator('[data-testid="priority-notes-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Create a note so the topbar badge has an uncompleted count to show
    await addNoteViaUI(page, 'Badge count seed note');

    // Click close button
    const closeBtn = page.locator('[data-testid="btn-close-drawer"]');
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();

    // Badge now reflects the single uncompleted note in the active store
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
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

    // No default notes exist anymore - create one to batch-edit
    await addNoteViaUI(page, 'Batch edit revert candidate', 'medium');
    const noteCardTestId = await page
      .locator('[data-testid^="note-card-"]')
      .filter({ hasText: 'Batch edit revert candidate' })
      .getAttribute('data-testid');
    expect(noteCardTestId).toBeTruthy();
    const cardId = noteCardTestId as string;
    const mediumBucket = page.locator('[data-testid="priority-bucket-medium"]');
    const lowBucket = page.locator('[data-testid="priority-bucket-low"]');
    await expect(mediumBucket.getByTestId(cardId)).toBeVisible();

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

    // Change priority inside batch mode: card moves Medium -> Low
    await mediumBucket
      .getByTestId(cardId)
      .getByRole('button', { name: 'Low', exact: true })
      .click();
    await expect(lowBucket.getByTestId(cardId)).toBeVisible();
    await expect(mediumBucket.getByTestId(cardId)).toHaveCount(0);

    // Click cancel to revert to the pre-edit snapshot
    await cancelBtn.click();
    await expect(page.locator('[data-testid="btn-edit-batch"]')).toBeVisible();
    await expect(mediumBucket.getByTestId(cardId)).toBeVisible();
    await expect(lowBucket.getByTestId(cardId)).toHaveCount(0);
  });

  // NOTE: The former Org-Admin "All Branches (Merged)" view (option value="all",
  // container-merged-branches, branch-group-*, select-add-note-branch) and the
  // role-gated branch filter were removed from priority-notes-drawer.tsx. Notes are
  // now strictly scoped to the single active store; the branch <select> renders
  // whenever more than one branch is available, regardless of role.
  test('7. Branch scope selector lists stores (no merged option) and switching store scopes notes', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();

    const storeBar = page.locator('[data-testid="store-scope-bar"]');
    await expect(storeBar).toBeVisible();

    // E2E tenant has multiple branches (DB branches, or the drawer's 2-branch fallback)
    const branchFilter = page.locator('[data-testid="select-branch-filter"]');
    await expect(branchFilter).toBeVisible();

    const optionValues = await branchFilter
      .locator('option')
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    expect(optionValues.length).toBeGreaterThan(1);
    expect(optionValues).not.toContain('all');

    // Single-store container is always used; merged container no longer exists
    await expect(page.locator('[data-testid="container-single-branch"]')).toBeVisible();
    await expect(page.locator('[data-testid="container-merged-branches"]')).toHaveCount(0);

    // Pin the first store, add a note there
    const [firstBranchId, secondBranchId] = optionValues;
    await branchFilter.selectOption(firstBranchId);
    await expect(branchFilter).toHaveValue(firstBranchId);
    await addNoteViaUI(page, 'Branch scoped note for first store');

    const scopedNote = page
      .locator('[data-testid^="note-card-"]')
      .filter({ hasText: 'Branch scoped note for first store' });

    // Switch to the second store: the first store's note is out of scope
    await branchFilter.selectOption(secondBranchId);
    await expect(branchFilter).toHaveValue(secondBranchId);
    await expect(scopedNote).toHaveCount(0);
    await expect(page.locator('[data-testid="container-single-branch"]')).toBeVisible();

    // Switch back: the note is visible again
    await branchFilter.selectOption(firstBranchId);
    await expect(branchFilter).toHaveValue(firstBranchId);
    await expect(scopedNote).toBeVisible();
  });

  test('8. Store scope bar shows either a branch select or a single-branch label, plus exactly one role badge', async ({
    page,
  }) => {
    await page.locator('[data-testid="topbar-priority-notes-trigger"]').click();
    await expect(page.locator('[data-testid="store-scope-bar"]')).toBeVisible();

    const branchFilter = page.locator('[data-testid="select-branch-filter"]');
    const singleBranchLabel = page.locator('[data-testid="label-single-branch"]');

    // Select renders only when >1 branch is available; otherwise the read-only label
    if ((await branchFilter.count()) > 0) {
      await expect(branchFilter).toBeVisible();
      await expect(singleBranchLabel).toHaveCount(0);
      expect(await branchFilter.locator('option').count()).toBeGreaterThan(1);
      await expect(branchFilter.locator('option[value="all"]')).toHaveCount(0);
    } else {
      await expect(singleBranchLabel).toBeVisible();
      await expect(singleBranchLabel).not.toHaveText('');
    }

    // Exactly one role-scope badge (Org Admin vs Single Store lock) is rendered
    const orgAdminBadge = page.locator('[data-testid="badge-org-admin-access"]');
    const singleStoreBadge = page.locator('[data-testid="badge-single-store-locked"]');
    expect((await orgAdminBadge.count()) + (await singleStoreBadge.count())).toBe(1);

    // No merged view / merged quick-add branch picker in any role
    await expect(page.locator('[data-testid="container-merged-branches"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="select-add-note-branch"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="container-single-branch"]')).toBeVisible();
  });
});
