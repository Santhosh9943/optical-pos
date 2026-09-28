# Project Memory & Living System Ledger

This document maintains the living operational state of **OptixOS (Optical Billing & Practice Management System)**. It acts as an authoritative, continuously updated reference for human developers and AI coding agents regarding tech stack versions, current feature states, test results, and critical gotchas.

---

## 1. System Specifications & Versions

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | `16.x` | Full-stack serverless web application |
| **Runtime Library** | React | `19.x` | Modern server components & actions |
| **Database** | Neon Serverless PostgreSQL | PostgreSQL `16` | Cloud serverless database |
| **Connection Pooling** | PgBouncer / Neon Pooler | `-pooler` endpoint | Prevents lambda connection exhaustion |
| **ORM** | Drizzle ORM / Drizzle Kit | `^0.30.x` | Strict type-safe SQL query generation |
| **Cache Layer** | Upstash Redis REST | `@upstash/redis` | High-speed cache with DB fallback |
| **Authentication** | Better Auth | `^1.x` | Multi-tenant session management & RBAC |
| **Precision Math** | `decimal.js` | `^10.4.x` | Exact monetary accounting & tax arithmetic |
| **Styling** | Tailwind CSS / Lucide React | `v4` / latest | Responsive UI with semantic design tokens |
| **State Management** | Zustand | `^4.x` | Client state persistence across SPA routes |
| **End-to-End Testing**| Playwright | `^1.40.x` | Virtual browser automation pyramid |
| **Email Gateway** | Nodemailer | `^6.10.x` | Transactional optical tax receipts via Gmail SMTP |

---

## 2. Test Pass Status & Verification State

- **Static Type Check & Lint (`npm run check`)**: **PASS (0 errors, 0 warnings)**
- **Playwright POS Test Suite (`npm run test:pos`)**: **12/12 Passed (100% green)**
  - `e2e/pos-checkout.spec.ts`: 11/11 passing (SPA persistence, atomic inventory lock, family billing, pair wizard, patient loading, dual-box discount sync).
  - `e2e/pos-layout-modes.spec.ts`: 1/1 passing (Adaptive, Rx Focus, Billing Focus, Dense Split, F4 hotkey, admin persistence).
- **Playwright Lab Orders & Reports Suite (`e2e/lab-orders.spec.ts e2e/reports-ledger.spec.ts`)**: **2/2 Passed (100% green)**
  - Lab Orders: Kanban column flow, quick status updates, search filter, and fabrication slip modal.
  - Reports & Audit Ledger: Preset switches (Today, Yesterday, 7 Days, Month, All), custom date range, and 5-per-page pagination.
- **Playwright Patient & Inventory CRUD Suite (`e2e/patient-inventory-crud.spec.ts`)**: **3/3 Passed (100% green)**
  - POS Quick Add Patient, Admin Patient Directory full history sheet, soft delete protections, and Inventory CRUD with admin controls.
- **Playwright Operational Dashboard & Routing Suite (`e2e/dashboard-routing.spec.ts`)**: **4/4 Passed (100% green)**
  - Executive Dashboard rendering, live KPI cards, quick actions (F1 Bill, F3 Stock), persistent sidebar navigation, and customer portal view at `/portal`.
- **Playwright Notification Center Suite (`e2e/notifications.spec.ts`)**: **5/5 Passed (100% green)**
  - Topbar bell trigger rendering, unread count badge, category tabs (All, Unread, Alerts, Reminders), mark all as read mutation, and popover toggle.
- **Playwright Tenant Roles & Playground Suite (`e2e/tenant-roles.spec.ts`)**: **9/9 Passed (100% green)**
  - Header user navigation, sign out redirect, branch switcher, super admin console link.
  - Dedicated `/super-admin/dashboard` platform telemetry (SaaS tenants, physical stores, branch staff users).
  - Standalone `/playground` multi-role simulation engine (Organizer, Store Admin, Store Staff) and persistent banner.
  - Legacy `/super-admin/simulator` redirect to `/playground`.
  - Multi-branch creation and staff member invitation flows.
