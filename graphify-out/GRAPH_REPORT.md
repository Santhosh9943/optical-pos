# Graph Report - optical-pos  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 553 nodes · 1166 edges · 39 communities (20 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52339878`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pos-view.tsx
- react
- patient-detail-sheet.tsx
- report-actions.ts
- schema.ts
- 0000_dashing_runaways.sql
- process-optical-order.ts
- inventory-actions.ts
- auth-utils.ts
- compilerOptions
- 0003_lying_captain_stacy.sql
- dependencies
- settings-actions.ts
- package.json
- devDependencies
- getCurrentSession
- scripts
- @playwright/test
- seed.ts
- app/layout.tsx
- utils.ts
- Tier 2: Business & Application Layer
- dotenv
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
1. `react` - 42 edges
2. `lucide-react` - 36 edges
3. `getCurrentSession()` - 23 edges
4. `sonner` - 22 edges
5. `Decimal.js` - 21 edges
6. `useTenantStore` - 19 edges
7. `compilerOptions` - 16 edges
8. `drizzle-orm` - 15 edges
9. `db` - 15 edges
10. `invoices` - 13 edges

## Surprising Connections (you probably didn't know these)
- `invoice_branch_idx` --indexes--> `invoices`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `invoice_organization_idx` --indexes--> `invoices`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `payment_branch_idx` --indexes--> `payments`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `payment_organization_idx` --indexes--> `payments`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts
- `customers_organization_idx` --indexes--> `customers`  [EXTRACTED]
  drizzle/0002_cute_molly_hayes.sql → src/db/schema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Governance & Standards** — claude_stack, claude_ui_standards, claude_monetary_rules, claude_optical_rules [EXTRACTED 1.00]

## Communities (39 total, 14 thin omitted)

### Community 0 - "pos-view.tsx"
Cohesion: 0.06
Nodes (66): Decimal.js, lucide-react, use-debounce, FamilyMemberLinkInfo, getLinkedFamilyGroup(), getPatientOrderHistory(), getPatientPrescriptions(), getPatients() (+58 more)

### Community 1 - "react"
Cohesion: 0.09
Nodes (35): react, sonner, createBranchAction(), createOrganizationAction(), createStaffMemberAction(), getOrganizationBranchesAction(), getStaffMembersAction(), getSuperAdminPlatformMetrics() (+27 more)

### Community 2 - "patient-detail-sheet.tsx"
Cohesion: 0.06
Nodes (39): getActiveLabOrders(), LabOrderItemDetail, LabOrderSummary, updateOrderStatus(), getPatientHistory(), PatientDetailHistory, updateCustomerPhone(), collectBalance() (+31 more)

### Community 3 - "report-actions.ts"
Cohesion: 0.09
Nodes (33): "branches", branches_organization_idx, customers_organization_idx, customers_primary_customer_idx, inventory_branch_idx, inventory_organization_idx, invoice_branch_idx, invoice_item_patient_idx (+25 more)

### Community 4 - "schema.ts"
Cohesion: 0.06
Nodes (33): account, accountRelations, Branch, branchesRelations, coatingEnum, customersRelations, genderEnum, inventoryCategoryEnum (+25 more)

### Community 5 - "0000_dashing_runaways.sql"
Cohesion: 0.12
Nodes (29): "customers", customers_phone_idx, customers_phone_unique_idx, inventory_barcode_idx, inventory_brand_model_idx, inventory_category_idx, "inventory_items", inventory_low_stock_idx (+21 more)

### Community 6 - "process-optical-order.ts"
Cohesion: 0.09
Nodes (23): generateInvoiceNumber(), processOpticalOrder(), ProcessOrderResult, InsufficientStockError, NegativeBalanceError, addSchema, axisSchema, CreateOrderInput (+15 more)

### Community 7 - "inventory-actions.ts"
Cohesion: 0.20
Nodes (13): zod, addInventoryItem(), getInventoryList(), InventoryRow, AddInventoryForm(), AddInventoryFormProps, InventoryTable(), InventoryTableProps (+5 more)

### Community 8 - "auth-utils.ts"
Cohesion: 0.21
Nodes (13): drizzle-orm, CollectBalanceResult, { GET, POST }, db, pool, organizations, PaymentStatus, auth (+5 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "0003_lying_captain_stacy.sql"
Cohesion: 0.19
Nodes (17): "account", account_userId_idx, "invitation", invitation_email_idx, invitation_organizationId_idx, "member", member_organizationId_idx, member_userId_idx (+9 more)

### Community 11 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth, @better-fetch/fetch, clsx, decimal.js, drizzle-orm, lucide-react, @neondatabase/serverless (+10 more)

### Community 12 - "settings-actions.ts"
Cohesion: 0.21
Nodes (14): getStoreProfile(), StoreProfileInput, StoreProfileResult, storeProfileSchema, updateStoreProfile(), dynamic, metadata, SettingsPage() (+6 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (15): autoprefixer, better-auth, @better-fetch/fetch, eslint, eslint-config-next, @neondatabase/serverless, postcss, react-dom (+7 more)

### Community 14 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, postcss (+6 more)

### Community 15 - "getCurrentSession"
Cohesion: 0.27
Nodes (8): dynamic, GET(), dynamic, GET(), getCurrentSession(), cacheGet(), cacheSet(), redis

### Community 16 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, db:generate, db:push, db:seed, dev, start (+2 more)

### Community 18 - "seed.ts"
Cohesion: 0.25
Nodes (6): inventoryItems, invoiceItems, opticalPrescriptions, seedCustomers, seedInventory, seedPrescriptions

### Community 19 - "app/layout.tsx"
Cohesion: 0.33
Nodes (4): next, next-themes, metadata, ThemeProvider()

### Community 21 - "Tier 2: Business & Application Layer"
Cohesion: 0.67
Nodes (3): Tier 1: Presentation Layer, Tier 2: Business & Application Layer, Tier 3: Data & Persistence Layer

## Knowledge Gaps
- **182 isolated node(s):** `FamilyMemberLinkInfo`, `ProductCategory`, `BillingCartProps`, `CalculatedCartLine`, `CartTotals` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 224 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `pos-view.tsx`, `patient-detail-sheet.tsx`, `report-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`, `package.json`, `app/layout.tsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `pos-view.tsx` to `react`, `patient-detail-sheet.tsx`, `report-actions.ts`, `inventory-actions.ts`, `settings-actions.ts`, `package.json`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `invoices` connect `report-actions.ts` to `pos-view.tsx`, `react`, `patient-detail-sheet.tsx`, `schema.ts`, `process-optical-order.ts`, `auth-utils.ts`, `seed.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `FamilyMemberLinkInfo`, `ProductCategory`, `BillingCartProps` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pos-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05642633228840126 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.09013914095583787 - nodes in this community are weakly interconnected._
- **Should `patient-detail-sheet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06289308176100629 - nodes in this community are weakly interconnected._