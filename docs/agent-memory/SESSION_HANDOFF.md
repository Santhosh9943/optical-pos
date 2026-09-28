# OptixOS — Universal AI Agent Session Handoff Ledger

> **Mandatory Rule for All AI Agents (Gemini, Claude, Cursor, Antigravity, etc.)**:
> 1. **At the start of ANY task**: Read this file first! It provides the latest snapshot of project state, recent changes, decisions, and in-flight context so you can continue seamlessly without the user needing to repeat instructions.
> 2. **At the end of EVERY task**: Update this file with your session summary, code modifications, verified test state, and recommended next steps before ending your turn.

---

## 1. Active Session Metadata
- **Last Updated**: `2026-09-28T16:10:00+05:30`
- **Active Platform / Agent**: Antigravity (Advanced Agentic Pair Programmer)
- **Active Workspace**: `f:\hobby-projects\optical-pos`
- **Current Git Branch**: `main`
- **Deliverables**:
  - `src/components/admin/add-inventory-form.tsx`: Added `initialIdentifier` and `initialCategory` support for prefilling form fields during quick-creation.
  - `src/components/pos/add-product-modal.tsx`: Added `Create Inventory` button in modal header, `+ Create Inventory` in search bar, empty search state action button, and integrated `AddInventoryForm` with instant auto-add to billing cart.
  - `src/components/pos/inventory-search.tsx`: Added `Create Inventory Item` button in empty state with auto-add to billing cart.
  - `src/components/pos/pos-view.tsx`: Added `Create Inventory` button beside `Add Product [F2]` and mounted `AddInventoryForm` for direct single-click inventory creation.
  - `e2e/patient-inventory-crud.spec.ts`: Added test `POS: Quick Create Inventory directly from Add Product [F2] and auto-add to cart` (all 5/5 tests passing in Chromium).
- **Latest Quality Gate State**:
  - `npm run check`: **PASS (0 errors, 0 warnings)**
  - `npm run audit:security`: **PASS (0 critical violations)**
  - `npm run audit:design`: **PASS (92 UI components audited, 0 violations)**
  - Core POS Workflows (`npm run test:pos`): **12/12 PASS (100% green)**
  - Multi-Branch Relations (`multi-branch-relations.spec.ts`): **6/6 PASS (100% green)**
  - Inventory & Patient CRUD (`patient-inventory-crud.spec.ts`): **5/5 PASS (100% green)**
  - Bug Fix Log: BUG-001 … BUG-041.

---

## 2. Most Recent Task Accomplishments (Quick Create Inventory from Add Product & POS Workflows)
1. **Add Product Modal Integration**:
   - In `AddProductModal`, added a prominent `Create Inventory` button in the header and `+ Create Inventory` in the global search bar.
   - When a search returns 0 results, rendered `[+ Create Inventory Item "{searchQuery}"]` prefilling the searched SKU/model.
2. **Instant Cart Binding**:
   - On submitting `AddInventoryForm` from `AddProductModal`, `InventorySearch`, or `PosView`, the newly created item is immediately inserted into the active billing cart with toast feedback and 0 page reloads.
3. **Automated E2E Verification**:
   - Added test in `e2e/patient-inventory-crud.spec.ts` verifying opening Add Product [F2], clicking Create Inventory, submitting a new frame, and confirming its presence in the billing cart table. Verified green in Chromium in 2.6s.
   - Passed `npm run check`, `npm run audit:security`, `npm run audit:design`, `npm run test:pos` (12/12), `multi-branch-relations.spec.ts` (6/6), and `patient-inventory-crud.spec.ts` (4/4).

---

## 2. Most Recent Task Accomplishments (Clean-Slate Purge, Re-Seed, Live E2E Audit & Fixes)
1. **Clean-Slate Data Wipe & Cache Purge**:
   - Executed `npm run db:clean` (`src/db/clean.ts`), thoroughly clearing all transactional records (notifications, payments, invoices, prescriptions, inventory, customers), tenant organizations, physical branches, and Better-Auth identity credentials.
   - Flushed Upstash Redis memory cache.
2. **Deterministic Database Seeding**:
   - Updated `src/db/seed.ts` with `defaultBranchId` and `onConflictDoUpdate` for `storeProfile` ensuring standard default identity and contact info.
   - Executed `npm run db:seed` and `e2e/global-setup.ts` to pin the practice plan to `plus` / `enterprise`.
3. **Live Comprehensive E2E Verification**:
   - Ran live tests against Next.js Turbopack dev server across every subsystem: Organization & Store Branch setup, Store isolation, Patient & Inventory CRUD, 12 Core POS workflows, Workshop Kanban, Financial Reports, Balance Settlement, Settings Sidebar & Print Engine, Dashboard Routing, Alert Center, Priority Notes drawer, SWR Caching, Staff Portal, Super Admin isolated OTP, and Security Penetration audit.
4. **Resolved Bugs Diagnosed in Live Testing (BUG-039)**:
   - Fixed false dirty tracking on Settings Email tab by initializing `smtpUser` and `smtpFromEmail` from initial profile values instead of hardcoded strings.
   - Updated `storeProfileSchema` in `src/actions/settings-actions.ts` to support partial updates (`.optional()`), allowing layout preferences to auto-save without re-transmitting contact fields.
   - Ensured default contact information in `ensureOrgStoreProfile` and `buildFallbackStoreProfile`.
   - Fixed missing `input-signup-org-name` in `e2e/auth-security.spec.ts`.
5. **Quality Gates Verified**:
   - Composite quality gate: `npm run check`, `npm run audit:security`, `npm run audit:design`, `npm run test:pos`.
   - AST & Knowledge Graph refreshed via `python -m graphify update .`.

---

## 2. Most Recent Task Accomplishments (Phase 38: Settings UI/UX Refactor, Streamlining & Compact Redesign)
1. **Settings Registry Streamlining (`src/lib/settings-registry.ts`)**:
   - Eliminated redundant menu items pointing to duplicate tabs (`tax-rules` duplicating `tab=general`, `two-factor-auth` duplicating `tab=account`).
   - Removed external destination links (`/admin/branches`, `/admin/staff`, `/owner/approvals`, `/pricing`) that were already in operations/management navigation.
   - Streamlined into 7 distinct, non-overlapping configuration panels across 5 clean categories:
     - **Store & Practice**: Store Profile & Legal (`tab=general`), Hardware & Print Engine (`tab=print`), POS Viewport Layout (`tab=pos-layout`).
     - **Catalog & Dispensing**: Product Types & Workflows (`tab=products`).
     - **Profile & Security**: Account & Security (`tab=account`).
     - **Communications & Alerts**: Email & SMTP Gateway (`tab=email`).
     - **Subscription & System**: System Engine & Cache (`tab=system`).
2. **Compact Sidebar & Full Design System Parity (`src/components/layout/settings-sidebar.tsx`)**:
   - Set aside width to standard `w-56` (224px), matching the primary operations sidebar perfectly with zero jumping or layout shift between POS and Settings.
   - Aligned item typography and padding to `px-3 py-2 text-xs font-semibold` with inline `h-4 w-4` icons (eliminated oversized icon boxes and bulky subtitles).
   - Embedded standard Keyboard Shortcuts cheatsheet in the footer (`F1 Bill`, `F3 Stock`, `F10 Pay`, `F5 Print`).
   - Compact top header with `btn-back-to-pos` (`← POS Billing [F1]`) and subtle `Settings` icon.
3. **Settings View Breadcrumb & Form Alignment (`src/components/admin/settings-view.tsx`)**:
   - Synchronized active section breadcrumb with the 5 streamlined categories and 7 non-redundant tabs.
   - Preserved dirty-state form tracking and `optixos:settings-nav-intercept` navigation guard.
