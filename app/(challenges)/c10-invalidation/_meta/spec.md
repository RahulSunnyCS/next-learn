# Challenge Spec — C10: Cache Invalidation, Dynamic-Rendering Triggers & Footguns

> **File:** `app/(challenges)/c10-invalidation/_meta/spec.md`

---

## Learning Goal

This challenge teaches how the Next.js 16 Cache Components model handles
**cache invalidation** after mutations, what forces a route into **dynamic
rendering**, what `draftMode()` does to caching, and — most importantly — a
classic stale-cache footgun you must learn to recognise and fix.

You will learn:

1. **`revalidateTag` (v16 two-argument form)**: after a Server Action writes
   data, call `revalidateTag(tag, profile)` to purge that specific cache entry.
   The second argument is the `cacheLife` profile name (e.g. `"hours"`). The
   one-argument legacy form does NOT compile in v16.

2. **`revalidatePath`**: a coarser alternative — purges every cached response
   for a given URL path, regardless of tag. Useful when you cannot predict which
   tags were used to cache a page.

3. **Dynamic-rendering triggers**: reading `cookies()`, `headers()`,
   `searchParams`, or calling `connection()` inside a Server Component tells
   Next.js the response cannot be cached. These must be `await`ed and must run
   inside a `<Suspense>` boundary (the Cache Components rule).

4. **`draftMode()`**: a per-request opt-out of caching used for CMS preview.
   When draft mode is enabled, `'use cache'` boundaries are bypassed for that
   request, so editors see live unpublished content.

5. **The stale-cache footgun**: a cached function tagged with the WRONG tag
   (or no tag at all) will never be revalidated by your Server Action — the
   stale data persists until the cache entry naturally expires. You must match
   the `cacheTag(...)` call inside the cached function with the `revalidateTag(...)`
   call inside the action.

---

## Acceptance Criteria

- [ ] **AC-1 — correct invalidation**: `addReview` Server Action calls
  `revalidateTag(tags.reviews(productId), "hours")` (the v16 two-argument form)
  AND `revalidatePath("/c10-invalidation")`. After the action fires, a reload
  shows the new review; stale data is not served.

- [ ] **AC-2 — NOTES.md explains the signature**: `solutions/c10-invalidation/NOTES.md`
  documents that v16 requires `revalidateTag(tag, profile)` with a `cacheLife`
  profile as the second argument, and shows the one-argument legacy form
  `revalidateTag(tag)` as the footgun to avoid.

- [ ] **AC-3 — dynamic-rendering probes**: `_lib/dynamic-probes.ts` exports
  four async probe components / helper functions — one for each trigger:
  `cookies()`, `headers()`, `searchParams`, `connection()` — with comments
  explaining why each opts the route into dynamic rendering.

- [ ] **AC-4 — draftMode mini-lab**: `draft/page.tsx` enables/disables draft
  mode and explains how it bypasses `'use cache'` boundaries for that request.

- [ ] **AC-5 — stale-cache footgun reproduced and fixed**: the challenge page
  shows a BUG section (wrong tag) and a FIXED section (correct tag) side by
  side, demonstrating that only the correctly-tagged cached function is
  revalidated by the Server Action.

- [ ] **AC-6 — data via local `_lib` helper**: all reads from `@/lib/data` go
  through local `_lib/` wrappers; `lib/data/**` is never modified.

---

## Topics Covered

- `revalidateTag(tag, profile)` — v16 two-argument signature
- `revalidatePath(path, type?)` — one-argument path invalidation
- `cacheTag()` and `cacheLife()` inside `'use cache'` functions
- Dynamic-rendering triggers: `cookies()`, `headers()`, `searchParams`, `connection()`
- `draftMode()` — enable, disable, `isEnabled` check, cache bypass
- Stale-cache footgun: tag mismatch between `cacheTag()` and `revalidateTag()`

---

## Challenge Structure

```
app/(challenges)/c10-invalidation/
  _meta/
    spec.md               ← this file
    defend-it.md          ← self-test questions (fill before reading solution)
    verification.md       ← step-by-step manual QA checklist
    challenge.config.json ← registry metadata
    challenge.config.ts   ← typed re-export
  _lib/
    actions.ts            ← Server Actions: addReview (broken + fixed versions)
    dynamic-probes.ts     ← probe components/helpers for each dynamic trigger
  draft/
    page.tsx              ← draftMode mini-lab
  page.tsx                ← main challenge page

solutions/c10-invalidation/
  _lib/
    actions.ts            ← reference Server Action implementation
  page.tsx                ← reference solution page
  cache-flow.md           ← diagram: tag life cycle
  NOTES.md                ← explanation of every decision
```
