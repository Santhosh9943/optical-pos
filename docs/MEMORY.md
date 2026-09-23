# Project Memory & Living System Ledger

This document maintains the living operational state of **OptixOS (Optical Billing & Practice Management System)**. It acts as an authoritative, continuously updated reference for human developers and AI coding agents regarding tech stack versions, current feature states, test results, and critical gotchas.

---

## 1. System Specifications & Versions

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | `16.x` | Full-stack serverless web application |
| **Runtime Library** | React | `19.x` | Modern server components & actions |
| **Database** | Neon Serverless PostgreSQL | PostgreSQL `16` | Cloud serverless database |
| **Connection Pooling** | PgBouncer / Neon Pooler | `-pooler` endpoint | Prevents lambda connection exhaustion |
| **ORM** | Drizzle ORM / Drizzle Kit | `^0.30.x` | Strict type-safe SQL query generation |
| **Cache Layer** | Upstash Redis REST | `@upstash/redis` | High-speed cache with DB fallback |
| **Authentication** | Better Auth | `^1.x` | Multi-tenant session management & RBAC |
| **Precision Math** | `decimal.js` | `^10.4.x` | Exact monetary accounting & tax arithmetic |
| **Styling** | Tailwind CSS / Lucide React | `v4` / latest | Responsive UI with semantic design tokens |
| **State Management** | Zustand | `^4.x` | Client state persistence across SPA routes |
| **End-to-End Testing**| Playwright | `^1.40.x` | Virtual browser automation pyramid |

---

## 2. Test Pass Status & Verification State

- **Static Type Check & Lint (`npm run check`)**: **PASS (0 errors, 0 warnings)**
- **Playwright POS Test Suite (`npm run test:pos`)**: **12/12 Passed (100% green)**
  - `e2e/pos-checkout.spec.ts`: 11/11 passing (SPA persistence, atomic inventory lock, family billing, pair wizard, patient loading, dual-box discount sync).
  - `e2e/pos-layout-modes.spec.ts`: 1/1 passing (Adaptive, Rx Focus, Billing Focus, Dense Split, F4 hotkey, admin persistence).

---

## 3. Active Feature Matrix

| Module | Route / Component | Operational Status |
| :--- | :--- | :--- |
| **SaaS Landing Page** | `/` (`src/app/page.tsx`) | **Production Ready** (Hero, 4 POS modes preview, optical features grid, pricing matrix, FAQ) |
| **SaaS Pricing Page** | `/pricing` (`src/app/pricing/page.tsx`) | **Production Ready** (Starter ₹0, Plus ₹999/mo, Enterprise ₹2,499/mo with annual discount toggle) |
| **Auth & Social Login** | `/auth/login` (`src/app/auth/login/page.tsx`) | **Production Ready** (Google OAuth 2.0, Super Admin quick-fill, plan preselection) |
| **POS New Bill** | `/pos/new-bill` | **Production Ready** (4 layout modes, F2 dispatcher, F4 hotkey) |
| **Patient Management** | `/patients` | **Production Ready** (Refraction history, family cluster linking) |
| **Inventory Catalog** | `/inventory` | **Production Ready** (6 categories, atomic stock lock, cost redaction) |
| **Sales Invoices** | `/invoices` | **Production Ready** (Invoice ledger, payment history, re-print) |
| **Store Settings** | `/settings/store` | **Production Ready** (Layout mode default, print headers, GSTIN) |
| **Hardware Print** | `PrintModal.tsx` | **Production Ready** (80mm thermal, A4 tax invoice, workshop slip) |
| **Perspective Simulator**| `/admin/perspective` | **Production Ready** (Super Admin simulation with sticky banner) |
| **Tenant Staff Scoping**| `tenant-actions.ts` | **Production Ready** (Strict `memberTable` join, zero cross-tenant user leakage) |

---

## 4. Critical Developer Gotchas & Invariants

### 4.1 Seeded Organization ID (`DEFAULT_ORG_ID`)
In automated tests and local seed scripts, all sample records (patients, inventory items, store settings) belong to the default seed organization:
`00000000-0000-0000-0000-000000000001`
- When writing tests or diagnostic queries, always filter by this organization ID.
- In E2E Playwright tests, the `x-e2e-bypass-auth: true` header causes the auth middleware to construct a synthetic session with this exact ID.

### 4.2 Upstash Redis Cache Invalidation
- Redis search caches (`cache:inventory:search:*` and `cache:patients:search:*`) cache JSON strings with a 5-minute TTL.
- If you manually insert or update database rows via SQL or Drizzle Studio, you must either flush Redis or wait for the TTL to expire to see changes reflected in POS search results.
- In tests, the `seed.ts` script executes `safeRedisFlush()` to clear test tenant keys.

### 4.3 `decimal.js` String Serialization
- Always serialize `Decimal` instances using `.toFixed(2)` when storing in Postgres `numeric` columns or passing JSON over the wire:
```typescript
// Correct:
totalAmount: new Decimal(amount).toFixed(2)

// Wrong (causes runtime serialization error or IEEE float drift):
totalAmount: new Decimal(amount).toNumber()
```

### 4.4 Decoupled Plano Refraction
- A customer purchasing non-prescription fashion sunglasses, computer glasses without power, or contact lens solutions has **no prescription linked**.
- The POS system handles this gracefully: `prescriptionId` is nullable on both cart items and invoice line items. Never make prescription mandatory on invoice creation.

### 4.5 CSS `@media print` Quirks
- Thermal 80mm paper rolls have a physical printable area of **72mm** (due to mechanical margins on Epson/Star/TVS printers). The thermal container in `print-thermal.css` is strictly constrained to `width: 72mm; margin: 0 auto;`.
- Avoid CSS flexbox alignments that break pagination in Chromium print mode. Use standard block flows with `break-inside: avoid;`.

### 4.6 Workshop Lab Slip Price Redaction
- Never display wholesale cost or retail price on the Workshop Job Slip. The optical technician only needs to see frame model, lens material, coating, and OD/OS powers.
- The React component `WorkshopJobSlip.tsx` completely excludes price elements from the HTML DOM to prevent inspect-element leaks.

### 4.7 Dynamic Documentation Elasticity & Archive Policy
- **Elastic Documentation:** Active documents in `docs/` dynamically expand with new features and prune/condense when features are reduced or deprecated.
- **Archive Isolation:** Superseded documents live in `docs/archive/` with entries logged in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
- **Rule for AI Agents:** NEVER query or inspect `docs/archive/` during standard development tasks unless the user explicitly requests historical context or legacy migration analysis. Standard work operates exclusively on active `docs/`.
