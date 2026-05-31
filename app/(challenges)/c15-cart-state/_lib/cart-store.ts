// ─── app/(challenges)/c15-cart-state/_lib/cart-store.ts ─────────────────────
//
// Zustand cart store with persist middleware.
//
// THE HYDRATION MISMATCH PROBLEM AND ITS FIX:
// ─────────────────────────────────────────────
// When Next.js SSR renders the page, localStorage is not available — the
// server renders an empty cart.  If Zustand's persist middleware auto-hydrates
// immediately on store creation (the default), the first client render reads
// localStorage and produces a non-empty cart.  React compares the two and
// throws a hydration mismatch warning:
//   "Text content did not match. Server: '0' Client: '3'"
//
// FIX: `skipHydration: true`
//   Tell persist NOT to auto-hydrate.  The store starts with the initial
//   state (empty cart) on both server and client — they agree.  A separate
//   `useHydrateCart` hook then calls `rehydrate()` inside a `useEffect`,
//   which only runs on the client AFTER React has finished hydrating the DOM.
//   At that point, updating the store to match localStorage is safe.
//
// FLOW:
//   1. Server renders page → store state = empty (initial)
//   2. React hydrates DOM → store state still = empty (matches server)
//   3. `useEffect` in HydrateCart fires → calls `rehydrate()`
//   4. persist reads localStorage → store state = persisted items
//   5. Zustand notifies subscribers → cart UI updates
//   6. `_hasHydrated` flag becomes `true` → UI can show cart data
//
// This produces a brief flash from "0" to "N" items, but NO hydration warning.
// The flash is acceptable and expected; it can be masked with a skeleton.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  qty: number;
}

export interface CartState {
  // Items currently in the cart.
  items: CartItem[];

  // True once the persist middleware has finished rehydrating from localStorage.
  // Components that display persisted data should wait for this flag before
  // rendering cart content (otherwise they show the initial empty state).
  _hasHydrated: boolean;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Add one unit of a product, or increment quantity if already in cart. */
  addItem: (item: Omit<CartItem, "qty">) => void;

  /** Remove a product from the cart entirely. */
  removeItem: (productId: string) => void;

  /** Set the quantity of a product. Setting qty <= 0 removes the item. */
  updateQty: (productId: string, qty: number) => void;

  /** Remove all items from the cart. */
  clearCart: () => void;

  /**
   * Merge a list of items (e.g. from the server) into the current cart.
   *
   * Merge strategy — take-the-max:
   *   For products that exist in both the current cart and `incoming`, keep
   *   whichever quantity is larger.  Products that exist in only one set are
   *   preserved as-is.  This strategy never silently drops items.
   *
   * This action is called by the login-reconcile flow in _lib/reconcile.ts
   * after the Server Action returns the merged list from the server.
   */
  mergeCart: (incoming: CartItem[]) => void;

  /** Internal: set the hydration flag (called by onRehydrateStorage). */
  setHasHydrated: (value: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,

      addItem(newItem) {
        // Optimistic: update state synchronously, no server round-trip.
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === newItem.productId
          );
          if (existing) {
            // Already in cart — increment quantity.
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId
                  ? { ...i, qty: i.qty + 1 }
                  : i
              ),
            };
          }
          // New product — append with qty 1.
          return { items: [...state.items, { ...newItem, qty: 1 }] };
        });
      },

      removeItem(productId) {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      updateQty(productId, qty) {
        if (qty <= 0) {
          // Treating qty ≤ 0 as a remove keeps the API ergonomic — callers
          // don't need a separate code path for "decrement to zero".
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, qty } : i
          ),
        }));
      },

      clearCart() {
        set({ items: [] });
      },

      mergeCart(incoming) {
        set((state) => {
          // Build a map of current items keyed by productId for O(1) look-up.
          const currentMap = new Map<string, CartItem>(
            state.items.map((i) => [i.productId, i])
          );

          // Walk incoming items and apply take-the-max merge.
          for (const item of incoming) {
            const existing = currentMap.get(item.productId);
            if (existing) {
              // Product in both sets — keep the larger quantity.
              currentMap.set(item.productId, {
                ...existing,
                qty: Math.max(existing.qty, item.qty),
              });
            } else {
              // Product only in incoming (server cart) — add it.
              currentMap.set(item.productId, item);
            }
          }

          return { items: Array.from(currentMap.values()) };
        });
      },

      setHasHydrated(value) {
        set({ _hasHydrated: value });
      },
    }),
    {
      name: "nextmart-cart",
      // Use createJSONStorage with a function getter.  The getter runs lazily
      // (only when the persist middleware needs it), so it never executes on
      // the server where `window` is undefined.
      storage: createJSONStorage(() => {
        // Guard: localStorage is not available in SSR or in workers.
        // Returning a no-op storage lets the store initialise without crashing.
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),

      // THE KEY LINE for hydration safety:
      // Do not auto-hydrate from localStorage when the store is first created.
      // The HydrateCart component (see CartProvider.tsx) calls rehydrate()
      // inside a useEffect, ensuring it only runs on the client after hydration.
      skipHydration: true,

      // Only persist the items array, not the internal _hasHydrated flag.
      // _hasHydrated is a runtime flag — it should always start as false
      // (we are always unhydrated at startup) and only become true after
      // rehydrate() completes.
      partialize: (state) => ({ items: state.items }),

      // This callback fires when rehydration from localStorage completes.
      // We use it to flip _hasHydrated so the UI knows it can show cart data.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },

      // Version for future migration support.  If we change CartItem's shape
      // in a future update, bump this number and provide a `migrate` function
      // to transform the old stored data.
      version: 1,
    }
  )
);

// ---------------------------------------------------------------------------
// Derived selectors (stable references — do not recreate per render)
// ---------------------------------------------------------------------------

/** Total number of distinct products in the cart. */
export const selectItemCount = (state: CartState): number =>
  state.items.length;

/** Total number of individual units (sum of all quantities). */
export const selectTotalQty = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.qty, 0);

/** Total price in cents. */
export const selectTotalCents = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);

/** Whether a specific product is already in the cart. */
export const selectIsInCart =
  (productId: string) =>
  (state: CartState): boolean =>
    state.items.some((i) => i.productId === productId);
