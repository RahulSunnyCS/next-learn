# Verification Checklist — Server Actions: Forms That Work Without JavaScript

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Functional Checks

- [ ] **Page renders** — Navigate to `/challenges/c11-server-actions`.
  The page loads with a product heading, existing reviews list, and the review
  form below.

- [ ] **Valid submission** — Fill in a rating of 4 and a body of at least
  10 characters.  Submit.  The page updates and the new review appears at the
  top of the list without a full page reload (JS is enabled).

- [ ] **Validation — empty body** — Clear the body field, keep a valid rating,
  and submit.  An inline error message appears under the body field saying the
  review must not be empty.  No page reload occurs.

- [ ] **Validation — invalid rating** — Submit with a rating of 0 or 6.
  An inline error message appears under the rating field.

- [ ] **Pending state** — Slow the network in DevTools (Network → Throttle →
  Slow 3G).  Submit the form.  The submit button shows a spinner or
  &quot;Submitting...&quot; text and is disabled while the action is in flight.

- [ ] **Cache revalidation** — After a successful submission, open a new tab
  and navigate to the same page.  The new review is present without restarting
  the server.

---

## Progressive Enhancement Check

- [ ] **Disable JavaScript** — In Chrome DevTools → Settings (gear icon) →
  Preferences → Debugger → uncheck &quot;Disable JavaScript&quot;.  Alternatively use the
  Command Menu (⌘+Shift+P) and run &quot;Disable JavaScript&quot;.

- [ ] **Submit with JS disabled** — Fill in the review form and submit.
  The page performs a full reload (you will see the browser navigation bar
  refresh) and the new review appears on the reloaded page.

- [ ] **Validation still works** — Submit an empty body with JS disabled.
  The page reloads and shows the validation error message (returned from the
  action and rendered server-side).

- [ ] **Re-enable JavaScript** after this test.

---

## Code Checks

- [ ] Open `app/(challenges)/c11-server-actions/_lib/actions.ts`.
  Confirm `"use server"` appears at the top of the file.
  Confirm `revalidateTag` is called on success.
  Confirm input is validated server-side (rating range, body length).

- [ ] Open `app/(challenges)/c11-server-actions/_components/ReviewForm.tsx`.
  Confirm it is a `"use client"` component.
  Confirm it uses `useActionState` to wire the action and display state.

- [ ] Open `app/(challenges)/c11-server-actions/_components/SubmitButton.tsx`.
  Confirm it is a `"use client"` component.
  Confirm it calls `useFormStatus()` and reads the `pending` flag.
  Confirm the `<button>` is disabled when `pending` is true.

- [ ] Confirm the challenge appears in the index at `/`.
  The challenge &quot;Server Actions: Forms That Work Without JavaScript&quot; appears
  under Tier 2 with slug `c11-server-actions`.

---

## Cache / Build Checks

- [ ] Run `next build`.  The route `/challenges/c11-server-actions` compiles
  without errors.
- [ ] After build, confirm the route table shows `◐ (Partial Prerender)` or
  `ƒ (Dynamic)` for `c11-server-actions` — a full static `○` is unexpected
  given the dynamic reviews list.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c11`

- [ ] All tests pass (if tests are present in `_tests/`).
