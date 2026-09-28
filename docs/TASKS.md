# Task Ledger & Development Roadmap

This document serves as the master task ledger and release roadmap for **OptixOS (Optical Billing & Practice Management System)**. It tracks completed development phases, active work, and planned future milestones with strict acceptance criteria.

---

## 1. Completed Phases (Phases 1 – 13)

### Phase 1: Core Multi-Tenant Architecture & Database Schema
- [x] Neon Serverless PostgreSQL setup with PgBouncer connection pooling (`-pooler`).
- [x] Drizzle ORM schema declaration (`organizations`, `branches`, `users`, `customers`, `prescriptions`, `inventory_items`, `invoices`, `payments`).
- [x] Multi-tenant isolation model enforcing `organization_id` on all tables.
- [x] Better Auth integration with organization scoping and role-based permissions.

### Phase 2: Upstash Redis High-Speed Caching Layer
- [x] Upstash Redis REST integration with stateless HTTP calls.
- [x] Resilient fail-open wrapper (`safeRedisGet`, `safeRedisSet`) guaranteeing zero crashes if Redis is unreachable.
- [x] Live patient phone search cache (`cache:patients:search:{orgId}:{q}`).
- [x] Live inventory barcode/SKU search cache (`cache:inventory:search:{orgId}:{branch}:{category}:{q}`).

### Phase 3: Clinical Refraction Matrix & Patient Prescription Management
- [x] Ophthalmic diopter validation (SPH, CYL, ADD in strict 0.25 D quarter steps).
- [x] Astigmatic axis validation (1–180 degrees when `CYL != 0`, null when `CYL == 0`).
- [x] Decoupled plano reading glasses and distance vision support.
- [x] Chronological prescription history cards with "+ Add New Power" inline drawer.

### Phase 4: Optical Customer & Family Account Clustered Graph
- [x] Primary mobile phone lookup for immediate family identification.
- [x] Dependent phone architecture allowing minors to share parent phone numbers without primary key collision.
- [x] Relationship modal linking existing patients to family clusters.
- [x] Split billing allowing parents to settle invoices for child refractions.

### Phase 5: Retail Inventory Engine & Product Dispatcher [F2]
- [x] 6-category inventory taxonomy (Frames, Ophthalmic Lenses, Sunglasses, Contact Lenses, Solutions, Accessories).
- [x] Keyboard hotkey `F2` triggering instant modal product search.
- [x] Atomic conditional inventory decrements (`WHERE stock_quantity >= :qty RETURNING`) preventing over-selling.
- [x] Query-level wholesale cost redaction (`cost_price` masked from floor cashiers).

### Phase 6: POS Cart & Spectacle Pair Guided Wizard
- [x] 4-step guided pairing wizard (Frame Selection -> Lens Category/Coating -> Prescription Power Link -> Cart Bundling).
- [x] Direct add workflows for Sunglasses, Contact Lenses, and "Lens Only" (customer own frame).
- [x] Cart Item Inspector drawer for frame wrap fitting notes and lens tint overrides.
- [x] Persistent Zustand client store (`usePOSStore`) preserving cart and patient state across SPA route transitions.

### Phase 7: Retail Ledger Accounting & Indian GST Split
- [x] Mandatory `decimal.js` monetary calculations with zero floating-point math.
- [x] Statutory split Indian GST (5% lenses, 18% frames and sunglasses).
- [x] Dual-box discount input with real-time bidirectional synchronization between absolute currency (`₹`) and percentage (`%`).
- [x] Multi-tender settlement (Cash, UPI QR, Card, Store Credit, Pending Balance).

### Phase 8: Hardware Print Engine & CSS @media print
- [x] Pure CSS `@media print` engine generating instantaneous print dialogs without server-side PDF latency.
- [x] 80mm thermal receipt printer template (72mm locked printable content).
- [x] A4 tax invoice template with comprehensive CGST/SGST statutory tax breakup.
- [x] Workshop job slip template with complete optical parameters and **strict redaction of all financial/pricing data**.

### Phase 9: Super Admin Perspective Simulator
- [x] Super Admin simulation panel at `/admin/perspective`.
- [x] Role, organization, and branch impersonation via signed session cookies.
- [x] Persistent, non-dismissible amber header banner (`PerspectiveBanner.tsx`) warning developers of active simulation mode.
- [x] One-click "Exit Simulation" endpoint restoring authentic platform credentials.

### Phase 10: Store Settings & Hardware Configuration
- [x] Organization profile, branch address, contact details, and GSTIN management.
- [x] Thermal receipt custom headers, terms of service, and footer notes.
- [x] Default POS layout mode preference selection (`store_settings.default_pos_layout_mode`).

### Phase 11: End-to-End Test Automation Pyramid
- [x] Playwright E2E configuration with synthetic test authentication bypass (`x-e2e-bypass-auth: true`).
- [x] Deterministic seed data suite (`npm run db:seed`).
- [x] 13 automated E2E test suites with 100% pass rate.

### Phase 12: UI/UX Modernization & WCAG AA Dark Mode Compliance
- [x] High-contrast native dark mode adhering to 4.5:1 text contrast ratios.
- [x] Elimination of low-contrast `opacity-*` text classes in dark themes.
- [x] Standardized fluid full-width layout (`flex flex-col h-full w-full p-4 md:p-6 gap-6`).
- [x] WCAG 2.5.3 Label in Name compliance on icon buttons and search inputs.

### Phase 13: POS Counter Viewport Modes
- [x] 4 distinct operational POS layout modes:
  - **Adaptive Split View**: 7:5 balanced layout default.
  - **Rx Refraction Focus**: 9:3 clinical matrix with mini-cart slide-over drawer.
  - **Billing Focus**: 1-line `CompactPatientStrip`, 8-column wide cart table, 4-column settlement grid.
  - **Dense Split View**: 50/50 split, 38px ultra-compact table rows, sticky `DenseBottomBar`.
- [x] Keyboard hotkey `F4` cycling through active modes.
- [x] Organization default setting persistence in Store Settings.

---

## 2. Active Phase (Phase 14): Production-Level Vibe Coding Infrastructure

