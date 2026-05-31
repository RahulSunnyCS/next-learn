# Challenge Spec — C16: URL as Single Source of Truth

> **File:** `app/(challenges)/c16-url-state/_meta/spec.md`

---

## Learning Goal

This challenge teaches **URL-as-state** — encoding all interactive filter, sort,
and pagination state in the URL (`?category=&sort=&page=&q=`) rather than in a
client-side store (`useState`, Zustand, Redux, etc.).

The key insight: when the URL is the store, the server component can read
`searchParams` and render the filtered result set on every request. The result
is shareable (copy the URL, share it), bookmarkable (save it as a browser
bookmark), restorable on refresh (navigate away and back — state is preserved),
and back/forward-compatible (browser history stack IS the state history).

You will also learn:
- How `useSearchParams()` and `useRouter().replace()` in a `"use client"`
  component implement the "client writes, server reads" split.
- Why debouncing text input before writing to the URL avoids spamming the
  history stack (and `router.replace` vs `router.push`).
- How Next.js 16 under `cacheComponents: true` requires `await searchParams`
  to live inside a `<Suspense>` boundary (dynamic data cannot be read at the
  route top level).
- The limits of URL state: length cap (~2000 chars), visibility to the user,
  and unsuitability for sensitive or ephemeral state.

---

## Scenario

**Nextmart** needs a product catalog page where shoppers can filter by category,
sort by price/rating/newest, paginate through results, and full-text search
— AND share a filtered view with a colleague by copying the URL. Currently the
catalog has no filters at all. You must build the filter/sort/pagination
system entirely in the URL, with the server component doing the actual
rendering.

---

## Starting Point

The route `/c16-url-state` exists but is a blank placeholder. The learner must:

1. Implement `_lib/search-params.ts` — the shared URL-param helpers that both
   the server page and the client controls bar use.
2. Build `_components/FilterBar.tsx` — a `"use client"` component that reads
   `useSearchParams()` and writes to the URL via `useRouter().replace()`. The
   search input must be debounced (300ms).
3. Build `_components/Pagination.tsx` — a `"use client"` component that reads
   the current page from the URL and writes the next/prev page to the URL.
4. Build `page.tsx` — a static shell with a `<Suspense>`-wrapped `CatalogContent`
   async server component that reads `await searchParams`, calls `listProducts`
   with the parsed params, and renders the filtered product grid.

---

## Tasks

- [ ] **T1 — search-param helpers:** In `_lib/search-params.ts`, define the
  param key constants, default values, `parseSearchParams()` (validates input,
  falls back to defaults), and `buildSearchParams()` (builds a URLSearchParams
  from the current state + an override).
- [ ] **T2 — FilterBar:** `_components/FilterBar.tsx` — `"use client"`.
  Read current params with `useSearchParams()`. Write changes with
  `useRouter().replace()`. Debounce the text input (300ms, using `useRef` for
  the timer). Show the current URL params in the UI to make the lesson visible.
- [ ] **T3 — Pagination:** `_components/Pagination.tsx` — `"use client"`.
  Previous/Next buttons write the updated page number to the URL.
- [ ] **T4 — page.tsx static shell:** The route page is a static shell.
  The dynamic part (`<CatalogContent>`) reads `await searchParams` inside a
  `<Suspense>` boundary, calls `listProducts` with the parsed params, and
  renders the filtered product grid plus the client controls bar.
- [ ] **T5 — Connection signal:** Call `await connection()` (from `next/server`)
  at the top of `CatalogContent` before calling `listProducts`, to satisfy
  the cacheComponents non-determinism rule (Math.random in listProducts).

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0 (no TypeScript errors).
2. `next build` exits 0 — the `/c16-url-state` route shows `◐ (Partial Prerender)`
   in the build table (static shell + dynamic hole).
3. Navigating to `/c16-url-state?category=electronics&sort=price-asc` renders
   a filtered list of electronics sorted by price (low to high), server-side,
   without a loading spinner for the filter state.
4. Typing in the search box updates the URL `?q=` param after a 300ms debounce
   (no new history entry per keystroke — `router.replace` is used).
5. Changing category or sort immediately updates the URL and re-renders the
   server component.
6. Pagination Previous/Next buttons update the `?page=` param in the URL.
7. Opening the URL in a fresh browser tab (no prior state) reproduces the same
   filtered view — the filter controls reflect the URL params.
8. Pressing the browser Back button restores the previous filter state (because
   Back navigates to the previous URL — no extra work needed).
9. There is NO `export const dynamic` directive in any challenge file (forbidden
   by `cacheComponents: true`).
10. `await searchParams` is only accessed inside `<Suspense>` (never at the
    route top level).

---

## Why URL State Beats a Client Store for Filters

| Property | URL state | Client store (useState/Zustand) |
|---|---|---|
| Shareable URL | Yes — copy/paste the URL | No — state dies with the session |
| Server rendering | Yes — server reads searchParams | Partial — first render is blank/loading |
| Hydration mismatch | Impossible — server and client agree | Possible — initial server HTML differs from client store |
| Back/forward | Free — browser handles it | Requires manual history management |
| Bookmarkable | Yes | No |
| Complexity | Low — just URL strings | Higher — store setup, hydration, sync |
| Limits | URL length cap, user-visible, no sensitive data | No length limit, private, supports any type |

The limit column explains when you DO want a client store: sensitive data (auth
tokens, draft form values), ephemeral UI state (tooltip open/closed, modal
focus), or complex objects that don't serialise well to query strings.

---

## Hints

<details>
<summary>Hint 1 — Why does `await searchParams` require Suspense?</summary>

Under `cacheComponents: true`, Next.js enforces PPR discipline. Any access to
per-request dynamic data (`cookies()`, `headers()`, `await searchParams`,
`await params`) at the route's top level (outside Suspense) fails the build
with *"Uncached data was accessed outside of `<Suspense>`"*.

Pattern: the page component passes the `searchParams` Promise down to a child
async component and wraps that child in `<Suspense>`. The child awaits the
Promise.

</details>

<details>
<summary>Hint 2 — Why `router.replace` instead of `router.push`?</summary>

`router.push` adds a new entry to the browser history stack. If the user types
"headph" and the debounce fires on each character, they would need to press Back
6 times to undo that one search — terrible UX.

`router.replace` replaces the CURRENT history entry. The final committed search
term replaces the previous URL. Pressing Back undoes the whole search in one step.

Same reasoning for pagination: Previous/Next should replace, not push — you
want Back to take you to the page before you started paginating, not one page
backward in the paginated sequence.

</details>

<details>
<summary>Hint 3 — What is the debounce pattern with useRef?</summary>

```tsx
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setLocalValue(e.target.value); // update controlled input immediately

  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    router.replace(`?${buildSearchParams(current, { q: e.target.value })}`);
  }, 300);
}
```

Key: `useRef` is used for the timer ID (not `useState`) because updating a ref
does NOT cause a re-render. If you stored the timer ID in state, every
`clearTimeout` + `setTimeout` would trigger a re-render, which clears the
timer before it fires.

</details>

<details>
<summary>Hint 4 — Why call `await connection()` before listProducts?</summary>

`listProducts` from `lib/data` uses `Math.random()` internally (simulated
latency). Under `cacheComponents`, any synchronous non-deterministic call that
runs during prerender fails the build.

`connection()` from `next/server` signals that the component runs per-request
(not during prerender). It must be awaited BEFORE the synchronous code that
triggers `Math.random()`. Since `Math.random()` is called inside the `await
delay()` in the repository, `await connection()` before `await listProducts()`
is sufficient.

</details>
