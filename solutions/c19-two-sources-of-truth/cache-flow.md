# Cache Flow Diagram — C19 Two Sources of Truth

This document shows the committed cache-flow: both caches, where they diverge, and where
reconciliation and cross-tab sync occur.

---

## Flow 1 — Initial Page Load (both caches in sync)

```
Browser (Tab A)                                    Server (Node.js)
─────────────────────────────────────────────────  ─────────────────────────────────────────────

User navigates to /c19-two-sources-of-truth
         │
         ▼
┌──────────────────────────────┐                  ┌─────────────────────────────────────────┐
│  Next.js App Router           │  RSC request ──► │  getCachedSavedItems("demo-user")        │
│  static shell renders         │                  │  ┌──────────────────────────────────────┐│
│  immediately (prerendered)    │                  │  │  'use cache'                          ││
│                               │                  │  │  cacheTag("saved-items:demo-user")    ││
│  <Suspense> hole: awaiting    │                  │  │  cacheLife("seconds")                 ││
│  DivergenceDemo               │                  │  │                                       ││
└──────────────────────────────┘                  │  │  reads getSavedItems() → [A, B]        ││
         │                                        │  │  caches result                         ││
         │ ◄──── RSC payload: [A, B] + cachedAt   │  └──────────────────────────────────────┘│
         │                                        └─────────────────────────────────────────┘
         ▼
┌──────────────────────────────┐                  ┌─────────────────────────────────────────┐
│  TanStack Query useQuery      │  GET /api ──────►│  GET /c19-.../api/saved-items            │
│  fetches from route handler   │◄── [A, B] ───── │  calls getSavedItems() → [A, B]          │
│  queryKey: ["saved-items"]    │                  │  returns JSON, Cache-Control: no-store   │
│  data: [A, B]                 │                  └─────────────────────────────────────────┘
└──────────────────────────────┘

RESULT: Both caches hold [A, B]. Panels agree. ✓
```

---

## Flow 2 — Mutation (divergence begins)

```
Browser (Tab A)                                    Server (Node.js)
─────────────────────────────────────────────────  ─────────────────────────────────────────────

User clicks "Save Item" (id: item-gamma)
         │
         ▼
┌──────────────────────────────┐
│  handleSave() in              │
│  ReconciledList.tsx           │
└──────────────┬───────────────┘
               │  calls Server Action
               ▼
          saveItem("item-gamma")     ──────────►  ┌─────────────────────────────────────────┐
                                                   │  saveItem() runs:                        │
                                                   │  1. savedItemsStore.add("item-gamma")   │
                                                   │     store now holds [A, B, item-gamma]  │
                                                   │                                         │
                                                   │  2. revalidateTag(                      │
                                                   │       "saved-items:demo-user"           │
                                                   │     )                                   │
                                                   │     → server cache MARKED STALE         │
                                                   │     → will re-execute on next RSC req   │
                                                   └─────────────────────────────────────────┘
          ◄──── { success: true }

After Server Action resolves:
         │
         ▼
┌──────────────────────────────┐
│  invalidateQueries(           │
│    { queryKey:                │
│      ["saved-items"] }        │
│  )                            │
│  → TQ cache marked stale     │
│  → background refetch starts │
└──────────────┬───────────────┘
               │  GET /c19-.../api/saved-items
               ▼
          ◄──── [A, B, item-gamma]
┌──────────────────────────────┐
│  TQ panel: [A, B, item-gamma]│  ← UPDATED ✓
└──────────────────────────────┘

┌──────────────────────────────┐
│  RSC panel (right):          │
│  still shows [A, B]          │  ← STALE ✗
│  (server cache not re-queried│
│  until router.refresh())     │
└──────────────────────────────┘

         !! DIVERGENCE !!
         TQ: [A, B, item-gamma]
         RSC: [A, B]
```

---

## Flow 3 — Reconciliation (caches converge)

```
Browser (Tab A)                                    Server (Node.js)
─────────────────────────────────────────────────  ─────────────────────────────────────────────

User clicks "Reconcile" button
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  startTransition(() => {                              │
│                                                       │
│    // Path 1: refresh client cache                    │
│    queryClient.invalidateQueries(                     │
│      { queryKey: ["saved-items"] }                    │
│    )                                                  │
│    → triggers refetch from API route (already done)   │
│    → TQ panel stays correct: [A, B, item-gamma]       │
│                                                       │
│    // Path 2: refresh server-rendered HTML            │
│    router.refresh()                                   │
│    → App Router re-requests RSC for this route        │
│    → DivergenceDemo re-executes on server             │
│    → getCachedSavedItems() CACHE IS STALE             │
│      (was invalidated in Flow 2) → re-executes        │
│    → returns [A, B, item-gamma]                       │
│    → RSC payload sent to browser                      │
│    → React reconciles in-place (no full reload)       │
│                                                       │
│  })                                                   │
└──────────────────────────────────────────────────────┘

TQ panel:  [A, B, item-gamma]  ✓
RSC panel: [A, B, item-gamma]  ✓

RESULT: Both caches converge. ✓
```

---

## Flow 4 — Cross-Tab Sync (Tab B updates without user action)

```
Tab A (Browser Window 1)              BroadcastChannel           Tab B (Browser Window 2)
─────────────────────────────────     ─────────────────────────  ─────────────────────────────
                                       channel: "c19-saved-items"

After handleSave() in Tab A:
         │
         ▼
  broadcast() from useCrossTabSync
         │
         ├── BroadcastChannel.postMessage({          ──────────► channel.onmessage fires in Tab B
         │     type: "invalidate",                               │
         │     queryKey: ["saved-items"],             ◄          │  queryClient.invalidateQueries(
         │     mutatedAt: "2026-05-31T..."                       │    { queryKey: ["saved-items"] }
         │   })                                                   │  )
         │                                                        │
         ├── localStorage.setItem(                               │  [tab B does NOT need this if
         │     "c19-saved-items-sync",                           │   BroadcastChannel worked, but
         │     JSON.stringify(msg)                               │   the storage event fires as
         │   )                                                    │   fallback]
         │
         └── localStorage.removeItem(
               "c19-saved-items-sync"
             )
             [other tabs see the write event → parse msg
              → invalidateQueries as fallback]

                                                      Tab B GET /c19-.../api/saved-items
                                                               │
                                                               ▼
                                                      [A, B, item-gamma]
                                                               │
                                                      Tab B TQ panel: [A, B, item-gamma] ✓
                                                      (RSC panel stays stale until
                                                       Tab B user reconciles or navigates)
```

---

## Summary: The Two Invalidation Surfaces

| Event | Invalidates | Does NOT invalidate |
|---|---|---|
| `revalidateTag("saved-items:demo-user")` | Server `'use cache'` entry | TanStack Query client cache |
| `queryClient.invalidateQueries(...)` | TanStack Query client cache | Server `'use cache'` entry |
| `router.refresh()` | Causes server to re-render RSC (which hits the now-stale cache) | Does not directly invalidate TQ |
| `BroadcastChannel` message | Other tabs' TanStack Query caches (via invalidateQueries) | Server cache; RSC panel in other tabs |

**The rule**: if data lives in both caches, every mutation must touch BOTH invalidation surfaces.
If the Server Action calls only `revalidateTag`, the client is stale. If the client calls only
`invalidateQueries`, the server-rendered HTML is stale.
