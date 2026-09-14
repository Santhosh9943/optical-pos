# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 410 nodes · 821 edges · 26 communities (14 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc1d8727`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- schema.ts
- package.json
- patient-detail-sheet.tsx
- 0000_dashing_runaways.sql
- prescription.ts
- lab-orders-view.tsx
- patient-actions.ts
- inventory-actions.ts
- compilerOptions
- settings-actions.ts
- dependencies
- devDependencies
- Tier 2: Business & Application Layer
- postcss.config.mjs
- Concurrency & Transaction Safety
- Monetary & Accounting Rules
- Optical Domain & Prescription Rules
- Stack & Runtime
- Decimal.js
- OptixOS System
- Graphify Semantic Engine
- OptixOS README

## God Nodes (most connected - your core abstractions)
1. `react` - 30 edges
2. `lucide-react` - 24 edges
3. `decimal.js` - 21 edges
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
- `LabOrderSummary` --references--> `OrderStatus`  [EXTRACTED]
  src/actions/lab-actions.ts → src/db/schema.ts

## Import Cycles
- None detected.

## Communities (26 total, 9 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.08
Nodes (49): decimal.js, lucide-react, react, use-debounce, linkExistingCustomerToFamily(), PatientOrderHistoryItem, AddFamilyMemberModal(), AddFamilyMemberModalProps (+41 more)

### Community 1 - "schema.ts"
Cohesion: 0.07
Nodes (46): drizzle-orm, LabOrderItemDetail, CollectBalanceResult, ProcessOrderResult, DailyFinancialsReport, DailyReportTransaction, DatePreset, FinancialsReportFilter (+38 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (29): scripts, build, check, db:generate, db:push, db:seed, dev, start (+21 more)

### Community 3 - "patient-detail-sheet.tsx"
Cohesion: 0.10
Nodes (23): getPatientHistory(), PatientDetailHistory, updateCustomerPhone(), getInvoicePrintData(), PatientDetailSheet(), PatientDetailSheetProps, WorkshopSlipModal(), WorkshopSlipModalProps (+15 more)

### Community 4 - "0000_dashing_runaways.sql"
Cohesion: 0.11
Nodes (30): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+22 more)

### Community 5 - "prescription.ts"
Cohesion: 0.08
Nodes (26): PatientPrescriptionHistory, formatDioptre(), initialPrescriptionValues, parseDioptre(), PrescriptionGrid(), PrescriptionGridProps, StepField(), StepFieldProps (+18 more)

### Community 6 - "lab-orders-view.tsx"
Cohesion: 0.11
Nodes (19): next, next-themes, sonner, getActiveLabOrders(), LabOrderSummary, updateOrderStatus(), collectBalance(), dynamic (+11 more)

### Community 7 - "patient-actions.ts"
Cohesion: 0.12
Nodes (14): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), PatientSummary, saveNewPrescription(), generateInvoiceNumber() (+6 more)

### Community 8 - "inventory-actions.ts"
Cohesion: 0.20
Nodes (13): zod, addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps (+5 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "settings-actions.ts"
Cohesion: 0.23
Nodes (13): getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata, SettingsPage() (+5 more)

### Community 11 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless, next, next-themes (+7 more)

### Community 12 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 13 - "Tier 2: Business & Application Layer"
Cohesion: 0.67
Nodes (3): Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **149 isolated node(s):** `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals`, `DiscountCellProps` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 179 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `patient-detail-sheet.tsx`, `prescription.ts`, `lab-orders-view.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `decimal.js` connect `pos-view.tsx` to `schema.ts`, `package.json`, `patient-detail-sheet.tsx`, `lab-orders-view.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `patient-detail-sheet.tsx`, `prescription.ts`, `lab-orders-view.tsx`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `ProductCategory`, `BillingCartProps`, `CalculatedCartLine` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07553143374038897 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06927551560021153 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._