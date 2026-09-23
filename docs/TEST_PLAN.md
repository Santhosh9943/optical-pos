# Test Plan & Quality Assurance Matrix

This document defines the automated testing strategy, End-to-End (E2E) testing framework, test isolation protocols, and the regression test matrix for **OptixOS (Optical Billing & Practice Management System)**.

---

## 1. Quality Assurance Philosophy: Virtual Testing Pyramid

OptixOS serves high-paced physical optical retail environments where software regressions directly stall store counters, cause inventory discrepancies, or print inaccurate tax receipts. 

We employ a robust testing pyramid:
1. **Static Analysis & Type Safety** (`npm run check`): ESLint and TypeScript compiler (`tsc --noEmit`) enforce zero type errors, strict null checks, and unused variable prevention.
2. **Domain Unit Tests** (`vitest`): Test isolated business logic (`decimal.js` monetary calculations, 0.25 D dioptric quarter-step validations, tax split rules).
3. **Playwright End-to-End Test Suite** (`npm run test:e2e`): Headless Chromium browser automation driving realistic optical retail customer journeys from customer registration to cart checkout, print generation, and layout mode switching.

---

## 2. Test Execution & CI Commands

| Command | Purpose | When to Run |
| :--- | :--- | :--- |
| `npm run check` | Linting & TypeScript compiler (`tsc --noEmit`) | Before every code commit |
| `npx playwright test` | Executes all 13 E2E test suites headless | Before PR merge & deployment |
| `npx playwright test e2e/pos-checkout.spec.ts` | Targeted POS checkout & inventory lock suite | When modifying billing/cart code |
| `npx playwright test e2e/pos-layout-modes.spec.ts` | Targeted POS layout modes & F4 switching suite | When modifying POS layout/UI code |
| `npx playwright test e2e/settings-print.spec.ts` | Targeted Store settings & print engine suite | When modifying print templates |
| `npx playwright show-report` | Visual inspection of test traces and screenshots | On test failure investigation |

---

## 3. Test Isolation & Environment Protocol

### 3.1 Authentication Bypass for E2E Tests
In local automated test runs, Playwright sends a special bypass header to eliminate dependency on external login flows:
```typescript
extraHTTPHeaders: {
  'x-e2e-bypass-auth': 'true'
}
```
The test middleware intercepts this header and constructs an authenticated synthetic session scoped to `DEFAULT_ORG_ID`:
`00000000-0000-0000-0000-000000000001`.

### 3.2 Database Seeding & Clean State
Every test run relies on deterministic seed data (`npm run db:seed`). Seeded records include:
- Sample patients with family relationships (`Rahul Sharma`, `Priya Sharma`).
- Historical refraction prescriptions (OD/OS SPH, CYL, AXIS, ADD).
- Seeded inventory across all 6 categories (Frames, Ophthalmic Lenses, Sunglasses, Contact Lenses, Solutions, Accessories).
- Deterministic low-stock items (`Ray-Ban Aviator Gold` with `stockQuantity = 1`) to verify atomic concurrency locks.

### 3.3 Upstash Redis Cache Invalidation
When running E2E suites, cache invalidation hooks flush synthetic tenant cache keys (`cache:inventory:search:00000000-0000-0000-0000-000000000001:*`) ensuring tests always assert against true PostgreSQL state.

---

## 4. The 13 Core Regression Workflows

The test suite covers 13 mission-critical business journeys:

### Workflow 1: SPA State Persistence across Route Navigation
- **Objective**: Ensure that partially entered patient information or cart items are not lost if the cashier accidentally clicks away to another page (e.g., Inventory) and returns.
- **Test Steps**:
  1. Navigate to `/pos/new-bill`.
  2. Select patient and add 1 Frame and 1 Lens to the cart.
  3. Click sidebar navigation link to `/inventory`.
  4. Navigate back to `/pos/new-bill`.
  5. Assert patient name, cart items, quantities, and totals remain intact via Zustand persistence.

### Workflow 2: Atomic Inventory Lock (Insufficient Stock)
- **Objective**: Verify that adding an item exceeding available stock is rejected atomically without crashing the invoice.
- **Test Steps**:
  1. Add an item with `stockQuantity = 1` to the cart.
  2. Increment item quantity to `2`.
  3. Click "Complete Checkout".
  4. Assert error toast: `Insufficient stock for item`.
  5. Assert no invoice was generated in the database.

### Workflow 3: Family Billing & Invoice Account Switching
- **Objective**: Verify that a parent can pay for a child's glasses while maintaining clinical separation of prescriptions.
- **Test Steps**:
  1. Search for patient `Rahul Sharma`.
  2. Select dependent family member `Aarav Sharma` (Child).
  3. Verify clinical prescription displays `Aarav's` power.
  4. Verify the billing account defaults to `Rahul Sharma` (Primary Phone & GST recipient).
  5. Complete checkout and verify database invoice reflects correct patient/billed-to linkage.

### Workflow 4: Spectacle Pair Guided Wizard (Frame -> Lens -> Power)
- **Objective**: Test the multi-step guided pairing wizard for complete spectacles.
- **Test Steps**:
  1. At POS, click "Pair Glasses Wizard".
  2. Step 1: Select Frame model and colorway.
  3. Step 2: Select Lens type (Single Vision / Progressive, Coating: Blue Cut).
  4. Step 3: Link OD/OS prescription power from patient history.
  5. Step 4: Confirm bundle.
  6. Assert single bundled row in cart with combined price and split GST.

