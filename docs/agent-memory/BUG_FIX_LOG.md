# OptixOS — Compact Bug Fix Memory Ledger

> **Mandatory Rule for All AI Agents (Gemini, Claude, Cursor, Antigravity, etc.)**:
> 1. **Before writing or modifying code**, review the entries in this log to avoid repeating solved historical bugs.
> 2. **Whenever you fix a bug**, immediately append a new compact entry at the bottom following this exact format.

---

## Historical Bug Fix Ledger

### [BUG-001] `decimal.js` Serialization Drift
- **Component**: Financial calculations / `src/actions/` & `src/db/`
- **Symptom**: Monetary precision loss or runtime crash when saving amounts to Postgres `numeric(12, 2)`.
- **Root Cause**: Calling `.toNumber()` on `Decimal` instances converts high-precision decimal values to IEEE-754 binary floating-point numbers.
- **The Fix**: Always serialize monetary amounts using `.toFixed(2)` as a string:
  ```typescript
  totalAmount: new Decimal(amount).toFixed(2)
  ```
- **Permanent Invariant**: Never call `.toNumber()` on currency values. Persist and transfer as `.toFixed(2)` strings.

---

### [BUG-002] String Concatenation in Financial Addition
- **Component**: Invoice totals / `src/actions/invoice-actions.ts`
- **Symptom**: Invoices showing astronomical totals like `"100.0050.00"` instead of `150.00`.
- **Root Cause**: Database columns for money are returned by Drizzle as `string`. Using the native `+` operator resulted in string concatenation.
- **The Fix**: Wrap every operand in `new Decimal(...)` before performing addition:
  ```typescript
  const total = new Decimal(invoice.taxableValue).plus(new Decimal(invoice.totalTax)).toFixed(2);
  ```
- **Permanent Invariant**: Native mathematical operators (`+`, `-`, `*`, `/`) are strictly forbidden on monetary fields.

---

### [BUG-003] IEEE-754 Modulo Drift in 0.25 D Quarter-Step Diopter Validation
- **Component**: Clinical Refraction / `src/lib/validators/prescription.ts`
- **Symptom**: Valid prescription diopters like `0.75` or `-1.25` failed validation with "Must be in quarter steps".
- **Root Cause**: Floating-point binary representation caused `0.75 % 0.25` to evaluate to `0.2499999999999999` in JavaScript.
- **The Fix**: Integer-scale diopters by 100 before performing modulo operations:
  ```typescript
  export const isQuarterStep = (val: number): boolean => {
    const scaled = Math.round(val * 100);
    return scaled % 25 === 0;
  };
  ```
- **Permanent Invariant**: Always integer-scale dioptric power validation (`Math.round(val * 100) % 25 === 0`).

---

### [BUG-004] Thermal 80mm Roll Premature Print Cutting
- **Component**: Hardware Printing / `src/app/print-thermal.css`
- **Symptom**: Thermal receipt printers cut the receipt roll midway through printing after each line item.
- **Root Cause**: Applying CSS `page-break-inside: avoid` on line-item elements triggered a hardware auto-cutter escape sequence on POS receipt printers (Epson, TVS, Star).
- **The Fix**: Remove `page-break-inside: avoid` from thermal print styles. Constrain the container strictly to `72mm` printable width:
  ```css
  .thermal-receipt { width: 72mm; margin: 0 auto; }
  ```
- **Permanent Invariant**: Never apply `page-break-inside: avoid` to thermal receipt line items; lock container width to `72mm`.

---

### [BUG-005] Wholesale Cost Leak in Workshop Lab Slip
- **Component**: Workshop Printout / `src/components/admin/WorkshopJobSlip.tsx`
- **Symptom**: Wholesale frame and lens costs were visible to lab edging technicians via browser DOM inspection.
- **Root Cause**: Wholesale cost fields were rendered into HTML DOM and hidden using CSS `display: none` / `hidden`.
- **The Fix**: Completely excise financial elements, line prices, discounts, and payments from the React component JSX tree.
- **Permanent Invariant**: Lab tickets must never render pricing elements into the DOM tree. Redact at the SQL and component levels.

---

### [BUG-006] Over-Selling Race Condition in Inventory Checkout
- **Component**: Inventory Engine / `src/actions/checkout-actions.ts`
- **Symptom**: Stock quantities dropped below zero during concurrent checkout sessions for the same item.
- **Root Cause**: Application-level pre-checking (`if (item.stockQuantity >= qty)`) followed by an unconditional `UPDATE`.
- **The Fix**: Execute an atomic conditional decrement with `WHERE stock_quantity >= :qty RETURNING id` inside `db.transaction()`:
  ```typescript
  const [updated] = await tx
    .update(inventoryItems)
    .set({ stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}` })
    .where(and(eq(inventoryItems.id, item.id), sql`${inventoryItems.stockQuantity} >= ${item.quantity}`))
    .returning({ id: inventoryItems.id });
  if (!updated) throw new Error("Insufficient stock");
  ```
- **Permanent Invariant**: Never pre-check inventory in memory; always decrement atomically in SQL with `RETURNING`.

---

### [BUG-007] Better Auth 2FA TOTP Stale Record Collision (`TOTP_ALREADY_ENABLED`)
- **Component**: Auth & 2FA / `src/actions/account-actions.ts` & `src/app/auth/2fa/`
- **Symptom**: When a user disabled and re-enabled Authenticator App TOTP, Better Auth threw `TOTP_ALREADY_ENABLED` and failed.
- **Root Cause**: Previous unverified or disabled 2FA secrets remained in the `twoFactor` database table.
- **The Fix**: Built `resetTwoFactorAction()` to proactively purge stale disabled records prior to re-initiating TOTP setup, with auto-retry recovery on collision.
- **Permanent Invariant**: Always clean or overwrite stale unverified MFA records before generating new TOTP enrollment secrets.

---

### [BUG-008] Hardware Barcode Scanner Keystroke Interleaving
- **Component**: Counter POS / `src/hooks/use-barcode-scanner.ts`
- **Symptom**: Cashiers manually typing customer names or notes occasionally triggered accidental barcode lookups and cart additions.
- **Root Cause**: USB HID barcode scanners emulate keyboard typing, but fire characters in rapid bursts (<15ms) unlike human typing (>80ms).
- **The Fix**: Added a global keystroke burst buffer with a strict `<50ms` inter-character threshold ending in `Enter`. Slow human typing is immediately discarded.
- **Permanent Invariant**: All hardware keyboard emulation hooks must enforce an inter-character timing ceiling (<50ms).

---

### [BUG-009] WhatsApp Deep Link Phone Number Formatting Failure
- **Component**: Digital Receipts / `src/lib/whatsapp-utils.ts`
- **Symptom**: Clicking "Send WhatsApp Receipt" failed with invalid URL errors on phone numbers containing dashes, spaces, or missing country codes.
- **Root Cause**: User-entered phone numbers (`98765-43210` or `+91 9876543210`) were directly interpolated into `wa.me/` URLs.
- **The Fix**: Sanitize phone numbers by stripping non-digits and prepending the default Indian country code `91` if exactly 10 digits:
  ```typescript
  const cleaned = phone.replace(/\D/g, "");
  const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  ```
- **Permanent Invariant**: Normalize all phone numbers to digits-only with country code prefix before generating communication links.

---

### [BUG-010] Zod UUID Validation Mismatch on Synthetic Branch IDs
- **Component**: Prescription Validation / `src/lib/validators/prescription.ts`
- **Symptom**: E2E tests and synthetic branch creation failed Zod schema checks with `Invalid uuid`.
- **Root Cause**: Zod's default `z.string().uuid()` strictly validated RFC-4122 version-4 format, failing on deterministic test UUIDs (`00000000-0000-0000-0000-000000000001`).
- **The Fix**: Replaced with a flexible 32-character hex UUID regex pattern compliant across test and production environments.
- **Permanent Invariant**: Use environment-tolerant hex UUID regex validation for identifiers that accept synthetic seed fixtures.

---

### [BUG-011] Multi-Role Staff Collision with Better Auth Member Role
- **Component**: Staff Management / `src/actions/tenant-actions.ts` & `src/db/schema.ts`
- **Symptom**: Assigning a staff member both `Optometrist` and `Store Admin` roles failed or overwrote one role.
- **Root Cause**: Better Auth's `member` table defines `role` as a single `varchar` column.
- **The Fix**: Serialized assigned roles as a sorted comma-delimited string (e.g. `'admin,optometrist'`), with helper utilities `hasRole(member.role, 'optometrist')` to ensure backwards compatibility.
- **Permanent Invariant**: Multi-role assignments in single-role columns must use predictable comma-delimited serialization with parsing helper functions.

---

### [BUG-012] Redis Cache Stale Reads During Automated Testing
- **Component**: High-Speed Caching / `src/lib/redis.ts` & `src/db/seed.ts`
- **Symptom**: Playwright E2E tests occasionally failed because POS search returned stale cached data from previous test runs.
- **Root Cause**: Upstash Redis search cache keys have a 5-minute TTL and survived database transaction resets.
- **The Fix**: Integrated `safeRedisFlush()` into `seed.ts` and test isolation hooks to clear tenant cache keys at the start of each test run.
- **Permanent Invariant**: Whenever test fixtures or mock databases are seeded, explicitly invalidate corresponding Redis cache namespaces.

---

### [BUG-013] Wholesale `costPrice` Leak in `getInventoryList` Projection (SEC-001)
- **Component**: Inventory API / `src/actions/inventory-actions.ts`
- **Symptom**: Floor staff, cashiers, and optometrists could inspect network responses to view wholesale purchase cost prices (`costPrice`) on frames, lenses, and accessories.
- **Root Cause**: `getInventoryList()` projected `costPrice` unconditionally from Postgres without checking caller role or permissions.
- **The Fix**: Implemented `isManagerOrAdmin()` helper in `src/lib/auth-utils.ts` and conditionally projected `isManager ? inventoryItems.costPrice : sql<string | null>\`NULL\``.
- **Permanent Invariant**: Wholesale cost prices must always be redacted at the SQL query projection level for non-manager roles; never hidden via client-side CSS.

