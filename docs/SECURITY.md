# Security & Compliance Specification

This document details the security architecture, access control policies, data isolation guarantees, and operational hardening guidelines for **OptixOS (Optical Billing & Practice Management System)**.

---

## 1. Multi-Tenant Isolation Model

OptixOS employs a logical multi-tenancy model enforced at the application data layer via **Neon PostgreSQL** and **Drizzle ORM**.

```
Platform (Super Admin)
  └── Organization (Tenant: Retail Chain / Business Entity)
        ├── Branch A (Physical Storefront / POS Counter)
        └── Branch B (Physical Storefront / Workshop)
```

### 1.1 Mandatory Tenant Scoping
Every table containing business data incorporates an `organization_id` column (UUID). Tables tied to physical store operations also include a `branch_id` column:
- `customers` (`organization_id`)
- `customer_prescriptions` (`organization_id`, `customer_id`)
- `inventory_items` (`organization_id`, `branch_id`)
- `invoices` (`organization_id`, `branch_id`, `customer_id`)
- `payments` (`organization_id`, `branch_id`, `invoice_id`)

### 1.2 Data Access Invariant
**Strict Invariant**: Every database query (`SELECT`, `UPDATE`, `DELETE`) initiated from an authenticated session must include an explicit tenant filter:

```typescript
// MANDATORY Pattern:
const data = await db
  .select()
  .from(invoices)
  .where(
    and(
      eq(invoices.organizationId, session.organizationId),
      eq(invoices.branchId, session.branchId), // when branch-scoped
      eq(invoices.id, targetInvoiceId)
    )
  );
```

> [!CAUTION]
> Never query or mutate records by primary key alone (`eq(table.id, id)`). Omitting `organizationId` allows cross-tenant horizontal privilege escalation (IDOR vulnerability).

---

## 2. Role-Based Access Control (RBAC) Matrix

OptixOS defines four hierarchical security roles managed via **Better Auth**:

| Role | Scope | Description |
| :--- | :--- | :--- |
| **`super_admin`** | Platform | Cloud platform operators. Perspective Simulator access, tenant provisioning, system audits. |
| **`organizer`** | Organization | Business Owner/Director. Consolidated multi-branch analytics, financial reports, tax filings, store creation. |
| **`admin`** | Branch | Store Manager. Full branch operations, inventory adjustments, purchase orders, cashier oversight, store settings. |
| **`staff`** | POS Counter | Cashier, Sales Associate, Optometrist. New billing, customer registration, refraction entry, payment collection. |

### 2.1 Permission Capabilities Matrix

| Feature / Resource | `super_admin` | `organizer` | `admin` (Store) | `staff` (Cashier) |
| :--- | :---: | :---: | :---: | :---: |
| Platform Tenant Management | **Full** | Denied | Denied | Denied |
| Super Admin Perspective Simulator | **Full** | Denied | Denied | Denied |
| Multi-Branch Consolidated Analytics | **Full** | **Full** | Denied | Denied |
| Wholesale Cost Price (`cost_price`) | **Visible** | **Visible** | **Visible** | **REDACTED** |
| Void / Cancel Completed Invoices | **Full** | **Full** | **Approval Req** | Denied |
| Inventory Stock Adjustment (Manual) | **Full** | **Full** | **Full** | Denied |
| POS New Billing & Checkout | **Full** | **Full** | **Full** | **Full** |
| Customer Registration & Refraction | **Full** | **Full** | **Full** | **Full** |
| Store Settings & Hardware Print Config | **Full** | **Full** | **Full** | Read-Only |

---

## 3. Query-Level Data Masking (Wholesale Cost Protection)

In retail optical stores, floor staff and cashiers operate customer-facing screens. Wholesale purchase costs (`cost_price`) from lens labs and frame distributors are trade secrets.

### 3.1 Network-Level Protection
Hiding cost prices with CSS (`display: none` or conditional React rendering) is strictly prohibited because sensitive prices remain visible in the browser's Network tab (`/api/inventory`).

### 3.2 Server-Side Projection Redaction
All database queries must omit `cost_price` from the Drizzle projection unless the caller has `organizer` or `admin` privileges:

```typescript
// Safe Query Projection:
const isManager = session.role === "organizer" || session.role === "admin";

const inventoryRows = await db
  .select({
    id: inventoryItems.id,
    sku: inventoryItems.sku,
    name: inventoryItems.name,
    category: inventoryItems.category,
    retailPrice: inventoryItems.retailPrice,
    stockQuantity: inventoryItems.stockQuantity,
    taxRate: inventoryItems.taxRate,
    // Strictly redact cost_price for staff:
    costPrice: isManager ? inventoryItems.costPrice : sql`NULL`,
  })
  .from(inventoryItems)
  .where(eq(inventoryItems.organizationId, session.organizationId));
```

---

## 4. Concurrency & Race-Condition Hardening

### 4.1 Inventory Over-Selling Prevention
OptixOS prevents negative stock balances during peak retail concurrency using **Atomic Conditional Database Decrements** with `RETURNING` clauses executed inside isolated database transactions (`db.transaction`):

```typescript
await db.transaction(async (tx) => {
  for (const item of cartItems) {
    const [updated] = await tx
      .update(inventoryItems)
      .set({ stockQuantity: sql`${inventoryItems.stockQuantity} - ${item.quantity}` })
      .where(
        and(
          eq(inventoryItems.id, item.inventoryItemId),
          eq(inventoryItems.organizationId, session.organizationId),
          sql`${inventoryItems.stockQuantity} >= ${item.quantity}`
        )
      )
      .returning({ id: inventoryItems.id });

    if (!updated) {
      throw new Error(`Insufficient stock for item: ${item.name}`);
    }
  }

  // Insert invoice and payments atomically...
});
```

