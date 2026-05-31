# Solution Notes — C13 Route Handlers, Edge Runtime, and proxy.ts

> Reference notes for the three topics covered in this challenge.
> Read after completing the defend-it worksheet.

---

## Part A — GET Route Handler Caching in Next.js 16

### The v14 footgun (implicit caching)

In Next.js 14, a GET Route Handler was **automatically cached** (placed in
the Full Route Cache at build time) when it:
- Used no dynamic APIs (`cookies()`, `headers()`, `request.url`)
- Read no `searchParams` from the request
- Made no `fetch()` calls with cache: 'no-store'

This produced surprising behaviour:

```ts
// v14 — this handler was SILENTLY CACHED at build time
export async function GET() {
  const products = await listProducts();          // reads in-memory store
  return NextResponse.json({ products });
}
// After a product is added, GET /api/products still returns the build-time
// snapshot until the Full Route Cache is invalidated.
```

The developer had no explicit indication the response was cached — there was
no `cache: true` annotation or log message. You had to know to check the
build output (`○ Static` vs `ƒ Dynamic` symbols) to see whether a handler
was cached.

### The v16 default (no implicit caching)

Starting in Next.js 15 and continuing in v16, GET Route Handlers are **not
cached by default**. Every request invokes the handler function fresh. This
is the correct default for an API endpoint:

> An API should return live data unless you explicitly say otherwise.

The same handler above now runs fresh on every request in v16.

### How to opt INTO caching in v16

**Option 1 — `'use cache'` on the data accessor (recommended)**

```ts
// _lib/search.ts
async function searchProducts(opts: SearchOptions) {
  'use cache';                           // cache this function's return value
  cacheTag(tags.products);              // invalidate when products collection changes
  cacheLife('minutes');                  // revalidate every minute
  return listProducts(opts);
}

// The route handler calls this cached function — subsequent requests with the
// same arguments are served from cache.
```

This is the preferred pattern because:
- The cache entry is shared between Route Handlers AND Server Components
  that call the same function.
- `cacheTag()` allows targeted invalidation (a product mutation calls
  `revalidateTag(tags.products)` and all callers get fresh data).
- `cacheLife()` sets a maximum staleness bound.

**Option 2 — Cache-Control response headers**

```ts
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    // Cache at CDN for 60 seconds; serve stale for up to 30 more seconds
    // while revalidating in the background.
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
  },
});
```

Use this only for **publicly cacheable responses** (no user-specific data).
The CDN caches the response; subsequent requests from any user are served
from the CDN edge without invoking your handler. Appropriate for: product
catalogues, public content APIs, static data endpoints.

Do NOT use `Cache-Control: public` for responses that include session-specific
or user-specific data — every user would receive the same cached response.

---

## Part B — Edge Runtime

### What `export const runtime = 'edge'` does

Adding this export to a Route Handler file tells the Next.js bundler to:
1. Build the handler for the Edge runtime target (smaller bundle, no Node APIs).
2. Deploy the handler to edge nodes (CDN PoPs) rather than a centralised server.
3. Restrict the available API surface to Web Platform APIs only.

The `runtime = 'edge'` export is the only per-route segment config export
allowed under `cacheComponents: true` — it selects the runtime environment,
it is not a dynamic-control directive (unlike `dynamic`, `dynamicParams`,
`revalidate`, or `fetchCache`, which are all forbidden under cacheComponents).

### Node APIs unavailable at Edge

These are the two most common surprises when migrating a handler to Edge:

**1. `Buffer` (Node.js class)**

```ts
// Node runtime — works
const hex = Buffer.from(bytes).toString('hex');

// Edge runtime — FAILS: ReferenceError: Buffer is not defined
const hex = Buffer.from(bytes).toString('hex');

// Edge runtime — correct alternative (Web APIs)
const hex = Array.from(new Uint8Array(bytes))
  .map(b => b.toString(16).padStart(2, '0')).join('');
```

**2. Node `crypto` module**

```ts
// Node runtime — works
import { createHmac, randomBytes } from 'crypto';
const sig = createHmac('sha256', secret).update(data).digest('hex');

// Edge runtime — FAILS: Cannot find module 'crypto'
// (Node's built-in module system is absent)

// Edge runtime — correct alternative (Web Crypto SubtleCrypto)
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
```

Other unavailable Node APIs: `fs`, `path`, `os`, `child_process`, `net`,
`tls`, `zlib`, `http`, `https`, `stream` (Node streams — Web streams are fine),
`require()`, `__dirname`, `__filename`.

### Cold start and latency tradeoffs

