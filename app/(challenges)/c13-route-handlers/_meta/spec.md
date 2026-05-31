# Challenge Spec — Route Handlers, Edge Runtime, and proxy.ts

> **File:** `app/(challenges)/c13-route-handlers/_meta/spec.md`

---

## Learning Goals

This challenge teaches three distinct but interconnected topics:

1. **GET Route Handler caching in Next.js 16** — understand when handlers are
   cached, when they are not, and how to opt into caching explicitly.

2. **Edge runtime** — understand the Web-API-only surface, what Node built-ins
   are absent, and the cold-start / latency tradeoffs vs. the Node runtime.

3. **proxy.ts (middleware)** — understand how the new v16 entry-point file
   auth-gates protected paths, performs locale redirects, and implements A/B
   rewrites. Understand the correct cheap middleware auth pattern and why
   full JWT verification belongs server-side.

---

## Scenario

Nextmart needs three improvements:

1. A public product **search API** so third-party clients (a mobile app, a
   browser extension) can query the catalogue over HTTP.

2. A **geo-aware Edge endpoint** that reads visitor location from CDN-injected
   headers and returns locale/region information with sub-millisecond cold start.

3. A **middleware layer** (`proxy.ts`) that: (a) blocks unauthenticated requests
   to the account area and redirects to login; (b) redirects non-default-locale
   users to their locale prefix; (c) transparently A/B-tests a checkout variant.

---

## Acceptance Criteria

1. `next build` exits 0 with no type or lint errors.
2. `GET /c13-route-handlers/search?q=headphones` returns JSON with a `results`
   array and `total` count.
3. `GET /c13-route-handlers/search?limit=999` returns HTTP 400 with an `error`
   field in JSON.
4. `GET /c13-route-handlers/edge-geo` returns JSON including `runtime: "edge"`,
   a `demoToken` field (hex string), and platform geo fields (may be null in
   local dev).
5. `GET /c13-route-handlers/account` (no session cookie) returns a 307 redirect
   to `/c01-auth?next=/c13-route-handlers/account`.
6. `GET /c13-route-handlers/account` (with valid session cookie) passes through
   the middleware (is not redirected by the middleware).
7. The page at `/c13-route-handlers` renders the static shell immediately and
   streams the session status hole.
8. `proxy.ts` at the repo root is the sole middleware entry point (no
   `middleware.ts` exists — that is the legacy name).
9. `solutions/c13-route-handlers/NOTES.md` documents: the GET caching change in
   v16, at least two Node APIs unavailable at Edge, the proxy.ts auth-gate
   pattern, and the proxy.ts vs. middleware.ts naming history.

---

## Part A — Search Route Handler

### Starting Point

The search handler lives at `app/(challenges)/c13-route-handlers/search/route.ts`.
The data accessor lives at `app/(challenges)/c13-route-handlers/_lib/search.ts`.

### Tasks

- [ ] **A1** — Read `_lib/search.ts` and trace how `parseSearchOptions` validates
  inputs before they reach `listProducts()`.

- [ ] **A2** — Call the endpoint with valid and invalid `limit` values. Verify
  the 400 response includes an actionable error message.

- [ ] **A3** — Read the GET caching section in `solutions/c13-route-handlers/NOTES.md`.
  In your own words: why would an identical query served from the v14 Full Route
  Cache potentially return stale data, and how does v16 fix this by default?

- [ ] **A4** — (Optional extension) Wrap `searchProducts()` in a `'use cache'`
  function so identical queries are served from cache for 60 seconds, then
  verify the behaviour change.

---

## Part B — Edge-runtime Route Handler

### Starting Point

The Edge handler lives at `app/(challenges)/c13-route-handlers/edge-geo/route.ts`.

### Tasks

- [ ] **B1** — Inspect the `export const runtime = 'edge'` declaration and read
  the inline comment explaining why this is allowed under `cacheComponents: true`.

- [ ] **B2** — Call the endpoint and observe the `runtime`, `demoToken`, and
  `source` fields.

- [ ] **B3** — Read the "NOT available at Edge" list in the handler comments.
  Attempt to add `import { createHmac } from 'crypto'` and verify the build
  fails (or produces a warning about missing Node built-in).

- [ ] **B4** — Read the cold-start tradeoffs section in NOTES.md and answer:
  when would you choose Node runtime over Edge for a route handler?

---

## Part C — proxy.ts

### Starting Point

`proxy.ts` lives at the repo root. Read it top-to-bottom before attempting
the tasks.

### Tasks

- [ ] **C1** — While logged out (use the session status panel on the c13 page),
  navigate to `/c13-route-handlers/account`. Observe the redirect to `/c01-auth`.

- [ ] **C2** — Log in via `/c01-auth`. Navigate back to `/c13-route-handlers/account`.
  The middleware now passes the request through (cookie is present).

- [ ] **C3** — Open the `nextmart_session` cookie in DevTools and copy its value.
  Manually edit it to a garbage string (e.g. `aaa.bbb.ccc`). Navigate to
  `/c13-route-handlers/account`. The middleware PASSES the request (cookie has
  bytes). Now add a page at that path that calls `getSession()` — it should
  return null (tampered token), and the page should redirect to login.
  This is the two-layer defence: middleware (presence) + page (cryptographic).

- [ ] **C4** — Rename `proxy.ts` to `middleware.ts` and verify that Next.js 16
  still accepts it (backward compatibility). Then rename it back.

---

## Hints

<details>
<summary>Hint 1 — GET caching in v16 vs. v14</summary>

In v14, a GET Route Handler that used no dynamic APIs (no `cookies()`,
`headers()`, or `request.url`) was placed in the Full Route Cache at build time.
In v15/v16 this implicit caching was removed — the handler runs fresh on every
request by default. To cache in v16, either wrap the data read in a `'use cache'`
function or set `Cache-Control` response headers.

</details>

<details>
<summary>Hint 2 — Why not run jwtVerify in middleware?</summary>

`jwtVerify` from the `jose` library works at Edge (it uses SubtleCrypto). But
running it on EVERY matched request — including static asset requests — adds
meaningful per-request latency. The correct pattern is a two-layer defence:
1. Middleware checks cookie PRESENCE (O(1), no crypto).
2. The server-side page calls `getSession()` for the full cryptographic check.
This eliminates 100% of unauthenticated requests cheaply and catches tampered
cookies authoritatively without unnecessary cost.

</details>

<details>
<summary>Hint 3 — Buffer at Edge</summary>

`Buffer` is a Node.js class that is NOT available at Edge. To convert bytes to
hex at Edge use:
```ts
const bytes = new Uint8Array(16);
crypto.getRandomValues(bytes);
const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
```

</details>
