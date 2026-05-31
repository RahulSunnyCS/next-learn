# Verification Checklist — [TITLE]

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Functional Checks

- [ ] **[Check 1]** — e.g. "Loading `/challenges/cNN-slug` returns HTTP 200."
- [ ] **[Check 2]** — e.g. "The `Cache-Control` header contains `s-maxage=300`."
- [ ] **[Check 3]** — e.g. "Navigating back from product detail to catalog does not trigger a network request."

---

## Rendering Strategy

- [ ] Confirm the route is rendered with the expected strategy (static / PPR / SSR / client) by inspecting the `.next/` build output or the response headers.

---

## Edge Cases

- [ ] **[Edge case 1]** — describe what to test.
- [ ] **[Edge case 2]**

---

## Automated Tests

Run: `npm test -- --testPathPattern=cNN`

- [ ] All tests pass.
- [ ] The regression test added in this challenge (`_tests/cNN.test.ts`) also passes.
