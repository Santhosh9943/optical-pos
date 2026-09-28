# Task Checklist: [Feature Name]

- **Feature ID**: `[e.g. 025-feature-name]`
- **Spec Reference**: [`spec.md`](spec.md)
- **Plan Reference**: [`plan.md`](plan.md)

---

## Phase 1: Database & Validation Layer
- [ ] **Task 1.1**: Update `src/db/schema.ts` with new columns/tables.
- [ ] **Task 1.2**: Generate or execute database migration.
- [ ] **Task 1.3**: Add Zod validation schemas in `src/lib/validators/`.
- [ ] **Task 1.4**: Update `src/db/seed.ts` if test fixtures require new fields.

---

## Phase 2: Server Actions & Business Logic
- [ ] **Task 2.1**: Implement Server Actions in `src/actions/` with JSDoc comments (`@param`, `@returns`).
- [ ] **Task 2.2**: Enforce multi-tenant scoping (`organization_id`) on all queries.
- [ ] **Task 2.3**: Apply `decimal.js` with `.toFixed(2)` for all monetary operations.
- [ ] **Task 2.4**: Implement Upstash Redis cache invalidation.

---

## Phase 3: Client State & UI Components
- [ ] **Task 3.1**: Extend Zustand stores (`src/lib/stores/`) if client persistence is needed.
- [ ] **Task 3.2**: Build UI components with native dark mode and `p-4 md:p-6 gap-6` spacing.
- [ ] **Task 3.3**: Ensure WCAG AA contrast (4.5:1 minimum) and semantic button labels.

---

## Phase 4: Quality Gate & Handoff
- [ ] **Task 4.1**: Create Playwright E2E spec in `e2e/`.
- [ ] **Task 4.2**: Run `npm run check` and ensure 0 errors and 0 warnings.
- [ ] **Task 4.3**: Run `npm run test:pos` (or target E2E test) and verify 100% green pass rate.
- [ ] **Task 4.4**: Update `docs/agent-memory/SESSION_HANDOFF.md` and log any bugs in `BUG_FIX_LOG.md`.
- [ ] **Task 4.5**: Run `graphify update .` to synchronize the knowledge graph.
