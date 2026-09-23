# OptixOS — Universal AI Agent Engineering Guidelines

Welcome, AI Agent. You are operating on **OptixOS**, an enterprise-grade, domain-engineered Optical Point-of-Sale (POS) and Practice Management System.

---

## 1. Single Source of Truth: The `docs/` Suite

OptixOS maintains an interconnected, production-level documentation architecture in `docs/`. Before planning or implementing any task, you **MUST** consult the authoritative specification:

| Document | Purpose & Key Topics |
| :--- | :--- |
| [`docs/PRD.md`](file:///f:/hobby-projects/optical-pos/docs/PRD.md) | Product vision, master roadmap (Phases 1–16), user journeys, and feature specs. |
| [`docs/ARCHITECTURE.md`](file:///f:/hobby-projects/optical-pos/docs/ARCHITECTURE.md) | Full-stack topology, 3-tier decoupling, Neon connection pooler, Upstash Redis caching with fallback, multi-tenancy model. |
| [`docs/DESIGN.md`](file:///f:/hobby-projects/optical-pos/docs/DESIGN.md) | Native dark mode tokens, fluid full-width layout (`p-4 md:p-6 gap-6`), 4.5:1 WCAG AA contrast, and the 4 POS Viewport Modes. |
| [`docs/RULES.md`](file:///f:/hobby-projects/optical-pos/docs/RULES.md) | Strict coding invariants: `decimal.js` monetary math, 0.25 D diopter validation, axis rules, atomic SQL inventory decrement. |
| [`docs/DECISIONS.md`](file:///f:/hobby-projects/optical-pos/docs/DECISIONS.md) | Architectural Decision Records (ADR-001 through ADR-008) explaining architectural rationale. |
| [`docs/SECURITY.md`](file:///f:/hobby-projects/optical-pos/docs/SECURITY.md) | Tenant isolation, 4-tier RBAC matrix, wholesale cost query redaction, XSS/SQL injection prevention. |
| [`docs/TEST_PLAN.md`](file:///f:/hobby-projects/optical-pos/docs/TEST_PLAN.md) | Quality assurance pyramid, test isolation protocol, 13 core regression workflows test matrix. |
| [`docs/TASKS.md`](file:///f:/hobby-projects/optical-pos/docs/TASKS.md) | Development phase tracker, active tasks, future roadmap, and the strict Definition of Done (DoD). |
| [`docs/MEMORY.md`](file:///f:/hobby-projects/optical-pos/docs/MEMORY.md) | Living ledger of tech versions, 100% test pass rate, active features, and critical developer gotchas. |
| [`docs/VIBE_WORKFLOW.md`](file:///f:/hobby-projects/optical-pos/docs/VIBE_WORKFLOW.md) | The 9-step OptixOS Vibe Coding Playbook, 6-part prompt templates, and quality gate commands. |
| [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md) | Archive ledger of superseded or retired documentation. |

### 1.1 Dynamically Elastic Documentation
The documentation suite is **dynamically elastic**:
- **Feature Expansion**: When adding features, schemas, or capabilities, the active `docs/` files must expand to accurately capture new invariants, decisions, tasks, and memory.
- **Feature Reduction & Condensation**: When features are pruned, simplified, or deprecated, prune and condense the corresponding active docs content immediately to prevent stale bloat.

### 1.2 Strict Archive Isolation Rule (`docs/archive/`)
- Obsolete, replaced, or superseded documents are relocated to `docs/archive/` and recorded in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
- **Rule**: AI agents must **ONLY** look into `docs/archive/` if explicitly requested by the user, or when investigating historical provenance. All active planning, code generation, and test validation must rely exclusively on the active `docs/` suite.

---

## 2. Non-Negotiable Operational Invariants

1. **Exact Monetary Math**: Native floating-point operators (`+`, `-`, `*`, `/`) are **strictly forbidden** on monetary fields. Always use `decimal.js` and `.toFixed(2)` for strings.
2. **Optical Diopters in 0.25 D Steps**: Always validate SPH, CYL, and ADD using integer scaling (`Math.round(val * 100) % 25 === 0`).
3. **Axis Invariant**: If `CYL !== 0`, `AXIS` is mandatory and bounded to `[1, 180]`. If `CYL === 0`, `AXIS` is `null`.
4. **Multi-Tenant Scoping**: Every query on business tables must filter by `organization_id`.
5. **Atomic Stock Decrement**: Always deduct inventory with `WHERE stock_quantity >= :qty RETURNING id` inside `db.transaction()`. Never pre-check stock in application memory.
6. **Query-Level Cost Redaction**: Wholesale `cost_price` must be omitted in SQL projections for non-admin roles; never hidden with CSS.
7. **Document Redaction**: Workshop lab slips must completely omit financial/pricing data from the DOM tree.

---

## 3. The Local CI Quality Gate

Never mark a task complete without running the validation suite:
```bash
npm run check              # TypeScript strict compiler + ESLint
npm run test:pos           # Core POS Playwright E2E tests
# OR
npm run validate           # Full composite quality gate
```

After passing the quality gate, ensure documentation in `docs/TASKS.md` and `docs/MEMORY.md` is updated.
