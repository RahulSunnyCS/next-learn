# Defend-It Worksheet — Testing Next.js: RSC, Server Actions, Route Handlers, and E2E

> **Instructions:** Fill in your answers BEFORE you look at the reference
> tests under `solutions/c21-testing/`.  Write in your own words — the goal
> is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Why can't you unit-test RSC rendering in Vitest?

*A colleague says: "Just import the RSC and render it with
`@testing-library/react` in Vitest — it's a React component, right?"
Explain exactly why this fails and what the correct alternative is at each
layer of the testing pyramid.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

React Server Components are async functions that run inside the **Next.js RSC
runtime** — a specialised Node.js layer that:

1. Handles async components. In plain React, an async function component
   returns a Promise, not a React element. `@testing-library/react` renders
   synchronously (with `act`) and cannot await a Promise-returning component
   correctly.

2. Injects `next/cache` stubs. The `'use cache'` directive is a compiler
   transform that calls `cacheTag` and `cacheLife` from `next/cache`. Those
   functions throw in plain Node.js — the Next.js compiler stubs them only
   inside its own render pipeline. Importing an RSC that uses `'use cache'`
   in Vitest will throw on the first `cacheTag` call unless you mock it.

3. Simulates Suspense streaming. The shell renders first; async holes resolve
   into the stream later. `@testing-library/react` renders Suspense
   synchronously in test mode — it does not replicate the server streaming
   behaviour.

**Correct alternatives per layer:**

- **Unit layer (Vitest):** Extract pure functions and data accessors from the
  RSC into separate modules. These have no rendering dependency and can be
  imported and tested in plain Node after mocking `next/cache`.

- **Integration layer (Vitest):** Call Route Handlers via `NextRequest` /
  `NextResponse`. These are Web API wrappers that work in Node.js 18+.

- **E2E layer (Playwright):** Drive a real browser against a running Next.js
  server. The RSC executes in the actual runtime and you assert what the user
  sees on screen.

</details>

---

### Q2 — The vi.mock hoisting rule

*You write:*

```ts
import { getProductShellData } from "@/app/.../product";
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
```

*The tests fail — `cacheTag` is not mocked and throws. Why? What is the
correct order?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Vitest (like Jest) **hoists** `vi.mock(...)` calls to the top of the file
**before any `import` statements are evaluated**. This hoisting is a
compile-time transform, not runtime behaviour. When you write the mock AFTER
the import, the transform still moves the mock to the top — BUT only if the
`vi.mock` call appears at the module's top level. However, if the import
itself triggers module initialisation (e.g. the module calls `cacheTag` when
it is first required), the module has already loaded and executed before the
mock is registered.

**The correct pattern:**

```ts
// 1. Declare the mock at the top of the file (vi.mock is hoisted anyway,
//    but explicit ordering makes the intent clear and avoids confusion).
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

// 2. Import the module AFTER the mock declaration.
//    When Node.js (via Vitest's module loader) resolves "next/cache" for the
//    first time, the mock is already registered and the stub is returned
//    instead of the real module.
import { getProductShellData } from "@/app/.../product";
```

The key insight: the mock is registered in Vitest's module registry. Any
subsequent `import` or `require` that resolves the same specifier gets the
stub. The first import wins — if the real module loads before the mock is
registered, the real module is cached and the mock never applies.

</details>

---

### Q3 — Server Action call contract

*You are testing `submitReview`. The function signature is:*

```ts
async function submitReview(
  prevState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState>
```

*Why does the test need to pass a `prevState` argument? What is `prevState`
used for in the actual app, and why can you safely pass
`{ success: false, errors: {} }` as its value?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`submitReview` is a **Server Action** wired to `useActionState` in the client
component. `useActionState` requires the action to accept the previous state
as its first argument — the hook passes the current form state back on every
invocation so the action can compare it or carry values forward (for example,
to decide whether to clear certain error messages on re-submission).

In tests we call the function directly (not via `useActionState`). The action
signature still requires `prevState` as the first positional argument, so we
must provide it. The value `{ success: false, errors: {} }` is the **initial
state** — the same value you pass to `useActionState` when setting up the hook.

