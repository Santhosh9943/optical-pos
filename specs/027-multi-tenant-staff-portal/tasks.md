# Tasks: 027 Multi-Tenant Isolation, 3-Tier User Hierarchy & Staff Portal

- **Feature ID**: `027-multi-tenant-staff-portal`
- **Definition of Done (DoD)**:
  - All tasks checked off
  - `npm run check` passes with 0 errors
  - `npm run audit:security` passes with 0 critical violations
  - `npm run audit:design` passes with 0 violations
  - `npm run test:pos` & new E2E tests 100% green
  - `graphify update .` synced

---

## Task Breakdown

### Phase 1: Database Migration & Schema
- [x] **T1.1**: Update `src/db/schema.ts` to add `orgCode` and `orgNumber` to `organizations` table.
- [x] **T1.2**: Update `src/db/schema.ts` to add `mustChangePassword` to `user` table.
- [x] **T1.3**: Add `staffStoreAssignments` table to `src/db/schema.ts` with foreign keys and indexes.
- [x] **T1.4**: Create and execute migration script `src/db/migrate-multi-tenant-staff.ts` to alter Postgres tables and backfill default organization (`OPT-1`, `1`).

### Phase 2: Tenancy Context & Onboarding Isolation Fix
- [x] **T2.1**: In `src/app/auth/login/page.tsx`, redirect new signups to `/onboarding`.
- [x] **T2.2**: Update `setupPracticeOnboardingAction` in `src/actions/tenant-actions.ts` to generate `orgCode` and `orgNumber`, create organization, branch, member, and primary store assignment.
- [x] **T2.3**: Fix `getCurrentSession()` in `src/lib/auth-utils.ts` to prevent fallback to `DEFAULT_ORG_ID` for authenticated users with no organization.
- [x] **T2.4**: Fix `getUserTenancyContext()` in `src/actions/tenant-actions.ts` to strictly scope organizations and branches by user membership/assignment.
- [x] **T2.5**: Fix `setTenancyData` in `src/store/tenant-store.ts` so it adopts the user's actual organization rather than retaining default state.

### Phase 3: Staff Creation & Multi-Store Management
- [x] **T3.1**: Update `createStaffMemberAction` in `src/actions/tenant-actions.ts` to accept `password`, `mustChangePassword`, `branchIds: string[]`, and hash credentials using `auth.api.createUser`.
- [x] **T3.2**: Allow adding existing users to a new branch/org in `createStaffMemberAction` without duplicate email crash.
- [x] **T3.3**: Update `getStaffMembersAction` to return store assignments for each staff member.
- [x] **T3.4**: Update `deleteStaffMemberAction` to enforce Maker-Checker approval request for Store Managers.
- [x] **T3.5**: Update `/admin/staff` page UI with multi-store checkboxes, password inputs, reset toggle, and store access badges.

### Phase 4: Dedicated Staff Portal
- [x] **T4.1**: Create `src/app/auth/staff-login/page.tsx` with Org ID/Number, Email, and Password inputs.
- [x] **T4.2**: Add Staff Portal link button to `/auth/login/page.tsx`.
- [x] **T4.3**: Implement `authenticateStaffLoginAction` to validate org code (both `OPT-X` and `X`), verify org membership, verify password, and detect `mustChangePassword`.
- [x] **T4.4**: Build forced first-login password change flow and action.

### Phase 5: Viewport Scoping, Branch Switcher & SaaS Redaction
- [x] **T5.1**: Update `BranchSwitcher` in `src/components/layout/branch-switcher.tsx` to allow switching whenever `branches.length > 1`.
- [x] **T5.2**: Redact "Plans & Upgrade", SaaS pricing links, and `SubscriberOnboardingModal` in `src/app/(dashboard)/layout.tsx` for staff.
- [x] **T5.3**: Add route protection on `/pricing` to prevent unauthorized staff access.

### Phase 6: Testing, Quality Gate & Documentation
- [x] **T6.1**: Create Playwright E2E test `e2e/multi-tenant-staff-portal.spec.ts`.
- [x] **T6.2**: Run `npm run check`, `npm run audit:security`, `npm run audit:design`, `npm run test:pos`.
- [x] **T6.3**: Run `graphify update .`.
- [x] **T6.4**: Update `docs/agent-memory/SESSION_HANDOFF.md`, `docs/agent-memory/BUG_FIX_LOG.md`, and `docs/TASKS.md`.
