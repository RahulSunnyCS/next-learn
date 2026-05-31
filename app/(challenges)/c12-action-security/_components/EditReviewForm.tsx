"use client";
// ─── app/(challenges)/c12-action-security/_components/EditReviewForm.tsx ─────
//
// Client-side form that invokes the hardened editReview Server Action.
//
// DESIGN NOTES:
//
// 1. "use client" is required because this component uses useActionState (a
//    React hook for managing Server Action state) and useRef (for the form).
//    Server Components cannot use hooks.
//
// 2. The form calls the Server Action via useActionState rather than a raw
//    form action to get typed return value handling.  useActionState wraps
//    the action and gives us the last return value as `state`.
//
// 3. Client-side validation here is UX convenience only — the Server Action
//    independently validates via Zod.  If a user bypasses the browser form
//    (e.g. DevTools or curl), the server guard still fires.
//
// 4. reviewId is a hidden field — the user never sees it, but it is still
//    validated on the server (existence + ownership).  The note in the
//    verification.md asks learners to manipulate it with DevTools to experience
//    the Forbidden response.

import { useActionState, useRef } from "react";
import type { Review } from "@/lib/data";
import type { EditReviewResult } from "../_lib/actions";
import { editReview } from "../_lib/actions";

interface Props {
  review: Review;
}

// Initial state (no action has run yet).
const initialState: EditReviewResult | null = null;

// Adapter wraps editReview so it matches useActionState's (prevState, formData)
// signature.  We read the three fields from FormData and call the typed action.
async function editReviewAction(
  _prevState: EditReviewResult | null,
  formData: FormData
): Promise<EditReviewResult> {
  const reviewId = formData.get("reviewId") as string;
  // rating arrives as a string from FormData — convert to number.
  const ratingRaw = formData.get("rating");
  const rating = typeof ratingRaw === "string" ? Number(ratingRaw) : NaN;
  const body = formData.get("body") as string;

  return editReview(reviewId, rating, body);
}

export function EditReviewForm({ review }: Props) {
  const [state, formAction, isPending] = useActionState(editReviewAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Hidden field: the reviewId the action will look up and ownership-check */}
      <input type="hidden" name="reviewId" value={review.id} />

      {/* Rating selector */}
      <div>
        <label
          htmlFor={`rating-${review.id}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Rating (1–5)
        </label>
        <select
          id={`rating-${review.id}`}
          name="rating"
          defaultValue={review.rating}
          className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          required
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} ★
            </option>
          ))}
        </select>
      </div>

      {/* Body textarea */}
      <div>
        <label
          htmlFor={`body-${review.id}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Review text
        </label>
        <textarea
          id={`body-${review.id}`}
          name="body"
          defaultValue={review.body}
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          required
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving…" : "Save edit"}
      </button>

      {/* Result feedback */}
      {state && (
        <div
          role="alert"
          className={`rounded-md px-4 py-3 text-sm ${
            state.ok
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {state.ok ? (
            <span>Review updated successfully.</span>
          ) : (
            <>
              <span className="font-semibold">{state.error}</span>
              {state.issues && state.issues.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {state.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}
