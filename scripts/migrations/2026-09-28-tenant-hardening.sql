-- 2026-09-28 — Tenant isolation & money-integrity hardening (SEC-004, SEC-005..).
-- Idempotent: safe to run more than once. Mirrors the changes in src/db/schema.ts.

BEGIN;

-- 1. SEC-004: store_profile becomes tenant-owned (one row per organization).
ALTER TABLE store_profile
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill from the profile's branch → organization.
UPDATE store_profile sp
SET organization_id = b.organization_id
FROM branches b
WHERE sp.organization_id IS NULL
  AND sp.branch_id = b.id
  AND NOT EXISTS (SELECT 1 FROM store_profile x WHERE x.organization_id = b.organization_id);

-- Legacy singleton row (no branch) → the default seed organization, if that org has no profile yet.
UPDATE store_profile sp
SET organization_id = o.id
FROM organizations o
WHERE sp.organization_id IS NULL
  AND sp.branch_id IS NULL
  AND o.id = '00000000-0000-0000-0000-000000000001'
  AND sp.store_name = o.name
  AND NOT EXISTS (SELECT 1 FROM store_profile x WHERE x.organization_id = o.id);

CREATE UNIQUE INDEX IF NOT EXISTS store_profile_org_uidx ON store_profile (organization_id);

-- 2. Returns: track units already returned per invoice line (bounded, idempotent returns).
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS returned_quantity integer NOT NULL DEFAULT 0;

-- 3. SKU uniqueness is per organization, not global across tenants.
DROP INDEX IF EXISTS inventory_sku_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_org_sku_uidx ON inventory_items (organization_id, sku);

-- 4. Tenant-scoped composite indexes for hot list/report queries.
CREATE INDEX IF NOT EXISTS customers_org_phone_idx ON customers (organization_id, phone);
CREATE INDEX IF NOT EXISTS invoice_org_created_idx ON invoices (organization_id, created_at);
CREATE INDEX IF NOT EXISTS payment_org_paid_at_idx ON payments (organization_id, paid_at);

COMMIT;