---

### [BUG-014] Patient Search API Parameter Mismatch (`q` vs `phone`)
- **Component**: Patient Search API / `src/app/api/patients/search/route.ts`
- **Symptom**: Searching for patient by phone number or name in the POS billing interface returned "No patient found matching..." even when customers existed in database.
- **Root Cause**: An earlier refactoring of `route.ts` with `withCache` extracted search query strictly from `searchParams.get('q')`, whereas `patient-search.tsx` sent `searchParams.get('phone')`.
- **The Fix**: Expanded query extraction to fall back across parameter aliases:
  ```typescript
  const query = (
    searchParams.get('phone') ??
    searchParams.get('q') ??
    searchParams.get('query') ??
    ''
  ).trim();
  ```
- **Permanent Invariant**: API query routes serving multiple UI consumers must support both specialized (`phone`) and generalized (`q`, `query`) parameter aliases.

---

### [BUG-015] Next.js 16 `'use server'` Non-Async Value Export Crash (`invalid-use-server-value`)
- **Component**: Server Actions & Client Bundler / `src/actions/plan-actions.ts` & `src/lib/feature-gate.ts`
- **Symptom**: Runtime compilation error `Error: Only async functions are allowed to be exported in a "use server" file. PRICING_PLANS was exported`.
- **Root Cause**: `plan-actions.ts` re-exported the constant `PRICING_PLANS` from a `'use server'` file, which violates Next.js 16 App Router Server Action boundaries. Additionally, importing DB schemas in shared feature-gate files triggered `isTTY` bundling errors in client components (`'use client'`).
- **The Fix**: Moved shared configuration constants (`PRICING_PLANS`, `PLAN_LIMITS_MAP`, `FEATURE_METADATA`) to a pure client-safe domain utility `src/lib/feature-gate.ts` without any DB dependencies or `'use server'` directives. Only async actions remain in `src/actions/`.
- **Permanent Invariant**: Files marked with `'use server'` must strictly export ONLY async functions. Shared constants, types, and client-accessible domain logic must live in decoupled utility modules under `src/lib/`.

---

### [BUG-016] Loading Screen Flicker on Directory Views Due to Missing Client SWR & Tier 2 Read-Wrapping
- **Component**: Client Navigation & Caching / `src/hooks/use-cached-resource.ts`, `src/actions/inventory-actions.ts`, `src/actions/patient-actions.ts`, `src/actions/tenant-actions.ts`
- **Symptom**: Navigating to Inventory, Patients, or Staff repeatedly displayed full-page loading spinners for 300–800ms even though data had already been loaded in previous visits.
- **Root Cause**: Directory components initialized state with `useState([])` and `isLoading = true`, lacking a local browser cache layer across route transitions. Furthermore, read actions (`getInventoryList`, `getPatients`, `getStaffMembersAction`) were not wrapped in `withCache()`, querying Neon PostgreSQL on every navigation.
- **The Fix**: Built universal SWR hook `useCachedResource` that synchronously hydrates data from `localStorage` in 0ms on the first render frame, revalidates silently in the background (`isRevalidating`), and auto-refreshes periodically (60s). Wrapped server read queries with `withCache` in Tier 2 and ensured mutations call `invalidateCache`.
- **Permanent Invariant**: Primary listing and directory views must never mount with empty state `[]` and `isLoading: true` displaying blocking spinners. Always use `useCachedResource` for 0ms initial render with non-blocking background revalidation.

---

### [BUG-017] Page Reload Loading Flash and Branch Filter Reset to Default Due to Asynchronous Persist Hydration and Overwriting in `setTenancyData`
- **Component**: Multi-Tenant Store & Client SWR Caching / `src/store/tenant-store.ts`, `src/components/layout/user-nav.tsx`, `src/hooks/use-cached-resource.ts`, `src/components/admin/inventory-view.tsx`, `patients-view.tsx`, `staff/page.tsx`
- **Symptom**: On hard page reload (F5): 1) A brief loading screen / spinner flash appeared before displaying cached catalog data, and 2) The user-selected branch/store filter was reset back to "All Branches".
- **Root Cause**:
  1. Zustand's persist middleware with `sessionStorage` rehydrates asynchronously in a `useEffect` after frame 0. On initial mount, `useTenantStore` defaulted to `selectedBranchIds: ['all']`, causing `useCachedResource` to calculate `cacheKey: 'inventory_list:all'` and query `localStorage` for the wrong key. When Zustand rehydrated to the user's selected branch, `cacheKey` changed, triggering a loading flash.
  2. In `src/components/layout/user-nav.tsx`, `getUserTenancyContext()` ran on mount and invoked `setTenancyData` with hardcoded `selectedBranchId: 'all'`, forcibly clobbering the user's saved branch selection on every page reload.
  3. Cold-loading state previously rendered heavy blocking `<Loader2>` spinner cards that flickered during SSR/initial hydration.
- **The Fix**:
---

### [BUG-018] React 19 Next-Themes Script Injection Warning & Client-Persisted Store Hydration Mismatches in UserNav, BranchSwitcher, and DashboardLayout
- **Component**: Next.js 16.3.5 / React 19 / Turbopack App Shell Layout / `src/components/theme-provider.tsx`, `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`, `src/components/layout/user-nav.tsx`, `src/components/layout/branch-switcher.tsx`
- **Symptom**:
  1. Console Error overlay: `Encountered a script tag while rendering React component... at ThemeProvider (src/components/theme-provider.tsx:10:10)`.
  2. Recoverable Error overlay: `Hydration failed because the server rendered HTML didn't match the client... at DashboardLayout (src/app/(dashboard)/layout.tsx:227:13)` with diff on `<a data-testid="nav-super-admin">`.
  3. Recoverable Error overlay: `Hydration failed because the server rendered text didn't match the client... at UserNav (src/components/layout/user-nav.tsx:182:11) at DashboardLayout` with diff:
     ```diff
     + className="text-[9px] px-1 py-0.2 rounded border font-semibold bg-blue-100 text-blue-700..."
     - className="text-[9px] px-1 py-0.2 rounded border font-semibold bg-purple-100 text-purple..."
     + Practice Admin
     - Root Super Admin
     ```
