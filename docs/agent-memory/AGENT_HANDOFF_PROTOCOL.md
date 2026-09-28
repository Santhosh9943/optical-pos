# Universal AI Agent Handoff & Memory Protocol

This document defines the standard operating lifecycle for any AI agent (Antigravity, Gemini, Claude, Cursor, Codex, Windsurf) working on the **OptixOS** codebase.

---

## 1. The Universal Agent Lifecycle

Every agent task must follow this 3-stage lifecycle:

```
+-----------------------------------------------------------------------------------+
| 1. INGESTION (Orientation)                                                        |
|    - Read docs/agent-memory/SESSION_HANDOFF.md                                    |
|    - Read docs/agent-memory/BUG_FIX_LOG.md                                        |
|    - Query graphify (graphify query / graphify explain)                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. EXECUTION (Root Cause & Implementation)                                        |
|    - Perform Root Cause Analysis (never apply shallow patches)                    |
|    - Map Blast Radius (inspect callers, callees, database, stores)                |
|    - Retrieve official documentation via MCP / web search if not provided         |
|    - Write graphifyable code (JSDocs, named exports, strict types)                |
|    - Think & Verify Twice (Quality over token optimization)                       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. HANDOFF (Validation & Memory Persistence)                                      |
|    - Run local quality gate (npm run check or npm run validate)                   |
|    - Log any fixed bugs into docs/agent-memory/BUG_FIX_LOG.md                     |
|    - Update docs/agent-memory/SESSION_HANDOFF.md with latest state                |
|    - Sync knowledge graph via graphify update .                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Ingestion Protocol: Step-by-Step

When you receive a user request:
1. **Never explore blindly from scratch**: Do not run wide recursive directory searches or unguided greps.
2. **Read the In-Project Agent Memory**:
   - Inspect [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) to understand what the last agent completed and what is currently in flight.
   - Inspect [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) to ensure your implementation doesn't repeat past solved bugs (e.g. monetary string concatenation, diopter modulo drift, atomic stock decrements).
3. **Orient via `graphify`**:
   - Run `graphify query "<feature or symbol>"` to find relevant symbols and architectural communities.
   - Run `graphify explain "<Symbol>"` to inspect dependencies, callers, and callees.

---

## 3. Execution Protocol: Root Cause & Blast Radius Analysis

Before touching any code:
1. **Root Cause Diagnosis**:
   - Identify the fundamental reason for the bug or requirement. Avoid superficial quick fixes or wrapper hacks that leave underlying issues intact.
2. **Blast Radius & Ripple Effect Mapping**:
   - Trace the entire vertical slice for the affected feature:
     `Drizzle DB Schema` -> `Zod Validator` -> `Server Action` -> `Zustand Store` -> `React UI` -> `Hardware Print / E2E Test`
   - If any contract changes, update all connected tiers atomically.
3. **Official Documentation & MCP Protocol**:
   - If technical information or API parameters are missing, do not guess. Proactively fetch live official documentation via MCP or web search (`search_web`, `read_url_content`).
4. **Prioritize Bug-Free Quality Over Tokens**:
   - Think and verify twice before executing changes.

---

## 4. Handoff Protocol: Session Closure Checklist

Before concluding your response to the user:
- [ ] **Quality Gate**: Run `npm run check` (static types + lint) and ensure 0 errors.
- [ ] **Bug Fix Log**: If a bug was resolved, append a compact entry to [`docs/agent-memory/BUG_FIX_LOG.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/BUG_FIX_LOG.md) with Symptom, Root Cause, Fix, and Permanent Invariant.
- [ ] **Session Handoff Update**: Update [`docs/agent-memory/SESSION_HANDOFF.md`](file:///f:/hobby-projects/optical-pos/docs/agent-memory/SESSION_HANDOFF.md) with:
  - Timestamp and Agent identifier.
  - Summary of accomplished work.
  - Recent files modified.
  - Current quality gate status.
  - Instructions for the next agent.
- [ ] **Knowledge Graph Sync**: Run `graphify update .` to keep the AST and semantic knowledge graph fresh.
