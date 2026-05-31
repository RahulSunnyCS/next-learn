# Challenge Spec — Cart State: Persisted, Hydration-Safe, Reconciled on Login

> **File:** `app/(challenges)/c15-cart-state/_meta/spec.md`

---

## Learning Goal

This challenge teaches cross-route client state management with the hard parts
production apps actually face. You will build a shopping cart that persists
across browser reloads (localStorage), works without hydration warnings (the
classic SSR/client mismatch), shows instant optimistic updates, and correctly
merges guest cart items with a logged-in user's server-side cart.

You will implement the same cart twice — once with React Context and once with
Zustand's `persist` middleware — then compare the two approaches.

---

## Scenario

Nextmart needs a cart that:
1. Works across routes (the cart badge updates on every page, not just /cart).
2. Survives a browser reload (localStorage persistence).
3. Does not flash "0 items" on first render when localStorage already has items
   (the SSR hydration mismatch problem).
4. Shows instant feedback when the user clicks "Add to cart" (optimistic update).
5. Merges the guest cart with the user's saved cart when they log in.

---

## Part A — Two Implementations

### Part A-1: React Context Version

**File: `_components/CartProvider.tsx`** (the starter scaffold)

The stub uses React Context + `useReducer`. Your job:

- [ ] **A1.1 — Persistence.** On mount (after hydration is safe), read the
  cart from `localStorage`. Use a `useEffect` to write to `localStorage`
  whenever the cart changes. **Do not read localStorage synchronously during
  render** — that triggers the hydration mismatch.

- [ ] **A1.2 — Hydration guard.** Add a `mounted` flag (initialised `false`,
  set to `true` in a `useEffect`). The cart UI should render a skeleton or
  nothing until `mounted` is `true`. This ensures the server HTML (empty cart)
  and first client render match before React patches the DOM.

- [ ] **A1.3 — Actions.** Implement `addItem`, `removeItem`, `updateQty`,
  `clearCart`, and `mergeCart` (the reconcile action).

- [ ] **A1.4 — Optimistic add.** `addItem` updates the in-memory state
  immediately — no awaiting a server round-trip.

### Part A-2: Zustand Version

**File: `_lib/cart-store.ts`** (the starter scaffold)

The stub uses `zustand` + `persist` middleware.

- [ ] **A2.1 — `skipHydration: true`.** Instruct the persist middleware NOT
  to auto-hydrate from localStorage on store creation. This is safe on the
  server (no localStorage), and prevents the mismatch.

- [ ] **A2.2 — `useHydrate` hook.** Call `useCartStore.persist.rehydrate()`
  inside a `useEffect` in a `ClientOnly` / hydration-gate component. This
  loads the persisted data only after the first client render, so server and
  initial client renders agree.

- [ ] **A2.3 — `onRehydrateStorage` callback.** Set `_hasHydrated = true` in
  the store when rehydration finishes. Any component that needs to know whether
  the cart is ready reads `_hasHydrated` from the store.

- [ ] **A2.4 — Zustand actions.** Same surface as A1: `addItem`, `removeItem`,
  `updateQty`, `clearCart`, `mergeCart`.

---

## Part B — Login Reconciliation

**File: `_lib/reconcile.ts`** (Server Action)

When the user logs in, the guest cart (stored in localStorage / Zustand) may
conflict with a saved server-side cart for that user.

- [ ] **B.1 — Read session.** Call `getSession()` from `@/lib/auth`.
  Return early with `{ merged: false, reason: "unauthenticated" }` if there
  is no session.

- [ ] **B.2 — Fetch server-side saved cart.** Use `listOrdersForUser(userId)`
  from `@/lib/data` to look up the user's most recent pending order, if any.
  Treat its `items` as the "server cart".

- [ ] **B.3 — Merge strategy.** Accept the guest cart items as input. For each
  item, if the product exists in the server cart, take the **max** quantity
  (never silently drop items). If the product exists only in the guest cart,
  add it to the merged result. Server-only items are preserved as-is.

- [ ] **B.4 — Return the merged cart.** The client stores the result in the
  Zustand store (or Context) and writes it back to localStorage.

---

## Part C — Product List

The page renders a product list (fetched inside `<Suspense>`) with an
"Add to Cart" button per product. Clicking the button calls `addItem`
optimistically — the cart count badge updates before any server round-trip.

---

## Context vs Zustand — Key Tradeoffs

See `solutions/c15-cart-state/NOTES.md` for a detailed comparison. Short version:

| Concern | React Context | Zustand + persist |
|---------|--------------|-------------------|
| Persistence | Manual `useEffect` + localStorage | Built-in `persist` middleware |
| Hydration safety | Manual `mounted` flag | `skipHydration` + `rehydrate()` |
| Boilerplate | More (reducer + actions + types) | Less (flat store) |
| DevTools | React DevTools | Zustand DevTools (redux devtools) |
| Re-renders | Any consumer re-renders on any state change (unless you split contexts) | Selector-based: only the slice you subscribe to |
| Bundle size | Zero extra deps | ~3 kB |
| SSR data | Must thread data via props / Server Components | Same — no SSR magic |

**Verdict for this challenge:** Zustand is the better fit for a cart because
(a) persist middleware handles the localStorage boilerplate, (b) skipHydration
solves the SSR problem with two lines, and (c) selectors prevent re-renders
in components that don't care about quantity changes.

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0 with no type errors.
2. The cart count badge reflects the number of distinct cart items.
3. Clicking "Add to Cart" on a product updates the badge immediately
   (optimistic — no loading spinner required).
4. Reloading the page preserves the cart (localStorage persisted).
5. There are **zero** React hydration warnings in the browser console
   (the SSR/client mismatch is solved by the hydration guard technique).
6. Calling `reconcileCartOnLogin` with a guest cart and a session user
   returns a merged cart with no items dropped.
7. `lib/auth` and `lib/data` are read-only — neither file is modified.
8. The challenge page is a static shell; the product list renders inside
   `<Suspense>` after `await connection()` (cacheComponents compliance).
