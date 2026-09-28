# Technical Implementation Plan: [Feature Name]

- **Feature ID**: `[e.g. 025-feature-name]`
- **Spec Reference**: [`spec.md`](spec.md)
- **Status**: `Draft | Approved | In Progress | Completed`

---

## 1. Architectural Architecture & Data Flow

```
Tier 1: Client UI ──(0ms sync hydrate via useCachedResource)──> Immediate Render (0ms)
       │
       ▼ (Silent background revalidate / Periodic 60s auto-refresh)
Tier 2: Server Action ──(withCache: 'optix:{orgId}:{entity}')──> Redis / Memory LRU (5ms)
       │ (on cache miss or mutation invalidation)
       ▼
Tier 3: Drizzle ORM (Neon DB with -pooler) ──> Atomic ACID transaction
```

---

## 2. Database & Schema Modifications
- Tables added or columns modified in `src/db/schema.ts`.
- Required DDL migrations and seed updates.
- Index additions for high-frequency queries.

---

## 3. Pre-Implementation Blast Radius & Dependency Audit

Before modifying code, audit existing connections using `graphify explain`:

| Impacted Component | File Path | Risk / Invariant to Protect |
| :--- | :--- | :--- |
| **Drizzle Schema** | `src/db/schema.ts` | Multi-tenant `organization_id` foreign key. |
| **Server Action** | `src/actions/` | Wrapped in `withCache`; calls `invalidateCache` on mutations. |
| **Client Hook / Store** | `src/hooks/` or `src/store/` | Uses `useCachedResource` for 0ms render without spinners. |
| **React View** | `src/components/` | Component-first primitives (`@/components/ui/`) & dark mode. |
| **E2E Test** | `e2e/` | Test isolation with synthetic org ID. |

---

## 4. Caching, Security & Multi-Tenancy Controls
- **Tier 1 Client SWR**: Synchronous local cache hydration (`useCachedResource`) + silent background auto-refresh (60s).
- **Tier 2 Server Caching**: Reads wrapped with `withCache`; mutations call `invalidateCache`.
- **Multi-Tenant Query Scoping**: Strict `WHERE organization_id = session.organizationId`.
- **RBAC & Redaction**: Wholesale cost price redaction from client payloads for non-manager roles.

---

## 5. Verification & Testing Strategy
- **Static Gate**: `npm run check` (TypeScript strict mode + ESLint).
- **Playwright Test Spec**: `e2e/[feature-name].spec.ts` covering success, edge cases, and failure modes.
- **Knowledge Graph Sync**: `graphify update .` post-implementation.
