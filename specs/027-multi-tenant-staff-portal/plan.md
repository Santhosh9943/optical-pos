# Implementation Plan: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal

- **Feature ID**: `027-multi-tenant-staff-portal`
- **Estimated Complexity**: High (Cross-Cutting: Auth, Database, Tenancy, UI, Security)

---

## 1. Technical Architecture & Invariants

### 1.1 Three-Tier User Hierarchy
```
┌──────────────────────────────────────────────────────────────┐
│ Level 1: Platform Super Admin (SUPER_ADMIN_EMAILS in .env)   │
│ - Global monitoring, tenant approvals, disable stores        │
│ - Real-time OTP authentication (zero standalone org needed)  │
└──────────────────────────────┬───────────────────────────────┘
                               │ monitors
┌──────────────────────────────▼───────────────────────────────┐
│ Level 2: Organization Admin / SaaS Customer (Optix Client)   │
│ - Registered via /auth/login -> /onboarding                  │
│ - Owns Organization (e.g. Org Code: OPT-1, OPT-2)            │
│ - Manages Subscription/Billing, Stores (branches), Staff     │
└──────────────────────────────┬───────────────────────────────┘
                               │ provisions & governs
┌──────────────────────────────▼───────────────────────────────┐
│ Level 3: Store Staff & Store Managers                        │
│ - Created by Org Admin with password & store assignments     │
│ - Signs in exclusively via Staff Portal (/auth/staff-login)  │
│ - Auth via Org ID (e.g. OPT-1 or 1) + Email + Password       │
│ - First-time password change enforcement                     │
│ - Assigned to 1 or more branches (staff_store_assignments)   │
│ - Strictly blinded from SaaS pricing, billing & upgrade ads  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Database Changes
1. **`organizations` Table**:
   - `orgCode`: `varchar('org_code', { length: 50 }).unique()` (e.g. `OPT-1`)
   - `orgNumber`: `integer('org_number').unique()` (e.g. `1`)
2. **`user` Table**:
   - `mustChangePassword`: `boolean('must_change_password').default(false).notNull()`
3. **`staffStoreAssignments` Table**:
   - `id`: `uuid('id').primaryKey().defaultRandom()`
   - `organizationId`: `uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull()`
   - `branchId`: `uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull()`
   - `userId`: `text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull()`
   - `role`: `varchar('role', { length: 50 }).notNull().default('staff')`
   - `isPrimary`: `boolean('is_primary').notNull().default(false)`
   - `createdAt`: `timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`

---

## 2. Implementation Phasing (Small Chunks)

### Phase 1: Database Migration & Schema Extensions
- Extend `src/db/schema.ts` with `orgCode`, `orgNumber`, `mustChangePassword`, and `staffStoreAssignments`.
- Create idempotent migration script `src/db/migrate-multi-tenant-staff.ts` to add columns, foreign keys, backfill existing default org to `OPT-1` / `1`, and run migration.

### Phase 2: Core Tenancy Context & Onboarding Isolation Fix
- Fix `/auth/login` signup logic: redirect new registrations to `/onboarding`.
- Fix `setupPracticeOnboardingAction`:
  - Query maximum `org_number` and allocate next sequence number.
  - Set `orgCode` to `${prefix}-${nextNumber}`.
  - Create organization, default main branch, and member record with `admin` role.
  - Automatically create primary `staffStoreAssignments` record for the owner.
  - Seed default store profile / settings for the new tenant.
- Fix `getCurrentSession()` in `src/lib/auth-utils.ts`:
  - Never default a user to `DEFAULT_ORG_ID` if they have an active account!
  - If a user has no organization membership, set `hasOrganization: false` and return clean unassigned state.
- Fix `getUserTenancyContext()` in `src/actions/tenant-actions.ts`:
  - Only query organizations the user is a member of (unless Super Admin).
  - Only query branches the user has access to (all branches for Org Admin, assigned branches for Staff).
- Fix `useTenantStore.setTenancyData`:
  - Eliminate the stubborn fallback to `DEFAULT_ORG_ID`.

### Phase 3: Staff Creation, Governance & Multi-Store Assignment
- Update `createStaffMemberAction`:
  - Accept `password`, `mustChangePassword: boolean`, `branchIds: string[]`, `primaryBranchId: string`, and `roles: OperationalRole[]`.
  - Use `auth.api.createUser` to create user record with hashed password in `account` table.
  - Handle existing users cleanly: if email already exists, add them to `member` and `staffStoreAssignments` without duplicate email crash.
  - Insert rows into `staffStoreAssignments`.
- Update `getStaffMembersAction`:
  - Return each staff member's list of assigned stores with roles.
- Update `/admin/staff` page:
  - Add multi-store checkboxes when inviting/adding staff.
  - Add password input field and "Must change password on first login" checkbox.
  - Display store assignment badges on each staff member card.
  - Implement Maker-Checker: if a Store Manager requests deletion of staff, create an `approvalRequest` instead of hard deleting.

### Phase 4: Dedicated Store Staff Portal (`/auth/staff-login`)
- Create `/auth/staff-login/page.tsx`:
  - Three inputs:
    1. Practice / Store ID (`OPT-X` or `X`).
    2. Staff Email.
    3. Password.
  - Org ID resolver supports both full code (`OPT-1`, `opt-1`) or raw number (`1`).
  - Add link on `/auth/login`: "Store Staff? Sign in via Store Staff Portal →".
- Implement `authenticateStaffLoginAction`:
  - Validate Org ID -> finds tenant.
  - Verify email belongs to that tenant's membership.
  - Authenticate password via Better Auth.
  - If `mustChangePassword` is true, return flag to show forced password change dialog/screen.
- Build Forced Password Change flow (`/auth/change-initial-password` or modal).

### Phase 5: Viewport Scoping, Branch Switcher & SaaS Redaction
- `BranchSwitcher`:
  - Allow switching if `branches.length > 1` (even for multi-store managers).
  - Lock if user only has 1 assigned store.
- Layout & Sidebar Redaction (`src/app/(dashboard)/layout.tsx`):
  - Strictly hide "Plans & Upgrade", SaaS offers, and `SubscriberOnboardingModal` for all staff members (`!isOrganizer && !isSuperAdmin`).
  - Add route protection on `/pricing` to redirect non-owners to dashboard.

### Phase 6: Automated Testing & Validation Gate
- E2E test `e2e/multi-tenant-staff-portal.spec.ts`:
  1. Test signup redirect to onboarding and clean isolated workspace.
  2. Test Staff Portal login with Org Code (`OPT-1`) and raw number (`1`).
  3. Test forced initial password change.
  4. Test staff cannot see pricing/upgrade links.
  5. Test multi-store staff assignment and branch switcher.
- Run complete composite quality gate (`npm run check`, `npm run audit:security`, `npm run audit:design`, `npm run test:pos`).
- Sync graph with `graphify update .`.
- Update memory docs (`BUG_FIX_LOG.md`, `SESSION_HANDOFF.md`, `TASKS.md`).
