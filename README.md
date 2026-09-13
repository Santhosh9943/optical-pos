# OptixOS — Next-Generation Retail Optical POS & Practice Management System

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=neon)](https://neon.tech/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Testing-45ba4b?logo=playwright)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OptixOS** is a high-velocity, domain-engineered Point-of-Sale (POS) and practice management system built specifically for single-counter and multi-branch retail optical practices. It bridges clinical optometry workflows with modern retail ERP standards—handling dual-eye refraction capture, dynamic reciprocal family billing, clean customer loading, split-tender checkout, atomic inventory concurrency locks, and tri-output print engineering (80mm thermal, workshop fabrication slip, and A4 laser invoice).

---

## 🌟 Key Highlights & Domain Capabilities

### 1. 👁️ Dual-Eye Clinical Refraction Matrix (OD / OS Grid)
- **Discrete Optical Data Modeling:** Independent, non-overlapping parameters for **Right Eye (OD — Oculus Dexter)** and **Left Eye (OS — Oculus Sinister)**.
- **IEEE-754 Safe Dioptric Interval Validation:** Uses integer-scaled arithmetic (`Math.round(val * 100) % 25 === 0`) to enforce exact 0.25 D step increments across Sphere (SPH), Cylinder (CYL), and Addition (ADD), preventing floating-point rounding bugs.
- **Axis Check Rules:** Strict conditional validation requiring Axis (1°–180°) if and only if Cylinder correction is non-zero.
- **High-Velocity Counter Controls:** Keyboard-friendly rapid step steppers (`+` and `−`), "Copy OD → OS" one-click replication, and clinical notes expansion.
- **Prescription History Switcher:** Seamlessly switch between clinical prescription entry and previous historical Rx cards per patient with 1-click "Use in Order" application.

### 2. 👨‍👩‍👧‍👦 Dynamic Reciprocal Family Billing Engine (Zero "Self")
- **Perspective-Aware Relationship Resolution (`getDynamicRelationship`):**
  - Completely eliminates ambiguous `"Self"` labels across the entire POS and patient registry.
  - The currently active/selected patient is always designated as **`"Current"`**.
  - All connected family members' relationships dynamically compute **relative to the currently selected account**:
    - **Primary Selected:** Primary is `Current`, Child is `Child`, Sibling is `Sibling`, Spouse is `Spouse`.
    - **Child Selected:** Child is `Current`, Primary is `Father` or `Mother` (gender-derived), Sibling of primary is `Uncle` or `Aunt`.
    - **Sibling Selected:** Sibling is `Current`, Primary is `Brother` or `Sister`, Child of primary is `Nephew` or `Niece`.
    - **Spouse Selected:** Spouse is `Current`, Primary is `Husband` or `Wife`, Child of primary is `Son` or `Daughter`.
- **Conditional Invoice Account Selector:**
  - Embedded directly in the patient header: `👑 INVOICE ACCOUNT: <Name>`.
  - Intelligently disabled (`(Only 1 Member)`) when only one patient is on the order.
  - Dynamically activates when multiple family members are added to the order, allowing instant 1-click reassignment of the billing payer with real-time perspective updates across all tabs and dropdowns.
- **Underlying Topology Preservation (`rawRelationType`):** Retains base family tree relations in state so switching invoice perspectives preserves reciprocal accuracy without data loss.

### 3. 🧼 Clean Patient Loading & Family Group Management
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

### 5. ⚡ Sub-150ms Inventory Lookup & Dynamic Cart
- **Concatenated Search Index:** Real-time debounced lookup matching multi-word queries spanning Brand, Model, and SKU (e.g., `"Titan TI 5001"`, `"Ray-Ban Wayfarer"`).
- **Strict RBAC & Cost Masking:** Wholesale cost prices (`costPrice`) are omitted at the database projection query level—preventing sensitive profit margin leaks to client bundles.
- **100% `decimal.js` Monetary Engine:** All tax calculations, item discounts, taxable values, and invoice totals are computed with arbitrary-precision decimal math, completely avoiding native JavaScript floating-point errors.
- **SPA State Persistence (Zustand):** Volatile cart line items, selected patients, and clinical refraction values persist across dashboard navigation (`/pos/new-bill` ↔ `/admin/inventory` ↔ `/admin/patients`).

### 6. 🛡️ Atomic Concurrency & Inventory Rollback Engine
- **Row-Level Concurrency Guards:** Checkout executes inside a PostgreSQL `db.transaction` using conditional atomic updates:
  ```sql
  UPDATE inventory_items
  SET stock_quantity = stock_quantity - :qty
  WHERE id = :id AND stock_quantity >= :qty
  RETURNING id;
  ```
- **Zero Overselling / Negative Stock:** If stock is insufficient, the transaction returns 0 rows, raises `InsufficientStockError`, and triggers a full `ROLLBACK`.
- **Atomic Sequential Invoice Generation:** Gap-free invoice numbering driven by a PostgreSQL sequence (`INV-YY-00000X`).

### 7. 🖨️ Tri-Output Print Engineering
OptixOS features dedicated print layouts designed for specialized retail optical hardware:

| Print Target | Media Size | CSS Trigger | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer Thermal Receipt** | 80mm roll (72mm printable) | `body.print-mode-thermal` | Monospaced thermal typography, itemized HSN table, 5% and 18% GST splits, advance payment, and balance due. |
| **Workshop / Lab Job Slip** | A4 / A5 sheet | `body.print-mode-workshop` | Large job ticket header, frame chassis specs, full OD/OS matrix, lens parameters, and **strict CSS financial redaction** (`.financial-data { display: none !important; }`). |
| **Customer Laser Tax Invoice** | A4 sheet | `body.print-mode-a4` | High-contrast black-and-white border collapse table, formal GSTIN schedule, bank payment instructions, terms & conditions, and authorized signatory block. |

### 8. ⌨️ Keyboard-First Ergonomics
- **`F1`**: Start New Bill / Clear Canvas
- **`F2`**: Product Category Dispatcher
- **`F3`**: Focus Barcode / Inventory Search
- **`F5`**: Quick Print Thermal Receipt
- **`F10`**: Complete Order & Trigger Settlement

---

## 🏗️ Architecture & Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Components & Server Actions, React 19)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode, 100% typed)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Neon Serverless Postgres](https://neon.tech/) (Connection Pooler)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/) with Drizzle Kit migrations
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) with cross-route SPA persistence
- **Styling & Theming:** [Tailwind CSS](https://tailwindcss.com/) with full light/dark mode support and `@media print` layouts
- **Validation:** [Zod v3+](https://zod.dev/) with integer-scaled dioptric refinements
- **Financial Math:** [Decimal.js](https://mikemcl.github.io/decimal.js/)
- **Automated Testing:** [Playwright](https://playwright.dev/) End-to-End test suite

---

## 📂 Project Structure

```
optical-pos/
├── drizzle/                     # Drizzle SQL schema migrations & snapshots
├── docs/                        # Product Requirements Document (PRD) & architectural specifications
├── e2e/                         # Playwright End-to-End test specifications
│   └── pos-checkout.spec.ts     # 10 comprehensive E2E workflow test scenarios
├── src/
│   ├── actions/                 # Next.js Server Actions
│   │   ├── inventory-actions.ts     # Inventory CRUD & low-stock audits
│   │   ├── patient-actions.ts       # Patient, family linking & dual-phone management
│   │   ├── process-optical-order.ts # Atomic transaction order processing & concurrency lock
│   │   └── report-actions.ts        # Z-Report, sales metrics & tax summaries
│   ├── app/                     # Next.js App Router
│   │   ├── (dashboard)/         # Dashboard Layout Group (persistent top bar & side nav)
│   │   │   ├── pos/new-bill/        # Main POS counter workspace
│   │   │   ├── admin/inventory/     # Inventory management & stock adjustments
│   │   │   ├── admin/patients/      # Patient directory & clinical sheets
│   │   │   └── admin/reports/       # Financial reports & daily audit
│   │   ├── api/                 # API Routes (debounced search endpoints)
│   │   ├── globals.css          # Tailwind base & Tri-Output print stylesheet
│   │   └── layout.tsx           # Root layout with theme & toast providers
│   ├── components/
│   │   ├── admin/               # Administrative & clinical detail components
│   │   │   └── patient-detail-sheet.tsx # Dual-phone & linked family editor sheet
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
│   ├── db/
│   │   ├── index.ts             # Neon serverless database client
│   │   ├── schema.ts            # Drizzle PostgreSQL schema definitions
│   │   └── seed.ts              # Seed fixture (customers, inventory, prescriptions, orders)
│   ├── lib/
│   │   ├── errors.ts            # Domain error classes (InsufficientStockError, etc.)
│   │   ├── patient-relationship.ts # Dynamic reciprocal relationship engine
│   │   ├── utils.ts             # Tailwind class merge helper
│   │   └── validators/          # Zod validation schemas
│   └── store/
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
- **PostgreSQL Database**: Neon serverless database account or local PostgreSQL instance

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
Provide your Neon serverless PostgreSQL connection string in `.env.local`:
```env
DATABASE_URL="postgresql://user:password@ep-your-pooler.region.aws.neon.tech/optical-pos?sslmode=require"
```

### 4. Synchronize Database & Seed Fixture
Push the schema to your database:
```bash
npm run db:push
```
Populate mock customers, optical prescriptions, inventory items with 5%/18% GST splits, and a sample invoice:
```bash
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The application will automatically route to `/pos/new-bill`.

---

## 🧪 Testing Suite

### 1. Automated Playwright End-to-End Tests
OptixOS includes an automated Playwright test suite covering all critical workflows:

```bash
# Run all end-to-end tests
npx playwright test

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

### 2. Manual Concurrency Verification
To verify that the system blocks overselling and guarantees atomic rollbacks under concurrent demand:
1. In the POS inventory search, search for **Titan TI 5001** (`FRM-TI-5001-GLD`, seeded with **8 units**).
2. Add the frame to the cart and increment the quantity to **10 units**.
3. Click **"Complete Order (F10)"**.
4. **Result:** The system immediately blocks the sale, surfaces a red Sonner error toast (`Checkout Failed: INSUFFICIENT_STOCK — Insufficient stock for SKU "FRM-TI-5001-GLD": requested 10, available 8`), and preserves the original database stock count at 8 units without creating any phantom invoices.

---

## 📋 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run build` | Compiles the production build |
| `npm run start` | Launches the Next.js production server |
| `npm run lint` | Runs ESLint checks |
| `npx tsc --noEmit` | Validates TypeScript types across the entire codebase |
| `npx playwright test` | Executes the Playwright end-to-end test suite |
| `npm run db:push` | Pushes Drizzle schema directly to PostgreSQL database |
| `npm run db:generate` | Generates new SQL migration files |
| `npm run db:seed` | Populates mock inventory, patients, and optical data |
| `npm run db:studio` | Launches Drizzle Studio GUI for visual database management |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
