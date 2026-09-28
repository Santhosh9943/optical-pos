# Graph Report - optical-pos  (2026-09-28)

## Corpus Check
- 266 files · ~286,218 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: .mdc 12, (none) 3, .example 1)

## Summary
- 1901 nodes · 3997 edges · 114 communities (98 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9d96e17a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- inventory-view.tsx
- schema.ts
- Decimal.js
- 0000_dashing_runaways.sql
- patient-actions.ts
- cn
- report-actions.ts
- audit-design-system.ts
- settings-actions.ts
- compilerOptions
- 0003_lying_captain_stacy.sql
- package.json
- dependencies
- cache.ts
- Vibe Coding_ A Complete Beginner-to-Production Guide.md
- **For beginners**
- **2\. Step 1: Define What You Want to Build**
- react
- The OptixOS Vibe Coding Playbook
- Technical Implementation Plan: [Feature Name]
- devDependencies
- inventory-actions.ts
- scripts
- @playwright/test
- **25\. Step 22: Test Every Feature**
- prescription-grid.tsx
- app/layout.tsx
- getCurrentSession
- OptixOS — Universal AI Agent Engineering Guidelines
- tailwind.config.ts
- dashboard-view.tsx
- postcss.config.mjs
- **30\. Step 27: Prepare for Deployment**
- {
  signIn,
  signUp,
  signOut,
  useSession,
}
- **3\. Step 2: Research Before Coding**
- **24\. Step 21: Never Give AI Huge Tasks**
- **10\. Step 7: Create `PRD.md`**
- **7\. Step 4: Install the Development Environment**
- **11\. Step 8: Create `ARCHITECTURE.md`**
- **12\. Step 9: Create `DESIGN.md`**
- **Vibe Coding: A Complete Beginner-to-Production Guide**
- add-product-modal.tsx
- tenant-actions.ts
- pos-view.tsx
- Historical Bug Fix Ledger
- 2. Implementation Phasing (Small Chunks)
- OptixOS — Gemini & Universal AI Agent Engineering Guidelines
- OptixOS — Universal AI Agent Session Handoff Ledger
- billing-cart.tsx
- settings-view.tsx
- Feature Specification: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal
- Universal AI Agent Handoff & Memory Protocol
- Feature Specification: Indian GST E-Invoicing & GSTR-1 Ledger Export
- prescription.ts
- security-audit.ts
- OptixOS — Spec-Driven Vibe Coding Engine
- Vulnerability & Debt Ledger
- OptixOS — Completed Specs Archive
- subscription-actions.ts
- 3. Phased Implementation Sequence
- Feature Specification: Razorpay SaaS Subscription & Payment System
- Task Breakdown
- Task Checklist
- decimal.js
- super-admin-auth-actions.ts
- 5. Functional Requirements
- pricing/page.tsx
- Task Checklist
- Implementation Plan: Priority Notes (Temp Notes) Floating Drawer / Widget
- Optix OS - Project Rules & Coding Standards
- process-optical-order.ts
- settings-sidebar.tsx
- invoice-edit-actions.ts
- edit-invoice-modal.tsx
- customer-portal-actions.ts
- email-actions.ts
- invoice_items
- 🌟 Key Accomplishments & Feature Modules
- next.config.mjs
- quick-add-patient-modal.tsx
- seed.ts
- OptixOS — Architecture, PRD & Master System Roadmap
- 2. Active Phase (Phase 14): Production-Level Vibe Coding Infrastructure
- Security & Compliance Specification
- email.ts
- Project Memory & Living System Ledger
- getStoreApprovalRequestsAction
- OptixOS Design System & UI Specifications
- OptixOS Operational & AI Coding Rules
- 1. Completed Phases (Phases 1 – 13)
- LocalRedisProvider
- 4. The 13 Core Regression Workflows
- useTenantStore
- Detailed Phase Breakdown:
- 4. Critical Developer Gotchas & Invariants
- product-type-actions.ts
- 3. Core Architectural Subsystems
- Architecture, PRD & Master System Roadmap
- ADR-003: Upstash Redis REST Caching with Resilient Database Fallback
- ADR-004: decimal.js for Exact Retail Accounting & Indian GST Apportionment
- ADR-005: Atomic Conditional Database Updates for Inventory Deductions
- OptixOS Documentation Archive Log
- ADR-001: Neon Serverless PostgreSQL with Connection Pooling & Drizzle ORM
- ADR-002: Better Auth for Multi-Tenant Organization & Role Scoping
- ADR-006: Dual POS Counter Layout Architecture (Adaptive Modes & Dense Split)
- ADR-007: Perspective Simulator & Persistent Simulation Banner for Super Admins
- ADR-008: Hardware Print Rendering via CSS @media print Engine
- ADR-009: Razorpay Standard Checkout vs Hosted Page for SaaS Subscriptions
- auth-utils.ts
- Architecture Decision Records (ADRs)

## God Nodes (most connected - your core abstractions)
1. `react` - 95 edges
2. `lucide-react` - 79 edges
3. `sonner` - 51 edges
4. `useTenantStore` - 51 edges
5. `getCurrentSession()` - 48 edges
6. `invalidateCache()` - 46 edges
7. `db` - 41 edges
8. `drizzle-orm` - 40 edges
9. `requireAuthSession()` - 40 edges
10. `Historical Bug Fix Ledger` - 39 edges

## Surprising Connections (you probably didn't know these)
- `customers_org_phone_idx` --indexes--> `customers`  [EXTRACTED]
  scripts/migrations/2026-09-28-tenant-hardening.sql → src/db/schema.ts
- `invoice_org_created_idx` --indexes--> `invoices`  [EXTRACTED]
  scripts/migrations/2026-09-28-tenant-hardening.sql → src/db/schema.ts
- `payment_org_paid_at_idx` --indexes--> `payments`  [EXTRACTED]
  scripts/migrations/2026-09-28-tenant-hardening.sql → src/db/schema.ts
- `runTests()` --calls--> `invalidateCache()`  [EXTRACTED]
  scripts/test-caching-engine.ts → src/lib/cache.ts
- `lowestPlanUnlocking()` --calls--> `canAccessFeature()`  [EXTRACTED]
  e2e/global-setup.ts → src/lib/feature-gate.ts

## Import Cycles
- 4-file cycle: `src/actions/receipt-actions.ts -> src/lib/auth-utils.ts -> src/lib/auth.ts -> src/lib/email.ts -> src/actions/receipt-actions.ts`

## Hyperedges (group relationships)
- **OptixOS Core Documentation Suite** — docs_prd, docs_architecture_optixos_system_architecture, docs_design_optixos_design_system_ui_specifications, docs_rules_optixos_operational_ai_coding_rules, docs_decisions_architecture_decision_records_adrs, docs_security_security_compliance_specification, docs_test_plan_test_plan_quality_assurance_matrix, docs_tasks_task_ledger_development_roadmap, docs_memory_project_memory_living_system_ledger, docs_vibe_workflow_the_optixos_vibe_coding_playbook [EXTRACTED 1.00]
- **Optical Domain Invariants** — concept_decimal_js, concept_atomic_inventory, concept_multi_tenancy [EXTRACTED 1.00]

## Communities (114 total, 12 thin omitted)

### Community 0 - "inventory-view.tsx"
Cohesion: 0.17
Nodes (14): getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, EditInventoryModal(), EditInventoryModalProps, InventoryTable(), InventoryTableProps (+6 more)

### Community 1 - "schema.ts"
Cohesion: 0.04
Nodes (50): accountRelations, Branch, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryItemsRelations, invitation (+42 more)

### Community 3 - "0000_dashing_runaways.sql"
Cohesion: 0.07
Nodes (48): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+40 more)

