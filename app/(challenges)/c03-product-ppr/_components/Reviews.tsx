// ─── _components/Reviews.tsx — DYNAMIC HOLE #3 ────────────────────────────
//
// Customer reviews for the product. Treated as an uncached dynamic hole so
// that newly submitted reviews appear immediately without requiring a manual
// cache invalidation step (and to make streaming latency visible in dev).
//
// WHY UNCACHED?
//   Reviews can be submitted at any time. If we cached them with cacheLife('minutes'),
//   a user who just submitted a review would not see it for up to N minutes.
//   The `addReview` Server Action would call `revalidateTag(tags.reviews(productId))`
//   to force-invalidate, but for this teaching challenge we keep it simple and
//   uncached — every request gets the freshest review list.
//
// IN PRODUCTION you would cache reviews with a short TTL and invalidate the
// cache on every new submission via a Server Action.
//
// PPR CONTRACT: rendered inside <Suspense> in the parent page.

import { listReviews } from "@/lib/data";
import type { Review } from "@/lib/data";

// ── Star display ──────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} stars`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-amber-400" : "text-gray-200"}>
          ★
        </span>
      ))}
    </span>
  );
}

// ── Single review card ────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{review.authorName}</p>
          <Stars rating={review.rating} />
        </div>
        <time className="text-xs text-gray-400 shrink-0">{date}</time>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{review.body}</p>
    </div>
  );
}

// ── Reviews list ──────────────────────────────────────────────────────────

interface ReviewsProps {
  productId: string;
}

export async function Reviews({ productId }: ReviewsProps) {
  // UNCACHED — listReviews runs fresh on every request.
  const reviews = await listReviews(productId);

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-500">No reviews yet.</p>
        <p className="text-xs text-gray-400 mt-1">Be the first to review this product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {reviews.length} review{reviews.length !== 1 ? "s" : ""} — fetched fresh per request (no cache).
      </p>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

export function ReviewsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-gray-100 bg-white p-4 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-full rounded bg-gray-50 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-gray-50 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
