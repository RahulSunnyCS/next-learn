// ─── _lib/actions.ts — C18 Optimistic UI ────────────────────────────────
//
// "use server" at the file level marks every export as a Server Action.
//
// THE GRADED PART OF THIS CHALLENGE IS THE FAILURE PATH.
// Every 3rd call to markHelpful is forced to fail (via a module-level counter).
// That forced failure is what exercises useOptimistic's rollback path.
//
// SECURITY NOTE:
//   This action reads the session via getSession() to demonstrate the auth
//   pattern.  It falls back to a guest identity so the demo works without login,
//   matching the spirit of C11 (mechanics over auth — full auth is C12's scope).
//   The helpful vote is stored in a local module-level Map, NOT in lib/data, so
//   we never mutate the frozen data layer.
//
// WHY A LOCAL COUNTER FOR FAILURES:
//   We need a deterministic, reproducible failure on every 3rd click so learners
//   can reliably test rollback without having to find a real network error.  A
//   module-level counter survives for the lifetime of the dev server process —
//   it resets on server restart.  This is intentionally educational rather than
//   production-grade.

"use server";

import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { tags } from "@/lib/data";

// ---------------------------------------------------------------------------
// In-process helpful-vote store
// ---------------------------------------------------------------------------
// We keep helpful counts in a module-level Map so we can demonstrate
// optimistic updates and reconciliation without touching lib/data.
// Key: reviewId, Value: count of helpful votes.
const helpfulStore = new Map<string, number>();

// ---------------------------------------------------------------------------
// Simulated failure counter
// ---------------------------------------------------------------------------
// This counter is incremented on every call to markHelpful.
// When it hits a multiple of 3, the action throws a simulated server error.
// This makes the failure path reliably testable and is the centrepiece of the
// challenge: learners can click 1, 2 (succeed), 3 (fail/rollback), 4, 5 (succeed),
// 6 (fail/rollback), etc.
let callCounter = 0;

// ---------------------------------------------------------------------------
// Public helpers for reading helpful counts
// ---------------------------------------------------------------------------

/**
 * Returns the current helpful count for a review.
 * Starts at 0 if no votes have been cast yet.
 */
export async function getHelpfulCount(reviewId: string): Promise<number> {
  return helpfulStore.get(reviewId) ?? 0;
}

/**
 * Returns a Record of reviewId → helpful count for a list of review IDs.
 * Used by the server component to pass initial counts to ReviewLikes.
 */
export async function getHelpfulCounts(
  reviewIds: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const id of reviewIds) {
    result[id] = helpfulStore.get(id) ?? 0;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Action state type
// ---------------------------------------------------------------------------

export interface HelpfulActionState {
  success: boolean;
  error?: string;
  // The authoritative server count after the action completes.
  // On success: the new count after the vote was applied.
  // On failure: the count before the action (for reconciliation reference).
  helpfulCount: number;
}

// ---------------------------------------------------------------------------
// markHelpful — the Server Action that drives optimistic UI
// ---------------------------------------------------------------------------

/**
 * Server Action: record a "helpful" vote for a review.
 *
 * Signature follows the useActionState convention:
 *   - prevState: the state from the previous call (or initialState).
 *   - formData: FormData from the <form> submission.
 *
 * THE GRADED FAILURE PATH:
 *   Every 3rd call throws a simulated error.  This forces useOptimistic's
 *   rollback path on the client — the optimistic +1 reverts to the server
 *   count before the click.
 *
 * RECONCILIATION:
 *   On success, revalidateTag purges the cached review list.  The parent
 *   server component re-renders and passes the updated helpfulCounts to
 *   ReviewLikes.  useOptimistic in each row snaps its displayed value to the
 *   new serverCount — completing the reconciliation cycle.
 */
export async function markHelpful(
  prevState: HelpfulActionState,
  formData: FormData
): Promise<HelpfulActionState> {
  // ── Read inputs from FormData ───────────────────────────────────────────
  // Both values are validated server-side; HTML attributes are UX-only.
  const reviewId = (formData.get("reviewId") as string | null)?.trim() ?? "";
  const productId = (formData.get("productId") as string | null)?.trim() ?? "";

  if (!reviewId) {
    return {
      success: false,
      error: "Missing reviewId — cannot record helpful vote.",
      helpfulCount: prevState.helpfulCount,
    };
  }

  // ── Auth check (demonstrates the pattern; falls back to guest) ──────────
  // getSession() reads the session JWT from the httpOnly cookie.
  // In a production action, reject anonymous callers here.
  // We allow guests so the demo works without login.
  const session = await getSession();
  const actorName = session?.user?.name ?? "Guest";
  void actorName; // used only for logging; not sent to the client

  // ── Increment the call counter and check for simulated failure ──────────
  callCounter++;

  // TEACHING NOTE: This is the simulated failure.  Every 3rd call rejects.
  // Remove this block in production.  Its purpose is to make rollback
  // observable and reproducible so learners can see it without needing
  // a real network error.
  if (callCounter % 3 === 0) {
    console.error(
      `[markHelpful] Simulated failure on call ${callCounter} (every 3rd fails).`
    );
    const currentCount = helpfulStore.get(reviewId) ?? 0;
    // We return a failure state rather than throwing so the client-side
    // error message can be surfaced cleanly via the action state.
    // Throwing would also trigger rollback in useOptimistic but would
    // require the caller to handle an exception rather than reading state.
    return {
      success: false,
      error:
        "Simulated server error (every 3rd vote fails — this is intentional " +
        "for the rollback demo). Your vote was NOT recorded.",
      helpfulCount: currentCount,
    };
  }

  // ── Apply the helpful vote ──────────────────────────────────────────────
  const prev = helpfulStore.get(reviewId) ?? 0;
  const next = prev + 1;
  helpfulStore.set(reviewId, next);

  // ── Revalidate the reviews cache ────────────────────────────────────────
  // This purges the 'use cache' entry tagged with tags.reviews(productId).
  // The parent server component will re-fetch fresh data on the next render,
  // passing the updated helpfulCounts as new props to ReviewLikes.
  // useOptimistic will then snap the displayed count to the authoritative value.
  if (productId) {
    revalidateTag(tags.reviews(productId), "seconds");
  }

  return { success: true, helpfulCount: next };
}