- [x] Comprehensive architectural reference (`docs/ARCHITECTURE.md`).
- [x] Optical design system & WCAG guidelines (`docs/DESIGN.md`).
- [x] Strict operational coding rules (`docs/RULES.md`).
- [x] Architectural Decision Records ADR-001 through ADR-008 (`docs/DECISIONS.md`).
- [x] Enterprise retail security & compliance specification (`docs/SECURITY.md`).
- [x] Quality assurance strategy and 13-workflow test matrix (`docs/TEST_PLAN.md`).
- [x] Master task ledger and roadmap (`docs/TASKS.md`).
- [x] Living project memory ledger (`docs/MEMORY.md`).
- [x] The OptixOS Vibe Coding Playbook & prompt templates (`docs/VIBE_WORKFLOW.md`).
- [x] Update `docs/PRD.md` with recent architectural developments.
- [x] Multi-agent rule files (`.cursor/rules/*.mdc`, `AGENTS.md`, `CLAUDE.md`).
- [x] Dynamic documentation elasticity & archival system (`docs/archive/` and `docs/archive/ARCHIVE_LOG.md`).
- [x] Shortcut scripts in `package.json` (`typecheck`, `test:pos`, `test:all`).
- [x] Full static validation (`npm run check`) & E2E verification (12/12 passed).
- [x] **Google OAuth 2.0 Integration**: Registered client credentials, configured Better Auth provider, trusted origins.
- [x] **Default Super Admin Seeding**: `admin@optixos.com` / `AdminPass123!` initialized with quick-fill on login.
- [x] **Strict Tenant Staff Isolation**: Fixed cross-tenant staff bleed with strict `memberTable` inner join.
- [x] **Public SaaS Landing Page & Pricing Matrix**: High-converting root page at `/` and `/pricing` with 4 POS modes preview and plan selection.
- [x] **Knowledge Graph Synchronization**: Executed `graphify extract` and `graphify cluster-only` for full codebase topology.
- [x] **Perspective Playground (`/playground`)**: Completely decoupled simulator from `/super-admin`. Interactive persona launcher for Practice Owner (Organizer), Store Admin (Branch Manager), and Store Staff (POS Cashier).
- [x] **Privacy-First Super Admin Governance**: Redesigned `/super-admin/dashboard` to strictly maintain tenant practices, physical branches, and branch user directories with zero exposure of store sales, invoices, or customer refractions.
- [x] **Legacy Route Redirect**: Configured `/super-admin/simulator` to smoothly redirect to `/playground`.
- [x] **Phase 15: WhatsApp Customer Engagement & Digital Receipts**:
  - `src/lib/whatsapp-utils.ts`: Telephone number normalization with `91` country code, structured optical tax invoice text format with clinical OD/OS details and payment balances, and deep link generator for `https://wa.me/`.
  - `src/app/receipt/[id]/page.tsx` & `src/actions/receipt-actions.ts`: Mobile-first responsive digital tax receipt route with store branding, patient refraction table, dual GST rates, PDF/print trigger, and WhatsApp sharing.
  - POS Completed Order Modal integrated with one-click WhatsApp receipt dispatch and digital receipt deep link.
- [x] **Phase 16: Hardware Barcode Scanner & Cart Auto-Add**:
  - `src/hooks/use-barcode-scanner.ts`: Global keystroke listener capturing `<50ms` burst input ending in `Enter` from physical USB/Bluetooth HID scanners across the POS viewport.
  - `src/actions/inventory-actions.ts`: Server action `searchBarcodeItemAction` resolving scanned SKU/barcodes and auto-dispatching items into the Zustand POS cart.
- [x] **Phase 18: Optical Lab Workshop Kanban & Customer Ready Alerts**:
  - `src/components/admin/lab-orders-view.tsx`: 4-column optical workshop Kanban (`Action Required`, `At Lab / In Fitting`, `Ready for Pickup`, `Completed`) with dynamic status drag-and-drop/dropdown progression.
  - Integrated one-click WhatsApp pickup ready alert triggering pre-formatted notification with patient name, invoice ID, and store contact info.
- [x] **Phase 19: Clean Google OAuth 2.0, Tenancy Hierarchy & Complete Demo Purge**:
  - `src/app/auth/login/page.tsx`: Purged "Demo Instant Quick-Fill" helper block and seed handlers. Standardized Google OAuth ("Continue with Google") as primary authentication alongside credentials.
  - `src/actions/tenant-actions.ts`: Completely eradicated `mockStaffStore` and hardcoded staff (`Priya Sharma`, `Vikram Patel`, `Ananya Iyer`). Eradicated fake branch auto-creation (`Indiranagar Flagship`). Hooked staff listing and additions 100% to Postgres `memberTable` and `userTable` with automatic auth organization synchronization.
  - `src/app/onboarding/page.tsx` & `setupPracticeOnboardingAction`: Lightweight 1-step onboarding route for newly registered Google/Gmail accounts to provision their real optical practice, main branch counter, and admin ownership with zero demo clutter.
  - `src/app/page.tsx`: Decoupled `/playground` from public header navigation and hero CTA buttons.
  - `src/db/clean.ts` & `package.json`: Added `npm run db:clean` script to purge test customers, prescriptions, invoices, and flush Redis cache for pristine production environments.
  - `src/lib/validators/prescription.ts`: Extended `branchId` schema validator with hex UUID regex pattern compliant with Zod 4.
  - Automated Quality Gates: `npm run check` (0 errors), `npm run test:pos` (12/12 passed), `e2e/tenant-roles.spec.ts` (9/9 passed).
- [x] **Phase 20: Gmail SMTP Mail Server & Transactional Email Engine**:
  - `src/db/schema.ts`: Extended `storeProfile` schema with `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPass`, `smtpFromEmail`, and `smtpFromName`. Executed migration into Neon Postgres.
  - `src/lib/email.ts`: Built multi-tier SMTP email engine using `nodemailer`, supporting `smtp.gmail.com` on Port 587 (STARTTLS/TLS) and Port 465 (SSL) with 16-character Google App Passwords. Includes fallback cascade (Store DB -> Env vars -> Defaults), connection verification, diagnostic test email dispatch, and full optical tax receipt email generator (complete with OD/OS refraction table, GST breakdown, and digital invoice deep link).
  - `src/actions/email-actions.ts`: Server actions for `getSmtpSettingsAction`, `saveSmtpSettingsAction`, `testSmtpConnectionAction`, and `sendReceiptEmailAction`.
  - `src/components/admin/settings-view.tsx`: Added dedicated "Email & SMTP" configuration tab with live diagnostic verification test, Google App Password step-by-step setup guide, and masked password storage.
  - `src/app/super-admin/settings/page.tsx`: Displayed Gmail SMTP gateway status and parameters in the Infrastructure Stack and Transactional Email cards.
  - `src/app/receipt/[id]/page.tsx`: Added "Email" receipt modal dialog allowing instant dispatch of optical invoices to customer email.
  - `src/components/pos/pos-view.tsx`: Updated POS completed order modal with one-click "Email" receipt dispatch directly from the counter terminal.
