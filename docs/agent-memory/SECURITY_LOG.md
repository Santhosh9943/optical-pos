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
- **Status**: `OPEN` (Tracked in Phase 25 backlog)
- **In-Code Tag**: `// TODO(security-SEC-004): Add organizationId foreign key to storeProfile table for multi-tenant isolation`
