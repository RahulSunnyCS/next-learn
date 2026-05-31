# Cache Flow — C13 Route Handlers

> This document traces the caching (or non-caching) path for each Route
> Handler in this challenge, and explains the v14 → v16 behavioural change.

---

## The v14 → v16 GET handler caching change

### Next.js 14 — Implicit caching (the footgun)

```
GET /api/products
     │
     ▼
  Route Handler GET export
     │
     ├─ Uses dynamic APIs? (cookies(), headers(), request.url, searchParams)
     │        │
     │    YES │                     NO
     │        ▼                      ▼
     │  Runs fresh              Cached at BUILD TIME
     │  on every req.           in Full Route Cache
     │                          (static, until revalidation)
     │
     │  Problem: a handler that looks static (reads only from an in-memory
     │  store) is silently cached. If the store changes (e.g. after a mutation),
     │  the handler returns stale data until the cache is invalidated. The
     │  developer may not realise caching is active.
```

### Next.js 16 — Explicit caching (v15/v16 default)

```
GET /api/products
     │
     ▼
  Route Handler GET export
     │
     (No implicit caching — runs fresh on every request regardless of APIs used)
     │
     ▼
  Data layer
     │
     ▼
  HTTP response (live data)

  To OPT IN to caching:
    Option A — 'use cache' on the data accessor:
      async function getCachedProducts() {
        'use cache';
        cacheTag('products');
        cacheLife('minutes');
        return listProducts();
      }
      // Route handler calls getCachedProducts() — hits cache on subsequent requests.

    Option B — Cache-Control response header:
      return new Response(JSON.stringify(data), {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
      // CDN caches the response for 60 seconds. Not suitable for user-specific data.
```

---

## Search Route Handler (`/c13-route-handlers/search`)

```
GET /c13-route-handlers/search?q=headphones&limit=5
                │
                ▼
  search/route.ts — GET export (Node runtime)
                │
                ▼
  request.nextUrl.searchParams     ← dynamic — reads URL search params
                │
                ▼
  parseSearchOptions(searchParams) ← validates q, limit
                │
                ▼  (all valid)
  searchProducts({ q: "headphones", limit: 5 })
                │
                ▼
  listProducts({ q, pageSize: 5, page: 1 })   ← lib/data (in-memory)
                │
                │  lib/data uses Math.random() for latency simulation.
                │  Under cacheComponents, Math.random() in a non-cached
                │  context is fine — it runs in a route handler, not a
                │  Server Component's prerender pass.
                │
                ▼
  PaginatedResult<Product>
                │
                ▼
  Map to SearchResult[] (narrow shape — strips sellerId, stock, etc.)
                │
                ▼
  NextResponse.json({ results, total, query }, { status: 200 })
                │
                ▼
  HTTP 200 application/json     ← NO Cache-Control header (live data by default)

  Build-time route type: ƒ (Dynamic) — correct for an API endpoint.
```

---

## Edge Geo Route Handler (`/c13-route-handlers/edge-geo`)

```
GET /c13-route-handlers/edge-geo
                │
                ▼
  edge-geo/route.ts — GET export (Edge runtime — export const runtime = 'edge')
                │
                ▼
  request.headers.get("x-vercel-ip-country")   ← reads request headers
  request.headers.get("accept-language")        ← (dynamic API)
                │
                ▼
  crypto.getRandomValues(bytes)                 ← Web Crypto (NOT Node crypto)
                │
                ▼
  Array.from(bytes).map(...).join("")           ← hex encode without Buffer
                │
                ▼
  new Response(JSON.stringify({...}), {
    headers: { "Cache-Control": "no-store" },   ← explicit no-cache (geo is per-request)
  })
                │
                ▼
  HTTP 200 application/json

  Build-time route type: ƒ (Dynamic) — edge runtime, always dynamic.

  Cold start: Edge isolate starts in <1ms (vs 100–500ms for Node Lambda).
  Latency to user: served from CDN PoP nearest the user.
  Trade-off: Web APIs only — no fs, no Buffer, no Node crypto.
```

---

## proxy.ts middleware — Auth gate flow

```
GET /c13-route-handlers/account
                │
                ▼
  proxy.ts — middleware() (Node runtime, runs before route matching)
                │
                ▼
  pathname.startsWith("/c13-route-handlers/account") → true
                │
                ▼
  req.cookies.get("nextmart_session")   ← reads Cookie header
                │
          ┌─────┴──────────────────────┐
      absent                       present
          │                             │
          ▼                             ▼
  NextResponse.redirect(          NextResponse.next()
    /c01-auth?next=..., 307       (pass through to page)
  )                                     │
          │                             ▼
          ▼                    page.tsx — Server Component
  Browser redirects             getSession() ← AUTHORITATIVE check
  to /c01-auth                        │
                               ┌──────┴──────────────┐
                            null                   Session
                               │                      │
                               ▼                      ▼
                        redirect to              render account page
                        /c01-auth                (authenticated)

  ──────────────────────────────────────────────────────────────────────────
  Security contract:
    Middleware catches:  absent cookie (unauthenticated request)
    Page catches:        present but tampered/expired cookie
    Together:            no unauthenticated or tampered request reaches content
  ──────────────────────────────────────────────────────────────────────────
```

---

## proxy.ts vs. middleware.ts: naming history

| Version | Canonical file name | Old name (compat alias) |
|---------|--------------------|-----------------------|
| v12–14  | `middleware.ts`    | — (it was always middleware.ts) |
| v15     | `proxy.ts`         | `middleware.ts` (still works) |
| v16     | `proxy.ts`         | `middleware.ts` (still works) |

**Why the rename?** The file was renamed from `middleware.ts` to `proxy.ts`
in v15/v16 to better describe its actual role: it is a pre-routing HTTP proxy
layer, not a "middleware" in the Express sense (which implies per-request
function composition in the request handler chain). The new name also avoids
confusion with the `middleware` pattern in other Node frameworks.

**Practical advice:** new projects should use `proxy.ts`. Existing projects
using `middleware.ts` continue to work — the alias will not be removed without
a deprecation cycle and a major version bump.
