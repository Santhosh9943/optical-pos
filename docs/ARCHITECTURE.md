# OptixOS System Architecture

OptixOS is a high-performance, cloud-native Optical Billing, Practice Management, and Point-of-Sale (POS) system engineered for optical retail chains, optometrists, and multi-branch ophthalmology practices.

---

## 1. High-Level System Topology

```
                  ┌──────────────────────────────────────────────┐
                  │              Next.js 16 Client               │
                  │   (React 19, Tailwind CSS, Zustand SPA Store) │
                  └───────────────────────┬──────────────────────┘
                                          │  HTTPS / Server Actions
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │             Next.js Server Runtime           │
                  │    • Better Auth Session & Role Scoping      │
                  │    • Zod Schema Input Validation             │
                  │    • Decimal.js Financial Math Engine        │
                  │    • Atomic Transaction Orchestrator         │
                  └──────────────┬──────────────────────┬────────┘
                                 │                      │
                   Cache Hits    │                      │  Transactional
                   & Fast Reads  ▼                      ▼  Queries (Pooler)
             ┌─────────────────────────┐          ┌─────────────────────────┐
             │   Upstash Redis REST    │          │  Neon PostgreSQL 16     │
             │   (TTL 5m-24h, Fallback)│          │  (Drizzle ORM, Pooler)  │
             └─────────────────────────┘          └─────────────────────────┘
```

---

## 2. Layered Architecture & Responsibilities

```
src/
├── app/                  # Next.js 16 App Router (Pages, Layouts, API Routes)
│   ├── (auth)/           # Authentication pages (Login, Register)
│   ├── admin/            # Store & Management views (Inventory, Patients, Reports, Settings, Staff, Branches)
│   ├── api/              # High-frequency Route Handlers (Debounced search, Telemetry)
│   ├── pos/              # High-density Sales Counter (/pos/new-bill)
│   └── super-admin/      # SaaS Tenant Governance & Perspective Simulator
├── actions/              # Server Actions (Mutations, Transaction execution, Redis invalidation)
├── components/           # Modular React 19 UI components
│   ├── admin/            # Management panels, settings forms, and datatables
│   ├── layout/           # Persistent navigation bars, sidebars, simulation banner
│   ├── pos/              # POS counter workspaces, refraction matrix, cart, bottom bar
│   ├── super-admin/      # Tenant directory, branch manager, telemetry metrics
│   └── ui/               # Reusable UI primitives (dialogs, tooltips, inputs, badges)
├── db/                   # Database Layer
│   ├── schema.ts         # Drizzle PostgreSQL schema definitions & relations
│   ├── index.ts          # Neon serverless client & connection pooler setup
│   └── seed.ts           # Standardized practice seed script
├── lib/                  # Core Utilities & Infrastructure
│   ├── auth.ts           # Better Auth configuration
│   ├── auth-utils.ts     # Current session resolver & tenant context fallback
│   ├── redis.ts          # Resilient Upstash Redis client with zero-crash fallback
│   └── validators/       # Zod schemas for domain validation
└── store/                # Client State Management
    ├── pos-store.ts      # Volatile POS Cart, Refraction Matrix, and Layout View state
    └── tenant-store.ts   # Super Admin simulator session state (sessionStorage persisted)
```

---

## 3. Core Architectural Subsystems

