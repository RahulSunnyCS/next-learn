# Solution Notes — C05 App Router Architecture

## What This Challenge Demonstrates

This challenge is a living reference for the five major App Router routing conventions:

1. **Route groups** — `(challenges)` makes the folder invisible in URLs
2. **Dynamic segments** — `[id]` captures one URL part; `params` is a `Promise<{id:string}>` in v16
3. **Catch-all segments** — `[...slug]` captures one-or-more parts as a `string[]`
4. **Parallel routes** — `@modal` slot declared in `layout.tsx`; `default.tsx` prevents 404s
5. **Intercepting routes** — `(.)products/[id]` hijacks soft-nav to open a modal; hard-refresh shows the full page

---

## Intercepting Route Mechanics — Detailed

### The `(.)` Prefix

The prefix determines *which ancestor level* the interception applies relative to the intercepting file's slot-parent.

```
c05-app-router/          ← slot-parent of @modal
  layout.tsx             ← declares { modal, children }
  @modal/                ← slot parent is c05-app-router/
    (.)products/         ← intercept c05-app-router/products/
      [id]/
        page.tsx         ← renders as modal on soft-nav
  products/
    [id]/
      page.tsx           ← renders as full page on hard-refresh
```

The key chain of events on **soft navigation**:
1. User clicks `<Link href="/challenges/c05-app-router/products/p-elec-001">`.
2. Next.js router checks: does any intercepting route match this URL from the current segment?
3. `@modal/(.)products/[id]` matches — it fires.
4. Next.js renders the intercepting page in the `@modal` slot.
5. The `children` slot stays mounted (listing page still visible).
6. Browser URL updates to the target URL.

On **hard-refresh** of that same URL:
1. Browser makes a full HTTP request — no prior client-state.
2. No intercepting-route context — they are a client-side navigation feature only.
3. Next.js resolves `products/[id]/page.tsx` normally.
4. `@modal` slot finds no match, returns `null` via `default.tsx`.
5. Full product page renders.

### Why `router.back()` Closes the Modal

When the modal is open, the browser's history stack has:
```
[listing page]  →  [modal URL]
```
Calling `router.back()` navigates to the listing entry, which restores the `children` slot to
the listing and the `@modal` slot to `default.tsx` (null) — effectively closing the modal
without a full page reload.

---

## default.tsx Contract

Every parallel slot must have a renderable component for **every URL in the layout's subtree**.

Without `@modal/default.tsx`:
- Visit `/challenges/c05-app-router` → `@modal` has no match → 404
- Visit `/challenges/c05-app-router/products/a/b` → same → 404

With `@modal/default.tsx` returning `null`:
- All non-modal URLs render the layout normally with "no modal visible".
- Only URLs matching `(.)products/[id]` activate the modal.

---

## Cache Components Rules Applied

All data reads go through `_lib/catalog.ts`, which wraps `@/lib/data` functions with:
```ts
"use cache";
cacheTag(tags.product(id));
cacheLife("hours");
```

This makes the reads **cached**, not "uncached dynamic reads".  Under `cacheComponents: true`,
an uncached read accessed **outside** `<Suspense>` fails the build.  Because our reads are
cached, they can technically be called outside Suspense — but we still wrap them in Suspense
for streaming UX (skeletons while the cache warms on first request).

### No `export const dynamic`

`cacheComponents: true` forbids the `dynamic` route segment config entirely.  Dynamic
behaviour is controlled by whether you use `'use cache'` or not — not by a directive.

---

## Route Priority: [id] vs [...slug]

Next.js specificity rules:
- Static segments > dynamic segments > catch-all segments
- `[id]` (one segment) > `[...slug]` (one or more segments)

So `/products/p-elec-001` (1 segment) → `[id]/page.tsx`
And `/products/electronics/keyboards` (2 segments) → `[...slug]/page.tsx`

Both files coexist in the same `products/` directory without conflict.

---

## Model Answers for defend-it.md

**Q1 — Intercepting routes and hard-refresh:**
Intercepting routes are a client-side navigation feature. They only fire when the Next.js
router has prior state (i.e. you navigated FROM somewhere). On hard-refresh, the browser
makes a fresh HTTP request with no routing context, so the intercepting route is skipped and
the real `products/[id]/page.tsx` renders. This is intentional: it makes the URL shareable
and deep-linkable to a full, crawlable page.

**Q2 — Why default.tsx is required:**
A parallel slot must be able to render for every URL in its parent layout's subtree. Without
`default.tsx`, when the URL is `/challenges/c05-app-router` (the listing), the `@modal` slot
has no matching page and Next.js cannot render the layout at all. `default.tsx` is the
explicit "no match = render nothing" contract for the slot.

**Q3 — error.tsx must be "use client":**
React error boundaries are implemented as class components (or via React's error boundary API)
that must run in the browser. Error boundaries catch rendering errors in their subtree and
display fallback UI — this requires React's reconciler to be running on the client. Server
Components render once on the server and send HTML; they have no mechanism for catching errors
in child components at runtime.

**Q4 — (.) vs (..) prefix:**
If `@modal` were at `app/(challenges)/@modal/`, its slot-parent would be `(challenges)/`.
To intercept `c05-app-router/products/[id]` from there, you'd need `(..)` (one level up from
`(challenges)/` to intercept `(challenges)/c05-app-router/products/[id]`), or more precisely
you'd need to match the path relative to the parent. The exact prefix depends on the relative
depth between the slot parent and the target route.

**Q5 — notFound() vs throw:**
`notFound()` throws a special internal Next.js signal that is caught by `not-found.tsx` —
it produces an appropriate "resource not found" UX with HTTP 404 status. Throwing `new
Error('not found')` is caught by `error.tsx` and produces a generic error screen with HTTP
500 status. For a missing resource, `notFound()` is correct because it gives the right
semantic (404), the right UI, and is SEO-appropriate.
