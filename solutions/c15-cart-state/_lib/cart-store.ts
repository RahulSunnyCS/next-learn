// ─── solutions/c15-cart-state/_lib/cart-store.ts ─────────────────────────────
//
// REFERENCE SOLUTION — Zustand Cart Store with persist + hydration safety.
//
// This is the clean, annotated reference version of the starter scaffold at
// app/(challenges)/c15-cart-state/_lib/cart-store.ts.  Students compare both
// to understand what the correct implementation looks like.
//
// READ NOTES.md FOR THE FULL CONTEXT VS ZUSTAND TRADEOFF ANALYSIS.

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
  items: CartItem[];
  _hasHydrated: boolean;

  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  mergeCart: (incoming: CartItem[]) => void;
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
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === newItem.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId
                  ? { ...i, qty: i.qty + 1 }
                  : i
              ),
            };
          }
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
          const currentMap = new Map<string, CartItem>(
            state.items.map((i) => [i.productId, i])
          );
          for (const item of incoming) {
            const existing = currentMap.get(item.productId);
            if (existing) {
              currentMap.set(item.productId, {
                ...existing,
                qty: Math.max(existing.qty, item.qty),
              });
            } else {
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
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),

      // KEY: do not auto-hydrate from localStorage during store creation.
      // HydrateCart component calls rehydrate() in useEffect instead.
      skipHydration: true,

      // Exclude runtime flags from persistence.
      partialize: (state) => ({ items: state.items }),

      // Flip _hasHydrated when localStorage read is complete.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },

      version: 1,
    }
  )
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectItemCount = (state: CartState): number =>
  state.items.length;

export const selectTotalQty = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.qty, 0);

export const selectTotalCents = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);

export const selectIsInCart =
  (productId: string) =>
  (state: CartState): boolean =>
    state.items.some((i) => i.productId === productId);
