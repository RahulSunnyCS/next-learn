# Verification Checklist — C03: Product Detail PPR + Streaming SSR

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly. Run each item in order. Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 (no TypeScript errors).
- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Build Output — Route Table

- [ ] In the `npm run build` output, the route
  `/c03-product-ppr/[slug]` is marked **◐** (Partial Prerender),
  NOT **ƒ** (Dynamic) and NOT **○** (Static).

  Expected build output line (approximately):
  ```
  ◐  /c03-product-ppr/[slug]   (Partial Prerender)
  ```

---

## Rendering — Static Shell

- [ ] Open `http://localhost:3000/c03-product-ppr/wireless-noise-cancelling-headphones`
  in a browser with DevTools open.
- [ ] In the **Network** tab, view the raw HTML of the first response (the
  document request, not XHR).
- [ ] The product **name** ("Wireless Noise-Cancelling Headphones") appears in
  the initial HTML source (not rendered by JavaScript after page load).
- [ ] The product **price** ("$249.99") appears in the initial HTML.
- [ ] The product **description** appears in the initial HTML.
- [ ] The three skeleton fallbacks for dynamic holes (LiveInventory,
  Recommendations, Reviews) appear in the initial HTML, not the resolved content.

---

## Rendering — Dynamic Holes Stream In

- [ ] After the page loads, the **LiveInventory** section transitions from its
  skeleton to showing the actual stock count.
- [ ] After the page loads, the **Recommendations** section transitions from its
  skeleton to showing 3 product cards.
- [ ] After the page loads, the **Reviews** section transitions from its skeleton
  to showing the review list (or "No reviews yet").
- [ ] Each hole resolves **independently** — you can observe one resolving before
  another in the Network waterfall.

---

## Streaming Latency (Manual Test)

- [ ] With throttling set to "Slow 3G" in DevTools, the product name/price
  appears before the dynamic sections have loaded — this confirms streaming.

---

## Error Demo Hole

- [ ] The "Error Demo" section on the page shows an error **fallback** UI
  (not a blank space, not a full-page crash).
- [ ] The browser's network tab shows the request completed with **HTTP 200**
  even though the error demo component threw an error — confirming the
  status-code-after-flush behaviour.
- [ ] The page's `error.tsx` did NOT catch the error (the rest of the page
  still renders normally around the error demo section).

---

## loading.tsx vs manual Suspense

- [ ] The file `app/(challenges)/c03-product-ppr/[slug]/loading.tsx` exists
  and renders a full-page skeleton.
- [ ] Open the page and simulate a slow network — you should see the
  `loading.tsx` skeleton briefly before the shell content, then the dynamic
  holes stream in as individual sections.
- [ ] The comment in `loading.tsx` explains the difference between route-level
  and manual Suspense.

---

## error.tsx

- [ ] The file `app/(challenges)/c03-product-ppr/[slug]/error.tsx` exists.
- [ ] It has `'use client'` at the top.
- [ ] It renders a recovery UI (not just a blank div).

---

## Cache Discipline

- [ ] The file `app/(challenges)/c03-product-ppr/_lib/product.ts` exists.
- [ ] The `getProductShellData` function has `'use cache'`, `cacheTag(...)`,
  and `cacheLife(...)` inside it.
- [ ] There is NO `export const dynamic` directive anywhere in the challenge
  files (forbidden under `cacheComponents: true`).

---

## TypeScript

- [ ] `npx tsc --noEmit` exits 0 after all edits.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c03`

- [ ] All tests pass.
