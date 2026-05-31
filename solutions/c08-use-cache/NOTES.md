# Reference Solution Notes — C08: Current Caching Model (`'use cache'`)

> Read this AFTER completing your own implementation and filling in
> `_meta/defend-it.md`. These notes explain every non-obvious decision
> and the mental model behind the Cache Components architecture.

---

## The Big Idea

Next.js 16 Cache Components replaced the old "four caches" model with a single,
unified primitive: `'use cache'`. The old model had four distinct caching layers
(Request Memoization, Data Cache, Full Route Cache, Router Cache) each with
different configuration knobs — confusing to reason about and easy to misuse.

The new model has one rule:

> **Everything is dynamic by default. Opt IN to caching with `'use cache'`.**

If you add `'use cache'` to a data access, it is cached. If you do not, it runs
every request. There is no implicit caching, no fetch deduplication magic, no
need to understand four separate layers.

---

## The Three Placement Levels — Why They Exist

### File-level (`'use cache'` as the first line of a `.ts` file)

This is the broadest scope. Use it when the module is a pure "cached data layer"
where every export should behave the same way (all cached, similar policies).

The module communicates intent: "this file exports only cached lookups."
Any reader who opens the file sees immediately that all its functions are cached
— no need to check each one individually.

**Rule of thumb:** if you ever add an uncached function to a file-level cached
module, move the directives to function-level. File-level implies homogeneity.

### Function-level (`'use cache'` as the first line of a function body)

This is the most common production pattern. It gives per-function control: you
can have two functions in the same module — one cached with `'hours'`, another
uncached, another cached with `'days'` for different data types.

It is also the right choice for a mixed-concerns module (e.g. a module that has
both query helpers and mutation helpers — mutations must never be cached).

**The cache key** is derived automatically from the function's arguments. You
do not declare the key manually. `getCachedProductSummary("p-elec-001")` and
`getCachedProductSummary("p-elec-002")` produce two separate cache entries.

### Component-level (`'use cache'` as the first line of an async Server Component)

This is the most powerful but also the riskiest placement. The entire serialised
RSC payload — the rendered output, including the JSX tree — is cached. On a
cache-hit request, Next.js serves the stored RSC bytes without ever running the
function or its downstream data fetches.

**When is this the right choice?**
- The component renders static/shared content (no user-specific data).
- The rendering itself is expensive (complex layout, many child components).
- The same component appears on many pages and would otherwise re-fetch the same
  data multiple times per deploy.

**The danger:** if the cached RSC includes user-specific content (name, avatar,
preferences), one user's output will be served to another. Always audit what the
component renders before adding a component-level `'use cache'`.

---

## Why `cacheTag` and `cacheLife` Come Before the First `await`

Next.js needs to annotate the cache entry BEFORE the function's async work
completes. When the `'use cache'` boundary is entered, Next.js synchronously
reads any `cacheTag()` / `cacheLife()` calls that appear before the first
`await` to build the entry's metadata. Calls that appear AFTER an `await` are
in a different execution context — they may or may not be visible to the
cache machinery, and in practice are treated as no-ops.

This is not a JavaScript execution rule, but a Next.js compiler constraint.
The compiler analyses the AST of `'use cache'` functions and enforces this
ordering during build. If you put `cacheTag` after `await`, you will get a
build warning or the tag will simply be absent from the entry.

---

## React `cache()` vs `'use cache'` — Depth

### React `cache()`

`cache()` is React's answer to "I need this data in multiple places within one
render, but I don't want to pass it as props." It is a module-level memo:

```typescript
const getUser = cache(async (id: string) => {
  return await db.users.findOne(id);
});
```

If your page component and your Header component both call `getUser("u-123")`,
the second call returns the first call's result — the DB query runs exactly once
during this render.

At the end of the request, the memo table is garbage-collected. The NEXT request
starts with an empty memo — both callers fetch again.

### `'use cache'`

`'use cache'` is Next.js's answer to "I want this data to persist ACROSS requests."
The result is stored in a durable server-side cache that outlives the request.

When the second request arrives with the same arguments, Next.js checks the cache
store before running the function. If the entry is present and not expired, the
function body never runs — the stored value is returned directly.

### The Venn diagram

