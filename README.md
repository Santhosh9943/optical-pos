# OptixOS — Next-Generation Retail Optical POS & Practice Management System

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=neon)](https://neon.tech/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Testing-45ba4b?logo=playwright)](https://playwright.dev/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1_AA_Compliant-8A2BE2)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OptixOS** is a domain-engineered, high-performance Point-of-Sale (POS) and Practice Management System built specifically for single-counter and multi-branch retail optical dispensaries and optometry clinics. It bridges clinical optometry workflows with modern retail ERP standards—handling dual-eye refraction capture, dynamic reciprocal family billing, clean customer loading, spectacle pair configuration, split-tender checkout, atomic inventory concurrency locks, lab order workshop pipeline tracking, and tri-output print engineering (80mm thermal receipt, workshop fabrication slip, and A4 laser tax invoice).

---

## 🏗️ Architectural Transition: Robust 3-Tier Architecture

OptixOS is architected on a strict **3-Tier Separation of Concerns** that guarantees data integrity, clinical precision, zero-leak financial security, and a responsive client experience.

```mermaid
graph TD
    subgraph Tier1["Tier 1: Presentation Layer (UI & Client State)"]
        UI_POS["POS Workspace (/pos/new-bill)"]
        UI_LAB["Lab Orders Kanban & Table (/admin/lab-orders)"]
        UI_INV["Inventory Management (/admin/inventory)"]
        UI_PAT["Patient Directory & Family (/admin/patients)"]
        UI_REP["Financial Reports & Z-Report (/admin/reports)"]
        STORE["Zustand Global Store (pos-store.ts)<br/>• Active Cart • Selected Patients • Rx State"]
        PRINT["Tri-Output Print Engine<br/>• 80mm Thermal • Workshop Slip • A4 Tax Invoice"]
        
        UI_POS <--> STORE
        UI_POS --> PRINT
        UI_LAB --> PRINT
    end

    subgraph Tier2["Tier 2: Business & Application Layer (Server Actions & Domain)"]
        ACT_ORDER["Order Processor<br/>(process-optical-order.ts)"]
        ACT_LAB["Lab Order Controller<br/>(lab-actions.ts)"]
        ACT_PAY["Payment & Settlement<br/>(payment-actions.ts)"]
        ACT_PAT["Patient & Family Service<br/>(patient-actions.ts)"]
        ACT_INV["Inventory Service<br/>(inventory-actions.ts)"]
        ACT_REP["Financial Analytics<br/>(report-actions.ts)"]
        API_SEARCH["Debounced API Endpoints<br/>(/api/inventory, /api/patients)"]
        
        DOMAIN_MATH["Decimal.js Monetary Engine<br/>• Subtotals • Tax Splits • Line Discounts"]
        DOMAIN_RX["Dioptric Math & Validation<br/>• Integer-scaling • Axis Invariants"]
        DOMAIN_FAM["Reciprocal Relationship Engine<br/>(patient-relationship.ts)"]
        
        ACT_ORDER --- DOMAIN_MATH
        ACT_ORDER --- DOMAIN_RX
        ACT_PAT --- DOMAIN_FAM
        ACT_PAY --- DOMAIN_MATH
        ACT_REP --- DOMAIN_MATH
    end

    subgraph Tier3["Tier 3: Data & Persistence Layer (PostgreSQL & Drizzle ORM)"]
        DB_CLIENT["Drizzle ORM Client (src/db/index.ts)"]
        POOLER["Neon / PostgreSQL Connection Pooler"]
        
        subgraph Tables["PostgreSQL Database Schema"]
            T_CUST[("customers<br/>• Primary & Dependent records<br/>• Dual phone architecture")]
            T_RX[("optical_prescriptions<br/>• OD/OS parameters<br/>• Axis range check [1-180]")]
            T_INV[("inventory_items<br/>• SKU & Barcode<br/>• Physical stock count")]
            T_INVOICE[("invoices<br/>• Sequential INV-YY-00000X<br/>• Status: ORDERED -> CLOSED")]
            T_ITEMS[("invoice_items<br/>• Line totals, HSN, Tax<br/>• Patient & Rx mapping")]
            T_PAY[("payments<br/>• Split tender (Cash, UPI, Card)<br/>• Audit trail")]
            SEQ[("invoice_number_seq<br/>• Atomic Sequence")]
        end
        
        DB_CLIENT --> POOLER
        POOLER --> Tables
    end

    Tier1 -- "Server Action Invocations & Debounced HTTP" --> Tier2
    Tier2 -- "Type-Safe Queries & Atomic Transactions" --> Tier3
```

### 1. Presentation Layer (Tier 1)
- **Framework & SPA Architecture:** Next.js 15 App Router client components (`'use client'`), React 19, and Tailwind CSS.
- **Fluid Full-Width Layouts:** Standardized page container architecture (`flex flex-col h-full w-full p-4 md:p-6 gap-4 md:gap-6`) eliminating awkward fixed wrappers and maximizing screen real-estate for busy POS counters.
- **Cross-Route Persistence (Zustand):** Volatile cart items, patient assignments, and clinical prescription state persist seamlessly across page transitions (`/pos/new-bill` ↔ `/admin/inventory` ↔ `/admin/patients` ↔ `/admin/lab-orders`).
- **Accessibility & Contrast (WCAG 2.1 AA):** 100% compliant with WCAG AA standards (4.5:1 contrast ratio, high-contrast dark mode palette, zero ambiguous `opacity-*` text, programmatic label associations, and WCAG 2.5.3 Label-in-Name conformity).
- **Keyboard-First Ergonomics:** Instant hotkeys (`F1`–`F10`) for all primary actions.

### 2. Business & Application Layer (Tier 2)
- **Type-Safe Server Actions:** Encapsulated domain services handling atomic transactions, state machine transitions, and financial calculations.
- **Arbitrary-Precision Monetary Engine (`decimal.js`):** All financial computations—subtotals, discounts, line totals, 5% (HSN 9001) / 18% (HSN 9003/9004) GST splits, and balance due—use arbitrary-precision math, completely eliminating native JavaScript floating-point errors.
- **Clinical Dioptric Validation:** Integer-scaled interval validation (`Math.round(val * 100) % 25 === 0`) enforcing 0.25 D step increments across Sphere, Cylinder, and Addition, coupled with Axis invariants (`CYL != 0` requires `AXIS ∈ [1, 180]`).
- **Dynamic Reciprocal Family Relationship Engine:** Perspective-aware relation mapping that dynamically recomputes relationship labels relative to the active invoice account, completely eliminating ambiguous `"Self"` labels.
- **Strict Query-Level RBAC & Cost Masking:** Wholesale cost prices (`cost_price`) and profit margins are omitted at the database projection query level—preventing sensitive commercial data leaks to client JavaScript bundles.

### 3. Data & Persistence Layer (Tier 3)
- **Database Engine:** PostgreSQL via Neon Serverless Postgres (or Supabase-compatible PostgreSQL) with connection pooling.
- **ORM & Type Safety:** Drizzle ORM (`drizzle-orm/pg-core`) providing full type inference and automated migrations via Drizzle Kit.
- **Atomic Row-Level Concurrency:** Stock deductions execute inside a PostgreSQL transaction using conditional atomic updates (`UPDATE ... WHERE stock_quantity >= :qty RETURNING id`), guaranteeing zero overselling and triggering automatic rollback if stock is exhausted.
- **Database-Level Sequences:** Gap-free, atomic invoice number generation powered by a PostgreSQL sequence (`INV-YY-00000X`).

> 📖 *For a deep dive into entity relationship diagrams, transaction lifecycles, architectural invariants, and the master Phase 1–12 roadmap, see [docs/PRD.md](docs/PRD.md).*

---

## 🌟 Key Accomplishments & Feature Modules

### 1. 👁️ Dual-Eye Clinical Refraction Matrix (OD / OS Grid)
- **Discrete Optical Data Modeling:** Independent, non-overlapping parameters for **Right Eye (OD — Oculus Dexter)** and **Left Eye (OS — Oculus Sinister)**.
- **IEEE-754 Safe Interval Validation:** Integer-scaled arithmetic enforcing 0.25 D step increments across Sphere (SPH), Cylinder (CYL), and Addition (ADD).
- **Axis Invariant Checking:** Strict conditional validation requiring Axis (1°–180°) if and only if Cylinder correction is non-zero.
- **Rapid Counter Controls:** Keyboard steppers (`+` and `−`), "Copy OD → OS" one-click replication, and clinical remarks expansion.
- **Prescription History Switcher:** Seamlessly switch between manual clinical prescription entry and previous historical Rx cards per patient with 1-click "Use in Order" application.

### 2. 👨‍👩‍👧‍👦 Dynamic Reciprocal Family Billing Engine (Zero "Self")
- **Perspective-Aware Relationship Resolution (`getDynamicRelationship`):**
  - Completely eliminates ambiguous `"Self"` labels across the entire POS and patient registry.
  - The currently active/selected patient is always designated as **`"Current"`**.
  - Connected family members' relationships dynamically compute **relative to the currently selected account**:
    - **Primary Selected:** Primary is `Current`, Child is `Child`, Sibling is `Sibling`, Spouse is `Spouse`.
    - **Child Selected:** Child is `Current`, Primary is `Father` or `Mother` (gender-derived), Sibling of primary is `Uncle` or `Aunt`.
    - **Sibling Selected:** Sibling is `Current`, Primary is `Brother` or `Sister`, Child of primary is `Nephew` or `Niece`.
    - **Spouse Selected:** Spouse is `Current`, Primary is `Husband` or `Wife`, Child of primary is `Son` or `Daughter`.
- **Conditional Invoice Account Selector:**
  - Embedded directly in the patient header: `👑 INVOICE ACCOUNT: <Name>`.
  - Intelligently disabled (`(Only 1 Member)`) when only one patient is on the order.
  - Dynamically activates when multiple family members are added to the order, allowing instant 1-click reassignment of the billing payer with real-time perspective updates across all tabs and dropdowns.
- **Underlying Topology Preservation (`rawRelationType`):** Retains base family tree relations in state so switching invoice perspectives preserves reciprocal accuracy without data loss.

### 3. 🧼 Clean Patient Loading & Dual-Phone Management
- **Single-Customer Clean Loading:** Selecting a patient loads only that individual onto the active order, avoiding visual clutter and unexpected items.
- **Add Family Member Modal (3 Modes):**
  - **Existing Family:** Lists linked family members with relationships relative to the primary account and a 1-click `+ Add to Order` action.
  - **Create New Member:** Registers a new dependent linked to the primary account with relationship selection.
  - **Link Existing Patient:** Searches the clinic registry to link pre-existing customer records to the family cluster.
- **Dual-Phone Architecture:**
  - Tracks both **Personal Own Mobile** and **Linked Primary Family Mobile**.
  - If a dependent lacks a phone, displays their linked primary phone with an inline `+ Update Own Number` action.
  - Once updated, both numbers remain accessible and editable without breaking historical invoice links.

### 4. 👓 Spectacle Pair Builder & Product Category Dispatcher
- **Spectacle Wizard Modal (3 Guided Steps):**
  1. *Frame Confirmation & Patient Assignment:* Confirms chassis specs, stock counts, target family member, and optional Customer's Own Frame (Glazing) mode.
  2. *Choose Lenses:* Selects lens type (Single Vision, Blue-Cut Digital, Progressive, Bifocal, Photochromic, Plano), index (CR-39, Polycarbonate, Trivex, High Index), and optical coatings.
  3. *Refraction Power:* Pre-fills from active prescription or allows custom dioptre overrides before adding to cart.
- **Product Category Dispatcher (`[F2]`):**
  - 6 dedicated optical categories: Complete Spectacles, Lens Only (with ₹0.00 frame chassis), Sunglasses, Contact Lenses, Lens Care Solutions, and Accessories.

### 5. 🔬 Lab Orders & Workshop Kanban Pipeline (`/admin/lab-orders`)
- **Dual View Layout:** Interactive **Kanban Board** with drag/click status progression and comprehensive **Table View** with search and filtering.
- **Optical Lifecycle State Machine:**
  $$\text{ORDERED} \longrightarrow \text{SENT\_TO\_LAB} \longrightarrow \text{IN\_FITTING} \longrightarrow \text{READY\_FOR\_COLLECTION} \longrightarrow \text{DELIVERED\_AND\_CLOSED}$$
- **Workshop Job Slip Modal:** Instant preview and printing of workshop fabrication job slips with full clinical OD/OS refraction details, chassis parameters, and strict financial redaction.
- **Balance Settlement on Delivery:** Seamless `SettleBalanceModal` allowing collection of remaining balances (Cash, UPI, Card) upon collection, automatically transitioning invoices to `DELIVERED_AND_CLOSED`.

### 6. 📊 Financial Reporting, Ledger & Z-Report (`/admin/reports`)
- **Daily Financial Analytics:** Real-time revenue summaries, total taxes collected, advances received, and outstanding balances.
- **Date Range Presets & Custom Filters:** 1-click presets (`Today`, `Yesterday`, `Last 7 Days`, `Last 30 Days`, `This Month`, `All Time`) plus a custom date range picker popover.
- **Payment Mode Distribution:** Real-time percentage and volume splits across Cash, UPI, Card, and Credit.
- **Detailed Transaction Ledger:** Itemized order-by-order audit trail with customer info, payment status, and order status.
- **Executive Print & Export:** Formatted Z-Report print output for daily cash drawer closeouts.

### 7. 🛡️ Atomic Concurrency & Inventory Rollback Engine
- **Row-Level Concurrency Guards:** Checkout executes inside a PostgreSQL `db.transaction` using conditional atomic updates:
  ```sql
  UPDATE inventory_items
  SET stock_quantity = stock_quantity - :qty
  WHERE id = :id AND stock_quantity >= :qty
  RETURNING id;
  ```
- **Zero Overselling / Negative Stock:** If stock is insufficient, the transaction returns 0 rows, raises `InsufficientStockError`, and triggers a full `ROLLBACK`.
- **Atomic Sequential Invoice Generation:** Gap-free invoice numbering driven by a PostgreSQL sequence (`INV-YY-00000X`).

### 8. 🖨️ Tri-Output Print Engineering
OptixOS features dedicated print layouts designed for specialized retail optical hardware:

| Print Target | Media Size | CSS Trigger | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer Thermal Receipt** | 80mm roll (72mm printable) | `body.print-mode-thermal` | Monospaced thermal typography, itemized HSN table, 5% and 18% GST splits, advance payment, and balance due. |
| **Workshop / Lab Job Slip** | A4 / A5 sheet | `body.print-mode-workshop` | Large job ticket header, frame chassis specs, full OD/OS matrix, lens parameters, and **strict CSS and DOM financial redaction** (`.financial-data { display: none !important; }`). |
| **Customer Laser Tax Invoice** | A4 sheet | `body.print-mode-a4` | High-contrast black-and-white border collapse table, formal GSTIN schedule, bank payment instructions, terms & conditions, and authorized signatory block. |

### 9. ⌨️ Keyboard-First Ergonomics
- **`F1`**: Start New Bill / Clear Canvas
- **`F2`**: Product Category Dispatcher
- **`F3`**: Focus Barcode / Inventory Search
- **`F5`**: Quick Print Thermal Receipt
- **`F10`**: Complete Order & Trigger Settlement

---

## 📂 Project Structure

```
optical-pos/
├── drizzle/                     # Drizzle SQL schema migrations & snapshots
├── docs/                        # Master Product Requirements Document & Architecture Specification
│   └── PRD.md                   # Unified PRD, 3-tier architecture & Phase 1-12 roadmap
├── e2e/                         # Playwright End-to-End test specifications
│   └── pos-checkout.spec.ts     # 10 comprehensive E2E workflow test scenarios
├── graphify-out/                # Architectural knowledge graph (Graphify)
│   ├── GRAPH_REPORT.md          # Communities, God Nodes & topological cohesion report
│   ├── graph.html               # Interactive visual knowledge graph
│   └── graph.json               # Raw graph nodes & edges dataset
├── src/
│   ├── actions/                 # Tier 2: Next.js Server Actions (Domain Controllers)
│   │   ├── inventory-actions.ts     # Inventory CRUD & low-stock audits
│   │   ├── lab-actions.ts           # Workshop status machine & job slip aggregator
│   │   ├── patient-actions.ts       # Patient, family linking & dual-phone management
│   │   ├── payment-actions.ts       # Balance collection & payment settlement
│   │   ├── process-optical-order.ts # Atomic transaction order processing & concurrency lock
│   │   └── report-actions.ts        # Z-Report, financial analytics & sales ledger
│   ├── app/                     # Next.js App Router
│   │   ├── (dashboard)/         # Dashboard Layout Group (persistent top bar & side nav)
│   │   │   ├── pos/new-bill/        # Main POS counter workspace
│   │   │   ├── admin/inventory/     # Inventory management & stock adjustments
│   │   │   ├── admin/lab-orders/    # Lab orders Kanban & workshop job slips
│   │   │   ├── admin/patients/      # Patient directory & clinical sheets
│   │   │   └── admin/reports/       # Financial reports & daily audit
│   │   ├── api/                 # API Routes (debounced search endpoints)
│   │   │   ├── inventory/search/    # Real-time debounced inventory search
│   │   │   └── patients/search/     # Real-time debounced telephone search
│   │   ├── globals.css          # Tailwind base & Tri-Output print stylesheet
│   │   └── layout.tsx           # Root layout with theme & toast providers
│   ├── components/              # Tier 1: UI Presentation Components
│   │   ├── admin/               # Administrative & workshop components
│   │   │   ├── add-inventory-form.tsx   # Product creation & stock intake
│   │   │   ├── inventory-table.tsx      # Stock list table
│   │   │   ├── inventory-view.tsx       # Inventory workspace
│   │   │   ├── lab-orders-view.tsx      # Lab orders Kanban & Table view
│   │   │   ├── patient-detail-sheet.tsx # Dual-phone & linked family editor sheet
│   │   │   ├── patients-view.tsx        # Patient registry table
│   │   │   ├── reports-view.tsx         # Financial reports & Z-report dashboard
│   │   │   ├── settle-balance-modal.tsx # Balance collection & delivery modal
│   │   │   └── workshop-slip-modal.tsx  # Workshop job ticket preview modal
│   │   ├── layout/              # Shared navigation & header controls
│   │   └── pos/                 # Modular POS client components
│   │       ├── add-family-member-modal.tsx  # Existing family, new member & link patient modal
│   │       ├── add-product-modal.tsx        # 6-category product dispatcher modal [F2]
│   │       ├── billing-cart.tsx             # Dynamic cart table with patient assignment
│   │       ├── cart-item-edit-modal.tsx     # Line item editor & discount inspector
│   │       ├── inventory-search.tsx         # Debounced inventory dropdown
│   │       ├── invoice-details-modal.tsx    # Custom billing recipient & tax overrides
│   │       ├── patient-search.tsx           # Debounced patient telephone search
│   │       ├── payment-panel.tsx            # Split-tender & balance calculation
│   │       ├── pos-view.tsx                 # Main two-column POS workspace
│   │       ├── prescription-grid.tsx        # Dual-eye OD/OS clinical matrix & tabs
│   │       ├── print-a4-invoice.tsx         # Executive A4 laser tax invoice
│   │       ├── print-layouts.tsx            # 80mm thermal receipt & workshop slip
│   │       └── spectacle-wizard-modal.tsx   # 3-step Spectacle Pair Builder
│   ├── db/                      # Tier 3: Data & Persistence Layer
│   │   ├── index.ts             # Neon serverless database client
│   │   ├── schema.ts            # Drizzle PostgreSQL schema definitions
│   │   └── seed.ts              # Seed fixture (customers, inventory, prescriptions, orders)
│   ├── lib/                     # Domain Utilities & Invariants
│   │   ├── errors.ts            # Domain error classes (InsufficientStockError, etc.)
│   │   ├── patient-relationship.ts # Dynamic reciprocal relationship engine
│   │   ├── utils.ts             # Tailwind class merge helper
│   │   └── validators/          # Zod validation schemas
│   └── store/                   # Client State Management
│       └── pos-store.ts         # Zustand global POS state (cart, patients, prescriptions)
├── playwright.config.ts         # Playwright test configuration
├── package.json                 # Project dependencies & scripts
├── tailwind.config.ts           # Tailwind configuration
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or later (tested on Node v20/v24)
- **Package Manager**: `npm` (or `pnpm` / `yarn`)
- **PostgreSQL Database**: Neon serverless database account or PostgreSQL instance (Supabase compatible)

### 1. Clone the Repository
```bash
git clone https://github.com/Santhosh9943/optical-pos.git
cd optical-pos
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Provide your PostgreSQL connection string in `.env.local`:
```env
DATABASE_URL="postgresql://user:password@ep-your-pooler.region.aws.neon.tech/optical-pos?sslmode=require"
```

### 4. Synchronize Database & Seed Fixture
Push the schema to your database:
```bash
npm run db:push
```
Populate mock customers, optical prescriptions, inventory items with 5%/18% GST splits, and sample invoices:
```bash
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The application will automatically route to `/pos/new-bill`.

---

## 🧪 Testing Suite & CI Pipeline

### 1. Local CI Pipeline Gatekeeper
To guarantee zero regressions and strict compliance across linting, type-safety, and end-to-end functionality, run:
```bash
npm run validate
```
This runs:
1. `next lint` (ESLint 9 static analysis & accessibility rules)
2. `tsc --noEmit` (TypeScript strict mode compilation check)
3. `npm run test:e2e` (Playwright End-to-End test suite)

### 2. Automated Playwright End-to-End Tests
OptixOS includes an automated Playwright test suite covering all critical workflows:

```bash
# Run all end-to-end tests
npm run test:e2e

# Run targeted test workflows
npx playwright test e2e/pos-checkout.spec.ts -g "Test Case 3|Test Case 4|Test Case 5|Test Case 9"
```

| Test Case | Scenario | Description |
| :---: | :--- | :--- |
| **TC 1** | **SPA State Persistence** | Preserves active cart and patient across route navigation (`/pos/new-bill` ↔ `/admin/inventory`). |
| **TC 2** | **Atomic Stock Protection** | Verifies insufficient stock blocks sale and prevents overselling. |
| **TC 3** | **Family Billing Workflow** | Creates dependents, renders multi-family tabs, checks OD/OS dioptres, assigns line items. |
| **TC 4** | **Spectacle Wizard** | 3-step configuration: Frame Confirmation -> Lens Selection -> Power Assignment. |
| **TC 5** | **Link Existing Patient** | Modal search, relationship selection, link to primary account, family strip auto-update. |
| **TC 6** | **Prescription History & New Power** | Auto-loads history cards, toggles stepper matrix via `+ Add New Power`, saves new power to DB. |
| **TC 7** | **Product Dispatcher (6 Categories)** | Opens dispatcher via `+ Add Product [F2]`, executes "Lens Only" with ₹0.00 frame + custom lens. |
| **TC 8** | **Cart Item Edit & Invoice Overrides** | Edits cart item discount in `CartItemEditModal`, customizes corporate invoice recipient in `InvoiceDetailsModal`. |
| **TC 9** | **Clean Loading & POS Purchase History** | Asserts single-customer clean load, views past purchase invoices, adds existing family member via modal. |
| **TC 10** | **Dependent Phone Architecture** | Verifies dual phone display and Tab 3 ("Linked Family") segregated phone badges and editing. |

### 3. Continuous Architectural Knowledge Graph (`graphify`)
To ensure the architectural knowledge graph remains perfectly synchronized with the active codebase, OptixOS mandates running `graphify .` after passing CI validation:
```bash
graphify .
```
This updates the graph manifest in `graphify-out/` and keeps all structural hubs, community clusters, and god node abstractions in sync.

---

## 📋 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run build` | Compiles the production build |
| `npm run start` | Launches the Next.js production server |
| `npm run lint` | Runs ESLint checks |
| `npm run check` | Runs linting and static TypeScript type check (`tsc --noEmit`) |
| `npm run validate` | Complete CI verification (`next lint && tsc --noEmit && npm run test:e2e`) |
| `npm run test:e2e` | Executes the Playwright end-to-end test suite |
| `npm run db:push` | Pushes Drizzle schema directly to PostgreSQL database |
| `npm run db:generate` | Generates new SQL migration files |
| `npm run db:seed` | Populates mock inventory, patients, and optical data |
| `graphify .` | Updates the architectural knowledge graph in `graphify-out/` |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