### Workflow 5: Link Existing Patient to Family Account via Modal Search
- **Objective**: Test linking an existing standalone patient profile into a family cluster.
- **Test Steps**:
  1. Open Patient Profile Sheet for `Priya Sharma`.
  2. Click "Link Family Member".
  3. Search for existing patient `Sunita Sharma` by phone number.
  4. Select relationship `Mother`.
  5. Save link. Verify immediate visual badge `Family: Sharma Cluster` in patient details.

### Workflow 6: Prescription History Auto-Loading & "+ Add New Power" Workflow
- **Objective**: Verify historical prescription auto-population and new refraction creation during billing.
- **Test Steps**:
  1. Select patient with prior visit.
  2. Verify historical prescription cards render in chronological order with "Active" badge on latest.
  3. Click "+ Add New Power".
  4. Fill OD/OS fields: SPH `-2.25`, CYL `-0.50`, AXIS `90`, ADD `+1.50`.
  5. Save refraction. Verify new refraction becomes active and links to current bill.

### Workflow 7: Product Dispatcher [F2] 6-Category Workflows (Lens Only & Sunglasses Direct Add)
- **Objective**: Test keyboard hotkey `F2` product search and category filtering.
- **Test Steps**:
  1. Press `F2` to trigger the Product Dispatcher modal.
  2. Filter by category "Sunglasses".
  3. Click "Add to Cart" on selected sunglass.
  4. Press `F2` again, select category "Lenses", select "Lens Only (Customer Own Frame)".
  5. Verify both items appear in POS cart with appropriate category badges.

### Workflow 8: Cart Item Detail Inspector & Invoice Custom Details Override
- **Objective**: Allow cashier to customize frame fitting parameters or lens tint specifications on cart items.
- **Test Steps**:
  1. Add a frame to cart.
  2. Click item row to open Item Inspector drawer.
  3. Enter custom notes: `Tint: 25% Brown Gradient, Fit: Wrap 6`.
  4. Update item.
  5. Verify custom notes render in the cart item sub-label and print on the workshop slip.

### Workflow 9: Clean Patient Loading, Existing Family Member Addition & POS Purchase History
- **Objective**: Ensure seamless patient lifecycle at POS counter.
- **Test Steps**:
  1. Type phone number `9876543210` in POS patient search.
  2. Verify patient name and recent 3 purchases render in purchase history tab.
  3. Click "+ Add Family Member", register spouse `Neha`, immediately switch bill to `Neha`.

### Workflow 10: Dependent Phone Architecture & Family Links in Patient Detail Sheet
- **Objective**: Test that minors without personal phones share the primary guardian's phone number without duplicate database key collision.
- **Test Steps**:
  1. Register a child patient without phone number.
  2. Link child to father with phone `9888877776`.
  3. Search `9888877776` at POS.
  4. Verify family cluster dropdown renders both Father and Child.

### Workflow 11: Dual-Box Discount (Price ₹ and Percentage % Bidirectional Sync)
- **Objective**: Validate mathematical synchronization between discount percentage and absolute currency.
- **Test Steps**:
  1. Create cart with total `₹ 10,000.00`.
  2. Enter `10` in `%` discount input. Assert `₹` input automatically updates to `1000.00` and net total updates to `₹ 9,000.00`.
  3. Clear and enter `1500.00` in `₹` discount input. Assert `%` input automatically updates to `15.00` and net total updates to `₹ 8,500.00`.
  4. Enter an invalid discount exceeding total (`₹ 15,000.00`). Assert validation error and clamping.

### Workflow 12: POS Adaptive & Dense View Modes, Hotkey F4, and Admin Settings Persistence
- **Objective**: Verify all 4 POS layout modes, seamless hotkey switching, and store-level preference persistence.
- **Test Steps**:
  1. Navigate to `/pos/new-bill`. Verify default layout (Adaptive Split View).
  2. Press `F4` to cycle to "Rx Refraction Focus". Verify 9:3 clinical matrix layout.
  3. Press `F4` to cycle to "Billing Focus". Verify 1-line `CompactPatientStrip` and 8-column cart table.
  4. Press `F4` to cycle to "Dense Split View". Verify 50/50 split and sticky `DenseBottomBar`.
  5. Navigate to `/settings/store`, change default layout mode to `Dense Split View`, save.
  6. Reopen `/pos/new-bill`. Verify `Dense Split View` initializes automatically.

### Workflow 13: Store Settings & Print Engine E2E Suite
- **Objective**: Test hardware print configurations and verify zero-financial-leakage in workshop lab slips.
- **Test Steps**:
  1. Navigate to `/settings/store`.
  2. Configure thermal receipt header, store GSTIN, footer terms.
  3. Trigger A4 Tax Invoice preview; assert standard GST tax breakup table (CGST + SGST).
  4. Trigger Workshop Job Slip preview; assert complete optical prescription powers are present, but all prices, taxes, and discounts are strictly omitted.

---

## 5. Definition of Done (DoD) for Automated Tests

Before any pull request or vibe-coding task is marked complete, it must satisfy:
- [ ] `npm run check` passes with **0 TypeScript compiler errors** and **0 ESLint warnings**.
- [ ] Relevant Playwright E2E spec files pass with **100% green status** (0 flakes).
- [ ] No hardcoded sleep timers (`page.waitForTimeout`) used in test specs; always use locator assertions (`await expect(locator).toBeVisible()`).
- [ ] Test isolation preserved; no test relies on data side-effects created by prior tests.
