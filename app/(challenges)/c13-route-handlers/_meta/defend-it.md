# Defend-It Worksheet — Route Handlers, Edge Runtime, and proxy.ts

> **Instructions:** Fill in your answers BEFORE opening the reference solution
> under `solutions/c13-route-handlers/`. Write in your own words.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Q1 — GET handler caching: v14 vs. v16

*In Next.js 14, under what conditions was a GET Route Handler cached in the Full
Route Cache? In Next.js 16 (with `cacheComponents: true`), what is the default
caching behaviour for GET handlers, and how do you opt into caching if you need it?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

In Next.js 14, a GET Route Handler was statically cached (placed in the Full
Route Cache at build time) when it used ONLY static APIs — no `request.url`,
no `cookies()`, no `headers()`, no `Date.now()`. The moment you read any
dynamic API the handler opted out automatically. This was a common footgun:
a handler that happened to look static was served stale from cache even after
the underlying data changed, and the developer had no obvious indication this
was happening.

In Next.js 16, the default changed: GET Route Handlers are NOT cached by
default. Every request invokes the handler function fresh, regardless of
whether the handler uses dynamic APIs or not. This aligns with developer
expectations (an API endpoint should serve live data unless you explicitly
say otherwise).

To opt into caching in v16:
- Wrap the data-reading function in `'use cache'` (preferred — shares the
  cache entry with Server Components that call the same function, and supports
  `cacheTag()` / `cacheLife()` for targeted invalidation).
- Set `Cache-Control` response headers for CDN/browser caching:
  `return new Response(JSON.stringify(data), { headers: { "Cache-Control": "public, s-maxage=60" } })`

</details>

---

## Q2 — Edge runtime: Node APIs that are unavailable

*Name at least two Node.js APIs that are NOT available in the Edge runtime.
For each, describe what a developer would use instead when running at Edge.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

1. **`fs` (file system module)** — Not available at Edge. There is no
   alternative for reading local files at Edge because Edge functions run in
   distributed isolates without a local filesystem. If you need file content at
   Edge, bundle it into the module at build time (as a string constant or
   inlined JSON) or fetch it from a CDN/KV store.

2. **`Buffer`** — Not available at Edge. The replacement is `Uint8Array` for
   raw bytes and `TextEncoder` / `TextDecoder` for string conversions. For hex
   encoding:
   ```ts
   const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
   ```

3. **Node `crypto` module** — Not available (as a CommonJS require). Use the Web
   Crypto API instead: `crypto.subtle` for HMAC/AES/RSA operations,
   `crypto.getRandomValues()` for random bytes. The Web Crypto API is
   asynchronous and uses `CryptoKey` objects rather than string algorithms.

4. **`require()` / CommonJS modules** — Edge only supports ESM. Any package
   that uses `require()` or `module.exports` internally cannot be used at Edge
   without a bundler shim.

</details>

---

## Q3 — proxy.ts auth-gate: two-layer defence

*The proxy.ts middleware checks only for cookie PRESENCE — it does not call
`jwtVerify`. Explain why this is the CORRECT pattern and not a security hole.
What does the second layer (the server-side page) add?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The middleware presence check is not a security hole because the middleware is
a first-pass gate, not the only gate. The full two-layer defence is:

**Layer 1 — Middleware (cheap):** Check if the `nextmart_session` cookie is
present. If absent → 100% definitely unauthenticated → redirect immediately to
login. This catches every unauthenticated request before any page code runs,
at minimal cost (no crypto). A tampered/expired cookie has bytes, so it passes
this check — but that is intentional.

**Layer 2 — Page (authoritative):** The server-side page (Server Component or
Route Handler) calls `getSession()` from `@/lib/auth`. `getSession()` runs
`jwtVerify()` which: (a) validates the HMAC-SHA256 signature — any modification
to the payload is detected; (b) checks the `exp` claim — expired tokens are
rejected; (c) enforces `algorithms: ["HS256"]` to prevent algorithm confusion
attacks. If `getSession()` returns null (tampered or expired token), the page
redirects to login.

Together: Layer 1 eliminates 100% of unauthenticated requests cheaply, and
Layer 2 cryptographically verifies the remaining requests that carry a cookie.
A tampered or expired cookie never reaches the protected content.