| Metric | Edge runtime | Node.js serverless (Lambda/Vercel) |
|--------|-------------|-----------------------------------|
| Cold start | <1ms (warm isolate) | 100–500ms (Node boot) |
| Deployment region | Global CDN PoPs | One or few regions |
| API surface | Web APIs only | Full Node.js |
| Bundle size limit | 4MB (Vercel free), 250MB (pro) | Typically 50MB+ |
| Execution timeout | ~30s | Minutes (Lambda config) |
| Cost at scale | Per-invocation at every PoP | Per-invocation, centralised |

**When Edge is the right choice:**
- Auth-gate checks: the low latency and global distribution mean users near
  CDN edge nodes get a <1ms redirect instead of a 100ms round-trip to a US
  server. This matters for auth endpoints and middleware.
- Geolocation-aware routing: the geo headers are already injected by the same
  CDN node — no round-trip to a central server needed.
- Feature flag evaluation: simple JSON response based on request headers.

**When Node is the right choice:**
- Any route that needs `fs`, `Buffer`, `child_process`, or a Node-dependent
  npm package (most packages that use native addons, `sharp`, `pdf-lib`, etc.).
- CPU-intensive work (ML inference, video transcoding) where a Lambda timeout
  is more appropriate than a 30s Edge limit.
- Routes that are not latency-sensitive and do not need global distribution.

---

## Part C — proxy.ts

### proxy.ts vs. middleware.ts: naming history

| Next.js version | Canonical filename | Legacy alias |
|----------------|-------------------|-------------|
| 12–14 | `middleware.ts` | — |
| 15+ | `proxy.ts` | `middleware.ts` (still accepted) |

The rename happened because the word "middleware" was misleading — it implies
per-request function composition in the handler chain (as in Express), whereas
this file runs as a pre-routing HTTP proxy layer at the edge of the framework.
The name `proxy.ts` better reflects the responsibility: inspect/rewrite/redirect
requests before they reach a route.

In practice: `middleware.ts` still works in v16. Use `proxy.ts` for new projects.
The framework will not remove the alias without a deprecation cycle.

### The auth-gate pattern: why presence-only in middleware

```
proxy.ts (cheap, runs on every matched request):
  req.cookies.get("nextmart_session")   → present?
    No  → redirect to /c01-auth         (100% of unauthenticated users caught here)
    Yes → pass through to page          (cookie has bytes; may be tampered/expired)

page.tsx / route handler (authoritative, runs only for matched route):
  getSession()  →  jwtVerify(token, key, { algorithms: ["HS256"] })
    null        → token absent, tampered, or expired → redirect to /c01-auth
    Session     → authenticated and valid → render content
```

**Why not call `jwtVerify` in the middleware?**

1. **Cost:** The `config.matcher` can match a broad set of paths. Running
   HMAC-SHA256 on every static image request wastes CPU.

2. **API mismatch:** `getSession()` calls `cookies()` from `next/headers`,
   which is NOT available in middleware (middleware uses `req.cookies`, the
   request object's cookie map). You cannot call `getSession()` directly in
   middleware.

3. **Edge compatibility:** If `proxy.ts` is ever moved to the Edge runtime,
   the Node `crypto` module (used internally by `jose`) would not be available.
   The presence check uses only `req.cookies.get()` — 100% Edge-compatible.

4. **Defence in depth:** Two lightweight layers that each do one thing well
   are more maintainable than one heavy layer doing everything. The middleware
   is a pre-filter; the page is the authority.

### The A/B rewrite pattern

`NextResponse.rewrite()` is a server-side URL substitution:

```
Browser URL: /c13-route-handlers/ab-test         (unchanged — what the user sees)
Server renders: /c13-route-handlers/ab-test/a    (internal — what Next.js routes to)
```

This is distinct from a redirect (`NextResponse.redirect()`):

```
Redirect:
  Browser → GET /c13-route-handlers/ab-test
  Server  ← 307 /c13-route-handlers/ab-test/a
  Browser → GET /c13-route-handlers/ab-test/a   (second request, URL changes)
  Server  ← 200 HTML (variant A)

Rewrite:
  Browser → GET /c13-route-handlers/ab-test
  Server  ← 200 HTML (variant A page rendered internally)   (single request, URL unchanged)
```

**Use redirects when** you want the URL bar to update (e.g. canonical redirect,
login redirect, locale redirect).

**Use rewrites when** you want to serve different content without changing the
URL (A/B testing, feature flags, transparent migration from one route to another).

### Sticky A/B assignment: why it matters

Without a sticky cookie, `Math.random()` re-randomises the variant on every
request. A user would see variant A on one page load and variant B on the next.
This produces:
- A confusing user experience (UI elements randomly appear/disappear).
- Invalid A/B test results (the same user contributes to both variants, making
  the conversion rate comparison meaningless).

The sticky cookie (`ab-variant=a|b`, 30-day maxAge) ensures the same user
always sees the same variant within a testing window. In production, combine
this with a server-side record (e.g. a database column on the user record) so
the assignment persists across devices and cookie clears for logged-in users.