- [x] **Phase 21: Advanced Auth, 2FA (TOTP + Email OTP), Forgot Password, Hybrid Google/Password Lifecycle, Security Notifications & Super Admin Isolation**:
  - `src/db/schema.ts`: Extended `user` table with `role` (`'super_admin' | 'user'`), `twoFactorEnabled`, and `twoFactorMethod`. Created `twoFactor` table for encrypted secrets, backup recovery codes, and lockout counters. Executed zero-downtime DDL migration into Neon Postgres.
  - `src/lib/auth.ts` & `src/lib/auth-client.ts`: Configured Better Auth `twoFactor`, `admin`, and `sendResetPassword` plugins. Wired client `twoFactorClient` with `onTwoFactorRedirect` and `adminClient`.
  - `src/lib/email.ts`: Built queue-ready non-blocking asynchronous email runner (`dispatchAsyncEmail`) and complete suite of responsive transactional security emails: Welcome Email, Login Security Alert (with IP, device, timestamp), Password Reset Token Link (15-min expiry), Password Changed / Established Confirmation, 2FA Status Notification, and 6-digit Email OTP Verification.
  - `src/app/super-admin/login/page.tsx` & `src/middleware.ts`: Created dedicated platform root login gateway with dark root visual tokens (`Platform Governance / ROOT`). Enforced strict middleware and layout role guards blocking non-super-admins from `/super-admin/*` with 403 Forbidden redirects.
  - `src/app/auth/forgot-password/page.tsx` & `src/app/auth/reset-password/page.tsx`: Built self-service password recovery flow with Gmail SMTP link dispatch, real-time password strength meter, token validation, and credential updates.
  - `src/app/auth/2fa/page.tsx`: Built multi-factor login challenge page supporting Google Authenticator / Authy TOTP 6-digit codes, dynamic Email OTP dispatch via Gmail SMTP, and 10 single-use emergency backup recovery codes.
  - `src/actions/account-actions.ts` & `src/components/admin/settings-view.tsx`: Created dedicated "Account & Security" settings tab. Built "Set Account Password" for Google OAuth users (enabling dual Google / Email+Password login), "Change Password", 2FA configuration with live QR code generation (via `qrcode`), backup codes management, and "Danger Zone: Permanent Account Deletion" modal with password/phrase confirmation.
  - **Authenticator App (TOTP) Setup Fixes & Enhanced UX**:
    - **Password Validation & Recovery**: Fixed stale record collisions (`TOTP_ALREADY_ENABLED`) during password retry. Proactively clears unverified or stale records on disabled accounts via `resetTwoFactorAction()` and includes automatic retry recovery.
    - **PIN Cache & Keyboard Interactivity**: 6-digit input starts clean (no browser cache), prevents outer form submission hijacking, supports `Enter` key verification, and provides numeric paste handlers.
    - **Persistent Backup Codes Stage**: Re-architected 2FA mode hierarchy so that generated backup recovery codes stay mounted indefinitely and never disappear upon account status reload, remaining visible until the user explicitly clicks "I Have Saved My Codes (Done)".
    - **Backup Codes .txt Download**: Added one-click "Download Codes (.txt)" feature that generates a cleanly formatted text file (`optixos-backup-codes-<username>.txt`) containing practice security headers, account metadata, and recovery instructions.
  - Automated Quality Gates: `npm run check` (0 errors, 0 warnings), `npm run test:pos` (12/12 passed), `e2e/auth-security.spec.ts` (7/7 passed), `e2e/auth-flow.spec.ts` (4/4 passed).
- [x] **Phase 22: SaaS Super Admin Security Architecture, Clean Slate Purge & Sliding Inactivity Timeout**:
  - `src/db/clean.ts` & `package.json`: Upgraded `cleanDatabase()` to execute complete reverse FK wipe across all domain tables (`payments`, `invoiceItems`, `invoices`, `prescriptions`, `inventoryItems`, `customers`, `storeProfile`, `branches`, `organizations`) and Better Auth tables (`twoFactor`, `session`, `account`, `verification`, `invitation`, `member`, `organization`, `user`), flushing Upstash Redis search cache to provide a 100% clean production slate.
  - `.env.local` & `.env.example`: Set server-level `SUPER_ADMIN_EMAILS="msanthosh9943@gmail.com"`, extensible with comma-separated entries for future platform admins.
  - `src/actions/tenant-actions.ts`: Upgraded `verifySuperAdminAccessAction` with Dual-Key enforcement (Server Allowlist + DB role). Built auto-elevation for allowlisted emails, instant role demotion for unlisted users, and `revokeSuperAdminAccessAction(targetUserId)` with immediate Better Auth session table deletion.
  - `src/hooks/use-idle-timeout.ts`: Built sliding session activity watcher with configurable idle threshold (15 minutes), activity listeners (`mousedown`, `mousemove`, `keydown`, `scroll`, `touchstart`), 60-second warning state, and auto-logout redirect to `/super-admin/login?reason=idle_timeout`.
  - `src/app/super-admin/layout.tsx`: Integrated `useIdleTimeout` with dark root warning modal displaying live seconds countdown (`secondsRemaining`), "Sign Out Now" trigger, and "Stay Signed In" session extender.
  - `personal/super-admin-security-architecture.md`: Authored confidential engineering reference analyzing root bootstrap models, instant revocation mechanics, sliding timeout vs hard cutoffs, and industry comparison matrix (AWS, Stripe, Vercel vs OptixOS). Configured `.gitignore` to strictly isolate `personal/`.
  - Automated Quality Gates: `npm run check` (0 errors, 0 warnings), `e2e/auth-security.spec.ts` (8/8 passed).
- [x] **Phase 23: 3-Tier Multi-Tenant RBAC, Maker-Checker Privileged Approvals & Multi-Role Staff Architecture**:
  - `src/db/schema.ts` & `src/db/migrate-approvals.ts`: Declared and migrated `approval_requests` table to Neon Serverless Postgres supporting privileged operation types (`delete_organization`, `delete_branch`, `purge_data`, `system_config`), with request metadata, requester tracking, and status audit trails (`pending`, `approved`, `rejected`).
  - `src/actions/tenant-actions.ts`:
    - Extended `verifySuperAdminAccessAction()` to support 3-tier platform privilege hierarchy: `super_admin` (Root sovereign), `super_moderator` (Platform routine + Maker-Checker approvals), and `super_viewer` (Read-only auditor).
    - Privileged Approvals Engine: `createApprovalRequestAction()`, `getApprovalRequestsAction()`, and `resolveApprovalRequestAction()` with atomic execution of requested operations upon approval.
    - Protected `deleteOrganizationAction()`: Direct immediate deletion for `super_admin`, approval request requirement for `super_moderator`, 403 Forbidden for `super_viewer`.
    - Governance Team Management: `getPlatformTeamAction()` and `assignPlatformRoleAction()` to delegate and manage platform roles.
    - Multi-Role Staff Engine: Serialized multiple operational roles (`'admin' | 'optometrist' | 'staff'`) in Better Auth's `memberTable.role` using comma separation, providing full backward compatibility. Added `createStaffMemberAction`, `updateStaffMemberRolesAction`, and `deleteStaffMemberAction`.
  - `src/app/super-admin/layout.tsx`: Updated with live role badges (`ROOT`, `MODERATOR`, `VIEWER`), sidebar link for "Privileged Approvals" with real-time pending request count badge, and dynamic user profile card.
  - `src/app/super-admin/approvals/page.tsx`: Built Maker-Checker Privileged Approvals console with status filtering (Pending, All, Approved, Rejected), operation details with moderator justifications, and "Approve & Execute" / "Reject" controls for Root Super Admin.
  - `src/app/super-admin/organizations/page.tsx`: Integrated role-aware practice deletion with instant execution dialog for Root Super Admin, Maker-Checker justification request modal for Platform Moderator, and read-only locks for Platform Viewer.
  - `src/app/super-admin/settings/page.tsx`: Added "Platform Governance Team & Role Delegation" section with 3-tier hierarchy cards, team directory table, and role assignment/revocation modal.
  - `src/app/(dashboard)/admin/staff/page.tsx`: Upgraded store staff management with interactive multi-role selection cards, directory badge rendering for all assigned roles, and an "Edit Roles" modal.
  - `src/db/seed.ts`: Hardened seed script to guarantee default organization and branch upsert with Redis cache flush, ensuring tests pass out of the box.
  - Automated Quality Gates: `npm run check` (0 errors, 0 warnings), `npm run test:pos` (12/12 passed, 100%), `e2e/auth-security.spec.ts` (8/8 passed, 100%).
