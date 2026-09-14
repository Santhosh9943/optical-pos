# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 417 nodes · 846 edges · 22 communities (13 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ccfa3a4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- schema.ts
- package.json
- print-layouts.tsx
- 0000_dashing_runaways.sql
- patient-actions.ts
- process-optical-order.ts
- inventory-actions.ts
- compilerOptions
- dependencies
- report-actions.ts
- devDependencies
- OptixOS
- postcss.config.mjs
- Concurrency & Transaction Safety
- Monetary & Accounting Rules
- Optical Domain & Prescription Rules
- Stack & Runtime
- OptixOS README

## God Nodes (most connected - your core abstractions)
1. `react` - 30 edges
2. `lucide-react` - 24 edges
3. `Decimal.js` - 21 edges
4. `compilerOptions` - 16 edges
5. `drizzle-orm` - 13 edges
6. `PrintOrderData` - 12 edges
7. `db` - 12 edges
8. `sonner` - 12 edges
9. `POSPatient` - 10 edges
10. `InventoryItem` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AddFamilyMemberModalProps` --references--> `POSPatient`  [EXTRACTED]
  src/components/pos/add-family-member-modal.tsx → src/store/pos-store.ts
- `CartItemEditModalProps` --references--> `CartItem`  [EXTRACTED]
  src/components/pos/cart-item-edit-modal.tsx → src/components/pos/billing-cart.tsx
- `POSState` --references--> `PrintOrderData`  [EXTRACTED]
  src/store/pos-store.ts → src/components/pos/print-layouts.tsx
- `PrescriptionGridProps` --references--> `PatientPrescriptionHistory`  [EXTRACTED]
  src/components/pos/prescription-grid.tsx → src/actions/patient-actions.ts
- `CollectBalanceResult` --references--> `OrderStatus`  [EXTRACTED]
  src/actions/payment-actions.ts → src/db/schema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **3-Tier Architecture** — docs_prd_tier1, docs_prd_tier2, docs_prd_tier3 [EXTRACTED 1.00]

## Communities (22 total, 6 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.07
Nodes (56): Decimal.js, lucide-react, react, use-debounce, linkExistingCustomerToFamily(), PatientOrderHistoryItem, PatientPrescriptionHistory, AddFamilyMemberModal() (+48 more)

### Community 1 - "schema.ts"
Cohesion: 0.05
Nodes (52): drizzle-orm, @playwright/test, @upstash/redis, CollectBalanceResult, getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema (+44 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (33): scripts, build, check, db:generate, db:push, db:seed, dev, start (+25 more)

### Community 3 - "print-layouts.tsx"
Cohesion: 0.09
Nodes (29): getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, updateOrderStatus(), dynamic, LabOrdersPage(), metadata, LabOrdersView() (+21 more)

### Community 4 - "0000_dashing_runaways.sql"
Cohesion: 0.11
Nodes (30): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+22 more)

### Community 5 - "patient-actions.ts"
Cohesion: 0.10
Nodes (22): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), PatientDetailHistory, PatientSummary (+14 more)

### Community 6 - "process-optical-order.ts"
Cohesion: 0.09
Nodes (24): zod, generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, NegativeBalanceError, addSchema, axisSchema (+16 more)

### Community 7 - "inventory-actions.ts"
Cohesion: 0.22
Nodes (12): addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps, InventoryView() (+4 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless, next, next-themes (+8 more)

### Community 10 - "report-actions.ts"
Cohesion: 0.23
Nodes (11): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), resolveDateRange() (+3 more)

### Community 11 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 12 - "OptixOS"
Cohesion: 0.83
Nodes (4): OptixOS, Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **147 isolated node(s):** `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals`, `DiscountCellProps` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 177 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `print-layouts.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `report-actions.ts`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `pos-view.tsx` to `schema.ts`, `package.json`, `print-layouts.tsx`, `patient-actions.ts`, `process-optical-order.ts`, `inventory-actions.ts`, `report-actions.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `print-layouts.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `report-actions.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `ProductCategory`, `BillingCartProps`, `CalculatedCartLine` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06738738738738739 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05271629778672032 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.054878048780487805 - nodes in this community are weakly interconnected._