4. **Comprehensive Quality Gate & Test Suite Pass**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:design`: 0 violations.
   - `npm run audit:security`: 0 critical violations.
   - `e2e/pos-settings-sidebar.spec.ts`: Passed (100% green).
   - `e2e/settings-autosave-navigation.spec.ts`: Passed (100% green).
   - `e2e/settings-print.spec.ts`: Passed (100% green).
   - `e2e/auth-security.spec.ts`: Passed 8/8 (100% green).
   - `npm run test:pos`: Passed 12/12 (100% green).
   - `python -m graphify update .`: Synchronized 5,039 nodes, 8,367 edges, 431 communities.

---

## 3. Prior Task Accomplishments (Phase 37: POS Quick Settings & Categorized Grouped Settings Navigation Sidebar)
1. **Centralized Settings Registry Architecture (`src/lib/settings-registry.ts`)**:
   - Created the authoritative modular registry defining 6 categorized groups and 15 configuration items:
     - **Store & Practice**: Store Identity & Legal Details (`tab=general`), Hardware & Print Engine (`tab=print`), POS Viewport & Counter Layout (`tab=pos-layout`), Branch Store Locations (`/admin/branches`).
     - **Catalog & Dispensing**: Product Types & Workflows (`tab=products`), Statutory GST & Taxes (`tab=general`).
     - **Profile & Security**: User Profile & Password (`tab=account`), Two-Factor Authentication (`tab=account`).
     - **Team & Permissions**: Store Staff Directory (`/admin/staff`), Approval Rules & Limits (`/owner/approvals`).
     - **Communications & Alerts**: Email & SMTP Gateway (`tab=email`), Notification Preferences (`tab=notifications`).
     - **Subscription & System**: Practice Subscription Plan (`/pricing`), System Engine & Cache Purge (`tab=system`).
   - Built to be permanently extensible so that any future setting can be appended to this registry in one place.
2. **Dedicated Categorized Settings Sidebar (`src/components/layout/settings-sidebar.tsx`)**:
   - Replaced default operations sidebar with a dedicated categorized settings navigation bar whenever navigating to `/admin/settings`.
   - Included 1-click **"← POS Billing [F1]"** header button for immediate return to counter sales.
   - Built custom event interception (`optixos:settings-nav-intercept`) to preserve dirty tracking and prevent accidental data loss before saving.
   - Displays practice identifier with 1-click copy widget and shortcut links to Dashboard, Inventory [F3], and Z-Report.
3. **POS Screen Header Integration (`src/components/pos/pos-view.tsx`)**:
   - Added quick-access `btn-pos-settings` button directly beside "New Order [F1]" in the top action bar.
   - Styled with semantic tokens, zero hardcoded hex values, and keyboard tooltips.
4. **Enhanced Settings View with Zero-Latency Tab Sync (`src/components/admin/settings-view.tsx`)**:
   - Synchronized active tabs with `useSearchParams()` (`tab` parameter) for direct deep-linking and browser forward/back history.
   - Replaced duplicate, cluttered horizontal tabs with an active category breadcrumb banner.
   - Built complete POS Counter Layout selector (`pos-layout-adaptive-card`, `pos-layout-dense-card`, `pos-layout-split-card`) with instant auto-save feedback.
   - Built dedicated System Engine & Cache Purge tab (`btn-clear-application-cache`) and Notification triggers tab.
5. **Comprehensive E2E Verification & Quality Gates**:
   - Created `e2e/pos-settings-sidebar.spec.ts` testing the complete flow: POS Header -> Settings button click -> Categorized sidebar -> Category navigation -> Return to POS.
   - Verified 100% pass across `e2e/settings-autosave-navigation.spec.ts`, `e2e/settings-print.spec.ts`, `e2e/auth-security.spec.ts`, and core POS suite (`npm run test:pos`).
   - Ran `python -m graphify update .`: AST synced with 5,037 nodes and 8,365 edges.
1. **Recommended Category Structure (`src/lib/default-product-types.ts`)**:
   - Implemented the complete recommended optical category suite across all practices:
     - **Spectacle Frames (or Eyeglasses)**: Men's Frames, Women's Frames, Kids' Frames, Reading Glasses, Rim Construction (Full Rim, Semi-Rimless, Rimless Drill Mount), Frame Source.
     - **Spectacle Lenses**: 4-step dynamic sequential optical workflow.
     - **Sunglasses**: Polarized Sunglasses, Non-Polarized Sunglasses, Prescription Sunglasses, Tint & Mirror Coatings.
     - **Contact Lenses**: Daily Disposables, Monthly Disposables, Color Contact Lenses, Toric / Astigmatism Lenses, Pack sizes.
     - **Accessories & Solutions**: Contact Lens Solutions, Cleaning Sprays & Wipes, Eyeglass Cases & Cords.
     - **Services & Professional Fees**: Eye Testing / Optometrist Fee, Frame Repair / Lens Fitting Charges, Nose Pad & Screw Service.
     - **Blue-Cut Screen Defense & Lens-Only Re-glaze**: Full presets for direct dispensing & customer frame fitting.
2. **Authoritative 4-Step Spectacle Lens Sequential Flow**:
   - **Step 1: Select Focus Type (Main Category)**: Single Vision (Distance/Reading/Plano), Bifocal (Two focal points), Progressive (PAL) (No-line multifocal).
   - **Step 2: Select Inner Type / Design (Subcategory conditioned on Focus Type)**:
     - *If Single Vision*: Plano / Stock Lens (Zero power), Spherical (Standard design), Aspheric (Thinner flatter design for higher powers).
     - *If Bifocal*: Kryptok (Round segment), D-Bifocal (Flat-Top), Executive / Solid (Full line).
     - *If Progressive (PAL)*: Standard Progressive (Basic corridor), Digital / Freeform PAL (Sharper customized), Wider Corridor / Premium (Expanded field of view), Office / Indoor PAL (Computer & desk work).
   - **Step 3: Select Material & Index (Thinner Lenses)**: Standard Plastic (1.50), Mid-Index (1.56/1.61), Hi-Index (1.67/1.74), Polycarbonate / Trivex (Unbreakable).
   - **Step 4: Select Coating & Treatments (Add-ons)**: Hard Coat, Anti-Reflection Coating (ARC), Blue Light Cut, Photochromic / Transition (Sun-adaptive).
3. **Dynamic Step Dependency & Downstream Reset**:
   - In [`src/components/pos/add-product-modal.tsx`](file:///f:/hobby-projects/optical-pos/src/components/pos/add-product-modal.tsx), updated `WorkflowStepOption` with `showIfParent` filtering so Step 2 only renders designs matching Step 1 selection.
   - Wired selection reset when changing earlier single-select steps to prevent stale downstream dependencies.
4. **Neon PostgreSQL Database Seeding**:
   - Executed update script across all 3 active organizations in Neon DB (`Santhosh's Optical Care`, `test's Optical Care`, `Santhosh Optical Center`); all 24 records synchronized with latest workflow steps.
5. **Quality Gate Validation**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 violations.
   - `npm run test:pos`: 12/12 passed (54.8s).
   - `graphify update .`: 5,019 nodes and 8,342 edges synced.


1. **Cryptography & Envelope Encryption (`src/lib/crypto-utils.ts`)**:
   - Built AES-256-GCM envelope encryption (`encryptSecret`, `decryptSecret`) using PBKDF2 key derivation and random 96-bit initialization vectors.
   - Built cryptographic HMAC-SHA256 receipt token verification (`generateReceiptToken`, `verifyReceiptToken`).
2. **Sliding-Window Rate Limiter (`src/lib/ratelimit.ts`)**:
   - Built sliding-window rate limiter backed by Upstash Redis with zero-latency in-memory fallback.
   - Enforced rate limiting on checkout mutations (30 req/min/org) and password changes (5 req/15min).
3. **HTTP Security Headers (`next.config.mjs` & `src/middleware.ts`)**:
   - Added strict Content-Security-Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
4. **Middleware Bypass Hardening (`src/middleware.ts`)**:
   - Restricted `x-e2e-bypass-auth` strictly to non-production environments and excluded `/super-admin` from any bypass.
   - Set cookie persistence for non-production Server Action RPC compatibility.
   - Migrated Super Admin HMAC verification to standard Web Crypto API (`crypto.subtle`) for 100% Edge Runtime compatibility with 0 crypto warnings.
5. **Fail-Closed Session Context (`src/lib/auth-utils.ts`)**:
   - Eliminated silent fallback to `DEFAULT_ORG_ID`; unauthenticated requests return `user: null`, `organizationId: ''`, and `hasOrganization: false`.
   - Exported `requireAuthSession()`, `requireManagerOrAdmin()`, and `requireOwnerOrSuperAdmin()`.
6. **Backdoor Elimination & URL Sanitization**:
   - Deleted backdoor route `src/actions/auth-seed-action.ts`.
   - Sanitized `callbackUrl` in `src/app/auth/login/page.tsx` against open redirect attacks.
7. **Credential Security (`src/actions/settings-actions.ts` & `src/actions/email-actions.ts`)**:
   - Decrypted SMTP credentials on the fly in `src/lib/email.ts` using `decryptSecret()`.
   - Redacted `smtpPass` in `getStoreProfile()` projections for client consumers.
   - Resolved `SEC-002` and `SEC-003` in `SECURITY_LOG.md`.
8. **Subscription & Billing Hardening (`src/actions/subscription-actions.ts`)**:
   - Enforced `requireOwnerOrSuperAdmin` on Razorpay subscription order creation and payment verification.
   - Verified subscription record tenant ownership before updates; enforced `requireManagerOrAdmin` on onboarding.
9. **Invoice & Refund Hardening (`src/actions/invoice-edit-actions.ts` & `src/actions/return-refund-actions.ts`)**:
   - Enforced `requireManagerOrAdmin` on invoice edits and product returns/refunds.
   - Bounded refund amounts strictly to `advancePaid`; scoped inventory restocks to tenant and invoice.
10. **Inventory & Catalog Hardening (`src/actions/inventory-actions.ts` & `src/actions/product-type-actions.ts`)**:
    - Enforced `requireManagerOrAdmin` on product item creation, updates, and custom product types.
    - Masked wholesale `costPrice` to `null` on barcode scans for cashiers.
11. **Maker-Checker Anti-Tampering (`src/actions/approval-actions.ts`)**:
    - Blocked requester self-approval (`request.requesterId === session.user.id`).
    - Restricted `delete_staff` execution strictly to `isOwnerOrSuperAdmin`.
12. **PII Leakage & API Protection (`src/actions/customer-portal-actions.ts`, `/api/patients/search/route.ts`, `/api/inventory/search/route.ts`)**:
    - Removed global patient fallback in customer portal; enforced 401 unauthenticated blocks on search routes.
13. **Public Receipt Enumeration Protection (`src/actions/receipt-actions.ts` & `src/app/receipt/[id]/page.tsx`)**:
    - Required valid HMAC receipt token or tenant session to view public receipts.
14. **Checkout Hardening (`src/actions/process-optical-order.ts`)**:
    - Enforced `requireAuthSession`, sliding-window rate limiting, scoped inventory checks and stock decrements to `organizationId`.
    - Fixed SQL floating point subtraction with `CAST AS NUMERIC`, and generated cryptographic receipt tokens.
    - Restored `allowNegativeStock = false` default to strictly adhere to Invariant #5.
15. **Account Hardening (`src/actions/account-actions.ts`)**:
    - Applied rate limiting on password updates; required password re-authentication before disabling 2FA.
16. **Verification & Quality Gate State**:
    - `npm run check`: **0 errors, 0 warnings**.
    - `npm run audit:security`: **0 critical violations**.
    - `npm run audit:design`: **0 violations across 85 components**.
    - `npm run test:pos`: **12/12 tests PASS (100% green)**.
    - `e2e/auth-security.spec.ts`: **8/8 tests PASS (100% green)**.
    - `e2e/security-penetration-audit.spec.ts`: **6/6 tests PASS (100% green)**.
    - `graphify update .`: **1,409 nodes, 3,289 edges, 80 communities synced**.
    - Documented `[BUG-032]` in `docs/agent-memory/BUG_FIX_LOG.md`.

---
1. **Direct Password Hashing Without Admin Session Failure**:
   - `src/actions/staff-auth-actions.ts`:
     - In `completeStaffInitialPasswordChangeAction`: Replaced Better Auth `auth.api.setUserPassword` (which failed with `FORBIDDEN: YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD` due to lack of admin session during first-time staff login) with direct `hashPassword` from `better-auth/crypto`.
     - Directly updates `accountTable.password` and clears `userTable.mustChangePassword` in PostgreSQL Neon, permitting seamless completion of first-time login without middleware errors.
   - `src/actions/tenant-actions.ts`:
     - In `createStaffMemberAction`: Replaced `auth.api.setUserPassword` with `hashPassword` directly into `accountTable` for existing user updates.
2. **Role Mapping De-conflation (`getUserTenancyContext`)**:
   - `src/actions/tenant-actions.ts`:
     - Previously, `r.includes('admin') || r.includes('owner')` evaluated to `userRole = 'organizer'`, mistakenly promoting Store Managers (`admin`) to Organization Owners.
     - De-conflated role mapping: ONLY `owner` receives `userRole = 'organizer'` (the practice proprietor). Store Managers with `admin` or `manager` strictly receive `userRole = 'admin'` (Store Manager/Admin — strictly store level, NEVER Owner).
     - Store Managers are now strictly barred from `/owner/*` and cannot access consolidated executive reports or sovereign practice settings.
3. **Server-Side Authorization & Self-Promotion Guards**:
   - `src/actions/tenant-actions.ts`:
     - In `updateStaffMemberRolesAction`: Enforced `isOwnerOrSuperAdmin(session)` (store staff/managers cannot modify roles). Enforced self-promotion guard: `session.user.id === data.userId` is rejected with `"Forbidden: You cannot modify your own roles"`.
     - In `createStaffMemberAction`: Enforced `isOwnerOrSuperAdmin(session)` (store staff/managers cannot add team members).
4. **Staff Account Detection on Owner Login Portal (`/auth/login`)**:
   - `src/actions/staff-auth-actions.ts`: Built `verifyOwnerLoginPreflightAction(email)` to verify if an email belongs to a non-owner staff member of an organization.
   - `src/app/auth/login/page.tsx`:
     - Intercepts sign-in attempts from store staff.
     - Displays dedicated amber guidance card: *"Store staff must sign in using the dedicated Staff Portal with your Practice ID (OPT-X)"* with a 1-click button redirecting to `/auth/staff-login?org=OPT-X&email=...`.
5. **Staff Portal Search Params Auto-Fill & Suspense Wrapping**:
   - `src/app/auth/staff-login/page.tsx`: Wrapped in `<Suspense>`, automatically pre-fills `Practice ID` and `Email` from URL query parameters.
6. **Hardened Store Staff View (`/admin/staff`)**:
   - `src/app/(dashboard)/admin/staff/page.tsx`:
     - "Add Staff Member" button is strictly hidden for non-owners.
     - "Edit Roles" button is strictly hidden for non-owners and completely removed on the logged-in user's own row (`member.id === currentUserId`).
     - Added a subtle `(You)` badge on the logged-in user's row; self-deletion is disabled.
7. **Quality Gates & Knowledge Graph**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 violations across 85 components.
   - `graphify update .`: Refreshed to 1,383 nodes, 3,194 edges, 80 communities.
   - Documented `[BUG-031]` in `docs/agent-memory/BUG_FIX_LOG.md`.

---

## 3. Most Recent Task Accomplishments (Phase 32: Organization Owner Portal, Sovereign Practice Governance & Staff Isolation)
1. **Organization Owner Exclusion from Staff Table**:
   - `src/actions/tenant-actions.ts`:
     - In `getStaffMembersAction`: Added check filtering out any member with `role === 'owner'` or `rawRoles.includes('owner')`. Practice owners are the sovereign proprietors and never appear as employee rows.
     - In `updateStaffMemberRolesAction` & `deleteStaffMemberAction`: Added security guards rejecting any role modification or deletion targeting the practice owner.
2. **Sovereign Branch Governance & Approvals Alignment**:
   - Inside an organization, the Practice Owner has full sovereign rights over branches, staff, inventory, and operations.
   - `src/actions/tenant-actions.ts`:
     - Implemented `deleteBranchAction(branchId, organizationId)` directly for practice owners (maintaining the 1-branch minimum invariant, purging staff store assignments, and invalidating Redis cache) with 0 Super Admin approval required.
     - Implemented `requestOrganizationDeletionAction`: Submits a `delete_organization` approval request to the Super Admin (the ONLY action requiring Super Admin approval).
   - `src/actions/approval-actions.ts` & `src/app/super-admin/approvals/page.tsx`:
     - Removed `delete_branch` from Super Admin approvals; Super Admin approval is strictly reserved for deleting the entire organization.
     - Updated `resolveStoreApprovalRequestAction` to handle `delete_staff` so practice owners can review and execute staff deletion requests submitted by store managers.
3. **Dedicated Organization Owner Portal (`/owner/*`)**:
   - Built a high-level practice headquarters decoupled from retail store counters:
     - `src/app/owner/layout.tsx`: Executive Sidebar (Cockpit, Branches, Staff, Reports, Approvals, Settings), topbar with Practice ID badge, and "Launch Store POS Counter" modal with branch selector. Guarded with RBAC redirecting non-owners to `/pos/new-bill`.
     - `src/app/owner/page.tsx`: Executive Cockpit with cross-branch KPIs (Total Revenue, Orders, Branches, Pending Approvals), Physical Store Cards with 1-click POS launcher, and quick action cards.
     - `src/app/owner/branches/page.tsx`: Sovereign Physical Store Management (Add branch, edit, toggle status, direct delete branch modal, Launch POS).
     - `src/app/owner/staff/page.tsx`: Multi-store Staff & Store Assignment directory (owner strictly omitted, filter by branch or view all, Add Team Member modal with temporary password & force change, Edit Roles modal, Direct Staff Removal).
     - `src/app/owner/reports/page.tsx`: Consolidated Practice Analytics (cross-store gross revenue, GST/tax, cash/upi/card splits, audit ledger across all branches or filtered by branch, print).
     - `src/app/owner/approvals/page.tsx`: Practice Maker-Checker Approvals Queue (review staff deletion, customer deletion, inventory deletion requests; Approve & Execute or Reject).
     - `src/app/owner/settings/page.tsx`: Practice Profile, SaaS Subscription tier, Purge Cache button, Danger Zone "Request Organization Deletion" modal submitting to Super Admin.
4. **Decoupling Store POS & Staff Navigation**:
   - `src/app/(dashboard)/layout.tsx`: Replaced "Manage Branches" and "Plans" in sidebar with "Owner Portal (HQ)" for owners; added "Owner Portal" header button.
   - `src/components/layout/user-nav.tsx`: Added direct link to "Owner Portal (HQ)" for owners/super admins.
   - `src/middleware.ts`: Added `/owner/:path*` to protected routes and route matcher.
   - `src/components/admin/reports-view.tsx`: Locked store staff/managers strictly to their single active store in reports; hidden multi-store consolidated option from non-owners.
5. **Quality Gates & Knowledge Graph**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 violations across 85 components.
   - `graphify update .`: Refreshed to 1,378 nodes, 3,180 edges, 79 communities.
   - Documented BUG-030 in `docs/agent-memory/BUG_FIX_LOG.md`.

---

## 2. Most Recent Task Accomplishments (Phase 31: Resolution of React 19 SSR Hydration Mismatch, Stale Cache Elimination & Zero-Mock Invariant Enforcement)
1. **Root Cause Analysis of Hydration Error**:
   - Diagnosed exact cause of `Hydration failed because the server rendered text didn't match the client (- Active Branch, + Downtown Clinic Branch)`:
     Next.js pre-rendered `DashboardView` on the server with fallback (`'Active Branch'`). On the client browser, `useCachedResource` read an old stale cache from `localStorage` saved during an earlier test seed (`'Downtown Clinic Branch'`). React 19 detected the string mismatch between server HTML and client initial virtual DOM.
2. **Hydration Mismatch Permanent Fix**:
   - `src/components/admin/dashboard-view.tsx`:
     - Added `mounted` lifecycle state.
     - Derived active store name dynamically from `branches` in tenant store.
     - Added `suppressHydrationWarning` on the branch badge span to prevent React 19 mismatch warnings.
3. **Application Cache Versioning & Client Auto-Purge**:
   - `src/hooks/use-cached-resource.ts`:
     - Incremented `STORAGE_PREFIX` to `optix_client_cache_v2:`.
     - Added automatic cleanup on startup that removes all legacy/stale `optix_client_cache:*` keys from `localStorage`.
     - Exported `clearClientStorageCaches()` helper.
4. **Purged Server Redis Cache & Verified DB Real Data**:
   - Executed `cacheFlush()` across Upstash Redis / in-memory server cache.
   - Inspected Neon PostgreSQL: Confirmed 0 mock data. Real tenant is "Santhosh's Optical Care" (`OPT-1`) with "Main Branch".
5. **Purged Mock / Fake Data**:
   - `src/store/priority-notes-store.ts`: Purged `DEFAULT_SAMPLE_NOTES` (which contained hardcoded fake notes and branch names like "Downtown Flagship"); initialized with clean empty array `notes: []`.
6. **Practice Settings Cache Purge Action**:
   - `src/actions/settings-actions.ts`: Added `clearApplicationCacheAction()`.
   - `src/components/admin/settings-view.tsx`: Added an interactive "Application Cache & Storage Reset" card with a 1-click **"Clear All Caches"** button to allow managers to instantly purge all browser and Redis caches on demand.
7. **Quality Gates & Regression Validation**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security` & `npm run audit:design`: 0 critical violations.
   - Playwright E2E suites: 13/13 passed (100% green).
   - Knowledge graph synced via `graphify update .`.

---

## 2. Most Recent Task Accomplishments (Phase 30: Practice ID & Organization Generated Information Exposure Across Super Admin & Staff Portal)
1. **Root Cause Analysis & Backend Projection**:
   - Identified that while `orgCode` (e.g. `OPT-1`) was generated and stored in Neon PostgreSQL during onboarding, `getSuperAdminPlatformMetrics()` and `getUserTenancyContext()` in `src/actions/tenant-actions.ts` did not project `orgCode` or `orgNumber` into the return objects.
   - Extended `TenancyContext` and `PlatformTenantDetail` with `orgCode` and `orgNumber`.
   - Updated `src/store/tenant-store.ts` to include `orgCode` and `orgNumber` on `OrgOption`, added `activeOrgCode` to `TenantState`, and updated `setTenancyData()` to preserve and expose `activeOrgCode`.
2. **Super Admin Practice ID & Store Exposure**:
   - `src/app/super-admin/organizations/page.tsx`:
     - Replaced internal UUID display with prominent purple `Practice ID: OPT-X` badge.
     - Added 1-click clipboard Copy button with immediate toast feedback.
   - `src/app/super-admin/dashboard/page.tsx`:
     - Replaced `ID: tenant.id.slice(0, 8)...` with purple `Practice ID: OPT-X` badge and 1-click clipboard Copy button.
   - `src/app/super-admin/branches/page.tsx`:
     - Updated Owning Practice column to display `Practice ID: OPT-X` badge under practice name.
     - Updated "Add Physical Store" modal target practice select dropdown to display `${org.name} (${org.orgCode})`.
3. **Practice Portal & Header Exposure**:
   - `src/app/(dashboard)/admin/staff/page.tsx`:
     - Added dedicated "Practice Staff Portal Login Credentials" banner prominently displaying `Practice ID: OPT-X`, 1-click Copy button, and direct link to open the Staff Portal (`/auth/staff-login`).
     - Added Practice ID reminder callout inside the "Add Staff Member" modal so practice owners immediately know what Practice ID to give the new staff member.
   - `src/components/layout/user-nav.tsx`:
     - Added Practice ID row with 1-click Copy button in the user dropdown details header.
   - `src/components/layout/branch-switcher.tsx`:
     - Added `[OPT-X]` pill badge next to "Active Store" in the global topbar trigger button.
     - Added Practice ID indicator in the switch physical store popover header.
4. **Staff Portal Guidance**:
   - `src/app/auth/staff-login/page.tsx`:
     - Added clear helper text explaining: *"Enter the Practice ID provided by your practice owner (e.g. OPT-1 or 1). Practice owners can find this in their admin header or Staff Management screen."*
5. **Quality Gates & Regression Validation**:
   - `npm run check`: 0 TypeScript errors, 0 ESLint warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 critical violations.
   - All Playwright suites passing 100% green (`e2e/signup-org-branch.spec.ts`, `e2e/super-admin-otp-auth.spec.ts`, `e2e/multi-tenant-staff-portal.spec.ts`).
   - `graphify update .` synced.

---

## 2. Most Recent Task Accomplishments (Phase 29: Practice Account Creation with Org & Optional Branch Defaults, Owner Role Tagging, Env Prefix, and Super Admin Session Expiration)
1. **Sign Up Form Organization & Branch Provisioning**:
   - `src/app/auth/login/page.tsx`:
     - Added Organization / Practice Name (required) and Primary Store / Branch Name (optional, defaults to "Main Branch") fields in the sign-up form with descriptive labels and helper text.
     - On submitting sign-up, seamlessly creates the Better Auth account and automatically invokes `setupPracticeOnboardingAction` with practice name, branch name, and user email.
     - Automatically routes the user straight into the operational practice workspace (`/pos/new-bill`), bypassing redundant manual setup screens while preserving `/onboarding` as an intelligent fallback.
2. **Strict Owner Role Tagging**:
   - `src/actions/tenant-actions.ts`:
     - `setupPracticeOnboardingAction`: Sets `role: 'owner'` in `memberTable`, `role: 'owner'` in `staffStoreAssignments`, and updates `userTable.role` to `'owner'`.
     - Confirmed `isOwnerOrSuperAdmin()` and `getUserTenancyContext()` immediately grant full owner administrative permissions.
3. **Environment-Driven Organization Prefix (`ORG_CODE_PREFIX`)**:
   - Added `ORG_CODE_PREFIX="OPT"` to `.env.example` and `.env.local`.
   - Updated `setupPracticeOnboardingAction` and `createOrganizationAction` to dynamically read `(process.env.ORG_CODE_PREFIX || 'OPT').trim().toUpperCase()`.
   - Organizations are now created with sequential codes matching the configured prefix (e.g. `OPT-1`, `OPT-2`).
4. **Environment-Driven Super Admin Session Lifetime (`SUPER_ADMIN_SESSION_EXPIRY_SECONDS`)**:
   - Added `SUPER_ADMIN_SESSION_EXPIRY_SECONDS="28800"` (8 hours) to `.env.example` and `.env.local`.
   - `src/lib/super-admin-session.ts`: Added `getSuperAdminSessionExpirySeconds()`, configured `exp` in `createSessionToken` to match env-configured lifetime.
   - `src/actions/super-admin-auth-actions.ts`: Updated `cookieStore.set(SUPER_ADMIN_SESSION_COOKIE, token, { maxAge: sessionExpirySeconds })` and exposed via `getSuperAdminOtpConfigAction()`.
5. **Quality Gates & Automated Verification**:
   - Built unit/integration test `scripts/test-signup-and-env-config.ts` verifying session token lifetime, organization code prefix generation, branch name default to "Main Branch", and 'owner' role tagging across all tables.
   - Built Playwright test `e2e/signup-org-branch.spec.ts` (2/2 passed 100% green).
   - Validated zero regression: `e2e/super-admin-otp-auth.spec.ts` (6/6 green), `e2e/multi-tenant-staff-portal.spec.ts` (5/5 green).
   - `npm run check` (0 errors, 0 warnings), `npm run audit:security` (0 critical), `npm run audit:design` (0 critical).
   - `graphify update .` synced knowledge graph to 1,356 nodes, 3,042 edges, 81 communities.
1. **Platform Super Admin Complete Architectural Decoupling**:
   - `src/app/(dashboard)/layout.tsx`: Completely removed `nav-super-admin` sidebar link and header breadcrumbs.
   - `src/components/layout/user-nav.tsx`: Completely removed `link-super-admin-console` from user dropdown.
   - `src/app/super-admin/layout.tsx`: Completely removed `link-back-to-pos` ("Live POS Workspace") from layout footer.
   - `src/middleware.ts`: Implemented strict two-domain authentication gate separating `/super-admin/*` from standard practice routes (`/admin`, `/pos`, `/portal`).
2. **Dedicated OTP-Only Super Admin Authentication**:
   - `src/db/schema.ts` & `scripts/migrate-super-admin-otp.ts`: Created `superAdminOtps` table with SHA-256 hashed codes, attempts tracking, and expires_at.
   - `src/lib/super-admin-session.ts`: Clean JWT/HMAC token signing and session verification helpers complying with Next.js 16 `'use server'` rules.
   - `src/actions/super-admin-auth-actions.ts`:
     - `requestSuperAdminOtpAction`: Strict allowlist verification against `SUPER_ADMIN_EMAILS`, secure 6-digit OTP generation, email dispatch via `sendSuperAdminOtpEmail`, and developer console logging.
     - `verifySuperAdminOtpAction`: Enforces env-configured expiration (`SUPER_ADMIN_OTP_EXPIRY_SECONDS`), maximum 5 attempts, consumes code, and issues `optixos_super_admin_session` HTTP-only cookie.
     - `getSuperAdminSessionAction` & `superAdminSignOutAction`.
   - `src/app/super-admin/login/page.tsx`: Replaced passwords and Google OAuth with a dedicated 2-step OTP gateway featuring a real-time countdown timer (`MM:SS`) driven by `SUPER_ADMIN_OTP_EXPIRY_SECONDS` and automatic resend handling.
3. **Pristine Zero-Stores Database Purge**:
   - `src/db/clean.ts`: Expanded to purge all 25 PostgreSQL tables in strict foreign-key order and clear Redis cache.
   - Executed clean script: Database currently has **0 stores** and **0 organizations**.
   - Updated `src/app/super-admin/dashboard/page.tsx`, `branches/page.tsx`, and `organizations/page.tsx` with elegant zero-store empty states.
   - `src/actions/settings-actions.ts`: Added validation for `branchId` to prevent foreign key errors when zero branches exist.
4. **Validation & E2E Testing**:
   - Created `e2e/super-admin-otp-auth.spec.ts` covering 6 test cases: unauthenticated middleware redirects, non-allowlisted email rejection, OTP dispatch with live countdown timer, incorrect OTP attempt tracking, valid OTP session authorization into dashboard, zero-store telemetry validation, layout isolation, and sign-out.
   - All 6 tests passing 100% green.
1. **PostgreSQL Database Schema & Migration**:
   - `src/db/schema.ts`:
     - Added `orgCode` (`OPT-X`) and sequential `orgNumber` (`X`) to `organizations` table.
     - Added `mustChangePassword` (boolean, default false) to `user` table.
     - Created `staffStoreAssignments` table (`id`, `organization_id`, `branch_id`, `user_id`, `role`, `is_primary`, `created_at`) with foreign keys and unique index `(user_id, branch_id)`.
   - `src/db/migrate-multi-tenant-staff.ts`: Successfully executed migration against Neon PostgreSQL, altering tables, backfilling default org with `OPT-1` and `1`, and migrating existing members to `staffStoreAssignments`.
2. **Tenancy Context & Onboarding Isolation Fix**:
   - `src/lib/auth-utils.ts`: Rewrote `getCurrentSession()` so authenticated users without membership return `hasOrganization: false` and `organizationId: ''` instead of falling back to seeded `DEFAULT_ORG_ID`. Resolves staff assigned branches from `staffStoreAssignments`. Added `isOwnerOrSuperAdmin` helper for sensitive SaaS controls.
   - `src/actions/tenant-actions.ts`: Updated `getUserTenancyContext()` to strictly scope organizations (only user's org) and branches (all branches for owner, assigned branches for staff). Updated `setupPracticeOnboardingAction` to generate next sequential `orgCode` (`OPT-X`) and `orgNumber`, set `hasCompletedOnboarding: true`, and create initial `staffStoreAssignments` entry.
   - `src/store/tenant-store.ts`: Fixed `setTenancyData` to adopt `data.selectedOrganizationId` without clinging to `state.selectedOrganizationId`.
   - `src/app/auth/login/page.tsx`: Redirects new signups to `/onboarding` instead of `/admin/dashboard`. Added clean Staff Portal access link below the form with `data-testid="link-staff-portal"`.
   - `src/app/onboarding/page.tsx`: Displays assigned Store ID (`OPT-X`) upon completion.
3. **Staff Creation & Multi-Store Management**:
   - `src/actions/tenant-actions.ts`:
     - Updated `createStaffMemberAction` to accept `password`, `mustChangePassword`, and `branchIds: string[]`. Uses `auth.api.createUser` via Better Auth to securely hash passwords into `account` table. Upserts entries into `staffStoreAssignments`.
     - Updated `getStaffMembersAction` to return `stores: StaffStoreAccess[]`, `storeCount`, and `mustChangePassword`.
     - Updated `deleteStaffMemberAction` with Maker-Checker: Store Managers trigger an `approvalRequests` record (`type: 'delete_staff'`), while Org Owners execute deletion directly.
   - `src/app/(dashboard)/admin/staff/page.tsx`:
     - Added initial password input, "Require password reset on first login" checkbox, and multi-store selection checkboxes in Add Staff modal.
     - Made modal scrollable (`max-h-[90vh] overflow-y-auto`) so controls are always accessible.
     - Updated table to render store access badges, `+X more` indicator, and `1st Login Pending` status badge.
4. **Dedicated Staff Portal & Auth Actions**:
   - Created `src/actions/staff-auth-actions.ts`:
     - `resolveOrganizationByInput`: Flexible lookup supporting both full code (`OPT-1`, `opt-1`) and raw numeric input (`1`).
     - `verifyStaffPortalLoginPreflightAction`: Validates org existence, validates user is an active member of that specific org, checks account ban status, and checks `mustChangePassword`.
     - `completeStaffInitialPasswordChangeAction`: Hashes new password via `auth.api.setUserPassword` and clears `mustChangePassword`.
   - Created `src/app/auth/staff-login/page.tsx`:
     - Dedicated Staff Portal with Practice/Store ID, Staff Email, and Password.
     - Includes embedded forced first-time password reset modal for staff when `mustChangePassword` is active.
     - Back link to `/auth/login` (`data-testid="link-owner-login"`).
5. **Viewport Scoping, Branch Switcher & SaaS Redaction**:
   - `src/components/layout/branch-switcher.tsx`: Updated `isMultiBranchAllowed` to allow switching whenever `branches.length > 1` (allowing multi-store staff/managers to switch between their assigned stores, while keeping single-store staff locked). Redacted multi-store reports footer link for staff.
   - `src/app/(dashboard)/layout.tsx`:
     - Redacted "Plans & Upgrade" (`/pricing`) link in sidebar so it is strictly only shown to `isOrganizer || isSuperAdmin`.
     - Redacted Active SaaS Plan Badge & Quick Upgrade Link in header for staff.
     - Suppressed `SubscriberOnboardingModal` for staff.
   - `src/app/pricing/page.tsx`: Added client-side role guard redirecting store staff/managers to `/admin/dashboard` with toast warning.
   - `src/actions/plan-actions.ts`: Added `isOwnerOrSuperAdmin` check in `updateOrganizationPlanAction`.
6. **Automated Quality Gate & Playwright E2E Suite**:
   - Built `e2e/multi-tenant-staff-portal.spec.ts`: 5/5 tests passed (100% green).
   - Core POS Playwright Suite (`npm run test:pos`): 12/12 tests passed (100% green).
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 violations across 78 components.
   - Knowledge Graph: `graphify update .` synced (1,330 nodes, 2,942 edges, 77 communities).
   - BUG-027 documented in `docs/agent-memory/BUG_FIX_LOG.md`.
   - `specs/027-multi-tenant-staff-portal/tasks.md` marked 100% complete.

---

## 3. Previous Accomplishments (Cart Single-Patient Clutter Removal, Power Selection Active Customers & Rx Modal, and Cross-Viewport Family Removal)
1. **Frame Zero Power Invariant (Strict Domain Guard)**:
   - `src/components/pos/billing-cart.tsx`: Removed "Choose Power" / "View Power" action buttons from all frames (`FRAME`, `SUNGLASS`, `SUNGLASSES`). Frames never contain optical power. Replaced with a non-interactive `Frame (Zero Power Invariant)` badge. Power selection is strictly restricted to lenses and contact lenses.
2. **1:1 Lens-to-Frame Pairing Enforcement**:
   - `src/components/pos/billing-cart.tsx` & `src/components/pos/add-product-modal.tsx`: Enforced strict 1:1 pairing between an ophthalmic lens and a frame. Any frame in the cart that is already paired to another lens is excluded from `availableCandidateFrames` (`!items.some(other => other.id !== item.id && other.linkedFrameId === cf.id)`).
   - If all candidate frames in the cart are paired, display `(All frames in cart already paired 1:1)` with option `+ Use Customer's Own Frame`.
3. **Clinical Corneal Vertex Distance Converter Engine (`src/lib/vertex-converter.ts`)**:
   - Built optical vertex equation: $F_{CL} = \frac{F_{spec}}{1 - d \cdot F_{spec}}$ ($d = 12$mm standard corneal vertex distance).
   - Implemented integer-scaled 0.25 D quarter step rounding (`roundToQuarterStep`), spherical equivalent calculation ($SE = SPH + \frac{CYL}{2}$ for astigmatism $< 0.75$ D), and clinical dispensing alerts (significant vertex effect $\ge \pm 4.00$ D, toric recommendation, presbyopia).
   - Built unit test suite `scripts/test-vertex-converter.ts` with 100% pass rate.
4. **Integrated Contact Lens Vertex Converter UI**:
   - `src/components/pos/add-product-modal.tsx`: Integrated the vertex converter drawer into the contact lens dispensing flow with 1-click **"⚡ Apply Converted Power to OD / OS"** button.
   - `src/components/pos/prescription-grid.tsx`: Added `btn-toggle-cl-converter` toggle button in header, vertex distance selector (10mm, 12mm, 14mm), spherical equivalent toggle, and 1-click copy buttons for OD and OS contact lens powers.
5. **Clinical Visual & Ergonomic Redesign for Customer & Refraction Power Selection**:
   - `src/components/pos/pos-view.tsx`: Redesigned patient workspace from 4–6 plain rectangular boxes into a clinical identity card featuring:
     - Avatar with customer initials and verified badge.
     - 1-click phone copy-to-clipboard button.
     - Demographics (gender/age) and location tags.
     - Advance credit wallet badge (`Advance Credit: ₹...`).
     - Past Purchases order counter button with direct tab switching.
     - Clean `select-invoice-account` payer dropdown with family support.
   - `src/components/pos/patient-search.tsx`: Upgraded search dropdown list with initials avatars, primary vs. dependent account badges, phone/location metadata, and advance credit pills.
   - `src/components/pos/prescription-grid.tsx`: Dual-eye color coding with Sky Blue (OD Right Eye) and Violet (OS Left Eye) row themes, tactile `+` / `−` steppers, and color-coded diopters (Rose for negative myopia, Sky/Violet for positive hyperopia).
6. **Automated Quality Gate & Regression Verification**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 violations across 77 components.
   - `npm run test:pos`: 12/12 passed (100% green).
   - `graphify update .`: Synced to 1,277 nodes, 2,853 edges.
   - Logged BUG-025 in `docs/agent-memory/BUG_FIX_LOG.md`.

---

## 2. Most Recent Task Accomplishments (Configured Store Product Types Display, Step Normalization, Lab Orders De-congestion & Direct Viewports)
1. **POS Add Product Modal Fixes & Search Capabilities**:
   - `src/components/pos/add-product-modal.tsx`: Fixed runtime crash (`cannot read properties of undefined (reading 'find')` / `map`) caused by schema property naming discrepancy (`stepName`, `inputType`, `options` from DB vs `step_name`, `input_type`, `options_array` in UI).
   - Created normalized step getters (`getStepName`, `getInputType`, `getStepOptions`) with safe fallback to `[]`.
   - Updated `calculateWizardPrice`, `handleFinishWizard`, and sequential step wizard (VIEW 3) to use normalized getters.
   - Added Global Search bar + search results panel with 1-click Add and 👓 Pair buttons in main modal view (`input-modal-global-search` and `btn-modal-global-search`).
   - Added explicit "Search" buttons beside search inputs across all category views (`POWER_GLASSES`, `BLUE_CUT`, `SUNGLASSES`, `CONTACT_LENSES`, `FRAME_ONLY`).
2. **POS Header Duplicate `+` Removal**:
   - `src/components/pos/pos-view.tsx`: Removed redundant `+` text symbol from the Add Product button, keeping clean icon and label `<span>Add Product [F2]</span>`.
3. **Lab Orders Space De-congestion & In-Box Contextual Sub-filters**:
   - `src/components/admin/lab-orders-view.tsx`: Removed the extra standalone card box container (`bg-card border border-border rounded-xl p-2.5 shadow-2xs`) that congested vertical space.
   - Placed search input, common filter chips (`All`, `Overdue`, `Balance Due`), sort dropdown, and view switcher inline on a single toolbar line without unnecessary wrapper boxes.
   - Embedded contextual sub-filter pill buttons inside each Kanban column header based on domain logic:
     - **Column 1 (Action Required)**: `All (N)` vs `⚠️ Urgent (N)`.
     - **Column 2 (At Lab / In Fitting)**: `All (N)` vs `Lab (N)` vs `Fitting (N)`.
     - **Column 3 (Ready for Pickup)**: `All (N)` vs `Due (N)` vs `Paid (N)`.
4. **Direct POS Viewport Modes (Rx, Split, Cart)**:
   - `src/components/pos/pos-view.tsx`: Completely eliminated `<select data-testid="pos-layout-type-select">` and "Adaptive Modes" tag from UI and code.
   - Replaced with direct, visible segmented viewport buttons: `👁️ Rx` (`btn-mode-rx-focus`), `⚖️ Split` (`btn-mode-split`), and `🛒 Cart [F4]` (`btn-mode-billing-focus`).
   - Simplified `renderLayout` to directly render based on `posAdaptiveMode` (`rx_focus`, `split`, `billing_focus`) with localStorage persistence in `optixos_pos_mode`.
   - Updated F4 keyboard shortcut to toggle directly between `billing_focus` and `split`.
   - Updated `e2e/pos-layout-modes.spec.ts` and `e2e/pos-checkout.spec.ts`.
5. **Automated Verification**:
   - Full TypeScript & ESLint check (`npm run check`): 0 errors, 0 warnings.
   - Security audit (`npm run audit:security`): 0 critical violations.
   - Design system audit (`npm run audit:design`): 0 violations.
   - Playwright tests: `e2e/lab-orders.spec.ts` (1/1 green), `e2e/pos-layout-modes.spec.ts` (1/1 green), `npm run test:pos` (12/12 green).
   - Knowledge graph (`graphify update .`): Refreshed to 1,256 nodes, 2,806 edges.
   - Documented BUG-023 in `docs/agent-memory/BUG_FIX_LOG.md`.
1. **POS Billing & Patient Selection Workflows**:
   - `src/app/api/patients/search/route.ts` & `src/components/pos/patient-search.tsx`: Instant recent patient suggestions displayed on click/focus before typing.
   - `src/components/pos/compact-patient-strip.tsx`: Added `(×)` action button on family chips for quick unlinking; wired in `src/components/pos/pos-view.tsx`.
   - `src/actions/settings-actions.ts` & `src/components/admin/settings-view.tsx`: Removed redundant POS Counter Layout tab from store settings (persistence verified via localStorage and F4); added GST Invoicing toggle (`enableGstInvoicing`).
   - `src/components/pos/billing-cart.tsx`: Added `CartRxInspectorModal` for inline optical power inspection and power switching directly from cart; added frame pairing badges (`🔗 Paired`, `👓 Own Frame`, `⚠️ Unpaired Lens`) with in-cart candidate frame linking; updated family patient assignment label to `Assign to Patient:`.
   - `src/components/pos/pos-view.tsx`: Passed customer advance balance to `PaymentPanel` and linked pair lenses automatically in `handleConfigureSpectaclePair`.
2. **Dynamic Product Categorization & Sequential Workflow Builder**:
   - `src/db/schema.ts` & `src/db/migrate-product-types.ts`: Created and migrated `productTypes` table with custom categories, required prescription toggles, and step config schemas.
   - `src/actions/product-type-actions.ts`: Full CRUD Server Actions for managing custom product types and step configurations.
   - `src/components/admin/product-types-settings.tsx`: Mounted dynamic product type builder UI in store settings.
   - `src/components/pos/add-product-modal.tsx`: Rebuilt product dispatcher with dynamic category loading, sequential step wizard with parent-child option dependencies, and automatic frame pairing.
3. **Invoice & Tax Customization & Post-Order Editing**:
   - `src/actions/invoice-edit-actions.ts`: Built `getInvoiceForEditAction` and `updateInvoiceDetailsAction` with live `decimal.js` recalculation of taxable, CGST, SGST, grand total, and balance due.
   - `src/components/admin/edit-invoice-modal.tsx`: Full interactive editing modal with line item discount adjustment, recipient editing, and balance recalculation.
   - `src/components/admin/reports-view.tsx` & `src/components/pos/pos-view.tsx`: Mounted Edit Invoice action triggers.
4. **Inventory SKU Streamlining & Configurable Negative Stock Deduction**:
   - `src/lib/validators/inventory.ts` & `src/actions/inventory-actions.ts`: Added `customCategory`, `isGstExempt`, and flexible `taxRate`.
   - `src/components/admin/add-inventory-form.tsx`: Built compact single identifier input (SKU/barcode/name), dynamic custom categories (`+ Custom Category`), GST vs. Tax Exempt toggle, and collapsible advanced options.
   - `src/actions/process-optical-order.ts`: Fixed `allowNegativeStock` fallback to strictly default to `false` in schema and actions, preserving atomic inventory locking unless merchant explicitly opts in.
5. **Lab Orders Kanban Ergonomics**:
   - `src/components/admin/lab-orders-view.tsx`: Added filter chips (`All`, `Overdue Only`, `Balance Due Only`), per-column sorting (Promised Date, Order Date, Customer Name, Balance Due with asc/desc direction), and compact cards (~100-110px height) fitting 4-5 orders above the fold.
6. **Patients Table Phone Hover-Copy**:
   - `src/components/admin/patients-view.tsx`: Added hover-copy action icon on phone numbers with clipboard write and toast feedback.
7. **Logical Loopholes, RBAC Hardening, Deletions Approval & Returns/Store Credit**:
   - `src/actions/approval-actions.ts`: Built Maker-Checker actions (`createStoreApprovalRequestAction`, `getStoreApprovalRequestsAction`, `resolveStoreApprovalRequestAction`) with automated admin in-app notification dispatch (`approval.requested`).
   - `src/actions/patient-actions.ts` & `src/actions/inventory-actions.ts`: Restricted customer and inventory deletion to Admins/Managers; non-admin staff trigger Maker-Checker approval requests; customer deletion enforces safety checks for active unclosed orders and unpaid balance.
   - `src/actions/return-refund-actions.ts`: Built `processReturnRefundAction` with line item returns, inventory restocking, store credit (`customers.advanceBalance` wallet), and refund payment recording.
   - `src/actions/process-optical-order.ts`: Integrated store credit atomic debit when payment mode is `CREDIT`.
   - `src/components/admin/return-refund-modal.tsx`: Return/refund modal with line item selection, quantity restocking, refund mode selection (Store Credit / Cash / UPI / Card), and reason. Mounted in `reports-view.tsx`.
8. **Automated Verification**:
   - `e2e/pos-checkout.spec.ts` & `e2e/pos-layout-modes.spec.ts`: All 12 POS tests passing (100% green).
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 critical violations across 77 components.
   - `graphify update .`: Synced to 1,251 nodes, 2,797 edges, 79 communities.
   - Documented BUG-021 and BUG-022 in `BUG_FIX_LOG.md`.

---

## 3. Previous Accomplishments (Flexible Notification & Alerting Subsystem Architecture & Implementation)
1. **Drizzle ORM Database Schemas & Live Migration**:
   - Added `notifications`, `notificationReads`, and `notificationPreferences` tables to `src/db/schema.ts` with multi-tenant foreign keys (`organization_id`, `branch_id`, `user_id`), cascade rules, and indexes.
   - Applied migration cleanly to Neon Serverless PostgreSQL via `src/db/migrate-notifications.ts`.
2. **Modular Event Strategy Registry Pattern**:
   - Built `src/lib/notifications/types.ts` and `src/lib/notifications/event-registry.ts`: defines type-safe event categories (`system`, `alert`, `reminder`), severities (`low`, `medium`, `high`, `critical`), typed payload schemas (`inventory.low_stock`, `lab_order.sla_overdue`, `system.announcement`, `subscription.payment_failed`, `approval.requested`), presentation formatters, and channel policies. New event types can be added without modifying core pipeline code.
3. **High-Performance Server Actions & Cache Layer**:
   - Implemented `src/actions/notification-actions.ts`:
     - `getNotificationsAction(filter)`: Correlates notifications with per-user `notification_reads` to dynamically calculate `isRead`.
     - `getUnreadNotificationCountAction()`: Computes unread count and `hasUrgent` flag.
     - `markNotificationReadAction()` & `markAllNotificationsReadAction()`: Updates read status and invalidates Redis cache.
     - `dispatchNotificationAction()`: Dispatches notifications with deduplication window (`dedupKey`) preventing repetitive alerts.
     - `seedInitialNotificationsAction()`: Provisions realistic demo alerts on initial cold runs.
4. **UI/UX Header Integration & Popover Drawer**:
   - Built `@/components/notifications/`:
     - `NotificationBellTrigger`: Topbar bell icon button with dynamic unread count badge (`99+` cap), pulsing red/amber indicator for urgent alerts, and hydration-safe rendering. Mounted in `src/app/(dashboard)/layout.tsx` between `PriorityNotesTrigger` and `ThemeToggle`.
     - `NotificationPopover`: Anchored desktop popover & mobile drawer with filter tabs (`All`, `Unread`, `Alerts`, `Reminders`), "Mark all as read" button, empty state, and direct action deep-link buttons.
     - `NotificationItemCard`: Renders individual notification items with category icon, severity badge, relative time ("5m ago"), and action links.
5. **Domain Event Wiring**:
   - Automated low stock alert dispatch wired into `updateInventoryItem` in `src/actions/inventory-actions.ts` when stock drops at or below reorder threshold.
6. **Comprehensive Automated Verification**:
   - `e2e/notifications.spec.ts`: 5/5 passing (100% green) covering bell rendering, opening popover, category tabs filtering, marking all as read, and closing popover.
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:design`: 0 violations across 70 components.
   - `npm run audit:security`: 0 critical violations.
   - `npm run test:pos`: 12/12 passing (100% green).
   - `graphify update .`: Synced to 1,184 nodes, 2,545 edges, 71 communities.

---

## 3. Previous Accomplishments (Single-Store Operational Isolation, Playground Removal & Consolidated Practice Reports Hub)
1. **Unwanted Playground & Simulator Route Removal**:
   - Completely deleted `src/app/playground/` and `src/app/super-admin/simulator/`.
   - Removed simulator links and `link-open-playground` from `src/app/super-admin/layout.tsx`.
   - Updated `src/components/layout/simulation-banner.tsx` exit button to route to `/super-admin/dashboard`.
2. **Single-Store Architecture in Operational Views**:
   - Refactored `src/store/tenant-store.ts`: eliminated the `'all'` selection mode and `toggleBranchSelection`. Set `selectedBranchId` to default branch UUID, and maintained `selectedBranchIds: [selectedBranchId]` as a single atomic element.
   - Refactored `src/components/layout/branch-switcher.tsx` into an active store switcher with a direct link to the Consolidated Practice Reports Hub.
   - Refactored `src/components/layout/user-nav.tsx` store badge to display the active single store.
   - Scoped all operational views strictly to `selectedBranchId`:
     - POS Billing Counter: dropdown bound directly to `setSelectedBranch` and `selectedBranchId`.
     - Inventory View & Form: table cacheKey and form store binding scoped to active single store.
     - Patients View: directory cacheKey and search scoped to active single store.
     - Lab Orders View: kanban cacheKey and filter scoped to active single store.
     - Staff Management: staff list cacheKey scoped to active single store.
     - Priority Notes: removed merged-branch grouping logic and store scope bar; scoped notes strictly to the active store.
3. **Consolidated Practice Reports Hub (`/admin/reports`)**:
   - In `src/actions/report-actions.ts`: Added `StorePerformanceMetric`, added `storeBreakdown` to `DailyFinancialsReport`, added `branchScope` filter (`'all'` vs individual store ID) to `FinancialsReportFilter`, and computed store-by-store performance metrics with `decimal.js`.
   - In `src/components/admin/reports-view.tsx`: Added Store Scope dropdown in the header, enabling Practice Admins to analyze either the entire consolidated practice or filter down to a specific store. Added a multi-store performance breakdown section displaying store cards with revenue, share progress bar, order count, and balance due.
4. **Full Test & Quality Gate Verification**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical issues.
   - `npm run audit:design`: 0 violations.
   - `npm run test:pos`: 12/12 passed (100% green).
   - `npx playwright test e2e/multi-branch-relations.spec.ts e2e/tenant-roles.spec.ts`: 13/13 passed (100% green).
   - Knowledge graph synced via `graphify update .` (1134 nodes, 2409 edges, 76 communities).
   - Documented `BUG-019` in [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).

---

## 3. Previous Accomplishments (React 19 Hydration Mismatches & Script Injection Warning Elimination)
1. **Root Cause Analysis of the Hydration Mismatches**:
   - **UserNav / BranchSwitcher Text & Class Divergence**: In `src/store/tenant-store.ts`, `getInitialPersistedTenantState()` read `sessionStorage` at module scope on the client (`typeof window !== 'undefined'`), but returned `{}` on the server. Consequently, on the server, `activeRoleMode` defaulted to `'super_admin'`, rendering `<span ...>Root Super Admin</span>` with purple badge styles. On the client during frame-0 hydration, the store initialized with the user's persisted role (e.g. `'organizer'`, Practice Admin), generating blue badge styles and `"Practice Admin"`. React 19 detected the mismatch between server HTML and client VDOM on line 182 of `user-nav.tsx`.
   - **DashboardLayout Nav Item Mismatch**: Role flags (`isSuperAdmin`, `isOrganizer`) were evaluated during SSR, causing the server to render `<a data-testid="nav-super-admin">` while the client hydration tree omitted it.
   - **React 19 Next-Themes Warning**: `next-themes` injected an inline `<script>` tag, which React 19 flags in Client Components via `console.error`.
2. **Canonical `mounted` State Architecture in UI Headers**:
   - **UserNav (`src/components/layout/user-nav.tsx`)**: Implemented the canonical `mounted` state pattern. During SSR and initial client hydration frame 0 (`!mounted`), `UserNav` renders deterministic default text (`"Administrator"`, `"Active User"`, and neutral slate badge styling), guaranteeing byte-for-byte identical DOM trees between server HTML and client VDOM. Once mounted, it seamlessly transitions to the authenticated user's actual profile and active role badge.
   - **BranchSwitcher (`src/components/layout/branch-switcher.tsx`)**: Implemented the `mounted` state pattern on `displayLabel`, `triggerIcon`, and branch counter badge so that initial SSR and client hydration trees match 100% identically with `"All Branches (Consolidated)"` before switching to the persisted branch selection.
   - **DashboardLayout (`src/app/(dashboard)/layout.tsx`)**: Guarded role-restricted sidebar items with `mounted` (`mounted && activeRoleMode === 'super_admin'`) so that server HTML and client initial hydration trees match 100%.
3. **ThemeProvider Script Tag Filter (`src/components/theme-provider.tsx`, `src/app/layout.tsx`)**:
   - Filtered the React 19 `next-themes` false-positive script warning during dev mode and added `suppressHydrationWarning` to `<body>`.
4. **End-to-End Browser & Test Validation**:
   - Executed live browser audit via subagent: navigated across `/admin/patients`, created and inspected patient records, reloaded pages with F5, verified zero console errors, zero Next.js error overlays, and zero hydration warnings.
   - Ran `npm run test:pos`: 12/12 passed (100% green).
   - Synced AST knowledge graph (`graphify update .`) to 1,137 nodes, 2,422 edges, 67 communities.
   - Documented `BUG-018` in [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).
1. **Root Cause Analysis of the 2 Reload Defects**:
   - **Issue 1 (Loading Flash)**: In `src/hooks/use-cached-resource.ts`, `useState` only initialized once on mount. During page reload, `useTenantStore` asynchronously rehydrated after frame 0, starting with `cacheKey: 'inventory_list:all'` and then switching to the user's specific branch key. When the key switched, the component briefly had no data and rendered a heavy `<Loader2>` spinner card for 200–400ms before client `useEffect` updated data.
   - **Issue 2 (Branch Reset)**: In `src/components/layout/user-nav.tsx`, `getUserTenancyContext()` ran on mount and called `setTenancyData({ ..., selectedBranchId: 'all' })`, forcibly clobbering the user's saved branch selection back to `'all'` on every reload.
2. **Synchronous Frame-0 Rehydration in `src/store/tenant-store.ts`**:
   - Added `getInitialPersistedTenantState()` to synchronously parse `sessionStorage` on initial client frame.
   - Initialized `selectedOrganizationId`, `selectedBranchId`, and `selectedBranchIds` directly from saved session storage so the component never mounts with default `'all'` if the user had selected a branch.
   - Hardened `setTenancyData` to preserve the user's active branch selection and only fallback to `'all'` if the branch was removed on the server.
3. **Branch Protection in `src/components/layout/user-nav.tsx`**:
   - Removed `selectedBranchId: 'all'` from `user-nav.tsx` so tenancy data synchronization never overwrites user selections.
4. **Enhanced SWR Hook (`src/hooks/use-cached-resource.ts`)**:
   - Added module-level `memoryCache` Map for 0.00ms instantaneous lookup across unmounts/remounts.
   - Added synchronous render-time state synchronization when `cacheKey` changes (`prevKey !== cacheKey`) to eliminate any intermediate loading frame.
5. **Ergonomic Cold-Load Skeleton Layouts**:
   - Replaced jarring centered `<Loader2>` spinner cards in [`InventoryView`](file:///f:/hobby-projects/optical-pos/src/components/admin/inventory-view.tsx), [`PatientsView`](file:///f:/hobby-projects/optical-pos/src/components/admin/patients-view.tsx), and [`ManageStaffPage`](file:///f:/hobby-projects/optical-pos/src/app/%28dashboard%29/admin/staff/page.tsx) with clean, subtle animated skeleton table rows for genuine cold-load states.
6. **Full Validation**:
   - `npm run check`: 0 errors, 0 warnings.
   - `npm run audit:security`: 0 critical violations.
   - `npm run audit:design`: 0 critical violations.
   - `npm run test:pos`: 12/12 passed (100% green).
   - `graphify update .`: Synced to 1,135 nodes, 2,420 edges, 73 communities.
   - Documented `BUG-017` in [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).
1. **Multi-Store Branch Scoping & Tenancy Architecture**:
   - Integrated `useTenantStore` with `usePriorityNotesStore` to bind every priority note with `branchId` and `branchName`.
   - Guaranteed strict tenant/branch scoping: Store Staff and Store Admins can **ONLY** view and manage notes for their currently assigned store, completely restricting cross-store data leakage.
2. **Organization Admin Merged View (`🏢 All Branches (Merged)`)**:
   - Organization Admins (`super_admin`, `organizer`) have full access to view notes aggregated across all stores in a single unified view.
   - When in Merged View, notes are automatically **grouped by branch** (`branchGroups`), each rendered with a dedicated branch header card, active note count badge, and distinct High, Medium, Low priority buckets.
   - Org Admins can toggle between the Merged View or any specific branch via the Store Selector dropdown in the drawer.
3. **Branch-Scoped Quick Add & Topbar Dynamic Indicators**:
   - In Merged View, the Quick Add card features an intuitive `Add to Store: [Select Store]` picker allowing Org Admins to route tasks to any store.
   - In Single-Store View, notes are automatically assigned to the active store.
   - Topbar launcher trigger (`PriorityNotesTrigger`) dynamically calculates note counts and pulsing urgency indicators based on the user's active branch scope.
4. **Comprehensive Test Suite & Quality Gates**:
   - Extended `e2e/priority-notes.spec.ts` to 8 full scenarios covering drawer launcher, priority buckets, completion strikethrough, trash restoration, pinning persistence, batch edit mode, Org Admin merged grouping, and Store Staff single-branch lock (**8/8 passed, 100% green**).
   - Core POS Playwright suite (`npm run test:pos`): **12/12 passed (100% green)**.
   - SaaS Razorpay Playwright suite (`e2e/saas-subscription-razorpay.spec.ts`): **3/3 passed (100% green)**.
   - `npm run check`: **0 errors, 0 warnings**.
   - `npm run audit:design`: **0 violations (100% semantic tokens)**.
   - `npm run audit:security`: **0 critical violations**.
   - Synced AST knowledge graph (`graphify update .`) to **1070 nodes, 2276 edges, 76 communities**.

---

## 3. Previous Accomplishments (Phase 25: Razorpay SaaS Subscriptions & Feature Gating)
1. **Architectural Research & Gateway Selection (ADR-009)**:
   - Evaluated **Razorpay Standard Checkout (Popup Modal)** vs **Razorpay Hosted Page (Redirect)**.
   - **Selected Standard Checkout (`checkout.js` modal)** as primary UX for zero-dropoff, seamless in-app context, instant failure recovery, and PCI-DSS compliance. Included server fallback via Payment Links API (`createRazorpayPaymentLink`).
2. **Database Schema & Migrations**:
   - Added `plan_id`, `subscription_status`, `subscription_period`, `subscription_ends_at`, and `has_completed_onboarding` to `organizations` table in Neon PostgreSQL.
   - Created `subscriptions` financial audit table with exact `numeric(12, 2)` monetary columns and relational index on `organization_id`.
   - Executed live migration via `scripts/migrate-subscriptions.ts`.
3. **Razorpay Server SDK & Security Invariants**:
   - Built `src/lib/razorpay.ts` with timing-safe HMAC SHA-256 verification (`crypto.timingSafeEqual`) preventing timing attacks.
   - Enforced exact currency calculations using `decimal.js` converting INR to integer paise (`amount * 100`).
   - Verified live API connection against Razorpay Test API (`rzp_test_TRlarZort0e1K7`) successfully generating live orders.
4. **Subscription Server Actions & Webhooks**:
   - Built `src/actions/subscription-actions.ts`: `createRazorpaySubscriptionOrderAction`, `verifyRazorpayPaymentAction`, `handlePaymentFailureAction`, and `completeOnboardingAction`.
   - Built `src/app/api/webhooks/razorpay/route.ts` handling `order.paid`, `payment.captured`, and `payment.failed` with signature verification.
5. **Lovable Subscriber Onboarding & Feature Gating**:
   - Built `src/components/subscription/subscriber-onboarding-modal.tsx`: 4-step guided interactive walkthrough for first-time subscribers with a skip option.
   - Built client-safe `src/lib/feature-gate.ts`, `<PlanUpgradeModal>`, and `<PlanUpgradeGate>` component.
   - Guarded enterprise/growth features (e.g. Lab Orders Kanban) with instantaneous in-app upgrade triggers.

---

## 4. Current Architecture & Key Entry Points
- **Spec-Driven Vibe Engine**: `specs/` (active features: `specs/025-razorpay-saas-subscription/`, `specs/024-gst-e-invoicing/`)
- **Next.js 16 App Router**: `src/app/`
  - POS Counter Terminal: `src/app/(dashboard)/pos/new-bill/`
  - Lab Orders Kanban: `src/app/(dashboard)/admin/lab-orders/`
  - Staff Management: `src/app/(dashboard)/admin/staff/`
  - Super Admin Root Console: `src/app/super-admin/`
  - SaaS Pricing & Upgrade: `src/app/pricing/`
  - Priority Notes Trigger: `src/components/priority-notes/priority-notes-trigger.tsx`
  - Priority Notes Drawer: `src/components/priority-notes/priority-notes-drawer.tsx`
- **Database & Schemas**: `src/db/schema.ts` (Neon Serverless PostgreSQL via `-pooler`)
- **Server Actions**: `src/actions/` (vertical slices: `subscription-actions.ts`, `plan-actions.ts`, `checkout-actions.ts`, `tenant-actions.ts`, `account-actions.ts`)
- **Client State**: Zustand stores in `src/lib/stores/pos-store.ts`, `src/store/priority-notes-store.ts`, `src/store/tenant-store.ts`
- **High-Speed Cache**: Upstash Redis REST in `src/lib/redis.ts` with graceful DB fallback
- **Knowledge Graph**: `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md`

---

## 5. Active Security Findings & Pending Technical Debt (from `SECURITY_LOG.md`)
- [ ] **[SEC-002] Redact & Encrypt `smtpPass`** (`src/actions/settings-actions.ts:30`):
  - Redact raw SMTP password from client return payload in `getStoreProfile()`.
  - Implement AES-256-GCM envelope encryption at rest.
- [ ] **[SEC-003] Enforce Upstash Redis Rate-Limiting** (`src/actions/account-actions.ts`, `src/actions/checkout-actions.ts`):
  - Implement `@upstash/ratelimit` on 2FA verification attempts (5 tries/15 min) and checkout transactions (30 req/min).
- [ ] **[SEC-004] Scope `storeProfile` to `organizationId`** (`src/db/schema.ts:168`):
  - Add foreign key `organizationId` to `storeProfile` table for multi-tenant SaaS isolation.

---

## 6. Handoff Protocol for Next AI Agent
Whichever AI agent takes the next request:
1. **Read `docs/agent-memory/SESSION_HANDOFF.md`** (this file) to immediately understand where the project stands.
2. **Read `docs/agent-memory/BUG_FIX_LOG.md`** to verify you do not repeat any known bugs.
3. **Use `graphify explain "<Symbol>"`** to trace callers, callees, and blast radius before modifying code.
4. **Think & Verify Twice**: Analyze root cause and ripple effects; prioritize bug-free correctness over saving tokens.
5. **Update this file and `BUG_FIX_LOG.md`** before concluding your task.
