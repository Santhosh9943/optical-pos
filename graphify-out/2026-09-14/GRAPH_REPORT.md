# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 449 nodes · 890 edges · 30 communities (18 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2683a22`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- report-actions.ts
- package.json
- 0000_dashing_runaways.sql
- process-optical-order.ts
- patient-actions.ts
- print-layouts.tsx
- schema.ts
- 0002_cute_molly_hayes.sql
- inventory-actions.ts
- compilerOptions
- dependencies
- settings-actions.ts
- inventory/search/route.ts
- devDependencies
- db/index.ts
- seed.ts
- Tier 2: Business & Application Layer
- Monetary & Accounting Rules
- postcss.config.mjs
- Concurrency & Transaction Safety
- Optical Domain Rules
- Security & RBAC Enforcement
- UI & Styling Standards
- OptixOS
- Tri-Output Print Engine
- OptixOS README

## God Nodes (most connected - your core abstractions)
1. `react` - 30 edges
2. `lucide-react` - 24 edges
3. `Decimal.js` - 20 edges
4. `compilerOptions` - 16 edges
5. `drizzle-orm` - 13 edges
6. `PrintOrderData` - 12 edges
7. `sonner` - 12 edges
8. `db` - 12 edges
9. `invoices` - 12 edges
10. `InventoryItem` - 10 edges

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
- **3-Tier Architecture Pattern** — docs_prd_tier1, docs_prd_tier2, docs_prd_tier3 [EXTRACTED 1.00]

## Communities (30 total, 9 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.07
Nodes (56): Decimal.js, lucide-react, react, use-debounce, linkExistingCustomerToFamily(), PatientOrderHistoryItem, PatientPrescriptionHistory, AddFamilyMemberModal() (+48 more)

### Community 1 - "report-actions.ts"
Cohesion: 0.07
Nodes (32): next, next-themes, sonner, getActiveLabOrders(), LabOrderSummary, updateOrderStatus(), collectBalance(), DailyFinancialsReport (+24 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (29): scripts, build, check, db:generate, db:push, db:seed, dev, start (+21 more)

### Community 3 - "0000_dashing_runaways.sql"
Cohesion: 0.12
Nodes (29): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+21 more)

### Community 4 - "process-optical-order.ts"
Cohesion: 0.09
Nodes (22): generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, NegativeBalanceError, addSchema, axisSchema, CreateOrderInput (+14 more)

### Community 5 - "patient-actions.ts"
Cohesion: 0.13
Nodes (17): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), PatientDetailHistory, PatientSummary (+9 more)

### Community 6 - "print-layouts.tsx"
Cohesion: 0.13
Nodes (17): WorkshopSlipModal(), WorkshopSlipModalProps, A4Invoice(), formatDiopter(), formatDiopter(), PrintCustomerData, PrintInvoiceItem, PrintOrderData (+9 more)

### Community 7 - "schema.ts"
Cohesion: 0.08
Nodes (24): Branch, branches, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryCategoryEnum, inventoryItemsRelations (+16 more)

### Community 8 - "0002_cute_molly_hayes.sql"
Cohesion: 0.14
Nodes (22): "branches", branches_organization_idx, customers_organization_idx, customers_primary_customer_idx, inventory_branch_idx, inventory_organization_idx, invoice_branch_idx, invoice_item_patient_idx (+14 more)

### Community 9 - "inventory-actions.ts"
Cohesion: 0.22
Nodes (12): addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps, InventoryView() (+4 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless, next, next-themes (+8 more)

### Community 12 - "settings-actions.ts"
Cohesion: 0.23
Nodes (13): getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata, SettingsPage() (+5 more)

### Community 13 - "inventory/search/route.ts"
Cohesion: 0.19
Nodes (10): @upstash/redis, dynamic, GET(), dynamic, GET(), inventoryItems, cacheDel(), cacheGet() (+2 more)

### Community 14 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 15 - "db/index.ts"
Cohesion: 0.26
Nodes (8): drizzle-orm, @neondatabase/serverless, LabOrderItemDetail, CollectBalanceResult, db, pool, orderStatusEnum, PaymentStatus

### Community 16 - "seed.ts"
Cohesion: 0.29
Nodes (5): invoiceItems, opticalPrescriptions, seedCustomers, seedInventory, seedPrescriptions

### Community 17 - "Tier 2: Business & Application Layer"
Cohesion: 0.67
Nodes (3): Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **162 isolated node(s):** `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals`, `DiscountCellProps` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 192 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `pos-view.tsx` to `report-actions.ts`, `package.json`, `patient-actions.ts`, `print-layouts.tsx`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `pos-view.tsx` to `report-actions.ts`, `package.json`, `process-optical-order.ts`, `patient-actions.ts`, `print-layouts.tsx`, `inventory-actions.ts`, `db/index.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `invoices` connect `0002_cute_molly_hayes.sql` to `report-actions.ts`, `process-optical-order.ts`, `patient-actions.ts`, `schema.ts`, `db/index.ts`, `seed.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `ProductCategory`, `BillingCartProps`, `CalculatedCartLine` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07042253521126761 - nodes in this community are weakly interconnected._
- **Should `report-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06859903381642513 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.052564102564102565 - nodes in this community are weakly interconnected._