- **Playwright Digital Engagement & Lab Suite (`e2e/digital-engagement.spec.ts`)**: **3/3 Passed (100% green)**
  - Completed order modal WhatsApp receipt dispatch & digital invoice link.
  - Public `/receipt/:id` responsive mobile tax receipt & clinical refraction viewer.
  - Optical Lab Workshop (`/admin/lab-orders`) 4-column Kanban & WhatsApp ready-for-pickup customer alerts.
- **Playwright Auth, 2FA & Security Suite (`e2e/auth-security.spec.ts`)**: **8/8 Passed (100% green)**
  - Forgot Password form with Gmail SMTP reset link dispatch.
  - Reset Password page with live password strength meter and token validation.
  - Two-Factor Authentication login challenge with TOTP, Email OTP, and Backup codes tabs.
  - Super Admin dedicated root login portal with platform root styling and access barriers.
  - Store Settings "Account & Security" tab with identity verification, dual-login password setup, and 2FA options.
  - Passwordless 2FA enablement schema validation passing with `allowPasswordless: true`.
  - Authenticator App TOTP setup: password retry without stale record error, Enter key verification, persistent backup recovery codes, and `.txt` file download.
  - Super Admin: non-allowlisted accounts receive Platform Root Access Denied barrier and zero-second revocation.
- **Playwright Multi-Tenant & Staff Portal Suite (`e2e/multi-tenant-staff-portal.spec.ts`)**: **5/5 Passed (100% green)**
  - Main login screen renders Staff Portal entry link without disrupting existing layout.
  - Staff Portal renders 3-field authentication form (Practice ID `OPT-X` or `X`, Staff Email, Password) with back-link to owner login.
  - Staff Portal validates invalid Practice ID with inline error alert.
  - Staff Management UI in Admin dashboard supports multi-store assignment and password provisioning.
  - Practice Onboarding requires Practice Name, sets up isolated workspace, and displays Store ID info.

---

## 3. Active Feature Matrix

