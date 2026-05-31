# Verification Checklist — Route Handlers, Edge Runtime, and proxy.ts

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly. Run each item in order. Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Part A — Search Route Handler

- [ ] **A1 — Basic search** — Navigate to or `curl`:
  ```
  GET /c13-route-handlers/search?q=headphones
  ```
  Response is HTTP 200 with `Content-Type: application/json`.
  Body contains `{ results: [...], total: <number>, query: "headphones" }`.
  `results` is an array; each item has `id`, `slug`, `name`, `priceCents`, `rating`, `image`.

- [ ] **A2 — Empty query** — `GET /c13-route-handlers/search` (no `q` param).
  Returns HTTP 200 with all products (up to default limit of 10).

- [ ] **A3 — Invalid limit** — `GET /c13-route-handlers/search?limit=999`.
  Returns HTTP 400 with `{ error: "Invalid 'limit' parameter: ..." }`.

- [ ] **A4 — Valid limit** — `GET /c13-route-handlers/search?q=shoe&limit=3`.
  Returns at most 3 results.

- [ ] **A5 — No caching header** — Inspect the response headers.
  There is no `Cache-Control` header in the search response (handler is not
  explicitly cached, consistent with v16 defaults).

- [ ] **A6 — Challenge index** — Navigate to `/`. The challenge
  "Route Handlers, Edge Runtime, and proxy.ts" appears with slug `c13-route-handlers`.

---

## Part B — Edge-runtime Route Handler

- [ ] **B1 — Response structure** — `GET /c13-route-handlers/edge-geo`.
  Returns HTTP 200 JSON with `runtime: "edge"`.

- [ ] **B2 — Demo token** — The `demoToken` field is a 32-character lowercase hex
  string (16 bytes × 2 hex chars). Verify with: `response.demoToken.match(/^[0-9a-f]{32}$/)`.

- [ ] **B3 — Source field** — `source` is one of `"vercel"`, `"cloudflare"`, or
  `"local"`. In local dev it should be `"local"` (no CDN headers present).

- [ ] **B4 — Geo fields null in dev** — In local development, `country`, `region`,
  `city`, `lat`, `lon` are all `null` (CDN does not inject headers locally).

- [ ] **B5 — Locale field** — `locale` is a non-null string reflecting your
  browser's `Accept-Language` header (e.g. `"en-US"` or `"fr"`), or `null`
  if the header is absent.

- [ ] **B6 — no-store cache header** — The response has `Cache-Control: no-store`
  (geo data is per-request, must not be cached).

---

## Part C — proxy.ts Middleware

### Auth gate

- [ ] **C1 — Unauthenticated redirect** — While logged out (verify via the session
  status on the c13 page), navigate to:
  ```
  /c13-route-handlers/account
  ```
  The browser is redirected to `/c01-auth?next=%2Fc13-route-handlers%2Faccount`
  (307 redirect). Observe in the Network tab: the first request returns 307,
  the second loads the c01-auth page.

- [ ] **C2 — Authenticated pass-through** — Log in via `/c01-auth`. Navigate to
  `/c13-route-handlers/account`. The middleware does NOT redirect (the 307
  does not appear in the Network tab). The page renders (it may return 404 if
  no page exists there — that is fine; the important thing is the middleware
  did not redirect).

- [ ] **C3 — Tampered cookie** — (Advanced) After logging in, copy the session
  cookie value from DevTools. Edit it to `aaa.bbb.ccc` (invalid JWT). Navigate
  to `/c13-route-handlers/account`. The middleware PASSES the request (cookie
  bytes are present). The application page must call `getSession()` and handle
  the null result authoritatively.

### Locale redirect

- [ ] **C4 — Default locale pass-through** — Navigate to `/c13-route-handlers/locale-demo`.
  If your `Accept-Language` starts with `en`, the request passes through (no
  redirect). If it starts with `fr` or `de`, you should be redirected to the
  prefixed path.

### A/B rewrite

- [ ] **C5 — A/B variant cookie** — Navigate to `/c13-route-handlers/ab-test`.
  After the first visit, check `Application → Cookies → localhost`. An
  `ab-variant` cookie with value `a` or `b` is set with a 30-day expiry.

- [ ] **C6 — Sticky assignment** — Reload `/c13-route-handlers/ab-test` multiple
  times. The `ab-variant` cookie value does not change — same variant is served
  each time (sticky assignment).

---

## proxy.ts File Checks

- [ ] `proxy.ts` exists at the repo root: `ls proxy.ts` exits 0.
- [ ] `middleware.ts` does NOT exist at the repo root: `ls middleware.ts` exits non-zero.
- [ ] `proxy.ts` exports `config.matcher` (search the file for `config` export).
- [ ] `proxy.ts` does NOT import `jwtVerify` directly (the cryptographic check
  stays in `lib/auth`):
  ```bash
  grep -n "jwtVerify" proxy.ts
  ```
  Result must be empty.

---

## Build and TypeScript

- [ ] `npm run build` completes without errors.
- [ ] `npx tsc --noEmit` exits 0 (no TypeScript errors).
- [ ] No ESLint errors: `npm run lint` exits 0.

---

## Security: no secret in client bundle

- [ ] After `npm run build`, search `.next/static/chunks/` for `SESSION_SECRET`:
  ```bash
  grep -r "SESSION_SECRET" .next/static/
  ```
  Result must be empty — the secret must never reach the client bundle.
