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

#### Step 1: READ (Ingest Specs & Memory)
Before writing a single line of code, prompt the AI or read the authoritative files:
- Inspect [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) for the latest project state and recent handoff notes.
- Review [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) to avoid repeating known past bugs.
- If working on a specific feature, check its encapsulated directory in `specs/{feature-id}/` (`spec.md`, `plan.md`, `tasks.md`).
- Check `docs/RULES.md` for domain invariants (diopter steps, `decimal.js`, atomic locks, multi-tenant isolation).
- Check `docs/DESIGN.md` for UI tokens, layout modes, and dark mode contrast standards.

#### Step 2: UNDERSTAND (Knowledge Graph & Blast Radius)
- Orient using `graphify` (`graphify query`, `graphify explain "<Symbol>"`) to map callers, callees, and dependencies without blind searching.
- Identify the exact database tables (`src/db/schema.ts`), Zustand stores (`src/lib/stores/`), Server Actions, and UI components involved.
- Map the entire vertical blast radius across the application stack.

#### Step 3: PLAN (Spec-Driven Architecture)
- If starting a new feature, duplicate `specs/TEMPLATE/` to `specs/{feature-id}-{name}/` and draft `spec.md`.
- Formulate an explicit, step-by-step implementation plan in `plan.md` detailing schema changes, actions, and test strategies.
- Break down the plan into atomic, checkable sub-tasks in `tasks.md`.

#### Step 4: IMPLEMENT (Surgical Code Edits, Component-First UI & Compact Ergonomics)
- Execute tasks in `tasks.md` sequentially.
- **Component-First UI Mandate**: Always use centralized UI primitives from `@/components/ui` (`Button`, `Badge`, `Card`, `Input`, `Dialog`, `PageHeader`, `EmptyState`, `StatCard`). Never write raw `<button>` or ad-hoc unstyled inputs.
- **Zero-Wasted-Space & Compact Ergonomics**:
  - Never squeeze administrative forms into narrow centered columns (`max-w-3xl`) when wide display space is available. Use responsive **Dual-Pane layouts** (`grid grid-cols-1 lg:grid-cols-12 gap-6`) where the right pane provides live previews (e.g. realistic receipt specimens, metrics, or guides).
  - Compact vertical rhythm: table rows use `py-2` to `py-2.5` to present 15+ records above the fold without artificial scrolling.
  - Multi-column scaling: card decks scale gracefully to 4 columns on wide displays (`xl:grid-cols-4`).
  - Primary controls (Save, Discard, New Record) must remain immediately visible above the fold.
- **Trusted Skills & Domain Guidelines**: Proactively utilize registered specialized skills (e.g. `graphify` for AST architecture, `modern-web-guidance-plugin` for state-of-the-art UI ergonomics and accessibility) to produce world-class interfaces.
- Use semantic design tokens (`bg-primary`, `text-muted-foreground`, `border-border`). Arbitrary hex colors (`bg-[#...]`) are strictly forbidden.
- Top-level page roots must use `<div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">`.
- Write clean, graphifyable code with JSDoc comments (`@param`, `@returns`) and explicit named exports.
- Apply `decimal.js` for all financial logic, parameterize SQL queries, and enforce `organization_id` scoping.

#### Step 5: TEST
Immediately run the verification suite:
```bash
npm run check              # TypeScript compiler & ESLint
npx playwright test e2e/   # Target Playwright E2E spec
```

#### Step 6: REVIEW, SECURITY & DESIGN AUDIT
1. Inspect `git diff` against the optical and architectural invariants:
   - Did we use `@/components/ui` primitives rather than ad-hoc inline styled elements?
   - Did we optimize viewport real estate without dead whitespace or needless scroll containers?
   - Did we introduce any native floating-point math (`+`, `*`) in monetary logic?
   - Did we accidentally remove `organizationId` from a database query?
   - Did we leak wholesale `cost_price` to the client in Server Actions or print views?
2. Run automated security & design system scanners:
   ```bash
   npm run audit:security     # Multi-tenant, financial math & secret scan
   npm run audit:design       # Hardcoded hex & layout consistency scan
   ```
3. **Unresolved Vulnerability & Bug Protocol**: If an issue or debt cannot be resolved immediately in this turn:
   - Add in-code tag: `// TODO(security-SEC-XXX): <details>` or `// TODO(bug-BUG-XXX): <details>`
   - Register in [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md) or [`BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md)
   - Add to `docs/TASKS.md` backlog and pass to next agent in `SESSION_HANDOFF.md`.

#### Step 7: FIX
If tests fail or audit flags critical issues, fix the root cause. Never comment out a test or add arbitrary sleep timers (`page.waitForTimeout`) to pass an E2E test.

#### Step 8: COMMIT
Commit with conventional commit prefixes:
- `feat(pos): add lens coating selector to pair wizard`
- `fix(inventory): enforce atomic check on frame barcode scan`
- `refactor(billing): migrate discount calculations to decimal.js`

#### Step 9: UPDATE DOCS & AGENT MEMORY (Dynamic Elasticity & Handoff)
Keep the documentation suite synchronized using the **Dynamic Elasticity Protocol**:
- **Agent Memory Handoff**: Update [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) with session accomplishments, modified files, and next steps.
- **Bug Fix Log**: If a bug was solved, append a compact entry to [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).
- **Security Vulnerability & Debt Registry**: If a security issue was found or fixed, update [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md).
- **Spec Archival**: If a feature in `specs/{feature-id}` is complete, move it to `specs/archive/`.
- **Roadmap & Memory**: Update `docs/TASKS.md` checklist and `docs/MEMORY.md` gotchas.
- **Knowledge Graph Sync**: Run `graphify update .` to sync the AST and semantic knowledge graph.

---

## 3. The 6-Part OptixOS Prompt Template

To get maximum accuracy and zero regressions from AI coding agents (Claude, Cursor, Antigravity, Copilot), use this structured prompt template:

```markdown
### 1. CONTEXT & MEMORY
We are working on OptixOS, an optical retail POS built with Next.js 16, React 19, Drizzle ORM, Neon PostgreSQL, and Upstash Redis.
Read docs/agent-memory/SESSION_HANDOFF.md and docs/agent-memory/BUG_FIX_LOG.md before proceeding.
If working on a feature, review its spec in specs/{feature-id}/.

### 2. TASK
[Describe exactly what feature, bug fix, or refactor needs to happen.]

### 3. BLAST RADIUS AUDIT
Map callers and callees using `graphify explain "<Symbol>"`.
Audit all tiers: Schema -> Validator -> Action -> Store -> UI -> Test.

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

## 5. Knowledge Graph Synchronization (`graphify update .`)

To keep AI assistants fully aware of project relationships across files, schemas, and routes:
- Whenever code changes pass validation, run `graphify update .` to incrementally refresh the AST and semantic graph in `graphify-out/`.
- Maintain accurate cross-references in `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.

