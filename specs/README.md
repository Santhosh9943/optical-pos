# OptixOS — Spec-Driven Vibe Coding Engine

Welcome to the **Spec-Driven Vibe Coding Hub**. This directory encapsulates feature specifications, technical plans, and atomic task checklists to keep AI coding agents laser-focused, prevent context rot, and ensure rapid, bug-free implementations.

---

## 1. Why Spec-Driven Vibe Coding?

In standard vibe coding, feeding an AI assistant a 30-page global PRD or an unconstrained prompt leads to:
- **Context Rot**: The AI forgets critical domain invariants because the context window is crowded with unrelated features.
- **Hallucinations**: The AI invents database columns or API shapes instead of building what is needed.
- **Drift**: Tasks sprawl beyond their intended scope.

**The Solution**: Treat every feature as an encapsulated, self-contained unit:
```
specs/{feature-id}-{feature-name}/
├── spec.md      # WHAT & WHY: User stories, domain rules, acceptance criteria
├── plan.md      # HOW: Architecture, Drizzle schema, blast radius, security
└── tasks.md     # STEP-BY-STEP: Granular checklist executed atomically by the AI
```

---

## 2. Directory Structure

- **`TEMPLATE/`**: Reusable boilerplate files (`spec.md`, `plan.md`, `tasks.md`). Always duplicate this folder when starting a new feature.
- **`{feature-id}-{name}/`**: Active or in-flight features (e.g. `024-gst-e-invoicing/`).
- **`archive/`**: Completed and verified features moved here to keep the root `specs/` directory clean.

---

## 3. The 3-Document Linked Chain

| Document | Purpose | Author / Generator |
| :--- | :--- | :--- |
| **`spec.md`** | Defines requirements, user personas, inputs/outputs, optical constraints, and Gherkin (`Given/When/Then`) acceptance criteria. | Human Engineer or AI under human direction |
| **`plan.md`** | Maps technical implementation: schema migrations, Server Actions, Zustand stores, UI components, blast radius, and test strategies. | AI Agent (reviewed by Human) |
| **`tasks.md`** | Deconstructs `plan.md` into atomic, checkable sub-tasks with strict Definition of Done (DoD). | AI Agent (executed step-by-step) |

---

## 4. How to Start a New Feature

1. **Copy the Template**:
   ```bash
   cp -r specs/TEMPLATE specs/025-my-new-feature
   ```
2. **Draft `spec.md`**: Fill in the requirements, edge cases, and optical invariants.
3. **Prompt the AI**:
   > *"Review `specs/025-my-new-feature/spec.md`. Using our `docs/ARCHITECTURE.md` and `docs/RULES.md`, generate `plan.md` and `tasks.md`."*
4. **Vibe Code Atomically**: Have the AI execute tasks one by one, checking off boxes in `tasks.md` as each passes tests (`npm run check`, `npm run test:pos`).
5. **Archive on Completion**: Once the feature passes the local CI gate and is merged, move the folder to `specs/archive/`.