### 3.1 Multi-Tenant SaaS Isolation Model
- **Organizations (Practices):** Each optical practice operates within its own `organization_id` (UUID). All queries to customers, inventory, invoices, and staff strictly filter by `organization_id`.
- **Branches (Stores):** Each physical retail store or clinic has a distinct `branch_id`. Inventory can belong to a specific store or remain unassigned (warehouse pool).
- **Session Scoping:** `getCurrentSession()` in [`src/lib/auth-utils.ts`](file:///f:/hobby-projects/optical-pos/src/lib/auth-utils.ts) resolves the active organization and branch from Better Auth headers, gracefully defaulting to the primary practice in development and automated testing environments.

### 3.2 Neon PostgreSQL & Drizzle ORM
- **Serverless Connection Pooling:** All database traffic connects through the Neon connection pooler (`-pooler` endpoint) to handle high-concurrency counter terminals without exhausting connection limits.
- **Transactional Consistency:** Critical business operations (e.g. order processing, payment collection, stock decrement) execute within atomic `db.transaction()` boundaries. If any step fails, the entire transaction rolls back cleanly.
- **Drizzle Typed Schema:** Strict schema definitions in [`src/db/schema.ts`](file:///f:/hobby-projects/optical-pos/src/db/schema.ts) using `pgTable`, `uuid`, `numeric(12, 2)`, and custom enums.

### 3.3 High-Speed Upstash Redis Caching
- **Fast Reads:** High-frequency endpoints (patient search autocomplete, catalog lookups, store profile settings) query Upstash Redis first.
- **Resilient Zero-Crash Fallback:** If Redis credentials are not configured or Redis is temporarily unreachable, [`src/lib/redis.ts`](file:///f:/hobby-projects/optical-pos/src/lib/redis.ts) catches errors gracefully and seamlessly falls back to querying the primary Neon database without dropping user requests.
- **Cache Invalidation:** Mutations (e.g. updating store profile, creating invoices, registering new patients) immediately invalidate their respective Redis cache keys (`cacheDel` or key pattern invalidation).

### 3.4 State Management Strategy: Volatile vs. Persistent
- **URL & Router Navigation:** Primary pages use native Next.js SPA routing (`<Link href="...">`) to maintain clean browser history.
- **Zustand POS Store (`pos-store.ts`):** 
  - Cart line items, selected patient, active refraction prescription, and counter layout modes reside in the global Zustand store.
  - State survives navigation across `/pos/new-bill`, `/admin/inventory`, and `/admin/patients`, preventing lost cart progress when a cashier checks inventory stock or updates a patient profile.
- **Tenant Simulation Store (`tenant-store.ts`):** 
  - Persisted in `sessionStorage` so Super Admin simulated sessions survive browser reloads.

### 3.5 POS Viewport Architecture (Adaptive & Dense Modes)
To resolve visual congestion between clinical refraction entry and multi-item invoice carts, OptixOS provides 3 distinct workspace modes:
1. **Adaptive Split View (7:5 default):** Balanced side-by-side layout for standard single-item workflows.
2. **Adaptive Rx Focus (9:3):** Expands the clinical refraction matrix and history, compressing the cart into a compact drawer.
3. **Adaptive Billing Focus:** Condenses patient details into a 1-line strip ([`CompactPatientStrip`](file:///f:/hobby-projects/optical-pos/src/components/pos/compact-patient-strip.tsx)), allocating 8 columns to the cart and 4 columns to a dedicated settlement ledger.
4. **Dense Split Layout:** 50/50 split with 38px ultra-compact cart rows and a sticky bottom settlement dock ([`DenseBottomBar`](file:///f:/hobby-projects/optical-pos/src/components/pos/dense-bottom-bar.tsx)).

### 3.6 Hardware Print Engine
- **Zero External Dependencies:** Built entirely with CSS `@media print` without reliance on heavy server-side PDF generators.
- **Thermal 80mm Roll:** Container locked strictly to `72mm` with zero margin, avoiding premature page cuts.
- **A4 GST Tax Invoice:** Full compliance with Indian GST rules, displaying SAC/HSN breakdown, CGST, SGST, IGST, and practice bank details.
- **Workshop Lab Slip:** Ophthalmic job sheet containing lens power, lens type, coating, frame chassis specs, and delivery date, with **all financial pricing strictly redacted from the DOM**.

---

## 4. Architectural Rules & Invariants

1. **Monetary Math:** Never use native JavaScript floating-point arithmetic. Wrap all financial numbers in `new Decimal(...)` and format outputs using `.toFixed(2)`.
2. **Atomic Stock Updates:** Never verify stock in application memory prior to updating. Use atomic conditional updates (`sqlstockQuantity >= quantity`) with `RETURNING`.
3. **RBAC Redaction:** Wholesale cost (`cost_price`) must be omitted from SQL query projections for non-admin staff. Never send wholesale costs to the client and hide them with CSS.
4. **Optical Axis Rule:** If `CYL != 0`, `AXIS` is strictly mandatory (1–180°). If `CYL === 0`, `AXIS` must be `null`.