### Community 4 - "patient-actions.ts"
Cohesion: 0.06
Nodes (47): createStoreApprovalRequestAction(), getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, TERMINAL_ORDER_STATUSES, updateOrderStatus(), ageSchema, createPatientAction() (+39 more)

### Community 5 - "cn"
Cohesion: 0.07
Nodes (31): class-variance-authority, RouteErrorFallback(), RouteErrorFallbackProps, RouteLoadingSkeleton(), Badge(), BadgeProps, badgeVariants, Button (+23 more)

### Community 6 - "report-actions.ts"
Cohesion: 0.17
Nodes (15): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), NON_REVENUE_ORDER_STATUSES (+7 more)

### Community 7 - "audit-design-system.ts"
Cohesion: 0.43
Nodes (6): auditFile(), EXCLUDE_DIRS, getAllFiles(), runAudit(), SRC_DIR, Violation

### Community 8 - "settings-actions.ts"
Cohesion: 0.17
Nodes (19): saveSmtpSettingsAction(), buildFallbackStoreProfile(), getStoreProfile(), storeProfileCacheKey(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile() (+11 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "0003_lying_captain_stacy.sql"
Cohesion: 0.19
Nodes (17): "account", account_userId_idx, "invitation", invitation_email_idx, invitation_organizationId_idx, "member", member_organizationId_idx, member_userId_idx (+9 more)

### Community 11 - "package.json"
Cohesion: 0.09
Nodes (21): autoprefixer, @better-fetch/fetch, clsx, dotenv, drizzle-kit, eslint, eslint-config-next, @neondatabase/serverless (+13 more)

### Community 12 - "dependencies"
Cohesion: 0.09
Nodes (22): dependencies, better-auth, @better-fetch/fetch, class-variance-authority, clsx, decimal.js, drizzle-orm, ioredis (+14 more)

### Community 13 - "cache.ts"
Cohesion: 0.13
Nodes (19): @upstash/redis, runTests(), GET(), GET(), buildCacheKey(), cacheDel(), cacheFlush(), cacheGet() (+11 more)

### Community 14 - "Vibe Coding_ A Complete Beginner-to-Production Guide.md"
Cohesion: 0.07
Nodes (28): **13\. Step 10: Create `RULES.md`**, **14\. Step 11: Create `TASKS.md`**, **15\. Step 12: Create `DECISIONS.md`**, **16\. Step 13: Create `MEMORY.md`**, **17\. Step 14: Create `TEST_PLAN.md`**, **18\. Step 15: Create `SECURITY.md`**, **19\. Step 16: Create `.env.example`**, **20\. Step 17: Give the AI Project Context** (+20 more)

### Community 15 - "**For beginners**"
Cohesion: 0.29
Nodes (7): **4\. Step 3: Choose Your AI Coding Tool**, **Bolt**, **Claude Code**, **Cursor**, **For beginners**, **Lovable**, **Replit**

### Community 16 - "**2\. Step 1: Define What You Want to Build**"
Cohesion: 0.33
Nodes (6): **1\. What problem are you solving?**, **2\. Step 1: Define What You Want to Build**, **2\. Who is the user?**, **3\. What is the main outcome?**, **4\. What is the MVP?**, **5\. What is NOT part of the first version?**

### Community 17 - "react"
Cohesion: 0.13
Nodes (19): lucide-react, react, sonner, sendReceiptEmailAction(), completeStaffInitialPasswordChangeAction(), verifyOwnerLoginPreflightAction(), LoginFormContent(), StaffLoginFormContent() (+11 more)

### Community 18 - "The OptixOS Vibe Coding Playbook"
Cohesion: 0.20
Nodes (9): OptixOS Vibe Coding, 1. Core Principles of Production-Grade Vibe Coding, 3. The 6-Part OptixOS Prompt Template, 4. Local CI Quality Gate (`npm run validate`), 5. Knowledge Graph Synchronization (`graphify update .`), code:markdown (### 1. CONTEXT & MEMORY), code:bash (npm run validate), The OptixOS Vibe Coding Playbook (+1 more)

### Community 19 - "Technical Implementation Plan: [Feature Name]"
Cohesion: 0.09
Nodes (20): 1. Architectural Architecture & Data Flow, 2. Database & Schema Modifications, 3. Pre-Implementation Blast Radius & Dependency Audit, 4. Caching, Security & Multi-Tenancy Controls, 5. Verification & Testing Strategy, Technical Implementation Plan: [Feature Name], 1. Problem Statement & Business Objective, 2. User Stories & Personas (+12 more)

### Community 20 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+10 more)

### Community 21 - "inventory-actions.ts"
Cohesion: 0.13
Nodes (18): CreateStoreApprovalInput, createStoreApprovalSchema, StoreApprovalType, dashboardBranchIdSchema, getDashboardOperationalMetricsAction(), NON_REVENUE_ORDER_STATUSES, deleteInventoryItem(), moneyString (+10 more)

### Community 22 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, audit:design, audit:security, build, check, db:clean, db:generate, db:push (+8 more)

### Community 24 - "**25\. Step 22: Test Every Feature**"
Cohesion: 0.40
Nodes (5): **25\. Step 22: Test Every Feature**, **Build**, **Lint**, **Tests**, **Type check**

### Community 25 - "prescription-grid.tsx"
Cohesion: 0.12
Nodes (25): eyeResult, fullResult, hyperopicExact, hyperopicQuarter, lowPower, myopicExact, myopicQuarter, se (+17 more)

### Community 26 - "app/layout.tsx"
Cohesion: 0.20
Nodes (6): next, next-themes, inter, metadata, metadata, ThemeProvider()

### Community 27 - "getCurrentSession"
Cohesion: 0.11
Nodes (37): resolveStoreApprovalRequestAction(), addInventoryItem(), updateInventoryItem(), dismissNotificationAction(), dispatchNotificationAction(), getNotificationsAction(), getUnreadNotificationCountAction(), markAllNotificationsReadAction() (+29 more)

### Community 28 - "OptixOS — Universal AI Agent Engineering Guidelines"
Cohesion: 0.10
Nodes (19): 1.1 Dynamically Elastic Documentation, 1.2 Strict Archive Isolation Rule (`docs/archive/`), 1.3 Spec-Driven Feature Encapsulation (`specs/`), 1. Single Source of Truth: The `docs/` Suite, 2.1 Never Explore from Scratch ("No Blind Fresh Exploration"), 2.2 Write Clean, "Graphifyable" Code Before Extraction, 2.3 Mandatory Continuous Graph Sync, 2. Knowledge Graph-First Exploration & Graphify Protocol (+11 more)

### Community 29 - "tailwind.config.ts"
Cohesion: 0.40
Nodes (4): tailwindcss, tailwindcss-animate, config, tailwindV4CompatPlugin

### Community 30 - "dashboard-view.tsx"
Cohesion: 0.19
Nodes (8): DashboardOperationalMetrics, metadata, DashboardView(), formatINR(), FormatINROptions, getINRFormatter(), inrFormatterCache, MoneyInput

### Community 36 - "**30\. Step 27: Prepare for Deployment**"
Cohesion: 0.40
Nodes (5): **30\. Step 27: Prepare for Deployment**, **Code**, **Functionality**, **Security**, **UI**

### Community 38 - "**3\. Step 2: Research Before Coding**"
Cohesion: 0.40
Nodes (5): **3\. Step 2: Research Before Coding**, **AI tools can help with research**, **Competitors**, **Technical feasibility**, **Users**

### Community 39 - "**24\. Step 21: Never Give AI Huge Tasks**"
Cohesion: 0.50
Nodes (4): **24\. Step 21: Never Give AI Huge Tasks**, **Bad**, **Best**, **Better**

### Community 40 - "**10\. Step 7: Create `PRD.md`**"
Cohesion: 0.67
Nodes (3): **10\. Step 7: Create `PRD.md`**, **Remember:**, **What is PRD?**

### Community 41 - "**7\. Step 4: Install the Development Environment**"
Cohesion: 0.67
Nodes (3): **7\. Step 4: Install the Development Environment**, **Optional**, **Required**

### Community 45 - "add-product-modal.tsx"
Cohesion: 0.14
Nodes (24): getEnabledProductTypesAction(), AddProductModal(), AddProductModalProps, CATEGORY_INFO, getInputType(), getStepName(), getStepOptions(), ICON_MAP (+16 more)

### Community 46 - "tenant-actions.ts"
Cohesion: 0.08
Nodes (55): superAdminSignOutAction(), assignPlatformRoleAction(), BranchDetail, branchNameSchema, createApprovalRequestAction(), createBranchAction(), createOrganizationAction(), createStaffMemberAction() (+47 more)

### Community 47 - "pos-view.tsx"
Cohesion: 0.11
Nodes (23): getLinkedFamilyGroup(), getPatientOrderHistory(), getPatientPrescriptions(), linkExistingCustomerToFamily(), saveNewPrescription(), AddFamilyMemberModal(), AddFamilyMemberModalProps, RELATION_OPTIONS (+15 more)

### Community 48 - "Historical Bug Fix Ledger"
Cohesion: 0.05
Nodes (40): [BUG-001] `decimal.js` Serialization Drift, [BUG-002] String Concatenation in Financial Addition, [BUG-003] IEEE-754 Modulo Drift in 0.25 D Quarter-Step Diopter Validation, [BUG-004] Thermal 80mm Roll Premature Print Cutting, [BUG-005] Wholesale Cost Leak in Workshop Lab Slip, [BUG-006] Over-Selling Race Condition in Inventory Checkout, [BUG-007] Better Auth 2FA TOTP Stale Record Collision (`TOTP_ALREADY_ENABLED`), [BUG-008] Hardware Barcode Scanner Keystroke Interleaving (+32 more)

### Community 49 - "2. Implementation Phasing (Small Chunks)"
Cohesion: 0.17
Nodes (11): 1.1 Three-Tier User Hierarchy, 1.2 Database Changes, 1. Technical Architecture & Invariants, 2. Implementation Phasing (Small Chunks), Implementation Plan: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal, Phase 1: Database Migration & Schema Extensions, Phase 2: Core Tenancy Context & Onboarding Isolation Fix, Phase 3: Staff Creation, Governance & Multi-Store Assignment (+3 more)

### Community 50 - "OptixOS — Gemini & Universal AI Agent Engineering Guidelines"
Cohesion: 0.18
Nodes (10): 1. Universal In-Project Memory Hub (Read First!), 2. Knowledge Graph-First Exploration (`graphify`), 3. Pre-Implementation Protocol: Root Cause & Blast Radius Analysis, 4. Autonomous Official Documentation & MCP Protocol, 5. Quality & Bug-Free Correctness Over Token Optimization, 6. Automated Code Review & Security Vulnerability Protocol, 7. Automated UI/UX Consistency & Component-First Protocol, 8. Zero-Latency Stale-While-Revalidate (SWR) & 3-Tier Caching Protocol (+2 more)

### Community 51 - "OptixOS — Universal AI Agent Session Handoff Ledger"
Cohesion: 0.11
Nodes (18): 1. Active Session Metadata, 2. Most Recent Task Accomplishments (Configured Store Product Types Display, Step Normalization, Lab Orders De-congestion & Direct Viewports), 2. Most Recent Task Accomplishments (Phase 29: Practice Account Creation with Org & Optional Branch Defaults, Owner Role Tagging, Env Prefix, and Super Admin Session Expiration), 2. Most Recent Task Accomplishments (Phase 30: Practice ID & Organization Generated Information Exposure Across Super Admin & Staff Portal), 2. Most Recent Task Accomplishments (Phase 31: Resolution of React 19 SSR Hydration Mismatch, Stale Cache Elimination & Zero-Mock Invariant Enforcement), 2. Most Recent Task Accomplishments (Phase 38: Settings UI/UX Refactor, Streamlining & Compact Redesign), 2. Most Recent Task Accomplishments (Phase 39: Full-Estate Audit — Security, Money Integrity, Data Layer & Premium UI), 3. Most Recent Task Accomplishments (Phase 32: Organization Owner Portal, Sovereign Practice Governance & Staff Isolation) (+10 more)

### Community 52 - "billing-cart.tsx"
Cohesion: 0.13
Nodes (17): BillingCart(), BillingCartProps, calculateCartMetrics(), CalculatedCartLine, CartRxInspectorModalProps, CartTotals, DiscountCellProps, CartItemEditModal() (+9 more)

### Community 53 - "settings-view.tsx"
Cohesion: 0.15
Nodes (19): better-auth, deleteUserAccountAction(), getUserAccountStatusAction(), resetTwoFactorAction(), setUserPasswordAction(), toggleEmailOtpTwoFactorAction(), updateTwoFactorMethodAction(), UserAccountStatus (+11 more)

### Community 54 - "Feature Specification: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal"
Cohesion: 0.18
Nodes (10): 1. Problem Statement & Business Objective, 2. User Stories & Personas, 3. Optical Domain & Security Invariants, 4.1 Schema Additions, 4.2 Auth & Onboarding Flow, 4.3 Staff Portal (`/auth/staff-login`), 4.4 Staff Management & Store Assignments (`/admin/staff`), 4. Functional Requirements (+2 more)

### Community 55 - "Universal AI Agent Handoff & Memory Protocol"
Cohesion: 0.33
Nodes (5): 1. The Universal Agent Lifecycle, 2. Ingestion Protocol: Step-by-Step, 3. Execution Protocol: Root Cause & Blast Radius Analysis, 4. Handoff Protocol: Session Closure Checklist, Universal AI Agent Handoff & Memory Protocol

### Community 56 - "Feature Specification: Indian GST E-Invoicing & GSTR-1 Ledger Export"
Cohesion: 0.10
Nodes (19): 1. System Architecture & Component Topology, 2. Database Schema DDL (`src/db/schema.ts`), 3. Pre-Implementation Blast Radius & Invariant Audit, 4. Verification & Testing Strategy, Technical Implementation Plan: Indian GST E-Invoicing & GSTR-1 Ledger Export, 1. Problem Statement & Business Objective, 2. User Stories & Personas, 3. Optical Domain & Statutory Invariants (+11 more)

### Community 57 - "prescription.ts"
Cohesion: 0.12
Nodes (16): addSchema, axisSchema, CreateOrderInput, createOrderSchema, cylinderSchema, InvoiceBillingDetailsInput, invoiceBillingDetailsSchema, InvoiceItemInput (+8 more)

### Community 58 - "security-audit.ts"
Cohesion: 0.32
Nodes (7): bugLogPath, Finding, findings, registeredSecIds, scanDirectory(), scanFile(), secLogPath

### Community 59 - "OptixOS — Spec-Driven Vibe Coding Engine"
Cohesion: 0.33
Nodes (5): 1. Why Spec-Driven Vibe Coding?, 2. Directory Structure, 3. The 3-Document Linked Chain, 4. How to Start a New Feature, OptixOS — Spec-Driven Vibe Coding Engine

### Community 60 - "Vulnerability & Debt Ledger"
Cohesion: 0.25
Nodes (7): OptixOS — Security Vulnerability & Technical Debt Registry, Phase 39 Full-Estate Audit (2026-09-28) — all `RESOLVED`, [SEC-001] Wholesale `costPrice` Leak in `getInventoryList` Projection, [SEC-002] Plaintext `smtpPass` Exposure in `getStoreProfile`, [SEC-003] Missing Mutation Rate-Limiting on Auth & Sensitive Endpoints, [SEC-004] `storeProfile` Singleton Missing Multi-Tenant `organizationId` Scoping, Vulnerability & Debt Ledger

### Community 62 - "subscription-actions.ts"
Cohesion: 0.06
Nodes (54): CachedPlanStatus, cleanEnv(), CONSUMABLE_FIXTURE_STOCK, E2E_DEFAULT_ORG_ID, globalSetup(), lowestPlanUnlocking(), writeThroughPlanCache(), ioredis (+46 more)

### Community 63 - "3. Phased Implementation Sequence"
Cohesion: 0.17
Nodes (11): 1. Architectural Blueprint, 2. Technical Stack & Dependencies, 3. Phased Implementation Sequence, Implementation Plan: Razorpay SaaS Subscription & Payment System, Phase 1: Environment & Secrets Configuration, Phase 2: Database Schema & Subscriptions Table, Phase 3: Razorpay Server Library & Actions, Phase 4: Feature Gating & Entitlements (+3 more)

### Community 64 - "Feature Specification: Razorpay SaaS Subscription & Payment System"
Cohesion: 0.17
Nodes (11): 1. Problem Statement & Business Objective, 2. User Stories & Personas, 3. Optical Domain & Statutory Invariants, 4. Architectural Decision: Standard Checkout vs Hosted Page, 5.1 Data Contracts & Schema, 5.2 Endpoints & Actions, 5.3 UI Components, 5. Functional Requirements (+3 more)

### Community 65 - "Task Breakdown"
Cohesion: 0.22
Nodes (8): Phase 1: Database Migration & Schema, Phase 2: Tenancy Context & Onboarding Isolation Fix, Phase 3: Staff Creation & Multi-Store Management, Phase 4: Dedicated Staff Portal, Phase 5: Viewport Scoping, Branch Switcher & SaaS Redaction, Phase 6: Testing, Quality Gate & Documentation, Task Breakdown, Tasks: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal

### Community 66 - "Task Checklist"
Cohesion: 0.20
Nodes (9): Phase 1: Environment & Secrets Setup, Phase 2: Database Schema & Subscriptions Table, Phase 3: Razorpay Server Engine & Actions, Phase 4: Feature Gating & Entitlements, Phase 5: Client Checkout & Onboarding UI, Phase 6: Webhook Redundancy, Phase 7: Verification & Quality Gate, Task Checklist (+1 more)

### Community 67 - "decimal.js"
Cohesion: 0.14
Nodes (20): decimal.js, WorkshopSlipModalProps, DenseBottomBarProps, PaymentMode, PaymentPanel(), PaymentPanelProps, A4Invoice(), PrintCustomerData (+12 more)

### Community 68 - "super-admin-auth-actions.ts"
Cohesion: 0.17
Nodes (24): runTests(), getSuperAdminOtpConfigAction(), getSuperAdminSessionAction(), requestSuperAdminOtpAction(), verifySuperAdminOtpAction(), setupPracticeOnboardingAction(), OnboardingPage(), SuperAdminLoginPage() (+16 more)

### Community 69 - "5. Functional Requirements"
Cohesion: 0.12
Nodes (16): 1. Problem Statement & Business Objective, 2. User Stories & Personas, 3. Data Model & Schema, 4.1 Branch-Specific Isolation, 4.1 Quick Action Topbar Trigger, 4.2 Organization Admin Privilege (`organizer` | `super_admin`), 4.2 Slide-Over Panel & Drawer Modes, 4.3 Quick Add Card (+8 more)

### Community 70 - "pricing/page.tsx"
Cohesion: 0.19
Nodes (13): getCurrentPlanAction(), clearApplicationCacheAction(), completeOnboardingAction(), requestOrganizationDeletionAction(), loadPlan(), OwnerSettingsPage(), loadPlan(), PricingPage() (+5 more)

### Community 71 - "Task Checklist"
Cohesion: 0.29
Nodes (6): Phase 1: State Store & Persistence, Phase 2: UI Components, Phase 3: Layout Integration, Phase 4: Verification & Quality Gate, Task Checklist, Task Tracker: Priority Notes (Temp Notes) Floating Drawer / Widget

### Community 72 - "Implementation Plan: Priority Notes (Temp Notes) Floating Drawer / Widget"
Cohesion: 0.40
Nodes (4): 1. Architectural Strategy, 2. File Organization & Vertical Slice, 3. Implementation Steps, Implementation Plan: Priority Notes (Temp Notes) Floating Drawer / Widget

### Community 73 - "Optix OS - Project Rules & Coding Standards"
Cohesion: 0.14
Nodes (13): 10. Automated AI Code Review, Security Auditing & Technical Debt Protocol, 1. Stack & Runtime, 2. Strict Monetary & Accounting Rules, 3. Optical Domain & Prescription Rules, 4. Concurrency & Transaction Safety, 5. Security & RBAC Enforcement, 6. Document Output & Printing Rules, 7. Code Organization & Workflow (+5 more)

### Community 74 - "process-optical-order.ts"
Cohesion: 0.29
Nodes (7): generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, InsufficientStoreCreditError, NegativeBalanceError, roundPaise()

### Community 75 - "settings-sidebar.tsx"
Cohesion: 0.47
Nodes (4): SETTINGS_NAV_GROUPS, SettingsCategoryGroup, SettingsCategoryKey, SettingsNavItem

### Community 76 - "invoice-edit-actions.ts"
Cohesion: 0.11
Nodes (21): inventory_items, zod, customers_org_phone_idx, inventory_org_sku_uidx, invoice_org_created_idx, store_profile_org_uidx, getInvoiceForEditAction(), UpdateInvoiceInput (+13 more)

### Community 77 - "edit-invoice-modal.tsx"
Cohesion: 0.67
Nodes (3): updateInvoiceDetailsAction(), EditInvoiceModal(), EditInvoiceModalProps

### Community 78 - "customer-portal-actions.ts"
Cohesion: 0.36
Nodes (7): CustomerOrderSummary, CustomerPortalData, CustomerPrescriptionSummary, getCustomerPortalDataAction(), resolveVerifiedCustomerRecord(), CustomerPortalPage(), load()

### Community 79 - "email-actions.ts"
Cohesion: 0.36
Nodes (9): buildPlatformDefaultTestEmailHtml(), errorMessage(), getSmtpSettingsAction(), hasOwnTenantSmtp(), SmtpSettingsResponse, smtpSettingsSchema, testSmtpConnectionAction(), sendTestEmail() (+1 more)

### Community 82 - "🌟 Key Accomplishments & Feature Modules"
Cohesion: 0.05
Nodes (42): 1. Clone the Repository, 1. 👁️ Dual-Eye Clinical Refraction Matrix (OD / OS Grid), 1. Local CI Pipeline Gatekeeper, 1. Presentation Layer (Tier 1), 2. Automated Playwright End-to-End Tests, 2. Business & Application Layer (Tier 2), 2. 👨‍👩‍👧‍👦 Dynamic Reciprocal Family Billing Engine (Zero "Self"), 2. Install Dependencies (+34 more)

### Community 84 - "quick-add-patient-modal.tsx"
Cohesion: 0.28
Nodes (6): use-debounce, Patient, PatientSearch(), PatientSearchProps, QuickAddPatientModal(), QuickAddPatientModalProps

### Community 85 - "seed.ts"
Cohesion: 0.17
Nodes (13): payment_org_paid_at_idx, PublicPrescription, PublicReceiptData, PublicReceiptItem, invoiceItems, opticalPrescriptions, organization, payments (+5 more)

### Community 86 - "OptixOS — Architecture, PRD & Master System Roadmap"
Cohesion: 0.06
Nodes (35): 1. Atomic Order Processor (`src/actions/process-optical-order.ts`), 1. Executive Summary & Architectural Evolution, 2. Dynamic Reciprocal Family Billing Engine (`src/lib/patient-relationship.ts`), 2. High-Level System Architecture, 3.1 Tier 1: Presentation Layer, 3.2 Tier 2: Business & Application Layer, 3.3 Tier 3: Data & Persistence Layer, 3. Detailed 3-Tier Decomposition (+27 more)

### Community 88 - "2. Active Phase (Phase 14): Production-Level Vibe Coding Infrastructure"
Cohesion: 0.13
Nodes (14): 2. Active Phase (Phase 14): Production-Level Vibe Coding Infrastructure, 3. Future Roadmap (Phase 17), 4. Definition of Done (DoD) Checklist, Active Security Debt & Hardening Backlog (from `SECURITY_LOG.md`), Phase 17: Indian GST E-Invoicing & E-Way Bill Integration, Phase 26: Single-Store Operational Architecture & Consolidated Practice Reports Hub, Phase 27: Flexible Notification & Alerting Subsystem Architecture, Phase 28: Compact Operational Dashboard & Role-Based Customer Routing (+6 more)

### Community 90 - "Security & Compliance Specification"
Cohesion: 0.06
Nodes (32): 1.1 Mandatory Tenant Scoping, 1.2 Data Access Invariant, 1. Multi-Tenant Isolation Model, 2.1 Permission Capabilities Matrix, 2. Role-Based Access Control (RBAC) Matrix, 3.1 Network-Level Protection, 3.2 Server-Side Projection Redaction, 3. Query-Level Data Masking (Wholesale Cost Protection) (+24 more)

### Community 91 - "email.ts"
Cohesion: 0.23
Nodes (20): getPublicReceiptAction(), decryptSecret(), generateReceiptToken(), getMasterKey(), verifyReceiptToken(), createEmailTransporter(), escapeHtml(), getSecurityEmailWrapper() (+12 more)

### Community 93 - "Project Memory & Living System Ledger"
Cohesion: 0.40
Nodes (4): 1. System Specifications & Versions, 2. Test Pass Status & Verification State, 3. Active Feature Matrix, Project Memory & Living System Ledger

### Community 94 - "getStoreApprovalRequestsAction"
Cohesion: 0.60
Nodes (4): getStoreApprovalRequestsAction(), OwnerApprovalsPage(), OwnerPortalLayout(), loadCount()

### Community 102 - "OptixOS Design System & UI Specifications"
Cohesion: 0.08
Nodes (23): 1.1 Design Philosophy, 1.1 Typography, Numbers & Tailwind Version, 1.2 Color Palette & Semantic Tokens, 1. Visual Aesthetics & Design Foundations, 2.1 Viewport Spacing Mandate, 2.2 Standard Page Header Block, 2. Spacing Architecture & Fluid Full-Width Layouts, 3. Accessibility & WCAG AA Standards (+15 more)

### Community 106 - "OptixOS Operational & AI Coding Rules"
Cohesion: 0.07
Nodes (27): Atomic Inventory Decrement, Exact Monetary Math (decimal.js), Multi-Tenant Isolation, 10. Quality & Pre-Implementation Verification ("Think & Verify Twice"), 11. Pre-Implementation Root Cause Analysis & Blast Radius Mapping, 12. Universal In-Project Agent Memory & Bug Fix Logging Protocol, 13. Spec-Driven Vibe Coding Engine (`specs/`), 14. Dynamically Elastic Documentation & Archival Protocol (+19 more)

### Community 107 - "1. Completed Phases (Phases 1 – 13)"
Cohesion: 0.14
Nodes (14): 1. Completed Phases (Phases 1 – 13), Phase 10: Store Settings & Hardware Configuration, Phase 11: End-to-End Test Automation Pyramid, Phase 12: UI/UX Modernization & WCAG AA Dark Mode Compliance, Phase 13: POS Counter Viewport Modes, Phase 1: Core Multi-Tenant Architecture & Database Schema, Phase 2: Upstash Redis High-Speed Caching Layer, Phase 3: Clinical Refraction Matrix & Patient Prescription Management (+6 more)

### Community 108 - "LocalRedisProvider"
Cohesion: 0.10
Nodes (3): LocalRedisProvider, MemoryLRUProvider, UpstashRedisProvider

### Community 109 - "4. The 13 Core Regression Workflows"
Cohesion: 0.08
Nodes (23): 1. Quality Assurance Philosophy: Virtual Testing Pyramid, 2. Test Execution & CI Commands, 3.1 Authentication Bypass for E2E Tests, 3.2 Database Seeding & Clean State, 3.3 Upstash Redis Cache Invalidation, 3. Test Isolation & Environment Protocol, 4. The 13 Core Regression Workflows, 5. Definition of Done (DoD) for Automated Tests (+15 more)

### Community 111 - "useTenantStore"
Cohesion: 0.14
Nodes (21): zustand, DashboardLayout(), BranchSwitcher(), SettingsSidebar(), SimulationBanner(), PriorityNoteCard(), PriorityNoteCardProps, PriorityBucketSectionProps (+13 more)

### Community 113 - "Detailed Phase Breakdown:"
Cohesion: 0.14
Nodes (14): 2. The 9-Step OptixOS Vibe Coding Loop, code:block1 (┌────────────────────────────────────────────────────────┐), code:bash (npm run check              # TypeScript compiler & ESLint), code:bash (npm run audit:security     # Multi-tenant, financial math & ), Detailed Phase Breakdown:, Step 1: READ (Ingest Specs & Memory), Step 2: UNDERSTAND (Knowledge Graph & Blast Radius), Step 3: PLAN (Spec-Driven Architecture) (+6 more)

### Community 120 - "4. Critical Developer Gotchas & Invariants"
Cohesion: 0.12
Nodes (16): 4.10 Continuous Knowledge Graph (`graphify`) & Exploration Invariant, 4.11 Autonomous Documentation Retrieval & MCP Protocol, 4.12 Uncompromising Code Quality Over Token Optimization, 4.13 Pre-Implementation Root Cause & Blast Radius Protocol, 4.14 Universal In-Project Agent Memory & Bug Fix Ledger, 4.1 Seeded Organization ID (`DEFAULT_ORG_ID`), 4.2 Upstash Redis Cache Invalidation, 4.3 `decimal.js` String Serialization (+8 more)

### Community 139 - "product-type-actions.ts"
Cohesion: 0.16
Nodes (17): deleteProductTypeAction(), getProductTypesAction(), ProductTypeItem, saveProductTypeAction(), SaveProductTypeInput, saveProductTypeSchema, StepDependency, StepOption (+9 more)

### Community 142 - "3. Core Architectural Subsystems"
Cohesion: 0.14
Nodes (13): 1. High-Level System Topology, 2. Layered Architecture & Responsibilities, 3.1 Multi-Tenant SaaS Isolation Model, 3.2 Neon PostgreSQL & Drizzle ORM, 3.3 Zero-Latency 3-Tier Caching Architecture, 3.4 State Management Strategy: Volatile vs. Persistent, 3.5 POS Viewport Architecture (Adaptive & Dense Modes), 3.6 Hardware Print Engine (+5 more)

### Community 211 - "ADR-003: Upstash Redis REST Caching with Resilient Database Fallback"
Cohesion: 0.29
Nodes (7): ADR-003: Upstash Redis REST Caching with Resilient Database Fallback, code:typescript (// Pattern: Zero-Crash Resilient Cache), Consequences, Context, Decision, Options Considered, Status

### Community 212 - "ADR-004: decimal.js for Exact Retail Accounting & Indian GST Apportionment"
Cohesion: 0.29
Nodes (7): ADR-004: decimal.js for Exact Retail Accounting & Indian GST Apportionment, code:typescript (// Required pattern:), Consequences, Context, Decision, Options Considered, Status

### Community 213 - "ADR-005: Atomic Conditional Database Updates for Inventory Deductions"
Cohesion: 0.29
Nodes (7): ADR-005: Atomic Conditional Database Updates for Inventory Deductions, code:typescript (const [updated] = await tx), Consequences, Context, Decision, Options Considered, Status

### Community 243 - "OptixOS Documentation Archive Log"
Cohesion: 0.33
Nodes (5): 1. Archive Access Protocol & Invariant, 2. Dynamic Documentation Elasticity Lifecycle, 3. Archive Ledger, 4. Archival Procedure for Developers & Agents, OptixOS Documentation Archive Log

### Community 245 - "ADR-001: Neon Serverless PostgreSQL with Connection Pooling & Drizzle ORM"
Cohesion: 0.33
Nodes (6): ADR-001: Neon Serverless PostgreSQL with Connection Pooling & Drizzle ORM, Consequences, Context, Decision, Options Considered, Status

### Community 246 - "ADR-002: Better Auth for Multi-Tenant Organization & Role Scoping"
Cohesion: 0.33
Nodes (6): ADR-002: Better Auth for Multi-Tenant Organization & Role Scoping, Consequences, Context, Decision, Options Considered, Status

### Community 247 - "ADR-006: Dual POS Counter Layout Architecture (Adaptive Modes & Dense Split)"
Cohesion: 0.33
Nodes (6): ADR-006: Dual POS Counter Layout Architecture (Adaptive Modes & Dense Split), Consequences, Context, Decision, Options Considered, Status

### Community 248 - "ADR-007: Perspective Simulator & Persistent Simulation Banner for Super Admins"
Cohesion: 0.33
Nodes (6): ADR-007: Perspective Simulator & Persistent Simulation Banner for Super Admins, Consequences, Context, Decision, Options Considered, Status

### Community 249 - "ADR-008: Hardware Print Rendering via CSS @media print Engine"
Cohesion: 0.33
Nodes (6): ADR-008: Hardware Print Rendering via CSS @media print Engine, Consequences, Context, Decision, Options Considered, Status

### Community 250 - "ADR-009: Razorpay Standard Checkout vs Hosted Page for SaaS Subscriptions"
Cohesion: 0.33
Nodes (6): ADR-009: Razorpay Standard Checkout vs Hosted Page for SaaS Subscriptions, Consequences, Context, Decision, Options Considered, Status

### Community 407 - "auth-utils.ts"
Cohesion: 0.12
Nodes (19): drizzle-orm, OwnerPreflightResult, resolveOrganizationByInput(), staffInitialPasswordChangeSchema, StaffPreflightResult, verifyStaffPortalLoginPreflightAction(), dynamic, db (+11 more)

## Knowledge Gaps
- **815 isolated node(s):** `1. Stack & Runtime`, `2. Strict Monetary & Accounting Rules`, `3. Optical Domain & Prescription Rules`, `4. Concurrency & Transaction Safety`, `5. Security & RBAC Enforcement` (+810 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 952 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `inventory-view.tsx`, `patient-actions.ts`, `cn`, `report-actions.ts`, `package.json`, `product-type-actions.ts`, `prescription-grid.tsx`, `app/layout.tsx`, `getCurrentSession`, `dashboard-view.tsx`, `add-product-modal.tsx`, `tenant-actions.ts`, `pos-view.tsx`, `billing-cart.tsx`, `settings-view.tsx`, `subscription-actions.ts`, `decimal.js`, `super-admin-auth-actions.ts`, `pricing/page.tsx`, `settings-sidebar.tsx`, `invoice-edit-actions.ts`, `edit-invoice-modal.tsx`, `customer-portal-actions.ts`, `quick-add-patient-modal.tsx`, `getStoreApprovalRequestsAction`, `useTenantStore`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `react` to `inventory-view.tsx`, `patient-actions.ts`, `cn`, `report-actions.ts`, `package.json`, `product-type-actions.ts`, `prescription-grid.tsx`, `app/layout.tsx`, `getCurrentSession`, `dashboard-view.tsx`, `add-product-modal.tsx`, `tenant-actions.ts`, `pos-view.tsx`, `billing-cart.tsx`, `settings-view.tsx`, `subscription-actions.ts`, `decimal.js`, `super-admin-auth-actions.ts`, `pricing/page.tsx`, `settings-sidebar.tsx`, `invoice-edit-actions.ts`, `edit-invoice-modal.tsx`, `customer-portal-actions.ts`, `quick-add-patient-modal.tsx`, `getStoreApprovalRequestsAction`, `useTenantStore`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `1. Stack & Runtime`, `2. Strict Monetary & Accounting Rules`, `3. Optical Domain & Prescription Rules` to the rest of the system?**
  _815 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04354136429608128 - nodes in this community are weakly interconnected._
- **Should `0000_dashing_runaways.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.07183673469387755 - nodes in this community are weakly interconnected._
- **Should `patient-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06448087431693988 - nodes in this community are weakly interconnected._