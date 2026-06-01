# Challenge Spec — Deployment & Runtime Model: Where Does Your Code Actually Run?

> **File:** `app/(challenges)/c20-deployment/_meta/spec.md`

---

## Learning Goal

This challenge teaches you to reason about where Next.js code physically executes
at runtime — not just how to write it.  You will map each rendering strategy
(Static, PPR, Dynamic, Edge) to its corresponding infrastructure (CDN, serverless
function, edge node, Node.js server), understand the build-time output that
determines deployment shape, and learn the real tradeoffs between `output: 'export'`
(pure static), the default Node.js server, and `output: 'standalone'` (Docker).

By the end you will be able to answer: "Given this route, what runs at deploy time
and what runs at request time?  Which hosting tier does it belong on?  What breaks
if I try to export it statically?"

---

## Scenario

Nextmart is preparing to ship.  You are the infrastructure engineer reviewing
the deployment options with the team:

- Marketing wants to know if they can host the product catalog on Cloudflare Pages
  (pure static hosting, no servers).
- The platform team wants a Docker container for the main app.
- The ops lead wants to understand why the cart page cannot be in the static export.
- A new engineer asks why cacheComponents / PPR matters for CDN cost.

Walk through all four questions using the routes already in this repo as evidence.

---

## Scenario Context: Routes in This Repo

| Route | Challenge | Rendering strategy | Build symbol |
|---|---|---|---|
| `/c02-catalog-ssg-isr` | C02 | SSG (static shell) + ISR via `cacheLife` | `○ Static` |
| `/c02-catalog-ssg-isr/[slug]` | C02 | SSG with `generateStaticParams` + ISR | `○ Static` |
| `/c03-product-ppr/[slug]` | C03 | Partial Prerender (static shell + streamed holes) | `◐ Partial Prerender` |
| `/c13-route-handlers/...` | C13 | Route Handlers (GET/POST) | `ƒ Dynamic` |
| `/c01-auth` | C01 | PPR: static shell + dynamic session hole | `◐ Partial Prerender` |
| `/c11-server-actions` | C11 | Server Actions (mutations) | `ƒ Dynamic` |

---

## Tasks

### Part 1 — Read the Rendering → Infrastructure Map

- [ ] **T1.1 — Open `solutions/c20-deployment/runtime-map.md`.**  Study the table
  that maps each representative route to its rendering symbol, infrastructure tier,
  and what runs at build vs request time.

- [ ] **T1.2 — Open the build output** (or the `○ / ◐ / ƒ` symbols in the dev
  overlay).  Confirm the symbols match the table.  If you have run `next build`,
  look at the route output in the terminal.

- [ ] **T1.3 — Explain in your own words** why a `◐ Partial Prerender` route
  is served differently from a `○ Static` route at the CDN level.

### Part 2 — Understand output:'export' and What It Breaks

- [ ] **T2.1 — Open `solutions/c20-deployment/next.config.export.ts`.**  Read the
  inline comments.  Identify every feature listed as "NOT AVAILABLE under
  output:'export'" and explain WHY it requires a running server.

- [ ] **T2.2 — Map the routes above to export compatibility.**  Which routes in the
  Nextmart repo would survive an `output:'export'` build?  Which would fail and why?

- [ ] **T2.3 — Answer the marketing team's question:**  Can the `/c02-catalog-ssg-isr`
  product catalog be deployed to Cloudflare Pages with `output:'export'`?  What
  do you lose if you do?

### Part 3 — Docker and output:'standalone'

- [ ] **T3.1 — Open `solutions/c20-deployment/next.config.standalone.ts`** and the
  `Dockerfile`.  Trace the three build stages: install → build → final.

- [ ] **T3.2 — Explain** why the standalone output only copies the files it needs
  (no `node_modules/` in the image) and what `server.js` does.

- [ ] **T3.3 — Identify** which ISR behaviour changes when running the app in Docker
  via `output:'standalone'` vs deploying to a serverless platform like Vercel.
  (Hint: think about where the on-disk cache lives.)

