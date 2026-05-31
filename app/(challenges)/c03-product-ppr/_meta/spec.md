# Challenge Spec — C03: Product Detail with Partial Prerendering (PPR) + Streaming SSR

> **File:** `app/(challenges)/c03-product-ppr/_meta/spec.md`

---

## Learning Goal

This challenge teaches **Partial Prerendering (PPR)** — Next.js 16's flagship
rendering mode that combines the best of SSG, SSR, and Streaming into one
unified model. The key insight: a single route can have a **static prerendered
shell** (product name, price, images, description) that arrives with the first
byte, and multiple independent **dynamic holes** (live stock status,
personalised recommendations, customer reviews) that stream in concurrently
after the shell — each independently, behind its own `<Suspense>` boundary.

You will also learn:
- The difference between `loading.tsx` (route-level Suspense, wraps the whole
  page) and manual `<Suspense>` (wraps a single component for granular control).
- The "error after flush" gotcha: once the HTML shell has been flushed to the
  browser, the HTTP status code is locked. An error thrown inside a streamed
  `<Suspense>` hole cannot change the HTTP status to 500 — it can only replace
  the hole's content with an error fallback.
- How to cache data with `'use cache'` + `cacheTag()` + `cacheLife()` in
  Next.js 16's Cache Components model.

---

## Scenario

**Nextmart** needs a high-performance product detail page (PDP). The product
name, price, images, and description are the same for every visitor and can be
fully prerendered at build time — these should arrive in the first HTML byte.
However, three pieces of data are dynamic per-request:
1. **Live inventory/stock** — changes when orders are placed; must be fresh.
2. **Personalised recommendations** — would depend on the current user in a
   real app; always fetched fresh here to simulate per-request variance.
3. **Customer reviews** — written by users; treated as uncached to make
   streaming latency visible.

The page should render as `◐ (Partial Prerender)` in the Next.js route table.

---

## Starting Point

The route `/c03-product-ppr/[slug]` exists but renders a blank placeholder.
The learner must:
1. Wire up the `'use cache'` function in `_lib/product.ts` to cache product
   data with the correct tag and lifetime.
2. Build a static shell `<ProductShell>` component that uses the cached data.
3. Build three uncached async components (`<LiveInventory>`, `<Recommendations>`,
   `<Reviews>`) and wrap each in a `<Suspense>` boundary with a skeleton fallback.
4. Add an `error.tsx` Client Component for the route segment.
5. Add a `loading.tsx` that explains the difference from manual `<Suspense>`.
6. Add an intentional error demo hole to illustrate the error-after-flush gotcha.

---

## Tasks

- [ ] **T1 — Cached product loader:** In `_lib/product.ts`, implement
  `getProductShellData(slug)` using `'use cache'`, `cacheTag(tags.product(slug))`,
  and `cacheLife('hours')`. This wraps `getProductBySlug` from `@/lib/data`.
- [ ] **T2 — Static shell component:** `_components/ProductShell.tsx` renders
  the product name, price, images, description, and rating from the cached data.
  No uncached reads here.
- [ ] **T3 — Dynamic hole: live inventory:** `_components/LiveInventory.tsx`
  calls `getProductBySlug` WITHOUT `'use cache'` to get a fresh stock count on
  every request. Wraps the result in a clear stock status badge.
- [ ] **T4 — Dynamic hole: recommendations:** `_components/Recommendations.tsx`
  calls `listProducts` uncached and picks 3 sibling products. Simulates
  per-request personalisation.
- [ ] **T5 — Dynamic hole: reviews:** `_components/Reviews.tsx` calls
  `listReviews` uncached. Shows the review list with star ratings.
- [ ] **T6 — Error demo hole:** Add a `StreamErrorDemo` async component in
  `[slug]/page.tsx` that simulates an error thrown mid-stream. Wrap it in a
  `<Suspense>` with an error fallback rendered by a try-catch inside the
  component (NOT an error boundary, because you are demonstrating that the
  route error boundary cannot intercept after-flush errors).
- [ ] **T7 — loading.tsx:** Add `[slug]/loading.tsx` with a full-page skeleton.
  Include a comment explaining that `loading.tsx` = route-level Suspense wrapping
  the whole page, vs manual `<Suspense>` = granular boundaries.
