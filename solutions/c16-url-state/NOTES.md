# C16 URL State — Reference Solution Notes

> Read this AFTER completing your own implementation and filling in defend-it.md.
> These notes explain every non-obvious decision in the reference solution.

---

## Why URL-as-state beats a client store for filters

The core insight is that **the URL is already a key-value store** — one that
the browser, the server, and every HTTP intermediary can read natively, at zero
cost, with no extra library.

| Property | URL state | Client store (useState/Zustand/Redux) |
|---|---|---|
| Shareable | Yes — copy the URL | No — state dies with the tab |
| Server-rendered | Yes — server reads searchParams | Partial — first render is empty/loading |
| Hydration mismatch | Impossible — both sides read the URL | Possible if initial server HTML differs from client store |
| Back/Forward | Free — browser history IS state history | Requires manual `history.pushState` / popstate handling |
| Bookmarkable | Yes | No |
| No extra setup | Yes — just URL strings | Requires store setup, Provider, serialisation |

### The limits (when NOT to use URL state)

- **Sensitive data:** URL params appear in browser history, server logs, and
  referrer headers. Never put auth tokens, session IDs, or PII in the URL.
- **Ephemeral UI state:** Tooltip open/closed, modal focus, hover state — these
  are meaningless to persist and would pollute the URL.
- **Complex objects:** URL params are strings. Serialising a deeply nested
  object is painful and error-prone.
- **URL length cap:** Browsers generally support ~2000 characters in a URL.
  A faceted search with 30 active filters might exceed this.

---

