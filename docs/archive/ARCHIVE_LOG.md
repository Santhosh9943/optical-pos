# OptixOS Documentation Archive Log

This directory (`docs/archive/`) houses superseded, historical, deprecated, or replaced documentation artifacts from the OptixOS engineering lifecycle.

---

## 1. Archive Access Protocol & Invariant

> [!IMPORTANT]
> **Strict Agent Access Invariant**:
> AI coding assistants and developers must **ONLY** look into `docs/archive/` if explicitly requested by the user, or when investigating historical architectural provenance and legacy migration context.
>
> For all active feature development, refactoring, bug fixing, and testing, agents **MUST EXCLUSIVELY** rely on the active, maintained `docs/` suite:
> - [`docs/PRD.md`](file:///f:/hobby-projects/optical-pos/docs/PRD.md)
> - [`docs/ARCHITECTURE.md`](file:///f:/hobby-projects/optical-pos/docs/ARCHITECTURE.md)
> - [`docs/DESIGN.md`](file:///f:/hobby-projects/optical-pos/docs/DESIGN.md)
> - [`docs/RULES.md`](file:///f:/hobby-projects/optical-pos/docs/RULES.md)
> - [`docs/DECISIONS.md`](file:///f:/hobby-projects/optical-pos/docs/DECISIONS.md)
> - [`docs/SECURITY.md`](file:///f:/hobby-projects/optical-pos/docs/SECURITY.md)
> - [`docs/TEST_PLAN.md`](file:///f:/hobby-projects/optical-pos/docs/TEST_PLAN.md)
> - [`docs/TASKS.md`](file:///f:/hobby-projects/optical-pos/docs/TASKS.md)
> - [`docs/MEMORY.md`](file:///f:/hobby-projects/optical-pos/docs/MEMORY.md)
> - [`docs/VIBE_WORKFLOW.md`](file:///f:/hobby-projects/optical-pos/docs/VIBE_WORKFLOW.md)

---

## 2. Dynamic Documentation Elasticity Lifecycle

To prevent documentation rot, stale bloat, and confusion:
1. **Feature Expansion**: When new features, schemas, or capabilities are implemented, active documentation files dynamically expand with precise, domain-accurate descriptions, ADRs, and tests.
2. **Feature Reduction & Condensation**: When features are refactored, streamlined, or simplified, obsolete details are removed or condensed in active docs.
3. **Deprecation & Archival**: When an entire document, conceptual specification, or major workflow is replaced or decommissioned:
   - The file is relocated to `docs/archive/`.
   - An entry is logged below in the Archive Ledger specifying the date, the reason for archival, and the active document that replaces it.
   - Active documentation references are updated to point to current architecture.

---

## 3. Archive Ledger

| Date | Archived File | Reason / Superseded By | Replaced By / Active Reference |
| :--- | :--- | :--- | :--- |
| **2026-09-24** | `Vibe Coding_ A Complete Beginner-to-Production Guide.md` | Original generic beginner reference guide. Synthesized and fully adapted into the production-grade OptixOS domain documentation suite. | [`docs/ARCHITECTURE.md`](file:///f:/hobby-projects/optical-pos/docs/ARCHITECTURE.md), [`docs/RULES.md`](file:///f:/hobby-projects/optical-pos/docs/RULES.md), [`docs/VIBE_WORKFLOW.md`](file:///f:/hobby-projects/optical-pos/docs/VIBE_WORKFLOW.md), [`docs/TASKS.md`](file:///f:/hobby-projects/optical-pos/docs/TASKS.md) |

---

## 4. Archival Procedure for Developers & Agents

When retiring a document or major obsolete section:
1. Move the file into `docs/archive/<filename>`.
2. Append a new row to the table in `docs/archive/ARCHIVE_LOG.md`.
3. Remove or prune any dead cross-links in the active `docs/` suite.
4. Run `graphify .` to update the repository's semantic knowledge graph.