```
React cache()    'use cache'
     ┌────────────────┐
     │ Per-request    │
     │ dedup          │
     │ (intra-render  │
     │ memoisation)   │
     └────────────────┘
                    ┌────────────────────────────────┐
                    │ Cross-request persistence       │
                    │ (durable cache store)           │
                    │ + TTL (cacheLife)               │
                    │ + tag invalidation (cacheTag)   │
                    └────────────────────────────────┘

Overlap: both avoid re-running the function with the same args in some scope.
```

In practice, you often use BOTH in the same codebase:
- `'use cache'` on the data layer (product catalog, categories)
- `cache()` on request-scoped reads (current user session, headers)

---

## Why the Page Route Is `◐` Not `○`

The `/c08-use-cache` page reads cached data at its top level
(`getAllCachedCategories` and `getCachedProductSummary`) — this is safe outside
`<Suspense>`. So the shell is fully prerenderable.

However, `UncachedDataPanel` calls `listProducts()` directly with NO `'use cache'`.
Because `lib/data` uses `Math.random()` for latency, every call is non-deterministic.
Non-deterministic uncached reads cannot be part of the static shell — they MUST
live inside `<Suspense>`.

Having even ONE `<Suspense>` hole with dynamic data makes the route `◐` (Partial
Prerender) rather than `○` (Static). The shell is still prerendered; the
UncachedDataPanel streams in per-request.

To see `○` instead of `◐`: remove UncachedDataPanel (or wrap its call in
`'use cache'`). With no uncached reads in any Suspense hole, the entire route
becomes statically renderable.

---

## The `cacheLife` Profile Choice (why `'hours'` for products)

| Data type | Chosen profile | Reasoning |
|---|---|---|
| Categories | `'days'` | Category names rarely change. 24h TTL is safe; mutation invalidates explicitly. |
| Product detail | `'hours'` | Price and description can change (promotions, corrections). 1h TTL is a safety net. Tag invalidation handles immediate changes. |
| RSC component output | `'hours'` | Matches the underlying data lifetime — no point caching the rendered output longer than the data it renders. |

**Belt-and-suspenders principle:** always use BOTH `cacheTag` AND `cacheLife`.
Tag-based invalidation handles the "known mutation" case (Server Action fires,
calls `revalidateTag`). `cacheLife` handles the "forgotten/missed invalidation"
case — even if the Server Action was never called, stale data eventually expires.

---

## Custom `cacheLife` Profiles

Custom profiles are defined in `next.config.ts` under `experimental.cacheLife`.
Each profile has three fields:

| Field | Meaning |
|---|---|
| `stale` | How long (seconds) to serve a stale entry WITHOUT revalidating (immediate return) |
| `revalidate` | How long (seconds) after last revalidation before a background recompute is triggered |
| `expire` | Hard expiry (seconds) — entry is unconditionally evicted after this TTL |

Example:

```typescript
// next.config.ts (read-only in this repo — shown for reference)
const config = {
  experimental: {
    cacheLife: {
      'product-detail': {
        stale: 30,       // serve stale for up to 30s before background recompute
        revalidate: 3600,  // trigger background recompute after 1h
        expire: 86400,   // hard-evict after 24h regardless
      },
    },
  },
};
```

Using a non-existent profile name is a runtime warning — Next.js falls back to
the default profile. Register custom profiles before deploying to avoid silent
misconfiguration.

---

## Forbidden Patterns — and Why They Are Forbidden

| Pattern | Why it fails |
|---|---|
| `export const dynamic = 'force-static'` | Banned by `cacheComponents: true`. The build rejects it. Cache is opt-in. |
| `export const dynamic = 'force-dynamic'` | Also banned. Use `<Suspense>` for dynamic data instead. |
| `export const revalidate = 3600` | Superseded by `cacheLife()`. May conflict with v16 semantics. |
| Uncached data read at page top level | Build fails: "Uncached data accessed outside `<Suspense>`" |
| `cacheTag()`/`cacheLife()` after `await` | Tags not attached to the cache entry. Silent misconfiguration. |

---

## Further Reading

- `cache-flow.md` — detailed lifecycle diagram with all cache entries annotated.
- `app/(challenges)/c08-use-cache/_meta/spec.md` — challenge spec and mental model.
- `docs/cache-components-rules.md` — repo-wide cache discipline rules.
- `app/(challenges)/c03-product-ppr/` — PPR + Suspense applied to a real product page.
- `solutions/c03-product-ppr/NOTES.md` — PPR-specific notes (complements this file).
