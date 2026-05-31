// ─── app/(challenges)/c15-cart-state/_components/CartWidget.tsx ─────────────
//
// CartWidget — displays the current cart state and provides cart management UI.
//
// This is a "use client" component.  It consumes the Zustand cart store via
// selectors (not the full state), which means it only re-renders when the
// specific slice it subscribes to changes.
//
// KEY DESIGN DECISION — hydration guard:
//   We read `_hasHydrated` from the store before rendering cart data.
//   If `_hasHydrated` is false (the store hasn't loaded from localStorage yet),
//   we show a skeleton.  This prevents the flash where the server-rendered
//   badge shows "0" then jumps to the persisted count.
//
//   The BRIEF FLASH from skeleton → real count is expected and acceptable.
//   The alternative (showing the wrong count without a skeleton) would be
//   misleading, and skipping the guard entirely produces hydration warnings.

"use client";

import { useCartStore, selectTotalQty, selectTotalCents } from "../_lib/cart-store";
import { reconcileCartOnLogin } from "../_lib/reconcile";
import type { Session } from "@/lib/auth";

interface CartWidgetProps {
  // The session is passed as a prop from the server component (SessionPanel).
  // Client components cannot call getSession() directly — it requires server
  // context (httpOnly cookies).  Passing the session as a prop is the
  // correct pattern for making server-only data available to client components.
  session: Session | null;
}

export function CartWidget({ session }: CartWidgetProps) {
  // ── Zustand selectors ────────────────────────────────────────────────────────
  // Each selector subscribes to only the slice it needs.  If `items` changes
  // but `totalQty` does not (impossible here, but illustrative), this component
  // would not re-render for a totalQty subscriber.
  const items = useCartStore((s) => s.items);
  const totalQty = useCartStore(selectTotalQty);
  const totalCents = useCartStore(selectTotalCents);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const clearCart = useCartStore((s) => s.clearCart);
  const mergeCart = useCartStore((s) => s.mergeCart);

  // ── Reconcile on login ───────────────────────────────────────────────────────
  // This button triggers the Server Action that reads the session server-side,
  // fetches the user's saved cart, and returns the merged result.
  // The client then calls mergeCart to update the Zustand store.
  async function handleReconcile() {
    if (!session) return;
    const result = await reconcileCartOnLogin(items);
    if (result.merged) {
      mergeCart(result.items);
    }
  }

  // ── Skeleton while hydrating ─────────────────────────────────────────────────
  // Show a loading skeleton until the persist middleware has loaded the cart
  // from localStorage.  This prevents the "0 → N" flash from being rendered
  // as real UI that React would have to reconcile.
  if (!hasHydrated) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-6 w-8 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-10 bg-gray-50 rounded animate-pulse" />
          <div className="h-10 bg-gray-50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Your Cart</h2>
        {/* Cart badge — updates optimistically when addItem is called */}
        <span className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold w-6 h-6">
          {totalQty}
        </span>
      </div>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {items.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          Your cart is empty. Add a product below!
        </p>
      )}

      {/* ── Item list ───────────────────────────────────────────── */}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center gap-3 text-sm border border-gray-100 rounded-lg p-2"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-gray-500 text-xs">
                  ${(item.priceCents / 100).toFixed(2)} each
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQty(item.productId, item.qty - 1)}
                  className="w-6 h-6 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-xs font-bold"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  −
                </button>
                <span className="w-6 text-center text-gray-900 font-medium">
                  {item.qty}
                </span>
                <button
                  onClick={() => updateQty(item.productId, item.qty + 1)}
                  className="w-6 h-6 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-xs font-bold"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  +
                </button>
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-400 hover:text-red-600 text-xs font-medium"
                aria-label={`Remove ${item.name} from cart`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Total ───────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">Total</span>
          <span className="font-semibold text-gray-900">
            ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {items.length > 0 && (
          <button
            onClick={() => clearCart()}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1"
          >
            Clear Cart
          </button>
        )}

        {/* Reconcile button — only shown when logged in */}
        {session && (
          <button
            onClick={handleReconcile}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded px-2 py-1"
          >
            Sync with account ({session.user.name})
          </button>
        )}
      </div>

      {/* ── Hydration explainer ─────────────────────────────────── */}
      <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
        <p className="font-medium mb-1">Hydration Safety Note</p>
        <p>
          This cart uses <code className="font-mono">skipHydration: true</code> in the
          Zustand persist middleware.  The server renders an empty cart; the client
          rehydrates from localStorage after React finishes hydrating the DOM.
          Open DevTools Console — there are NO hydration warnings.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddToCartButton — used by the product list
// ─────────────────────────────────────────────────────────────────────────────
//
// Optimistic: calls addItem synchronously — no async, no loading state.
// The Zustand store updates immediately and notifies all subscribers.
// The cart badge in CartWidget re-renders instantly.

interface AddToCartButtonProps {
  productId: string;
  name: string;
  priceCents: number;
}

export function AddToCartButton({
  productId,
  name,
  priceCents,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const isInCart = useCartStore((s) =>
    s.items.some((i) => i.productId === productId)
  );

  return (
    <button
      onClick={() => addItem({ productId, name, priceCents })}
      className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${
        isInCart
          ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      }`}
    >
      {isInCart ? "In Cart ✓" : "Add to Cart"}
    </button>
  );
}
