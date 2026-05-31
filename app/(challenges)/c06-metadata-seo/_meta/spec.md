# Challenge Spec — C06 Metadata & SEO

> **File:** `app/(challenges)/c06-metadata-seo/_meta/spec.md`

---

## Learning Goal

This challenge teaches the Next.js 15+ Metadata API: how to produce
per-route HTML `<meta>` tags, Open Graph images, canonical URLs, and
machine-readable files (sitemap, robots) that search engines need.

You will learn:
- `generateMetadata()` — the async function that runs at request time to
  produce title, description, OG tags, and the canonical URL for a
  dynamic product route.
- `opengraph-image.tsx` — a file-system convention that hooks into the
  metadata pipeline and returns an `ImageResponse` (a dynamically generated
  PNG) without you having to wire up a separate route manually.
- `sitemap.ts` / `robots.ts` — special Next.js file conventions that
  produce `/sitemap.xml` and `/robots.txt` from TypeScript functions (no
  static XML files required).

---

## Scenario

Nextmart has a product detail page at `/challenges/c06-metadata-seo/[slug]`.

Without SEO metadata:
- Google sees a generic `<title>` and no description.
- Social cards (Slack, Twitter, Discord) show a blank preview.
- `/robots.txt` is missing, so crawlers index everything including
  admin paths.
- `/sitemap.xml` is missing, so Google cannot discover the catalog pages.

Your job is to wire up the full metadata stack.

---

## Starting Point

The learner is given a **static shell** product page at
`app/(challenges)/c06-metadata-seo/[slug]/page.tsx` that renders product
data but **has no `generateMetadata` export** and **no OG image** file.

The following are deliberately absent:
- `generateMetadata` export on the product page
- `app/(challenges)/c06-metadata-seo/[slug]/opengraph-image.tsx`
- `app/(challenges)/c06-metadata-seo/sitemap.ts`
- `app/(challenges)/c06-metadata-seo/robots.ts`

---

## Tasks

- [ ] **Task 1 — `generateMetadata`**  
  Export `async function generateMetadata({ params })` from the product
  page. Await `params`, look up the product by slug via `_lib/seo.ts`,
  and return `{ title, description, alternates: { canonical }, openGraph,
  twitter }`.

- [ ] **Task 2 — Dynamic OG image**  
  Create `app/(challenges)/c06-metadata-seo/[slug]/opengraph-image.tsx`
  (the file-based metadata convention). Export a default React component
  that receives `{ params }`, looks up the product, and returns an
  `ImageResponse` rendering the product name and price.

- [ ] **Task 3 — robots.ts**  
  Create `app/(challenges)/c06-metadata-seo/robots.ts` as a documented
  example.  
  **Note:** In a real app `robots.ts` MUST live at `app/robots.ts` (repo
  root).  The root `app/` is owned by the capstone shell and is out of
  scope for this challenge.  Read the note in
  `_meta/example-sitemap/README.md`.

- [ ] **Task 4 — sitemap.ts**  
  Create `app/(challenges)/c06-metadata-seo/sitemap.ts` as a documented
  example.  Same scoping caveat as Task 3.

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0 — no TypeScript errors in any file under
   `app/(challenges)/c06-metadata-seo/`.

2. `generateMetadata` is an `async` function that **awaits params** before
   any data access (required by the cache-components rules).

3. Visiting `/challenges/c06-metadata-seo/wireless-noise-cancelling-headphones`
   in a browser shows an HTML `<title>` containing the product name.

4. The OG image route at
   `/challenges/c06-metadata-seo/wireless-noise-cancelling-headphones/opengraph-image`
   returns HTTP 200 with `Content-Type: image/png` and a non-empty body.

5. The `<head>` contains `<link rel="canonical">` pointing to the product
   URL.

6. The example `sitemap.ts` and `robots.ts` files compile without error
   and contain well-formed `MetadataRoute` return types.

---

## Sitemap / Robots Scoping Note

In a real Next.js app `sitemap.ts` and `robots.ts` **must** live at
`app/sitemap.ts` and `app/robots.ts` (the repo root of the App Router).
Placing them inside a route segment produces a *segment-scoped* sitemap
(the `sitemap.xml` is served at the path of the containing segment, not at
`/sitemap.xml`).

In this repo the root `app/` is owned by the shell/capstone.  The files in
`app/(challenges)/c06-metadata-seo/` are **documented examples only**.
The capstone is expected to read them and copy/adapt the patterns into the
real `app/sitemap.ts` and `app/robots.ts` files.

See `app/(challenges)/c06-metadata-seo/_meta/example-sitemap/` for further
notes and a standalone example.

---

## Hints

<details>
<summary>Hint 1 — Awaiting params in generateMetadata</summary>

In Next.js 15+ (and v16) `params` is a Promise.  You must do:

```ts
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // now safe to call getProductBySlug(slug)
}
```

Failing to await `params` causes a TypeScript error in strict mode and a
runtime warning.

</details>

<details>
<summary>Hint 2 — opengraph-image.tsx file convention</summary>

When you create a file named exactly `opengraph-image.tsx` inside a route
segment, Next.js automatically:
1. Serves it at `<segment>/opengraph-image`.
2. Adds a `<meta property="og:image">` tag to the route's `<head>`.
3. Passes `params` as a prop so dynamic routes can personalise the image.

You do **not** need to add a `og.image` field to `generateMetadata` manually
— the file convention wires it up for you.

```tsx
// [slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";  // optional but common for OG images
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ... fetch product, render JSX, return new ImageResponse(...)
}
```

</details>

<details>
<summary>Hint 3 — Canonical URL pattern</summary>

```ts
alternates: {
  canonical: `https://nextmart.dev/products/${slug}`,
},
```

The exact domain does not matter for the learning exercise — you can use a
placeholder.  What matters is that the `<link rel="canonical">` points to
the *authoritative* URL for the page (de-duplicating `/products/x` vs
`/shop/x` for search engines).

</details>
