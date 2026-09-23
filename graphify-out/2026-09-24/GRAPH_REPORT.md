# Graph Report - optical-pos  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 594 nodes · 1306 edges · 38 communities (26 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ad59cf4c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lucide-react
- settings-actions.ts
- patient-actions.ts
- 0000_dashing_runaways.sql
- schema.ts
- react
- lab-orders-view.tsx
- auth-utils.ts
- 0002_cute_molly_hayes.sql
- compilerOptions
- 0003_lying_captain_stacy.sql
- dependencies
- Universal AI Agent Engineering Guidelines
- package.json
- pos-view.tsx
- add-product-modal.tsx
- pos-store.ts
- devDependencies
- report-actions.ts
- scripts
- @playwright/test
- billing-cart.tsx
- process-optical-order.ts
- auth.ts
- prescription-grid.tsx
- add-family-member-modal.tsx
- seed.ts
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
1. `react` - 48 edges
2. `lucide-react` - 42 edges
3. `useTenantStore` - 33 edges
4. `getCurrentSession()` - 28 edges
5. `sonner` - 26 edges
6. `Decimal.js` - 23 edges
7. `compilerOptions` - 16 edges
8. `db` - 15 edges
9. `drizzle-orm` - 15 edges
10. `scripts` - 13 edges

## Surprising Connections (you probably didn't know these)
- `customers_organization_idx` --indexes--> `customers`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `customers_primary_customer_idx` --indexes--> `customers`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `invoice_branch_idx` --indexes--> `invoices`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `invoice_organization_idx` --indexes--> `invoices`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `payment_branch_idx` --indexes--> `payments`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **OptixOS Core Documentation Suite** — docs_prd, docs_architecture, docs_design, docs_rules, docs_decisions, docs_security, docs_test_plan, docs_tasks, docs_memory, docs_vibe_workflow [EXTRACTED 1.00]
- **Optical Domain Invariants** — concept_decimal_js, concept_atomic_inventory, concept_multi_tenancy [EXTRACTED 1.00]

## Communities (38 total, 7 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.06
Nodes (52): lucide-react, sonner, addInventoryItem(), deleteInventoryItem(), getInventoryList(), InventoryRow, updateInventoryItem(), UpdateInventoryItemInput (+44 more)

### Community 1 - "settings-actions.ts"
Cohesion: 0.06
Nodes (36): @upstash/redis, zod, getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), GET() (+28 more)

### Community 2 - "patient-actions.ts"
Cohesion: 0.11
Nodes (27): createPatientAction(), CreatePatientInput, deletePatientAction(), FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions() (+19 more)

### Community 3 - "0000_dashing_runaways.sql"
Cohesion: 0.10
Nodes (33): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+25 more)

### Community 4 - "schema.ts"
Cohesion: 0.06
Nodes (33): account, accountRelations, Branch, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryCategoryEnum (+25 more)

### Community 5 - "react"
Cohesion: 0.13
Nodes (21): Decimal.js, react, WorkshopSlipModal(), WorkshopSlipModalProps, DenseBottomBar(), DenseBottomBarProps, A4Invoice(), formatDiopter() (+13 more)

### Community 6 - "lab-orders-view.tsx"
Cohesion: 0.11
Nodes (20): next, next-themes, getActiveLabOrders(), LabOrderSummary, updateOrderStatus(), collectBalance(), dynamic, LabOrdersPage() (+12 more)

### Community 7 - "auth-utils.ts"
Cohesion: 0.18
Nodes (15): drizzle-orm, LabOrderItemDetail, CollectBalanceResult, dynamic, dynamic, GET(), db, pool (+7 more)