| Module | Route / Component | Operational Status |
| :--- | :--- | :--- |
| **SaaS Landing Page** | `/` (`src/app/page.tsx`) | **Production Ready** (Hero, 4 POS modes preview, optical features grid, pricing matrix, FAQ; Playground CTA decoupled) |
| **Executive Dashboard** | `/admin/dashboard` (`dashboard-view.tsx`) | **Production Ready** (15s SWR live telemetry, 4 KPI cards, quick actions F1/F3, recent orders feed, workshop SLA status, payment splits, low stock alerts) |
| **Customer Portal** | `/portal` (`src/app/portal/page.tsx`) | **Production Ready** (Patient account hero, active spectacle orders feed, balance due alerts, OD/OS clinical refraction matrix, digital tax invoices) |
| **SaaS Pricing Page** | `/pricing` (`src/app/pricing/page.tsx`) | **Production Ready** (Starter ₹0, Plus ₹999/mo, Enterprise ₹2,499/mo with annual discount toggle) |
| **Auth & Social Login** | `/auth/login` (`src/app/auth/login/page.tsx`) | **Production Ready** (Google OAuth 2.0 primary, Email & Password, Forgot Password link, 2FA challenge redirect, default callback to `/admin/dashboard`) |
| **Forgot Password** | `/auth/forgot-password` | **Production Ready** (15-min token link dispatch via Gmail SMTP, resend countdown timer) |
| **Reset Password** | `/auth/reset-password` | **Production Ready** (Live strength meter, token validation, atomic password update) |
| **Two-Step Verification**| `/auth/2fa` (`src/app/auth/2fa/page.tsx`) | **Production Ready** (TOTP App code, dynamic Email OTP dispatch, 10 backup recovery codes) |
| **Super Admin Gateway** | `/super-admin/login` | **Production Ready** (Platform root portal, strict role gating, isolated session flow) |
| **Account & Security Hub**| `/admin/settings` (Account Tab) | **Production Ready** (Set Password for Google OAuth users, Change Password, 2FA configuration with QR code, permanent Account Deletion modal) |
| **Security Notification Engine** | `src/lib/email.ts` | **Production Ready** (Non-blocking queue-ready async dispatcher: Welcome, Login Alert, Password Change, 2FA Status) |
| **Practice Onboarding** | `/onboarding` (`src/app/onboarding/page.tsx`) | **Production Ready** (1-step onboarding for new Gmail users: provisions clean organization & main branch, assigns human-readable Store ID `OPT-X`) |
| **Dedicated Staff Portal**| `/auth/staff-login` (`src/app/auth/staff-login/page.tsx`) | **Production Ready** (3-field login: Practice ID `OPT-X` or `X`, Staff Email, Password; preflight verification; forced initial password change modal) |
| **Organization Owner Portal**| `/owner/*` (`src/app/owner/*`) | **Production Ready** (Executive Cockpit, sovereign physical store management, multi-store staff allocation, consolidated reports, maker-checker approvals, POS counter launcher) |
| **Multi-Store Staff Engine**| `/admin/staff` | **Production Ready** (Multi-store checkboxes, store access badges, primary store selection, Maker-Checker deletion approval for Store Managers; owner strictly excluded) |
| **Perspective Playground** | `/playground` | **Removed & Deprecated** (Purged unwanted experimental playground and simulator routes; operational views decoupled) |
| **Store Switcher & Scoping**| `branch-switcher.tsx` & operational views | **Production Ready** (Strict single-store isolation in POS, Inventory, Patients, Lab Orders, Staff, Priority Notes) |
| **Notification Center** | `NotificationBellTrigger` & popover | **Production Ready** (Modular event registry, SWR polling, unread badge, urgent pulse, category tabs: All, Unread, Alerts, Reminders) |
| **Practice Reports Hub** | `/admin/reports` (`reports-view.tsx`) | **Production Ready** (Consolidated practice analysis with Store Scope filter, comparative store performance cards & `decimal.js` metrics) |
| **Super Admin Governance**| `/super-admin/dashboard` | **Production Ready** (3-Tier RBAC: Root Super Admin, Platform Moderator, Platform Viewer; Privacy-first tenant governance) |
| **Privileged Approvals** | `/super-admin/approvals` | **Production Ready** (Maker-Checker policy console: Platform Moderator request submission & Root Super Admin Approve/Reject engine) |
| **Platform Team Delegation**| `/super-admin/settings` | **Production Ready** (Assign/revoke platform roles: Root Admin, Platform Moderator, Platform Viewer) |
| **Staff Multi-Role Engine**| `/admin/staff` | **Production Ready** (Simultaneous multi-role assignments: Store Admin, Optometrist, Store Staff with interactive cards & badge displays) |
| **POS New Bill** | `/pos/new-bill` | **Production Ready** (4 layout modes, F2 dispatcher, F4 hotkey, global barcode scanner) |
| **Gmail SMTP Relay** | `/admin/settings` | **Production Ready** (Host `smtp.gmail.com`, Port 587/465, STARTTLS/SSL, 16-char App Password, live test dispatch) |
| **Email Tax Receipts** | `/receipt/[id]` & POS modal | **Production Ready** (One-click optical tax invoice dispatch with clinical OD/OS table & GST breakdown) |
| **WhatsApp Receipts** | `whatsapp-utils.ts` / modal | **Production Ready** (91-prefix normalization, formatted optical tax message, wa.me deep links) |
| **Public Digital Receipt** | `/receipt/[id]` | **Production Ready** (Mobile responsive tax receipt, dual GST breakdown, refraction powers, print/PDF) |
| **Hardware Barcode Hook** | `use-barcode-scanner.ts` | **Production Ready** (Sub-10ms burst buffer with Enter delimiter, auto-cart injection) |
| **Optical Lab Kanban** | `/admin/lab-orders` | **Production Ready** (4-stage workflow, promised date SLA alerts, WhatsApp ready-for-pickup notifications, filter chips: Overdue/Balance Due, column sorting, compact cards) |
| **Patient Management** | `/patients` | **Production Ready** (Refraction history, family cluster linking, instant recent patient search, hover phone copy) |
| **Inventory Catalog** | `/inventory` | **Production Ready** (6 categories + custom categories, single SKU/barcode identifier, GST vs Tax Exempt toggle, atomic stock lock with configurable negative stock, cost redaction) |
| **Dynamic Product Types** | `/admin/settings` | **Production Ready** (Dynamic product types table, multi-step sequential wizard builder, parent-child options, prescription toggles) |
| **Post-Order Invoice Editing** | `/admin/reports` & POS modal | **Production Ready** (Live decimal.js recalculation of taxable, CGST, SGST, grand total, balance due, line item discounts, recipient details) |
| **Returns & Store Credit** | `/admin/reports` & POS checkout | **Production Ready** (Line item returns, restock, customer advanceBalance wallet credit, CREDIT payment mode in POS) |
| **Maker-Checker Store Approvals** | Actions & in-app alerts | **Production Ready** (Non-admin staff customer/inventory deletion approval requests, active order/unpaid balance deletion guards) |
| **Sales Invoices** | `/invoices` | **Production Ready** (Invoice ledger, payment history, re-print) |
| **Store Settings** | `/admin/settings` | **Production Ready** (General profile, GST Invoicing toggle, print preferences, layout mode default, Email & SMTP configuration) |
| **Hardware Print** | `PrintModal.tsx` | **Production Ready** (80mm thermal, A4 tax invoice, workshop slip) |
| **Tenant Staff Scoping**| `tenant-actions.ts` | **Production Ready** (100% real DB query from `member` + `user` tables, zero mock data) |
| **Clean Database Utility**| `npm run db:clean` (`src/db/clean.ts`) | **Production Ready** (Purges mock seed patients, invoices, refractions & flushes Redis) |

