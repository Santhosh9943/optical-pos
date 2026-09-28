# OptixOS — Security Vulnerability & Technical Debt Registry

> **Mandatory Rule for All AI Agents (Gemini, Claude, Cursor, Antigravity, etc.)**:
> 1. **Automated Security Review**: Every code review or task must audit for OWASP vulnerabilities, multi-tenant leaks, secret exposures, and optical invariants.
> 2. **Unresolved Risk Protocol**: If an agent discovers a vulnerability, code smell, or architectural defect that **cannot be resolved immediately in the current task**, the agent MUST:
>    - Add an in-code annotation: `// TODO(security-SEC-XXX): [Details and mitigation]`
>    - Register the item in this file (`SECURITY_LOG.md`) with severity, location, and remediation plan.
>    - Add the pending task to `docs/TASKS.md` and `docs/agent-memory/SESSION_HANDOFF.md`.
>    - NEVER leave a discovered vulnerability unrecorded.

---

## Vulnerability & Debt Ledger

### [SEC-001] Wholesale `costPrice` Leak in `getInventoryList` Projection
- **Severity**: `HIGH`
- **Location**: `src/actions/inventory-actions.ts:44`
- **CWE**: CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **Finding**: `getInventoryList()` projected `costPrice` unconditionally to all callers regardless of user role. Cashiers and floor staff could view wholesale purchase costs in network responses.
- **Remediation**: Check `session.role` (`admin`, `organizer`, `super_admin`) and project `null` for store staff.
- **Status**: `RESOLVED` (Fixed in `BUG-013`)
- **In-Code Tag**: N/A (Resolved)

---

### [SEC-002] Plaintext `smtpPass` Exposure in `getStoreProfile`
- **Severity**: `HIGH`
- **Location**: `src/actions/settings-actions.ts:30` & `src/actions/settings-actions.ts:60`
- **CWE**: CWE-312 (Cleartext Storage of Sensitive Information)
- **Finding**: `getStoreProfile()` queries the entire `storeProfile` row and returns `smtpPass` to client callers. The SMTP password was also stored unencrypted in the database and cached in Redis.
- **Remediation Plan**:
  1. Redact `smtpPass` from client responses (`smtpPass: profile.smtpPass ? '********' : null`).
  2. Implement envelope encryption using AES-256-GCM via `process.env.ENCRYPTION_KEY` before persisting to Postgres.
  3. Only decrypt server-side in `src/lib/email.ts` during nodemailer dispatch.
- **Status**: `RESOLVED` (Fixed in `BUG-032`)
- **In-Code Tag**: N/A (Resolved)

---

### [SEC-003] Missing Mutation Rate-Limiting on Auth & Sensitive Endpoints
- **Severity**: `MEDIUM`
- **Location**: `src/actions/account-actions.ts` & `src/actions/process-optical-order.ts`
- **CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)
- **Finding**: API rate-limiting was not enforced on password changes, 2FA operations, or checkout mutations, leaving them susceptible to brute-force or burst request flooding.
- **Remediation Plan**:
  1. Built sliding-window rate limiter in `src/lib/ratelimit.ts` backed by Upstash Redis with zero-latency in-memory fallback.
  2. Enforce 5 attempts per 15-minute sliding window on password updates and 2FA changes.
  3. Enforce 30 requests per minute on checkout transactions per organization.
- **Status**: `RESOLVED` (Fixed in `BUG-032`)
- **In-Code Tag**: N/A (Resolved)

---

### [SEC-004] `storeProfile` Singleton Missing Multi-Tenant `organizationId` Scoping
- **Severity**: `MEDIUM`
- **Location**: `src/db/schema.ts:168` (`storeProfile` table definition)
- **CWE**: CWE-284 (Improper Access Control / Missing Tenant Scoping)
- **Finding**: `storeProfile` table was initially modeled as a global singleton without an `organizationId` foreign key. In multi-organization SaaS deployments, each tenant requires their own isolated store profile and print layout preferences.
- **Remediation Plan**:
  1. Add `organizationId: uuid("organization_id").references(() => organizations.id)` to `storeProfile`.
  2. Scope `getStoreProfile()` to `eq(storeProfile.organizationId, session.organizationId)`.
  3. Update Redis cache key from `store_profile` to `store_profile:{organizationId}`.
