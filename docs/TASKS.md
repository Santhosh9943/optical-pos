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

---

## 3. Future Roadmap (Phases 15 – 18)

### Phase 15: Omnichannel Customer Engagement & Digital Receipts
- [ ] **WhatsApp Business API Integration**: Automatic delivery of digital thermal receipts and order readiness notifications to customer mobile phones.
- [ ] **SMS Gateway Fallback**: Transactional SMS alerts for order pickup and prescription renewal reminders.
- [ ] **Customer Web Portal**: Lightweight mobile web portal where patients can view their prescription history and download PDF invoices.

### Phase 16: Hardware Barcode Scanner & Thermal Print Server
- [ ] **Native USB HID Barcode Scanner Support**: Global keystroke listener capturing 1D/2D barcode scans with `<10ms` latency without requiring focus on search inputs.
- [ ] **Direct Thermal ESC/POS Network Printing**: Direct socket printing to LAN/Wi-Fi thermal printers bypassing the browser print dialog.

### Phase 17: Indian GST E-Invoicing & E-Way Bill Integration
- [ ] **NIC E-Invoicing API Client**: Generation of Invoice Reference Number (IRN) and signed QR code for B2B optical transactions exceeding statutory turnover thresholds.
- [ ] **Automated GSTR-1 JSON Export**: One-click monthly tax ledger export matching the GST portal schema.

### Phase 18: Optical Lab Workshop Queue & Technician Tablet App
- [ ] **Workshop Kanban Board**: Order status progression (`Prescription Verified -> Lenses Ordered -> Edging/Mounting -> QC Passed -> Ready for Dispensing`).
- [ ] **Barcode Batch Tracking**: Lens packet scanning to verify power accuracy before edging.

---

## 4. Definition of Done (DoD) Checklist

Every future task in OptixOS must satisfy this checklist before merging:
1. **Domain Integrity**: All monetary math uses `decimal.js`. All diopters adhere to 0.25 D steps. All stock deductions use atomic SQL conditions.
2. **Multi-Tenant Security**: Every database query scopes to `organization_id`. `cost_price` is omitted from non-manager queries.
3. **UI/UX Consistency**: Native dark mode supported. Spacing follows `p-4 md:p-6 gap-6`. Buttons have accessible names (`aria-label`).
4. **Static Quality Gate**: `npm run check` reports **0 errors** and **0 warnings**.
5. **E2E Test Coverage**: New workflows have corresponding Playwright tests. All 13 core tests pass with **100% green status**.
6. **Documentation Sync**: Architectural changes documented in `docs/DECISIONS.md`, and project state updated in `docs/MEMORY.md`.
