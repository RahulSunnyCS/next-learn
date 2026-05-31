// ─── _components/ReviewLikes.tsx — C18 Optimistic UI ─────────────────────
//
// "use client" — this component uses hooks (useOptimistic, useState,
// useActionState, useTransition) which are client-only APIs.
//
// ARCHITECTURE DECISION — per-review child component:
//   React requires hooks to be called unconditionally at the top level of a
//   component.  We cannot loop over reviews and call useOptimistic once per
//   iteration inside ReviewLikes.  Instead, ReviewLikes renders a <ReviewRow>
//   per review, and each ReviewRow independently calls useOptimistic for its
//   own helpful count.  This is the idiomatic pattern for per-item optimistic
//   state.
//
// THE GRADED TEACHING POINT — ROLLBACK PATH:
//   The Server Action (markHelpful) forces a failure every 3rd call.
//   When failure occurs:
//     1. useOptimistic rolled back automatically (count reverts to serverCount).
//     2. A useState<string | null> stores the error message to display.
//     3. The user sees: count is back to before, error banner explains why.
//   When success occurs:
//     1. The parent re-renders with updated helpfulCounts (server-authoritative).
//     2. useOptimistic in each row snaps to the new serverCount.
//     3. Displayed count === server count — reconciliation complete.

"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Review } from "@/lib/data";
import { markHelpful } from "../_lib/actions";
import type { HelpfulActionState } from "../_lib/actions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReviewLikesProps {
  reviews: Review[];
  productId: string;
  /** Initial server-authoritative helpful counts keyed by reviewId. */
  helpfulCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// ReviewLikes — renders the list of reviews with per-row optimistic counters
// ---------------------------------------------------------------------------

export default function ReviewLikes({
  reviews,
  productId,
  helpfulCounts,
}: ReviewLikesProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No reviews yet. Check back later.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <ReviewRow
          key={review.id}
          review={review}
          productId={productId}
          // Fall back to 0 if the count is not in the map yet (new review).
          serverHelpfulCount={helpfulCounts[review.id] ?? 0}
        />
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ReviewRow — a single review card with an optimistic "Helpful" button
// ---------------------------------------------------------------------------
// Each row is its own component so React hooks are called at the top level,
// one per ReviewRow instance.  This is required: hooks cannot be called
// conditionally or inside loops.

interface ReviewRowProps {
  review: Review;
  productId: string;
  serverHelpfulCount: number;
}

function ReviewRow({ review, productId, serverHelpfulCount }: ReviewRowProps) {
  // ── useOptimistic — the core of the challenge ──────────────────────────
  // optimisticCount is what the UI DISPLAYS.
  //   - Outside a transition: equals serverHelpfulCount.
  //   - During a pending transition: equals the speculative value we passed
  //     to addOptimistic (serverHelpfulCount + 1).
  //   - After a FAILED transition: React resets it back to serverHelpfulCount
  //     automatically — this is the ROLLBACK that makes useOptimistic
  //     different from plain useState.
  //
  // Merge function: we always want the full replacement value (not a delta),
  // so we just return the new value directly.
  const [optimisticCount, addOptimistic] = useOptimistic(
    serverHelpfulCount,
    (_current: number, next: number) => next
  );

  // ── Error state — separate from useOptimistic ──────────────────────────
  // useOptimistic manages the displayed count; it does NOT store errors.
  // We keep error in a normal useState so we can display it after rollback
  // and clear it on the next successful click.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── useTransition — required to scope the optimistic update ───────────
  // addOptimistic only guarantees rollback when called inside a transition.
  // startTransition marks this as a non-urgent update and gives React the
  // transition boundary it needs to revert the optimistic state on failure.
  const [isPending, startTransition] = useTransition();

  // ── handleHelpful — the click handler ─────────────────────────────────
  // This is where optimistic UI, rollback, and reconciliation all meet.
  function handleHelpful() {
    // Clear any previous error on each new attempt.
    setErrorMsg(null);

    startTransition(async () => {
      // 1. APPLY THE OPTIMISTIC UPDATE IMMEDIATELY.
      //    React re-renders the button with optimisticCount = serverHelpfulCount + 1
      //    before the server responds.  The user sees the +1 with zero latency.
      addOptimistic(serverHelpfulCount + 1);

      // 2. CALL THE SERVER ACTION.
      //    Build FormData manually because we are in an imperative onClick handler,
      //    not a <form> submission.  We call markHelpful directly so we can read
      //    the return value and decide whether to show an error.
      const fd = new FormData();
      fd.set("reviewId", review.id);
      fd.set("productId", productId);

      // prevState is the initial/current state — we pass the un-updated count
      // here because the action uses it as a fallback for the helpfulCount in
      // error responses.
      const prevState: HelpfulActionState = {
        success: true,
        helpfulCount: serverHelpfulCount,
      };
      const result = await markHelpful(prevState, fd);

      // 3. HANDLE THE RESULT.
      if (!result.success) {
        // SERVER REJECTED THE ACTION.
        // useOptimistic ROLLS BACK automatically when the transition ends
        // without a new serverHelpfulCount from the parent (revalidation
        // never ran, so the parent did not re-render with a new value).
        //
        // We only need to set the error message — the count reverts by itself.
        setErrorMsg(result.error ?? "Unexpected server error. Please try again.");
      }
      // On success: the action called revalidateTag, the parent re-rendered,
      // and the new serverHelpfulCount prop flows back in.  useOptimistic
      // snaps optimisticCount to the new serverHelpfulCount automatically.
      // We do not need to do anything here.
    });
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      {/* ── Review header ── */}
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

      {/* ── Review body ── */}
      <p className="text-sm text-gray-600">{review.body}</p>

      {/* ── Helpful button row ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleHelpful}
          disabled={isPending}
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
            isPending
              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-wait"
              : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200",
          ].join(" ")}
          // aria-label describes the action clearly for screen readers
          aria-label={`Mark review by ${review.authorName} as helpful`}
        >
          {/* Thumbs-up icon — plain text for zero-dependency rendering */}
          <span aria-hidden="true">👍</span>
          <span>
            Helpful
            {/* THE OPTIMISTIC COUNT — this is what the user sees instantly.
                During a pending action: shows the speculative +1.
                After rollback: snaps back to serverHelpfulCount.
                After successful reconcile: shows the authoritative count. */}
            {" "}({optimisticCount})
          </span>
          {isPending && (
            <span className="ml-1 text-gray-400 text-xs" aria-live="polite">
              …
            </span>
          )}
        </button>

        {/* ── Failure / rollback indicator ── */}
        {/* Visible only after a rejected action.  Explains the rollback so
            the learner can connect the visual revert to the error. */}
        {errorMsg && (
          <span
            className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"
            role="alert"
            aria-live="assertive"
          >
            {errorMsg}
          </span>
        )}
      </div>

      {/* ── Debug callout: visible during rollback for learning purposes ── */}
      {errorMsg && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">
            useOptimistic rolled back
          </p>
          <p>
            The displayed count reverted from{" "}
            <code className="font-mono bg-amber-100 rounded px-1">
              {optimisticCount + 1}
            </code>{" "}
            back to{" "}
            <code className="font-mono bg-amber-100 rounded px-1">
              {optimisticCount}
            </code>
            {" "}(= <code className="font-mono bg-amber-100 rounded px-1">serverHelpfulCount</code>).
            No phantom update remains. The server state is authoritative.
          </p>
        </div>
      )}
    </li>
  );
}