- **Root Cause**:
  1. `next-themes` injects an inline `<script>` tag to prevent flash of unstyled theme, which React 19 explicitly flags in Client Components via `console.error`. Next.js 16 (Turbopack) displays this as an intrusive dev error overlay.
  2. In `tenant-store.ts`, `getInitialPersistedTenantState()` read `sessionStorage` at module scope on the client (`typeof window !== 'undefined'`), while returning `{}` on the server. Consequently, on the server, `actualRole` and `activeRoleMode` defaulted to `'super_admin'`, rendering `<span ...>Root Super Admin</span>` with purple badges. On the client during frame-0 hydration, the store initialized with the user's persisted role (e.g. `'organizer'`, Practice Admin), generating blue badges and text.
  3. In `DashboardLayout`, role flags (`isSuperAdmin`, `isOrganizer`) were evaluated during SSR, causing the server to render `<a data-testid="nav-super-admin">` while the client hydration tree omitted it.
- **The Fix**:
  1. In `src/components/theme-provider.tsx`, added a development-mode console filter for the React 19 `next-themes` false-positive script warning and added `suppressHydrationWarning` to `<body>` in `src/app/layout.tsx`.
  2. In `src/components/layout/user-nav.tsx`, implemented the canonical `mounted` state pattern (`useState(false)` + `useEffect(() => setMounted(true), [])`). During SSR and initial client hydration frame 0 (`!mounted`), `UserNav` renders deterministic default text (`"Administrator"`, `"Active User"`, and neutral slate badge styling), guaranteeing byte-for-byte identical DOM trees between server HTML and client VDOM. Once mounted, it seamlessly transitions to the authenticated user's actual profile and active role badge.
  3. In `src/components/layout/branch-switcher.tsx`, implemented the `mounted` state pattern on `displayLabel`, `triggerIcon`, and branch counter badge so that initial SSR and client hydration trees match 100% identically with `"All Branches (Consolidated)"` before switching to the persisted branch selection.
  4. In `src/app/(dashboard)/layout.tsx`, guarded all role-gated navigation items with `mounted` (`mounted && activeRoleMode === 'super_admin'`) so that initial SSR and client hydration trees match 100%, safely rendering role-gated items after mount without hydration mismatch.

---

### [BUG-019] Operational Multi-Store Data Collisions & Playground Route Elimination via Single-Store Isolation & Consolidated Practice Reports Hub
- **Component**: Multi-Store Architecture & Navigation / `src/store/tenant-store.ts`, `src/components/layout/branch-switcher.tsx`, `src/components/layout/user-nav.tsx`, `src/components/admin/reports-view.tsx`, `src/actions/report-actions.ts`, `src/components/admin/inventory-view.tsx`, `src/components/admin/patients-view.tsx`, `src/components/admin/lab-orders-view.tsx`, `src/components/priority-notes/priority-notes-drawer.tsx`
- **Symptom**:
  1. Practice administrators loading multiple or "All Stores" simultaneously in operational screens experienced data collisions and cognitive overload (e.g. colliding store settings, notes, stock counters, and local order operations).
  2. Legacy playground (`/playground`) and simulator (`/super-admin/simulator`) routes cluttered the codebase and navigation.
- **Root Cause**:
  1. The UI permitted multi-select (`selectedBranchIds: ['all']` or multiple IDs) in operational workflows (POS, inventory tables, patient lists, lab kanban, priority notes), requiring complex merged-branch grouping logic and risking store-level operational errors.
  2. Unwanted experimental playground routes remained linked in the UI navigation.
- **The Fix**:
  1. **Playground & Simulator Removal**: Completely deleted `src/app/playground/` and `src/app/super-admin/simulator/`, removed simulator links from `src/app/super-admin/layout.tsx`, and updated `src/components/layout/simulation-banner.tsx` exit button to route to `/super-admin/dashboard`.
  2. **Single-Store Architectural Isolation**: In `src/store/tenant-store.ts`, eliminated `'all'` selection mode and `toggleBranchSelection`. Set `selectedBranchId` to default branch UUID, and maintained `selectedBranchIds: [selectedBranchId]` as an atomic single-element array.
  3. **Operational Screen Scoping**: Updated POS view, Inventory table/forms, Patients directory, Lab Orders kanban, Staff list, and Priority Notes drawer to scope directly to `selectedBranchId`. Removed merged-branch grouping logic and updated local SWR cache keys.
  4. **Consolidated Practice Reports Hub**: Migrated all cross-store practice analysis, store comparisons, and multi-store filtering to `/admin/reports`. Added `branchScope` filter (`'all'` vs individual stores) to `FinancialsReportFilter` and added `storeBreakdown` comparative metrics (order count, gross revenue, collected, balance due, and practice share percentage) calculated with `decimal.js`.
  5. **Branch Switcher Redesign**: Redesigned `branch-switcher.tsx` into an active store switcher with a direct quick link to the Consolidated Practice Reports Hub.
- **Permanent Invariant**:
  1. Operational screens (POS, inventory, patients, lab orders, staff, notes) must ALWAYS be bound strictly to a single physical store (`selectedBranchId: string`). Multi-store `'all'` selection is strictly prohibited on operational screens.
  2. Cross-store comparative analysis, practice aggregations, and multi-store reporting must reside exclusively in the Consolidated Practice Reports Hub (`/admin/reports`).

---

### [BUG-020] Drizzle ORM Schema Join Mismatch for Optical Prescriptions & Invoices Table Mapping in Dashboard Actions
- **Component**: Operational Dashboard & Customer Portal / `src/actions/dashboard-actions.ts`, `src/actions/customer-portal-actions.ts`
- **Symptom**: Build failure and query error when querying active workshop lab orders and customer prescriptions:
  1. `Cannot find name 'orders'` in `src/actions/dashboard-actions.ts`.
  2. `opticalPrescriptions` query filtering on `organizationId` column which does not exist on `optical_prescriptions` table.
- **Root Cause**:
  1. In OptixOS, optical lab orders are represented by `invoices` (`invoices.orderStatus` with values `ORDERED`, `SENT_TO_LAB`, `IN_FITTING`, `READY_FOR_COLLECTION` and `invoices.promisedDeliveryDate`). There is no separate `orders` table in the Drizzle schema.
  2. `opticalPrescriptions` table links directly to `customerId` (`opticalPrescriptions.customerId = customers.id`) without a redundant `organizationId` foreign key column.
- **The Fix**:
  1. In `src/actions/dashboard-actions.ts`, removed nonexistent `orders` import and queried active workshop lab orders directly from `invoices` joined with `customers` using `inArray(invoices.orderStatus, activeLabStatuses)` and `invoices.promisedDeliveryDate`.
  2. In `src/actions/customer-portal-actions.ts`, removed `opticalPrescriptions.organizationId` filter and filtered strictly by `eq(opticalPrescriptions.customerId, customerRecord.id)`.
- **Permanent Invariant**:
  1. Workshop lab orders in OptixOS must ALWAYS be queried through `invoices` with `inArray(invoices.orderStatus, activeLabStatuses)`.
  2. `opticalPrescriptions` records must ALWAYS be queried by `customerId` joined through `customers.id`.

---

### [BUG-021] Lens Pairing Linkage & Candidate Frame Hidden Option Collision in Product Dispatcher Test Suite
- **Component**: POS Billing Cart & Product Dispatcher / `src/components/pos/add-product-modal.tsx`, `src/components/pos/pos-view.tsx`, `src/components/pos/billing-cart.tsx`, `e2e/pos-checkout.spec.ts`
- **Symptom**: In E2E Test Case 7, after executing "Lens Only" followed by "Sunglasses 1-Click Direct Add", assertion `expect(page.locator('text=UV400').first()).toBeVisible()` failed because locator resolved to a hidden `<option>` element instead of the visible sunglasses cart item row.
- **Root Cause**:
  1. In `add-product-modal.tsx` (`handleConfirmLensOnly`) and `pos-view.tsx` (`handleConfigureSpectaclePair`), created lens cart items were not explicitly paired with the accompanying customer frame or frame item (`linkedFrameId` and `linkedFrameName` were omitted).
  2. When sunglasses were added to the cart, the unpaired lens rendered a `<select aria-label="Pair with Cart Frame">` populated with candidate frames including the sunglasses item. The `<option>` text contained "UV400".
  3. Because the `<select>` preceded the sunglasses row in the DOM and was unopened, Playwright's `locator('text=UV400').first()` targeted the hidden `<option>` element.
