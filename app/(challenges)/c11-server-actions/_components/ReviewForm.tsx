// ─── _components/ReviewForm.tsx — C11 Server Actions ────────────────────
//
// "use client" is required because:
//   1. useActionState is a client-side React hook that manages action state
//      across renders.
//   2. useFormStatus (used by <SubmitButton>) only works in Client Components.
//
// COMPONENT RESPONSIBILITY:
//   ReviewForm owns the form UI and wires the Server Action via useActionState.
//   It does NOT implement the pending button itself — that is delegated to
//   <SubmitButton> (a separate child component) so useFormStatus works
//   correctly.  See SubmitButton.tsx for the explanation.
//
// PROGRESSIVE ENHANCEMENT FLOW:
//   - JS disabled: browser sends a native multipart POST; Next.js calls the
//     action server-side; the page re-renders with the new state as HTML.
//     Errors and success messages appear as plain HTML — no JS needed.
//   - JS enabled: React intercepts the submit, calls the action via fetch,
//     updates only the affected parts of the UI (no full-page reload).

"use client";

import { useActionState } from "react";
import { submitReview, type ReviewActionState } from "../_lib/actions";
import SubmitButton from "./SubmitButton";

// ---------------------------------------------------------------------------
// Initial state — what useActionState starts with before any submission.
// ---------------------------------------------------------------------------

const initialState: ReviewActionState = {
  success: false,
  errors: {},
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReviewFormProps {
  productId: string;
}

// ---------------------------------------------------------------------------
// ReviewForm
// ---------------------------------------------------------------------------

/**
 * A product review form that demonstrates:
 *   1. Progressive enhancement — works without JavaScript via native form POST.
 *   2. useActionState — surfaces server-side validation errors inline.
 *   3. useFormStatus (in <SubmitButton>) — pending UI while action is in flight.
 *   4. revalidateTag — the action invalidates the review cache on success.
 */
export default function ReviewForm({ productId }: ReviewFormProps) {
  // useActionState wires the server action to this component.
  //
  // - `state`: the return value of the last action call (or initialState).
  // - `formAction`: pass this as the <form action={...}> prop.  When JS is
  //   enabled, React calls submitReview via fetch and updates state.  When JS
  //   is disabled the browser sends a native POST and the page re-renders.
  // - `isPending`: true while the action is in-flight (JS-only).
  const [state, formAction, isPending] = useActionState(
    submitReview,
    initialState
  );

  // On success we show a thank-you panel instead of the form.
  if (state.success) {
    return (
      <div
        className="rounded-xl border border-green-200 bg-green-50 p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-2xl mb-2">Thanks for your review!</p>
        <p className="text-sm text-green-700 mb-4">
          Your review has been added and the page cache has been revalidated.
          Scroll up to see it in the list.
        </p>
        {/* Reload button lets the user leave another review if they wish. */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
        >
          Leave another review
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-lg">Write a Review</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Submitting as <strong>Jamie Rivera (demo)</strong> &middot; productId:{" "}
          <code className="font-mono">{productId}</code>
        </p>
      </div>

      {/* Top-level form error (unexpected / data layer failures) */}
      {state.errors._form && (
        <div
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.errors._form}
        </div>
      )}

      {/*
        The <form> action points to `formAction` (the bound server action).

        PROGRESSIVE ENHANCEMENT KEY:
          When JS is disabled the browser ignores `formAction` (which is a
          function reference the browser doesn't understand) and falls back to
          the native form POST behaviour.  Next.js injects a hidden
          `$ACTION_ID` input so it can route the POST to the correct action
          function on the server.

          This means: the form works as a plain HTML form at its baseline.
          No JavaScript is required for the mutation to succeed.
      */}
      <form action={formAction} noValidate className="space-y-4">
        {/*
          Hidden input passes productId through the form submission.
          On the server, FormData.get("productId") returns this value.
          This is safe because the action validates it server-side.
        */}
        <input type="hidden" name="productId" value={productId} />

        {/* Rating field */}
        <div>
          <label
            htmlFor="rating"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Rating (1–5 stars)
          </label>
          <input
            id="rating"
            name="rating"
            type="number"
            min="1"
            max="5"
            step="1"
            // Repopulate the field after a validation error so the user
            // doesn't have to retype.  `defaultValue` is the right prop
            // for uncontrolled inputs — not `value` (which would require
            // onChange to avoid a React warning).
            defaultValue={state.submittedValues?.rating ?? ""}
            placeholder="e.g. 4"
            className={[
              "w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
              state.errors.rating
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-indigo-300",
            ].join(" ")}
            // aria-describedby links the input to the error message for
            // screen readers.
            aria-describedby={
              state.errors.rating ? "rating-error" : undefined
            }
            aria-invalid={!!state.errors.rating}
          />
          {state.errors.rating && (
            <p id="rating-error" className="mt-1 text-xs text-red-600" role="alert">
              {state.errors.rating}
            </p>
          )}
        </div>

        {/* Body field */}
        <div>
          <label
            htmlFor="body"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Review
          </label>
          <textarea
            id="body"
            name="body"
            rows={4}
            maxLength={1000}
            defaultValue={state.submittedValues?.body ?? ""}
            placeholder="Share your experience with this product..."
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y",
              state.errors.body
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-indigo-300",
            ].join(" ")}
            aria-describedby={state.errors.body ? "body-error" : undefined}
            aria-invalid={!!state.errors.body}
          />
          {state.errors.body && (
            <p id="body-error" className="mt-1 text-xs text-red-600" role="alert">
              {state.errors.body}
            </p>
          )}
        </div>

        {/* Pending hint — visible to screen readers even before the button text changes */}
        {isPending && (
          <p className="text-xs text-indigo-500" aria-live="polite">
            Saving your review...
          </p>
        )}

        {/*
          SubmitButton is a separate child component so useFormStatus works.
          See SubmitButton.tsx for the full explanation.
        */}
        <SubmitButton label="Submit Review" pendingLabel="Submitting..." />
      </form>
    </div>
  );
}
