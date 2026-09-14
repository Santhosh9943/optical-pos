# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 406 nodes · 819 edges · 22 communities (11 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5553b113`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- pos-view.tsx
- package.json
- react
- patient-actions.ts
- 0000_dashing_runaways.sql
- process-optical-order.ts
- inventory-actions.ts
- TypeScript Configuration
- settings-actions.ts
- devDependencies
- postcss.config.mjs
- Concurrency & Transaction Safety
- Monetary & Accounting Rules
- Optical Domain & Prescription Rules
- Stack & Runtime
- Decimal.js Monetary Engine
- Architecture & System Design Specification
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
- `CollectBalanceResult` --references--> `OrderStatus`  [EXTRACTED]
  src/actions/payment-actions.ts → src/db/schema.ts
- `AddFamilyMemberModalProps` --references--> `POSPatient`  [EXTRACTED]
  src/components/pos/add-family-member-modal.tsx → src/store/pos-store.ts
- `CartItemEditModalProps` --references--> `CartItem`  [EXTRACTED]
  src/components/pos/cart-item-edit-modal.tsx → src/components/pos/billing-cart.tsx
- `POSState` --references--> `PatientPrescriptionHistory`  [EXTRACTED]
  src/store/pos-store.ts → src/actions/patient-actions.ts
- `POSState` --references--> `PrintOrderData`  [EXTRACTED]
  src/store/pos-store.ts → src/components/pos/print-layouts.tsx

## Import Cycles
- None detected.

## Communities (22 total, 8 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.05
Nodes (49): drizzle-orm, @neondatabase/serverless, @playwright/test, collectBalance(), CollectBalanceResult, DailyFinancialsReport, DailyReportTransaction, DatePreset (+41 more)

### Community 1 - "pos-view.tsx"
Cohesion: 0.07
Nodes (47): lucide-react, next-themes, use-debounce, linkExistingCustomerToFamily(), PatientOrderHistoryItem, AddFamilyMemberModal(), AddFamilyMemberModalProps, RELATION_OPTIONS (+39 more)

### Community 2 - "package.json"
Cohesion: 0.04
Nodes (42): dependencies, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless, next, next-themes (+34 more)

### Community 3 - "react"
Cohesion: 0.09
Nodes (32): decimal.js, next, react, getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, updateOrderStatus(), dynamic (+24 more)

### Community 4 - "patient-actions.ts"
Cohesion: 0.09
Nodes (26): FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), PatientDetailHistory, PatientPrescriptionHistory (+18 more)

### Community 5 - "0000_dashing_runaways.sql"
Cohesion: 0.11
Nodes (30): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+22 more)

### Community 6 - "process-optical-order.ts"
Cohesion: 0.09
Nodes (23): zod, generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, NegativeBalanceError, addSchema, axisSchema (+15 more)

### Community 7 - "inventory-actions.ts"
Cohesion: 0.15
Nodes (15): sonner, addInventoryItem(), getInventoryList(), InventoryRow, metadata, AddInventoryForm(), AddInventoryFormProps, InventoryTable() (+7 more)

### Community 8 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "settings-actions.ts"
Cohesion: 0.23
Nodes (13): getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata, SettingsPage() (+5 more)

### Community 10 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

## Knowledge Gaps
- **145 isolated node(s):** `SettleBalanceModalProps`, `NewStoreProfile`, `ProductCategory`, `BillingCartProps`, `CalculatedCartLine` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `schema.ts`, `pos-view.tsx`, `package.json`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `decimal.js` connect `react` to `schema.ts`, `pos-view.tsx`, `package.json`, `patient-actions.ts`, `process-optical-order.ts`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `react`, `patient-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `SettleBalanceModalProps`, `NewStoreProfile`, `ProductCategory` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05285592497868713 - nodes in this community are weakly interconnected._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07067307692307692 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._