## The client-writes / server-reads split

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  FilterBar ("use client")                                │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  useSearchParams() ──► reads  ?category=&sort=&q=&page=  │ │
│  │  router.replace()  ──► writes ?category=&sort=&q=&page=  │ │
│  └─────────────────────────┬────────────────────────────────┘ │
│                             │ navigation (URL change)          │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTP request with new URL
┌─────────────────────────────▼────────────────────────────────┐
│  Server                                                        │
│                                                                │
│  page.tsx (static shell, no dynamic reads)                     │
│    └── <Suspense>                                              │
│          └── CatalogContent (async Server Component)          │
│                await connection()                              │
│                await searchParams  ──► reads the URL params   │
│                await listProducts(parsed) ──► server render   │
│                return <FilterBar> + <grid> + <Pagination>     │
└────────────────────────────────────────────────────────────────┘
```

The server NEVER stores filter state. It reads the URL on every request and
renders exactly what the URL says. This is the "URL as the database" mental
model.

---

## Why `router.replace` instead of `router.push`

`router.push` creates a new browser history entry. Every character you type,
every select change → a new entry. After typing "headphones" (10 chars) you
would need to press Back 10 times to leave the search.

`router.replace` replaces the current history entry in-place. The user's
Back button undoes the LAST COMMITTED action (e.g., the debounced search),
not every keystroke.

This is the correct mental model:
- `push` = "I am doing something new I want to be able to undo"
- `replace` = "I am refining the same thing, this is not a new step"

For pagination, it is debatable. If the user explicitly clicked Next (a
deliberate navigation), `push` is arguably more correct — Back should return
to the previous page. However, `replace` is used here for simplicity and
because the spec says "back/forward works". Both are defensible.

---

## The debounce pattern — why `useRef` not `useState` for the timer

```tsx
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleChange(e) {
  setInputValue(e.target.value); // controlled input — snappy typing

  if (timerRef.current) clearTimeout(timerRef.current); // cancel pending commit
  timerRef.current = setTimeout(() => {
    router.replace(`?${buildSearchParams(current, { q: e.target.value })}`);
  }, 300);
}
```

If `timerRef` were `useState`:
1. `clearTimeout(timer)` → `setTimer(null)` → RE-RENDER
2. `setTimeout(...)` → `setTimer(id)` → RE-RENDER
3. Two extra renders per keystroke, during which `current` might be stale.

With `useRef`:
1. `clearTimeout(timerRef.current)` → mutates ref → NO re-render
2. `timerRef.current = setTimeout(...)` → mutates ref → NO re-render
3. Zero extra renders.

The ref pattern is idiomatic React for "I need to persist a mutable value
across renders without causing re-renders".

---

## The `await connection()` requirement

Under `cacheComponents: true`, the build performs a prerender pass. During
prerender, any synchronous `Math.random()` or `Date.now()` call fails with a
Cache Components error because the result would be baked into the static shell
and served as "cached" — but the value changes on every real request, so the
cached value would be wrong.

`lib/data`'s `delay()` function calls `Math.random()` synchronously:
```typescript
const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
```

`await connection()` (from `next/server`) tells the runtime: "this component
executes at request time, not at prerender time". The non-deterministic code
runs AFTER the prerender pass and the build succeeds.

The key constraint: `connection()` must be awaited BEFORE the
non-deterministic code executes. Since `Math.random()` is called synchronously
inside `delay()`, which is called inside `listProducts()`, we need:

```typescript
await connection();          // ← signals request-time execution
// ... from this point, Math.random() is allowed
const result = await listProducts(...);
```

---

## How back/forward restores state (for free)

When the user presses Back, the browser navigates to the previous URL in the
history stack. Next.js receives a navigation to that URL and re-renders the
server component with the previous `searchParams`. The `FilterBar` (client)
reads `useSearchParams()` which returns the new (restored) params. The inputs
automatically reflect the restored state.

There is no "state restoration code" anywhere. The URL history IS the state
history. This is the fundamental advantage of URL-as-state.

---

## Why `parseSearchParams` validates input

URL params are user-controlled input. A user (or attacker) can craft any URL:

```
?sort=malicious-string&page=-999&category=%00evil%00
```

Without validation, this could cause a React render error (invalid sort key
crashes the sort switch), a repository error (page -999 → negative offset), or
unexpected behaviour (category null bytes).

`parseSearchParams` applies:
- Allowlist for sort key (only the 4 known values accepted)
- `parseInt` + clamp for page (only integers >= 1)
- Trim for q (no leading/trailing whitespace)
- The `firstString` helper prevents array injection (`?q=a&q=b` → `"a"`)

Input validation at the boundary between the untrusted URL and trusted
application code is a secure default even in a tutorial codebase — it teaches
the right habit.

---

## The `buildSearchParams` page-reset logic

When the user changes a filter (category/sort/q), the current page number
should reset to 1. Otherwise, after filtering to Electronics and then paginating
to page 3, switching to Clothing keeps `?page=3` — but Clothing might only have
2 pages, so the server clamps the page and renders page 2, confusing the user.

```typescript
const filterChanging = "category" in override || "sort" in override || "q" in override;
page: "page" in override ? override.page : filterChanging ? 1 : current.page,
```

This is handled centrally in `buildSearchParams` rather than at each call site,
so it is impossible to forget.

---

## URL cleanliness (omitting defaults)

```typescript
if (merged.q) sp.set(PARAM_KEYS.q, merged.q);
if (merged.category) sp.set(PARAM_KEYS.category, merged.category);
if (merged.sort !== DEFAULTS.sort) sp.set(PARAM_KEYS.sort, merged.sort);
if (merged.page > 1) sp.set(PARAM_KEYS.page, String(merged.page));
```

Default values are NOT written to the URL. This keeps URLs clean:
- "all products, newest first, page 1" → `/c16-url-state` (no params)
- "electronics, newest first, page 2" → `?category=electronics&page=2`
- "electronics, price low to high, page 1" → `?category=electronics&sort=price-asc`

A URL with explicit defaults (`?sort=newest&page=1&q=&category=`) is ugly and
longer — it also breaks bookmarks if you change the default later (the param
value "newest" in the URL would now disagree with the new default).
