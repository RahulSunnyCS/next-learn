// ─── solutions/c11-server-actions/page.tsx ───────────────────────────────
//
// REFERENCE SOLUTION — C11 Server Actions.
//
// This file is a copy of the challenge page with full annotations explaining
// every decision.  Compare it to your implementation after you have completed
// the tasks in spec.md.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   Static shell + <Suspense>-wrapped dynamic holes.  No route-segment exports.

import { Suspense } from "react";
import { cacheTag, cacheLife } from "next/cache";
import { listReviews, getProductById, tags } from "@/lib/data";
import type { Metadata } from "next";
import ReviewForm from "./_components/ReviewForm";

export const metadata: Metadata = {
  title: "C11 — Server Actions (Solution)",
};

const DEMO_PRODUCT_ID = "p-elec-001";

export default function C11SolutionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-green-600 mb-1">
          solutions/c11-server-actions
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Server Actions — Reference Solution
        </h1>
        <p className="text-gray-600 text-sm">
          This is the complete implementation.  Study it after you have filled
          in <code className="font-mono text-xs">_meta/defend-it.md</code>.
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <ReviewPanel productId={DEMO_PRODUCT_ID} />
      </Suspense>
    </div>
  );
}

async function ReviewPanel({ productId }: { productId: string }) {
  const product = await getCachedProduct(productId);
  const reviews = await getCachedReviews(productId);

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
        <h2 className="font-semibold text-gray-900">
          Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No reviews yet. Be the first!</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm font-semibold">
                    {"★".repeat(review.rating)}
                    <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>
                  </span>
                  <span className="text-xs text-gray-400">{review.authorName}</span>
                  <span className="text-xs text-gray-300 ml-auto">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/*
        ReviewForm is a "use client" component that uses:
        - useActionState to wire the Server Action and surface errors.
        - useFormStatus (inside SubmitButton) for the pending UI.
        It passes productId through a hidden input inside the form.
      */}
      <ReviewForm productId={productId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cached helpers — the key to revalidation
// ---------------------------------------------------------------------------

async function getCachedProduct(productId: string) {
  "use cache";
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return await getProductById(productId);
}

async function getCachedReviews(productId: string) {
  "use cache";
  // THIS IS THE TAG that submitReview's revalidateTag(tags.reviews(productId))
  // targets.  When the action calls revalidateTag, this cache entry is purged
  // and the next render re-fetches from the data store.
  cacheTag(tags.reviews(productId));
  return await listReviews(productId);
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-2">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-5 w-64 bg-gray-100 rounded" />
        <div className="h-4 w-16 bg-gray-100 rounded mt-2" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
          <div className="h-3 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      ))}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-100 rounded" />
        <div className="h-8 w-24 bg-gray-100 rounded" />
        <div className="h-20 w-full bg-gray-100 rounded" />
        <div className="h-9 w-32 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