- **The Fix**:
  1. Updated `handleConfirmLensOnly` in `add-product-modal.tsx` and `handleConfigureSpectaclePair` in `pos-view.tsx` to set `linkedFrameId` and `linkedFrameName` on lens items, automatically displaying the emerald `Paired: ...` badge and avoiding the unpaired frame selector dropdown.
  2. In `e2e/pos-checkout.spec.ts`, updated line 393 to use `.filter({ visible: true }).first()` to guard against hidden select option collisions.
- **Permanent Invariant**: Lenses generated through paired workflows (Spectacle Pair Wizard, Customer Frame Glazing) must always be explicitly linked to their frame (`linkedFrameId` and `linkedFrameName`). In Playwright assertions where text matches dropdown options, filter by visibility (`.filter({ visible: true })`) or target table cells directly.

---

### [BUG-022] Store Profile `allowNegativeStock` Fallback Invariant Protecting Atomic Inventory Deductions
- **Component**: Inventory Processing & Atomic Stock Lock / `src/db/schema.ts`, `src/actions/process-optical-order.ts`
- **Symptom**: Potential bypass of atomic stock decrement guard where a null or undefined `allowNegativeStock` could permit selling out-of-stock items without throwing `InsufficientStockError`.
- **Root Cause**: In `process-optical-order.ts`, the negative stock check evaluated `storeProfile?.allowNegativeStock ?? true` or unverified fallbacks, defaulting to allowing negative stock when not configured.
- **The Fix**:
  1. Defined `storeProfile.allowNegativeStock` to strictly default to `false` in `schema.ts`.
  2. Enforced strict boolean fallback `storeProfile?.allowNegativeStock === true` in `process-optical-order.ts` so atomic stock locking (`WHERE stock_quantity >= :qty`) is enforced by default unless an organization merchant explicitly opts into negative stock deduction.
- **Permanent Invariant**: `allowNegativeStock` must ALWAYS evaluate to `false` by default to preserve the atomic inventory locking invariant (`BUG-006`).

---

### [BUG-023] Product Type Dynamic Wizard Step Property Mismatch Crash, POS Button Duplicate `+`, Lab Orders Space De-congestion & Direct POS Viewport Mode Switcher
- **Component**: POS Add Product Modal, Lab Orders Kanban View, POS Viewport Modes / `src/components/pos/add-product-modal.tsx`, `src/components/pos/pos-view.tsx`, `src/components/admin/lab-orders-view.tsx`, `e2e/pos-layout-modes.spec.ts`
- **Symptom**:
  1. In Add Product modal, clicking any seeded product category threw a runtime `TypeError` (`cannot read properties of undefined (reading 'find')` or `reading 'map'`) and fell back to the old menu.
  2. The Add Product button in the POS header displayed a duplicate plus sign (`[+] + Add Product [F2]`).
  3. The Lab Orders Kanban board was vertically congested by an extra standalone card container box around search and filter controls.
  4. The POS header retained an unnecessary `<select>` dropdown with "Adaptive Modes", "Dense Split", "Classic Split" and an "Adaptive Modes" tag, rather than showing direct viewport actions.
- **Root Cause**:
  1. Product type steps seeded via `migrate-product-types.ts` used camelCase properties (`stepName`, `inputType`, `options`, `dependency`), whereas `add-product-modal.tsx` accessed snake_case properties (`step.step_name`, `step.input_type`, `step.options_array`). Direct calls to `step.options_array.find(...)` or `.map(...)` threw `TypeError`.
  2. In `pos-view.tsx`, the Add Product button rendered both an explicit `+` icon/character and the label `+ Add Product [F2]`.
  3. In `lab-orders-view.tsx`, common search and filter controls were wrapped inside an extra card wrapper (`bg-card border border-border rounded-xl p-2.5 shadow-2xs`), taking excessive vertical space.
  4. The POS layout selector used a redundant dropdown and layout architecture abstraction instead of exposing direct one-click mode switches (`Rx`, `Split`, `Cart`).
- **The Fix**:
  1. **Normalized Step Getters in Add Product Modal**: Implemented `getStepName(step)`, `getInputType(step)`, and `getStepOptions(step, stepSelections)` supporting both camelCase and snake_case properties with fallback to empty array `[]`. Updated `calculateWizardPrice`, `handleFinishWizard`, and dynamic sequential step wizard (VIEW 3) to use normalized getters. Added global search and explicit "Search" buttons across all category views.
  2. **Duplicate Plus Removal**: Cleaned Add Product button label in `pos-view.tsx` to `<span>Add Product [F2]</span>`.
  3. **Lab Orders De-congestion**: Removed the extra wrapper card box in `lab-orders-view.tsx`. Inline search, common filter chips (All, Overdue, Balance Due), sort dropdown, and view switcher on a single toolbar line. Embedded domain-specific sub-filter pills inside each Kanban column header (Col 1: All vs Urgent; Col 2: All vs Lab vs Fitting; Col 3: All vs Balance Due vs Paid).
  4. **Direct POS Viewport Modes**: Removed `<select data-testid="pos-layout-type-select">` and "Adaptive Modes" tag. Implemented direct segmented viewport buttons: `👁️ Rx` (`btn-mode-rx-focus`), `⚖️ Split` (`btn-mode-split`), and `🛒 Cart [F4]` (`btn-mode-billing-focus`). Simplified `renderLayout` to directly render active mode with persistence in `optixos_pos_mode`. Updated `e2e/pos-layout-modes.spec.ts`.
- **Permanent Invariant**: Always access product type step fields using normalized getters (`getStepName`, `getStepOptions`). Kanban boards must not wrap search toolbars in redundant card boxes when space is congested. POS layout controls must expose direct 1-click viewport mode buttons.

---

### [BUG-024] Add Product Modal Suppressed Configured Store Product Types via Exclusion Filter & Static Fallback Display
- **Component**: POS Add Product Modal / `src/components/pos/add-product-modal.tsx`
- **Symptom**: When clicking "+ Add Product [F2]", the modal failed to show the user's active/configured product types (e.g. Spectacle Lenses, Frames & Mountings, Sunglasses, Contact Lenses, or custom types configured in Admin Settings) and instead persistently displayed the hardcoded static optical categories ("old view").
- **Root Cause**:
  1. In `add-product-modal.tsx`, the dynamic product types section filtered with `.filter(p => !['LENS', 'FRAME', 'SUNGLASS', 'CONTACT_LENS'].includes(p.code))`, which explicitly excluded all default seeded product types (`LENS`, `FRAME`, `SUNGLASS`, `CONTACT_LENS`), resulting in an empty array `[]`.
  2. The primary view above it unconditionally mapped over the static `CATEGORIES` array ("Power Glasses", "Blue-Cut Glasses", "Sunglasses", "Contact Lenses", "Lens Only", "Frame Only"), preventing store-configured product types from being displayed.
- **The Fix**:
  1. Replaced the static category cards in VIEW 1 with a dynamic grid rendering all enabled product types fetched from `getEnabledProductTypesAction()`.
  2. Each product type card dynamically presents its configured name, description, icon (from `ICON_MAP`), base price (`From ₹...`), step count badge (`N Steps Wizard`), and prescription linkage badge (`Rx Required`).
  3. Clicking any product type with configured steps launches the dynamic sequential step wizard (`setSelectedType(type)`), while direct catalog types launch their respective inventory views.
  4. Preserved dedicated "Special Dispensing Presets" below (Lens Only Customer Frame Re-glaze and Blue-Cut Screen Defense) and maintained 100% backward compatibility with all existing E2E test IDs.
