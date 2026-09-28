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
| [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) | Universal active session ledger, recent changes, in-flight goals, and handoff notes for the next agent. |
| [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) | Compact bug fix memory ledger documenting 12+ historical bugs, root causes, and permanent invariants. |
| [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md) | Centralized Security Vulnerability & Technical Debt Registry with CWE tags and remediation plans. |
| [`docs/agent-memory/AGENT_HANDOFF_PROTOCOL.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/AGENT_HANDOFF_PROTOCOL.md) | Universal cross-agent operating lifecycle and memory handoff rules. |
| [`specs/README.md`](file:///f:/hobby-projects/optical-pos/specs/README.md) | Spec-Driven Vibe Coding Engine: encapsulated feature specs (`spec.md`, `plan.md`, `tasks.md`). |
| [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md) | Archive ledger of superseded or retired documentation. |


### 1.1 Dynamically Elastic Documentation
The documentation suite is **dynamically elastic**:
- **Feature Expansion**: When adding features, schemas, or capabilities, the active `docs/` files must expand to accurately capture new invariants, decisions, tasks, and memory.
- **Feature Reduction & Condensation**: When features are pruned, simplified, or deprecated, prune and condense the corresponding active docs content immediately to prevent stale bloat.

### 1.2 Strict Archive Isolation Rule (`docs/archive/`)
- Obsolete, replaced, or superseded documents are relocated to `docs/archive/` and recorded in [`docs/archive/ARCHIVE_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/archive/ARCHIVE_LOG.md).
- **Rule**: AI agents must **ONLY** look into `docs/archive/` if explicitly requested by the user, or when investigating historical provenance. All active planning, code generation, and test validation must rely exclusively on the active `docs/` suite.

### 1.3 Spec-Driven Feature Encapsulation (`specs/`)
- When implementing, expanding, or refactoring features, do NOT rely on sprawling monolithic PRD files. Check the encapsulated directory in `specs/{feature-id}/` (`spec.md`, `plan.md`, `tasks.md`).
- For new features, duplicate `specs/TEMPLATE/` to `specs/{feature-id}-{name}/`.
- Execute tasks incrementally from `tasks.md`, verifying with `npm run check` and E2E tests before checking off boxes.
- Upon completion, move the feature directory to `specs/archive/`.


---

## 2. Knowledge Graph-First Exploration & Graphify Protocol

### 2.1 Never Explore from Scratch ("No Blind Fresh Exploration")
Do NOT explore or rediscover the codebase from scratch on every task using broad directory listings, recursive searches, or unguided grep queries. OptixOS maintains a persistent semantic and AST knowledge graph in `graphify-out/`.
- **Primary Exploration Tool:** Use `graphify` to navigate and query the codebase:
  - `graphify query "<natural language query>"` — Find relevant symbols, files, and architectural communities instantly.
  - `graphify explain "<Symbol>"` — Inspect a symbol's 2-hop dependency radius, callers, callees, and file context.
  - `graphify path "<SymbolA>" "<SymbolB>" --undirected` — Trace execution or dependency paths between components, actions, or schemas.
- Consult `graphify-out/GRAPH_REPORT.md` for high-level community clusters, god nodes, hubs, and domain architecture.

### 2.2 Write Clean, "Graphifyable" Code Before Extraction
To ensure the knowledge graph and AST parsers accurately capture code semantics and relationships:
1. **JSDoc / TSDoc Documentation:** Every exported Server Action, component, Zod validator, Drizzle schema, and utility MUST have a clear JSDoc comment explaining its purpose, parameters (`@param`), and return value (`@returns`).
2. **Explicit Named Exports:** Avoid default anonymous exports. Use named functions and constants (e.g. `export async function verifySuperAdminAccessAction(...)`).
3. **Explicit Type Signatures:** Provide explicit TypeScript parameter and return types so the AST extractor creates precise typed node definitions.
4. **Clean Code Structure:** Keep business logic modular and grouped by domain (vertical slice), avoiding monolithic tangled files that degrade graph modularity.

### 2.3 Mandatory Continuous Graph Sync
Whenever code is created, refactored, or modified:
- You **MUST** run `graphify update .` to incrementally sync the knowledge graph immediately after code changes pass static checks.
- Keep `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` fresh at all times.

---

## 3. Autonomous Official Documentation & MCP Research Protocol

