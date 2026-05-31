// ─── _components/CheckoutForm.tsx — C17 Client Form State-Machine ───────────
//
// "use client" because this component:
//   - Uses useReducer (state machine).
//   - Uses useTransition (wraps the Server Action call).
//   - Drives controlled inputs (value + onChange).
//
// ARCHITECTURE:
//   All form state — values, dirty tracking, errors, submission status —
//   lives in a single useReducer.  There is NO useState anywhere in this
//   component for form concerns.  This is the key teaching.
//
// WHY startTransition + formAction INSTEAD OF useActionState?
//   We manage state ourselves via the reducer.  useActionState replaces your
//   state with the action's return value on every call, which would fight our
//   reducer.  Instead:
//     1. The user submits → we dispatch SUBMIT (reducer → "submitting").
//     2. We call the server action inside startTransition.
//     3. The server returns a typed result.
//     4. We dispatch SERVER_ERRORS or SUCCESS into the reducer.
//   This keeps the server action result flowing INTO the reducer, not around it.
//
// CONTROLLED INPUTS:
//   Unlike the simpler C11 form (which used defaultValue + uncontrolled), this
//   form uses controlled inputs (value={state.values.foo}).  Controlled inputs
//   are needed here because:
//   - We need to read all values at validation time without querying the DOM.
//   - The reducer's values are the single source of truth.
//   - Live validation (error-as-you-type) requires reading the current value.

"use client";

import { useReducer, useTransition, useCallback, useId } from "react";
import {
  formReducer,
  INITIAL_STATE,
  hasDirtyFields,
  type FieldName,
  type FormValues,
} from "../_lib/form-reducer";
import { submitCheckout } from "../_lib/actions";

// ---------------------------------------------------------------------------
// Helper: field container with label, input, and error message
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}

