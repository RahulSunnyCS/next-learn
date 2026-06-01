# Performance Budget — Nextmart

> **Updated:** 2026-06-01
> **Scope:** The challenge index (/) and representative challenge pages.
> **Tools:** Next.js build output analysis, Lighthouse (local), WebPageTest.

---

## Target Metrics

| Metric | Target | Current Baseline | Status |
|--------|--------|-----------------|--------|
| LCP (Largest Contentful Paint) | ≤ 2.5 s | Pending deployment measurement | ⏳ |
| INP (Interaction to Next Paint) | ≤ 200 ms | Pending deployment measurement | ⏳ |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | Pending deployment measurement | ⏳ |
| TTFB (Time to First Byte) | ≤ 800 ms | Pending deployment measurement | ⏳ |
| Total JS bundle (initial load) | ≤ 150 kB gzip | See build analysis below | ⏳ |
| Lighthouse Performance score | ≥ 90 | Pending deployment measurement | ⏳ |

---

## Build Output Analysis

### Route Table Summary

Routes from `npm run build` (representative subset):

| Route | Symbol | Strategy | Notes |
|-------|--------|----------|-------|
| `/` | ○ Static | Fully prerendered | Challenge index — ideal |
| `/c01-auth` | ◐ PPR | Static shell + streamed session | Correct pattern |
| `/c02-catalog-ssg-isr` | ○ Static + ISR | 15-minute revalidation | Good |
| `/c03-product-ppr/[slug]` | ◐ PPR | Product detail streaming | Correct pattern |
| `/c06-metadata-seo` | ○ Static | Cached with 1d/1w profile | Good |
| `/c08-use-cache` | ◐ PPR | Demonstrates 'use cache' | Correct pattern |
| `/c13-route-handlers/edge-geo` | ƒ Dynamic | Edge route handler | Expected |
| `/c25-capstone` | ○ Static | All-static shell | Ideal for capstone |

**Finding:** The challenge index (`/`) and capstone page (`/c25-capstone`) are
both fully static — they will serve from CDN with effectively zero TTFB.
Most challenge pages use PPR (◐) which means the static shell arrives from
CDN immediately and the dynamic data streams in separately, minimising
perceived load time.

### Potential Optimisations

1. **`/c12-action-security` and `/c14-tanstack-query`** — currently marked
   ◐ PPR. If their static shells are large and the dynamic holes are small,
   the PPR split is efficient. Verify the Suspense fallback dimensions match
   the actual content to prevent CLS.

2. **JS bundle size** — After `npm run build`, inspect `.next/static/chunks/`.
   The largest expected chunks are:
   - `react-dom` — unavoidable, ~135 kB gzip
   - `@tanstack/react-query` — needed by c14, ~15 kB gzip
   - `@tanstack/react-virtual` — needed by c24, ~8 kB gzip
   - `zustand` — needed by c15, ~3 kB gzip
   These are route-split automatically by Turbopack — pages that don't use
   TanStack Query won't load that chunk.

3. **Images** — All `<Image>` components in the curriculum use either
   explicit `width`/`height` or the `fill` prop with a sized container. CLS
   from images should be 0 on challenge pages that use `next/image` correctly.

---

## Lighthouse Baseline (to be filled after deployment)

Run against the production Vercel URL with throttling:
- Device: Mobile (Lighthouse default)
- Connection: Slow 4G
- CPU: 4× slowdown

```
Challenge Index (/)
  Performance     : ___
  Accessibility   : ___
  Best Practices  : ___
  SEO             : ___

C01 Auth (/c01-auth)
  Performance     : ___
  Accessibility   : ___
  Best Practices  : ___
  SEO             : ___
```

**Instructions:** Run `npx lighthouse https://your-url.vercel.app --output json`
and paste the scores here. Or use the Chrome DevTools Lighthouse panel (F12 →
Lighthouse → Analyze page load).

---

## Core Web Vitals Field Data (CrUX — to be filled after 28-day traffic)

Chrome User Experience Report (CrUX) data is available after 28 days of real
user traffic to the deployed URL. Check it at:
- `https://crux.run/url/<your-vercel-url>`
- Or in Google Search Console → Core Web Vitals

Expected outcome for a static/PPR site on Vercel Edge:
- LCP: 1.0–1.8 s (static shell arrives from CDN immediately)
- INP: < 100 ms (minimal client JS on index page)
- CLS: < 0.05 (explicit image dimensions, no layout-shifting ads)

---

## Remediation Plan

If targets are missed after the first Lighthouse run:

| Issue | Likely cause | Fix |
|-------|-------------|-----|
| LCP > 2.5s | Hero text rendered via client JS | Move to static Server Component |
| INP > 200ms | Heavy client bundle | Route-split with next/dynamic; move logic to Server Actions |
| CLS > 0.1 | Image without explicit size | Add width/height or fill + sized container |
| TTFB > 800ms | Dynamic (ƒ) route without PPR | Refactor: static shell + Suspense hole |
| Perf score < 90 | Multiple small issues | Address in order: LCP → CLS → INP → TTFB |
