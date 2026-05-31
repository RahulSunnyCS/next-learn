// ─── solutions/c17-form-state-machine/page.tsx ───────────────────────────────
//
// REFERENCE SOLUTION — C17 Client Form State-Machine.
//
// This is the complete challenge solution with full annotations.
// Compare it to your implementation after completing the tasks in spec.md.
//
// Key points this solution demonstrates:
//   1. The page itself is a fully static shell (no dynamic data).
//   2. CheckoutForm is a pure "use client" component — all state lives in
//      a useReducer on the client.
//   3. The Server Action is called via startTransition, not useActionState.
//   4. Server-returned field errors are dispatched into the reducer and
//      appear on the correct form fields.

import type { Metadata } from "next";
import CheckoutForm from "../(challenges)/c17-form-state-machine/_components/CheckoutForm";

export const metadata: Metadata = {
  title: "C17 — Form State-Machine (Solution)",
};

export default function C17SolutionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-green-600 mb-1">
          solutions/c17-form-state-machine
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Form State-Machine — Reference Solution
        </h1>
        <p className="text-gray-600 text-sm">
          Study this after filling in{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            _meta/defend-it.md
          </code>{" "}
          and committing your answers.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          The form below is the same{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &lt;CheckoutForm&gt;
          </code>{" "}
          component used in the challenge — re-imported here to avoid
          duplication.  Open{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            NOTES.md
          </code>{" "}
          for a full explanation of the state-machine design.
        </p>
      </div>

      {/* The same CheckoutForm — no separate solution copy needed since all
          the interesting logic lives in the reducer and action, which are
          already annotated in the challenge _lib directory.  The NOTES.md
          file is where the full explanation lives for the solution reader. */}
      <CheckoutForm />
    </div>
  );
}
