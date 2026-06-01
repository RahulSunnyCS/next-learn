# Runtime Map — Rendering Strategy → Infrastructure Tier

> **File:** `solutions/c20-deployment/runtime-map.md`
>
> Maps every representative route in the Nextmart repo to its rendering symbol,
> the infrastructure tier where code runs, and what executes at build time vs
> at request time.
>
> Build symbols:
> - `○ Static` — fully prerendered at build time; served as raw HTML from CDN.
> - `◐ Partial Prerender` — static shell at CDN + dynamic holes from serverless/edge.
> - `ƒ Dynamic` — fully server-rendered on every request; no CDN caching of HTML.

---

## Route → Infrastructure Table

| Route | Challenge | Symbol | Build-time work | Request-time work | Infra tier |
|-------|-----------|--------|-----------------|-------------------|------------|
| `/c02-catalog-ssg-isr` | C02 | `○ Static` | Product grid HTML prerendered; `cacheLife('hours')` data fetch runs once per revalidation window | ISR revalidation: server detects stale cache entry and runs the data accessor in background | CDN (static shell HTML) + Serverless (ISR background revalidation) |
| `/c02-catalog-ssg-isr/[slug]` | C02 | `○ Static` | One HTML file per slug via `generateStaticParams`; product detail data fetched and cached at build | ISR revalidation; unknown slugs hit the server on demand (dynamicParams: true is the cacheComponents default) | CDN (known slugs) + Serverless (on-demand render + ISR revalidation) |
| `/c03-product-ppr/[slug]` | C03 | `◐ Partial Prerender` | Static shell (product name, price, image) from `'use cache'` function prerendered | Live inventory, personalised recommendations, reviews — streamed from a serverless function per request | CDN (static shell) + Serverless or Edge (dynamic holes streamed per request) |
| `/c01-auth` | C01 | `◐ Partial Prerender` | Page header, challenge sections, explainer text prerendered | Session cookie read inside `<Suspense>` hole — per-user, not CDN-cacheable | CDN (static shell) + Serverless (session hole per request) |
| `/api/... (c13 Route Handlers)` | C13 | `ƒ Dynamic` | Handler code bundled; no HTML prerendered | Full handler function runs on every request: receives Request, executes logic, returns Response | Serverless function or Node.js server process |
| `/c11-server-actions` | C11 | `ƒ Dynamic` | Server Action stubs compiled to POST endpoints | Mutation handler executes per form submit; `revalidateTag` invalidates cache entries | Serverless function (mutations always require a live server) |
| `/c20-deployment` | C20 | `○ Static` | All educational text prerendered; no dynamic reads | Nothing — pure CDN serve | CDN only (zero server compute per request) |

---

## Build-time vs Request-time Decision Table

| What runs at BUILD time | What runs at REQUEST time |
|------------------------|--------------------------|
| `generateStaticParams` — enumerate known paths | Route Handler `GET`/`POST` functions |
| `'use cache'` data functions — initial cache population | `'use cache'` data functions — only when cache is STALE (ISR revalidation) |
| Static shell HTML for all `○` and `◐` routes | Dynamic hole components inside `<Suspense>` boundaries |
| TypeScript compilation, asset bundling | `cookies()`, `headers()`, `connection()` reads |
| `next/image` placeholder generation | Server Actions (`'use server'` mutations) |
| Metadata (title, description, OG tags) for static routes | `revalidateTag` / `revalidatePath` calls after mutations |

---

## ISR / cacheComponents at the Infrastructure Level

The `'use cache'` + `cacheLife('hours')` declaration in source code specifies
WHEN a cache entry is stale — but WHERE the cache entry is physically stored
depends entirely on your deployment target.

| Deployment target | Cache store location | Multi-instance behaviour |
|---|---|---|
| **Vercel** | Vercel distributed KV (edge network) | Revalidation propagates globally to all instances within seconds |
| **Docker standalone (single container)** | Local filesystem (`.next/cache/`) | Correct — all requests go to the same process and same on-disk cache |
| **Docker standalone (multiple replicas)** | Each replica has its own local filesystem | **Problem:** `revalidateTag()` invalidates only ONE replica's cache. Others serve stale until `cacheLife` expires. Fix: shared NFS/EFS volume or Redis cache handler |
| **`output: 'export'`** | **None** — no runtime cache exists | Data is frozen at `next build` time. ISR never runs. Only a full rebuild + redeploy updates the data. |

---

## Edge vs Serverless: Where Per-Route Logic Lives

In Next.js 16 with `cacheComponents: true`, `export const runtime = 'edge'` is
**incompatible** with cacheComponents and fails the build with:

```
Route segment config 'runtime' is not compatible with cacheComponents
```

Per-route runtime selection is therefore a **deployment-level concern** — you
configure whether a function runs on Edge or Node.js serverless in your
deployment platform's config (Vercel `vercel.json`, Fly.io `fly.toml`, etc.),
not in Next.js route code.

For the Nextmart repo, the inferred runtime assignment is:

| Route type | Likely runtime (platform-assigned) | Reason |
|---|---|---|
| Static shell HTML (`○`) | CDN — no function at all | Served from cached bytes; no server compute |
| Dynamic holes in PPR (`◐`) | Node.js serverless | Reads from DB, needs full Node.js API |
| Route Handlers that use Stripe / DB | Node.js serverless | Stripe SDK uses Node-only APIs (`crypto`, `https`, `buffer`) |
| Auth checks / redirects (proxy.ts) | Edge | Simple conditional logic; no Node-only deps; latency-sensitive |
| ISR revalidation background tasks | Node.js serverless | Runs on the same platform as the main server |

---

## Symbol → CDN Cacheability

| Symbol | Is the HTML response CDN-cacheable? | Why |
|--------|-------------------------------------|-----|
| `○ Static` | Yes — permanently (until next deploy or ISR revalidation) | Identical for every user, every request |
| `◐ Partial Prerender` | Shell is cached; dynamic holes are NOT | Shell is user-agnostic; holes are per-user/per-request |
| `ƒ Dynamic` | No | Response differs per request (session, params, time) |
