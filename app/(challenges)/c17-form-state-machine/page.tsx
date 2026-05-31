// ─── app/(challenges)/c17-form-state-machine/page.tsx ───────────────────────
//
// C17 — Client Form State-Machine challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page is a FULLY STATIC SHELL.  The checkout form is an entirely
//   client-side component — it has no dynamic server data (no cookies, no
//   headers, no uncached reads from lib/data).  The form component is a
//   "use client" leaf that runs entirely in the browser after hydration.
//
//   Because there is no dynamic server data, the page does NOT need a
//   <Suspense> boundary for the form itself.  The Server Action is invoked
//   from client code (inside startTransition) and its result flows back
//   into the client reducer — the server side of the action never touches
//   the page render.  This makes the page a clean ○ (Static) route.
//
//   There are NO `export const dynamic` or similar route-segment config
//   exports — those are incompatible with cacheComponents.

import type { Metadata } from "next";
import CheckoutForm from "./_components/CheckoutForm";

export const metadata: Metadata = {
  title: "C17 — Client Form State-Machine",
};

// ---------------------------------------------------------------------------
// Page (static shell)
// ---------------------------------------------------------------------------

export default function C17FormStateMachinePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c17-form-state-machine</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Client Form State-Machine
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          A multi-field checkout form managed by an explicit{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">useReducer</code>{" "}
          state machine — with cross-field validation, dirty tracking, and
          server-error merging.
        </p>
      </div>

      {/* ── STATIC SHELL: concept explainer ── */}
      <ConceptExplainer />

      {/* ── STATIC SHELL: the form (pure client component, no dynamic data) ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-900 text-lg">
          Live Demo — Checkout Form
        </h2>
        <CheckoutForm />
      </section>

      {/* ── STATIC SHELL: cross-field validation explainer ── */}
      <CrossFieldExplainer />

      {/* ── STATIC SHELL: dirty tracking explainer ── */}
      <DirtyTrackingExplainer />

      {/* ── STATIC SHELL: server error merging explainer ── */}
      <ServerErrorMergingExplainer />

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c17-form-state-machine/_meta/defend-it.md
          </code>{" "}
          with your answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c17-form-state-machine/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static explainer sections
// ---------------------------------------------------------------------------

function ConceptExplainer() {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3 text-sm text-indigo-900">
      <h2 className="font-semibold text-base">
        Why a state machine for a form?
      </h2>
      <p>
        A checkout form has too many interacting concerns to manage well with
        scattered{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">useState</code>{" "}
        calls: field values, per-field dirty flags, validation errors (which
        may come from the client OR the server), and a lifecycle with distinct
        phases (idle → editing → submitting → success/error).
      </p>
      <p>
        A{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">useReducer</code>{" "}
        state machine centralises all transitions.  Each phase is an explicit
        state; each user or server event is a typed action.  Illegal transitions
        are impossible by construction — you cannot be both &quot;submitting&quot;
        and &quot;idle&quot; at the same time.
      </p>
      <div className="rounded-lg bg-indigo-100 p-3 font-mono text-xs leading-loose text-indigo-800 overflow-x-auto">
        <span className="text-indigo-400">{`// State topology`}</span>
        <br />
        {`idle → editing → validating → submitting → success`}
        <br />
        {`            ↑                      ↓`}
        <br />
        {`            └──── error (merge server errors) ──┘`}
      </div>
    </section>
  );
}

function CrossFieldExplainer() {
  return (
    <section className="rounded-xl border border-purple-100 bg-purple-50 p-5 space-y-3 text-sm text-purple-900">
      <h2 className="font-semibold text-base">Cross-field validation</h2>
      <p>
        The &ldquo;Send as a gift&rdquo; checkbox + gift message field demonstrate
        a cross-field rule: <strong>field B is required only when field A is
        checked.</strong>  Try it — check the box, then submit without filling
        the message.
      </p>
      <p>
        Per-field validation cannot express this rule without reaching outside
        its own scope.  The reducer receives both values at once and can evaluate
        the rule in a single pass.  The same pass runs on every keystroke so
        the error appears and disappears live.
      </p>
      <div className="rounded-lg bg-purple-100 p-3 font-mono text-xs leading-relaxed text-purple-800 overflow-x-auto">
        <span className="text-purple-400">{`// In form-reducer.ts — validateValues()`}</span>
        <br />
        {`if (values.isGift && !values.giftMessage.trim()) {`}
        <br />
        {`  errors.giftMessage = "Gift message is required…";`}
        <br />
        {`}`}
      </div>
      <p>
        The Zod schema in the server action independently enforces the same rule
        via <code className="font-mono text-xs bg-purple-100 rounded px-1">.superRefine()</code> —
        the server never trusts that the client already ran its validation.
      </p>
    </section>
  );
}

function DirtyTrackingExplainer() {
  return (
    <section className="rounded-xl border border-teal-100 bg-teal-50 p-5 space-y-3 text-sm text-teal-900">
      <h2 className="font-semibold text-base">Dirty tracking</h2>
      <p>
        The form tracks which fields have been modified.  The submit button is
        disabled until at least one field is dirty (preventing accidental double-
        submits on a still-pristine form).  The &ldquo;Unsaved changes&rdquo;
        badge in the form header warns you when there is work not yet submitted.
      </p>
      <p>
        Per-field dirty tracking (not just a single boolean) lets you build
        richer UX: highlight only the fields the user has touched, or gate
        navigation with a &ldquo;You have unsaved changes — are you sure?&rdquo;
        warning.
      </p>
      <div className="rounded-lg bg-teal-100 p-3 font-mono text-xs leading-relaxed text-teal-800 overflow-x-auto">
        <span className="text-teal-400">{`// In formReducer — SET_FIELD case`}</span>
        <br />
        {`dirtyFields: { ...state.dirtyFields, [field]: true }`}
        <br />
        <br />
        <span className="text-teal-400">{`// Submit disabled when:`}</span>
        <br />
        {`!hasDirtyFields(state.dirtyFields) || !state.isValid`}
      </div>
    </section>
  );
}

function ServerErrorMergingExplainer() {
  return (
    <section className="rounded-xl border border-rose-100 bg-rose-50 p-5 space-y-3 text-sm text-rose-900">
      <h2 className="font-semibold text-base">
        Server error merging (the hard part)
      </h2>
      <p>
        Client validation catches format errors instantly.  But some checks
        require server context — &ldquo;is this email already taken?&rdquo;,
        &ldquo;does this postcode exist in our system?&rdquo;  Those come back
        as field-level errors from the Server Action.
      </p>
      <p>
        When the server returns{" "}
        <code className="font-mono text-xs bg-rose-100 rounded px-1">
          {`{ fieldErrors: { email: "already taken" } }`}
        </code>
        , the client dispatches a{" "}
        <code className="font-mono text-xs bg-rose-100 rounded px-1">SERVER_ERRORS</code>{" "}
        action.  The reducer merges those errors on top of the existing
        fieldErrors — so a server error on <code className="font-mono text-xs bg-rose-100 rounded px-1">email</code>{" "}
        shows up under the email field, not in a generic banner.  Status reverts
        to <code className="font-mono text-xs bg-rose-100 rounded px-1">&quot;error&quot;</code>{" "}
        so the user can fix the fields.
      </p>
      <div className="rounded-lg bg-rose-100 p-3 font-mono text-xs leading-relaxed text-rose-800 overflow-x-auto">
        <span className="text-rose-400">{`// SERVER_ERRORS case in the reducer`}</span>
        <br />
        {`fieldErrors: {`}
        <br />
        {`  ...state.fieldErrors,   // keep client errors`}
        <br />
        {`  ...action.fieldErrors,  // override with server errors`}
        <br />
        {`}`}
      </div>
      <p>
        Test it: fill all fields correctly, then use email{" "}
        <code className="font-mono text-xs bg-rose-100 rounded px-1">taken@example.com</code>{" "}
        or postcode{" "}
        <code className="font-mono text-xs bg-rose-100 rounded px-1">XX99 9XX</code>{" "}
        to trigger a server-side field error after the client validation passes.
      </p>
    </section>
  );
}
