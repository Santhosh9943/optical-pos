# Graph Report - optical-pos  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 604 nodes · 1348 edges · 38 communities (27 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ad59cf4c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- schema.ts
- Decimal.js
- 0000_dashing_runaways.sql
- lab-orders-view.tsx
- pos-view.tsx
- 0002_cute_molly_hayes.sql
- auth-utils.ts
- settings-actions.ts
- compilerOptions
- 0003_lying_captain_stacy.sql
- package.json
- dependencies
- getCurrentSession
- login/page.tsx
- pos-store.ts
- add-product-modal.tsx
- prescription.ts
- Universal AI Agent Engineering Guidelines
- report-actions.ts
- devDependencies
- process-optical-order.ts
- scripts
- @playwright/test
- billing-cart.tsx
- quick-add-patient-modal.tsx
- app/layout.tsx
- inventory-actions.ts
- utils.ts
- tailwindcss
- middleware.ts
- postcss.config.mjs
- OptixOS README
- {
  signIn,
  signUp,
  signOut,
  useSession,
}

## God Nodes (most connected - your core abstractions)
1. `react` - 50 edges
2. `lucide-react` - 44 edges
3. `useTenantStore` - 33 edges
4. `getCurrentSession()` - 31 edges
5. `sonner` - 26 edges
6. `Decimal.js` - 22 edges
7. `db` - 17 edges
8. `drizzle-orm` - 17 edges
9. `compilerOptions` - 16 edges
10. `scripts` - 13 edges

## Surprising Connections (you probably didn't know these)
- `invoice_branch_idx` --indexes--> `invoices`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `invoice_organization_idx` --indexes--> `invoices`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `customers_organization_idx` --indexes--> `customers`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `customers_primary_customer_idx` --indexes--> `customers`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `payment_branch_idx` --indexes--> `payments`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **OptixOS Core Documentation Suite** — docs_prd, docs_architecture, docs_design, docs_rules, docs_decisions, docs_security, docs_test_plan, docs_tasks, docs_memory, docs_vibe_workflow [EXTRACTED 1.00]
- **Optical Domain Invariants** — concept_decimal_js, concept_atomic_inventory, concept_multi_tenancy [EXTRACTED 1.00]

## Communities (38 total, 7 thin omitted)

### Community 0 - "react"
Cohesion: 0.07
Nodes (51): lucide-react, react, sonner, deleteInventoryItem(), getInventoryList(), InventoryRow, deletePatientAction(), getPatients() (+43 more)

### Community 1 - "schema.ts"
Cohesion: 0.06
Nodes (33): account, accountRelations, Branch, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryCategoryEnum (+25 more)

### Community 2 - "Decimal.js"
Cohesion: 0.10
Nodes (23): Decimal.js, WorkshopSlipModal(), WorkshopSlipModalProps, DenseBottomBar(), DenseBottomBarProps, PaymentMode, PaymentPanel(), PaymentPanelProps (+15 more)

### Community 3 - "0000_dashing_runaways.sql"
Cohesion: 0.12
Nodes (29): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+21 more)

### Community 4 - "lab-orders-view.tsx"
Cohesion: 0.12
Nodes (23): getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, updateOrderStatus(), getPatientHistory(), PatientDetailHistory, updateCustomerPhone(), collectBalance() (+15 more)

### Community 5 - "pos-view.tsx"
Cohesion: 0.14
Nodes (22): CreatePatientInput, FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientOrderHistory(), getPatientPrescriptions(), linkExistingCustomerToFamily(), PatientOrderHistoryItem, saveNewPrescription() (+14 more)

### Community 6 - "0002_cute_molly_hayes.sql"
Cohesion: 0.13
Nodes (21): "branches", branches_organization_idx, customers_organization_idx, customers_primary_customer_idx, inventory_branch_idx, inventory_organization_idx, invoice_branch_idx, invoice_item_patient_idx (+13 more)

### Community 7 - "auth-utils.ts"
Cohesion: 0.19
Nodes (14): drizzle-orm, CollectBalanceResult, { GET, POST }, db, pool, invoices, PaymentStatus, user (+6 more)

### Community 8 - "settings-actions.ts"
Cohesion: 0.16
Nodes (17): zod, getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "0003_lying_captain_stacy.sql"
Cohesion: 0.19
Nodes (17): "account", account_userId_idx, "invitation", invitation_email_idx, invitation_organizationId_idx, "member", member_organizationId_idx, member_userId_idx (+9 more)

