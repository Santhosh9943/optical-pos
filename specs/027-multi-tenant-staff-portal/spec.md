# Feature Specification: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal

- **Feature ID**: `027-multi-tenant-staff-portal`
- **Status**: `In Progress`
- **Owner**: `Antigravity AI Agent`
- **Target Release**: `Phase 27 / Core Multi-Tenancy & Access Control`

---

## 1. Problem Statement & Business Objective
- **Problem**: 
  1. When a new SaaS customer signs up as an Organization Admin on `/auth/login`, their session was bypassing onboarding and falling back to `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`), loading seeded demo invoices, customers, and inventory instead of a clean, isolated workspace.
  2. The system lacked a distinct three-tier user hierarchy separating (L1) Platform Super Admin, (L2) SaaS Customer / Org Admin, and (L3) Store Staff. Store staff and SaaS customers shared conflicting account dynamics.
  3. Store staff lacked a dedicated Staff Portal with human-friendly Practice ID (prefix + auto-increment number, e.g. `OPT-1`), first-time password reset governance, and store-specific role assignments across multiple branches in the same organization.
  4. Store staff were seeing SaaS subscription upgrade modals, pricing offers, and billing screens meant exclusively for organization owners.
- **Objective**: 
  1. Enforce strict tenant isolation: new SaaS signups are seamlessly routed to Onboarding where their unique Organization, Org Code, and Primary Branch are generated with a clean workspace.
  2. Implement human-readable Org Codes (`<prefix>-<number>`, e.g. `OPT-1` or `1`) with custom env prefix and flexible lookup.
  3. Build a dedicated, secure Store Staff Portal (`/auth/staff-login`) with Org ID, Email, and Password, featuring first-login password enforcement and MFA support.
  4. Provide multi-store staff assignment (`staff_store_assignments`) allowing staff to operate across one or more assigned branches with branch-specific roles, while restricting Store Managers from deleting staff without Org Admin approval (Maker-Checker).
  5. Strictly redact and hide SaaS billing, upgrade plans, and promotional banners from store staff.

---

## 2. User Stories & Personas

- **Platform Super Admin (Level 1)**:
  - Configured via `SUPER_ADMIN_EMAILS`, uses real-time OTP authentication.
  - Monitors SaaS tenants, platform health, and manages approvals.
- **Organization Admin / SaaS Customer (Level 2)**:
  - Signs up via `/auth/login` and completes Onboarding.
  - Receives a clean, isolated tenant environment with unique Org Code (`OPT-X`).
  - Manages subscriptions, creates physical stores (branches), and creates/manages store staff.
  - Configures initial passwords and dictates whether staff must change password on first login.
- **Store Manager (Level 3 - Elevated Staff)**:
  - Assigned to 1 or more stores in the organization.
  - Can switch between their assigned stores only.
  - Can view and manage staff within their assigned stores, but cannot permanently delete staff without Org Admin approval.
- **Store Staff / Optometrist / Cashier (Level 3 - Operational Staff)**:
  - Signs in via the dedicated Staff Portal using Org ID (`OPT-X` or `X`), Staff Email, and Password.
  - Prompted to change password on first login if configured by Org Admin.
  - Accesses POS, Lab Orders, Inventory, and Patients for their assigned branch.
  - Never sees SaaS upgrade offers, subscription billing, or platform management.

---

## 3. Optical Domain & Security Invariants

- [x] **Strict Multi-Tenant Isolation**: Queries strictly enforce `eq(table.organizationId, session.organizationId)`. Newly authenticated users without membership never fall back to demo data.
- [x] **Store Assignment Scoping**: Staff can only view and switch to branches they are explicitly assigned to in `staff_store_assignments`.
- [x] **Maker-Checker Staff Deletion**: Store Managers cannot delete staff directly; an approval request is dispatched to the Org Admin.
- [x] **Query-Level Redaction**: Wholesale `costPrice` is hidden from non-admin projections; SaaS billing is completely omitted from staff DOM trees.
- [x] **Password Hashing & Governance**: Staff passwords are secure, hashed via Better Auth's credential provider, with mandatory first-login password reset flags.
- [x] **Org Code Flexibility**: Staff can authenticate using either full prefixed code (`OPT-1`, `opt-1`) or raw number (`1`).

---

## 4. Functional Requirements

### 4.1 Schema Additions
- `organizations`: Add `orgCode` (varchar 50, unique) and `orgNumber` (integer, unique).
- `user`: Add `mustChangePassword` (boolean, default false).
- `staffStoreAssignments`: Add table linking `userId`, `organizationId`, `branchId`, `role`, and `isPrimary`.

### 4.2 Auth & Onboarding Flow
- Fix `/auth/login` signup to redirect to `/onboarding`.
- `setupPracticeOnboardingAction`: Automatically calculate next `orgNumber` and format `orgCode` (`${prefix}-${orgNumber}`), create organization, main branch, and owner membership.
- Update `getCurrentSession()` to ensure newly signed-up users are never assigned `DEFAULT_ORG_ID` and are properly flagged `hasOrganization: false` if onboarding is incomplete.

### 4.3 Staff Portal (`/auth/staff-login`)
- Clean UI with three fields: Org ID/Number, Email, Password.
- Direct entry point from `/auth/login` ("Store Staff? Sign in to Staff Portal →").
- Verifies organization exists, verifies user is an active member of that organization, and verifies password.
- If `mustChangePassword` is true, displays immediate password change dialog before granting dashboard access.

### 4.4 Staff Management & Store Assignments (`/admin/staff`)
- Org Admin can select multiple stores when creating a staff member and set initial password + first-login reset flag.
- Displays store assignment badges for each staff member.
- Supports switching branches only among assigned stores.
- Store Managers deleting staff triggers Maker-Checker approval request.

---

## 5. Acceptance Criteria

```gherkin
Scenario: New SaaS Customer Signs Up
  Given a new user registers on "/auth/login"
  When registration completes
  Then the user is redirected to "/onboarding"
  And after submitting practice details, a new organization is created with a unique Org Code (e.g. "OPT-2")
  And the user's dashboard is completely isolated from the demo organization

Scenario: Staff Signs in via Staff Portal
  Given an organization exists with Org Code "OPT-1"
  And a staff user exists with email "clerk@optix.com" and mustChangePassword=true
  When the staff enters "OPT-1" (or "1"), "clerk@optix.com", and their temporary password
  Then the staff is prompted to set a new password
  And upon updating password, enters the dashboard scoped to their assigned store
  And the "Plans & Upgrade" nav link and subscription modals are completely hidden
```