- **Status**: `RESOLVED` (Phase 39, BUG-034). `store_profile.organization_id` + unique index `store_profile_org_uidx`; all readers go through `src/lib/store-profile.ts`; cache key `optix:{orgId}:settings:store_profile`; SMTP & `allowNegativeStock` now per tenant. Migration: `scripts/migrations/2026-09-28-tenant-hardening.sql`.
- **In-Code Tag**: N/A (Resolved)

---

## Phase 39 Full-Estate Audit (2026-09-28) — all `RESOLVED`

| ID | Severity | CWE | Location | Finding | Remediation |
|---|---|---|---|---|---|
| SEC-005 | CRITICAL | CWE-620 / CWE-639 | `staff-auth-actions.ts` `completeStaffInitialPasswordChangeAction` | Pre-auth account takeover: password set for any client-supplied `userId`; preflight leaked `userId`. | Uses the Better Auth session user only, requires `mustChangePassword`, Zod; `userId` removed from preflight. |
| SEC-006 | CRITICAL | CWE-639 | `tenant-actions.ts` `createStaffMemberAction` | Client-chosen `targetOrgId`; existing users' passwords overwritten. | `resolveTenantScope` (session org; super admin only override); never resets existing passwords; cross-org users rejected. |
| SEC-007 | CRITICAL | CWE-306 | `tenant-actions.ts` (org/branch/staff actions) | 7+ exported actions with no auth (toggle org/branch, create branch/org, metrics, staff list). | Super-admin / owner guards; session org forced; Zod. |
| SEC-008 | CRITICAL | CWE-639 | `patient-actions.ts`, `api/patients/search` | Unauthenticated cross-tenant read/write of patients, prescriptions, order history; family-link leak chain. | `requireAuthSession` + `organization_id` filter on every query. |
| SEC-009 | CRITICAL | CWE-602 | `process-optical-order.ts` | Server trusted client price/tax; store-credit paid invoices with ₹0 balance; foreign customer/prescription/branch ids accepted. | Catalog price floor (manager override only), catalog tax/HSN, atomic `advance_balance >= amt` debit, org-scoped lookups. |
| SEC-010 | HIGH | CWE-306 | `lab-actions.ts` `updateOrderStatus` | No auth/tenant scope; closed invoices could be reopened. | Auth + org filter + terminal-state guard in the `WHERE`. |
| SEC-011 | HIGH | CWE-841 | `return-refund-actions.ts` | Unbounded, repeatable refunds; unbounded restock. | Row lock, refund ≤ Σpayments, `returned_quantity` conditional update, atomic credit, Zod. |
| SEC-012 | HIGH | CWE-362 | `payment-actions.ts` `collectBalance` | Overpayment and lost-update race; no auth assertion. | `FOR UPDATE`, amount ≤ balance, Zod, auth. |
| SEC-013 | HIGH | CWE-200 | `settings-actions.ts` `getInvoicePrintData`, `email-actions.ts` `sendReceiptEmailAction` | Anonymous invoice read / spam relay when no session. | `requireAuthSession` + org in query. |
| SEC-014 | HIGH | CWE-345 | `subscription-actions.ts`, Razorpay webhook | Plan/cycle taken from client payload; replayable verification. | Plan from stored order; `created → paid` conditional transition in a transaction. |
| SEC-015 | HIGH | CWE-601 / CWE-306 | `notification-actions.ts` | Unauthenticated dispatch into any tenant with arbitrary `actionUrl`. | Auth + session org; relative-URL sanitizer; internal helper `src/lib/notifications-internal.ts`. |
| SEC-016 | MEDIUM | CWE-200 | `customer-portal-actions.ts` | Patients matched by display name. | Name matching removed; portal empty until a verified link exists (see TASKS backlog). |
| SEC-017 | MEDIUM | CWE-639 | dashboard / inventory / reports | Client-chosen `branchId` not checked. | `getAuthorizedBranchIds` / `canAccessBranches` in `auth-utils.ts`. |
| SEC-018 | MEDIUM | CWE-524 | client `localStorage` caches | Cached lists (incl. manager data) survived logout on shared counters. | `clearClientStorageCaches()` on every sign-out path. |
| SEC-019 | MEDIUM | CWE-209 / CWE-532 | `crypto-utils.ts`, `super-admin-auth-actions.ts` | Hardcoded fallback key in prod; OTP logged in prod. | Throw in production without a key; OTP logging dev-only. |
| SEC-020 | MEDIUM | CWE-200 | `lab-actions.ts`, `print-layouts.tsx` | `organization_id IS NULL` rows visible to all tenants; lab slip rendered totals into the DOM. | Strict org filter; financial block removed from `WorkshopSlip`. |

