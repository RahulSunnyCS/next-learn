# Solution Notes — C04 RSC vs. Client Boundary Refactor

## What This Solution Demonstrates

### 1. BEFORE vs. AFTER boundary placement

The BEFORE state (documented in comments in `page.tsx`) has `"use client"` at
the top of the page file.  This makes the entire component tree — including
purely static UI — part of the client JavaScript bundle.

The AFTER state (the actual `page.tsx`) has no `"use client"` at the top.
Only `InteractiveIsland.tsx` (a leaf component) carries the directive.  The
result: the page's client chunk is tiny (~1–3 KB) instead of including every
imported component.

**Why this matters:** Every kilobyte of JavaScript the browser downloads must
also be parsed and compiled by the JS engine.  On a mid-range mobile device,
parsing 100 KB of JS can take 200–500 ms — long enough to delay Time-to-
Interactive.  RSC allows you to send rich UI as HTML + lightweight payload
instead of executable JS.

---

### 2. Serializable props contract

The `SerializableRow` table on the page illustrates the constraint: only JSON-
serializable values may cross the server→client boundary.  The React error
message is descriptive:

```
Error: Only plain objects can be passed to Client Components from Server
Components. Date objects are not supported.
```

The fix is always to convert at the boundary: `Date → .toISOString()`,
`Map → Array.from()`, functions → Server Actions or data-only props.

---

### 3. RSC-as-children composition

`CompositionWrapper` (simulated on the page as a plain server wrapper in this
demo — would be `"use client"` in a real split file) receives `ServerInfoPanel`
as `children`.  The key rule:

- A Client Component may NOT import a Server Component (build error).
- A Client Component MAY receive a Server Component as `children` from an RSC
  parent.

React resolves the RSC tree on the server first.  By the time the client runs,
`children` is already a resolved React element node — no server code, no
server imports.

---

### 4. SellerLiveMetrics — deliberate CSR

This widget uses `useEffect` + `setInterval` to poll a simulated metrics
endpoint every 3 seconds.  It is `"use client"` for four reasons:

1. `setInterval` is a browser API — cannot run on the server.
2. Live-updating numbers have no SEO value — Google does not index dashboards.
3. A server-rendered snapshot would be stale within 3 seconds — CSR is the
   only way to show truly live data.
4. The widget is behind seller authentication — no public URL to crawl.

**Observable:** disable JavaScript in DevTools and reload.  The widget's initial
"Connecting..." state (rendered by the client skeleton) is absent from the HTML.
Only the static shell HTML is present.

---

### 5. Account page — deliberate SSR

`account/page.tsx` is an async Server Component.  It calls `await getSession()`
inside a `<Suspense>` boundary.  The session data (user name, role, orders)
arrives in the initial HTML response — no JavaScript required.

**Why SSR here:**
- Session data is needed for the correct first-render state.
- The URL is shareable/bookmarkable — SSR ensures a crawler or a direct visit
  gets meaningful HTML.
- Data changes per request, not per second — SSR is not wasteful.

**Cache Components compliance:** `getSession()` reads cookies, which is a
dynamic per-request operation.  Under `cacheComponents: true`, this MUST be
inside a `<Suspense>` boundary.  The page is a static shell; `AccountPanel` is
the dynamic hole.

---

### 6. Server-side secret pattern

`_lib/server-secret.ts` demonstrates keeping `process.env` values server-side:

- A runtime guard (`typeof window !== "undefined"`) throws if the module is
  executed in a browser context.
- The module is only imported by RSC files (`page.tsx` in this challenge).
- The secret is never serialised into JSX props — only a redacted string
  (computed on the server) is passed to the rendered HTML.

**Limitation vs. `server-only` package:** the `server-only` package provides a
build-time error if the import is included in a client bundle.  Our runtime
guard only fires when the code executes — a silent misconfig could ship if no
test exercises the path.  In production: install and use `server-only`.

---

## File Structure Decisions

```
app/(challenges)/c04-rsc-boundary/
├── page.tsx                  ← RSC (no "use client")
├── account/
│   └── page.tsx              ← RSC with Suspense-wrapped dynamic hole
├── _components/
│   ├── InteractiveIsland.tsx ← "use client" (counter + toggle)
│   └── SellerLiveMetrics.tsx ← "use client" (polling widget)
├── _lib/
│   ├── server-secret.ts      ← server-only module (no "use client")
│   └── metrics.ts            ← server-only data helper
└── _meta/
    ├── spec.md
    ├── defend-it.md
    ├── verification.md
    ├── challenge.config.json
    └── challenge.config.ts
```

**Why `_components/` and `_lib/` prefixes?**
Next.js App Router treats folders prefixed with `_` as non-routable.  They sit
inside the routable `c04-rsc-boundary` directory but are never exposed as URL
segments.  The convention signals "private to this challenge".

**Why separate `account/page.tsx`?**
Keeping the account summary on a sub-page separates concerns:
- The main page demonstrates boundary placement and CSR.
- The account page demonstrates SSR + `<Suspense>` + auth in isolation.
- The challenge can be explored in stages.

---

## What Was Deliberately Left Out

- No API route was wired for the metrics endpoint.  `SellerLiveMetrics` simulates
  the fetch with client-side random numbers so the demo works without a
  running backend.  A real app would use `/api/seller/metrics`.
- No `server-only` package install.  The task contract forbids adding deps.
- No test files in `_tests/` — that is the test phase's responsibility.
