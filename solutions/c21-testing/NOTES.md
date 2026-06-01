# C21 Testing — Implementation Notes

> Design decisions, gotchas, and rationale for the reference test suite.

---

## Why these three test targets?

The three targets were chosen to represent the three distinct server-side
primitive types in a Next.js 16 app:

| Target | Primitive | Challenge | Key teaching point |
|--------|-----------|-----------|-------------------|
| `product.ts` | RSC data accessor | C03 | You cannot render RSCs in Vitest; test the extracted logic instead |
| `actions.ts` | Server Action | C11 | Call the action directly as an async function; mock the data layer for isolation |
| `search/route.ts` | Route Handler | C13 | `NextRequest`/`NextResponse` work in Node 18+; no mocking needed for pure-Node helpers |

---

## Decision: `rsc.test.tsx` (not `.ts`)

The file extension is `.tsx` to allow JSX in comments and to signal that
the test is conceptually related to React components even though it never
renders any JSX. This also matches the convention used by
`@testing-library/react` test files and avoids a future extension rename if
a small JSX snippet is added for illustration.

---

## Decision: `vi.mock("next/cache")` with explicit factory

We use the explicit factory form rather than auto-mocking:

```ts
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
```

Auto-mocking (`vi.mock("next/cache")`) would work but produces opaque
stubs that are harder to understand when reading the test. The explicit
factory makes the mock surface visible and documents exactly which exports
are used by the module under test.

---

## Decision: partial mock for `@/lib/data` (addReview only)

The `@/lib/data` module exports many functions. Mocking it completely
(replacing every export with `vi.fn()`) would break any test assertion that
uses `tags.reviews(productId)` — that helper would be `undefined`.

Using `importOriginal` + spread keeps all real exports and replaces only
`addReview`:

```ts
vi.mock("@/lib/data", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data")>();
  return { ...original, addReview: vi.fn().mockResolvedValue({...}) };
});
```

This pattern has a performance cost (the real module is loaded once to be
spread) but the benefit — real `tags` helper, real type exports — outweighs
it. The in-memory store in `@/lib/data` initialises quickly (no I/O).

---

## Decision: no mock for `@/lib/data` in `route-handler.test.ts`

The route handler test does NOT mock `@/lib/data`. The in-memory data store
is seeded with fixture products (see `lib/data/fixtures.ts`) and is
deterministic on initial load. Running the search route against the real store
gives more realistic test results and avoids the cost of managing mock return
values for every query variant.

The risk of non-determinism: the store is shared across tests in the same
Vitest process. If another test in the suite mutates the store (e.g. adds or
deletes a product), results could shift. Mitigation: the route handler tests
only READ from the store — they never mutate it. The existing
`lib/data/_tests/repository.test.ts` file also only reads. Only the
server-action test mutates, and `addReview` is mocked there, so no
cross-contamination occurs.

---

## Decision: `_tests/` directory is NOT used for solution tests

Challenge-scoped tests typically live at `app/(challenges)/cNN-slug/_tests/`.
For C21, the test files live at `solutions/c21-testing/` instead, for two
reasons:

1. The tests are the DELIVERABLE of the challenge — they are the reference
   solution, not a test harness for verifying student work.
2. The `vitest.config.ts` include pattern is set up to include
   `solutions/c21-testing/*.test.ts{x}` specifically, alongside the
   `lib/**/_tests/` pattern. Keeping them in `solutions/` makes it clear
   they are part of the reference solution package.

---

## Decision: Playwright config uses `testDir: "./e2e"` (not `solutions/`)

The canonical Playwright test for the Automation Gate lives at `e2e/c21-key-flow.spec.ts`.
The `solutions/c21-testing/e2e/key-flow.spec.ts` is a reference copy that
re-exports from the canonical file — it exists so the solution package is
self-contained for reading, but it is not run by the Automation Gate (which
only scans `./e2e`).

This avoids double-running the E2E tests in CI (which would double the
dev server startup cost and produce confusing duplicate results).

---

## Decision: `revalidateTag` assertion uses `expect.anything()` as second arg

The test asserts:

```ts
expect(mockRevalidateTag).toHaveBeenCalledWith(
  tags.reviews(productId),
  expect.anything()
);
```

Next.js 16 changed the `revalidateTag` signature to accept a second argument
(a `cacheLife` profile string). The `expect.anything()` matcher accepts any
non-null value, which covers the new API without breaking if Next.js changes
the exact profile string. This is preferable to asserting a specific string
that is an implementation detail of the framework, not the action under test.

---

## Decision: Playwright tests are in `e2e/` not `__tests__/e2e/`

Playwright's `testDir` is set to `./e2e` in `playwright.config.ts`. Placing
specs anywhere else (e.g. `__tests__/e2e/`) requires updating `testDir` which
would affect all existing and future Playwright specs. The `./e2e` convention
is established for this project.

---

## Gotcha: `formatPrice` with EUR currency code

The `formatPrice` test for EUR asserts:

```ts
expect(result.includes("€") || result.includes("EUR")).toBe(true);
```

Rather than asserting `expect(result).toContain("€")` directly. The reason:
Node.js locale formatting output depends on the ICU data bundle the Node build
includes. A minimal Node build (common in Docker/CI) may not include the full
ICU dataset and could render `EUR` as the 3-letter code rather than the `€`
symbol. The `||` assertion accepts either representation.

---

## Gotcha: `Math.random()` in `lib/data` simulated latency

The `lib/data` layer uses `Math.random()` to simulate latency. This is
non-deterministic but not a problem in unit tests because:

- The simulated delay uses `setTimeout`, which is synchronous in Vitest's
  fake timer environment (Vitest does NOT use fake timers by default — it uses
  real timers but the delay values are small enough that tests complete in
  under 5 seconds).
- The actual timing does not affect assertion correctness — we assert the
  returned values, not the timing.

If test timeout issues appear, use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.

---

## Running the tests

```bash
# All tests (includes lib data tests + C21 solution tests)
npm test

# Only C21 solution tests
npm test -- solutions/c21-testing

# Only RSC tests
npm test -- rsc

# Only Server Action tests
npm test -- server-action

# Only Route Handler tests
npm test -- route-handler

# E2E tests (requires dev server or playwright webServer config)
npm run test:e2e
```

---

## TypeScript notes

- All three test files use strict TypeScript. Run `npx tsc --noEmit` to
  verify type correctness.
- The `ReviewActionState` type is imported from the actions module — if the
  action's type changes, the test file catches it at compile time.
- The `SearchResponse` type is imported from the search lib — same benefit.
- `vi.mocked(fn)` is used instead of `fn as vi.MockedFunction<typeof fn>`
  for cleaner syntax.