- **Permanent Invariant**: The Add Product modal must dynamically source its primary interactive grid from `productTypes` (`getEnabledProductTypesAction`), ensuring any additions, renamings, or step modifications made in Admin Settings -> Product Types immediately reflect in the POS counter.

---

### [BUG-025] Optical Lens & Frame 1:1 Pairing Strictness, Frame Zero-Power Invariant, Corneal Vertex Distance Converter & Clinical UI Elevation
- **Component**: POS Billing Cart, Add Product Modal, Refraction Grid, Patient Identity Card / `src/lib/vertex-converter.ts`, `src/components/pos/billing-cart.tsx`, `src/components/pos/add-product-modal.tsx`, `src/components/pos/prescription-grid.tsx`, `src/components/pos/pos-view.tsx`, `src/components/pos/patient-search.tsx`
- **Symptom**:
  1. Frames and sunglasses displayed "Choose Power" / "View Power" buttons in the billing cart and product selector, violating optical domain invariants.
  2. Multiple ophthalmic lenses could be paired to the same frame simultaneously in the cart, risking lab dispatch confusion.
  3. Contact lenses require corneal plane vertex distance power adjustment ($F_{CL} = \frac{F_{spec}}{1 - d \cdot F_{spec}}$, $d = 12$mm) and spherical equivalent calculation, but lacked an automated converter.
  4. Customer profile workspace in the POS and refraction power grid were visually inadequate and congested.
- **Root Cause**:
  1. Billing cart logic did not distinguish frames from lenses when rendering power inspection triggers.
  2. Candidate frame filtering only checked `p.category === 'FRAME'` without verifying if the frame was already bound to another lens (`linkedFrameId`).
  3. There was no mathematical corneal vertex converter engine in the optical domain layer.
  4. Patient information was rendered across 4–6 plain rectangular boxes, and the refraction matrix lacked distinct dual-eye visual hierarchy.
- **The Fix**:
  1. **Frame Zero Power Invariant**: Removed power buttons from all frames (`FRAME`, `SUNGLASS`, `SUNGLASSES`) in `billing-cart.tsx`, replacing them with a non-interactive `Frame (Zero Power Invariant)` badge. Power selection is strictly restricted to lenses and contact lenses.
  2. **Strict 1:1 Lens-Frame Pairing**: Updated `availableCandidateFrames` in `billing-cart.tsx` and `add-product-modal.tsx` to filter out any frame already linked to another cart item (`!items.some(other => other.id !== item.id && other.linkedFrameId === cf.id)`). When all frames are paired, clearly display `(All frames in cart already paired 1:1)`.
  3. **Corneal Vertex Converter Engine (`src/lib/vertex-converter.ts`)**: Built a clinical vertex distance converter using $F_{CL} = \frac{F_{spec}}{1 - d \cdot F_{spec}}$ with 0.25 D integer-scaled quarter step rounding, spherical equivalent mode for astigmatism $< 0.75$ D, and clinical alerts (significant vertex effect $\ge \pm 4.00$ D, toric recommendation, presbyopia).
  4. **Integrated Converter Drawer**: Added vertex converter drawer into `prescription-grid.tsx` with toggle button, standard BVD selection (10mm, 12mm, 14mm), and 1-click clipboard copy. In `add-product-modal.tsx`, integrated the converter into the contact lens flow with 1-click "⚡ Apply Converted Power to OD / OS".
  5. **Clinical UI & Dual-Eye Refraction Matrix Elevation**:
     - Redesigned patient workspace in `pos-view.tsx` into a clinical identity card with initials avatar, 1-click copy phone, demographic tags, advance credit badge, and interactive past orders button.
     - Elevated `patient-search.tsx` dropdown list with distinct initials avatars, primary vs. dependent badges, and contact details.
     - Redesigned `prescription-grid.tsx` with Sky Blue (OD Right Eye) and Violet (OS Left Eye) row themes, color-coded diopters (Rose for myopia, Sky/Violet for hyperopia), and tactile `+` / `−` steppers.
- **Permanent Invariant**:
  1. Frames (shop frames or customer's own frames) must NEVER contain or prompt for optical power.
  2. Exactly one ophthalmic lens can pair with exactly one frame (1:1 pairing).
  3. Contact lenses must always provide an accessible Spectacle Rx to Contact Lens Corneal Vertex Converter ($d = 12$mm standard).

---

### [BUG-026] Cart Item Single-Patient Assignment Clutter, Power Selection Modal Customer/Rx Auto-Display & Cross-Viewport Family Member Removal
- **Component**: POS Billing Cart, Power Selector Modal, Prescription Grid, Patient Clinical Workspace / `src/components/pos/billing-cart.tsx`, `src/components/pos/prescription-grid.tsx`, `src/components/pos/pos-view.tsx`
- **Symptom**:
  1. In single-patient billing sessions (95%+ of checkouts), each cart line item displayed an unnecessary `Assign to Patient:` dropdown and `👤 Patient` badge in its description.
  2. Clicking "Choose Power" / "View Power" on a cart item did not show the active added customers and their current powers, requiring manual diopter entry.
  3. The quick-remove `(×)` button for family members was only present in the `CompactPatientStrip` (Billing focus mode), but completely absent in Rx focus and Split modes.
- **Root Cause**:
  1. In `billing-cart.tsx`, the patient assignment badge and dropdown were conditionally rendered with `activePatients.length > 0`, triggering even when only a single patient was on the order.
  2. `CartRxInspectorModal` did not accept `activePatients` or `availablePrescriptions`, showing only a blank diopter matrix or single attached session Rx without customer context.
  3. In `pos-view.tsx`, `renderPatientClinicalWorkspace` (used in Rx and Split modes) only displayed the invoice account selector and add family button, omitting the family member badges and `removeFamilyMember` triggers. `PrescriptionGrid` tabs also lacked remove buttons.
- **The Fix**:
  1. **Single-Patient Clutter Removal**: Changed cart patient badge and dropdown checks in `billing-cart.tsx` to `activePatients && activePatients.length > 1`. Single-customer checkouts now render clean line item descriptions without redundant assignment controls, while multi-member family orders retain full per-item assignment and test compatibility.
  2. **Active Customer Power Cards in Power Selector**: Passed `activePatients`, `availablePrescriptions`, and `patientPrescriptionHistories` to `CartRxInspectorModal`. Added an interactive "Active Added Customers on Order & Their Powers" section displaying each customer's name, relationship, and formatted OD/OS powers. Clicking any customer applies their power into `activeRx`, updates the preview matrix, and sets `assignedPatientId` on save.
  3. **Cross-Viewport Family Member Removal**:
     - Added family member chips with `(×)` remove buttons to `renderPatientClinicalWorkspace` top bar in `pos-view.tsx` when `dynamicActivePatients.length > 1`.
     - Added `onRemovePatientTab?: (patientId: string) => void` to `PrescriptionGridProps` and rendered `(×)` remove buttons on multi-family tabs in `prescription-grid.tsx`, wired to `removeFamilyMember` in `pos-view.tsx`.
- **Permanent Invariant**:
  1. "Assign to Patient:" controls in the cart must ONLY be displayed when multiple family members exist on the order (`activePatients.length > 1`).
  2. Power inspection modals on lens items must always list active added customers on the order alongside their current clinical powers for 1-click selection and assignment.
  3. Family member removal `(×)` must be accessible in ALL 3 POS Viewport Modes (Billing Focus, Rx Focus, Split Mode).

---

### [BUG-027] Multi-Tenant Isolation Bleed, Three-Tier User Hierarchy Architecture & Dedicated Staff Portal
- **Component**: Auth, Tenancy Context, Onboarding, Staff Management, Branch Switcher, SaaS Plan Gating / `src/lib/auth-utils.ts`, `src/actions/tenant-actions.ts`, `src/store/tenant-store.ts`, `src/app/auth/login/page.tsx`, `src/app/auth/staff-login/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/components/layout/branch-switcher.tsx`
- **Symptom**:
  1. Newly registered SaaS practice owners (Org Admins) saw the seeded demo invoices and patients of `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`) instead of being routed to clean onboarding and receiving an isolated workspace.
  2. Store staff were conflated with SaaS customer accounts, lacking Practice ID scoping and seeing SaaS plans and upgrade modals.
  3. Staff could only be assigned to a single branch; multi-store staff could not switch between assigned branches.
