# C19 — Two Sources of Truth + Cross-Tab Sync

**Tier 3 — Staff-level state management**

## The Problem This Challenge Teaches

In a real Next.js app with TanStack Query you will almost certainly end up with the **same data
stored in two different places simultaneously**:

1. The **server-side `'use cache'` cache** — holds RSC-rendered HTML produced from the data.
2. The **TanStack Query client cache** — a in-memory JavaScript object in the browser, keyed by
   `queryKey`, that backs your client components.

These two caches are completely independent. They do not share a lifetime, a clock, or an
invalidation mechanism. The moment you perform a mutation, they can — and will — diverge.

This challenge makes that divergence **visible, reproducible, and debuggable**, then shows you
three strategies for bringing them back into agreement.

---

## Learning Objectives

After completing this challenge you should be able to:

- [ ] Explain in one sentence why the TanStack client cache and the RSC server cache diverge after
      a mutation.
- [ ] Describe the three reconciliation strategies and state one tradeoff for each.
- [ ] Implement `invalidateQueries` + `router.refresh()` as the full-stack reconciliation path.
- [ ] Build a `useCrossTabSync` hook using `BroadcastChannel` and explain its fallback.
- [ ] Identify when cross-tab sync matters (shopping carts, saved items, notification counts,
      collaborative data) and when it is overkill.

---

## Acceptance Criteria

1. **Visible divergence** — The page has a "Saved Items" list rendered in two panels side by side:
   - Panel A: **TanStack Query** client panel — reads from the TQ cache, shows real-time query state
     (`isLoading`, `isFetching`, `dataUpdatedAt`).
   - Panel B: **RSC server** panel — rendered by a Server Component from the server-side
     `'use cache'` boundary, shows cached-at timestamp.
   After clicking "Save Item" (a Server Action mutation), Panel A updates immediately but Panel B
   **still shows the old list** — this is the divergence made visible.

2. **Reconciliation** — A "Reconcile" button calls `invalidateQueries()` + `router.refresh()`
   simultaneously. Both panels converge to the same data. The challenge explains (inline) why both
   calls are needed and what breaks if you omit either.

3. **Cross-tab sync** — When the same page is open in two browser tabs, saving an item in Tab 1
   **automatically updates Tab 2** within ~100ms, without a manual reload. This uses
   `BroadcastChannel` (with a `storage` event fallback for Safari PrivateBrowsing).

4. **`useCrossTabSync` hook** — Lives in `_lib/sync.ts`. Exported as `useCrossTabSync`. Takes a
   query key and a channel name. On mount, subscribes to the channel; on mutation, broadcasts a
   `"invalidate"` message; on receiving a message, calls `invalidateQueries` on the provided key.

5. **Documented mental model** — `spec.md` (this file) contains the mental model diagram and the
   reconciliation strategy comparison table.

---

## The Mental Model: Who Is the Source of Truth?

```
Browser Tab (Client)                Server (Node.js process)
─────────────────────               ────────────────────────────
┌────────────────────┐              ┌────────────────────────────┐
│  TanStack Query     │              │  'use cache' boundary       │
│  client cache       │              │  (keyed by cacheTag)        │
│                     │              │                            │
│  Key: ["items"]     │  DIVERGE     │  Tag: "saved-items:user1"  │
│  Data: [A, B]       │ ────────►    │  Data: [A]  ← STALE        │
│  (fresh - just      │              │  (not yet invalidated)      │
│   mutated)          │              │                            │
└────────────────────┘              └────────────────────────────┘
```

**Neither cache is inherently "right"**. The server cache holds the last value it computed when
it was last rendered. The client cache holds the last value the client fetched from the API. After
a mutation that goes directly to the data layer (a Server Action), the server-cache tag is
invalidated but the client cache is NOT automatically told to refetch — because TanStack Query has
no knowledge of `revalidateTag`.

Conversely, if a Server Action only calls `revalidateTag` without returning a signal, the client
cache can never know a change happened.

---

## Reconciliation Strategy Comparison

| Strategy | How it works | Latency | Complexity | When to use |
|---|---|---|---|---|
| **Strategy 1: Full-stack reconcile** | Server Action calls `revalidateTag`. Client calls `invalidateQueries` + `router.refresh()` | ~1 round trip | Medium | The gold standard for most mutations. Both caches converge in one user action. |
| **Strategy 2: Server as single source** | Abandon TanStack Query for this data. Use only RSC + Server Actions. | 0 (no client cache) | Low | Read-heavy data that does not need optimistic UI. Statuses, order history. |
| **Strategy 3: Client as single source** | All reads go through TanStack Query (API route). Server never holds this data in `'use cache'`. Mutations go through API routes, not Server Actions. | 0 (no server cache) | Low | Highly interactive data: shopping carts, filters, UI state. |

**Rule of thumb:** if a piece of data is shown in a Server Component AND in a TanStack Query
client component, you need Strategy 1. If it is only one or the other, choose Strategy 2 or 3
accordingly.

---

## Cross-Tab Sync: When It Matters

Cross-tab sync via `BroadcastChannel` matters when:

- The user has **multiple tabs open** of the same app (very common with shopping carts, dashboards,
  and collaborative tools).
- A mutation in one tab would **mislead** the user in another tab (e.g., cart count badge still
  shows 3 items after checking out in Tab A, while Tab B shows the checkout confirmation).
- The data is **user-specific** (not global/shared), so a cache-wide broadcast is safe.

It does NOT replace server-authoritative sync (WebSockets, SSE). It is peer-to-peer among tabs in
the same browser — a different machine / incognito window is invisible to it.

**BroadcastChannel vs. storage events:**
- `BroadcastChannel` is cleaner (dedicated API, no localStorage side-effects) and supported in all
  modern browsers.
- `localStorage` events fire on *other* tabs automatically (not the writing tab). Useful as a
  fallback for older environments or Safari Private Browsing, where `BroadcastChannel` messages
  sometimes do not cross origin-isolation boundaries.

---

## Files in This Challenge

```
app/(challenges)/c19-two-sources-of-truth/
├── page.tsx                      ← static shell + Suspense holes
├── _components/
│   ├── QueryProvider.tsx         ← local QueryClientProvider (do NOT share with other challenges)
│   └── ReconciledList.tsx        ← "use client" — TanStack panel + reconcile/broadcast logic
├── _lib/
│   ├── actions.ts                ← Server Actions: savItem, removeItem (call revalidateTag)
│   └── sync.ts                   ← useCrossTabSync hook
└── _meta/
    ├── spec.md                   ← this file
    ├── defend-it.md              ← from-memory questions
    ├── verification.md           ← manual test checklist
    ├── challenge.config.json
    └── challenge.config.ts
```
