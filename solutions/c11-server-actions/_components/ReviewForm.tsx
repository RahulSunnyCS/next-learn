// ─── solutions/c11-server-actions/_components/ReviewForm.tsx ─────────────
//
// REFERENCE SOLUTION — ReviewForm with useActionState + useFormStatus.
//
// This is the complete working implementation.  The challenge version has
// the same structure but the instructor has intentionally left the key pieces
// for the learner to fill in.
//
// ARCHITECTURE:
//   ReviewForm (this file, "use client")
//     └── <form action={formAction}>
//           ├── [hidden input: productId]
//           ├── [rating input]
//           ├── [body textarea]
//           └── <SubmitButton />  ← "use client", useFormStatus lives here

"use client";

import { useActionState } from "react";
import { submitReview, type ReviewActionState } from "../_lib/actions";

// Inline SubmitButton for the reference solution — keeps the solution self-
// contained without requiring a separate file import.  The challenge version
// imports it from a sibling _components/SubmitButton.tsx.
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors",
        pending
          ? "bg-indigo-400 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700",
      ].join(" ")}
      aria-busy={pending}
    >
      {pending && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {pending ? "Submitting..." : "Submit Review"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ReviewActionState = {
  success: false,
  errors: {},
};

// ---------------------------------------------------------------------------
// ReviewForm
// ---------------------------------------------------------------------------

interface ReviewFormProps {
  productId: string;
}

export default function ReviewForm({ productId }: ReviewFormProps) {
  // useActionState wires the server action to this component.
  // - state: the return value of the action (or initialState before first submit).
  // - formAction: pass as <form action={...}> — works with AND without JS.
  // - isPending: true while the action is in-flight (JS-only enhancement).
  const [state, formAction, isPending] = useActionState(
    submitReview,
    initialState
  );

  if (state.success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center" role="status">
        <p className="text-2xl mb-2">Thanks for your review!</p>
        <p className="text-sm text-green-700 mb-4">
          revalidateTag has been called — scroll up to see the new review.
        </p>
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
          As <strong>Jamie Rivera (demo)</strong> &middot;{" "}
          <code className="font-mono">{productId}</code>
        </p>
      </div>

      {state.errors._form && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {state.errors._form}
        </div>
      )}

      {/*
        PROGRESSIVE ENHANCEMENT:
        <form action={formAction}> — when JS is disabled the browser sends a
        native multipart POST.  Next.js routes it to submitReview via the hidden
        $ACTION_ID field it injects automatically.  The action runs server-side;
        the page reloads with the new state as HTML.
        With JS: React intercepts, calls via fetch, updates state without reload.
      */}
      <form action={formAction} noValidate className="space-y-4">
        <input type="hidden" name="productId" value={productId} />

        <div>
          <label htmlFor="sol-rating" className="block text-sm font-medium text-gray-700 mb-1">
            Rating (1–5 stars)
          </label>
          <input
            id="sol-rating"
            name="rating"
            type="number"
            min="1"
            max="5"
            step="1"
            defaultValue={state.submittedValues?.rating ?? ""}
            placeholder="e.g. 4"
            className={[
              "w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
              state.errors.rating
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-indigo-300",
            ].join(" ")}
            aria-describedby={state.errors.rating ? "sol-rating-error" : undefined}
            aria-invalid={!!state.errors.rating}
          />
          {state.errors.rating && (
            <p id="sol-rating-error" className="mt-1 text-xs text-red-600" role="alert">
              {state.errors.rating}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sol-body" className="block text-sm font-medium text-gray-700 mb-1">
            Review
          </label>
          <textarea
            id="sol-body"
            name="body"
            rows={4}
            maxLength={1000}
            defaultValue={state.submittedValues?.body ?? ""}
            placeholder="Share your experience..."
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y",
              state.errors.body
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-indigo-300",
            ].join(" ")}
            aria-describedby={state.errors.body ? "sol-body-error" : undefined}
            aria-invalid={!!state.errors.body}
          />
          {state.errors.body && (
            <p id="sol-body-error" className="mt-1 text-xs text-red-600" role="alert">
              {state.errors.body}
            </p>
          )}
        </div>

        {isPending && (
          <p className="text-xs text-indigo-500" aria-live="polite">
            Saving your review...
          </p>
        )}

        {/* SubmitButton is inside the form so useFormStatus reads this form */}
        <SubmitButton />
      </form>
    </div>
  );
}