function Field({ label, id, error, children, required, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        {hint && (
          <span className="text-xs text-gray-400 ml-1 font-normal">{hint}</span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: a standard text input with error-aware styling
// ---------------------------------------------------------------------------

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  error?: string;
}

function Input({ id, error, className = "", ...rest }: InputProps) {
  const base =
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition";
  const style = error
    ? "border-red-400 focus:ring-red-300 bg-red-50"
    : "border-gray-300 focus:ring-indigo-300 bg-white";
  return (
    <input
      id={id}
      className={`${base} ${style} ${className}`}
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={!!error}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CheckoutForm() {
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);

  // useTransition lets us call the Server Action without blocking the UI.
  // isPending is true while the action is in-flight — we use it to show a
  // spinner on the submit button.  Note: state.status === "submitting" is
  // our reducer's concept; isPending is React's concurrent transition concept.
  // They should be in sync: we dispatch SUBMIT before calling the action,
  // and dispatch SUCCESS/SERVER_ERRORS when it returns.
  const [isTransitionPending, startTransition] = useTransition();

  // Stable ID prefix for label/input pairing (avoids SSR/CSR mismatch).
  const uid = useId();
  const id = (field: string) => `${uid}-${field}`;

  // ── Field change handler ──────────────────────────────────────────────────

  // Generic change handler for text inputs — dispatches SET_FIELD.
  // Using useCallback so it doesn't re-create on every render (minor
  // optimisation — the main benefit is clarity that it's stable).
  const handleChange = useCallback(
    (field: FieldName) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        dispatch({ type: "SET_FIELD", field, value: e.target.value });
      },
    []
  );

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_FIELD", field: "isGift", value: e.target.checked });
    },
    []
  );

  // ── Submit handler ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Guard: only submit when valid and dirty.  The button is already
      // disabled in these cases; this is a safety check for keyboard users.
      if (!state.isValid || !hasDirtyFields(state.dirtyFields)) {
        dispatch({ type: "VALIDATE" }); // surface all errors visually
        return;
      }

      // Transition to "submitting" in the state machine.
      dispatch({ type: "SUBMIT" });

      // Build FormData from the current controlled state (not from the DOM
      // form element) so the server receives exactly what the reducer holds.
      // This avoids any DOM-vs-reducer drift.
      const fd = new FormData();
      const v: FormValues = state.values;
      fd.set("fullName", v.fullName);
      fd.set("email", v.email);
      fd.set("phone", v.phone);
      fd.set("address", v.address);
      fd.set("city", v.city);
      fd.set("postcode", v.postcode);
      fd.set("cardNumber", v.cardNumber);
      fd.set("cardExpiry", v.cardExpiry);
      fd.set("cardCvc", v.cardCvc);
      if (v.isGift) fd.set("isGift", "on");
      if (v.giftMessage) fd.set("giftMessage", v.giftMessage);

      // Call the server action inside startTransition so React doesn't
      // block concurrent renders while waiting for the network.
      startTransition(async () => {
        try {
          const result = await submitCheckout(fd);
          if (result.outcome === "success") {
            dispatch({ type: "SUCCESS" });
          } else if (result.outcome === "field-errors") {
            // MERGING SERVER ERRORS: dispatch SERVER_ERRORS so the reducer
            // merges returned field errors into state.fieldErrors and shows
            // them on the correct fields.  This is the key teaching moment.
            dispatch({
              type: "SERVER_ERRORS",
              fieldErrors: result.fieldErrors ?? {},
              formError: result.formError ?? null,
            });
          } else {
            dispatch({
              type: "SERVER_ERRORS",
              fieldErrors: {},
              formError: result.formError ?? "An unexpected error occurred.",
            });
          }
        } catch {
          dispatch({
            type: "SERVER_ERRORS",
            fieldErrors: {},
            formError: "Network error — please check your connection and try again.",
          });
        }
      });
    },
    [state, startTransition]
  );

  // ── Success screen ────────────────────────────────────────────────────────

  if (state.status === "success") {
    return (
      <div
        className="rounded-xl border border-green-200 bg-green-50 p-8 text-center space-y-3"
        role="status"
        aria-live="polite"
      >
        <div className="text-4xl">Order placed!</div>
        <p className="text-green-800 font-medium">
          Your checkout was processed successfully.
        </p>
        <p className="text-sm text-green-700">
          In a real store you would be redirected to a confirmation page.
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET" })}
          className="mt-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
        >
          Start over (reset form)
        </button>
      </div>
    );
  }

  // ── Derived UI state ───────────────────────────────────────────────────────

  const dirty = hasDirtyFields(state.dirtyFields);
  const isSubmitting = state.status === "submitting" || isTransitionPending;
  // Disable submit when: not dirty, not valid, or currently submitting.
  const submitDisabled = !dirty || !state.isValid || isSubmitting;

  const v = state.values;
  const e = state.fieldErrors;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
      aria-label="Checkout form"
    >
      {/* ── State-machine status badge (educational — shows the current state) ─ */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-mono">state:</span>
        <StatusBadge status={state.status} />
        {dirty && (
          <span className="ml-2 text-xs text-amber-600 font-medium">
            Unsaved changes
          </span>
        )}
      </div>

      {/* ── Top-level form error ──────────────────────────────────────────── */}
      {state.formError && (
        <div
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.formError}
        </div>
      )}

      {/* ══ SECTION 1: Delivery details ══════════════════════════════════════ */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Delivery details</h3>

        <Field label="Full name" id={id("fullName")} error={e.fullName} required>
          <Input
            id={id("fullName")}
            name="fullName"
            type="text"
            autoComplete="name"
            value={v.fullName}
            onChange={handleChange("fullName")}
            placeholder="Jamie Rivera"
            error={e.fullName}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" id={id("email")} error={e.email} required>
            <Input
              id={id("email")}
              name="email"
              type="email"
              autoComplete="email"
              value={v.email}
              onChange={handleChange("email")}
              placeholder="you@example.com"
              error={e.email}
            />
          </Field>

          <Field
            label="Phone"
            id={id("phone")}
            error={e.phone}
            hint="(optional)"
          >
            <Input
              id={id("phone")}
              name="phone"
              type="tel"
              autoComplete="tel"
              value={v.phone}
              onChange={handleChange("phone")}
              placeholder="+1 555 000 0000"
              error={e.phone}
            />
          </Field>
        </div>

        <Field label="Street address" id={id("address")} error={e.address} required>
          <Input
            id={id("address")}
            name="address"
            type="text"
            autoComplete="street-address"
            value={v.address}
            onChange={handleChange("address")}
            placeholder="123 Main Street"
            error={e.address}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="City" id={id("city")} error={e.city} required>
            <Input
              id={id("city")}
              name="city"
              type="text"
              autoComplete="address-level2"
              value={v.city}
              onChange={handleChange("city")}
              placeholder="London"
              error={e.city}
            />
          </Field>

          <Field label="Postcode" id={id("postcode")} error={e.postcode} required>
            <Input
              id={id("postcode")}
              name="postcode"
              type="text"
              autoComplete="postal-code"
              value={v.postcode}
              onChange={handleChange("postcode")}
              placeholder="SW1A 1AA"
              error={e.postcode}
            />
          </Field>
        </div>
      </section>

      {/* ══ SECTION 2: Payment details ════════════════════════════════════════ */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Payment details</h3>

        <Field label="Card number" id={id("cardNumber")} error={e.cardNumber} required>
          <Input
            id={id("cardNumber")}
            name="cardNumber"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={v.cardNumber}
            onChange={handleChange("cardNumber")}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            error={e.cardNumber}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Expiry"
            id={id("cardExpiry")}
            error={e.cardExpiry}
            required
            hint="MM/YY"
          >
            <Input
              id={id("cardExpiry")}
              name="cardExpiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={v.cardExpiry}
              onChange={handleChange("cardExpiry")}
              placeholder="09/27"
              maxLength={5}
              error={e.cardExpiry}
            />
          </Field>

          <Field label="CVC" id={id("cardCvc")} error={e.cardCvc} required>
            <Input
              id={id("cardCvc")}
              name="cardCvc"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={v.cardCvc}
              onChange={handleChange("cardCvc")}
              placeholder="123"
              maxLength={4}
              error={e.cardCvc}
            />
          </Field>
        </div>
      </section>

      {/* ══ SECTION 3: Gift options (cross-field validation demo) ═════════════
          This section demonstrates the cross-field rule:
          the giftMessage field is only required when isGift is checked.
          Notice how the error appears/disappears as you check/uncheck isGift.
      */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <input
            id={id("isGift")}
            name="isGift"
            type="checkbox"
            checked={v.isGift}
            onChange={handleCheckboxChange}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
          />
          <label htmlFor={id("isGift")} className="text-sm font-medium text-gray-700">
            Send as a gift
          </label>
        </div>

        {/* Gift message — only shown AND only required when isGift is true.
            This is the canonical cross-field dependency example. */}
        {v.isGift && (
          <Field
            label="Gift message"
            id={id("giftMessage")}
            error={e.giftMessage}
            required
          >
            <textarea
              id={id("giftMessage")}
              name="giftMessage"
              value={v.giftMessage}
              onChange={handleChange("giftMessage")}
              rows={3}
              maxLength={200}
              placeholder="Happy birthday! Hope you enjoy this..."
              className={[
                "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y transition",
                e.giftMessage
                  ? "border-red-400 focus:ring-red-300 bg-red-50"
                  : "border-gray-300 focus:ring-indigo-300 bg-white",
              ].join(" ")}
              aria-describedby={e.giftMessage ? `${id("giftMessage")}-error` : undefined}
              aria-invalid={!!e.giftMessage}
            />
            <p className="text-xs text-gray-400 mt-1">
              {v.giftMessage.length} / 200 characters
            </p>
          </Field>
        )}
      </section>

      {/* ══ Submit area ═════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitDisabled}
          className={[
            "rounded-lg px-6 py-2.5 text-sm font-semibold transition",
            submitDisabled
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300",
          ].join(" ")}
        >
          {isSubmitting ? "Placing order…" : "Place order"}
        </button>

        {/* Explain why submit is disabled — educational for the learner. */}
        {!dirty && state.status !== "idle" && (
          <p className="text-xs text-gray-400">
            No changes to submit.
          </p>
        )}
        {dirty && !state.isValid && (
          <p className="text-xs text-red-500">
            Fix errors above before submitting.
          </p>
        )}
        {dirty && state.isValid && !isSubmitting && (
          <p className="text-xs text-green-600">
            Form is valid — ready to submit.
          </p>
        )}

        {/* Reset button — available when dirty */}
        {dirty && !isSubmitting && (
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            className="text-xs text-gray-400 underline hover:text-gray-600 transition ml-auto"
          >
            Reset form
          </button>
        )}
      </div>

      {/* ── Server-error hint (educational) ──────────────────────────────── */}
      {state.status === "idle" && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          <strong>Testing server errors:</strong> Use email{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">taken@example.com</code>{" "}
          or postcode{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">XX99 9XX</code>{" "}
          to trigger field-level server errors.
        </p>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Status badge — visualises the machine state (educational aid)
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    idle: "bg-gray-100 text-gray-500",
    editing: "bg-blue-100 text-blue-700",
    validating: "bg-yellow-100 text-yellow-700",
    submitting: "bg-indigo-100 text-indigo-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono font-medium ${styles[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status}
    </span>
  );
}