### 3.1 Zero Guesswork on Unprovided Information
If the user assigns a task without providing documentation, API schemas, or specific technical references:
- **Never Guess or Assume:** Strictly avoid hallucinating APIs, parameter shapes, or behavioral defaults from stale memory or training data.
- **MCP Protocol First:** Leverage available Model Context Protocol (MCP) servers (e.g., Notion, Figma, Lovable, Chrome DevTools, database proxies) to extract ground-truth context, UI mockups, database states, or specifications.
- **Live Official Documentation Retrieval:** Proactively use web search and URL reading (`search_web`, `read_url_content`, `browser_subagent`) to read the **latest official documentation** directly from authoritative vendor sources (e.g., Next.js 16, React 19, Drizzle ORM, Neon PostgreSQL, Upstash Redis, Better Auth, Zod).
- **Verify Version Parity:** Check deprecations, breaking changes, and migration guides against the project's exact dependency versions (see `package.json` and [`docs/MEMORY.md`](file:///f:/hobby-projects/optical-pos/docs/MEMORY.md)).

---

## 4. Quality & Bug-Free Correctness Over Token Optimization

### 4.1 Uncompromising Code Quality
The single non-negotiable objective is **clean, robust, production-grade, bug-free code**, NOT saving tokens. Never truncate research, rush implementations, or skip thorough validation to minimize token consumption.

### 4.2 The "Think & Verify Twice" Pre-Implementation Principle
Before implementing any code or making schema modifications:
1. **Inspect Existing Invariants:** Use `graphify explain "<Symbol>"` and inspect existing schemas, validators, and actions to understand the current architecture and blast radius.
2. **Anticipate Edge Cases:** Analyze potential regressions, concurrency collisions, multi-tenant leaks, error branches, and optical domain invariants (e.g., 0.25 D quarter steps, axis rules, decimal.js monetary math).
3. **Double-Check Before Modifying:** Verify assumptions twice against actual codebase files and active documentation before touching code.

---

## 5. Pre-Implementation Root Cause Analysis & Blast Radius Protocol

Before touching, modifying, adding, or removing code:
1. **Diagnose Root Cause First**: Identify the fundamental reason for the defect or requirement. Never apply shallow workaround patches, superficial try/catch masks, or monkey-patches.
2. **Blast Radius & Ripple Effect Mapping**:
   - Run `graphify explain "<Symbol>"` to trace all callers, callees, and dependencies.
   - Audit the complete vertical slice: `Drizzle Schema -> Zod Validator -> Server Action -> Zustand Store -> React UI -> Print / E2E Test`.
3. **Atomic Multi-File Alignment**: When an interface or data structure changes, update all connected tiers atomically in the same task. Never leave partially updated implementations dangling.

---

## 6. Universal In-Project Agent Memory & Bug Logging Protocol

To ensure seamless portability across all AI agents (Gemini, Claude, Cursor, Antigravity) without relying on tool-specific memory stores:
1. **Session Start — Ingest In-Project Memory**:
   - At the very beginning of every session or task, read [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) to understand recent modifications and current in-flight work.
   - Review [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) to avoid repeating past solved bugs.
   - Check [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md) to inspect active security debt and vulnerability mitigations.
2. **Session End — Automatic Memory & Bug Logging**:
   - If any bug was investigated and fixed, append a compact entry to [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).
   - If any security risk cannot be resolved immediately, tag in code with `// TODO(security-SEC-XXX)`, log in [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md), and add to `docs/TASKS.md`.
   - Update [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) with session accomplishments, modified files, active security findings, and clear next steps so the next agent continues seamlessly.

---

## 7. Automated Code Reviews, Security Audits & Technical Debt Protocol

1. **Automated Security Review Gate**:
   - Every code change must satisfy the 8-point security gate (Multi-tenant scoping, costPrice masking, secret protection, rate-limiting, exact financial math, 0.25 D diopters, workshop slip redaction, and parameterized SQL).
2. **Unresolved Vulnerability & Security Debt Invariant**:
   - If an AI agent discovers a vulnerability, code smell, or architectural defect that **cannot be resolved immediately in the current task**:
     - **Annotate in Code**: `// TODO(security-SEC-XXX): [Details and required remediation]`
     - **Register in Log**: Add an entry into [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md).
     - **Track in Backlog**: Add a pending task in `docs/TASKS.md`.
     - **Session Handoff**: Record in [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) under `Active Security Findings`.
     - **Continuous Scanner**: Run `npm run audit:security` to audit active security tags.

---

## 8. Non-Negotiable Operational Invariants