- [x] **Phase 25: Razorpay SaaS Subscription & Payment System (`specs/025-razorpay-saas-subscription/`)**:
  - `src/db/schema.ts` & `scripts/migrate-subscriptions.ts`: Migrated `organizations` with `planId`, `subscriptionStatus`, `subscriptionPeriod`, `subscriptionEndsAt`, and `hasCompletedOnboarding`. Created `subscriptions` financial audit ledger table with Razorpay order, payment, and signature indexes.
  - `src/lib/razorpay.ts`: Razorpay Orders API, Payment Links API, and timing-safe cryptographic HMAC-SHA256 signature verification. Exact paise math via `decimal.js`.
  - `src/lib/feature-gate.ts`: Plan entitlements engine defining domain limits for Starter, Growth Plus, and Enterprise Pro.
  - `src/actions/subscription-actions.ts`: `createRazorpaySubscriptionOrderAction`, `verifyRazorpayPaymentAction`, `handlePaymentFailureAction`, `completeOnboardingAction`, and `checkOrganizationFeatureAccessAction`.
  - `src/hooks/use-razorpay-checkout.ts`: Custom React hook managing dynamic loading of `checkout.js`, modal popup lifecycle, and error recovery.
  - `src/app/pricing/page.tsx`: Upgraded pricing matrix with monthly/annual toggle, direct free tier activation, and live Razorpay checkout.
  - `src/components/subscription/subscriber-onboarding-modal.tsx`: Lovable 4-step guided walkthrough demo with skip option.
  - `src/components/subscription/plan-upgrade-modal.tsx` & `plan-upgrade-gate.tsx`: Reusable feature gating components with 1-click Razorpay upgrade prompt.
  - `src/app/api/webhooks/razorpay/route.ts`: Webhook handler with raw HMAC-SHA256 verification for eventual consistency on `payment.captured`, `order.paid`, `payment.failed`.
  - Quality Gates: `npm run check` (0 errors, 0 warnings), `npm run audit:security` (0 critical violations), `e2e/saas-subscription-razorpay.spec.ts` (3/3 passed), `npm run test:pos` (12/12 passed, 100%).
- [x] **Phase 26: Priority Notes (Temp Notes) Floating Drawer / Widget (`specs/026-priority-temp-notes/`)**:
  - `src/store/priority-notes-store.ts`: Persistent Zustand store with `localStorage` key `'priority_notes_cache'`, handling `PriorityNote`, `PriorityTier` (High, Medium, Low), task completion toggles, batch edit snapshots, soft deletes, and pinned layout mode.
  - `src/components/priority-notes/priority-notes-trigger.tsx`: Topbar icon trigger with sticky note icon, active uncompleted count badge, and pulsing red indicator for urgent High-Priority notes.
  - `src/components/priority-notes/priority-note-card.tsx`: Individual note card supporting normal mode, circular completion checkbox with strikethrough styling, hover actions (edit/trash), inline editing, and batch edit mode with drag handles.
  - `src/components/priority-notes/priority-notes-drawer.tsx`: Slide-over drawer with pinned rotation toggle, quick add card (High/Med/Low pills), grouped priority lists with HTML5 drag-and-drop reprioritization, tip banner for clearing completed tasks, and collapsible soft-delete Trash bin with restore and empty actions.
  - `src/app/(dashboard)/layout.tsx`: Mounted trigger in topbar header and drawer in dashboard layout with responsive margin shift (`mr-[340px] sm:mr-[360px]`) during pinned mode.
  - Quality Gates: `npm run check` (0 errors, 0 warnings), `npm run audit:design` (0 violations), `npm run audit:security` (0 critical violations), `e2e/priority-notes.spec.ts` (6/6 passed), `npm run test:pos` (12/12 passed, 100%).

### Phase 26: Single-Store Operational Architecture & Consolidated Practice Reports Hub
- [x] **Playground & Legacy Simulator Deletion**: Completely removed `src/app/playground/` and `src/app/super-admin/simulator/`, removed simulator links from `src/app/super-admin/layout.tsx`, and updated `src/components/layout/simulation-banner.tsx`.
- [x] **Tenant Store Refactoring**: Eliminated multi-store `'all'` selection mode and `toggleBranchSelection`. Enforced strict single-store isolation (`selectedBranchId: string`, `selectedBranchIds: [selectedBranchId]`).
- [x] **Operational Views Scoping**:
  - Bound POS billing counter select directly to `setSelectedBranch` and `selectedBranchId`.
  - Scoped Inventory table, forms, and SWR cache key to `selectedBranchId`.
  - Scoped Patients directory, search API, and SWR cache key to `selectedBranchId`.
  - Scoped Lab Orders kanban board and SWR cache key to `selectedBranchId`.
  - Scoped Staff management list and SWR cache key to `selectedBranchId`.
  - Scoped Priority Notes drawer strictly to the active store; removed merged-branch grouping logic and store scope bar.
- [x] **Consolidated Practice Reports Hub**:
  - Enhanced `src/actions/report-actions.ts`: Added `StorePerformanceMetric`, `storeBreakdown` to `DailyFinancialsReport`, and `branchScope` filter (`'all'` vs store ID).
  - Enhanced `src/components/admin/reports-view.tsx`: Added Store Scope filter dropdown and Multi-Store Breakdown section with store cards, gross revenue, share progress bar, order count, and balance due.
- [x] **Quality Gate & Testing**: `npm run check` (0 errors), `npm run audit:security` (0 critical), `npm run audit:design` (0 violations), `npm run test:pos` (12/12 passed), `e2e/multi-branch-relations.spec.ts` & `e2e/tenant-roles.spec.ts` (13/13 passed).
- [x] **Knowledge Graph**: Refreshed via `graphify update .` to 1134 nodes, 2409 edges, 76 communities.

