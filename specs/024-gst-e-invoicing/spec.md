# Feature Specification: Indian GST E-Invoicing & GSTR-1 Ledger Export

- **Feature ID**: `024-gst-e-invoicing`
- **Phase**: `Phase 24 (Roadmap)`
- **Status**: `Ready for Implementation`
- **Owner**: `OptixOS Engineering`
- **Target Release**: `v1.4.0`

---

## 1. Problem Statement & Business Objective
- **Problem**: Under Indian Goods & Services Tax (GST) regulations, B2B optical transactions exceeding statutory turnover thresholds require real-time registration with the National Informatics Centre (NIC) Invoice Registration Portal (IRP), generating a 64-character Invoice Reference Number (IRN) and a cryptographically signed QR code. Additionally, optical retailers need seamless monthly GSTR-1 JSON exports to file taxes directly on the GST portal without manual data entry.
- **Objective**: Implement a cloud-native NIC E-Invoicing client with IRN generation, signed QR code rendering on A4/thermal invoices, and a 1-click GSTR-1 JSON export engine.

---

## 2. User Stories & Personas

- **Optical Store Accountant / Owner**:
  - *As an optical practice owner, I want B2B invoices generated in OptixOS to automatically obtain an IRN and digitally signed QR code from the NIC portal so my business remains 100% GST-compliant.*
- **Store Cashier**:
  - *As a cashier, I want the printed tax invoice to automatically include the government-signed QR code when billing corporate or B2B customers without needing extra manual steps.*
- **Tax Consultant**:
  - *As a tax consultant, I want to download monthly GSTR-1 JSON files matching the official GSTN schema to upload directly to gst.gov.in.*

---

## 3. Optical Domain & Statutory Invariants

- [ ] **HSN Code Tax Splits**: Lenses (HSN 9001) at 5% GST (2.5% CGST + 2.5% SGST); Frames & Sunglasses (HSN 9003/9004) at 18% GST (9% CGST + 9% SGST).
- [ ] **Exact Monetary Math**: All taxable values, CGST, SGST, IGST, and invoice totals calculated via `decimal.js` with `.toFixed(2)` string persistence.
- [ ] **Immutable Closed Invoices**: Once an invoice receives an IRN (`eInvoiceStatus = 'GENERATED'`), it cannot be edited or deleted directly; corrections require an e-way credit note or formal cancellation within statutory windows (24 hours).
- [ ] **Multi-Tenant Isolation**: GST credentials, IRN generation, and GSTR-1 exports must strictly scope to `organization_id` and branch GSTIN.

---

## 4. Functional Requirements

### 4.1 Data Models & Schemas
- Add fields to `invoices` table:
  - `irn`: `varchar(64)` (Unique Invoice Reference Number from IRP).
  - `signedQrCode`: `text` (Base64 or raw signed payload from NIC).
  - `signedInvoice`: `text` (JWT signed token from NIC).
  - `ackNo`: `varchar(32)` (IRP Acknowledgment Number).
  - `ackDate`: `timestamp` (IRP Acknowledgment Timestamp).
  - `eInvoiceStatus`: `enum('NOT_APPLICABLE', 'PENDING', 'GENERATED', 'CANCELLED', 'FAILED')`.

### 4.2 NIC API Client & Sandbox Mock
- Stateless REST client in `src/lib/e-invoicing.ts` with OAuth token caching in Upstash Redis.
- Sandbox mock responder for development and local testing when external NIC credentials are not configured.

### 4.3 UI & Hardware Printing Integration
- A4 Tax Invoice (`src/components/pos/print/A4Invoice.tsx`): Render statutory signed QR code and IRN header.
- Store Settings (`src/components/admin/settings-view.tsx`): Dedicated "GST & E-Invoicing" tab for GSTIN, NIC Client ID, and sandbox toggle.
- Invoices Ledger (`src/app/(dashboard)/invoices/page.tsx`): "Generate E-Invoice" action button with live status badges.
- Monthly Report (`src/app/(dashboard)/admin/reports/`): "Export GSTR-1 JSON" button.

---

## 5. Acceptance Criteria

```gherkin
Scenario: Generate IRN for B2B Optical Invoice
  Given a customer has a valid 15-character GSTIN
  And an invoice is created with HSN 9001 (5%) and HSN 9003 (18%) items
  When the cashier clicks "Generate E-Invoice"
  Then the system computes statutory tax splits via decimal.js
  And calls the NIC IRP API to generate an IRN
  And stores the 64-character IRN and signed QR code in PostgreSQL
  And renders the signed QR code on the A4 Tax Invoice

Scenario: Export Monthly GSTR-1 JSON
  Given the store has completed 50 B2B and B2C sales in the selected month
  When the accountant clicks "Export GSTR-1 JSON"
  Then OptixOS generates a valid GSTN-compliant JSON file containing B2B, B2CS, and HSN summary sections
  And prompts the user to download the .json file
```
