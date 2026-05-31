# Defend-It Worksheet — TanStack Query

> **Instructions:** Fill in your answers BEFORE opening the reference solution
> under `solutions/c14-tanstack-query/`. Write in your own words.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Q1 — useQuery vs. useInfiniteQuery

*Explain the key difference between `useQuery` and `useInfiniteQuery`. In what
situation is `useInfiniteQuery` the correct choice over `useQuery`? What does
`getNextPageParam` do and what does returning `undefined` from it signify?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`useQuery` manages a **single result set** — one fetch produces one value (or
list). The result is replaced on refetch.

`useInfiniteQuery` manages an **ordered list of pages**. Each `fetchNextPage()`
call appends a new page to `data.pages` without discarding previous pages.
The accumulated flat list is `data.pages.flatMap(p => p.items)`.

Use `useInfiniteQuery` whenever:
- You need "load more" or infinite-scroll behaviour.
- Previously-loaded items must stay visible while new items load.
- The server uses cursor or page-number pagination.

`getNextPageParam(lastPage, allPages)` — a function you supply — inspects the
last loaded page and returns the param for the NEXT fetch (e.g. `lastPage.page + 1`
or `lastPage.nextCursor`). When there is no next page, return `undefined`. This
is what sets `hasNextPage = false` and prevents further `fetchNextPage()` calls.

</details>

---

## Q2 — staleTime and request deduplication

*What does `staleTime` control in TanStack Query? How does TanStack Query
deduplicate in-flight requests, and what is the practical benefit for a search
component with rapid user input?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`staleTime` (default 0) controls how long a successful query result is treated
as "fresh". During this window, a `useQuery` call with the same key returns the
cached data IMMEDIATELY without firing any network request. After the window
expires the data is "stale" — it still renders from cache right away, but a
background refetch runs to update it.

