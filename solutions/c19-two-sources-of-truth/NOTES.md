# C19 — Solution Notes: Two Sources of Truth + Cross-Tab Sync

## What This Challenge Builds

A live demo that makes the "dual-cache divergence" problem visible and then shows three strategies
to resolve it. The demo specifically uses TanStack Query (v5) and Next.js 16 `'use cache'`
boundaries.

---

## The Core Problem (in one paragraph)

When you render the same data in both a Server Component (via `'use cache'`) and a TanStack Query
client component (via `useQuery`), you have two independent caches. A Server Action mutation
calls `revalidateTag()` to invalidate the server cache, but the TanStack client cache has no
listener for that event. Conversely, calling `queryClient.invalidateQueries()` on the client
does nothing to the server's cached HTML. The result: after a mutation, the server shows version
N (old) while the client shows version N+1 (new). This is a real bug in production apps that ship
both RSC and TQ client components for the same data.

---

## Reconciliation Strategy: Why invalidateQueries + router.refresh()

The solution in `ReconciledList.tsx` calls both operations inside `startTransition`:

```ts
startTransition(() => {
  queryClient.invalidateQueries({ queryKey: SAVED_ITEMS_QUERY_KEY });
  router.refresh();
});
```

**Why `queryClient.invalidateQueries()`?**
Marks the TQ cache entry as stale. TanStack immediately begins a background refetch from the API
route. The UI transitions smoothly from the old data to the new data as the refetch resolves.
Without this call, the TanStack panel stays stale.

**Why `router.refresh()`?**
Tells the Next.js App Router to re-fetch the current RSC route from the server. This causes the
`DivergenceDemo` Server Component (and its `getCachedSavedItems()` `'use cache'` boundary) to
re-execute, rendering fresh RSC output. Without this call, the RSC panel (the right panel) stays
stale — it still shows the HTML that was cached before the mutation.

**Why both simultaneously (inside `startTransition`) instead of sequentially?**
Sequential calls would work but would cause two separate React render cycles and two visual
transitions. `startTransition` batches both as a single non-urgent concurrent update, giving the
user one smooth visual update. `isPending` from `useTransition` correctly reflects whether either
is in-flight, so the button can show a loading state.

**Chosen strategy: Strategy 1 (Full-Stack Reconcile)**
This challenge uses Strategy 1 because the demo requires BOTH panels to be visible simultaneously
and both must converge. Strategy 2 (Server Only) or Strategy 3 (Client Only) would each eliminate
one of the panels, making the divergence invisible.

---

## Cross-Tab Sync: Design Decisions

### BroadcastChannel as primary

`BroadcastChannel` is the cleanest mechanism: create a named channel, post a structured message,
receive it in all other tabs. The sender tab does NOT receive its own message (by browser spec
design), so no self-filtering is needed.

```ts
const channel = new BroadcastChannel("c19-saved-items");
channel.postMessage({ type: "invalidate", queryKey: [...], mutatedAt: "..." });
channel.onmessage = (event) => {
  queryClient.invalidateQueries({ queryKey: event.data.queryKey });
};
```

### localStorage storage event as fallback

In Safari Private Browsing and some origin-isolation scenarios, `BroadcastChannel` messages do not
cross tab boundaries. The `storage` event fires in all other tabs when `localStorage` is written.
We exploit this by writing a sentinel value and immediately deleting it — other tabs see the write
event (newValue !== null) and parse the payload:

```ts
localStorage.setItem("c19-saved-items-sync", JSON.stringify(msg));
localStorage.removeItem("c19-saved-items-sync");
```

The immediate deletion prevents stale data from accumulating and ensures the key stays clean.

### Channel lifecycle (why inside useEffect)

The `BroadcastChannel` is created inside `useEffect` (not at module level or in the render body)
for two reasons:

1. **SSR safety**: `BroadcastChannel` is a browser API that does not exist in Node.js. `useEffect`
   only runs in the browser.
2. **Cleanup**: the `useEffect` return function calls `channel.close()` on unmount, preventing
   memory leaks and dangling listeners when the component is removed from the tree.

---

## Why the API Route Pattern (not direct Server Action import in useQuery)

TanStack Query's `useQuery` requires a client-side async function. Server Actions are POST-only
by design in Next.js — they respond to form submissions and programmatic `.bind()` calls, but
they are not designed as GET data-fetching endpoints. If you imported and called a Server Action
from `useQuery`, you would be making a POST request for read data, which breaks REST conventions,
disables browser caching at the HTTP layer, and creates confusion when debugging.

The correct pattern is: Server Action for mutations (with `revalidateTag`), route handler for
reads (with `getSavedItems`). TanStack Query calls the route handler; mutations go through Server
Actions.

---

## `cacheLife("seconds")` — Why So Short?

In a production app you would use `cacheLife("minutes")` or `cacheLife("hours")`. We use
`"seconds"` here so that the demo does not get stuck with a stale server cache across multiple
test runs during the same dev session. This makes the divergence visible (short enough to see)
without making the TTL so short that the cache is useless. The tradeoff is fully documented
inline in `page.tsx`.

---

## Files Touched / Created

| File | Purpose |
|---|---|
| `page.tsx` | Static shell + Suspense hole; `getCachedSavedItems()` with `'use cache'` |
| `_components/QueryProvider.tsx` | Local `QueryClientProvider` — challenge-scoped |
| `_components/ReconciledList.tsx` | Client: TQ panel, mutation controls, reconcile button |
| `_lib/actions.ts` | Server Actions: `saveItem`, `removeItem`, `getSavedItems` |
| `_lib/sync.ts` | `useCrossTabSync` hook with BroadcastChannel + storage fallback |
| `api/saved-items/route.ts` | GET endpoint for TanStack Query to read from |
| `solutions/c19-two-sources-of-truth/` | Reference solution + cache-flow diagram |

**Files NOT touched** (as required by task contract):
- `lib/data/**` — shared data layer, read-only
- `app/layout.tsx` — root layout
- All other challenge directories
