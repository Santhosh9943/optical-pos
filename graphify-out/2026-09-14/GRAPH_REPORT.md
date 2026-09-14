# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 526 nodes · 1071 edges · 37 communities (21 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `559cf31d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- patient-actions.ts
- react
- schema.ts
- settings-actions.ts
- 0000_dashing_runaways.sql
- process-optical-order.ts
- lab-orders-view.tsx
- inventory-actions.ts
- 0002_cute_molly_hayes.sql
- compilerOptions
- 0003_lying_captain_stacy.sql
- dependencies
- auth-utils.ts
- package.json
- report-actions.ts
- seed.ts
- devDependencies
- scripts
- @playwright/test
- utils.ts
- drizzle-orm
- Tier 2: Business & Application Layer
- tailwindcss
- middleware.ts
- Monetary & Accounting Rules
- postcss.config.mjs
- Concurrency & Transaction Safety
- Optical Domain Rules
- Security & RBAC Enforcement
- UI & Styling Standards
- OptixOS
- OptixOS README
- {
  signIn,
  signUp,
  signOut,
  useSession,
}

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `lucide-react` - 28 edges
3. `getCurrentSession()` - 23 edges
4. `Decimal.js` - 21 edges
5. `compilerOptions` - 16 edges
6. `sonner` - 15 edges
7. `drizzle-orm` - 15 edges
8. `db` - 15 edges
9. `invoices` - 13 edges
10. `PrintOrderData` - 11 edges

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
- **Project Governance & Standards** — claude_stack, claude_ui_standards, claude_monetary_rules, claude_optical_rules [EXTRACTED 1.00]

## Communities (37 total, 13 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.06
Nodes (61): Decimal.js, use-debounce, getPatientOrderHistory(), getPatientPrescriptions(), linkExistingCustomerToFamily(), PatientOrderHistoryItem, PatientPrescriptionHistory, saveNewPrescription() (+53 more)

### Community 1 - "patient-actions.ts"
Cohesion: 0.09
Nodes (25): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatients(), PatientDetailHistory, PatientSummary, updateCustomerPhone(), getInvoicePrintData() (+17 more)

### Community 2 - "react"
Cohesion: 0.10
Nodes (21): lucide-react, next-themes, react, sonner, zustand, createBranchAction(), getSuperAdminPlatformMetrics(), getUserTenancyContext() (+13 more)

### Community 3 - "schema.ts"
Cohesion: 0.06
Nodes (33): account, accountRelations, Branch, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryCategoryEnum (+25 more)

### Community 4 - "settings-actions.ts"
Cohesion: 0.12
Nodes (23): @upstash/redis, getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, GET() (+15 more)

### Community 5 - "0000_dashing_runaways.sql"
Cohesion: 0.12
Nodes (29): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+21 more)

### Community 6 - "process-optical-order.ts"
Cohesion: 0.09
Nodes (22): generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, NegativeBalanceError, addSchema, axisSchema, CreateOrderInput (+14 more)

### Community 7 - "lab-orders-view.tsx"
Cohesion: 0.13
Nodes (20): next, getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, updateOrderStatus(), collectBalance(), dynamic, LabOrdersPage() (+12 more)

### Community 8 - "inventory-actions.ts"
Cohesion: 0.19
Nodes (14): zod, addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps (+6 more)

### Community 9 - "0002_cute_molly_hayes.sql"
Cohesion: 0.16
Nodes (19): "branches", branches_organization_idx, inventory_branch_idx, inventory_organization_idx, invoice_branch_idx, invoice_item_patient_idx, invoice_item_prescription_idx, invoice_organization_idx (+11 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "0003_lying_captain_stacy.sql"
Cohesion: 0.19
Nodes (17): "account", account_userId_idx, "invitation", invitation_email_idx, invitation_organizationId_idx, "member", member_organizationId_idx, member_userId_idx (+9 more)

### Community 12 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth, @better-fetch/fetch, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless (+10 more)

### Community 13 - "auth-utils.ts"
Cohesion: 0.18
Nodes (13): better-auth, PlatformTenantDetail, RoleMode, TenancyContext, { GET, POST }, pool, branches, organizations (+5 more)

### Community 14 - "package.json"
Cohesion: 0.13
Nodes (14): autoprefixer, @better-fetch/fetch, dotenv, drizzle-kit, eslint, eslint-config-next, @neondatabase/serverless, postcss (+6 more)

### Community 15 - "report-actions.ts"
Cohesion: 0.23
Nodes (11): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), resolveDateRange() (+3 more)

### Community 16 - "seed.ts"
Cohesion: 0.15
Nodes (11): customers_organization_idx, customers_primary_customer_idx, customers, inventoryItems, invoiceItems, opticalPrescriptions, seedCustomers, seedInventory (+3 more)

### Community 17 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 18 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, db:generate, db:push, db:seed, dev, start (+2 more)

### Community 21 - "drizzle-orm"
Cohesion: 0.67
Nodes (3): drizzle-orm, CollectBalanceResult, PaymentStatus

### Community 22 - "Tier 2: Business & Application Layer"
Cohesion: 0.67
Nodes (3): Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **183 isolated node(s):** `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals`, `DiscountCellProps` (+178 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 220 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `pos-view.tsx`, `patient-actions.ts`, `settings-actions.ts`, `lab-orders-view.tsx`, `inventory-actions.ts`, `package.json`, `report-actions.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `pos-view.tsx` to `patient-actions.ts`, `settings-actions.ts`, `process-optical-order.ts`, `lab-orders-view.tsx`, `inventory-actions.ts`, `package.json`, `report-actions.ts`, `drizzle-orm`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `react` to `pos-view.tsx`, `patient-actions.ts`, `settings-actions.ts`, `lab-orders-view.tsx`, `inventory-actions.ts`, `package.json`, `report-actions.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `ProductCategory`, `BillingCartProps`, `CalculatedCartLine` to the rest of the system?**
  _183 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05777345017851347 - nodes in this community are weakly interconnected._
- **Should `patient-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08677098150782361 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.1036036036036036 - nodes in this community are weakly interconnected._