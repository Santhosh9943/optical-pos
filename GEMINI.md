# OptixOS — Gemini & Universal AI Agent Engineering Guidelines

Welcome, Agent. You are operating on **OptixOS**, an enterprise-grade, domain-engineered Optical Point-of-Sale (POS) and Practice Management System.

---

## 1. Universal In-Project Memory Hub (Read First!)

OptixOS stores all cross-agent context, memory, and bug logs **directly inside this repository**, not in isolated agent storage. Regardless of whether previous sessions were run in Gemini, Claude, Cursor, or Antigravity:

1. **Active Session Handoff**: At the start of your turn, ALWAYS read [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md). It tells you exactly what the last agent completed, recent modifications, and in-flight work so you can continue seamlessly without the user needing to repeat instructions.
2. **Compact Bug Fix Memory Ledger**: ALWAYS review [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md). It documents 12+ historical bugs and permanent invariants. You must never repeat these solved bugs.
3. **Security Vulnerability & Debt Registry**: Check [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md) to inspect open security findings, active debt, and remediation plans.
4. **Agent Handoff Protocol**: Review [`docs/agent-memory/AGENT_HANDOFF_PROTOCOL.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/AGENT_HANDOFF_PROTOCOL.md) for the universal agent lifecycle.
5. **Spec-Driven Feature Engine**: When implementing or refactoring features, check `specs/{feature-id}/` for `spec.md`, `plan.md`, and `tasks.md`. Execute tasks incrementally to maintain laser-focused context without loading monolithic PRD files.

---

## 2. Knowledge Graph-First Exploration (`graphify`)

- **Strictly Forbidden**: Never explore the codebase from scratch with blind file listings or wide grep queries.
- **Knowledge Graph Tools**:
  - `graphify query "<query>"`: Locate relevant symbols, files, and architectural communities.
  - `graphify explain "<Symbol>"`: Inspect callers, callees, and 2-hop dependency radius.
  - `graphify path "<Source>" "<Target>" --undirected`: Trace call paths and connections.
- Consult `graphify-out/GRAPH_REPORT.md` for architectural community structures.

---

## 3. Pre-Implementation Protocol: Root Cause & Blast Radius Analysis

Before touching, modifying, or deleting any code:
1. **Root Cause Analysis**: Diagnose the fundamental cause of a bug or requirement. Never apply shallow workaround patches.
2. **Blast Radius Mapping**: Use `graphify explain "<Symbol>"` to identify all callers, callees, stores, and tests affected.
3. **Atomic Multi-Tier Alignment**: If a data structure changes, atomically update every connected layer:
   `Drizzle Schema -> Zod Validator -> Server Action -> Zustand Store -> React Component -> Print/E2E Test`

---

## 4. Autonomous Official Documentation & MCP Protocol

- **Zero Guesswork**: When the user provides a task without explicit documentation or API signatures, never hallucinate or guess from memory.
- **Live Official Retrieval**: Proactively use MCP servers (Figma, Notion, Lovable, Chrome DevTools, DB tools) or web search/URL retrieval (`search_web`, `read_url_content`, `browser_subagent`) to read the **latest official documentation** directly from vendors.
- **Version Parity**: Match API usage against exact dependency versions in `package.json` (Next.js 16, React 19, Better Auth, Drizzle ORM, Neon PostgreSQL, Upstash Redis, Tailwind v4, Zod).

---

## 5. Quality & Bug-Free Correctness Over Token Optimization

- **Quality Priority**: Clean, robust, production-grade, bug-free code strictly supersedes token saving. Never rush, truncate research, or omit validation steps.
- **Think & Verify Twice**: Inspect existing schemas, verify domain invariants (0.25 D diopters, axis rules, exact monetary math via `decimal.js`, atomic stock decrement, multi-tenant isolation), and anticipate edge cases before touching code.

---

## 6. Automated Code Review & Security Vulnerability Protocol

- **9-Point Security Gate**: Multi-tenant scoping, operational branch isolation (never leak branches or entities of Practice A into Practice B, even for Super Admins in operational context), costPrice masking, secret protection, rate-limiting, exact financial math, 0.25 D diopters, workshop slip redaction, and parameterized SQL.
- **Unresolved Risk Protocol**: If an agent discovers a vulnerability, code smell, or debt that **cannot be resolved immediately in the current task**:
  - Annotate in code: `// TODO(security-SEC-XXX): [Details and mitigation]`
  - Register in [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md).
  - Add to pending tasks in `docs/TASKS.md` and `docs/agent-memory/SESSION_HANDOFF.md`.
  - Run `npm run audit:security` to confirm detection.

---

## 7. Automated UI/UX Consistency & Component-First Protocol

- **Component-First Invariant**: Never write raw unstyled HTML interactive elements (`<button>`, unstandardized inputs, arbitrary card containers) with ad-hoc utility strings. Always import and compose from the centralized UI primitives kit `@/components/ui` (`Button`, `Badge`, `Card`, `Input`, `Dialog`, `PageHeader`, `EmptyState`, `StatCard`).
- **Semantic Design Tokens**: Strictly use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, etc.). Hardcoded arbitrary hex colors (`bg-[#...]`) are strictly forbidden and automatically blocked.
- **Fluid Full-Width Layout**: Top-level page roots must use `<div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">`. Constrained containers (`max-w-* mx-auto`) are banned on operational dashboard views.
- **Zero-Wasted-Space & Compact Ergonomics**: Eliminate dead whitespace on wide screens; avoid narrow centered columns (`max-w-3xl`) when space is available. Use responsive dual-pane layouts (Form + Live Specimen Preview) and compact vertical table padding (`py-2` to `py-2.5`) to display essential information above the fold without artificial scroll chasing. Utilize registered domain skills (`graphify`, `modern-web-guidance-plugin`) for top-notch UX ergonomics.

---

## 8. Zero-Latency Stale-While-Revalidate (SWR) & 3-Tier Caching Protocol

- **Zero-Spinner Invariant**: Directory views (Inventory, Patients, Staff, Invoices, Lab Orders) must never mount with empty state `[]` and `isLoading: true` displaying blocking spinners. Always use `useCachedResource` (`@/hooks/use-cached-resource`) to synchronously hydrate initial data from local browser cache in 0ms on the first render frame.
- **Silent Background Revalidation**: Revalidation runs silently in the background (`isRevalidating`) with periodic auto-refresh (60s) without freezing or disrupting user interaction.
- **Tier 2 Redis & Tier 3 Neon**: Wrap all listing Server Actions with `withCache` in `src/lib/cache.ts`. On mutations (create/update/delete), immediately call `invalidateCache` on the server and optimistic `mutate` on the client.

---

## 9. The Local CI Quality Gate & Session Handoff

Never mark a task complete without executing:
```bash
npm run check              # TypeScript strict compiler + ESLint (0 errors, 0 warnings)
npm run audit:security     # Automated security & technical debt scanner
npm run audit:design       # Automated design system & UI consistency scanner
npm run test:pos           # Core POS Playwright E2E tests (100% green)
# OR
npm run validate           # Full composite quality gate (check + security + design + e2e)
graphify update .          # Refresh AST & semantic knowledge graph
```

Before ending your response:
1. If you fixed a bug, append a new compact entry to [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md).
2. If any security risk or debt was noted, tag with `// TODO(security-SEC-XXX)` and log in [`docs/agent-memory/SECURITY_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SECURITY_LOG.md).
3. Update [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) with accomplishments, modified files, active security findings, and next steps for the next agent.

