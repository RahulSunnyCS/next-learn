# Verification Checklist — Cart State: Persisted, Hydration-Safe, Reconciled on Login

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no type errors.
- [ ] Dev server starts with `npm run dev` (no console errors on first load of `/c15-cart-state`).

---

## Functional Checks

- [ ] **Product list loads** — Navigate to `/c15-cart-state`.
  A list of products appears after the Suspense fallback resolves.

- [ ] **Optimistic add** — Click &quot;Add to Cart&quot; on any product.
  The cart count badge in the page header updates immediately — no loading
  spinner, no network delay.

- [ ] **Multiple items** — Add three different products to the cart.
  The badge shows &quot;3&quot;.

- [ ] **Duplicate add** — Click &quot;Add to Cart&quot; on the same product twice.
  The badge still shows the same count (quantity increments, not duplicate items).

- [ ] **Persistence** — Reload the page. The cart badge still shows the correct
  count — items survived the reload via localStorage.

- [ ] **No hydration warning** — Open the browser DevTools Console.
  There is NO error containing &quot;Hydration failed&quot; or &quot;Text content did not
  match&quot; after adding items and reloading.

- [ ] **Remove item** — Remove one item from the cart widget.
  The badge decrements and localStorage is updated.

- [ ] **Clear cart** — Click &quot;Clear Cart&quot; in the cart widget.
  The badge returns to 0 and localStorage is cleared.

---

## Persistence Checks

- [ ] Open DevTools → Application → Local Storage → http://localhost:3000.
- [ ] After adding items, a key named `nextmart-cart` (or similar) is present.
- [ ] The value is valid JSON containing the cart items.
- [ ] After clearing the cart, the key is removed or contains `{items:[]}`.

---

## Hydration Safety Check (Critical)

1. Add 2 items to the cart.
2. Hard-reload the page (Ctrl+Shift+R / Cmd+Shift+R).
3. Open DevTools → Console.
4. - [ ] No &quot;Hydration failed&quot; error appears.
5. - [ ] No &quot;Text content did not match&quot; warning appears.
6. - [ ] The cart count badge initially renders as 0 (matching server), then
   updates to 2 after client hydration (a brief flash is acceptable and expected).

---

## Login Reconciliation Check

1. Add 2 items to the cart as a guest.
2. Click &quot;Log in as Alice&quot; on the page.
3. - [ ] The reconciliation Server Action fires.
4. - [ ] The cart retains the 2 guest items (no items dropped).
5. - [ ] If Alice has saved cart items on the server, those are merged in.

---

## TypeScript Check

- [ ] `npx tsc --noEmit` exits 0 — no type errors anywhere in the challenge
  directory or solutions directory.

---

## Registry Check

- [ ] Navigate to `/`.  The challenge
  &quot;Cart State — Persisted, Hydration-Safe, Reconciled on Login&quot; appears in
  the challenge index with slug `c15-cart-state`.

---

## Code Quality Checks

- [ ] `lib/auth` is imported but NEVER modified.
- [ ] `lib/data` is imported but NEVER modified.
- [ ] `package.json` is UNCHANGED (no new dependencies added).
- [ ] `app/layout.tsx` is UNCHANGED (CartProvider is NOT added to the root layout).
  The CartProvider wraps only the c15 challenge page, not the entire app.
