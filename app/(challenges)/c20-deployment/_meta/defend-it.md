# Defend-It Worksheet — Deployment & Runtime Model

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c20-deployment/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — output:'export' and Route Handlers

*`output: 'export'` produces a fully static directory.  Explain why Route Handlers
(`/api/...` files) cannot exist in a static export.  What does a developer who
needs both a static catalog AND a live API endpoint have to do instead?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

A Route Handler is a server-side function that runs on every request: it receives
the `Request` object, executes JavaScript, and returns a `Response`.  This requires
a live server process.

`output: 'export'` produces static `.html` files and a `/_next/static/` asset
directory.  There is no server process — the files are served by a CDN or static
file host (nginx, Apache, Cloudflare Pages, S3 + CloudFront) which hands the
browser bytes from disk.  The server-function code is never executed.

A developer who needs both should split the work:
1. Build the Next.js frontend with `output: 'export'` and host it on a static host.
2. Build the API separately — a standalone Node.js service, a separate Next.js
   deployment with `output: 'standalone'` (or the Vercel default), a Cloudflare
   Worker, or another serverless API platform.
3. Configure CORS on the API and call it from the static frontend's client
   components.

Alternatively: do NOT use `output: 'export'` — keep the default Next.js server
output and host it on a platform that supports Node.js (Vercel, Fly.io, Railway,
self-hosted Docker using `output: 'standalone'`).

</details>

---

### Q2 — Serverless vs Edge: choose the right runtime

*Nextmart has a `/api/checkout` Route Handler that runs Stripe's Node.js SDK.
Should this handler run on the Edge runtime or the Node.js serverless runtime?
Give two concrete reasons for your choice.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The Node.js serverless runtime is the correct choice.  Two concrete reasons:

**1. Stripe's SDK uses Node-only APIs.**  The `stripe` npm package internally uses
`node:crypto`, `node:https`, `node:buffer`, and `node:stream`.  These Node.js
built-in modules are NOT available in the Edge runtime (which only exposes Web
Platform APIs: `fetch`, `SubtleCrypto`, `TextEncoder`, `ReadableStream`).  Running
Stripe on Edge would throw `ReferenceError: Buffer is not defined` or
`Cannot find module 'crypto'` at runtime.

**2. Checkout is not latency-sensitive at the routing layer.**  Edge runtime is
valuable for ultra-low-latency routing decisions (auth checks, redirects, A/B
tests) that run on EVERY request and must be close to the user.  A checkout
handler is called infrequently and must talk to the Stripe API (us/eu datacenter)
regardless of where the Edge node is — so Edge geo-distribution provides little
benefit but adds the API-surface constraint.

Additionally: checkout handlers often need to read from a database (order creation)
and send transactional emails — both of which typically require Node-compatible
SDKs and execution time beyond the 30-second Edge timeout for retries and DB
round-trips.

</details>

---

### Q3 — ISR at the infrastructure level

*In Next.js 16 with `cacheComponents: true`, ISR is declared with `'use cache'` +
`cacheLife('hours')` on the data accessor — there is no `export const revalidate`.
Where does the actual cache storage live in each of these three deployment targets:
(a) Vercel, (b) self-hosted Docker with `output:'standalone'`, (c) a CDN-only
`output:'export'` build?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**(a) Vercel** — The Cache Components store is backed by Vercel's distributed KV
infrastructure (built on top of their edge network).  A revalidation triggered by
`revalidateTag()` propagates across all serverless function instances globally.
The CDN layer at Vercel's edge also caches static shells.  This is the "native"
deployment target for Next.js Cache Components.

**(b) Self-hosted Docker with `output:'standalone'`** — The cache is stored on the
**local filesystem of the container** (under `.next/cache/`).  This creates a
critical problem in a horizontally scaled deployment: each container instance has
its own private cache file.  If you have 5 replicas, a `revalidateTag()` call
invalidates the cache on ONE instance — the other 4 serve stale data until their
caches expire naturally.  Solutions: mount a shared network filesystem (NFS,
EFS), use an external cache provider (Redis via the experimental cache handler
option), or accept eventual consistency within the `cacheLife` window.

**(c) `output:'export'`** — There is NO runtime cache at all.  `'use cache'` and
`cacheLife()` declarations in the source code are dead code — they have no effect
because no server process runs to honour them.  The build-time data fetch is
baked into static HTML at `next build` time.  Data is "fresh" only when you
re-run `next build` and redeploy.

</details>

---

### Q4 — PPR: static shell vs dynamic stream at the CDN

*A `◐ Partial Prerender` product page has a static shell (product name, price,
image) and a dynamic hole (live inventory count, personalised recommendations).
Explain what the CDN does with each part and why this is better than a fully
`ƒ Dynamic` route.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The static shell of a `◐ Partial Prerender` route is generated once at build time
and is IDENTICAL for every visitor.  A CDN can cache it at every edge node globally
and serve it in single-digit milliseconds — no server round-trip required.  The
browser starts painting the page immediately.

The dynamic holes are placeholders in the HTML.  Each hole is replaced by a stream
chunk generated by a serverless/edge function on THAT specific request.  These
chunks are per-user (recommendations depend on the session), per-stock-level
(inventory is live), or per-moment (prices may change).  The CDN cannot and should
not cache them.

Compared to a fully `ƒ Dynamic` route:
- `ƒ Dynamic`: 100% of the HTML is generated per-request.  The CDN sees a 200
  response with a `Cache-Control: no-store` or equivalent header — nothing is
  cached.  Every user pays the full server round-trip latency.
- `◐ PPR`: The shell HTML arrives in the first TCP roundtrip from a CDN edge node.
  Time-to-First-Byte is CDN-fast.  The dynamic holes stream in asynchronously
  while the browser already parses and renders the shell.

The practical difference for a product page: the user sees the product name, price,
and image almost instantly (from CDN) and watches the stock count and recommendations
stream in a fraction of a second later, rather than staring at a blank page for the
full server round-trip.

</details>

---

### Q5 — Turbopack as the default bundler in v16

*Next.js 16 uses Turbopack as the default bundler.  Name two developer-experience
improvements Turbopack provides over Webpack, and one case where Webpack is still
required.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**Two DX improvements:**

1. **Incremental compilation:** Turbopack only rebuilds the module graph subgraph
   that was actually changed by an edit.  Large Webpack projects can take 5–20
   seconds for a Hot Module Replacement update; Turbopack typically achieves
   sub-second HMR on the same codebase by doing the minimum necessary work.

2. **Lazy bundling:** In development, Turbopack only bundles the routes and modules
   that have been requested so far.  A large app with 200 routes does not pay the
   full compile cost upfront — only the pages actually visited in the dev server
   are compiled.  Webpack compiles the full dependency graph eagerly.

**One case where Webpack is still required (or used by default):**

`next build` (production builds) still uses Webpack in Next.js 16 by default for
production bundles — Turbopack production support was experimental through v15 and
became opt-in stable in v16, but some projects with custom `webpack()` config in
`next.config.ts` may not be compatible with Turbopack's production mode.  If your
`next.config.ts` has a `webpack:` callback that applies custom plugins or loaders,
those plugins must be ported to Turbopack's `turbo.rules` config before you can
opt in to Turbopack for production builds.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | output:export and Route Handlers | | |
| 2 | Serverless vs Edge runtime choice | | |
| 3 | ISR cache location per deployment target | | |
| 4 | PPR static shell vs dynamic stream at CDN | | |
| 5 | Turbopack DX improvements | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c20-deployment/`.*