1. **Exact Monetary Math**: Native floating-point operators (`+`, `-`, `*`, `/`) are **strictly forbidden** on monetary fields. Always use `decimal.js` and `.toFixed(2)` for strings.
2. **Optical Diopters in 0.25 D Steps**: Always validate SPH, CYL, and ADD using integer scaling (`Math.round(val * 100) % 25 === 0`).
3. **Axis Invariant**: If `CYL !== 0`, `AXIS` is mandatory and bounded to `[1, 180]`. If `CYL === 0`, `AXIS` is `null`.
4. **Multi-Tenant Scoping**: Every query on business tables must filter by `organization_id`.
5. **Atomic Stock Decrement**: Always deduct inventory with `WHERE stock_quantity >= :qty RETURNING id` inside `db.transaction()`. Never pre-check stock in application memory.
6. **Query-Level Cost Redaction**: Wholesale `cost_price` must be omitted in SQL projections for non-admin roles; never hidden with CSS.
7. **Document Redaction**: Workshop lab slips must completely omit financial/pricing data from the DOM tree.
8. **Knowledge Graph Invariant**: Always orient via `graphify` before broad searches, write graphifyable code with JSDoc, and run `graphify update .` after code updates.
9. **Quality & Pre-Verification Invariant**: Prioritize bug-free completeness and verified official documentation over saving tokens. Think and verify twice before executing changes.
10. **Autonomous Documentation Invariant**: If technical context or documentation is not explicitly provided, fetch the latest official docs via MCP or web search before writing code.
11. **Root Cause & Blast Radius Invariant**: Always diagnose the root cause and map the entire blast radius before touching code.
12. **In-Project Memory Invariant**: Always read `SESSION_HANDOFF.md`, `BUG_FIX_LOG.md`, and `SECURITY_LOG.md` at session start, and update them at session end.
13. **Security & Debt Invariant**: Never drop security findings; tag in code with `// TODO(security-SEC-XXX)`, log in `SECURITY_LOG.md`, and track in `TASKS.md`.
14. **Automated UI/UX Consistency & Component-First Invariant**: Never write raw unstyled HTML interactive elements (`<button>`, unstandardized inputs, arbitrary card containers) with ad-hoc utility strings. Always import and compose from the centralized UI primitives kit `@/components/ui` (`Button`, `Badge`, `Card`, `Input`, `Dialog`, `PageHeader`, `EmptyState`, `StatCard`). Strictly use semantic design tokens; arbitrary hex colors (`bg-[#...]`) are banned and will be blocked by `npm run audit:design`.
15. **Zero-Wasted-Space & Ergonomic Density Invariant**: Eliminate dead whitespace on wide screens; avoid narrow centered columns (`max-w-3xl`) when space is available. Use responsive dual-pane layouts (Form + Live Specimen Preview) and compact vertical table padding (`py-2` to `py-2.5`) to display essential information above the fold without artificial scroll chasing. Utilize registered domain skills (`graphify`, `modern-web-guidance-plugin`) for top-notch UX ergonomics.
16. **Zero-Latency Stale-While-Revalidate (SWR) & 3-Tier Caching Invariant**: Directory and catalog views (Inventory, Patients, Staff, Invoices, Lab Orders) must never mount with empty state `[]` and `isLoading: true` displaying blocking spinners. Always use `useCachedResource` (`@/hooks/use-cached-resource`) to synchronously hydrate initial data from local browser cache in 0ms on the first render frame, revalidate silently in the background (`isRevalidating`), and auto-refresh periodically (e.g., 60s) without customer disruption. Wrap all read-heavy Server Actions with `withCache` in Tier 2, and invalidate on mutations (`invalidateCache` + client `mutate`).

---

## 9. The Local CI Quality Gate

Never mark a task complete without running the validation suite:
```bash
npm run check              # TypeScript strict compiler + ESLint
npm run audit:security     # Automated security & technical debt scanner
npm run audit:design       # Automated design system & UI consistency scanner
npm run test:pos           # Core POS Playwright E2E tests
# OR
npm run validate           # Full composite quality gate (check + security + design + e2e)
graphify update .          # Refresh AST & semantic knowledge graph
```

After passing the quality gate and updating graphify, ensure `docs/agent-memory/SESSION_HANDOFF.md`, `docs/agent-memory/BUG_FIX_LOG.md`, `docs/agent-memory/SECURITY_LOG.md`, `docs/TASKS.md`, and `docs/MEMORY.md` are updated.




