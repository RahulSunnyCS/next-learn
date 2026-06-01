# Challenge Spec — Testing Next.js: RSC, Server Actions, Route Handlers, and E2E

> **File:** `app/(challenges)/c21-testing/_meta/spec.md`

---

## Learning Goal

This challenge teaches you the correct testing pyramid for a Next.js 16 app
running React Server Components, Server Actions, and Route Handlers. You will
learn WHY you cannot unit-test RSC rendering in Vitest, WHAT you CAN extract
and test at the unit level, and HOW to cover the runtime-dependent rendering
with Playwright E2E tests.

By the end you will be able to:

- Extract pure logic from an RSC and test it in isolation with Vitest.
- Call a Server Action directly in a test and assert its return value and
  side effects (cache invalidation, data mutations).
- Construct a real `NextRequest` and call a Route Handler, asserting the HTTP
  contract (status, JSON shape, headers).
- Write a Playwright test that drives the real Next.js runtime and asserts
  what the user sees on screen — the only way to verify RSC rendering.

---

## The Testing Pyramid for Next.js

```
         ┌─────────────┐
         │   E2E (few) │   Playwright — real browser, real Next.js runtime
         │  Playwright │   Tests RSC rendering, streaming, full flows
         ├─────────────┤
         │ Integration │   Vitest — real Node, real data layer
         │  (medium)   │   Tests Route Handlers, Server Action contracts
         ├─────────────┤
         │  Unit (many)│   Vitest — pure functions, isolated logic
         │             │   Tests formatters, validators, data accessors
         └─────────────┘
```

### Why you cannot unit-test RSC rendering in Vitest

React Server Components execute in the **Next.js RSC runtime** — a specialised
Node.js environment that:

1. Understands async components (in plain React they return Promises, not
   valid elements).
2. Injects `next/cache` stubs (`cacheTag`, `cacheLife`) via the compiler.
3. Simulates Suspense streaming in the correct order (shell first, holes after).

Vitest runs in plain Node.js without this runtime. Attempting to
`@testing-library/react` render an RSC would:

- Fail because `await component()` returns a Promise, not a React element.
- Throw on any `next/cache` import (no stubs injected outside the compiler).
- Give no signal about streaming order or Suspense boundaries.

**The fix:** unit-test the extractable logic (pure functions, data accessors),
not the component render. Use Playwright E2E for render verification.

---

## Scenario

The Nextmart app already has three challenge solutions to use as test targets:

| Target | Challenge | What to test |
|--------|-----------|--------------|
| `product.ts` (RSC lib) | C03 Product PPR | `formatPrice`, `getProductShellData`, `getCachedCategoryProducts` |
| `actions.ts` (Server Action) | C11 Server Actions | `submitReview` — validation, happy path, error path |
| `search/route.ts` (Route Handler) | C13 Route Handlers | `GET` HTTP contract, `parseSearchOptions`, `searchProducts` |

These are **read-only** targets. Your tests call them but never modify them.

---

## Tasks

### Part 1 — RSC Logic Unit Tests

Read `app/(challenges)/c03-product-ppr/_lib/product.ts`. Identify the
extractable logic — functions that do not require the Next.js RSC renderer.
Write Vitest tests for:

- [ ] `formatPrice(cents, currency?)` — pure function, no mocking needed.
- [ ] `getProductShellData(slug)` — async data accessor. Mock `next/cache` so
  `cacheTag`/`cacheLife` are no-ops (they throw outside the Next.js compiler).
- [ ] `getCachedCategoryProducts(categoryId)` — async data accessor. Assert
  correct filtering and the required shape.

**Key insight:** you MUST mock `next/cache` before importing `product.ts`
because the `'use cache'` directive causes the module to call `cacheTag` /
`cacheLife` at invocation time, and those imports throw in plain Node.

### Part 2 — Server Action Tests

Read `app/(challenges)/c11-server-actions/_lib/actions.ts`. The `submitReview`
function is a `"use server"` action — in Vitest this is just an async function
you can call directly. Write tests for:

- [ ] **Validation failures** — missing productId, out-of-range rating, body
  too short, body too long, non-numeric rating. Each should return
  `{ success: false, errors: { field: "..." } }` without calling `addReview`.
- [ ] **Happy path** — a valid submission calls `addReview` with the correct
  payload and calls `revalidateTag` with the right cache tag.
- [ ] **Error path** — when `addReview` throws, the action returns
  `{ success: false, errors: { _form: "..." } }` without leaking the
  internal error message.

