// ─── solutions/c18-optimistic-ui/page.tsx ────────────────────────────────
//
// REFERENCE SOLUTION — C18 Optimistic UI.
//
// Compare this to your implementation after you have filled in
// app/(challenges)/c18-optimistic-ui/_meta/defend-it.md.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   Static shell + <Suspense>-wrapped dynamic hole.

import { Suspense } from "react";
import { cacheTag, cacheLife } from "next/cache";
import { listReviews, getProductById, tags } from "@/lib/data";
import type { Metadata } from "next";
import ReviewLikes from "./_components/ReviewLikes";
import { getHelpfulCounts } from "./_lib/actions";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "C18 — Optimistic UI (Solution)",
};

const DEMO_PRODUCT_ID = "p-elec-001";

export default function C18SolutionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-green-600 mb-1">
          solutions/c18-optimistic-ui
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Optimistic UI — Reference Solution
        </h1>
        <p className="text-gray-600 text-sm">
          This is the complete implementation.  Study it after you have filled
          in{" "}
          <code className="font-mono text-xs">_meta/defend-it.md</code>.
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <ReviewsPanel productId={DEMO_PRODUCT_ID} />
      </Suspense>
    </div>
  );
}

async function ReviewsPanel({ productId }: { productId: string }) {
  await connection();
  const product = await getCachedProduct(productId);
  const reviews = await getCachedReviews(productId);
  const helpfulCounts = await getHelpfulCounts(reviews.map((r) => r.id));

  if (!product) {
    return <p className="text-red-600 text-sm">Demo product not found.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-mono text-gray-400 mb-1">{product.id}</p>
        <h2 className="font-semibold text-gray-900 text-lg">{product.name}</h2>
        <p className="text-indigo-600 font-bold mt-2">
          ${(product.priceCents / 100).toFixed(2)}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Reviews ({reviews.length})
          </h2>
          <span className="text-xs text-gray-400 italic">
            Every 3rd &ldquo;Helpful&rdquo; click fails — watch the rollback
          </span>
        </div>
        <ReviewLikes
          reviews={reviews}
          productId={productId}
          helpfulCounts={helpfulCounts}
        />
      </section>
    </div>
  );
}

async function getCachedProduct(productId: string) {
  "use cache";
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return await getProductById(productId);
}

async function getCachedReviews(productId: string) {
  "use cache";
  cacheTag(tags.reviews(productId));
  return await listReviews(productId);
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-2">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-5 w-64 bg-gray-100 rounded" />
        <div className="h-4 w-16 bg-gray-100 rounded mt-2" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
          <div className="h-3 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-6 w-28 bg-gray-100 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}
