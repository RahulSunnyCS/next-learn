# Verification Checklist — Optimistic UI: Instant Updates with Graceful Rollback

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Functional Checks

- [ ] **Page renders** — Navigate to `/challenges/c18-optimistic-ui`.
  The page loads with a product heading, a list of reviews, each showing a
  &ldquo;Helpful&rdquo; button with a count.

- [ ] **Optimistic update (happy path)** — Click &ldquo;Helpful&rdquo; on any
  review.  The count increments **instantly** before the server responds — you
  should see no loading spinner and no delay on the count itself.  After the
  server responds successfully, the count remains at the incremented value.

- [ ] **Slow-network test** — Open DevTools → Network → Throttle to
  &ldquo;Slow 3G&rdquo;.  Click &ldquo;Helpful&rdquo;.  The count increments immediately (the
  optimistic update), then after ~2–3 seconds the server confirms.  The final
  count matches the incremented value.

- [ ] **Forced failure / rollback** — Click &ldquo;Helpful&rdquo; on the same review
  three times (every 3rd click is forced to fail by the simulated error).
  On the third click:
  1. The count briefly shows the incremented value (optimistic flash).
  2. Then it **rolls back** to the pre-click value.
  3. An inline error message appears explaining the failure.
  4. No phantom +1 lingers after the rollback.

- [ ] **Error clears on next success** — After a rollback, click &ldquo;Helpful&rdquo;
  again (a non-failure click).  The error message disappears and the count
  increments normally.

- [ ] **Count reconciles with server** — After a successful click, open a new
  tab and navigate to the same page.  The helpful count shown matches the
  value that was optimistically applied (confirming the server persisted it).

---

## Code Checks

- [ ] Open `app/(challenges)/c18-optimistic-ui/_lib/actions.ts`.
  Confirm `"use server"` appears at the top of the file.
  Confirm every 3rd call triggers the simulated failure.
  Confirm `revalidateTag(tags.reviews(productId))` is called on success.
  Confirm `getSession()` is called server-side (not in a Client Component).

- [ ] Open `app/(challenges)/c18-optimistic-ui/_components/ReviewLikes.tsx`.
  Confirm it is a `"use client"` component.
  Confirm it calls `useOptimistic` for the helpful count per review.
  Confirm `startTransition` wraps the `addOptimistic` call and the action call.
  Confirm error state is stored in a separate `useState` (not inside
  `useOptimistic`).

- [ ] Open `app/(challenges)/c18-optimistic-ui/page.tsx`.
  Confirm the page is a static shell (no dynamic reads at the route top level).
  Confirm all dynamic data reads are inside a `<Suspense>` boundary.
  Confirm no `export const dynamic` or `export const revalidate` directives.

- [ ] Confirm the challenge appears in the registry at `/`.
  The challenge &ldquo;Optimistic UI: Instant Updates with Graceful Rollback&rdquo; appears
  under Tier 3 with slug `c18-optimistic-ui`.

---

## Cache / Build Checks

- [ ] Run `next build`.  The route `/challenges/c18-optimistic-ui` compiles
  without errors.
- [ ] After build, confirm the route table shows `◐ (Partial Prerender)` for
  `c18-optimistic-ui` — a static shell with a streamed dynamic hole.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c18`

- [ ] All tests pass (if tests are present in `_tests/`).