- **Root Cause**:
  1. `getCurrentSession()` in `auth-utils.ts` defaulted any authenticated session without an active membership to `DEFAULT_ORG_ID`.
  2. `useTenantStore` hardcoded `selectedOrganizationId` to `DEFAULT_ORG_ID` and preserved it during `setTenancyData`.
  3. Sign-up redirect in `login/page.tsx` routed new users to `/admin/dashboard` instead of `/onboarding`.
  4. Organizations lacked unique human-friendly practice codes (`orgCode` e.g. `OPT-1`, `orgNumber` e.g. `1`).
  5. Multi-store staff assignments were not modeled in PostgreSQL schema.
  6. SaaS upgrade links, plan badges, and onboarding modals were visible to non-owner staff roles.
- **The Fix**:
  1. **Schema & Migration**: Added `orgCode` (`OPT-X`) and sequential `orgNumber` to `organizations`. Added `mustChangePassword` to `user`. Created `staffStoreAssignments` table for multi-store staff access. Migrated Postgres DB and backfilled `OPT-1` / `1`.
  2. **Tenancy Context Isolation**: Updated `getCurrentSession()` to return `hasOrganization: false` for new users without org membership. Updated `setupPracticeOnboardingAction` to assign sequential codes, create owner membership, create primary branch, and create initial store assignment. Updated `tenant-store.ts` to adopt `data.selectedOrganizationId`. Updated `login/page.tsx` to redirect new signups to `/onboarding`.
  3. **Staff Management & Multi-Store**: Updated `createStaffMemberAction` to accept password, forced change flag, and multi-store assignments. Updated UI in `/admin/staff` with store badges and maker-checker approval for Store Manager deletions.
  4. **Dedicated Staff Portal**: Created `/auth/staff-login` with 3 fields: Practice ID (`OPT-X` or `X`), Staff Email, Password. Added preflight verification and forced first-login password change flow.
  5. **SaaS Redaction & Branch Scoping**: Redacted Plans & Upgrade links, SaaS plan badges, and onboarding modals for staff roles in `(dashboard)/layout.tsx`. Added route protection on `/pricing`. Updated `BranchSwitcher` so multi-store staff can switch between their assigned branches.
- **Permanent Invariants**:
  1. Newly signed up practice owners must never be defaulted to `DEFAULT_ORG_ID` or see demo data.
  2. Store staff and store managers must NEVER see SaaS plans, pricing pages, upgrade links, or subscription modals.
  3. Staff login must strictly require the Organization/Practice Code (`OPT-X` or raw numeric `X`).
  4. Staff deletion by Store Managers must strictly require Maker-Checker approval by the Org Admin.

---

### [BUG-028] Super Admin Portal Architectural Decoupling, Dedicated OTP-Only Authentication Gateway & Zero-Stores Database State
- **Component**: Root Super Admin Governance, Authentication Domain Decoupling, OTP Security Subsystem / `src/app/super-admin/layout.tsx`, `src/app/super-admin/login/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/components/layout/user-nav.tsx`, `src/middleware.ts`, `src/actions/super-admin-auth-actions.ts`, `src/lib/super-admin-session.ts`, `src/db/clean.ts`, `src/db/schema.ts`
- **Symptom**:
  1. Super Admin portal was coupled with the standard practice dashboard (e.g. `nav-super-admin` in practice sidebar, `link-super-admin-console` in UserNav, and `link-back-to-pos` in the Super Admin layout).
  2. Super Admin login previously relied on passwords and Google OAuth rather than an isolated, high-security One-Time Password (OTP) gateway with configurable expiration.
  3. Database contained demo organizations and seeded stores rather than a clean "0 stores" initial state.
- **Root Cause**:
  1. Super Admin navigation links were embedded in standard practice layouts, and middleware checked standard `better-auth.session_token` for all routes instead of maintaining separate authentication domains.
  2. Super admin login lacked a dedicated single-use OTP generation and verification flow with real-time countdown timer driven by `SUPER_ADMIN_OTP_EXPIRY_SECONDS`.
  3. Next.js 16 React Server Action invariant: `'use server'` files only allow exporting `async` functions; non-async constants or helpers in `src/actions/` trigger compile-time failure.
- **The Fix**:
  1. **Architectural Decoupling**: Completely removed `nav-super-admin` and header breadcrumbs from `src/app/(dashboard)/layout.tsx`, removed `link-super-admin-console` from `src/components/layout/user-nav.tsx`, and removed `link-back-to-pos` from `src/app/super-admin/layout.tsx`.
  2. **Isolated OTP Gateway**: Created `superAdminOtps` table in PostgreSQL with HMAC-SHA256 hashed codes, expiry timestamps, and attempt tracking. Built dedicated 2-step OTP-only login UI (`src/app/super-admin/login/page.tsx`) with live countdown timer (`MM:SS`) driven by `SUPER_ADMIN_OTP_EXPIRY_SECONDS`.
  3. **Dedicated Session Cookie**: Issued `optixos_super_admin_session` HTTP-only, secure session cookie on OTP verification. Updated `src/middleware.ts` to strictly isolate `/super-admin/*` routes.
  4. **Next.js 16 Server Action Compliance**: Extracted synchronous token verification and constants to `src/lib/super-admin-session.ts`, keeping `src/actions/super-admin-auth-actions.ts` purely asynchronous.
  5. **Zero-Stores Purge**: Updated `src/db/clean.ts` across all 25 PostgreSQL tables and flushed Redis cache, bringing the database to a verified state of 0 organizations and 0 branches. Added elegant empty state UI to Super Admin dashboard and directory views.
- **Permanent Invariants**:
  1. Super Admin navigation and authentication must remain strictly decoupled and never attached to practice stores or user dashboards.
  2. Super Admin login must exclusively authenticate via single-use One-Time Passwords (OTP) expiring strictly based on `SUPER_ADMIN_OTP_EXPIRY_SECONDS`.
  3. In Next.js `'use server'` files, strictly export ONLY async functions. Synchronous helpers and constants must reside in `src/lib/`.

---

### [BUG-029] React 19 SSR Hydration Mismatch on SWR Client Cached Branch Name & Stale LocalStorage Purge
- **Component**: Operational Dashboard / SWR Cached Resource / `src/components/admin/dashboard-view.tsx`, `src/hooks/use-cached-resource.ts`, `src/store/priority-notes-store.ts`, `src/actions/settings-actions.ts`, `src/components/admin/settings-view.tsx`
- **Symptom**: React 19 Recoverable Hydration Mismatch on `/admin/dashboard`:
  `Hydration failed because the server rendered text didn't match the client.`
  `- Active Branch`
  `+ Downtown Clinic Branch`
  `at span at DashboardView (src/components/admin/dashboard-view.tsx:93:15)`
- **Root Cause**:
  1. Next.js pre-renders `DashboardView` on the server (SSR). Because Node.js has no `window.localStorage`, `useCachedResource` rendered the server fallback (`'Active Branch'`).
  2. On client browser hydration, `useCachedResource` read stale `localStorage` from a previous test/seed run (which stored `'Downtown Clinic Branch'`).
  3. React 19 detected a mismatch between the server-rendered HTML and client initial virtual DOM.
  4. In `src/store/priority-notes-store.ts`, a hardcoded `DEFAULT_SAMPLE_NOTES` array contained mock notes and outdated branch names.
- **The Fix**:
  1. In `src/components/admin/dashboard-view.tsx`, added `mounted` state, derived the active store name dynamically from `branches` in tenant store, aligned the SSR fallback to `'Store Location'`, and added `suppressHydrationWarning` on the branch badge span.
  2. In `src/hooks/use-cached-resource.ts`, updated `STORAGE_PREFIX` to `optix_client_cache_v2:`, implemented automatic pruning of legacy/stale `optix_client_cache:*` keys on client startup, and exported `clearClientStorageCaches()`.
  3. In `src/actions/settings-actions.ts` & `src/components/admin/settings-view.tsx`, added `clearApplicationCacheAction()` and an interactive "Clear All Caches" button allowing practice managers to instantly flush all client and server Redis caches.
  4. Flushed the server-side Redis cache and verified the database contains 0 mock data.
  5. In `src/store/priority-notes-store.ts`, purged `DEFAULT_SAMPLE_NOTES` and set `notes: []` by default.
