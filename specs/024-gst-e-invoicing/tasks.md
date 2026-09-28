# Task Checklist: Indian GST E-Invoicing & GSTR-1 Ledger Export

- **Feature ID**: `024-gst-e-invoicing`
- **Spec Reference**: [`spec.md`](spec.md)
- **Plan Reference**: [`plan.md`](plan.md)

---

## Phase 1: Database & Validator Layer
- [ ] **Task 1.1**: Add `irn`, `signedQrCode`, `signedInvoice`, `ackNo`, `ackDate`, and `eInvoiceStatus` to `invoices` table in `src/db/schema.ts`.
- [ ] **Task 1.2**: Add GST credentials fields (`gstin`, `nicUsername`, `nicClientId`, `eInvoiceSandbox`) to `storeProfile` table in `src/db/schema.ts`.
- [ ] **Task 1.3**: Execute DDL migration or `db:push` against Neon Serverless Postgres.
- [ ] **Task 1.4**: Create Zod validation schema for Indian GSTIN (15-character alphanumeric regex) in `src/lib/validators/invoice.ts`.

---

## Phase 2: NIC Client & Server Actions
- [ ] **Task 2.1**: Implement `src/lib/e-invoicing.ts` with NIC IRP payload builder, token management, and sandbox mock mode.
- [ ] **Task 2.2**: Build `generateEInvoiceAction(invoiceId)` in `src/actions/invoice-actions.ts`.
- [ ] **Task 2.3**: Build `exportGstr1JsonAction(month, year)` generating statutory B2B, B2CS, and HSN JSON summaries.
- [ ] **Task 2.4**: Apply `decimal.js` throughout for exact Indian GST calculation (5% and 18% splits).

---

## Phase 3: UI & Print Layout Integration
- [ ] **Task 3.1**: Add "GST & E-Invoicing" configuration tab in `src/components/admin/settings-view.tsx`.
- [ ] **Task 3.2**: Add "Generate IRN" button and status badge in `src/app/(dashboard)/invoices/page.tsx`.
- [ ] **Task 3.3**: Update A4 Tax Invoice component (`src/components/pos/print/A4Invoice.tsx`) to render statutory IRN string and signed QR code.
- [ ] **Task 3.4**: Add "Export GSTR-1 (JSON)" download button to sales reports view.

---

## Phase 4: Quality Gate & Handoff
- [ ] **Task 4.1**: Build Playwright E2E spec `e2e/e-invoicing.spec.ts` verifying sandbox IRN generation and GSTR-1 export.
- [ ] **Task 4.2**: Run `npm run check` and ensure 0 errors and 0 warnings.
- [ ] **Task 4.3**: Run `npm run test:pos` and `e2e/e-invoicing.spec.ts` (100% green).
- [ ] **Task 4.4**: Update `docs/agent-memory/SESSION_HANDOFF.md` and `docs/TASKS.md`.
- [ ] **Task 4.5**: Run `graphify update .` to refresh the AST knowledge graph.
