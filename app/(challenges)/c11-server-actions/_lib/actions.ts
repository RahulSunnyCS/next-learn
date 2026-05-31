// ─── _lib/actions.ts — C11 Server Actions ───────────────────────────────
//
// "use server" at the FILE LEVEL means every exported function in this
// module is a Server Action.  File-level is preferred over function-level
// when you have multiple actions in one file — you only write the directive
// once and it applies to all exports.
//
// SECURITY NOTE (intentional deferral):
//   This action does NOT check authentication or ownership.  It uses a
//   hard-coded demo user so the challenge can focus on the Server Action
//   mechanics.  Authentication + ownership checks are added in C12 (T-14).
//   See spec.md for the full rationale.
//
// PUBLIC ENDPOINT WARNING:
//   Every Server Action is a real POST endpoint at runtime.  Input MUST be
//   validated server-side because client-side HTML validation (required,
//   min, max) is trivially bypassed.  This file validates all fields before
//   calling the data layer.

"use server";

import { revalidateTag } from "next/cache";
import { addReview } from "@/lib/data";
import { tags } from "@/lib/data";

// ---------------------------------------------------------------------------
// Action state type
// ---------------------------------------------------------------------------

// This is the shape returned by the action on every call — success or failure.
// useActionState on the client starts with the initialState and updates it
// with whatever the action returns.
export interface ReviewActionState {
  success: boolean;
  // Field-level errors — keys match the FormData field names.
  errors: {
    productId?: string;
    rating?: string;
    body?: string;
    _form?: string; // top-level / unexpected errors
  };
  // Echo the submitted values back so the form can repopulate on error
  // (important for the no-JS path where the form re-renders from scratch).
  submittedValues?: {
    rating: string;
    body: string;
  };
}

// The demo user ID.  In C12 this is replaced with the authenticated session
// user.  We use buyer-1 so addReview has a valid userId in the store.
const DEMO_USER_ID = "u-buyer-1";
const DEMO_AUTHOR_NAME = "Jamie Rivera (demo)";

// ---------------------------------------------------------------------------
// submitReview — the main Server Action
// ---------------------------------------------------------------------------

/**
 * Server Action: validate and persist a product review.
 *
 * Signature follows the useActionState convention:
 *   - First arg: prevState (the state from the previous call, or initialState).
 *   - Second arg: formData (the FormData from the <form> submission).
 *   - Return value: the new ReviewActionState that replaces prevState on the client.
 *
 * This signature is required for useActionState because React needs to pass
 * the previous state into the action so it can distinguish "first render"
 * from "after a submission".
 *
 * PROGRESSIVE ENHANCEMENT:
 *   When JS is disabled the browser sends a native multipart POST.  Next.js
 *   invokes this action with the FormData and then re-renders the page.
 *   The returned state (errors or success) is available server-side so the
 *   page can show validation messages even without JS.
 */
export async function submitReview(
  prevState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  // ── Read raw values from FormData ──────────────────────────────────────
  // FormData.get() always returns string | File | null.  We coerce to string
  // and trim whitespace immediately so downstream validation is clean.
  const productId = (formData.get("productId") as string | null)?.trim() ?? "";
  const ratingRaw = (formData.get("rating") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";

  // Echo submitted values back in the returned state so the form can
  // repopulate on validation error (especially important without JS).
  const submittedValues = { rating: ratingRaw, body };

  // ── Server-side validation ─────────────────────────────────────────────
  // This runs on the server regardless of what the browser sent.  Do not
  // trust HTML 'required', 'min', or 'max' attributes as sole validation.
  const errors: ReviewActionState["errors"] = {};

  if (!productId) {
    errors.productId = "Product ID is required.";
  }

  const rating = parseInt(ratingRaw, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    errors.rating = "Rating must be a whole number between 1 and 5.";
  }

  if (!body || body.length < 5) {
    errors.body = "Review must be at least 5 characters.";
  }

  if (body.length > 1000) {
    errors.body = "Review must be 1000 characters or fewer.";
  }

  // Return early if any field failed validation — no mutation occurs.
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, submittedValues };
  }

  // ── Persist the review ─────────────────────────────────────────────────
  // We call addReview from @/lib/data through this local wrapper so the
  // challenge does not edit lib/data directly (per the task contract).
  // Any unexpected error from the data layer is caught and surfaced as a
  // top-level form error so the UI doesn't crash silently.
  try {
    await addReview({
      productId,
      userId: DEMO_USER_ID,
      authorName: DEMO_AUTHOR_NAME,
      rating,
      body,
    });
  } catch (err) {
    // Log the real error server-side (never send raw stack traces to the client).
    console.error("[submitReview] data layer error:", err);
    return {
      success: false,
      errors: { _form: "Could not save your review. Please try again." },
      submittedValues,
    };
  }

  // ── Revalidate the cache ───────────────────────────────────────────────
  // revalidateTag purges all 'use cache' entries tagged with this string.
  // The ReviewList component in page.tsx uses 'use cache' with
  // cacheTag(tags.reviews(productId)), so this call makes the next render
  // of that component fetch fresh data from the store.
  //
  // NOTE: In Next.js 16, revalidateTag requires a second "profile" argument
  // specifying how long the revalidated data should be cached before the next
  // automatic re-fetch.  We use "seconds" to avoid a long-lived cache after
  // invalidation — reviews are user-generated and should appear promptly.
  revalidateTag(tags.reviews(productId), "seconds");

  return { success: true, errors: {} };
}