- [ ] **T8 — error.tsx:** Add `[slug]/error.tsx` as a `'use client'` component.
  Note in a comment that this catches errors thrown during the initial render of
  the shell (before streaming starts), NOT errors in already-flushed Suspense holes.

---

## Acceptance Criteria

1. `next build` exits 0. The `/c03-product-ppr/[slug]` route shows **◐** in
   the route table (Partial Prerender, not `ƒ` Dynamic).
2. Loading `/c03-product-ppr/wireless-noise-cancelling-headphones` (or any
   valid slug from `lib/data/fixtures.ts`) renders the product name and price
   in the initial HTML with no skeleton markers.
3. The three dynamic holes (LiveInventory, Recommendations, Reviews) are absent
   from the initial HTML and stream in independently.
4. The error demo hole renders an error fallback (not a blank space and not a
   full-page error).
5. `npx tsc --noEmit` exits 0.
6. The `loading.tsx` file exists and the comment explains route-level Suspense
   vs granular Suspense.
7. The `error.tsx` file exists as a Client Component.

---

## The rendering strategy comparison table

| Strategy        | Rendered where | Rendered when              | What's cached           | First paint            | Dynamic data support  |
|-----------------|----------------|----------------------------|-------------------------|------------------------|-----------------------|
| **CSR**         | Browser (JS)   | After JS bundle downloads  | Nothing                 | Blank/loading spinner  | Full (client fetches) |
| **SSR**         | Server         | Per request                | Nothing (by default)    | Full page HTML         | Full (per-request)    |
| **SSG**         | Server         | Build time                 | Entire page             | Full static HTML       | No (static snapshot)  |
| **ISR**         | Server         | Build + revalidation timer | Entire page (TTL-based) | Full (slightly stale)  | Limited (stale-while-revalidate) |
| **Streaming SSR**| Server        | Per request, chunked       | Nothing (by default)    | Shell HTML first       | Full (streams in)     |
| **PPR**         | Server (build+runtime) | Shell at build; holes per-request | Shell fully, holes never | Prerendered shell instantly | Full (holes stream in) |

---

## Hints

<details>
<summary>Hint 1 — Why does the build fail with "Uncached data was accessed outside of Suspense"?</summary>

Under `cacheComponents: true`, the build enforces PPR discipline. If you call
an uncached data function (like `getProductBySlug` without `'use cache'`) at
the top level of a Server Component that is NOT wrapped in `<Suspense>`, the
build rejects it. Move the call into a child async component and wrap that
component in `<Suspense>`.

</details>

<details>
<summary>Hint 2 — How do I tag a 'use cache' function correctly?</summary>

Inside a `'use cache'`-annotated async function, call `cacheTag()` and
`cacheLife()` from `"next/cache"` BEFORE your first `await`:

```typescript
import { cacheTag, cacheLife } from "next/cache";
import { tags } from "@/lib/data";

async function getCachedProduct(slug: string) {
  "use cache";
  cacheTag(tags.product(slug));
  cacheLife("hours");
  return getProductBySlug(slug);
}
```

The tag lets you invalidate just this product's cache entry with
`revalidateTag(tags.product(slug))` from a Server Action.

</details>

<details>
<summary>Hint 3 — What is the error-after-flush gotcha?</summary>

When Next.js streams a response, the HTTP status code (200) is written with
the first byte of the shell. Once flushed, it cannot be changed. If an error
is thrown inside a `<Suspense>` boundary AFTER the shell has already been sent,
React replaces the hole's content with the nearest error boundary's fallback
(or leaves it blank). The HTTP response is still 200. The `error.tsx` route
segment boundary only catches errors thrown during the INITIAL render of the
shell — before any byte is sent.

</details>

<details>
<summary>Hint 4 — loading.tsx vs manual Suspense</summary>

`loading.tsx` in the `[slug]/` folder creates a route-level Suspense boundary
that wraps the ENTIRE page. Every time the route navigates, React shows the
`loading.tsx` skeleton until the page is fully ready. It is coarse-grained.

A manual `<Suspense fallback={<Skeleton/>}>` wraps ONLY the specific async
component you choose. Multiple manual boundaries stream independently — the
product shell is visible immediately, while each hole resolves at its own pace.
This is the PPR model: use `loading.tsx` as a last-resort fallback for the
whole segment, and manual `<Suspense>` for fine-grained streaming control.

</details>