**Mocking decisions:**
- Mock `next/cache` for `revalidateTag` / `revalidatePath`.
- Partially mock `@/lib/data` to replace `addReview` with a spy (prevents
  in-memory store mutation between tests and allows error simulation).
- Do NOT mock the `tags` export — import the real tags helper so the expected
  cache tag string is derived identically to how the action derives it.

### Part 3 — Route Handler Tests

Read `app/(challenges)/c13-route-handlers/search/route.ts` and
`app/(challenges)/c13-route-handlers/_lib/search.ts`. Write tests for:

- [ ] **HTTP contract (Approach A):** Construct a real `NextRequest`, call
  `GET(req)`, assert status codes (200 / 400) and JSON body shape.
- [ ] **Validation logic (Approach B):** Call `parseSearchOptions(params)`
  directly and enumerate edge cases more cheaply than constructing full
  Request objects.
- [ ] **Data access (Approach B):** Call `searchProducts(opts)` directly and
  assert the `SearchResponse` shape and field filtering.

**No mocking required** — both `_lib/search.ts` and `@/lib/data` are pure
Node modules with no Next.js runtime dependency. `NextRequest` / `NextResponse`
are Web API wrappers that work in Node 18+.

### Part 4 — Playwright E2E

Write a Playwright test covering the "catalog → product detail" key flow:

- [ ] Navigate to `/challenges/c02-catalog-ssg-isr` — assert a heading and
  at least one product link are visible.
- [ ] Navigate to `/challenges/c03-product-ppr/<known-slug>` — assert the
  static shell (product name) is visible immediately, and that at least one
  Suspense hole (Reviews section) streams in.
- [ ] Tag tests `@critical` for the core happy path and `@functional` for
  secondary assertions. Do not over-tag — @critical means the test failing
  should block a release.

---

## Acceptance Criteria

1. `npm test` passes with all three test files (rsc.test.tsx, server-action.test.ts,
   route-handler.test.ts) green.
2. `npx tsc --noEmit` exits 0 for all challenge-scoped files.
3. `formatPrice`, `getProductShellData`, and `getCachedCategoryProducts` are
   covered by unit tests that mock `next/cache` correctly.
4. `submitReview` is covered for validation (multiple field errors), happy path
   (addReview + revalidateTag called correctly), and error path (no error leak).
5. `GET` route handler is tested at the HTTP boundary: 200 with correct shape,
   400 for invalid limit variants, correct Content-Type header.
6. `parseSearchOptions` is tested for all edge cases: empty, whitespace, empty
   q, valid limit bounds, invalid limit variants.
7. `searchProducts` is tested for shape (no internal fields), filtering, and
   limit enforcement.
8. Playwright E2E tagged @critical and @functional covers catalog and product
   detail, and the C21 challenge page itself.
9. `solutions/c21-testing/testing-the-boundary.md` documents how each test
   category crosses (or avoids) the server/client boundary.

---

## Hints

<details>
<summary>Hint 1 — Why vi.mock must come before imports</summary>

Vitest (like Jest) hoists `vi.mock(...)` calls to the top of the module before
any imports are evaluated. This ensures the mock is in place when the mocked
module is first required. If you put `vi.mock` after an import, it has already
run without the mock. Always call `vi.mock` before importing the module under
test.

</details>

<details>
<summary>Hint 2 — How to construct a NextRequest for a Route Handler test</summary>

`NextRequest` extends the Web Platform `Request`. The constructor takes an
absolute URL string. Use:

```ts
const req = new NextRequest("http://localhost:3000/api/search?q=laptop");
const res = await GET(req);
const body = await res.json();
```

The URL must be absolute (not relative) because `new URL(relativeUrl)` would
throw. `next/server` re-exports both `NextRequest` and `NextResponse` and they
work in plain Node.js 18+.

</details>

<details>
<summary>Hint 3 — Mocking only part of a module (addReview spy)</summary>

Use `vi.mock("@/lib/data", async (importOriginal) => { const original = await importOriginal(); return { ...original, addReview: vi.fn() }; })`. The
`importOriginal` callback gives you the real module so you can spread it and
replace only `addReview`. This way the real `tags` helper, type exports, and
other functions remain unchanged.

</details>

<details>
<summary>Hint 4 — Why E2E tests need a running Next.js server</summary>

Playwright tests make real HTTP requests to the Next.js dev (or production)
server. The server must be running before Playwright starts. `playwright.config.ts`
sets a `webServer` config that starts `npm run dev` automatically before the
tests run. In CI, the server is started fresh for every test run; locally,
`reuseExistingServer: true` reuses a running dev server to avoid startup cost.

</details>
