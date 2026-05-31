# C03 PPR — Reference Solution Notes

> Read this AFTER completing your own implementation and filling in defend-it.md.
> These notes explain every non-obvious decision in the reference solution.

---

## Architecture decisions

### 1. Why is `getProductShellData` a cached wrapper around `getProductBySlug`?

`getProductBySlug` (in `lib/data/repository.ts`) is not cached — it is a plain
async function that hits the in-memory store with simulated latency. It's the
right library function to call, but we cannot cache it at the library level
because different callers need different cache lifetimes and tags.

The `'use cache'` wrapper in `_lib/product.ts` is challenge-local: it tags with
`tags.product(slug)` and sets a `'hours'` lifetime that makes sense for product
detail data (name, price, description rarely change intra-day).

The dynamic holes intentionally call the repository functions DIRECTLY without
going through the cached wrapper, because they need fresh data every request.

### 2. Why three separate `<Suspense>` boundaries rather than one?

A single `<Suspense>` wrapping all three holes would serialise them: React
would wait for ALL three to resolve before streaming any. Three separate
boundaries let them resolve concurrently — the fastest one (say, LiveInventory
at 30ms) streams immediately; the slowest (say, Reviews at 120ms) arrives later.
The user never stares at a blank page waiting for the slowest component.

This is the core PPR performance win: independence of holes.

### 3. Why is `StreamErrorDemo` not wrapped in a client-side React Error Boundary?

To demonstrate the after-flush gotcha honestly. A client-side Error Boundary
around the hole would catch the error on the client but the server-side picture
is unchanged: the HTTP response was still 200 with the shell already sent.

The teaching point is: use try-catch inside the async component itself (server-
side defense), not error boundaries, for post-flush errors. An ErrorBoundary
would hide the gotcha rather than expose it.

### 4. Why does `error.tsx` have a `digest` field?

Next.js 13+ injects a `digest` string into server-side errors in production.
It is a short hash that lets you correlate the user-visible "something went
wrong" message with the full error in your server logs, without exposing the
stack trace to the browser. We display it in development but not production.

### 5. Why does `loading.tsx` still exist if we have fine-grained `<Suspense>`?

Two reasons:
1. **Client-side navigation**: When a user navigates from another page to this
   product page via `<Link>`, Next.js shows `loading.tsx` until the page is
   ready in the client-side router cache. Without `loading.tsx`, there would
   be no visual feedback during that transition.
2. **Teaching contrast**: Having both files side-by-side lets the learner
   compare coarse vs fine-grained Suspense in the same challenge.

In a production PPR page, you would typically have both: `loading.tsx` for
the route-level fallback and manual `<Suspense>` for the holes.

### 6. Why not use `generateStaticParams`?

`generateStaticParams` pre-builds static HTML for all known slugs at build
time. In a real app this is valuable — it means the first visitor to any product
page gets served prerendered HTML immediately without a server round-trip to
warm the cache.

For this teaching challenge it is omitted to keep the focus on the PPR streaming
mechanism rather than SSG with dynamic params. Adding it is a natural extension:

```typescript
export async function generateStaticParams() {
  const { items } = await listProducts({ pageSize: 100 });
  return items.map((p) => ({ slug: p.slug }));
}
```

With this addition, `next build` would show the route as `◐` with a note about
pre-generated paths.

---

## The Error-After-Flush Gotcha — detailed explanation

```
Timeline:

  t=0ms   Request arrives at Next.js server
  t=1ms   Page component starts rendering
  t=30ms  getProductShellData resolves (from cache or after delay)
  t=32ms  Shell HTML generated synchronously
  t=33ms  HTTP 200 + shell HTML flushed to browser ← STATUS LOCKED HERE
  t=33ms  LiveInventory, Recommendations, Reviews, StreamErrorDemo
          all start resolving concurrently
  t=93ms  StreamErrorDemo throws after its 60ms delay
  t=93ms  try-catch inside StreamErrorDemo catches the error
  t=93ms  StreamErrorDemo returns error fallback HTML
  t=93ms  React streams error fallback HTML to browser
  t=93ms  Browser renders error fallback in the Suspense placeholder
          HTTP status: still 200 ✓  (cannot change to 500)
          error.tsx: never invoked ✓ (already past the flush point)
```

What you CANNOT do after flush:
- Change the HTTP status code.
- Invoke the route `error.tsx` boundary.
- Set response headers (they were sent with the status line).

What you CAN do after flush:
- Return an error fallback from inside the async component (try-catch).
- Use a client-side React Error Boundary around the hole.
- Log the error to your error reporting service (Sentry, etc.).

---

## Cache Tags cheat sheet (for this challenge)

| Action | Tag to revalidate |
|--------|------------------|
| Product data changed (price, desc, images) | `tags.product(slug)` |
| Product deleted or added to store | `tags.products` |
| New review submitted | `tags.reviews(productId)` (not used in cached calls here) |

---

## Testing this page manually

1. Run `npm run dev`.
2. Open `http://localhost:3000/c03-product-ppr/wireless-noise-cancelling-headphones`.
3. In DevTools → Network tab, select the document request and click "Preview".
   You should see the product name and price in the raw HTML — before JS runs.
   You should also see skeleton `<div>` elements for the three holes.
4. Watch the page — the three holes fill in over ~60–120ms.
5. Check the Network tab — the response status is 200, even though the error
   demo hole threw an error.
6. Disable JavaScript (DevTools → Settings → Disable JavaScript). Reload.
   The shell still renders! The dynamic holes never fill in (JS needed for
   hydration/streaming finalisation) but the product info is visible. This is
   the "progressive enhancement" bonus of server rendering.
