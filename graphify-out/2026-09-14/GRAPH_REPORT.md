# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 420 nodes · 848 edges · 29 communities (16 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1126cbb2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- schema.ts
- 0000_dashing_runaways.sql
- lab-orders-view.tsx
- prescription.ts
- print-layouts.tsx
- patient-actions.ts
- inventory-actions.ts
- compilerOptions
- settings-actions.ts
- package.json
- dependencies
- devDependencies
- report-actions.ts
- scripts
- @playwright/test
- OptixOS
- utils.ts
- tailwindcss
- Monetary & Accounting Rules
- postcss.config.mjs
- Concurrency & Transaction Safety
- Optical Domain Rules
- Security & RBAC Enforcement
- UI & Styling Standards
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
9. `InventoryItem` - 10 edges
10. `POSPatient` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AddFamilyMemberModalProps` --references--> `POSPatient`  [EXTRACTED]
  src/components/pos/add-family-member-modal.tsx → src/store/pos-store.ts
- `CartItemEditModalProps` --references--> `CartItem`  [EXTRACTED]
  src/components/pos/cart-item-edit-modal.tsx → src/components/pos/billing-cart.tsx
- `POSState` --references--> `PatientPrescriptionHistory`  [EXTRACTED]
  src/store/pos-store.ts → src/actions/patient-actions.ts
- `POSState` --references--> `PrintOrderData`  [EXTRACTED]
  src/store/pos-store.ts → src/components/pos/print-layouts.tsx
- `CollectBalanceResult` --references--> `OrderStatus`  [EXTRACTED]
  src/actions/payment-actions.ts → src/db/schema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Governance & Standards** — claude_stack, claude_ui_standards, claude_monetary_rules, claude_optical_rules [EXTRACTED 1.00]
- **3-Tier Architecture** — docs_prd_tier1, docs_prd_tier2, docs_prd_tier3 [EXTRACTED 1.00]

## Communities (29 total, 10 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.08
Nodes (47): Decimal.js, lucide-react, react, linkExistingCustomerToFamily(), AddFamilyMemberModal(), AddFamilyMemberModalProps, RELATION_OPTIONS, AddProductModal() (+39 more)

### Community 1 - "schema.ts"
Cohesion: 0.06
Nodes (47): drizzle-orm, @neondatabase/serverless, @upstash/redis, LabOrderItemDetail, CollectBalanceResult, generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult (+39 more)

### Community 2 - "0000_dashing_runaways.sql"
Cohesion: 0.11
Nodes (30): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+22 more)

### Community 3 - "lab-orders-view.tsx"
Cohesion: 0.11
Nodes (21): next, next-themes, sonner, getActiveLabOrders(), LabOrderSummary, updateOrderStatus(), collectBalance(), dynamic (+13 more)

### Community 4 - "prescription.ts"
Cohesion: 0.09
Nodes (24): PatientPrescriptionHistory, formatDioptre(), initialPrescriptionValues, parseDioptre(), PrescriptionGrid(), PrescriptionGridProps, StepField(), StepFieldProps (+16 more)

### Community 5 - "print-layouts.tsx"
Cohesion: 0.13
Nodes (17): WorkshopSlipModal(), WorkshopSlipModalProps, A4Invoice(), formatDiopter(), formatDiopter(), PrintCustomerData, PrintInvoiceItem, PrintOrderData (+9 more)

### Community 6 - "patient-actions.ts"
Cohesion: 0.13
Nodes (16): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), PatientDetailHistory, PatientOrderHistoryItem (+8 more)

### Community 7 - "inventory-actions.ts"
Cohesion: 0.20
Nodes (13): zod, addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps (+5 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "settings-actions.ts"
Cohesion: 0.20
Nodes (15): getInvoicePrintData(), getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata (+7 more)

### Community 10 - "package.json"
Cohesion: 0.13
Nodes (14): autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, postcss, react-dom, tsx (+6 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless, next, next-themes (+8 more)

### Community 12 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 13 - "report-actions.ts"
Cohesion: 0.25
Nodes (10): DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter, formatDateStr(), getDailyFinancials(), getFinancialsReport(), resolveDateRange() (+2 more)

### Community 14 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, db:generate, db:push, db:seed, dev, start (+2 more)

### Community 16 - "OptixOS"
Cohesion: 0.83
Nodes (4): OptixOS, Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **149 isolated node(s):** `PatientRelationMeta`, `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `pos-view.tsx` to `lab-orders-view.tsx`, `prescription.ts`, `print-layouts.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`, `package.json`, `report-actions.ts`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `pos-view.tsx` to `schema.ts`, `lab-orders-view.tsx`, `print-layouts.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`, `package.json`, `report-actions.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `pos-view.tsx` to `lab-orders-view.tsx`, `prescription.ts`, `print-layouts.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`, `package.json`, `report-actions.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `PatientRelationMeta`, `ProductCategory`, `BillingCartProps` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07836538461538461 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06093189964157706 - nodes in this community are weakly interconnected._
- **Should `0000_dashing_runaways.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._