### Phase 27: Flexible Notification & Alerting Subsystem Architecture
- [x] **Database Schema & Neon Migration**: Declared `notifications`, `notification_reads`, and `notification_preferences` in `src/db/schema.ts` and executed live migration via `src/db/migrate-notifications.ts`.
- [x] **Modular Event Registry**: Implemented `src/lib/notifications/types.ts` and `src/lib/notifications/event-registry.ts` with typed payload maps (`system.*`, `alert.*`, `reminder.*`), severity levels, and extensible event definitions.
- [x] **Notification Server Actions**: Implemented `src/actions/notification-actions.ts` with user-correlated read tracking, unread count queries, mark-read mutations, event dispatching with deduplication, and initial demo seeder.
- [x] **Header UI & Popover Center**:
  - `NotificationBellTrigger`: Topbar bell icon with unread count badge (`99+` cap), urgent ping indicator, and hydration-safe mounting between `PriorityNotesTrigger` and `ThemeToggle`.
  - `NotificationPopover`: Anchored dropdown & mobile drawer with filter tabs (`All`, `Unread`, `Alerts`, `Reminders`), "Mark all as read" button, empty state, and direct action deep links.
  - `NotificationItemCard`: Rich notification cards with semantic category icons, severity badges, relative time, and action links.
- [x] **Domain Event Triggers**: Low stock alert dispatch wired into `updateInventoryItem` in `src/actions/inventory-actions.ts`.

### Phase 28: Compact Operational Dashboard & Role-Based Customer Routing
- [x] **Multi-Store State Auto-Loading & Fallback**: Extended `src/store/tenant-store.ts` with `localStorage` persistence (`optix-last-active-branch`) ensuring users auto-load their active store, with fallback to primary branch if no prior session exists.
- [x] **Customer Portal Architecture (`/portal`)**:
  - `src/actions/customer-portal-actions.ts`: `getCustomerPortalDataAction` fetching patient account details, active optical orders, and refraction/Rx diopter history.
  - `src/app/portal/layout.tsx`: Patient portal layout with customer badge and secure sign-out.
  - `src/app/portal/page.tsx`: Compact customer dashboard with verified account hero, order progress tracker, digital invoice links, and OD/OS refraction table.
- [x] **Compact High-Density Operational Dashboard (`/admin/dashboard`)**:
  - `src/actions/dashboard-actions.ts`: `getDashboardOperationalMetricsAction` with 30s Redis cache, today's revenue & trend % via `decimal.js`, invoice count, balance due, active lab orders, low-stock alerts, and tender breakdown.
  - `src/components/admin/dashboard-view.tsx`: High-density operational cockpit with 15s SWR live telemetry, quick-action launch buttons (`F1` Bill, `F3` Stock, Patients, Lab Kanban), 4 KPI cards, live orders feed, workshop SLA status, payment splits, and low stock warnings.
  - `src/app/(dashboard)/admin/dashboard/page.tsx`: Mounted operational dashboard page.
- [x] **Navigation & Middleware Routing**:
  - Added Executive Dashboard link to persistent sidebar navigation in `src/app/(dashboard)/layout.tsx` and topbar route breadcrumb.
  - Updated `src/middleware.ts` protecting `/portal` and routing authenticated auth routes to `/admin/dashboard`.
  - Updated `src/app/auth/login/page.tsx` default `callbackUrl` to `/admin/dashboard`.
- [x] **Automated Testing & Quality Gates**:
  - `e2e/dashboard-routing.spec.ts`: 4/4 passed (100% green).
  - `npm run check`: 0 errors, 0 warnings.
  - `npm run audit:design`: 0 violations across 74 components.
  - `npm run audit:security`: 0 critical violations.
  - `npm run test:pos`: 12/12 passed (100% green).
  - `graphify update .`: Refreshed to 1,204 nodes, 2,615 edges, 69 communities.

### Phase 29: Comprehensive POS Refactor, Dynamic Product Categorization, Invoice Editing & RBAC Hardening
- [x] **POS Billing & Patient Selection Workflows**:
  - Recent patient suggestions on click/focus in patient search.
  - Instant family member unlinking chip `(×)` in compact patient strip.
  - Removed redundant POS layout tab from store settings.
  - Cart Rx Inspector modal for inline diopter examination & power switching directly within billing cart.
  - Frame pairing badges (`🔗 Paired`, `👓 Own Frame`, `⚠️ Unpaired Lens`) with in-cart candidate frame linking dropdown.
- [x] **Dynamic Product Categorization & Sequential Workflow Builder**:
  - `productTypes` table and migration in Neon PostgreSQL with custom categories and step definitions.
  - Server Actions and Admin Settings builder UI for product types and step configurations.
  - AddProductModal dispatcher dynamically executing sequential step wizards with parent-child option dependencies.
- [x] **Invoice & Tax Customization & Post-Order Editing**:
  - `enableGstInvoicing` global toggle in store profile and checkout engine.
  - `EditInvoiceModal` with live `decimal.js` recalculation of taxable values, CGST, SGST, grand total, and balance due.
  - Mounted edit triggers in reports view and POS view.
- [x] **Inventory SKU Streamlining & Configurable Negative Stock**:
  - Compact single identifier input (SKU/barcode/name) with collapsible advanced attributes.
  - Dynamic custom categories (`customCategory`) and GST vs Tax Exempt toggle.
  - `allowNegativeStock` database and logic default fixed to `false` (preserving atomic inventory locking by default).
- [x] **Lab Orders Kanban Ergonomics**:
  - Filter chips: All, Overdue Only, Balance Due Only.
  - Per-column sorting: Promised Delivery Date, Order Date, Customer Name, Balance Due (asc/desc).
  - High-density compact cards (~100-110px) fitting 4-5 cards above the fold.
- [x] **Patients Table Phone Hover-Copy**:
  - Hover-copy button on patient phone numbers with clipboard write and toast confirmation.
- [x] **RBAC Hardening, Deletions Approval & Returns/Store Credit**:
  - Customer and inventory deletions restricted to Admins/Managers.
  - Non-admin staff deletion Maker-Checker approval workflow with `approval.requested` in-app notifications.
  - Customer deletion safety check blocking deletion if customer has active unclosed orders or unpaid balance.
  - Return and refund modal with inventory restocking, customer store credit (`advanceBalance` wallet), and `CREDIT` checkout payment debit.
- [x] **Composite Quality Gate & AST Knowledge Graph Verification**:
  - `npm run check`: PASS (0 errors, 0 warnings).
  - `npm run audit:security`: PASS (0 critical violations).
  - `npm run audit:design`: PASS (0 critical violations across 77 components).
  - `npm run test:pos`: PASS (12/12 tests green).
  - `e2e/lab-orders.spec.ts` & `e2e/reports-ledger.spec.ts`: PASS (2/2 tests green).
  - `e2e/patient-inventory-crud.spec.ts`: PASS (3/3 tests green).
  - `graphify update .`: Synced (1,253 nodes, 2,803 edges, 82 communities).
  - In-project memory ledger synced (`BUG_FIX_LOG.md` BUG-021/BUG-022, `SESSION_HANDOFF.md`, `MEMORY.md`).
