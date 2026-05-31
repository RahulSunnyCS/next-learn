# C06 — Metadata & SEO: Solution Notes

This file explains the key decisions in the reference solution.  Read it
after filling in `app/(challenges)/c06-metadata-seo/_meta/defend-it.md`.

---

## 1. `generateMetadata` — why async, why await params

`generateMetadata` is `async` for two reasons:

1. **`params` is a Promise in Next.js 15+.**  All segment params
   (`params`, `searchParams`) are now lazy Promises so that static pages can
   be prerendered without awaiting every dynamic value at build time.
   Forgetting `await` causes a TypeScript error in strict mode and a runtime
   warning in dev.

2. **Data fetching is async.**  `getCachedProduct(slug)` is an async
   function; without `async/await` you'd be trying to use a Promise as if it
   were a product.

Pattern:

```ts
export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;          // ← MUST await
  const product = await getCachedProduct(slug);
  // …
}
```

---

## 2. Caching inside `generateMetadata`

`generateMetadata` is called on every request.  Without `'use cache'` the
repository call (with its simulated latency) would hit on every page load.

The helper `getCachedProduct(slug)` in `_lib/seo.ts` wraps the repository
call with:

```ts
"use cache";
cacheLife("hours");
cacheTag(tags.product(slug));
```

Benefits:
- **Performance:** Repeated requests within the TTL skip latency entirely.
- **De-duplication:** Next.js shares the cached result between
  `generateMetadata` and the page's `ProductDetail` component in a single
  request (no double fetch).
- **Targeted invalidation:** Calling `revalidateTag(tags.product(slug))`
  after a product update immediately invalidates the relevant cache entry.

---

## 3. `opengraph-image.tsx` — the file-system convention

Placing `opengraph-image.tsx` (that exact filename) inside a route segment
causes Next.js to:

1. Serve it at `<segment-path>/opengraph-image` with `Content-Type: image/png`.
2. Automatically inject `<meta property="og:image" content="…/opengraph-image">`
   into the segment's `<head>`.

You do **NOT** need to list it manually in `generateMetadata`.  The presence
of the file is sufficient.

The component receives typed props:

```tsx
export default async function Image({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // …
  return new ImageResponse(<JSX />, { width: 1200, height: 630 });
}
```

`export const runtime = "edge"` is optional but recommended.  The `@vercel/og`
library (which Next.js bundles for `ImageResponse`) runs natively on the Edge
Runtime.  Without it, Next.js falls back to the Node.js Runtime which is
heavier.

### Satori CSS constraints

The JSX inside `new ImageResponse(…)` is rendered by
[Satori](https://github.com/vercel/satori), not a real browser.  Only a
subset of CSS is supported:

- Flexbox layout — use `display: "flex"` (not grid).
- All units must be `px` — no `rem`, `%`, `vh`, etc.
- No pseudo-elements (`::before`, `::after`).
- No `@keyframes` / CSS animations.
- Fonts must be explicitly loaded (or rely on the system sans-serif fallback).

---

## 4. Canonical URLs

```ts
alternates: {
  canonical: `https://nextmart.dev/products/${slug}`,
},
```

A canonical URL is the "true" address for a piece of content.  Search engines
use it to:

1. Consolidate PageRank when the same content is reachable from multiple paths.
2. Avoid duplicate content penalties (e.g. `/products/x` vs `/shop/x`).
3. Determine which URL to show in search results.

In this demo we use a placeholder domain.  In production use
`process.env.NEXT_PUBLIC_SITE_URL` so the value is environment-specific.

---

## 5. `sitemap.ts` and `robots.ts` — root placement requirement

Both files **must** live at `app/sitemap.ts` and `app/robots.ts` (the App
Router root) to be served at `/sitemap.xml` and `/robots.txt`.

In this repo `app/` is owned by the shell/capstone, so the challenge places
documented examples in the challenge sub-folder instead.  The capstone copies
these patterns into the real locations.

### sitemap.ts

```ts
import type { MetadataRoute } from "next";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: "https://…/products/slug", lastModified: new Date(), priority: 0.8 },
    // …
  ];
}
```

Next.js serialises the return value into valid `<urlset>` XML.  You never
write XML directly.

### robots.ts

```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: "https://…/sitemap.xml",
  };
}
```

Next.js serialises this into the `text/plain` robots.txt format.

---

## 6. `og/route.tsx` vs `opengraph-image.tsx`

| Feature | `opengraph-image.tsx` | `og/route.tsx` |
|---|---|---|
| URL | `[slug]/opengraph-image` | `/og?slug=…` |
| `og:image` tag auto-injection | Yes | No — add manually in `generateMetadata` |
| Typed `params` prop | Yes | No — read from `URLSearchParams` |
| Boilerplate | Minimal | More |
| Multiple image types per route | No | Yes |
| Custom `Cache-Control` headers | Automatic | Manual |

**Use `opengraph-image.tsx`** for the common case.  Use `og/route.tsx` only
when you need a shared endpoint for multiple dynamic image types.

---

## 7. Cache Components compliance

This challenge follows all cache-components rules:

- **No `export const dynamic`** in any file.
- **Uncached data reads inside `<Suspense>`** — the product lookup in
  `ProductDetail` runs inside `<Suspense fallback={…}>`.
- **`'use cache'` in `_lib/seo.ts`** — both `getCachedProduct` and
  `getCachedProductsForSitemap` use the directive with `cacheTag` and
  `cacheLife`.
- **`await params`** everywhere it appears — `page.tsx`, `generateMetadata`,
  and `opengraph-image.tsx`.