Running `jwtVerify` in the middleware on every request would be wasteful (it
fires on static assets too if the matcher is broad) and fragile (if the file
is moved to Edge, the Node `crypto` dependency would break).

</details>

---

## Q4 — proxy.ts vs. middleware.ts: naming history

*In Next.js 16, what is the canonical filename for the middleware entry point?
What was it called before? What happens if you use the old name in a v16 project?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

In Next.js 16, the canonical middleware entry-point file is **`proxy.ts`**
(or `proxy.js`). The file was renamed from `middleware.ts` in the v15/v16
transition. The old name `middleware.ts` is still accepted by Next.js 16 as
a backward-compatibility alias — it works, but `proxy.ts` is the documented
name and the one new projects should use.

Rationale for the rename: the file always ran on Node by default (not Edge), and
the word "middleware" was misleading because it implied Edge-style lightweight
processing. "proxy" better reflects the file's actual role: a pre-routing HTTP
proxy layer that can inspect, rewrite, and redirect requests before they reach
a route handler.

If you use the old `middleware.ts` name in a v16 project:
- The middleware still runs correctly (backward-compatible alias).
- Some tooling (IDEs, linters) may show a deprecation warning.
- A future major version might remove the alias — prefer `proxy.ts` for new
  projects.

</details>

---

## Q5 — A/B test rewrite: sticky assignment

*The A/B test rewrite in proxy.ts assigns a variant randomly and sets a cookie.
Why is the sticky cookie important? What would happen without it?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Without a sticky cookie, the middleware re-randomises the variant assignment
on every request (because `Math.random() < 0.5` runs fresh each time). The
user would see a different variant on every page load — the checkout flow
would randomly switch between variant A and variant B mid-session. This
makes A/B testing meaningless (you cannot measure conversion rate by variant
if users see both) and produces a jarring user experience.

The sticky cookie stores the assigned variant (`ab-variant=a` or `ab-variant=b`)
and the middleware reads it on subsequent requests to return the same rewrite
destination. The user is "locked in" to their variant for the cookie's lifetime
(30 days in our implementation), giving a stable testing window.

In production you would also want to persist the variant server-side (e.g. tied
to the user's account) so the assignment survives cookie clearing and works
across devices. The cookie is the first-pass fast path; a database lookup is
the authoritative source for logged-in users.

</details>

---

## Cache-flow diagram — GET handler caching in v16

```
GET /c13-route-handlers/search?q=headphones
         │
         ▼
  Next.js router (App Router)
         │
         ▼
  search/route.ts — GET handler
         │
         │  (No implicit caching in v16 — runs fresh on every request)
         │
         ▼
  parseSearchOptions(searchParams)
         │  ← validates: q, limit
         ▼
  searchProducts({ q: "headphones", limit: 10 })
         │
         ▼
  listProducts({ q, pageSize: 10 })    ← @/lib/data (in-memory, no 'use cache')
         │
         ▼
  JSON response { results, total, query }
         │
         ▼
  HTTP 200 to client
         │
         ▼
  Client receives fresh data on every request


  ── If you wrap searchProducts() in 'use cache' ─────────────────────────────

GET /c13-route-handlers/search?q=headphones (first request)
         │
         ▼
  search/route.ts GET handler
         │
         ▼
  searchProducts() — 'use cache' cache MISS
         │
         ▼
  listProducts() ← reads in-memory store
         │
         ▼
  Result stored in Next.js Data Cache keyed by function + args
         │
         ▼
  HTTP 200 { results, ... }

GET /c13-route-handlers/search?q=headphones (second request, within cacheLife window)
         │
         ▼
  searchProducts() — 'use cache' cache HIT
         │
         (listProducts() is NOT called — no latency)
         ▼
  HTTP 200 { results, ... }   ← served from cache

  Invalidation: revalidateTag("products") clears the cache entry.
```

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | GET caching v14 vs v16 | | |
| 2 | Edge: two Node APIs unavailable | | |
| 3 | proxy.ts two-layer defence | | |
| 4 | proxy.ts vs middleware.ts naming | | |
| 5 | A/B sticky assignment | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c13-route-handlers/`.*