- [x] **Phase 27: Multi-Tenant Data Isolation, 3-Tier User Hierarchy & Dedicated Staff Portal**:
  - `src/db/schema.ts` & `src/db/migrate-multi-tenant-staff.ts`: Added `orgCode` (`OPT-X`), sequential `orgNumber` (`X`) to `organizations`, `mustChangePassword` to `user`, and `staffStoreAssignments` table for multi-store staff assignment. Migrated Postgres DB and backfilled `OPT-1` / `1`.
  - `src/lib/auth-utils.ts`: Rewrote `getCurrentSession()` so authenticated users without membership return `hasOrganization: false` and `organizationId: ''` instead of falling back to seeded `DEFAULT_ORG_ID`. Added `isOwnerOrSuperAdmin` helper for sensitive SaaS controls.
  - `src/actions/tenant-actions.ts`: Updated `getUserTenancyContext()` to strictly scope organizations and branches. Updated `setupPracticeOnboardingAction` to generate next sequential `orgCode` (`OPT-X`) and `orgNumber`, set `hasCompletedOnboarding: true`, and create initial `staffStoreAssignments` entry.
  - `src/store/tenant-store.ts`: Fixed `setTenancyData` to adopt `data.selectedOrganizationId` without clinging to `state.selectedOrganizationId`.
  - `src/app/auth/login/page.tsx`: Redirects new signups to `/onboarding` instead of `/admin/dashboard`. Added clean Staff Portal access link below the form (`data-testid="link-staff-portal"`).
  - `src/app/onboarding/page.tsx`: Displays assigned Store ID (`OPT-X`) upon completion.
  - `src/actions/staff-auth-actions.ts` & `src/app/auth/staff-login/page.tsx`: Dedicated Staff Portal with Practice/Store ID (`OPT-X` or `X`), Staff Email, and Password. Includes preflight verification, forced first-time password reset modal, and back link to owner login.
  - `src/app/(dashboard)/admin/staff/page.tsx`: Multi-store assignment checkboxes, counter initial password input, first login password reset toggle, store access badges, and Maker-Checker staff deletion for Store Managers.
  - `src/components/layout/branch-switcher.tsx`: Enabled branch switching whenever `branches.length > 1` (allowing multi-store staff/managers to switch between their assigned stores, while keeping single-store staff locked). Redacted consolidated reports link for staff.
  - `src/app/(dashboard)/layout.tsx`: Redacted "Plans & Upgrade", SaaS plan badge, and `SubscriberOnboardingModal` for non-owner staff roles.
  - `src/app/pricing/page.tsx`: Added client-side role guard redirecting store staff/managers to `/admin/dashboard`.
  - `src/actions/plan-actions.ts`: Enforced `isOwnerOrSuperAdmin` check in `updateOrganizationPlanAction`.
  - `e2e/multi-tenant-staff-portal.spec.ts`: Playwright E2E suite with 5/5 tests passing (100% green).

- [x] **Phase 32: Dedicated Organization Owner Portal (`/owner`), Sovereign Practice Governance & Staff Isolation**:
  - `src/actions/tenant-actions.ts`: Filtered out `owner` role in `getStaffMembersAction` so organization owners never appear in staff employee tables; added security guards rejecting role modification or deletion of owners.
  - Implemented sovereign branch management: `deleteBranchAction` allows practice owners to directly delete branches (1-branch minimum invariant, staff cleanup, cache invalidation) with 0 Super Admin approval required.
  - Realigned approvals architecture: Only organization deletion (`delete_organization`) requires SaaS Super Admin approval via `requestOrganizationDeletionAction`. Updated `resolveStoreApprovalRequestAction` so practice owners handle internal maker-checker requests (e.g. `delete_staff`).
  - Created dedicated Organization Owner Portal (`src/app/owner/*`) with executive sidebar, topbar with Practice ID badge, and "Launch Store POS Counter" modal with branch selector.
  - Built subpages: `/owner` (Executive Cockpit), `/owner/branches` (Branch Management), `/owner/staff` (Multi-Store Staff), `/owner/reports` (Consolidated Analytics), `/owner/approvals` (Maker-Checker Queue), `/owner/settings` (Practice Settings & Danger Zone).
  - Decoupled store POS layout: Replaced "Manage Branches" and "Plans" with "Owner Portal (HQ)" for owners; added direct link in user-nav dropdown; protected `/owner/*` in `src/middleware.ts`.
  - Locked store staff strictly to their single active store in `/admin/reports` and blocked non-owners from the Owner Portal.
  - Composite Quality Gate: `npm run check` (0 errors), `npm run audit:security` (0 critical), `npm run audit:design` (0 critical across 85 components), `graphify update .` synced (1,378 nodes, 3,180 edges).

- [x] **Phase 33: Staff First-Time Password Reset, Role Conflation Resolution, Self-Promotion Prevention & Staff Portal Gateway Enforcement**:
  - `src/actions/staff-auth-actions.ts`: Replaced `auth.api.setUserPassword` with `better-auth/crypto` `hashPassword` in `completeStaffInitialPasswordChangeAction`, resolving `FORBIDDEN: YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD` during first-time login without admin session.
  - `src/actions/tenant-actions.ts`: De-conflated role mapping in `getUserTenancyContext()` so ONLY `owner` receives `userRole = 'organizer'`, while `admin` strictly receives `userRole = 'admin'` (Store Manager), blocking store managers from `/owner/*`.
  - Added strict authorization and self-promotion guards in `updateStaffMemberRolesAction` (`isOwnerOrSuperAdmin(session)` and `session.user.id !== data.userId`).
  - `src/actions/staff-auth-actions.ts` & `src/app/auth/login/page.tsx`: Built `verifyOwnerLoginPreflightAction(email)` to intercept store staff trying to log into the Owner Portal (`/auth/login`), providing an amber guidance card and 1-click link to `/auth/staff-login?org=OPT-X&email=...`.
  - `src/app/auth/staff-login/page.tsx`: Wrapped in `<Suspense>`, auto-populates Practice ID and Email from URL query parameters.
  - `src/app/(dashboard)/admin/staff/page.tsx`: Hidden "Add Staff Member" and "Edit Roles" for non-owners, removed edit/delete actions on the logged-in user's own row, and added a `(You)` indicator.
  - Documented `[BUG-031]` in `docs/agent-memory/BUG_FIX_LOG.md`.
  - Quality Gate: `npm run check` (0 errors, 0 warnings), `npm run audit:security` (0 critical), `npm run audit:design` (0 critical across 85 components), `graphify update .` synced (1,383 nodes, 3,194 edges, 80 communities).

