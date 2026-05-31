// ─── app/(challenges)/c15-cart-state/page.tsx ────────────────────────────────
//
// C15 — Cart State challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   Static shell + Suspense-wrapped dynamic holes.
//   Dynamic data (session cookie, product list) is read INSIDE Suspense.
//   No `export const dynamic` directives — those are forbidden under cacheComponents.
//
// CART ARCHITECTURE:
//   CartProvider wraps the page and sets up the Zustand hydration gate.
//   The CartWidget is a client component that reads Zustand store selectors.
//   The product list is a server component that renders inside Suspense.
//   The session (for reconcile) is passed as a prop from SessionPanel.

import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { listProducts } from "@/lib/data";
import { CartProvider } from "./_components/CartProvider";
import { CartWidget, AddToCartButton } from "./_components/CartWidget";

export const metadata: Metadata = {
  title: "C15 — Cart State",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE — Static shell
// ─────────────────────────────────────────────────────────────────────────────
// CartProvider is placed here (not in app/layout.tsx) so the cart store is
// scoped to this challenge only.  In a real app it would live in the root
// layout so the cart persists across all routes.

export default function C15CartStatePage() {
  return (
    // CartProvider wraps the entire page to make the Zustand store available
    // and trigger hydration after the first client render.
    <CartProvider>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── STATIC SHELL: header ──────────────────────────────────────── */}
        <div>
          <p className="text-xs font-mono text-indigo-500 mb-1">c15-cart-state</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cart State: Persisted, Hydration-Safe, Reconciled on Login
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            This challenge teaches cross-route client state management with the
            hard parts production apps face: localStorage persistence without
            hydration warnings, optimistic updates, and login reconciliation.
          </p>
        </div>

        {/* ── LAYOUT: two-column on medium+ screens ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: product list (dynamic, inside Suspense) */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="font-semibold text-gray-800">Products</h2>
            <Suspense fallback={<ProductListSkeleton />}>
              <ProductList />
            </Suspense>
          </div>

          {/* Right: cart widget + session panel (both dynamic, inside Suspense) */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Cart</h2>
            <Suspense fallback={<CartPanelSkeleton />}>
              <CartPanel />
            </Suspense>
          </div>
        </div>

        {/* ── STATIC SHELL: learning notes ─────────────────────────────── */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
          <h2 className="font-semibold text-indigo-900">Key Concepts in This Challenge</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-indigo-800">
            <div className="space-y-1">
              <p className="font-medium">Hydration Safety</p>
              <p className="text-xs">
                The Zustand persist middleware uses{" "}
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">skipHydration: true</code>.
                The store starts empty (matching server render), then{" "}
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">rehydrate()</code>{" "}
                loads localStorage after React hydrates the DOM.
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium">Optimistic Updates</p>
              <p className="text-xs">
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">addItem</code>{" "}
                updates the Zustand store synchronously — no{" "}
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">await</code>,
                no server round-trip.  The badge count changes the moment you click
                &quot;Add to Cart&quot;.
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium">Login Reconciliation</p>
              <p className="text-xs">
                A Server Action reads{" "}
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">getSession()</code>{" "}
                server-side and merges the guest cart with any saved server cart
                using a take-the-max strategy (never drops items).
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium">Context vs Zustand</p>
              <p className="text-xs">
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">CartProvider.tsx</code>{" "}
                contains BOTH implementations.  The{" "}
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">CartContextProvider</code>{" "}
                shows the manual approach; this page uses the Zustand version.
                See{" "}
                <code className="font-mono text-xs bg-indigo-100 rounded px-1">solutions/c15-cart-state/NOTES.md</code>{" "}
                for the tradeoff analysis.
              </p>
            </div>
          </div>
        </section>

        {/* ── STATIC SHELL: defend-it reminder ─────────────────────────── */}
        <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Before you read the reference solution:</p>
          <p>
            Fill in{" "}
            <code className="font-mono text-xs bg-amber-100 rounded px-1">
              app/(challenges)/c15-cart-state/_meta/defend-it.md
            </code>{" "}
            with your own answers, commit it, and only then open{" "}
            <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c15-cart-state/</code>.
          </p>
        </section>
      </div>
    </CartProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC HOLES (async Server Components, rendered inside Suspense)
// ─────────────────────────────────────────────────────────────────────────────

// ProductList — fetches products from lib/data inside a Suspense hole.
// `await connection()` before the data call ensures we are on the dynamic
// render path (not static prerender) — required for any uncached data read
// under cacheComponents: true.
async function ProductList() {
  // connection() establishes that this component is dynamic.
  // Must be called BEFORE any non-deterministic code (listProducts uses
  // Math.random() for simulated latency).  See cache-components-rules.md rule 7.
  await connection();
  const result = await listProducts({ pageSize: 6, sort: "rating-desc" });

  return (
    <ul className="space-y-3">
      {result.items.map((product) => (
        <li
          key={product.id}
          className="flex items-center justify-between gap-4 border border-gray-200 rounded-lg bg-white p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {product.name}
            </p>
            <p className="text-xs text-gray-500">
              ${(product.priceCents / 100).toFixed(2)} · ★{product.rating} ·{" "}
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </p>
          </div>
          {/* AddToCartButton is a client component — Zustand store updates optimistically */}
          <AddToCartButton
            productId={product.id}
            name={product.name}
            priceCents={product.priceCents}
          />
        </li>
      ))}
    </ul>
  );
}

// CartPanel — reads the session server-side and passes it to CartWidget.
// CartWidget is a client component; it cannot call getSession() itself.
// Passing the session as a prop is the correct pattern for sharing
// server-only data with client components.
async function CartPanel() {
  await connection();
  const session = await getSession();

  return <CartWidget session={session} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeletons (shown while the dynamic holes are streaming in)
// ─────────────────────────────────────────────────────────────────────────────

function ProductListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-4 border border-gray-100 rounded-lg bg-white p-3"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function CartPanelSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
        <div className="h-6 w-6 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="h-16 bg-gray-50 rounded animate-pulse" />
    </div>
  );
}