**Request deduplication:** TanStack Query tracks in-flight queries by key. If
two components mount with the same `queryKey` at the same time (or one mounts
while another's fetch is in-flight), TanStack Query fires ONLY ONE network
request and delivers the single response to all subscribers. This is structural
sharing at the query-key level.

**Practical benefit for search:** Combined with debouncing (delaying the query
key update until the user pauses typing), these two features mean:
1. Rapid keystrokes produce at most one in-flight request per pause (debounce).
2. Repeated searches within `staleTime` produce ZERO requests (cache hit).
3. Multiple components searching the same term share one request (dedup).

</details>

---

## Q3 — Server prefetch + HydrationBoundary

*Describe the server-prefetch + `HydrationBoundary` pattern in four steps:
what runs on the server, what is serialised, what is passed to the client,
and what happens when `useInfiniteQuery` mounts. Why must you use
`prefetchInfiniteQuery` (not `prefetchQuery`) when the client uses
`useInfiniteQuery`?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**Step 1 — Server:** A Server Component creates a throw-away `QueryClient` and
calls `await queryClient.prefetchInfiniteQuery(...)`. The fetcher runs on the
server (Node process), populates the server QueryClient's in-memory cache.

**Step 2 — Serialise:** `dehydrate(queryClient)` converts the in-memory cache
entries to a plain JSON-safe object (`DehydratedState`). This is cheap (it
serialises already-fetched data, not re-runs the fetcher).

**Step 3 — Stream to client:** The `DehydratedState` object is passed as a
prop to `<HydrationBoundary state={dehydrated}>`. Next.js streams this as part
of the RSC payload (JSON embedded in the HTML or in the streaming chunks).

**Step 4 — Client mount:** When `useInfiniteQuery` mounts inside the
`HydrationBoundary`, it looks up `["c14-products"]` in the client QueryClient.
`HydrationBoundary` has already rehydrated the server state into the client
cache — the data is there. The component renders page 1 immediately with no
loading state.

**Why `prefetchInfiniteQuery` not `prefetchQuery`:**
TanStack Query stores infinite query results in a different shape than regular
queries: `{ pages: [...], pageParams: [...] }` instead of `{ data: ... }`.
If you use `prefetchQuery`, the server populates the cache with the wrong shape
for an infinite key, causing a cache MISS on the client — `useInfiniteQuery`
cannot interpret the non-infinite shape, re-fetches, and shows a loading spinner
defeating the purpose of the prefetch.

</details>

---

## Q4 — TanStack Query vs. RSC server fetch vs. `'use cache'`

*When should you choose TanStack Query over a plain RSC `await` fetch or a
`'use cache'` data accessor? Give one concrete scenario for each approach where
it is the BEST choice.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**RSC `await` fetch (plain Server Component data read):**
Best when: the data is needed for the initial render, is the same for all users
(or per-user but server-authoritative), and does NOT need to update dynamically
after the page loads.
*Example:* A product detail page — `await getProductBySlug(slug)` in the Server
Component. No client interaction needed; the product data is stable for the
page's lifetime.

**`'use cache'` + RSC (cached Server Component data read):**
Best when: the data is expensive to compute or fetch, changes infrequently, and
benefits from being shared across multiple users/requests.
*Example:* The site navigation menu listing all categories. Data changes once
a week. Wrapping `listCategories()` in `'use cache'` with `cacheLife('days')`
means the server computes it once and serves it from cache for all users.

**TanStack Query:**
Best when the data is **client-driven** — it changes based on user interaction
after the initial page load, needs polling/refetching, or the UI requires
optimistic updates, request cancellation, or complex loading states.

Concrete scenarios for TQ:
- Search-as-you-type: query key changes on every debounced keystroke.
- Infinite scroll: appending pages without replacing previous results.
- A polling dashboard: `refetchInterval: 30_000` keeps a live metric updated.
- Optimistic mutations: a like button that updates the UI before the server responds.
- Data that multiple components need to share WITHOUT prop drilling (shared
  cache via `queryKey`).

**The "who owns the data" rule of thumb:**
- Server controls the data, no interaction after load → RSC (`await`).
- Server controls the data, same across users, can be cached → `'use cache'` + RSC.
- User interaction drives the data (search, pagination, polling, mutations) → TanStack Query.

</details>

---

## Q5 — QueryProvider scope and `useState` initialisation

*Why is the `QueryClient` created inside `useState(() => new QueryClient())`
rather than at module level? Why is the `QueryClientProvider` placed in a
local component rather than in `app/layout.tsx`?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**`useState` initialisation (not module level):**
If you write `const queryClient = new QueryClient()` at module level in a
Server Component or `"use client"` file that is imported on the server, the
single instance would be shared across all server requests — data from one
user's session would leak into another's. By putting it inside `useState`,
you ensure each component tree instance (each user session's client mount)
gets its own isolated QueryClient. The lazy `useState(() => new QueryClient())`
form ensures the constructor runs only once per component instance (not on
every re-render).

**Why not `app/layout.tsx`:**
1. `app/layout.tsx` must not be a `"use client"` component — adding
   `QueryClientProvider` there would require making the entire root layout a
   client component, which forces all Server Components inside the layout to
   lose RSC benefits (server-only data fetching, no JS shipped for static parts).
2. Colocation: the `QueryProvider` is specific to the c14 challenge. Other
   challenges may not use TanStack Query. Scoping it to the c14 subtree keeps
   the bundle impact local and the dependency explicit.
3. Multiple independent TQ instances: different parts of a large app can have
   different `QueryClient` configurations (different `staleTime`, `gcTime`) if
   they scope their own providers.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | useQuery vs. useInfiniteQuery | | |
| 2 | staleTime and deduplication | | |
| 3 | Server prefetch + HydrationBoundary | | |
| 4 | TQ vs. RSC vs. use cache | | |
| 5 | QueryProvider scope and useState | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c14-tanstack-query/`.*
