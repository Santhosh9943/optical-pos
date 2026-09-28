# Architecture Decision Records (ADRs)

This document records the key architectural and technical decisions made for **OptixOS (Optical Billing & Practice Management System)**, capturing the context, options evaluated, rationale, and consequences of each decision.

---

## Index of Decisions

- [ADR-001: Neon Serverless PostgreSQL with Connection Pooling & Drizzle ORM](#adr-001-neon-serverless-postgresql-with-connection-pooling--drizzle-orm)
- [ADR-002: Better Auth for Multi-Tenant Organization & Role Scoping](#adr-002-better-auth-for-multi-tenant-organization--role-scoping)
- [ADR-003: Upstash Redis REST Caching with Resilient Database Fallback](#adr-003-upstash-redis-rest-caching-with-resilient-database-fallback)
- [ADR-004: decimal.js for Exact Retail Accounting & Indian GST Apportionment](#adr-004-decimaljs-for-exact-retail-accounting--indian-gst-apportionment)
- [ADR-005: Atomic Conditional Database Updates for Inventory Deductions](#adr-005-atomic-conditional-database-updates-for-inventory-deductions)
- [ADR-006: Dual POS Counter Layout Architecture (Adaptive Modes & Dense Split)](#adr-006-dual-pos-counter-layout-architecture-adaptive-modes--dense-split)
- [ADR-007: Perspective Simulator & Persistent Simulation Banner for Super Admins](#adr-007-perspective-simulator--persistent-simulation-banner-for-super-admins)
- [ADR-008: Hardware Print Rendering via CSS @media print Engine](#adr-008-hardware-print-rendering-via-css-media-print-engine)
- [ADR-009: Razorpay Standard Checkout vs Hosted Page for SaaS Subscriptions](#adr-009-razorpay-standard-checkout-vs-hosted-page-for-saas-subscriptions)

---

## ADR-001: Neon Serverless PostgreSQL with Connection Pooling & Drizzle ORM

### Status
Accepted

### Context
OptixOS is a multi-tenant cloud-native retail application deployed on Vercel serverless edge/node runtimes. Traditional relational databases run out of connections when ephemeral serverless lambdas spin up concurrently during peak store hours. Furthermore, we needed a type-safe database layer that avoids the heavy engine binary overhead of Prisma in serverless functions.

### Options Considered
1. **Prisma ORM with hosted PostgreSQL**: High runtime engine overhead (~15MB engine binary), cold start latency on serverless, rigid migration DSL.
2. **Supabase (PostgreSQL + PostgREST)**: Excellent BaaS, but ties business logic closer to client-side SDKs and RLS policies rather than Next.js Server Actions.
3. **Neon Serverless PostgreSQL + `@neondatabase/serverless` + Drizzle ORM**: Zero-binary serverless driver, native WebSocket/HTTP connection pooling via PgBouncer (`-pooler` endpoint), pure TypeScript schema declaration, and sub-millisecond query execution.

### Decision
Adopt **Neon Serverless PostgreSQL** paired with **Drizzle ORM**.
All serverless database operations connect through the pooled connection string (`DATABASE_URL` pointing to `*-pooler.eastus2.azure.neon.tech`). Migrations use Drizzle Kit against direct connections.

### Consequences
- **Positive**: Blazing fast cold starts (~10ms vs >300ms with Prisma); seamless auto-scaling compute; full SQL query control with strict TypeScript inference.
- **Negative**: Must strictly connect via the `-pooler` string in serverless environments to prevent connection exhaustion. Non-pooled connections must be reserved strictly for migrations.

---

## ADR-002: Better Auth for Multi-Tenant Organization & Role Scoping

### Status
Accepted

### Context
Optical retail chains operate with multi-tenant hierarchies: a single business entity (Organization) operates multiple physical storefronts (Branches). Users require distinct roles (Super Admin, Organizer/Owner, Store Admin/Manager, Store Staff/Cashier/Optician). We needed an authentication and session system with built-in multi-tenancy, session management, and server-side RBAC.

### Options Considered
1. **NextAuth.js (Auth.js v5)**: Standard Next.js auth, but lacks first-class organization plugin abstractions and clean multi-tenant role scoping out of the box.
2. **Clerk**: Comprehensive SaaS auth, but adds external third-party hosted dependency, monthly per-MAU costs, and latency for database sync.
3. **Better Auth with Organization Plugin**: Self-hosted in our Neon PostgreSQL database, native TypeScript schemas, built-in Organization plugin, first-class session management with impersonation support.

### Decision
Adopt **Better Auth** with the Organization plugin, integrated with our Drizzle ORM schema.
Every user session exposes `activeOrganizationId` and `role`. Route Handlers and Server Actions enforce multi-tenant isolation by joining against `organization_id` on all tables.

### Consequences
- **Positive**: Complete control over auth tables in our own Postgres database; zero third-party per-user SaaS fees; instantaneous database transactions with user data; support for Super Admin perspective switching.
- **Negative**: Responsible for our own session table migrations and token revocation routines.

---

## ADR-003: Upstash Redis REST Caching with Resilient Database Fallback

### Status
Accepted

### Context
POS counters execute live patient searches (by phone/name) and inventory searches (by barcode/SKU/brand) on every keystroke. Hitting Postgres on every keystroke degrades responsiveness and exhausts compute units. We required a low-latency caching layer compatible with serverless runtimes.

### Options Considered
1. **In-memory LRU cache inside Next.js process**: Fails in serverless environments because lambdas are ephemeral and do not share state.
2. **Self-hosted Redis cluster (VPC)**: High operational overhead, networking complexity to connect serverless lambdas.
3. **Upstash Redis REST (`@upstash/redis`)**: Serverless Redis accessible via stateless HTTP REST calls, sub-10ms latency, pay-per-request pricing.

### Decision
Implement **Upstash Redis REST** with an architectural **fail-open pattern**:
All Redis calls are wrapped in `safeRedisGet` / `safeRedisSet` utilities. If Redis credentials are unset, expired, or rate-limited, the application gracefully logs a warning and queries Neon PostgreSQL directly without throwing a 500 error.

```typescript
// Pattern: Zero-Crash Resilient Cache
try {
  const cached = await redis.get(key);
  if (cached) return cached;
} catch (err) {
  console.warn("Redis lookup failed, falling back to DB:", err);
}
// Fallback to PostgreSQL
const data = await db.select()...;
```

### Consequences
- **Positive**: Sub-15ms search response times at POS; zero store downtime even if Redis is completely unavailable; reduced Neon compute costs.
- **Negative**: Cache keys must be explicitly invalidated upon inventory mutations or patient creation via `redis.del()` or wildcard eviction.

---

## ADR-004: decimal.js for Exact Retail Accounting & Indian GST Apportionment

### Status
Accepted

### Context
Retail optical billing combines split Indian GST rates (5% on prescription ophthalmic lenses, 18% on frames and sunglasses), item-level discounts, bill-level discounts (percentage or flat currency), and multiple split payments. JavaScript native IEEE-754 floating-point math produces errors such as `0.1 + 0.2 = 0.30000000000000004`, which fail statutory tax audits and ledger balance checks.

### Options Considered
1. **Native JavaScript `Number` with `Math.round()`**: Prone to cumulative penny rounding drift across multi-item invoices.
2. **Integer Cents/Paise**: Requires continuous integer multiplication/division and creates ambiguity when calculating fractional percentage discounts or split GST apportionment.
3. **`decimal.js` Arbitrary-Precision Library**: Dedicated financial math engine with explicit rounding modes (`ROUND_HALF_UP`) and exact decimal representations.

### Decision
Mandate **`decimal.js`** for 100% of monetary and tax computations in OptixOS.
Native mathematical operators (`+`, `-`, `*`, `/`) are strictly prohibited in financial code. Database columns store monetary amounts as `numeric(12, 2)` or `decimal(10, 2)`.

```typescript
// Required pattern:
import Decimal from "decimal.js";
const subtotal = new Decimal(item.unitPrice).times(item.quantity);
const itemTax = subtotal.times(item.taxRate).dividedBy(100);
const finalTotal = subtotal.plus(itemTax).toFixed(2);
```

### Consequences
- **Positive**: 100% statutory compliance; zero penny-discrepancy between invoice line items, tax summaries, and tender receipts; zero floating-point corruption.
- **Negative**: Slightly more verbose syntax; developers and AI agents must strictly adhere to the `decimal.js` API.

---

## ADR-005: Atomic Conditional Database Updates for Inventory Deductions

### Status
Accepted

### Context
In optical stores with multiple POS counters (or simultaneous e-commerce/storefront sales), two cashiers may attempt to bill the last remaining frame (stock = 1) at the exact same second. Checking stock in Node.js memory before inserting the invoice creates a classic Time-of-Check to Time-of-Use (TOCTOU) race condition, resulting in negative stock.

### Options Considered
1. **Application-level read-then-write**: Read stock in memory, check if `qty >= requested`, then issue `UPDATE stock = stock - requested`. Vulnerable to race conditions.
2. **Table-level or Row-level Locks (`SELECT FOR UPDATE`)**: High latency, locks rows across long transactions, risk of deadlocks under high concurrency.
3. **Atomic Conditional SQL Decrement with `RETURNING`**: Execute decrement in a single SQL statement with a `WHERE stockQuantity >= :requested` condition and inspect affected rows.

### Decision
Implement **Atomic Conditional SQL Updates** with `RETURNING` inside Drizzle transactions:

```typescript
const [updated] = await tx
  .update(inventoryItems)
  .set({ stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}` })
  .where(
    and(
      eq(inventoryItems.id, item.inventoryItemId),
      sql`${inventoryItems.stockQuantity} >= ${item.quantity}`
    )
  )
  .returning({ id: inventoryItems.id, remainingStock: inventoryItems.stockQuantity });

if (!updated) {
  throw new Error(`Insufficient stock for item ${item.inventoryItemId}`);
}
```

### Consequences
- **Positive**: Impossible to over-sell inventory; zero race conditions; executed natively by PostgreSQL in a single atomic micro-step.
- **Negative**: The application must catch the `Insufficient stock` error and present a friendly notification to the cashier to replenish or remove the item.

---

## ADR-006: Dual POS Counter Layout Architecture (Adaptive Modes & Dense Split)

### Status
Accepted

### Context
Optical retail staff work on varied hardware: some counters have 24-inch widescreen 1080p monitors with mouse/keyboard, while others use 14-inch laptops or 10-inch touch tablets. Furthermore, opticians focus heavily on clinical refraction inputs, while cashiers focus exclusively on rapid scanning and tender collection. A one-size-fits-all layout caused screen clutter and visual fatigue.

### Options Considered
1. **Single Responsive Fluid Layout**: Adapts by screen width, but cannot adapt to different operational workflows (clinical optometry vs rapid billing) on the same screen size.
2. **Separate URLs (`/pos/optometry` vs `/pos/checkout`)**: Fractures the user experience and requires navigating between distinct pages during a single customer visit.
3. **Multi-Mode Unified POS Component (`/pos/new-bill`)**: A single unified page supporting 4 operational layout modes, hotkey switching (`F4`), and persistent store admin preference:
   - **Adaptive Split View**: 7:5 balanced layout.
   - **Rx Refraction Focus**: 9:3 clinical matrix with mini-cart drawer.
   - **Billing Focus**: Compact 1-line patient strip, 8-column wide cart, 4-column settlement grid.
   - **Dense Split View**: 50/50 split, ultra-compact 38px rows, sticky `DenseBottomBar`.

### Decision
Adopt the **Multi-Mode Unified POS Architecture**.
The active layout mode is managed via `usePOSStore`, synced to `localStorage`, hotkey switchable via `F4`, and configurable organization-wide in Store Settings (`store_settings.default_pos_layout_mode`).

### Consequences
- **Positive**: Tailored ergonomics for both clinical and cashier roles; seamless operation on screens from 1024px to 4K; single codebase maintaining all invoice logic.
- **Negative**: Requires rigorous Playwright E2E testing across all 4 modes to ensure buttons and inputs remain accessible regardless of active viewport mode.

---

## ADR-007: Perspective Simulator & Persistent Simulation Banner for Super Admins

### Status
Accepted

### Context
Platform Super Admins need to diagnose store issues, verify branch permissions, and troubleshoot cashier reports without asking clients for their passwords or modifying production credentials. Traditional role-impersonation often leads to admin confusion where an engineer forgets they are impersonating a live store and makes accidental edits.

### Options Considered
1. **Database-level SQL Role Updates**: Dangerous, alters real database rows, difficult to audit.
2. **Temporary Password Generation**: Insecure, leaves audit trail gaps, disrupts active store sessions.
3. **Session-Level Perspective Simulator with Sticky Visual Banner**: Super Admin selects an organization, branch, and role in `/admin/perspective`. The server issues a simulation session cookie. A persistent, non-dismissible amber banner appears at the very top of the screen (`z-index: 9999`) indicating active simulation with an immediate "Exit Simulation" button.

### Decision
Adopt the **Perspective Simulator** with a sticky top-level visual banner (`PerspectiveBanner.tsx`).
The simulation is purely session-scoped, never modifies persistent user records, and is instantly terminable.

### Consequences
- **Positive**: Flawless debugging of complex multi-tenant RBAC issues; zero risk of accidental modifications due to unambiguous amber simulation banner; zero credential exposure.
- **Negative**: All API endpoints and Server Actions must inspect both true session credentials and simulation overrides to prevent unauthorized privilege escalation.

---

## ADR-008: Hardware Print Rendering via CSS @media print Engine

### Status
Accepted

### Context
Optical retail requires physical printouts for three distinct operational destinations:
1. **80mm Thermal Receipt Printers**: Fast point-of-sale receipt for walk-in retail.
2. **A4 Laser/Inkjet Tax Invoices**: Formal GST invoice for insurance, corporate, or high-value sales.
3. **Workshop Lab Job Slips**: Optical lab work orders containing lens powers, pupillary distance, and frame dimensions—**strictly without financial/pricing data**.

Generating PDFs on the server via headless Chrome (Puppeteer) introduces high latency (1-3 seconds), heavy memory usage (100MB+ per invocation), and frequent serverless timeouts.

### Options Considered
1. **Serverless PDF Generation (Puppeteer/Playwright)**: Heavy memory consumption, slow cold starts, costly serverless execution.
2. **Client-side PDF rendering (`jspdf` / `pdfmake`)**: Inconsistent font rendering, cumbersome manual coordinate positioning, no support for responsive layout.
3. **Pure CSS `@media print` Rendering Engine**: HTML/CSS rendered directly by the client browser's native print engine. Formats are controlled by CSS print stylesheets (`print-thermal.css`, `print-a4.css`, `print-workshop.css`).

### Decision
Adopt the **Pure CSS `@media print` Engine**.
Print layouts are rendered directly into the DOM inside an off-screen container. When `window.print()` is triggered, CSS `@media print` rules hide the POS interface and format the document precisely for the target paper size (72mm printable width for 80mm roll, 210mm for A4). Workshop slips use a specialized template with all price columns omitted from the DOM.

### Consequences
- **Positive**: Instantaneous print popup (<50ms); zero server memory overhead; zero third-party rendering fees; pixel-perfect rendering using standard Tailwind CSS classes.
- **Negative**: Cashiers must configure their browser print dialog margins to "None" once during initial setup. Thermal printers must be set to 80mm roll width.

---

## ADR-009: Razorpay Standard Checkout vs Hosted Page for SaaS Subscriptions

### Status
Accepted

### Context
OptixOS requires an enterprise-grade SaaS billing and subscription engine for optical retail chains upgrading from Starter to Growth Plus or Enterprise tiers. We evaluated the two official integration paradigms provided by Razorpay:
1. **Razorpay Standard Checkout (`checkout.js` modal)**: An in-app client-side modal loaded over HTTPS that renders an embedded PCI-DSS compliant iframe overlay directly on `optixos.app`.
2. **Razorpay Hosted Checkout Page / Payment Links (`api.razorpay.com/v1/payment_links`)**: A server-side generated external redirect URL that navigates the user away from OptixOS to Razorpay's external domain (`rzp.io`), returning via callback URL upon completion.

### Options Considered
1. **Hosted Checkout Page / Payment Links Only**:
   - *Pros*: Zero client-side JavaScript bundle; straightforward server redirect (`window.location.href = link.short_url`).
   - *Cons*: High context switching; forces user to leave the app; 20-30% drop-off in conversion rate; difficult to display immediate contextual failure reasons or auto-retry in modal; jarring mobile app/PWA experience.
2. **Custom / Server-to-Server Direct Card Integration**:
   - *Pros*: Completely headless UI.
   - *Cons*: Severe PCI-DSS compliance scope (SAQ D requirement); complex tokenization logic; unsupported for UPI intents without deep SDKs.
3. **Razorpay Standard Checkout (`checkout.js`) with Payment Links Server Fallback (Hybrid)**:
   - *Pros*: Keeps the user strictly within OptixOS; zero context loss; instantaneous payment popup; automatic native support for UPI (Google Pay, PhonePe, Paytm QR/Intent), Netbanking, and Cards; zero PCI scope (card data handled inside secure sandboxed iframe); immediate in-app failure capture (`modal.ondismiss`, `payment.failed` handler) allowing 1-click retry. Payment Links API remains available as an asynchronous invoice fallback.
   - *Cons*: Requires loading external `https://checkout.razorpay.com/v1/checkout.js` script in the browser.

### Decision
Adopt **Razorpay Standard Checkout (`checkout.js`)** as the primary interactive subscription checkout experience, backed by the **Payment Links API** as an asynchronous fallback.
- **Workflow**:
  1. Frontend invokes `createRazorpaySubscriptionOrderAction` Server Action with target `planId` and `billingPeriod`.
  2. Server verifies caller session, computes exact INR price using `decimal.js`, converts to integer paise, and creates an order on Razorpay (`orders.create`).
  3. Client hook `useRazorpayCheckout` loads `checkout.js` and opens the modal with the generated `order_id`, store branding, and prefilled tenant info.
  4. On completion, `verifyRazorpayPaymentAction` cryptographically validates the HMAC-SHA256 signature (`razorpay_order_id + "|" + razorpay_payment_id` against `RAZORPAY_KEY_SECRET`) using `crypto.timingSafeEqual`.
  5. The organization's plan, period, and status are atomically activated in Neon PostgreSQL, an immutable row is appended to `subscriptions`, and a 4-step onboarding demo walkthrough is triggered.
  6. On failure or cancellation, `handlePaymentFailureAction` logs the incident with decline reason without navigating away, enabling immediate retry.
  7. Asynchronous webhooks (`order.paid`, `payment.captured`, `payment.failed`) provide background state synchronization.

### Consequences
- **Positive**: Maximum checkout conversion rate; seamless desktop and mobile UX; zero PCI-DSS compliance overhead; cryptographic security with zero trust in client payloads; instant guided onboarding upon first successful payment.
- **Negative**: Script loading dependency on `checkout.razorpay.com`; must handle ad-blocker or network script loading failures gracefully with clear user guidance.

