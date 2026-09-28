# Technical Implementation Plan: Indian GST E-Invoicing & GSTR-1 Ledger Export

- **Feature ID**: `024-gst-e-invoicing`
- **Spec Reference**: [`spec.md`](spec.md)
- **Status**: `Ready for Implementation`

---

## 1. System Architecture & Component Topology

```
POS / Invoice Ledger (UI) ──> generateEInvoiceAction() (Server Action)
                                         │
                                         ├──> Validate GSTIN & HSN splits (decimal.js)
                                         ├──> Call NIC IRP Gateway (src/lib/e-invoicing.ts)
                                         │       │
                                         │       ▼
                                         │    NIC / Sandbox IRP Server
                                         │       │
                                         │       ▼ (Returns IRN, SignedQRCode, AckNo)
                                         ├──> db.update(invoices).set({ irn, signedQrCode... })
                                         └──> safeRedisSet() / Invalidate Cache
```

---

## 2. Database Schema DDL (`src/db/schema.ts`)

```typescript
// Add to storeProfile:
gstin: varchar("gstin", { length: 15 }),
nicUsername: varchar("nic_username", { length: 64 }),
nicPassword: text("nic_password"), // encrypted
nicClientId: varchar("nic_client_id", { length: 64 }),
nicClientSecret: text("nic_client_secret"),
eInvoiceSandbox: boolean("e_invoice_sandbox").default(true),

// Add to invoices:
irn: varchar("irn", { length: 64 }),
signedQrCode: text("signed_qr_code"),
signedInvoice: text("signed_invoice"),
ackNo: varchar("ack_no", { length: 32 }),
ackDate: timestamp("ack_date"),
eInvoiceStatus: varchar("e_invoice_status", { length: 20 }).default("NOT_APPLICABLE"),
```

---

## 3. Pre-Implementation Blast Radius & Invariant Audit

Before modifying code, audit existing connections using `graphify explain`:

| Component | File Path | Risk / Invariant to Protect |
| :--- | :--- | :--- |
| **Invoices Schema** | `src/db/schema.ts` | Multi-tenant `organization_id` foreign key. Nullable fields for non-B2B invoices. |
| **A4 Print Engine** | `src/components/pos/print/A4Invoice.tsx` | Must render QR code without shifting print layout boundaries. |
| **Monetary Math** | `src/lib/e-invoicing.ts` | NIC payload expects exact paise rounding. Use `decimal.js` exclusively. |
| **E2E Test** | `e2e/e-invoicing.spec.ts` | Sandbox mock must allow deterministic offline test runs. |

---

## 4. Verification & Testing Strategy
- **Static Gate**: `npm run check` (TypeScript strict mode + ESLint).
- **Playwright Test Spec**: `e2e/e-invoicing.spec.ts` testing B2B invoice generation, IRN display, and GSTR-1 JSON export.
- **Knowledge Graph Sync**: `graphify update .` post-implementation.
