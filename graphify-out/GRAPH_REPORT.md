# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 504 nodes · 1008 edges · 33 communities (19 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bef87c28`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- package.json
- schema.ts
- 0000_dashing_runaways.sql
- process-optical-order.ts
- patient-actions.ts
- lab-orders-view.tsx
- 0002_cute_molly_hayes.sql
- inventory-actions.ts
- compilerOptions
- 0003_lying_captain_stacy.sql
- auth-utils.ts
- dependencies
- settings-actions.ts
- getCurrentSession
- report-actions.ts
- devDependencies
- login/page.tsx
- seed.ts
- OptixOS
- middleware.ts
- Monetary & Accounting Rules
- postcss.config.mjs
- Concurrency & Transaction Safety
- Optical Domain Rules
- Security & RBAC Enforcement
- UI & Styling Standards
- Decimal.js Monetary Engine
- OptixOS README
- {
  signIn,
  signUp,
  signOut,
  useSession,
}

## God Nodes (most connected - your core abstractions)
1. `react` - 31 edges
2. `lucide-react` - 25 edges
3. `getCurrentSession()` - 21 edges
4. `Decimal.js` - 21 edges
5. `compilerOptions` - 16 edges
6. `db` - 14 edges
7. `drizzle-orm` - 14 edges
8. `sonner` - 13 edges
9. `invoices` - 12 edges
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

## Communities (33 total, 11 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.05
Nodes (74): Decimal.js, lucide-react, react, use-debounce, linkExistingCustomerToFamily(), PatientPrescriptionHistory, WorkshopSlipModal(), WorkshopSlipModalProps (+66 more)

### Community 1 - "package.json"
Cohesion: 0.04
Nodes (34): scripts, build, check, db:generate, db:push, db:seed, dev, start (+26 more)

### Community 2 - "schema.ts"
Cohesion: 0.06
Nodes (34): account, accountRelations, Branch, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryCategoryEnum (+26 more)

### Community 3 - "0000_dashing_runaways.sql"
Cohesion: 0.12
Nodes (29): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+21 more)

### Community 4 - "process-optical-order.ts"
Cohesion: 0.09
Nodes (22): generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, NegativeBalanceError, addSchema, axisSchema, CreateOrderInput (+14 more)

### Community 5 - "patient-actions.ts"
Cohesion: 0.13
Nodes (17): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), PatientDetailHistory, PatientOrderHistoryItem (+9 more)

### Community 6 - "lab-orders-view.tsx"
Cohesion: 0.15
Nodes (18): getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, updateOrderStatus(), collectBalance(), CollectBalanceResult, dynamic, LabOrdersPage() (+10 more)

### Community 7 - "0002_cute_molly_hayes.sql"
Cohesion: 0.14
Nodes (22): "branches", branches_organization_idx, customers_organization_idx, customers_primary_customer_idx, inventory_branch_idx, inventory_organization_idx, invoice_branch_idx, invoice_item_patient_idx (+14 more)

### Community 8 - "inventory-actions.ts"
Cohesion: 0.19
Nodes (14): sonner, zod, addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable() (+6 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "0003_lying_captain_stacy.sql"
Cohesion: 0.19
Nodes (17): "account", account_userId_idx, "invitation", invitation_email_idx, invitation_organizationId_idx, "member", member_organizationId_idx, member_userId_idx (+9 more)

### Community 11 - "auth-utils.ts"
Cohesion: 0.20
Nodes (13): better-auth, drizzle-orm, { GET, POST }, db, pool, branches, organizations, auth (+5 more)

### Community 12 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth, @better-fetch/fetch, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless (+10 more)

### Community 13 - "settings-actions.ts"
Cohesion: 0.21
Nodes (14): getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata, SettingsPage() (+6 more)

### Community 14 - "getCurrentSession"
Cohesion: 0.22
Nodes (10): @upstash/redis, dynamic, GET(), dynamic, GET(), inventoryItems, getCurrentSession(), cacheGet() (+2 more)

### Community 15 - "report-actions.ts"
Cohesion: 0.23
Nodes (11): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), resolveDateRange() (+3 more)

### Community 16 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 18 - "seed.ts"
Cohesion: 0.29
Nodes (5): invoiceItems, opticalPrescriptions, seedCustomers, seedInventory, seedPrescriptions

### Community 19 - "OptixOS"
Cohesion: 0.50
Nodes (4): OptixOS, Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **179 isolated node(s):** `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals`, `DiscountCellProps` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `pos-view.tsx` to `package.json`, `patient-actions.ts`, `lab-orders-view.tsx`, `inventory-actions.ts`, `settings-actions.ts`, `report-actions.ts`, `login/page.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `pos-view.tsx` to `package.json`, `process-optical-order.ts`, `patient-actions.ts`, `lab-orders-view.tsx`, `inventory-actions.ts`, `settings-actions.ts`, `report-actions.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `invoices` connect `0002_cute_molly_hayes.sql` to `schema.ts`, `process-optical-order.ts`, `patient-actions.ts`, `lab-orders-view.tsx`, `auth-utils.ts`, `report-actions.ts`, `seed.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `ProductCategory`, `BillingCartProps`, `CalculatedCartLine` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050915211445402904 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04421768707482993 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._