- **Permanent Invariants**:
  1. SSR-rendered client components reading browser storage or SWR cache must use `mounted` or `suppressHydrationWarning` to eliminate text hydration mismatches.
  2. Never store hardcoded mock notes or fake branch names in persistent stores.
  3. When client storage cache schemas change, increment `STORAGE_PREFIX` version to auto-prune stale legacy browser storage.

---

### [BUG-030] Organization Owner Displayed in Staff Table, Approval Invariant Misalignment & Separation of Concerns via Dedicated Owner Portal (`/owner`)
- **Component**: Staff Management, Multi-Tier RBAC, Approval Architecture & Dedicated Owner Portal / `src/actions/tenant-actions.ts`, `src/actions/approval-actions.ts`, `src/app/owner/*`, `src/app/(dashboard)/layout.tsx`, `src/middleware.ts`, `src/components/layout/user-nav.tsx`, `src/components/admin/reports-view.tsx`
- **Symptom**:
  1. The practice Organization Owner appeared as an editable/deletable row in the store staff employee table.
  2. Branch deletions were erroneously routed to the SaaS Super Admin for approval, violating the principle of practice owner sovereignty.
  3. Practice-level cross-branch governance (branch creation/deletion, staff allocation, consolidated reports) was conflated with store-level POS counter operations.
  4. Store staff could potentially see consolidated multi-store reporting options.
- **Root Cause**:
  1. `getStaffMembersAction` did not exclude members with the `owner` role, and role update/delete actions lacked checks preventing modifications to the owner.
  2. Maker-checker approval definitions included `delete_branch` under Super Admin approval, when in reality practice owners have sovereign authority over their branches; the ONLY action requiring Super Admin approval is requesting the permanent deletion of the entire organization (`delete_organization`).
  3. Store managers and owners shared the same operational `/pos` and `/admin` navigation without an isolated executive practice headquarters.
- **The Fix**:
  1. **Owner Omission from Staff Directory**: Filtered out `role === 'owner'` in `getStaffMembersAction`. Added explicit security guards in `updateStaffMemberRolesAction` and `deleteStaffMemberAction` blocking any attempt to modify or delete the organization owner.
  2. **Sovereign Branch Actions & Approval Realignment**: Implemented `deleteBranchAction` directly for the Organization Owner without Super Admin approval (maintaining the 1-branch minimum invariant). Added `requestOrganizationDeletionAction` for the sole Super Admin approval flow (`delete_organization`). Updated `resolveStoreApprovalRequestAction` so owners can review and execute internal `delete_staff` requests submitted by store managers.
  3. **Dedicated Organization Owner Portal (`/owner/*`)**: Built a dedicated executive workspace with an Executive Sidebar, Topbar with Practice ID badge, and "Launch Store POS Counter" modal with branch selector. Sub-pages include Executive Cockpit (`/owner`), Physical Store Management (`/owner/branches`), Multi-Store Staff Allocation (`/owner/staff`), Consolidated Practice Analytics (`/owner/reports`), Maker-Checker Approvals Queue (`/owner/approvals`), and Practice Settings & Danger Zone (`/owner/settings`).
  4. **Strict Staff Isolation**: Store staff and managers are strictly isolated to the Store POS counter (`/pos/*` and `/admin/*`). If assigned to multiple branches, staff can switch active stores via `BranchSwitcher`, but their reporting scope is strictly locked to their single active store. Middleware and layout guards block staff from accessing `/owner/*`.
- **Permanent Invariants**:
  1. The Organization Owner must NEVER appear in the staff employee directory or be editable/deletable through staff management.
  2. Inside an organization, the Practice Owner has sovereign authority over all branches, staff, inventory, and operations. The ONLY operation requiring SaaS Super Admin approval is requesting the permanent deletion of the organization (`delete_organization`).
  3. Store staff and store managers must NEVER access the Organization Owner Portal (`/owner/*`) or view consolidated multi-branch reports.

---

### [BUG-031] Staff First-Time Password Reset Failure, Role Conflation Privilege Escalation & Staff Portal Bypass
- **Component**: Staff Authentication, First-Time Forced Password Reset, RBAC Role Conflation & Owner Portal Isolation / `src/actions/staff-auth-actions.ts`, `src/actions/tenant-actions.ts`, `src/app/auth/login/page.tsx`, `src/app/auth/staff-login/page.tsx`, `src/app/(dashboard)/admin/staff/page.tsx`
- **Symptom**:
  1. Staff members with "Must reset password at first login" encountered an error during the first-time password change modal in `/auth/staff-login`, failing to complete setup and enter the system.
  2. Staff members could bypass the Staff Portal entirely and log in directly at the Owner Portal (`/auth/login`) with their temporary/existing password without Practice ID or mandatory reset, and were granted store admin / organizer access.
  3. Non-owner staff members (e.g. `staff@gmail.com`) could view the employee list in `/admin/staff`, edit their own permissions to add `admin`, and immediately gain top-level Organization Owner Portal (`/owner/*`) access.
- **Root Cause**:
  1. `completeStaffInitialPasswordChangeAction` invoked Better Auth's `auth.api.setUserPassword`, which enforces `adminMiddleware` requiring an active admin session. A first-time staff user had no admin session, triggering `YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD`.
  2. `/auth/login` had no pre-flight verification to detect store staff accounts belonging to organizations, allowing them to authenticate without Practice ID.
  3. `getUserTenancyContext` in `src/actions/tenant-actions.ts` checked `r.includes('admin') || r.includes('owner')` and assigned `userRole = 'organizer'`, erroneously elevating Store Managers (`admin`) to Organization Owners.
  4. `updateStaffMemberRolesAction` lacked server-side authorization checks verifying that the caller is an owner, and lacked self-promotion protection (`userId !== currentUserId`).
- **The Fix**:
  1. **Direct Secure Password Hashing**: Replaced `auth.api.setUserPassword` with `hashPassword` from `better-auth/crypto` in `src/actions/staff-auth-actions.ts` and `src/actions/tenant-actions.ts`. It securely hashes the new password, updates `accountTable.password`, and clears `userTable.mustChangePassword` in PostgreSQL without failing middleware checks.
  2. **Role De-conflation**: Separated store-level manager from organization-level proprietor in `getUserTenancyContext()`. Only `owner` receives `userRole = 'organizer'`. `admin` / `manager` strictly receives `userRole = 'admin'` (Store Manager), which is blocked from `/owner/*`.
  3. **Self-Promotion & Non-Owner Role Modification Guards**: Enforced `isOwnerOrSuperAdmin(session)` and `session.user.id === data.userId` rejection (`"Forbidden: You cannot modify your own roles"`) in `updateStaffMemberRolesAction`. In `/admin/staff`, hid "Add Staff Member" and "Edit Roles" for non-owners, and suppressed edit/delete actions on the user's own row (`member.id === currentUserId`).
  4. **Staff Account Interception on `/auth/login`**: Added `verifyOwnerLoginPreflightAction(email)` in `src/actions/staff-auth-actions.ts`. If a staff member attempts to sign in at `/auth/login`, it intercepts and displays an amber guidance card directing them to `/auth/staff-login?org=OPT-X&email=...` with pre-filled Practice ID and email.
- **Permanent Invariants**:
  1. First-time staff password resets must hash passwords directly via `better-auth/crypto` and update `accountTable` without relying on Better Auth admin API middleware.
  2. Only the Organization Owner (`role === 'owner'`) can possess `userRole = 'organizer'`. Store Managers (`role === 'admin'`) must never be conflated with Owners or granted access to `/owner/*`.
  3. Staff members must never be allowed to modify their own roles or promote themselves. Only practice owners can add team members or alter staff roles.
  4. Store staff accounts must authenticate strictly through `/auth/staff-login` with their Practice ID.