### Community 8 - "0002_cute_molly_hayes.sql"
Cohesion: 0.18
Nodes (18): "branches", branches_organization_idx, customers_organization_idx, customers_primary_customer_idx, inventory_branch_idx, inventory_organization_idx, invoice_branch_idx, invoice_organization_idx (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "0003_lying_captain_stacy.sql"
Cohesion: 0.19
Nodes (17): "account", account_userId_idx, "invitation", invitation_email_idx, invitation_organizationId_idx, "member", member_organizationId_idx, member_userId_idx (+9 more)

### Community 11 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth, @better-fetch/fetch, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless (+10 more)

### Community 12 - "Universal AI Agent Engineering Guidelines"
Cohesion: 0.15
Nodes (17): Universal AI Agent Engineering Guidelines, Project Rules & Coding Standards, Atomic Inventory Decrement, Exact Monetary Math (decimal.js), Multi-Tenant Isolation, OptixOS Vibe Coding, OptixOS System Architecture, OptixOS Documentation Archive Log (+9 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (15): autoprefixer, @better-fetch/fetch, dotenv, drizzle-kit, eslint, eslint-config-next, @neondatabase/serverless, postcss (+7 more)

### Community 14 - "pos-view.tsx"
Cohesion: 0.19
Nodes (10): use-debounce, AddProductModal(), InventorySearch(), InventorySearchProps, Patient, PatientSearch(), PatientSearchProps, QuickAddPatientModal() (+2 more)

### Community 15 - "add-product-modal.tsx"
Cohesion: 0.25
Nodes (13): AddProductModalProps, CATEGORIES, ProductCategory, CompactPatientStrip(), CompactPatientStripProps, InventoryItem, PrescriptionValues, LENS_COATINGS (+5 more)

### Community 16 - "pos-store.ts"
Cohesion: 0.17
Nodes (12): PatientPrescriptionHistory, InvoiceDetailsModal(), InvoiceDetailsModalProps, PaymentMode, PaymentPanel(), PaymentPanelProps, PrescriptionGridProps, initialInvoiceBillingDetails (+4 more)

### Community 17 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 18 - "report-actions.ts"
Cohesion: 0.25
Nodes (10): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), resolveDateRange() (+2 more)

### Community 19 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:push, db:seed, dev, start (+5 more)

### Community 21 - "billing-cart.tsx"
Cohesion: 0.21
Nodes (9): BillingCart(), BillingCartProps, calculateCartMetrics(), CalculatedCartLine, CartItem, CartTotals, DiscountCellProps, CartItemEditModal() (+1 more)

### Community 22 - "process-optical-order.ts"
Cohesion: 0.31
Nodes (6): generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, invoiceItems, InsufficientStockError, NegativeBalanceError

### Community 23 - "auth.ts"
Cohesion: 0.28
Nodes (6): better-auth, { GET, POST }, auth, Session, User, CurrentSessionContext

### Community 24 - "prescription-grid.tsx"
Cohesion: 0.28
Nodes (8): formatDioptre(), historyToPrescriptionValues(), initialPrescriptionValues, parseDioptre(), PrescriptionGrid(), StepField(), StepFieldProps, isQuarterStep()

### Community 25 - "add-family-member-modal.tsx"
Cohesion: 0.36
Nodes (6): linkExistingCustomerToFamily(), AddFamilyMemberModal(), AddFamilyMemberModalProps, RELATION_OPTIONS, getDynamicRelationship(), PatientRelationMeta

### Community 26 - "seed.ts"
Cohesion: 0.40
Nodes (3): seedCustomers, seedInventory, seedPrescriptions

## Knowledge Gaps
- **184 isolated node(s):** `PlatformTenantDetail`, `RoleMode`, `InventoryViewProps`, `OrgOption`, `TenantState` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 235 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `lucide-react`, `settings-actions.ts`, `patient-actions.ts`, `lab-orders-view.tsx`, `package.json`, `pos-view.tsx`, `add-product-modal.tsx`, `pos-store.ts`, `report-actions.ts`, `billing-cart.tsx`, `prescription-grid.tsx`, `add-family-member-modal.tsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `settings-actions.ts`, `patient-actions.ts`, `react`, `lab-orders-view.tsx`, `package.json`, `pos-view.tsx`, `add-product-modal.tsx`, `pos-store.ts`, `report-actions.ts`, `billing-cart.tsx`, `prescription-grid.tsx`, `add-family-member-modal.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `react` to `lucide-react`, `settings-actions.ts`, `patient-actions.ts`, `lab-orders-view.tsx`, `auth-utils.ts`, `package.json`, `pos-view.tsx`, `add-product-modal.tsx`, `pos-store.ts`, `report-actions.ts`, `billing-cart.tsx`, `process-optical-order.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `PlatformTenantDetail`, `RoleMode`, `InventoryViewProps` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.06310958118187034 - nodes in this community are weakly interconnected._
- **Should `settings-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Should `patient-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10810810810810811 - nodes in this community are weakly interconnected._