The action is safe to call with this initial state because:

1. The action implementation ignores `prevState` on the first call (it only
   reads `formData` for the current submission's values).
2. Even if the action did read `prevState`, the initial state is a valid
   `ReviewActionState` — the test is not triggering any "previous error"
   logic, so using the empty initial state is a correct representation of a
   fresh submission.

</details>

---

### Q4 — Partial mock with importOriginal

*In the Server Action test you mock `@/lib/data` like this:*

```ts
vi.mock("@/lib/data", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data")>();
  return { ...original, addReview: vi.fn() };
});
```

*Why use `importOriginal` here instead of a simple `vi.mock("@/lib/data", () => ({ addReview: vi.fn() }))`?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`@/lib/data` exports many symbols: `addReview`, `getProduct`, `listProducts`,
`searchProducts`, the `tags` helper, and others. The Server Action test imports
`tags` from `@/lib/data` to derive the expected cache tag string in assertions:

```ts
import { tags } from "@/lib/data";
// ...
expect(mockRevalidateTag).toHaveBeenCalledWith(tags.reviews(productId), ...);
```

If we used a plain mock (`vi.mock("@/lib/data", () => ({ addReview: vi.fn() }))`),
every other export would be `undefined`. The `tags` import would be `undefined`,
making `tags.reviews(productId)` throw `TypeError: Cannot read properties of
undefined (reading 'reviews')`.

Using `importOriginal` loads the **real** module and spreads it into the mock
object (`...original`), then overrides only `addReview` with a spy. This gives
us:

- The real `tags` helper (correct tag derivation in assertions).
- The real `getProduct`, `listProducts`, etc. (other tests in the suite that
  use these directly are not broken by an accidental undefined).
- A controlled `addReview` spy (deterministic behaviour, no store mutation
  between tests).

The rule: use `importOriginal` whenever you need to replace a subset of a
module's exports while keeping the rest real.

</details>

---

### Q5 — Approach A vs Approach B for Route Handlers

*The route handler test uses two testing approaches: Approach A constructs a
real `NextRequest` and calls `GET(req)`; Approach B calls `parseSearchOptions`
and `searchProducts` directly. When is each approach appropriate, and what does
each approach test that the other cannot?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**Approach A — HTTP boundary tests:**

- Tests the **wiring** between HTTP input and HTTP output. The route handler
  parses query params from the URL, calls helpers, and serialises the result
  into a `NextResponse`. Approach A verifies that this wiring is correct: does
  a `?limit=abc` URL actually produce a 400 response, or did the handler forget
  to pass the error through?
- Tests the **HTTP contract** — status codes, Content-Type headers, and JSON
  shape — as a consumer of the API would experience it.
- Is the right place for "does this URL pattern produce status 200?" tests.
- Is awkward for exhaustive input enumeration — constructing a full
  `NextRequest` for 10 limit variants is verbose.

**Approach B — Logic layer tests:**

- Tests **pure logic** in isolation. `parseSearchOptions` is a pure function
  that maps `URLSearchParams` → `{ opts, error }`. Enumeration is cheap:
  one-liner `params("limit=abc")` vs `new NextRequest("http://localhost/search?limit=abc")`.
- Does NOT test the HTTP wiring — even if you verify that `parseSearchOptions`
  returns `{ error: "..." }` for `limit=abc`, a bug in the route handler that
  never calls `parseSearchOptions` would go undetected.
- Is the right place for exhaustive edge case tables (every limit boundary,
  every q-trimming case) where Approach A would be too verbose.

**Correct combined strategy (what the solution does):**

- Approach A: cover the key HTTP outcomes (one 200 shape test, two or three
  400 tests, header test). This gives confidence that the wiring is correct.
- Approach B: enumerate every edge case of the validation and data-access logic
  cheaply. This gives exhaustive coverage without the overhead of HTTP
  serialisation.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Why RSC rendering cannot be unit-tested | | |
| 2 | vi.mock hoisting rule | | |
| 3 | Server Action call contract (prevState) | | |
| 4 | Partial mock with importOriginal | | |
| 5 | Approach A vs Approach B for Route Handlers | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c21-testing/`.*
