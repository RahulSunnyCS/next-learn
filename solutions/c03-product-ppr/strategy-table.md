# Name the Strategy — Rendering Model Comparison Table

> This table answers the exam question: "Name the strategy" — given a rendering
> scenario, identify which Next.js rendering model applies, and what the
> tradeoffs are.

---

## The Table

| Strategy        | Rendered where | Rendered when              | What's cached           | User sees first        | Dynamic data support           | Best for                              |
|-----------------|----------------|----------------------------|-------------------------|------------------------|--------------------------------|---------------------------------------|
| **CSR**         | Browser (JS)   | After JS bundle downloads  | Nothing on server       | Blank / spinner        | Full (client fetches)          | Highly interactive apps, dashboards after login |
| **SSR**         | Server         | Per request                | Nothing (by default)    | Full page HTML         | Full (every render is fresh)   | Personalised pages, search results, session-gated pages |
| **SSG**         | Server         | Build time                 | Entire page             | Full static HTML       | None (snapshot at build)       | Marketing pages, blogs, docs — content that rarely changes |
| **ISR**         | Server         | Build + revalidation timer | Entire page (TTL-based) | Full (slightly stale)  | Eventual (next revalidation)   | Catalog pages, news feeds — content that changes periodically |
| **Streaming SSR** | Server       | Per request, chunked       | Nothing (by default)    | Shell HTML first       | Full (all content is dynamic)  | Complex pages where some sections are slow — avoids waterfall |
| **PPR ◐**       | Server (build + runtime) | Shell at build; holes per-request | Shell fully; holes never | Prerendered shell instantly | Full (holes stream in per-request) | Product detail pages, any page with a fast static core + slow dynamic sections |

---

## Decision Guide

```
Is the page the same for every visitor?
├── YES → Does it change over time?
│         ├── Never / rarely → SSG (○)
│         └── Periodically (minutes/hours) → ISR (○ with revalidate)
└── NO  → Does it have a fast-rendering, visitor-independent "shell"?
           ├── YES → PPR (◐)  ← THE RIGHT ANSWER for most product pages
           └── NO  → Is the entire page dynamic and highly personalised?
                     ├── YES, server-rendered → SSR (ƒ)
                     └── YES, needs full client interactivity → CSR (client only)
```

---

## Why PPR Wins for Product Detail Pages

A product page has two natural layers:

1. **Static layer** — name, price, images, description.
   - Same for every visitor.
   - Doesn't change between orders (or rarely changes — a price update).
   - Safe to prerender at build time.
   - Cost: ~0ms to serve (from CDN cache).

2. **Dynamic layer** — stock status, personalised recommendations, reviews.
   - Different per-visitor (personalisation) or changes frequently (stock).
   - Must be fresh on every request.
   - Cost: 30–150ms per hole (simulated latency in this app).

PPR gives you both: instant first paint for layer 1, fresh data for layer 2.
ISR would give you staleness on both layers. Full SSR would delay layer 1 by
the time it takes to resolve all three dynamic holes (sequentially, if not
structured carefully with Suspense).

---

## Common Exam Gotchas

| Question | Answer |
|----------|--------|
| "Can a PPR page return a 500 error after the shell has been sent?" | No — the HTTP status is locked at 200 once the first byte is written. |
| "Does `loading.tsx` replace manual `<Suspense>`?" | No — they serve different purposes. `loading.tsx` = route-level (whole segment). Manual `<Suspense>` = granular (one component). |
| "Can you use `export const dynamic = 'force-dynamic'` in a PPR page?" | No — this directive is disallowed when `cacheComponents: true` is set. Use `'use cache'` to opt INTO caching instead. |
| "Where does the static shell live between deploys?" | In Next.js's server cache (edge/CDN for production deployments). On the first request to a cold cache, it renders once and is stored. |
| "If a Suspense hole throws after flush, which boundary catches it?" | The nearest React error boundary around that component — NOT `error.tsx`. Design the async component to handle its own errors with try-catch. |
