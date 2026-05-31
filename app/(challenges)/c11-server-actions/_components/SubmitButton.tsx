// ─── _components/SubmitButton.tsx — C11 Server Actions ──────────────────
//
// "use client" is required because useFormStatus is a React hook that reads
// per-render browser state — it cannot run on the server.
//
// WHY A SEPARATE COMPONENT?
//   useFormStatus() reads the pending state from the CLOSEST ENCLOSING <form>.
//   It must be called in a component that is rendered INSIDE the <form>, not
//   in the same component that renders the <form> element.  If you call
//   useFormStatus() in the parent that owns the <form>, you get the outer
//   form's state (none) instead of the inner form's state.
//
//   Pattern: always put useFormStatus in a small child component like this one,
//   then render it as a child of the <form>.

"use client";

import { useFormStatus } from "react-dom";

// ---------------------------------------------------------------------------
// SubmitButton
// ---------------------------------------------------------------------------

interface SubmitButtonProps {
  label?: string;
  pendingLabel?: string;
}

/**
 * A submit button that disables itself and shows a pending label while the
 * enclosing form's Server Action is in flight.
 *
 * Usage:
 *   <form action={action}>
 *     ...
 *     <SubmitButton label="Submit Review" pendingLabel="Submitting..." />
 *   </form>
 *
 * This must be rendered INSIDE the <form> (as a child/descendant) so that
 * useFormStatus can see the form's context.
 */
export default function SubmitButton({
  label = "Submit",
  pendingLabel = "Submitting...",
}: SubmitButtonProps) {
  // useFormStatus reads the pending state of the closest ancestor <form>.
  // `pending` is true while the Server Action is executing (the action is
  // in-flight between the client POST and the server response).
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      // Disabled when pending so the user cannot double-submit.
      // Also disabled during pending so the visual state is clear.
      disabled={pending}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold",
        "text-white transition-colors",
        pending
          ? "bg-indigo-400 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800",
      ].join(" ")}
      // aria-busy gives assistive technology a live status update.
      aria-busy={pending}
    >
      {pending && (
        // Spinner: a simple CSS-animated ring using Tailwind animate-spin.
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}