---

## 4. Critical Developer Gotchas & Invariants

### 4.1 Seeded Organization ID (`DEFAULT_ORG_ID`)
In automated tests and local seed scripts, all sample records (patients, inventory items, store settings) belong to the default seed organization:
`00000000-0000-0000-0000-000000000001`
- When writing tests or diagnostic queries, always filter by this organization ID.
- In E2E Playwright tests, the `x-e2e-bypass-auth: true` header causes the auth middleware to construct a synthetic session with this exact ID.

### 4.2 Upstash Redis Cache Invalidation
- Redis search caches (`cache:inventory:search:*` and `cache:patients:search:*`) cache JSON strings with a 5-minute TTL.
- If you manually insert or update database rows via SQL or Drizzle Studio, you must either flush Redis or wait for the TTL to expire to see changes reflected in POS search results.
- In tests, the `seed.ts` script executes `safeRedisFlush()` to clear test tenant keys.

### 4.3 `decimal.js` String Serialization
- Always serialize `Decimal` instances using `.toFixed(2)` when storing in Postgres `numeric` columns or passing JSON over the wire:
```typescript
// Correct:
totalAmount: new Decimal(amount).toFixed(2)

// Wrong (causes runtime serialization error or IEEE float drift):
totalAmount: new Decimal(amount).toNumber()
```

### 4.4 Decoupled Plano Refraction
- A customer purchasing non-prescription fashion sunglasses, computer glasses without power, or contact lens solutions has **no prescription linked**.
- The POS system handles this gracefully: `prescriptionId` is nullable on both cart items and invoice line items. Never make prescription mandatory on invoice creation.

### 4.5 CSS `@media print` Quirks
- Thermal 80mm paper rolls have a physical printable area of **72mm** (due to mechanical margins on Epson/Star/TVS printers). The thermal container in `print-thermal.css` is strictly constrained to `width: 72mm; margin: 0 auto;`.
- Avoid CSS flexbox alignments that break pagination in Chromium print mode. Use standard block flows with `break-inside: avoid;`.

### 4.6 Workshop Lab Slip Price Redaction
- Never display wholesale cost or retail price on the Workshop Job Slip. The optical technician only needs to see frame model, lens material, coating, and OD/OS powers.
- The React component `WorkshopJobSlip.tsx` completely excludes price elements from the HTML DOM to prevent inspect-element leaks.

