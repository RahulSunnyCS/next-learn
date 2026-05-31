// ─── solutions/c15-cart-state/page.tsx ────────────────────────────────────────
//
// REFERENCE SOLUTION — C15 Cart State page.
//
// This mirrors the challenge page with full annotations.
// See NOTES.md for the Context vs Zustand tradeoff analysis.

import { Suspense } from "react";
import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { listProducts } from "@/lib/data";
import { CartProvider } from "../../app/(challenges)/c15-cart-state/_components/CartProvider";
import { CartWidget, AddToCartButton } from "../../app/(challenges)/c15-cart-state/_components/CartWidget";

// NOTE: The solution page re-uses the challenge components directly because
// the solution is read-only reference material — it does not ship its own
// duplicate implementation.  In a real course platform you might copy the
// components to solutions/ for standalone reference; here we keep it DRY.

export default function SolutionCartPage() {
  return (
    <CartProvider>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-xs font-mono text-green-600 mb-1">
            solutions/c15-cart-state (reference)
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Reference Solution — Cart State
          </h1>
          <p className="text-gray-600 text-sm">
            This is the clean reference implementation. Read NOTES.md for the
            full Context vs Zustand analysis and hydration safety explanation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="font-semibold text-gray-800">Products</h2>
            <Suspense fallback={<ProductListSkeleton />}>
              <ProductList />
            </Suspense>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Cart</h2>
            <Suspense fallback={<CartSkeleton />}>
              <CartPanel />
            </Suspense>
          </div>
        </div>
      </div>
    </CartProvider>
  );
}

async function ProductList() {
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
              ${(product.priceCents / 100).toFixed(2)} · ★{product.rating}
            </p>
          </div>
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

async function CartPanel() {
  await connection();
  const session = await getSession();
  return <CartWidget session={session} />;
}

function ProductListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 border border-gray-100 rounded-lg bg-white p-3">
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

function CartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="h-5 w-20 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="h-16 bg-gray-50 rounded animate-pulse" />
    </div>
  );
}