### Part 4 — Serverless vs Edge vs Node Standalone Tradeoffs

- [ ] **T4.1 — Read `solutions/c20-deployment/NOTES.md`**, the section on
  cold starts.  Reproduce the latency comparison table from memory.

- [ ] **T4.2 — Explain** why `export const runtime = 'edge'` is incompatible with
  `cacheComponents: true` in Next.js 16 (v16 gotcha — see docs/cache-components-rules.md).

- [ ] **T4.3 — Decide:**  Nextmart receives traffic from users in Europe, South
  America, and Southeast Asia, with the database in us-east-1.  Which routes
  would benefit from Edge deployment and which would not?  Justify your answer.

### Part 5 — Turbopack as Default Bundler

- [ ] **T5.1 — Read** the Turbopack section of `solutions/c20-deployment/NOTES.md`.
  List three differences between Turbopack and Webpack that affect a production build.

---

## Acceptance Criteria

1. `next build` exits 0 with no type errors (the challenge page itself compiles cleanly).
2. Loading `/c20-deployment` shows the rendering → infrastructure table referencing
   actual routes from this repo (c02, c03, c13, c01, c11).
3. `solutions/c20-deployment/next.config.export.ts` documents at least six features
   that break under `output:'export'` with inline comments explaining WHY.
4. `solutions/c20-deployment/next.config.standalone.ts` explains the standalone
   output model with inline comments.
5. `solutions/c20-deployment/Dockerfile` is consistent with the standalone variant
   and documents build/run steps.
6. `solutions/c20-deployment/runtime-map.md` maps routes to infrastructure tiers
   and distinguishes build-time vs request-time work.
7. `solutions/c20-deployment/NOTES.md` covers serverless vs edge tradeoffs, cold
   starts, ISR at the infrastructure level, and Turbopack-as-default-bundler.
8. The canonical `next.config.ts` is NOT modified.

---

## Hints

<details>
<summary>Hint 1 — Why output:'export' cannot do ISR</summary>

ISR (Incremental Static Regeneration via `cacheLife`) requires a running server
process that can receive incoming requests, decide a cached entry is stale, run
the data accessor in the background, and write a new cache entry.

`output:'export'` produces a completely static directory of `.html` and `.json`
files.  There is no server process.  The CDN or static file host serves files
directly.  When a file is "stale" — there is no mechanism to regenerate it.
You would have to re-run `next build` and re-deploy.

This is why `output:'export'` is the right choice for a truly static site (a
marketing page that updates only on deploy) and the wrong choice for a product
catalog that needs hourly ISR.

</details>

<details>
<summary>Hint 2 — PPR and CDN caching</summary>

A `◐ Partial Prerender` route sends HTML in two parts:

1. The **static shell** — generated at build time and identical for every user.
   The CDN CAN cache this part.
2. The **dynamic stream** — generated per-request (per user, per session, per
   search query).  The CDN CANNOT cache this part.

A smart CDN (e.g. Vercel's) knows the difference: it caches the shell at the
edge and streams the dynamic parts from a serverless function.  The result is
that the Time-to-First-Byte for the shell is CDN-fast (single-digit ms) even
though the dynamic holes require a server round-trip.

</details>

<details>
<summary>Hint 3 — Cold starts and the Edge choice</summary>

A cold start happens when your serverless function has not been called recently
and the platform needs to spin up a new execution environment (download code,
start the Node.js process, execute module-level code).  For a Node.js serverless
function this can take 100–600ms on top of your function execution time.

Edge functions use V8 isolates — much lighter weight than a full Node.js process.
Cold starts on Edge are typically under 5ms.  However: Edge functions have
a restricted API surface (no `fs`, no native modules, limited `Buffer` support),
a smaller bundle size limit, and shorter execution timeouts.

Rule of thumb: Edge is the right choice when the function is simple (auth check,
redirect, feature flag evaluation) and latency near the user matters.  Node
serverless is the right choice when the function needs the full Node.js API
surface or runs CPU-intensive work.

</details>
