# Testing the Server/Client Boundary in Next.js 16

> **Purpose:** This document explains how each test category in C21 crosses
> (or deliberately avoids) the server/client boundary, and why the strategy
> is correct.

---

## The boundary

In a Next.js 16 app with `cacheComponents: true`, every request crosses a
pipeline boundary between:

```
 Browser (client)                      Node.js server (Next.js)
 ───────────────                       ────────────────────────
 React client components        │      RSC runtime
 useActionState / useFormStatus │      Server Actions ("use server")
 fetch / XHR                    │      Route Handlers (app/api/**/route.ts)
 Playwright driver              │      RSC render pipeline
```

The boundary is not a network request per se — it is a conceptual split
between code that runs in the browser and code that runs in Node.js on the
server. Tests must be placed on the correct side of this boundary.

---

## Category 1 — RSC Logic Unit Tests (`rsc.test.tsx`)

**Where the test runs:** Plain Node.js (Vitest). No browser, no Next.js
RSC runtime.

**What it tests:** Pure functions and data accessors extracted from the RSC
module (`product.ts`). These functions live on the server side but have no
dependency on the RSC renderer itself.

**How the boundary is handled:**

- The `'use cache'` directive in `product.ts` causes it to import
  `cacheTag` and `cacheLife` from `next/cache`. These functions are stubs
  injected by the Next.js compiler — they throw in plain Node.
- We mock `next/cache` before importing `product.ts`, replacing those stubs
  with Vitest `vi.fn()` no-ops. This makes the module importable in plain
  Node without the compiler.
- The `@/lib/data` layer (the in-memory store) works in plain Node —
  no mocking needed. The data layer has no Next.js runtime dependency.

**What this approach cannot test:**

- The RSC rendering itself (how the component tree is built and streamed).
- The `'use cache'` behaviour (whether data is actually cached and tagged in
  the real runtime).
- Suspense boundary behaviour (shell vs hole streaming order).

**Rule:** Never import an RSC and render it with `@testing-library/react` in
Vitest. The test environment is wrong for that purpose.

---

## Category 2 — Server Action Tests (`server-action.test.ts`)

**Where the test runs:** Plain Node.js (Vitest). No browser, no Next.js
runtime routing layer.

**What it tests:** The `submitReview` Server Action — its validation logic,
mutation side effect, cache invalidation, and error handling.

**How the boundary is handled:**

The `"use server"` directive is a **compiler transform** that:
1. Assigns a stable action ID to the function.
2. Sets up an encrypted POST endpoint that the browser calls.
3. Injects same-origin CSRF protection.

In plain Vitest, the directive string is simply stripped — the function
executes like any other async function. This means we CAN call it directly
without any routing or browser involvement.

**Boundary-crossing pattern:**

```ts
// We call the action directly — no browser, no POST request, no CSRF.
// The action executes as a regular async function.
const state = await submitReview(initialState, formData);
```

**What is NOT crossed in unit tests (by design):**

- The POST routing (framework territory — not testable in unit tests).
- The CSRF enforcement (requires a running server and a cross-origin request).
- The `revalidateTag` cache invalidation end-to-end (requires the Next.js
  cache runtime). We assert only that `revalidateTag` was called with the
  correct tag — the effect of that call on the cache is framework territory.

**Why partial mocking of `@/lib/data` is correct:**

`addReview` writes to the in-memory store. If multiple test suites run in the
same Vitest process (and they do — Vitest runs all tests in a single Node
process by default), a mutation in one test affects state seen by other tests.
Replacing `addReview` with a spy makes tests deterministic and isolated.

The `tags` helper is NOT mocked — it is a pure function that derives cache
tag strings. Using the real `tags` function in the assertion ensures that if
the action or the tags library changes the tag format, the test catches it.

---

## Category 3 — Route Handler Tests (`route-handler.test.ts`)

**Where the test runs:** Plain Node.js (Vitest). No browser. We construct
real `NextRequest` objects, which are Web API wrappers.

**What it tests:** The HTTP contract of the `GET` Route Handler at
`/challenges/c13-route-handlers/search`.

**How the boundary is handled:**

Route Handlers are functions that receive a `Request`-like object and return
a `Response`-like object. `NextRequest` and `NextResponse` from `next/server`
are Web API wrappers that work in Node.js 18+. There is no RSC renderer
involved — the handler is a pure function of its input.

**Boundary-crossing pattern (Approach A):**

```ts
// Construct a real NextRequest — this is a Web API object, not a Next.js
// runtime construct. It works in plain Node.
const req = new NextRequest("http://localhost:3000/.../search?q=laptop");

// Call the handler directly — no HTTP server needed.
// The handler is a regular async function.
const res = await GET(req);

// Assert the HTTP contract.
expect(res.status).toBe(200);
const body = await res.json();
```

**No mocking required** because:

- `@/app/(challenges)/c13-route-handlers/_lib/search.ts` — pure Node module,
  no Next.js runtime dependency.
- `@/lib/data` — in-memory store, pure Node module.
- `NextRequest` / `NextResponse` — Web API wrappers, work in Node 18+.

**What is NOT crossed (by design):**

- The HTTP server (no `node:http` server is started).
- Middleware (not invoked when calling a handler directly).
- Next.js routing (the handler is called directly, not via a URL dispatch).

The direct call to `GET(req)` is testing the handler in isolation — it is not
an integration test of the full request pipeline. For that, Playwright E2E is
the correct tool.

---

## Category 4 — Playwright E2E (`e2e/c21-key-flow.spec.ts`)

**Where the test runs:** Playwright drives a real Chromium browser. The
browser makes real HTTP requests to the Next.js dev server running on
`http://localhost:3000`.

**What it tests:** Full user flows across the server/client boundary — the
RSC renders on the server, the HTML is sent to the browser, client components
hydrate, and Suspense holes stream in.

**How the boundary is crossed:**

The boundary is crossed exactly as it is in production:

1. Playwright navigates to a URL (`page.goto("/challenges/c02-catalog-ssg-isr")`).
2. The Next.js server executes the RSC, streams the HTML shell, and then
   streams the dynamic holes.
3. Playwright waits for DOM elements to become visible (`expect(locator).toBeVisible()`).
4. The assertions verify what the user sees, not what the server returns.

**What this catches that unit tests cannot:**

- RSC throws (async errors during rendering).
- Suspense holes that never resolve (streaming hangs).
- Client-side hydration mismatches (React would log an error).
- Real cache behaviour (PPR static shell is actually served from cache,
  dynamic holes are fresh).
- Real `'use cache'` effects (tags are actually registered and invalidation
  works end-to-end).

**Tagging for the Automation Gate:**

- `@critical` — failure should block a release (core happy path).
- `@functional` — important but non-blocking (secondary assertions).
- `@non-blocker` — informational only (edge case, not release-critical).

---

## Summary table

| Category | Test runner | Boundary crossed | What is NOT covered |
|----------|------------|-----------------|---------------------|
| RSC logic unit tests | Vitest (plain Node) | None — pure function calls | RSC rendering, streaming, caching |
| Server Action tests | Vitest (plain Node) | Calls action as a function | POST routing, CSRF, cache runtime effects |
| Route Handler tests | Vitest (plain Node) | Constructs `NextRequest`, calls handler | HTTP server, middleware, routing pipeline |
| E2E tests | Playwright + Chromium | Full stack (browser → server → cache) | Unit logic edge cases (covered above) |

The four categories are **complementary**, not redundant. Each covers what
the others cannot. Together they form a complete test coverage strategy for
a production Next.js 16 app.
