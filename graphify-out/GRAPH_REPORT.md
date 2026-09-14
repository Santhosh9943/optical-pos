# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 419 nodes · 847 edges · 25 communities (15 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fa8cdd0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- pos-view.tsx
- package.json
- patient-actions.ts
- 0000_dashing_runaways.sql
- lab-orders-view.tsx
- print-layouts.tsx
- inventory-actions.ts
- compilerOptions
- settings-actions.ts
- prescription.ts
- dependencies
- scripts
- app/layout.tsx
- OptixOS
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
- `CollectBalanceResult` --references--> `OrderStatus`  [EXTRACTED]
  src/actions/payment-actions.ts → src/db/schema.ts
- `PrescriptionGridProps` --references--> `PatientPrescriptionHistory`  [EXTRACTED]
  src/components/pos/prescription-grid.tsx → src/actions/patient-actions.ts
- `CartItemEditModalProps` --references--> `CartItem`  [EXTRACTED]
  src/components/pos/cart-item-edit-modal.tsx → src/components/pos/billing-cart.tsx
- `LabOrderSummary` --references--> `PrintOrderData`  [EXTRACTED]
  src/actions/lab-actions.ts → src/components/pos/print-layouts.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Governance & Standards** — claude_stack, claude_ui_standards, claude_monetary_rules, claude_optical_rules [EXTRACTED 1.00]
- **3-Tier Architecture** — docs_prd_tier1, docs_prd_tier2, docs_prd_tier3 [EXTRACTED 1.00]

## Communities (25 total, 7 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.05
Nodes (58): drizzle-orm, @neondatabase/serverless, @upstash/redis, LabOrderItemDetail, CollectBalanceResult, generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult (+50 more)

### Community 1 - "pos-view.tsx"
Cohesion: 0.08
Nodes (51): Decimal.js, lucide-react, react, use-debounce, PatientPrescriptionHistory, AddProductModal(), AddProductModalProps, CATEGORIES (+43 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (32): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+24 more)

### Community 3 - "patient-actions.ts"
Cohesion: 0.10
Nodes (22): sonner, FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientHistory(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients(), linkExistingCustomerToFamily() (+14 more)

### Community 4 - "0000_dashing_runaways.sql"
Cohesion: 0.11
Nodes (30): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+22 more)

### Community 5 - "lab-orders-view.tsx"
Cohesion: 0.13
Nodes (18): next, getActiveLabOrders(), LabOrderSummary, updateOrderStatus(), collectBalance(), dynamic, LabOrdersPage(), metadata (+10 more)

### Community 6 - "print-layouts.tsx"
Cohesion: 0.13
Nodes (14): A4Invoice(), formatDiopter(), formatDiopter(), PrintCustomerData, PrintInvoiceItem, PrintPrescriptionData, WorkshopSlip(), A4TaxInvoice() (+6 more)

### Community 7 - "inventory-actions.ts"
Cohesion: 0.20
Nodes (13): zod, addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps (+5 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "settings-actions.ts"
Cohesion: 0.20
Nodes (15): getInvoicePrintData(), getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata (+7 more)

### Community 10 - "prescription.ts"
Cohesion: 0.12
Nodes (16): addSchema, axisSchema, cylinderSchema, InvoiceBillingDetailsInput, invoiceBillingDetailsSchema, InvoiceItemInput, invoiceItemSchema, isQuarterStep() (+8 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless, next, next-themes (+8 more)

### Community 12 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, db:generate, db:push, db:seed, dev, start (+2 more)

### Community 13 - "app/layout.tsx"
Cohesion: 0.24
Nodes (4): next-themes, metadata, ThemeProvider(), ThemeToggle()

### Community 14 - "OptixOS"
Cohesion: 0.83
Nodes (4): OptixOS, Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **149 isolated node(s):** `LabOrderItemDetail`, `ProcessOrderResult`, `NewStoreProfile`, `ProductCategory`, `BillingCartProps` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 179 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `patient-actions.ts`, `lab-orders-view.tsx`, `print-layouts.tsx`, `inventory-actions.ts`, `settings-actions.ts`, `app/layout.tsx`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `Decimal.js` connect `pos-view.tsx` to `schema.ts`, `package.json`, `patient-actions.ts`, `lab-orders-view.tsx`, `print-layouts.tsx`, `inventory-actions.ts`, `settings-actions.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `pos-view.tsx` to `schema.ts`, `package.json`, `patient-actions.ts`, `lab-orders-view.tsx`, `inventory-actions.ts`, `settings-actions.ts`, `app/layout.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `LabOrderItemDetail`, `ProcessOrderResult`, `NewStoreProfile` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0798076923076923 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.048726467331118496 - nodes in this community are weakly interconnected._