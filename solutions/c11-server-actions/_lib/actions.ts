// ─── solutions/c11-server-actions/_lib/actions.ts ────────────────────────
//
// REFERENCE SOLUTION — Server Actions: submit a product review.
//
// KEY CONCEPTS DEMONSTRATED:
//   1. "use server" at file level marks all exports as Server Actions.
//   2. submitReview accepts (prevState, formData) — the useActionState signature.
//   3. All inputs are validated server-side before any mutation.
//   4. revalidateTag purges the cached review list after a successful write.
//
// SECURITY NOTE:
//   Authentication + ownership check are intentionally absent — deferred to
//   C12.  This solution teaches the mechanics; C12 adds the guards.
//
// COMPARISON: SERVER ACTION vs ROUTE HANDLER
//   Use a Server Action when:
//     - Mutating in response to an HTML form (progressive enhancement matters).
//     - The mutation is scoped to one UI component.
//     - You want to revalidate the cache in the same call.
//   Use a Route Handler when:
//     - An external client (mobile app, webhook, third-party) calls the endpoint.
//     - You need full HTTP response control (status codes, CORS, streaming).
//     - The payload is not form data (raw JSON body, binary upload).

"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import { addReview, tags } from "@/lib/data";

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

export interface ReviewActionState {
  success: boolean;
  errors: {
    productId?: string;
    rating?: string;
    body?: string;
    _form?: string;
  };
  // Echo submitted values so the form can repopulate on validation error
  // (critical for the no-JS path: the form re-renders as plain HTML).
  submittedValues?: {
    rating: string;
    body: string;
  };
}

const DEMO_USER_ID = "u-buyer-1";
const DEMO_AUTHOR_NAME = "Jamie Rivera (demo)";

// ---------------------------------------------------------------------------
// submitReview
// ---------------------------------------------------------------------------

/**
 * Server Action — validate and persist a product review.
 *
 * Follows the useActionState signature:
 *   (prevState: State, formData: FormData) => Promise<State>
 *
 * PROGRESSIVE ENHANCEMENT:
 *   This action is used as <form action={submitReview}>.  When JS is disabled
 *   the browser sends a native multipart POST; Next.js invokes this function
 *   server-side and re-renders the page with the returned state.  No JS needed
 *   for the mutation to succeed — the HTML form baseline just works.
 */
export async function submitReview(
  _prevState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  const productId = (formData.get("productId") as string | null)?.trim() ?? "";
  const ratingRaw = (formData.get("rating") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";

  const submittedValues = { rating: ratingRaw, body };
  const errors: ReviewActionState["errors"] = {};

  // ── Validate ──────────────────────────────────────────────────────────
  // Server-side validation is mandatory.  Client HTML constraints (required,
  // min, max) are UX helpers only — a raw POST bypasses them entirely.

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

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, submittedValues };
  }

  // ── Persist ───────────────────────────────────────────────────────────
  try {
    await addReview({
      productId,
      userId: DEMO_USER_ID,
      authorName: DEMO_AUTHOR_NAME,
      rating,
      body,
    });
  } catch (err) {
    console.error("[submitReview] addReview error:", err);
    return {
      success: false,
      errors: { _form: "Could not save your review. Please try again." },
      submittedValues,
    };
  }

  // ── Revalidate ────────────────────────────────────────────────────────
  // revalidateTag purges all 'use cache' entries tagged with this string.
  // The ReviewPanel's getCachedReviews helper tags its cache entry with
  // tags.reviews(productId), so the next render fetches fresh data.
  //
  // NOTE: In Next.js 16, revalidateTag requires a second "profile" argument.
  // "seconds" means the revalidated data gets a short TTL — appropriate for
  // user-generated content that should appear promptly after submission.
  revalidateTag(tags.reviews(productId), "seconds");

  // revalidatePath as a belt-and-suspenders fallback: if any other part of
  // the page cached review counts or summaries without a tag, this clears it.
  revalidatePath("/challenges/c11-server-actions");

  return { success: true, errors: {} };
}