If any single item in the cart has insufficient stock at the exact microsecond of checkout, the entire transaction rolls back cleanly, leaving database state pristine.

---

## 5. Input Validation & Injection Hardening

### 5.1 Strict Zod Schemas
Every Server Action and Route Handler validates incoming request payloads against comprehensive Zod schemas before executing database logic:
- `customerSchema`: Validates name length, 10-digit Indian mobile phone (`/^[6-9]\d{9}$/`), and email format.
- `prescriptionSchema`: Enforces 0.25 D dioptric quarter steps, axis bounds (1-180), and required OD/OS fields.
- `checkoutSchema`: Validates positive line item quantities, non-negative prices, and non-empty payment tender lists.

### 5.2 SQL Injection Immunity
All database interactions use **Drizzle ORM's parameterized queries**. Raw SQL strings with manual string concatenation (`query = "SELECT * FROM users WHERE id = '" + id + "'"` ) are forbidden. Any use of Drizzle's `sql` template tag must strictly utilize parameter interpolation:

```typescript
// Correct parameterized SQL:
sql`stock_quantity >= ${quantity}`

// Strictly Forbidden:
sql`stock_quantity >= ${quantity.toString()}` // raw literal
```

### 5.3 Cross-Site Scripting (XSS) Prevention
- React 19 automatically escapes all strings rendered in JSX.
- `dangerouslySetInnerHTML` is prohibited across the codebase.
- User-supplied notes (customer medical history, invoice remarks) are sanitized and rendered as pure text nodes.

---

## 6. Authentication & Session Hygiene

### 6.1 Cookie Configuration
Session cookies issued by Better Auth adhere to enterprise security flags:
- `HttpOnly`: Inaccessible via client-side JavaScript (`document.cookie`), preventing session hijacking via XSS.
- `Secure`: Transmitted strictly over encrypted HTTPS connections in production.
- `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF) on state-mutating requests.

### 6.2 Perspective Simulator Safeguards
The Super Admin Perspective Simulator (`/admin/perspective`) enables safe role impersonation:
1. Only authenticated users with `role: "super_admin"` in the database session can trigger simulation mode.
2. The simulation cookie `optixos_perspective` is cryptographically signed.
3. The persistent amber banner `PerspectiveBanner.tsx` displays across all routes, preventing accidental edits.
4. An immediate "Exit Simulation" endpoint clears the cookie and restores original credentials.

---

## 7. Secret Management & Environment Hygiene

### 7.1 Environment Separation
- `.env.local`: Contains local development secrets. Never checked into git repository (`.gitignore` enforced).
- `.env.example`: Committed template with placeholder keys (`DATABASE_URL=postgres://...`).
- Production secrets (Neon connection strings, Upstash Redis tokens, Better Auth secret) are injected via Vercel Project Environment Variables.

### 7.2 Redis Token Masking & Fail-Open Resilience
- Upstash Redis REST tokens (`UPSTASH_REDIS_REST_TOKEN`) are never logged in console outputs.
- If Redis credentials fail or connection times out, the cache client logs a sanitised warning and falls back to Postgres.

---

## 8. Hardware Document Privacy & Redaction

### 8.1 Workshop Job Slip Privacy
Optical workshop technicians require optical specifications to cut lenses and mount frames, but should never have access to patient billing or discount information.

**Design Rule**:
- The Workshop Job Slip template (`print-workshop.css` / `WorkshopJobSlip.tsx`) completely omits unit prices, discounts, taxes, and total paid amounts from the DOM structure.
- Only patient name, prescription details (OD/OS SPH, CYL, AXIS, ADD, PD), frame model, and lens material are printed.

---

## 9. Automated AI Code Review & Vulnerability Audit Protocol

OptixOS enforces an automated security code review on every code change to detect vulnerabilities early:

### 9.1 The 8-Point Security Review Gate
1. **Multi-Tenant Scoping**: All queries must enforce `WHERE organization_id = session.organizationId`.
2. **Wholesale Cost Masking**: `costPrice` must be omitted or SQL-projected as `NULL` for non-admin/staff roles.
3. **Secret Redaction**: Never return plaintext credentials (`smtpPass`, API secrets) to client callers.
4. **Rate-Limiting**: Enforce sliding window limits on authentication, password resets, and checkout mutations.
5. **Exact Monetary Math**: Use `decimal.js` with `.toFixed(2)` string serialization exclusively.
6. **Diopter Precision**: Validate SPH, CYL, and ADD using integer scaling (`Math.round(val * 100) % 25 === 0`).
7. **Document Redaction**: Workshop job tickets must completely omit financial/pricing data from the DOM tree.
8. **SQL Parameterization**: Use Drizzle ORM and SQL templates without raw string interpolation.

### 9.2 Protocol for Unresolved Security Findings & Technical Debt
If an AI agent discovers a vulnerability, code smell, or architectural defect that **cannot be resolved immediately in the current task**:
1. **Never Drop Findings**: It is strictly forbidden to ignore or leave a known vulnerability undocumented.
2. **In-Code Tagging**: Annotate the code location immediately:
   ```typescript
   // TODO(security-SEC-XXX): [Finding description and required remediation]
   ```
3. **Registry Logging**: Append a structured entry into [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md) detailing Severity, Location, CWE, Finding, and Remediation Plan.
4. **Backlog Tracking**: Add a corresponding task to `docs/TASKS.md` under pending security tasks.
5. **Session Handoff**: Record the item in [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) under `Active Security Findings & Pending Technical Debt`.
6. **Continuous Scanner**: Run `npm run audit:security` to audit active security tags across the project.

