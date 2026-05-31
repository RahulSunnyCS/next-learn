# Verification Checklist — C06 Metadata & SEO

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no type errors.
- [ ] `npm run build` exits 0 (no build errors under c06).
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## generateMetadata

- [ ] **Title tag** — Open DevTools on
  `/challenges/c06-metadata-seo/wireless-noise-cancelling-headphones`.
  The `<title>` element contains the product name.

- [ ] **Description tag** — `<meta name="description">` is present in
  `<head>` and contains a non-empty string taken from the product's
  `description` field (or a truncated version of it).

- [ ] **Canonical link** — `<link rel="canonical">` is present in `<head>`
  and its `href` contains the product slug.

- [ ] **OG title / description** — `<meta property="og:title">` and
  `<meta property="og:description">` are present.

- [ ] **Twitter card** — `<meta name="twitter:card">` is present with value
  `"summary_large_image"`.

---

## Dynamic OG Image

- [ ] **Image endpoint** — Navigating to
  `/challenges/c06-metadata-seo/wireless-noise-cancelling-headphones/opengraph-image`
  in the browser returns an image (not a 404 or a blank page).

- [ ] **Content-Type** — DevTools Network tab shows
  `Content-Type: image/png` (or `image/jpeg`) on the OG image response.

- [ ] **Non-empty body** — The response body is larger than 0 bytes.

- [ ] **Product name visible** — The rendered image visually displays
  the product name "Wireless Noise-Cancelling Headphones".

---

## 404 Handling

- [ ] Visiting `/challenges/c06-metadata-seo/does-not-exist` returns HTTP
  404 (not a 500 or blank page).  The `generateMetadata` implementation
  handles a null product gracefully.

---

## Sitemap / Robots Examples

- [ ] `app/(challenges)/c06-metadata-seo/sitemap.ts` compiles without error.
  It exports a default function returning `MetadataRoute.Sitemap`.

- [ ] `app/(challenges)/c06-metadata-seo/robots.ts` compiles without error.
  It exports a default function returning `MetadataRoute.Robots`.

- [ ] Both files contain a comment explaining that in production they belong
  at `app/sitemap.ts` and `app/robots.ts` respectively.

---

## Cache Compliance

- [ ] There is **no** `export const dynamic` directive in any file under
  `app/(challenges)/c06-metadata-seo/`.

- [ ] The product data read inside `generateMetadata` is wrapped in
  `'use cache'` (inside `_lib/seo.ts`) with `cacheTag` and `cacheLife`
  set.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c06`

- [ ] All tests pass.