### Community 11 - "package.json"
Cohesion: 0.12
Nodes (16): autoprefixer, better-auth, @better-fetch/fetch, dotenv, drizzle-kit, eslint, eslint-config-next, @neondatabase/serverless (+8 more)

### Community 12 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth, @better-fetch/fetch, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless (+10 more)

### Community 13 - "getCurrentSession"
Cohesion: 0.18
Nodes (12): @upstash/redis, getCurrentPlanAction(), updateOrganizationPlanAction(), dynamic, GET(), dynamic, GET(), organizations (+4 more)

### Community 14 - "login/page.tsx"
Cohesion: 0.18
Nodes (6): ensureDefaultSuperAdminAction(), LoginFormContent(), ThemeToggle(), authClient, PRICING_PLANS, PricingPlan

### Community 15 - "pos-store.ts"
Cohesion: 0.16
Nodes (15): PatientPrescriptionHistory, InvoiceDetailsModal(), InvoiceDetailsModalProps, formatDioptre(), initialPrescriptionValues, parseDioptre(), PrescriptionGrid(), PrescriptionGridProps (+7 more)

### Community 16 - "add-product-modal.tsx"
Cohesion: 0.19
Nodes (14): AddProductModal(), AddProductModalProps, CATEGORIES, ProductCategory, InventoryItem, InventorySearch(), InventorySearchProps, PrescriptionValues (+6 more)

### Community 17 - "prescription.ts"
Cohesion: 0.11
Nodes (17): addSchema, axisSchema, CreateOrderInput, createOrderSchema, cylinderSchema, InvoiceBillingDetailsInput, invoiceBillingDetailsSchema, InvoiceItemInput (+9 more)

### Community 18 - "Universal AI Agent Engineering Guidelines"
Cohesion: 0.15
Nodes (17): Universal AI Agent Engineering Guidelines, Project Rules & Coding Standards, Atomic Inventory Decrement, Exact Monetary Math (decimal.js), Multi-Tenant Isolation, OptixOS Vibe Coding, OptixOS System Architecture, OptixOS Documentation Archive Log (+9 more)

### Community 19 - "report-actions.ts"
Cohesion: 0.23
Nodes (11): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), resolveDateRange() (+3 more)

### Community 20 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 21 - "process-optical-order.ts"
Cohesion: 0.18
Nodes (8): ProcessOrderResult, invoiceItems, opticalPrescriptions, seedCustomers, seedInventory, seedPrescriptions, InsufficientStockError, NegativeBalanceError

### Community 22 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:push, db:seed, dev, start (+5 more)

### Community 24 - "billing-cart.tsx"
Cohesion: 0.21
Nodes (9): BillingCart(), BillingCartProps, calculateCartMetrics(), CalculatedCartLine, CartItem, CartTotals, DiscountCellProps, CartItemEditModal() (+1 more)

### Community 25 - "quick-add-patient-modal.tsx"
Cohesion: 0.24
Nodes (8): use-debounce, createPatientAction(), AddPatientModal(), Patient, PatientSearch(), PatientSearchProps, QuickAddPatientModal(), QuickAddPatientModalProps

### Community 26 - "app/layout.tsx"
Cohesion: 0.33
Nodes (4): next, next-themes, metadata, ThemeProvider()

### Community 27 - "inventory-actions.ts"
Cohesion: 0.33
Nodes (6): addInventoryItem(), updateInventoryItem(), UpdateInventoryItemInput, branches, inventoryItems, CreateInventoryItemInput

## Knowledge Gaps
- **182 isolated node(s):** `InventoryViewProps`, `OrgOption`, `TenantState`, `PlatformTenantDetail`, `RoleMode` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 232 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Decimal.js`, `lab-orders-view.tsx`, `pos-view.tsx`, `settings-actions.ts`, `package.json`, `login/page.tsx`, `pos-store.ts`, `add-product-modal.tsx`, `report-actions.ts`, `billing-cart.tsx`, `quick-add-patient-modal.tsx`, `app/layout.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `react` to `Decimal.js`, `lab-orders-view.tsx`, `pos-view.tsx`, `settings-actions.ts`, `package.json`, `login/page.tsx`, `pos-store.ts`, `add-product-modal.tsx`, `report-actions.ts`, `billing-cart.tsx`, `quick-add-patient-modal.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `invoices` connect `auth-utils.ts` to `react`, `schema.ts`, `lab-orders-view.tsx`, `pos-view.tsx`, `0002_cute_molly_hayes.sql`, `report-actions.ts`, `process-optical-order.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `InventoryViewProps`, `OrgOption`, `TenantState` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.07226107226107226 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Decimal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10227272727272728 - nodes in this community are weakly interconnected._