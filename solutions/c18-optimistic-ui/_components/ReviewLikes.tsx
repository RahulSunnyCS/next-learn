// ─── solutions/c18-optimistic-ui/_components/ReviewLikes.tsx ─────────────
//
// REFERENCE SOLUTION — C18 Optimistic UI.
//
// This is the fully annotated solution for the ReviewLikes component.
// Study it after completing defend-it.md.
//
// KEY INSIGHT — THE ROLLBACK CONTRACT:
//   useOptimistic is not a fork of state.  It is a temporary overlay on
//   serverValue.  When a transition ends:
//     - success → parent re-renders with new serverHelpfulCount → useOptimistic
//       snaps optimisticCount to the new value (reconciliation).
//     - failure → parent does NOT re-render with a new serverHelpfulCount →
//       useOptimistic snaps optimisticCount back to the OLD serverHelpfulCount
//       (rollback).  Zero manual intervention needed.
//
// ARCHITECTURE:
//   ReviewLikes → ReviewRow (one per review)
//   Each ReviewRow independently calls useOptimistic for its own count.
//   This is required because React hooks must be called at the top level of
//   a component — they cannot be called inside a loop or conditionally.

"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Review } from "@/lib/data";
import { markHelpful } from "../_lib/actions";

interface ReviewLikesProps {
  reviews: Review[];
  productId: string;
  helpfulCounts: Record<string, number>;
}

export default function ReviewLikes({
  reviews,
  productId,
  helpfulCounts,
}: ReviewLikesProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No reviews yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <ReviewRow
          key={review.id}
          review={review}
          productId={productId}
          serverHelpfulCount={helpfulCounts[review.id] ?? 0}
        />
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ReviewRow
// ---------------------------------------------------------------------------

interface ReviewRowProps {
  review: Review;
  productId: string;
  serverHelpfulCount: number;
}

function ReviewRow({ review, productId, serverHelpfulCount }: ReviewRowProps) {
  // ── useOptimistic ─────────────────────────────────────────────────────
  //
  // The merge function receives (currentOptimistic, newValue) and returns
  // the new optimistic value.  We always want a full replacement (not a
  // delta) because the optimistic value is the predicted server count, not
  // a relative change.  Using a delta (+1) would double-count if the
  // component re-renders while the transition is still pending.
  const [optimisticCount, addOptimistic] = useOptimistic(
    serverHelpfulCount,
    (_current: number, next: number) => next
  );

  // ── Error state ──────────────────────────────────────────────────────
  // useOptimistic does not store errors — that is outside its contract.
  // A separate useState is the idiomatic pattern.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Transition ────────────────────────────────────────────────────────
  // startTransition is required to scope the optimistic update.  React
  // uses the transition boundary to know when to commit or revert the
  // speculative render.
  const [isPending, startTransition] = useTransition();

  // ── handleHelpful ─────────────────────────────────────────────────────
  function handleHelpful() {
    setErrorMsg(null);

    startTransition(async () => {
      // STEP 1 — Apply the optimistic update BEFORE the server round-trip.
      // The user sees the +1 immediately.  No spinner, no wait.
      addOptimistic(serverHelpfulCount + 1);

      // STEP 2 — Call the Server Action.
      const fd = new FormData();
      fd.set("reviewId", review.id);
      fd.set("productId", productId);

      const result = await markHelpful(
        { success: true, helpfulCount: serverHelpfulCount },
        fd
      );

      // STEP 3 — Handle success or failure.
      if (!result.success) {
        // ACTION REJECTED.
        // useOptimistic will automatically roll back to serverHelpfulCount
        // when this transition ends (because the parent won't re-render
        // with a new prop — revalidation never ran).
        // We only need to surface the error message.
        setErrorMsg(result.error ?? "Vote could not be recorded.");
      }
      // On success: revalidateTag was called, the parent re-renders with
      // updated helpfulCounts, useOptimistic reconciles to the new value.
      // Nothing to do here.
    });
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      {/* Review header */}
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

      {/* Review body */}
      <p className="text-sm text-gray-600">{review.body}</p>

      {/* Helpful button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleHelpful}
          disabled={isPending}
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
            isPending
              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-wait"
              : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
          ].join(" ")}
        >
          <span aria-hidden="true">👍</span>
          <span>Helpful ({optimisticCount})</span>
        </button>

        {errorMsg && (
          <span
            className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"
            role="alert"
          >
            {errorMsg}
          </span>
        )}
      </div>

      {/* Teaching callout after rollback */}
      {errorMsg && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">useOptimistic rolled back</p>
          <p>
            Count reverted to{" "}
            <code className="font-mono bg-amber-100 rounded px-1">
              {optimisticCount}
            </code>{" "}
            (= serverHelpfulCount). No phantom update lingers.
          </p>
        </div>
      )}
    </li>
  );
}
