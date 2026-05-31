# Solution Notes — TanStack Query: Client Data Management

> Reference notes for the topics covered in this challenge.
> Read AFTER completing the defend-it worksheet.

---

## When to Use TanStack Query vs. RSC Server Fetch vs. `'use cache'`

This is the most important decision in this challenge. The wrong tool adds
complexity without benefit; the right tool eliminates an entire class of
client-side state management problems.

---

### The "Who Owns the Data" Decision Tree

```
Is the data needed for the initial render?
│
├─ YES — Can it be static (same for all users, changes infrequently)?
│        │
│        ├─ YES → 'use cache' + RSC Server Component
│        │         (cache once, serve to all users, invalidate with cacheTag)
│        │
│        └─ NO (per-user or frequently changing) → RSC Server Component
│                  await the data, wrap in <Suspense> if dynamic
│                  (stream fresh data on each request, no client state needed)
│
└─ NO — Does the data change based on USER INTERACTION after page load?
         │
         ├─ YES → TanStack Query
         │         useQuery (single result), useInfiniteQuery (paginated),
         │         or useMutation (writes with optimistic updates)
         │
         └─ NO — Does the data need periodic background updates (polling)?
                  │
                  ├─ YES → TanStack Query with refetchInterval
                  │
                  └─ NO → Was it needed at all? Consider RSC.
```

---

### RSC Server Fetch (plain `await` in a Server Component)

**Use when:**
- Data is needed for the initial HTML render.
- Data is per-request (user-specific, or must be fresh on every load).
- No client-side interaction modifies the data after the page loads.
- You want zero client-side JavaScript for the data-fetching logic.

**Examples:**
- `await getProductBySlug(slug)` for a product detail page.
- `await getSession()` for a protected dashboard layout.
- `await listOrdersForUser(userId)` for an order history page.

**Why NOT TanStack Query here:**
- Adds client JS bundle weight for a problem that RSC solves for free.
- The data does not change based on user interaction.
- Server Components render closer to the data source (no round-trip to a Route Handler).

---

### `'use cache'` + RSC (Cached Server Component Data)

**Use when:**
- Data is expensive to compute or involves slow external calls.
- The same data is served to many users (shared cache entry).
- The data changes infrequently (minutes, hours, days) and can tolerate brief staleness.
- You want targeted cache invalidation via `cacheTag()` + `revalidateTag()`.

**Examples:**
- Site navigation categories: `listCategories()` wrapped in `'use cache'` with `cacheLife('hours')`.
- Homepage featured products: changes daily, same for all users.
- Product detail page (unauthenticated): `'use cache'` per product slug.

**Why NOT TanStack Query here:**
- `'use cache'` is a pure server concern; adding a client layer is unnecessary.
- TanStack Query would still need a Route Handler to proxy the server function,
  adding latency, a network hop, and client JS.

---

### TanStack Query

**Use when:**
- **User interaction drives the data.** The search term, selected filter, or
  scroll position changes what data is shown.
- **Infinite scroll / load more.** `useInfiniteQuery` manages pages without
  replacing previous results — this is very hard to do correctly with plain
  `useState + useEffect`.
- **Optimistic UI.** `useMutation` with `onMutate` allows updating the UI
  before the server responds (e.g. a like button, a cart update).
- **Client-side polling.** `refetchInterval` keeps a metric or status
  indicator live without a WebSocket.
- **Multiple components share the same data.** TanStack Query's shared cache
  means two components with the same `queryKey` share one in-flight request and
  one cache entry — no prop drilling, no Context boilerplate.
- **Complex loading states.** `isLoading`, `isFetching`, `isStale`,
  `isPaused`, `isError` give fine-grained UI control that `useState` booleans
  are error-prone to replicate.

**Examples in this challenge:**
- `SearchAsYouType` — query key changes on every debounced keystroke.
- `InfiniteList` — scroll to append pages without replacing previous items.
- A polling dashboard — `useQuery({ queryKey: [...], refetchInterval: 30_000 })`.

**Why NOT RSC here:**
- RSC re-renders require a full server round-trip (navigation or router refresh).
  For search-as-you-type, that would mean a full page re-render per keystroke.
- `useInfiniteQuery` accumulates pages client-side; RSC would need to re-fetch
  ALL accumulated pages on every page append (or use a complex streaming pattern).

---

### The "Server Prefetch + HydrationBoundary" Hybrid

This is the best-of-both-worlds pattern:

1. **Server side:** A Server Component prefetches the initial data (fast, close
   to the data source, no client round-trip) using `queryClient.prefetchInfiniteQuery()`.
2. **Serialise:** `dehydrate(queryClient)` converts the cache to JSON.
3. **Stream:** The dehydrated state is passed to `<HydrationBoundary state={...}>`.
4. **Client side:** `useInfiniteQuery` (or `useQuery`) finds the data already in
   cache on first mount — renders immediately, no loading flash.
5. **After staleTime:** Client takes over, fetching updates as the user interacts.

**When to use the hybrid:**
- You need fast first paint (server data) AND client-driven updates after load.
- The first page of an infinite list: server-prefetch page 1, client loads the rest.
- A dashboard: server-prefetch the initial metrics, client polls for updates.

