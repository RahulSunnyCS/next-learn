# Verification Checklist — Testing Next.js: RSC, Server Actions, Route Handlers, and E2E

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm test` exits 0 with all test files passing.
- [ ] `npx tsc --noEmit` exits 0 with no type errors.
- [ ] Dev server starts with `npm run dev` (no console errors related to c21).

---

## Test File Checks

### RSC Logic Tests (`solutions/c21-testing/rsc.test.tsx`)

Run: `npm test -- rsc`

- [ ] `formatPrice` suite — all four test cases pass.
- [ ] `getProductShellData` suite — returns a product for a known slug, null
  for an unknown slug, and calls `cacheTag`/`cacheLife` (mock is verified).
- [ ] `getCachedCategoryProducts` suite — returns products for a valid
  categoryId, empty array for an unknown categoryId, and correct shape.

**Manual checks:**

- [ ] Open `solutions/c21-testing/rsc.test.tsx`. Confirm that `vi.mock("next/cache", ...)`
  appears BEFORE any import of `@/app/(challenges)/c03-product-ppr/_lib/product`.
- [ ] Confirm that the test file does NOT attempt to render the RSC component
  itself — it only imports and calls the helper functions.

---

### Server Action Tests (`solutions/c21-testing/server-action.test.ts`)

Run: `npm test -- server-action`

- [ ] Validation suite — at least 7 test cases pass covering: missing
  productId, rating 0, rating 6, non-numeric rating, body too short, body too
  long, multiple field errors together, submittedValues populated on failure.
- [ ] Happy path suite — returns `{ success: true }`, calls `addReview` with
  correct payload (productId, rating as number, trimmed body), calls
  `revalidateTag` with the tags.reviews(productId) tag.
- [ ] Error path suite — `addReview` throws → `_form` error returned, error
  message does not leak the internal exception text, `revalidateTag` not called.

**Manual checks:**

- [ ] Open the test file. Confirm `addReview` is mocked (spy) and `tags` is
  NOT mocked (imported from the real `@/lib/data`).
- [ ] Confirm the test calls `submitReview(initialState, formData)` — the
  `prevState` argument is present and is the initial state.

---

### Route Handler Tests (`solutions/c21-testing/route-handler.test.ts`)

Run: `npm test -- route-handler`

- [ ] HTTP contract (Approach A) — status 200 with correct JSON shape (results,
  total, query), sellerId is NOT in the response, `?q=merino` returns matching
  results, `?limit=3` returns at most 3, `?q=nomatch` returns empty array with
  total 0, invalid limit variants return 400, Content-Type is application/json.
- [ ] `parseSearchOptions` (Approach B) — default limit 10, valid q, trimmed q,
  empty q → undefined, limit=1, limit=50, limit=0 error, limit=51 error,
  float limit error, NaN limit error, absent limit uses default.
- [ ] `searchProducts` (Approach B) — correct shape, filtering by q, limit
  enforcement, internal fields absent (description, sellerId, stock,
  categoryId).

**Manual checks:**

- [ ] Confirm NO mocks are declared in the file — both `@/lib/data` and the
  search lib module are used as-is (they are pure Node modules).
- [ ] Confirm the `makeRequest` helper builds an absolute URL
  (`http://localhost:3000/...`) — relative URLs would break `NextRequest`.

---

## Playwright E2E Checks

Run: `npm run test:e2e` (requires the dev server to be running, or
playwright.config.ts will start it automatically)

- [ ] `@critical` — catalog page renders and shows at least one product link.
- [ ] `@critical` — product detail page renders without error (product name
  visible in static shell).
- [ ] `@critical` — dynamic holes stream in (Reviews section appears).
- [ ] `@functional` — product detail page displays a price ($ visible).
- [ ] `@functional` — page title is non-empty.
- [ ] `@functional` — c21-testing challenge page itself renders (h1 or h2 visible).
- [ ] `@non-blocker` — unknown slug returns not-found without a stack trace.

---

## Content Checks

- [ ] `solutions/c21-testing/testing-the-boundary.md` exists and explains
  the server/client boundary for each test category (RSC unit, Server Action,
  Route Handler, E2E).
- [ ] `solutions/c21-testing/NOTES.md` exists with implementation notes and
  design decisions.
- [ ] `app/(challenges)/c21-testing/_meta/spec.md` contains non-empty
  acceptance criteria.
- [ ] `app/(challenges)/c21-testing/_meta/defend-it.md` contains 5 questions
  with model answers.
- [ ] `app/(challenges)/c21-testing/page.tsx` renders without error and the
  challenge appears in the challenge index at `/`.

---

## Challenge Discovery Check

- [ ] Navigate to `http://localhost:3000/`. The challenge
  "Testing Next.js: RSC, Server Actions, Route Handlers, and E2E" appears in
  the challenge index with slug `c21-testing`.
- [ ] Navigate to `http://localhost:3000/challenges/c21-testing`. The page
  loads without error and displays the testing pyramid explanation.

---

## Automated Tests (all three)

Run: `npm test`

- [ ] 104 or more tests pass (the three new test files each contribute
  tests; the existing lib data tests continue to pass).
- [ ] No test file fails.
- [ ] No TypeScript errors in any of the three solution test files.
