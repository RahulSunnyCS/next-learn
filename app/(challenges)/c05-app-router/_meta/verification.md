# Verification Checklist — App Router Architecture

> **Purpose:** A human-runnable checklist to verify the challenge is implemented correctly.
> Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no type errors.
- [ ] `npm run build` exits 0 (no cacheComponents build errors).
- [ ] `npm run dev` starts with no console errors on first load of `/challenges/c05-app-router`.

---

## Route Group

- [ ] Visiting `/challenges/c05-app-router` returns HTTP 200 and renders the product listing.
      (The `(challenges)` group is invisible — there is no `/challenges/(challenges)/c05-app-router`.)

---

## Dynamic Segment [id]

- [ ] Visiting `/challenges/c05-app-router/products/p-elec-001` (hard-refresh) renders the
      **full product detail page** (not a modal), showing the product name and price.
- [ ] The page includes text confirming `params.id = "p-elec-001"`.

---

## Catch-All Segment [...slug]

- [ ] Visiting `/challenges/c05-app-router/products/electronics/keyboards` renders the
      catch-all page showing `params.slug = ["electronics", "keyboards"]`.
- [ ] Visiting `/challenges/c05-app-router/products/clothing/tops/merino` renders the
      catch-all page showing `params.slug = ["clothing", "tops", "merino"]`.
- [ ] Visiting `/challenges/c05-app-router/products/p-elec-001` does NOT render the catch-all
      page — it renders the `[id]` page instead (single-segment priority).

---

## loading.tsx

- [ ] In devtools (Network tab), throttle to Slow 3G.  Navigating to `/challenges/c05-app-router`
      shows the skeleton from `loading.tsx` before the page content streams in.

---

## error.tsx

- [ ] `error.tsx` begins with `"use client"` on the very first line.
- [ ] Visiting `/challenges/c05-app-router/products/trigger-error` (a product that throws)
      renders the error boundary UI with a "Try again" button.
- [ ] Clicking "Try again" calls `reset()` and re-renders the segment.

---

## not-found.tsx

- [ ] Visiting `/challenges/c05-app-router/products/this-does-not-exist` renders `not-found.tsx`
      (the orange 404 page), NOT `error.tsx`.
- [ ] The not-found page includes a link back to the catalog.

---

## Parallel Routes + default.tsx

- [ ] Visiting `/challenges/c05-app-router` renders the listing page WITHOUT a modal visible.
      (The `@modal` slot renders null via `default.tsx`.)
- [ ] Inspecting the page HTML shows no modal element — `default.tsx` returned null.

---

## Intercepting Routes — Modal-via-URL

- [ ] **Soft navigation (modal):** From the listing page, click a product card.
      - The URL updates to `/challenges/c05-app-router/products/[id]`.
      - A modal overlay appears in front of the listing (listing is still visible behind).
      - The modal shows the "Quick View" badge and product details.
      - Pressing Escape or clicking the backdrop closes the modal and returns to the listing.

- [ ] **Hard-refresh (full page):** With the modal open, reload the page.
      - The modal disappears.
      - The full product detail page renders (showing the "Full Page" badge).
      - The listing page is NOT visible in the background.

- [ ] **Deep link (full page):** Paste `/challenges/c05-app-router/products/p-elec-001`
      directly into the browser address bar (or a new tab).
      - The full product detail page renders — no modal.

---

## Cache Components Compliance

- [ ] No file under `c05-app-router/` contains `export const dynamic`.
- [ ] `_lib/catalog.ts` functions use `'use cache'`, `cacheTag()`, and `cacheLife()`.
- [ ] The build route table shows `◐` (Partial Prerender) for `/challenges/c05-app-router`.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c05`

- [ ] All tests pass (if a `_tests/` file exists for this challenge).