**Key constraint:** Use `prefetchInfiniteQuery` (not `prefetchQuery`) when the
client uses `useInfiniteQuery`. The internal cache shape differs — a mismatch
causes a cache miss on the client and defeats the prefetch.

---

## The Five Concepts in Detail

### 1. `useQuery` and the Query Key

The query key (`queryKey`) is TanStack Query's cache key. Rules:
- Two calls with the same key share one cache entry and one in-flight request.
- Changing the key (e.g. including a search term) creates a new cache entry.
- Keys are compared by deep equality (arrays and objects work).

```ts
// Different search terms = different cache entries = separate fetches
useQuery({ queryKey: ["products", "search", q], queryFn: () => fetchSearch(q) })

// Same key from two components = one shared fetch, one cache entry
// Component A:
useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
// Component B (same page):
useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
// → Only one fetch fires. Both components share the result.
```

### 2. `staleTime` vs. `gcTime`

```
Request → cache MISS → fetch fires → data stored → "fresh" window (staleTime)
                                                          ↓
                                          staleTime expires → data "stale"
                                          component still shows cached data
                                          but background refetch fires
                                                          ↓
                                          component unmounts → entry "inactive"
                                          gcTime countdown begins
                                                          ↓
                                          gcTime expires → entry removed
                                          next mount = cache MISS again
```

- `staleTime: 0` (default): every mount triggers a background refetch.
- `staleTime: 30_000`: cached data shown for 30s without any network call.
- `staleTime: Infinity`: data is never considered stale (good for static reference data).

### 3. `useInfiniteQuery` and `getNextPageParam`

```ts
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["products"],
  queryFn: ({ pageParam }) => fetchPage(pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.hasNextPage ? lastPage.page + 1 : undefined,
  //                                              ^ undefined = no more pages
});

// All items flat across all loaded pages:
const allItems = data?.pages.flatMap(p => p.items) ?? [];
```

The `pageParam` in `queryFn` receives whatever `getNextPageParam` returned
for the previous page (or `initialPageParam` for the first fetch). This is
how TanStack Query knows which page to fetch next.

### 4. `prefetchInfiniteQuery` vs. `prefetchQuery`

| Method | Internal shape | Client hook | Cache hit? |
|---|---|---|---|
| `prefetchQuery` | `{ data: T }` | `useQuery` | ✓ |
| `prefetchQuery` | `{ data: T }` | `useInfiniteQuery` | ✗ (shape mismatch) |
| `prefetchInfiniteQuery` | `{ data: { pages, pageParams } }` | `useInfiniteQuery` | ✓ |
| `prefetchInfiniteQuery` | `{ data: { pages, pageParams } }` | `useQuery` | ✗ (shape mismatch) |

Always match the server prefetch method to the client hook type.

### 5. `connection()` before `@/lib/data` reads in cacheComponents mode

```ts
async function PrefetchedProductList() {
  await connection();          // ← REQUIRED: opts into dynamic rendering
  const queryClient = new QueryClient();
  await queryClient.prefetchInfiniteQuery({ ... }); // calls lib/data safely
  // ...
}
```

Without `connection()`, `getProductPage()` → `listProducts()` → `delay()` →
`Math.random()` runs during static prerender — the build fails with a Cache
Components non-determinism error. `connection()` is the one-line fix.

---

## TanStack Query v5 Changes from v4

This project uses TQ v5. Key breaking changes if you are used to v4:

| v4 | v5 |
|---|---|
| `cacheTime` | `gcTime` |
| `isLoading` (always true on first fetch) | `isLoading` + `isPending` distinction |
| No `initialPageParam` required | `initialPageParam` REQUIRED |
| `keepPreviousData: true` option | `placeholderData: keepPreviousData` |
| `onSuccess`/`onError` in options | Removed — use `.then()` or `useEffect` |
| `QueryCache` events | Same, but `mutationCache` events renamed |

---

## Common Pitfalls

### 1. Putting `new QueryClient()` at module level

```ts
// ❌ BAD — shared across server renders (data leaks between users)
const queryClient = new QueryClient();

// ✓ GOOD — isolated per component tree instance
const [queryClient] = useState(() => new QueryClient());
```

### 2. Using `prefetchQuery` for an infinite query

Results in a cache miss on the client, no data on first paint.
Always use `prefetchInfiniteQuery` when the client will use `useInfiniteQuery`.

### 3. Forgetting `initialPageParam` in v5

```ts
// ❌ TS error: missing required initialPageParam
useInfiniteQuery({ queryKey: [...], queryFn: ..., getNextPageParam: ... });

// ✓ CORRECT
useInfiniteQuery({ queryKey: [...], queryFn: ..., initialPageParam: 1, getNextPageParam: ... });
```

### 4. Importing `@/lib/data` in a client component

`@/lib/data` imports Node-only modules and uses the in-memory store. It cannot
run in the browser. Always access data via a Route Handler from client code.

### 5. Forgetting `await connection()` before `@/lib/data` reads

Under `cacheComponents: true`, any `Math.random()` call during static prerender
fails. Always call `await connection()` before any `@/lib/data` function in a
Server Component that is not explicitly wrapped in `'use cache'`.

---

## Further Reading

- [TanStack Query v5 docs — Next.js App Router guide](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Query v5 — Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Next.js docs — Server Components and data fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- `docs/cache-components-rules.md` in this repo — the full cacheComponents rule set
