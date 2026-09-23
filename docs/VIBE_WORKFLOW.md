# The OptixOS Vibe Coding Playbook

This document defines the official engineering workflow for **Vibe Coding** in **OptixOS (Optical Billing & Practice Management System)**. It establishes how human engineers and AI coding assistants collaborate to build, verify, and maintain production-grade software rapidly without degrading architectural integrity, financial accuracy, or test stability.

---

## 1. Core Principles of Production-Grade Vibe Coding

> [!IMPORTANT]
> **"Vibe Coding" is NOT "YOLO Coding".**
> In beginner tutorials, vibe coding often means typing a vague prompt, copying unverified code, and hoping it works. 
> In **OptixOS**, where real stores bill real customers with strict tax compliance, Vibe Coding is a disciplined, test-driven, AI-accelerated engineering discipline. The "vibe" is fluid and rapid because of the rigid guardrails in place.

### The Three Laws of OptixOS Vibe Coding:
1. **The AI writes code inside strict architectural boundaries**: It must adhere to `docs/RULES.md`, `docs/ARCHITECTURE.md`, and `docs/DESIGN.md`.
2. **Every change must survive the Virtual Testing Pyramid**: Static type checking (`npm run check`) and Playwright E2E suites must pass 100% green before any code is merged.
3. **The codebase is self-documenting and self-updating**: Whenever a feature is added or altered, `docs/TASKS.md` and `docs/MEMORY.md` are updated in the same commit.

---

## 2. The 9-Step OptixOS Vibe Coding Loop

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. READ: Inspect PRD, ARCHITECTURE, RULES, MEMORY     │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. UNDERSTAND: Trace existing files and schemas        │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. PLAN: Draft minimal, atomic implementation plan     │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. IMPLEMENT: Surgical code edits (no broad rewrites)  │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 5. TEST: Run Playwright E2E & vitest suites            │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 6. REVIEW: Inspect git diff against optical invariants │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 7. FIX: Address any type errors or test flakes         │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 8. COMMIT: Clean atomic commit with semantic prefix    │
  └──────────────────────────┬─────────────────────────────┘
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 9. UPDATE DOCS: Record changes in TASKS & MEMORY       │
  └────────────────────────────────────────────────────────┘
```

### Detailed Phase Breakdown:

#### Step 1: READ
Before writing a single line of code, prompt the AI or read the relevant documents in `docs/`:
- Check `docs/RULES.md` for domain invariants (diopter steps, `decimal.js`, atomic locks).
- Check `docs/DESIGN.md` for UI tokens and layout modes.
- Check `docs/MEMORY.md` for recent gotchas and environment constraints.

#### Step 2: UNDERSTAND
Identify the exact database tables (`src/lib/db/schema.ts`), Zustand stores (`src/lib/stores/`), and UI components involved. Never assume table structure from memory.

#### Step 3: PLAN
Formulate an explicit, step-by-step implementation plan. For significant features, create an `implementation_plan.md` artifact. Clarify any ambiguities before editing code.

#### Step 4: IMPLEMENT
Make surgical, focused modifications:
- Avoid rewriting entire files when changing a single function or component.
- Preserve all existing imports, comments, and unrelated functionality.
- Apply `decimal.js` for all financial logic and parameterize all SQL queries.

#### Step 5: TEST
Immediately run the verification suite:
```bash
npm run check              # TypeScript compiler & ESLint
npx playwright test e2e/   # Target Playwright E2E spec
```

#### Step 6: REVIEW
Inspect `git diff`:
- Did we introduce any native floating-point math (`+`, `*`) in monetary logic?
- Did we accidentally remove `organizationId` from a database query?
- Did we leak wholesale `cost_price` to the client?

#### Step 7: FIX
If tests fail, fix the root cause. Never comment out a test or add arbitrary sleep timers (`page.waitForTimeout`) to pass an E2E test.

#### Step 8: COMMIT
Commit with conventional commit prefixes:
- `feat(pos): add lens coating selector to pair wizard`
- `fix(inventory): enforce atomic check on frame barcode scan`
- `refactor(billing): migrate discount calculations to decimal.js`

#### Step 9: UPDATE DOCS (Dynamic Elasticity & Archival)
Keep the documentation suite synchronized using the **Dynamic Elasticity Protocol**:
- **Expansion**: If you added new features, endpoints, or schemas, expand the relevant active docs (`docs/TASKS.md`, `docs/MEMORY.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`).
- **Reduction & Pruning**: If you refactored, streamlined, or deprecated features, prune or condense the active documentation content immediately so active docs stay concise and up-to-date.
- **Archival**: If an entire document or design specification is retired, move it into `docs/archive/` and record the change in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
- **Archive Isolation**: Remember that AI agents must **ONLY** look into `docs/archive/` if explicitly requested by the user or when researching historical context. Normal tasks operate strictly on active `docs/`.
- **Graphify Sync**: Run `graphify .` to update the repository's architectural knowledge graph.

---

## 3. The 6-Part OptixOS Prompt Template

To get maximum accuracy and zero regressions from AI coding agents (Claude, Cursor, Antigravity, Copilot), use this structured prompt template:

```markdown
### 1. CONTEXT
We are working on OptixOS, an optical retail POS built with Next.js 16, React 19, Drizzle ORM, Neon PostgreSQL, and Upstash Redis.
Review docs/RULES.md and docs/DESIGN.md before proceeding.

### 2. TASK
[Describe exactly what feature, bug fix, or refactor needs to happen.]

### 3. FILES TO TOUCH
- `src/lib/db/schema.ts`
- `src/components/pos/POSCart.tsx`
- `e2e/pos-checkout.spec.ts`

### 4. DOMAIN CONSTRAINTS
- Monetary math MUST use `decimal.js`. Zero native floats.
- Optical diopters must validate in 0.25 D quarter steps.
- All database queries MUST filter by `organization_id`.
- UI must support native dark mode with 4.5:1 contrast and fluid layout.

### 5. ACCEPTANCE CRITERIA
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### 6. TESTING REQUIREMENTS
Run `npm run check` and `npx playwright test [target-spec.ts]`.
All tests must pass with 100% green status.
```

---

## 4. Local CI Quality Gate (`npm run validate`)

OptixOS includes a composite validation command:
```bash
npm run validate
```
This script executes:
1. `tsc --noEmit`: Strict TypeScript compilation.
2. `next lint`: ESLint rules across the entire app.
3. `playwright test`: Executes core E2E smoke tests.

If any stage fails, the pipeline aborts. **Never bypass the quality gate.**

---

## 5. Knowledge Graph Synchronization (`graphify .`)

To keep AI assistants fully aware of project relationships across files, schemas, and routes:
- Whenever major new modules or schema relations are created, run knowledge indexing or update graph references.
- Maintain accurate cross-references in `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.