### 4.7 Dynamic Documentation Elasticity & Archive Policy
- **Elastic Documentation:** Active documents in `docs/` dynamically expand with new features and prune/condense when features are reduced or deprecated.
- **Archive Isolation:** Superseded documents live in `docs/archive/` with entries logged in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
- **Rule for AI Agents:** NEVER query or inspect `docs/archive/` during standard development tasks unless the user explicitly requests historical context or legacy migration analysis. Standard work operates exclusively on active `docs/`.

### 4.8 WhatsApp Phone Number Normalization
- In `src/lib/whatsapp-utils.ts`, customer phone numbers are sanitized of non-numeric characters.
- Standard 10-digit Indian numbers are automatically prepended with country code `91` (`https://wa.me/91XXXXXXXXXX`) to guarantee instant deep linking into WhatsApp Web and the native mobile WhatsApp app.

### 4.9 USB HID Barcode Scanner Burst Latency
- Physical USB and Bluetooth barcode scanners emulate a hardware keyboard.
- `src/hooks/use-barcode-scanner.ts` captures keystrokes globally with a strict `<50ms` inter-character threshold ending in `Enter`. Keystrokes typed manually by cashiers (>50ms) are discarded to eliminate false-positive barcode triggers.

### 4.10 Continuous Knowledge Graph (`graphify`) & Exploration Invariant
- **No Fresh Blind Exploration:** Never wander or rediscover the codebase from scratch. Always utilize `graphify query "<query>"`, `graphify explain "<Symbol>"`, and `graphify path "<A>" "<B>" --undirected` to instantly map dependencies, callers, callees, and architectural communities.
- **Graphifyable Code Standards:** Prior to running graph updates, ensure new and modified code is easily understandable and graphifyable: provide comprehensive JSDoc/TSDoc docstrings (`@description`, `@param`, `@returns`), use explicit named exports, annotate strict types, and structure logic in modular vertical domain slices.
- **Continuous Knowledge Graph Sync:** Maintain `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` by executing `graphify update .` whenever code modifications pass static validation.

### 4.11 Autonomous Documentation Retrieval & MCP Protocol
- **Zero Hallucination:** When user instructions omit technical specifications, schemas, or library documentation, agents must never guess or use stale memory.
- **Authoritative Retrieval:** Actively use MCP tools (Figma, Notion, Lovable, Chrome DevTools, DB proxy tools) or live web/doc scraping (`search_web`, `read_url_content`, `browser_subagent`) to fetch official vendor documentation directly, strictly checking for library version compatibility against `package.json`.

### 4.12 Uncompromising Code Quality Over Token Optimization
- **Quality Mandate:** High-grade, bug-free, resilient code takes absolute priority over saving tokens.
- **Think & Verify Twice:** Always inspect existing code, schemas, and invariants twice before making changes. Perform deep testing and verify compiler and runtime behaviors thoroughly without rushing.

### 4.13 Pre-Implementation Root Cause & Blast Radius Protocol
- **Fundamental Diagnosis:** Never apply superficial workaround patches, temporary try/catch masks, or monkey-patches. Always identify and address the structural root cause.
- **Blast Radius Mapping:** Use `graphify explain "<Symbol>"` to trace all callers, callees, and dependencies across the application.
- **Multi-Tier Atomic Alignment:** Atomically update all vertical layers (`Drizzle Schema -> Zod Validator -> Server Action -> Zustand Store -> React Component -> Print/E2E Test`) in the same task.

### 4.14 Universal In-Project Agent Memory & Bug Fix Ledger
- **Memory Sovereignty:** All AI agent session handoffs, active context, and bug memories live in `docs/agent-memory/` inside this repository.
- **Cross-Agent Portability:** Any agent (Gemini, Claude, Cursor, Antigravity) reads [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) and [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) upon session start, and updates them upon task completion, eliminating dependence on proprietary, external agent storage.