---

### [BUG-032] Comprehensive Deep Security Hardening, Zero-Trust RBAC & Session Multi-Tenant Isolation
- **Component**: Security Architecture, Multi-Tenant Session Isolation, Cryptographic Verification, Zero-Trust RBAC & Rate Limiting / `src/lib/auth-utils.ts`, `src/lib/crypto-utils.ts`, `src/lib/ratelimit.ts`, `src/lib/super-admin-session.ts`, `src/middleware.ts`, `src/actions/*`
- **Symptom**:
  1. Unauthenticated requests could silently fall back to `DEFAULT_ORG_ID` ('00000000-0000-0000-0000-000000000001') in `getCurrentSession()`, risking tenant boundary leakage.
  2. Public receipt URLs (`/receipt/[id]`) were vulnerable to sequential or IDOR UUID enumeration without cryptographic verification.
  3. Sensitive Server Actions (checkout, inventory updates, refunds, invoices, subscription changes, approval execution) lacked fail-closed RBAC checks (`requireAuthSession`, `requireManagerOrAdmin`, `requireOwnerOrSuperAdmin`).
  4. Maker-checker approval system lacked anti-tampering guards preventing requesters from approving their own actions (`request.requesterId === session.user.id`).
  5. Critical mutation endpoints lacked rate limiting, exposing them to brute force or request flooding.
  6. In `process-optical-order.ts` and `settings-actions.ts`, `allowNegativeStock` evaluated to `true` by default, violating strict invariant #5 and permitting out-of-stock checkouts.
- **Root Cause**:
  1. `getCurrentSession()` in `src/lib/auth-utils.ts` had a legacy fallback assigning `DEFAULT_ORG_ID` when unauthenticated.
  2. Public receipt routes allowed any caller with an invoice ID to inspect medical and financial data without a cryptographic signature token.
  3. Server Actions relied on client-side UI visibility controls rather than server-side role enforcement.
  4. `allowNegativeStock` was initialized to `true` in `process-optical-order.ts` and `getStoreProfile()`.
- **The Fix**:
  1. **Fail-Closed Session Context**: Refactored `getCurrentSession()` to return `user: null`, `organizationId: ''`, and `hasOrganization: false` for unauthenticated requests. Exported `requireAuthSession()`, `requireManagerOrAdmin()`, and `requireOwnerOrSuperAdmin()` across all Server Actions.
  2. **Cryptographic Receipt Verification**: Implemented HMAC-SHA256 receipt token generation and verification (`generateReceiptToken`, `verifyReceiptToken`) in `src/lib/crypto-utils.ts`. `/receipt/[id]` now requires either an authenticated tenant session or a valid signed HMAC receipt token (`?token=...`).
  3. **AES-256-GCM Envelope Encryption**: Built `encryptSecret()` and `decryptSecret()` in `src/lib/crypto-utils.ts`. SMTP passwords and sensitive tokens are encrypted at rest with AES-256-GCM and redacted from client projections (`smtpPass: profile.smtpPass ? '********' : null`).
  4. **Sliding-Window Rate Limiting**: Built a resilient sliding-window rate limiter in `src/lib/ratelimit.ts` backed by Upstash Redis with in-memory fallback. Enforced on checkout mutations (30 req/min/org) and password changes (5 req/15min).
  5. **Maker-Checker Anti-Tampering**: Blocked self-approval in `resolveStoreApprovalRequestAction` (`request.requesterId === session.user.id`). Restricted `delete_staff` execution strictly to `isOwnerOrSuperAdmin`.
  6. **Multi-Tenant Scoping & Search Protection**: Added 401 unauthenticated blocks and tenant-scoped queries in `/api/patients/search` and `/api/inventory/search`. Eliminated global fallback in `/portal`.
  7. **Atomic Stock Decrement Default**: Enforced `allowNegativeStock = false` by default in `process-optical-order.ts`, `settings-actions.ts`, and database store profiles, restoring strict Invariant #5.
  8. **Edge-Safe Super Admin Verification**: Migrated `super-admin-session.ts` to standard Web Crypto API (`crypto.subtle`), ensuring 100% native Edge Runtime execution in `src/middleware.ts` with zero crypto module warnings.
- **Permanent Invariants**:
  1. Unauthenticated requests must NEVER receive an active `organizationId` or silent default fallback.
  2. High-stakes mutations must always enforce `requireAuthSession()`, `requireManagerOrAdmin()`, or `requireOwnerOrSuperAdmin()` server-side.
  3. Public document access must be cryptographically protected with HMAC tokens or authenticated tenant sessions.
  4. In a maker-checker approval workflow, the requester must never be allowed to approve their own request.
  5. `allowNegativeStock` must strictly default to `false` across schemas, actions, and settings.

---

### [BUG-033] Add Product Modal Hardcoded Static Category Fallback & Missing Default Product Types on Branch Creation
- **Component**: POS Add Product Modal / Product Types Management / Branch & Org Creation (`src/components/pos/add-product-modal.tsx`, `src/actions/tenant-actions.ts`, `src/actions/product-type-actions.ts`, `src/lib/default-product-types.ts`)
- **Symptom**:
  1. Clicking "Add Product" [F2] in the POS displayed an obsolete, hardcoded screen ("Core Optical Dispensing Categories") whenever an organization had zero rows in the `product_types` table.
  2. Creating a new branch or onboarding a practice did not create the standard default product types and workflow steps in the database, leaving new practices with empty product types and triggering the hardcoded fallback.
  3. The Add Product modal had redundant duplicate blocks ("Special Dispensing Presets") for Blue-Cut and Lens-Only even when dynamic workflows were active.
- **Root Cause**:
  1. `createBranchAction`, `setupPracticeOnboardingAction`, and `createOrganizationAction` lacked an initial product type seeder.
  2. `AddProductModal` contained a legacy fallback block rendering a hardcoded static `CATEGORIES` array if `productTypes.length === 0`.
- **The Fix**:
  1. **Centralized Default Product Types Engine** (`src/lib/default-product-types.ts`):
     - Created `getDefaultProductTypesConfig()` and `seedDefaultProductTypesForOrganization(organizationId)` with idempotent `INSERT` logic.
     - Registered all 6 default optical categories:
       - `LENS`: Spectacle Lenses (Focus Type, Lens Design, Material & Index, Performance Coatings)
       - `FRAME`: Frames & Mountings (Frame Source, Rim Construction)
       - `BLUE_CUT`: Blue-Cut Glasses (Lens Power Mode, Blue Filter Tech)
       - `SUNGLASS`: Sunglasses (Lens Tint & Protection)
       - `CONTACT_LENS`: Contact Lenses (Modality / Replacement Schedule, Correction Type)
       - `LENS_ONLY`: Lens Only Customer Frame (Focus Type, Re-glaze Frame Condition)
  2. **Automated Seeding on Branch & Organization Creation**:
     - Wired `seedDefaultProductTypesForOrganization` into `createBranchAction`, `createOrganizationAction`, and `setupPracticeOnboardingAction` in `src/actions/tenant-actions.ts`, and in `src/db/seed.ts`.
     - In `getProductTypesAction` and `getEnabledProductTypesAction`, added on-the-fly auto-seeding if `rows.length === 0`.
  3. **Complete Elimination of Old Fallback Screen**:
     - Removed the static fallback block from `src/components/pos/add-product-modal.tsx`.
     - Removed duplicate hardcoded "Special Dispensing Presets" block.
     - Mapped all 6 dynamic types directly to standard `category-btn-*` test IDs for full Playwright backward compatibility.
     - Added a clean empty-state card for practices where all types are explicitly disabled in Settings.
- **Permanent Invariants**:
  1. Never use hardcoded static category fallbacks in POS modal dialogs; all dispensing categories must be dynamic rows in the `product_types` table.
  2. Every newly provisioned branch or practice organization must automatically have default product types and workflow steps seeded in the database.
  3. Merchants must always have the freedom to edit, customize, or disable any default product type in Settings > Product Types.