- [x] **Phase 34: Comprehensive Deep Security Hardening, Zero-Trust RBAC & Session Multi-Tenant Isolation**:
  - Built AES-256-GCM envelope encryption (`encryptSecret`, `decryptSecret`) and HMAC-SHA256 receipt token verification in `src/lib/crypto-utils.ts`.
  - Built resilient sliding-window rate limiter in `src/lib/ratelimit.ts` backed by Upstash Redis with in-memory fallback.
  - Added strict CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy in `next.config.mjs` and `src/middleware.ts`.
  - Hardened middleware bypass: restricted `x-e2e-bypass-auth` strictly to non-production, persisted cookie, and isolated `/super-admin` from any bypass.
  - Converted Super Admin session token hashing and verification to native Web Crypto API (`crypto.subtle`) for 100% Edge Runtime compatibility.
  - Fail-closed session context in `src/lib/auth-utils.ts`: eliminated silent fallback to `DEFAULT_ORG_ID`; exported `requireAuthSession()`, `requireManagerOrAdmin()`, and `requireOwnerOrSuperAdmin()`.
  - Backdoor elimination: removed `auth-seed-action.ts` and sanitized `callbackUrl` in login against open redirects.
  - Credential security: encrypted SMTP passwords at rest, decrypted on the fly in `email.ts`, redacted `smtpPass` in `getStoreProfile()`.
  - Subscription & billing hardening: enforced `requireOwnerOrSuperAdmin` on Razorpay subscription order creation and verification in `subscription-actions.ts`.
  - Invoices & refunds: enforced `requireManagerOrAdmin` on edits and returns; bounded refunds strictly to advance paid in `invoice-edit-actions.ts` and `return-refund-actions.ts`.
  - Inventory & catalog: enforced `requireManagerOrAdmin` on items and product types; masked wholesale `costPrice` on barcode scans.
  - Maker-checker anti-tampering: blocked self-approval (`request.requesterId === session.user.id`) in `approval-actions.ts`; restricted `delete_staff` execution to owners.
  - Multi-tenant scoping & API protection: blocked unauthenticated requests with 401 on `/api/patients/search` and `/api/inventory/search`; removed global fallback in `/portal`.
  - Public receipt protection: enforced HMAC receipt token verification on `/receipt/[id]`.
  - Restored strict Invariant #5 (`allowNegativeStock = false`) in `process-optical-order.ts` and store profiles.
  - Applied rate limiting on checkout mutations and account password updates.
  - Full Quality Gate: `npm run check` (0 errors), `npm run audit:security` (0 critical), `npm run audit:design` (0 critical across 85 components), `npm run test:pos` (12/12 passed), `e2e/auth-security.spec.ts` (8/8 passed), `e2e/security-penetration-audit.spec.ts` (6/6 passed), `graphify update .` synced (1,409 nodes, 3,289 edges, 80 communities).

### Phase 35: Automatic Default Product Types Seeding on Branch Creation & Old Add Product Screen Elimination
- [x] **Eliminate Old Modal Screen Fallback**: Completely removed the hardcoded static `CATEGORIES` fallback ("Core Optical Dispensing Categories") and duplicate "Special Dispensing Presets" block from `src/components/pos/add-product-modal.tsx`.
- [x] **Default Product Types Engine**: Implemented `getDefaultProductTypesConfig()` and `seedDefaultProductTypesForOrganization(organizationId)` in `src/lib/default-product-types.ts` defining all 6 optical product types (`LENS`, `FRAME`, `BLUE_CUT`, `SUNGLASS`, `CONTACT_LENS`, `LENS_ONLY`) with sequential workflow steps, options, and icons.
- [x] **Automated Seeding on Branch & Organization Creation**: Wired automatic seeding into `createBranchAction`, `setupPracticeOnboardingAction`, `createOrganizationAction` (`src/actions/tenant-actions.ts`), and `src/db/seed.ts`.
- [x] **On-the-Fly Dynamic Fallback Seeding**: Added self-healing auto-seeding to `getProductTypesAction` and `getEnabledProductTypesAction` in `src/actions/product-type-actions.ts` if organization has zero rows.
- [x] **Full Quality Gate Validation**: Passed `npm run check` (0 errors, 0 warnings), `npm run audit:security` (0 critical), `npm run audit:design` (0 violations), `npm run test:pos` (12/12 green), and `graphify update .` (5,016 nodes, 8,339 edges synced).

### Phase 36: Recommended Optical Category Suite & Authoritative 4-Step Spectacle Lens Workflow
- [x] **Recommended Optical Category Architecture**: Implemented full default category suite (`FRAME`, `LENS`, `SUNGLASS`, `CONTACT_LENS`, `ACCESSORY`, `SERVICE`, `BLUE_CUT`, `LENS_ONLY`) in `src/lib/default-product-types.ts`.
- [x] **Authoritative 4-Step Spectacle Lens Sequential Flow**:
  - Step 1: Select Focus Type (Single Vision, Bifocal, Progressive PAL).
  - Step 2: Select Inner Type / Design (conditioned on Step 1: Plano/Spherical/Aspheric vs. Kryptok/D-Bifocal/Executive vs. Standard/Digital Freeform/Wider Corridor/Office PAL).
  - Step 3: Select Material & Index (1.50 Plastic, 1.56 Mid-Index, 1.67 Hi-Index, Polycarbonate/Trivex).
  - Step 4: Select Coating & Treatments (Hard Coat, ARC Anti-glare, Blue Light Cut, Photochromic Transition).
- [x] **Dynamic Step Filtering & Selection Reset**: Extended `WorkflowStepOption` with `showIfParent` and wired automatic cleanup of downstream selections when an earlier single-select choice changes.
- [x] **Neon PostgreSQL Production Migration**: Synchronized all active organizations (`OPT-1`, `OPT-2`, `Santhosh Optical Center`) in Neon PostgreSQL with 24 active category workflows.
- [x] **Composite Quality Gate**: `npm run check` (0 errors), `npm run audit:security` (0 critical), `npm run audit:design` (0 violations), `npm run test:pos` (12/12 passed, 100% green), `graphify update .` (5,019 nodes, 8,342 edges synced).

