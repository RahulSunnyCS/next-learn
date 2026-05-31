// ─── app/(challenges)/c15-cart-state/_components/CartProvider.tsx ───────────
//
// CartProvider serves two purposes:
//
//  1. HYDRATION GATE for Zustand (primary, used by this challenge):
//     The `HydrateCart` component calls `rehydrate()` inside a useEffect.
//     This is the client-only trigger that loads the persisted cart from
//     localStorage AFTER React has finished hydrating the server-rendered DOM.
//     It must be rendered inside any subtree that uses the Zustand cart store.
//
//  2. REACT CONTEXT VERSION (alternative implementation):
//     `CartContextProvider` is a full React Context + useReducer implementation
//     of the same cart.  It demonstrates what Zustand replaces.  The spec
//     asks students to compare both; this file contains both for side-by-side
//     study.  The challenge page uses CartProvider (Zustand) not CartContextProvider.
//
// See spec.md and solutions/c15-cart-state/NOTES.md for the tradeoff analysis.

"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import { useCartStore } from "../_lib/cart-store";
import type { CartItem } from "../_lib/cart-store";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A: Zustand Hydration Gate
// ─────────────────────────────────────────────────────────────────────────────
//
// This component MUST be rendered (somewhere in the subtree) for the Zustand
// store to rehydrate from localStorage.  Without it, `skipHydration: true`
// means the store stays empty forever.
//
// It renders nothing — it is a pure side-effect component.

function HydrateCart() {
  useEffect(() => {
    // Calling rehydrate() here triggers the persist middleware to read
    // localStorage and update the store.  This is safe because useEffect
    // only runs on the client, after React has hydrated the DOM.
    //
    // At this point the server render and initial client render have already
    // agreed (both showed an empty cart), so there is no mismatch warning.
    useCartStore.persist.rehydrate();
  }, []); // Empty dep array: runs once, after the first render.

  return null;
}

/**
 * CartProvider — wrap the c15 challenge page (or any subtree) with this
 * to enable the Zustand cart store with hydration safety.
 *
 * Usage:
 *   <CartProvider>
 *     <YourPage />
 *   </CartProvider>
 *
 * This does NOT add itself to app/layout.tsx — the cart is scoped to the
 * c15 challenge only.  A real app would place this in the root layout.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Trigger rehydration after first client render */}
      <HydrateCart />
      {children}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B: React Context Version (alternative implementation)
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the full Context + useReducer cart for comparison.  It demonstrates:
// - Manual localStorage persistence with useEffect
// - Manual hydration guard with a `mounted` flag
// - More boilerplate than Zustand (reducer, action types, initial state)
// - Re-render behaviour: ALL consumers re-render on any state change

// ---------------------------------------------------------------------------
// Types for the Context version
// ---------------------------------------------------------------------------

interface ContextCartItem {
  productId: string;
  name: string;
  priceCents: number;
  qty: number;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<ContextCartItem, "qty"> }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QTY"; payload: { productId: string; qty: number } }
  | { type: "CLEAR_CART" }
  | { type: "MERGE_CART"; payload: { incoming: ContextCartItem[] } }
  | { type: "HYDRATE"; payload: { items: ContextCartItem[] } };

interface ContextCartState {
  items: ContextCartItem[];
  // Hydration guard: false until the first useEffect fires on the client.
  // Components read this flag to decide whether to show a skeleton.
  mounted: boolean;
}

const initialContextCartState: ContextCartState = {
  items: [],
  mounted: false,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function cartReducer(
  state: ContextCartState,
  action: CartAction
): ContextCartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.productId === action.payload.productId
              ? { ...i, qty: i.qty + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, qty: 1 }],
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (i) => i.productId !== action.payload.productId
        ),
      };

    case "UPDATE_QTY": {
      const { productId, qty } = action.payload;
      if (qty <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.productId !== productId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, qty } : i
        ),
      };
    }

    case "CLEAR_CART":
      return { ...state, items: [] };

    case "MERGE_CART": {
      // take-the-max merge (same strategy as the Zustand version).
      const currentMap = new Map<string, ContextCartItem>(
        state.items.map((i) => [i.productId, i])
      );
      for (const item of action.payload.incoming) {
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
      return { ...state, items: Array.from(currentMap.values()) };
    }

    case "HYDRATE":
      // Replace items with the persisted data AND flip mounted to true.
      // Both happen in one dispatch to avoid a double render.
      return { items: action.payload.items, mounted: true };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

// Splitting into two contexts (data + dispatch) is a React Context optimisation:
// components that only dispatch (e.g. an Add button) subscribe to the stable
// dispatch context and never re-render when cart data changes.
const CartStateContext = createContext<ContextCartState>(
  initialContextCartState
);
const CartDispatchContext = createContext<Dispatch<CartAction>>(() => {});

const STORAGE_KEY = "nextmart-cart-context";

/**
 * CartContextProvider — the React Context alternative to CartProvider.
 *
 * Demonstrates:
 *  - Manual localStorage read/write with useEffect
 *  - Manual hydration guard (`mounted` flag)
 *  - Dispatch + state split context for re-render optimisation
 *
 * NOT used by the challenge page (which uses the Zustand CartProvider).
 * Exported so students can swap it in to compare behaviour.
 */
export function CartContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialContextCartState);

  // ── HYDRATION GUARD ────────────────────────────────────────────────────────
  // This useEffect only runs on the client, after React has hydrated the DOM.
  // It reads localStorage and dispatches a HYDRATE action which:
  //   (a) replaces the items with persisted data
  //   (b) sets mounted = true so the UI knows it can render cart data
  //
  // The split into HYDRATE (not separate LOAD + SET_MOUNTED) avoids a render
  // cycle where mounted=false + items=loaded would be visible for one frame.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { items?: ContextCartItem[] };
        dispatch({
          type: "HYDRATE",
          payload: { items: Array.isArray(parsed.items) ? parsed.items : [] },
        });
      } else {
        // Nothing stored — still need to set mounted so the UI shows the
        // (empty) cart rather than the skeleton forever.
        dispatch({ type: "HYDRATE", payload: { items: [] } });
      }
    } catch {
      // Malformed JSON in localStorage — start with empty cart.
      dispatch({ type: "HYDRATE", payload: { items: [] } });
    }
  }, []); // Runs once on mount.

  // ── PERSISTENCE ────────────────────────────────────────────────────────────
  // Write to localStorage whenever the cart changes.
  // We guard with `state.mounted` so we do not write the initial empty state
  // over the persisted data before the HYDRATE action fires.
  useEffect(() => {
    if (!state.mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
    } catch {
      // localStorage can throw (e.g. private browsing quota, CORS iframe).
      // Silently ignore — the cart still works in memory.
    }
  }, [state.items, state.mounted]);

  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Context hooks (exported for consumers of the Context version)
// ---------------------------------------------------------------------------

/** Read the cart state from the Context version. */
export function useContextCart() {
  return useContext(CartStateContext);
}

/** Dispatch cart actions in the Context version. */
export function useContextCartDispatch() {
  return useContext(CartDispatchContext);
}

// ---------------------------------------------------------------------------
// CartItem type re-export so the Context version's type matches the Zustand
// store type and they share the same shape for easy swapping.
// ---------------------------------------------------------------------------
export type { CartItem };
