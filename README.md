# OptixOS — Next-Generation Retail Optical POS & Practice Management System

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=neon)](https://neon.tech/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OptixOS** is a high-velocity, domain-engineered Point-of-Sale (POS) and practice management system built specifically for single-counter and multi-branch retail optical practices. It bridges clinical optometry workflows with retail ERP standards—handling dual-eye refraction capture, multi-tiered Indian GST compliance, split-tender checkout, atomic inventory concurrency locks, and tri-output print engineering (80mm thermal, workshop fabrication slip, and A4 laser invoice).

---

## 🌟 Key Highlights & Domain Capabilities

### 1. 👁️ Dual-Eye Clinical Refraction Matrix (OD / OS Grid)
- **Discrete Optical Data Modeling:** Independent, non-overlapping parameters for **Right Eye (OD — Oculus Dexter)** and **Left Eye (OS — Oculus Sinister)**.
- **IEEE-754 Safe Dioptric Interval Validation:** Uses integer-scaled arithmetic (`Math.round(val * 100) % 25 === 0`) to enforce exact 0.25 D step increments across Sphere (SPH), Cylinder (CYL), and Addition (ADD), preventing floating-point rounding bugs.
- **Axis Check Rules:** Strict conditional validation requiring Axis (1°–180°) if and only if Cylinder correction is non-zero.
- **High-Velocity Counter Controls:** Keyboard-friendly rapid step steppers (`+` and `−`), "Copy OD → OS" one-click replication, and clinical notes expansion.

### 2. ⚡ Sub-150ms Inventory Lookup & Dynamic Cart
- **Concatenated Search Index:** Real-time debounced lookup matching multi-word queries spanning Brand, Model, and SKU (e.g., `"Titan TI 5001"`, `"Ray-Ban Wayfarer"`).
- **Strict RBAC & Cost Masking:** Wholesale cost prices (`costPrice`) are omitted at the database projection query level—preventing sensitive profit margin leaks to client bundles.
- **100% `decimal.js` Monetary Engine:** All tax calculations, item discounts, taxable values, and invoice totals are computed with arbitrary-precision decimal math, completely avoiding native JavaScript floating-point errors.

### 3. 🛡️ Atomic Concurrency & Inventory Rollback Engine
- **Row-Level Concurrency Guards:** Checkout executes inside a PostgreSQL `db.transaction` using conditional atomic updates:
  ```sql
  UPDATE inventory_items
  SET stock_quantity = stock_quantity - :qty
  WHERE id = :id AND stock_quantity >= :qty
  RETURNING id;
  ```
- **Zero Overselling / Negative Stock:** If stock is insufficient, the transaction returns 0 rows, raises `InsufficientStockError`, and triggers a full `ROLLBACK`.
- **Atomic Sequential Invoice Generation:** Gap-free invoice numbering driven by a PostgreSQL sequence (`INV-YY-00000X`).

### 4. 🖨️ Tri-Output Print Engineering
OptixOS features dedicated print layouts designed for specialized retail optical hardware:

| Print Target | Media Size | CSS Trigger | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer Thermal Receipt** | 80mm roll (72mm printable) | `body.print-mode-thermal` | Monospaced thermal typography, itemized HSN table, 5% and 18% GST splits, advance payment, and balance due. |
| **Workshop / Lab Job Slip** | A4 / A5 sheet | `body.print-mode-workshop` | Large job ticket header, frame chassis specs, full OD/OS matrix, lens parameters, and **strict CSS financial redaction** (`.financial-data { display: none !important; }`). |
| **Customer Laser Tax Invoice** | A4 sheet | `body.print-mode-a4` | High-contrast black-and-white border collapse table, formal GSTIN schedule, bank payment instructions, terms & conditions, and authorized signatory block. |

### 5. ⌨️ Keyboard-First Ergonomics
The entire counter billing workflow is accessible via standard function keys:
- **`F1`**: Start New Bill / Clear Canvas
- **`F2`**: Focus Patient Search
- **`F3`**: Focus Barcode / Inventory Search
- **`F5`**: Quick Print Thermal Receipt
- **`F10`**: Complete Order & Trigger Settlement

---

## 🏗️ Architecture & Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions, React 19)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Neon Serverless Postgres](https://neon.tech/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/) with Drizzle Kit migrations
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with dedicated `@media print` stylesheets
- **Validation:** [Zod](https://zod.dev/) with integer-scaled dioptric refinements
- **Financial Math:** [Decimal.js](https://mikemcl.github.io/decimal.js/)
- **Icons & Alerts:** [Lucide React](https://lucide.dev/) & [Sonner](https://sonner.emilkowal.ski/)

---

## 📂 Project Structure

```
optical-pos/
├── drizzle/                     # Drizzle SQL schema migrations & snapshots
├── docs/                        # Product Requirements Document (PRD) & architectural specifications
├── src/
│   ├── actions/                 # Next.js Server Actions
│   │   └── process-optical-order.ts # Atomic transaction order processing & concurrency lock
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API Routes
│   │   │   ├── inventory/search/route.ts # Multi-term brand/model inventory search
│   │   │   └── patients/search/route.ts  # Debounced patient phone lookup
│   │   ├── pos/
│   │   │   └── new-bill/page.tsx # Main POS workspace & print controls
│   │   ├── globals.css          # Tailwind base & Tri-Output print stylesheet
│   │   ├── layout.tsx           # Root layout with Sonner toast provider
│   │   └── page.tsx             # Root redirect to /pos/new-bill
│   ├── components/
│   │   └── pos/                 # Modular POS client components
│   │       ├── billing-cart.tsx      # Cart table & line calculations
│   │       ├── inventory-search.tsx  # Debounced inventory dropdown
│   │       ├── patient-search.tsx    # Debounced patient telephone search
│   │       ├── payment-panel.tsx     # Split-tender & balance calculation
│   │       ├── prescription-grid.tsx # Dual-eye OD/OS clinical matrix
│   │       ├── print-a4-invoice.tsx  # Executive A4 laser tax invoice
│   │       └── print-layouts.tsx     # 80mm thermal receipt & workshop slip
│   ├── db/
│   │   ├── index.ts             # Neon serverless database client
│   │   ├── schema.ts            # Drizzle PostgreSQL schema definitions
│   │   └── seed.ts              # Seed fixture (customers, inventory, prescriptions, orders)
│   └── lib/
│       ├── errors.ts            # Domain error classes (InsufficientStockError, etc.)
│       ├── utils.ts             # Tailwind class merge helper
│       └── validators/          # Zod validation schemas
│           └── prescription.ts  # Quarter-step dioptric & order schemas
├── .env.example                 # Safe environment variable template
├── drizzle.config.ts            # Drizzle Kit configuration
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

## 📋 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run build` | Compiles the production build |
| `npm run start` | Launches the Next.js production server |
| `npm run lint` | Runs ESLint checks |
| `npm run db:push` | Pushes Drizzle schema directly to PostgreSQL database |
| `npm run db:generate` | Generates new SQL migration files |
| `npm run db:seed` | Populates mock inventory, patients, and optical data |
| `npm run db:studio` | Launches Drizzle Studio GUI for visual database management |

---

## 🧪 Testing the Concurrency & Stock Rollback Guard

To verify that the system blocks overselling and guarantees atomic rollbacks under concurrent demand:
1. In the POS inventory search, search for **Titan TI 5001** (`FRM-TI-5001-GLD`, seeded with **8 units**).
2. Add the frame to the cart and increment the quantity to **10 units**.
3. Click **"Complete Order (F10)"**.
4. **Result:** The system immediately blocks the sale, surfaces a red Sonner error toast (`Checkout Failed: INSUFFICIENT_STOCK — Insufficient stock for SKU "FRM-TI-5001-GLD": requested 10, available 8`), and preserves the original database stock count at 8 units without creating any phantom invoices.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