### Phase 37: POS Quick Settings & Categorized Grouped Settings Navigation Sidebar
- [x] **Centralized Settings Registry Architecture (`src/lib/settings-registry.ts`)**: Built authoritative registry grouping 15 configuration items into 6 clean functional categories (Store & Practice, Catalog & Dispensing, Profile & Security, Team & Permissions, Communications & Alerts, Subscription & System). Designed for continuous extensibility.
- [x] **Categorized Settings Sidebar (`src/components/layout/settings-sidebar.tsx`)**: Replaces standard operations sidebar with a grouped settings sidebar whenever navigating to `/admin/settings`. Includes "← POS Billing [F1]" top button and practice ID copy widget.
- [x] **Dirty Form Protection & Navigation Interception**: Built custom event interceptor `optixos:settings-nav-intercept` ensuring unsaved edits on General Profile or SMTP triggers the Unsaved Changes modal before switching tabs.
- [x] **POS Screen Header Integration (`src/components/pos/pos-view.tsx`)**: Added `btn-pos-settings` in the top right POS billing header.
- [x] **Enhanced Settings View with Zero-Latency Tab Sync (`src/components/admin/settings-view.tsx`)**: Synchronized active tabs with `useSearchParams()` (`tab` parameter) for deep-linking. Added POS Counter Layout picker (`pos-layout-adaptive-card`, `pos-layout-dense-card`, `pos-layout-split-card`), System Engine & Cache Purge tab, and Notifications tab.
- [x] **Comprehensive E2E Coverage**: Created `e2e/pos-settings-sidebar.spec.ts` (100% pass) and verified `e2e/settings-autosave-navigation.spec.ts`, `e2e/settings-print.spec.ts`, `e2e/auth-security.spec.ts`, and core POS tests (`npm run test:pos`). All 100% green.
- [x] **Graphify Sync**: AST knowledge graph refreshed to 5,037 nodes and 8,365 edges.

### Phase 38: Settings UI/UX Refactor, Streamlining & Compact Redesign
- [x] **Settings Taxonomy Consolidation (`src/lib/settings-registry.ts`)**: Eliminated redundant menus pointing to duplicate tabs (`tab=general`, `tab=account`) and out-of-scope external destinations (`/admin/branches`, `/admin/staff`, `/owner/approvals`, `/pricing`). Streamlined to 7 non-redundant configuration panels across 5 logical categories (Store & Practice, Catalog & Dispensing, Profile & Security, Communications & Alerts, Subscription & System).
- [x] **Compact Sidebar & Design Parity (`src/components/layout/settings-sidebar.tsx`)**: Refactored aside width to exact `w-56` (matching operations sidebar, eliminating layout shift). Aligned navigation items with standard `px-3 py-2 text-xs font-semibold`, inline `h-4 w-4` icons (no bulky icon cards), subtle badges, clean category headings, and standard keyboard shortcuts footer (`F1 Bill`, `F3 Stock`, `F10 Pay`, `F5 Print`).
- [x] **Settings Breadcrumb Alignment (`src/components/admin/settings-view.tsx`)**: Synchronized active section breadcrumb with the 5 streamlined categories and 7 non-redundant tabs.
- [x] **Full Quality Gate Verification**: `npm run check` (0 errors, 0 warnings), `npm run audit:design` (0 violations), `npm run audit:security` (0 critical), `e2e/pos-settings-sidebar.spec.ts` (100% pass), `e2e/settings-autosave-navigation.spec.ts` (100% pass), `e2e/settings-print.spec.ts` (100% pass), `e2e/auth-security.spec.ts` (8/8 pass), and core POS tests `npm run test:pos` (12/12 pass).
- [x] **Knowledge Graph Sync**: Refreshed AST knowledge graph to 5,039 nodes and 8,367 edges across 431 communities.

---

## 3. Future Roadmap (Phase 17)

### Phase 17: Indian GST E-Invoicing & E-Way Bill Integration
- [ ] **NIC E-Invoicing API Client**: Generation of Invoice Reference Number (IRN) and signed QR code for B2B optical transactions exceeding statutory turnover thresholds (`specs/024-gst-e-invoicing/`).
- [ ] **Automated GSTR-1 JSON Export**: One-click monthly tax ledger export matching the GST portal schema.

### Active Security Debt & Hardening Backlog (from `SECURITY_LOG.md`)
- [x] **[SEC-002] Redact & Encrypt `smtpPass`**: Redacted `smtpPass` from `getStoreProfile()` client responses and implemented AES-256-GCM envelope encryption at rest (`src/actions/settings-actions.ts`). (Resolved in Phase 34 / BUG-032)
- [x] **[SEC-003] Enforce Upstash Redis Rate-Limiting**: Added Upstash Redis sliding window guards on checkout mutations and account changes (`src/lib/ratelimit.ts`). (Resolved in Phase 34 / BUG-032)
- [ ] **[SEC-004] Scope `storeProfile` to `organizationId`**: Add `organizationId` foreign key to `storeProfile` table for complete multi-tenant tenant isolation.

---

## 4. Definition of Done (DoD) Checklist

Every future task in OptixOS must satisfy this checklist before merging:
1. **Knowledge Graph First**: Architecture exploration completed via `graphify` (`query`, `explain`, `path`) without blind full-codebase scans.
2. **Official Documentation & Zero Guesswork**: When requirements or library APIs are not explicitly provided, authoritative documentation has been verified directly via MCP tools or live official vendor docs (`search_web`, `read_url_content`) with exact version parity.
3. **Quality Over Token Optimization ("Think & Verify Twice")**: Code is clean, resilient, and verified twice against existing schemas, invariants, and potential regressions before committing. No shortcuts taken to save tokens.
4. **Root Cause & Blast Radius**: Fundamental root cause diagnosed before touching code. Callers and dependencies mapped via `graphify explain`, with all vertical tiers updated atomically.
5. **Domain Integrity**: All monetary math uses `decimal.js`. All diopters adhere to 0.25 D steps. All stock deductions use atomic SQL conditions.
6. **Multi-Tenant Security**: Every database query scopes to `organization_id`. `cost_price` is omitted from non-manager queries.
7. **UI/UX Consistency**: Native dark mode supported. Spacing follows `p-4 md:p-6 gap-6`. Buttons have accessible names (`aria-label`).
8. **Graphifyable Code Standards**: All exported Server Actions, React components, Zod schemas, and utilities have clear JSDocs (`@param`, `@returns`), explicit named exports, and strict types.
9. **Static Quality Gate**: `npm run check` reports **0 errors** and **0 warnings**.
10. **Security & Debt Protocol**: If any security risk or debt cannot be resolved immediately, annotate code with `// TODO(security-SEC-XXX)`, register in `docs/agent-memory/SECURITY_LOG.md`, and log in `docs/TASKS.md`. Run `npm run audit:security`.
11. **E2E Test Coverage**: New workflows have corresponding Playwright tests. All 13 core tests pass with **100% green status**.
12. **Knowledge Graph Sync**: `graphify update .` is executed to refresh `graphify-out/` with updated AST and semantic relations.
13. **In-Project Memory & Registry Sync**: `docs/agent-memory/SESSION_HANDOFF.md` updated with session accomplishments and handoff notes; `docs/agent-memory/BUG_FIX_LOG.md` updated if any bug was resolved; `docs/agent-memory/SECURITY_LOG.md` updated if security findings changed.
14. **Documentation Sync**: Architectural changes documented in `docs/DECISIONS.md`, and project state updated in `docs/MEMORY.md` and `docs/TASKS.md`.




