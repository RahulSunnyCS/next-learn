// ─── _lib/form-reducer.ts — C17 Client Form State-Machine ───────────────────
//
// This module defines the complete state machine for the checkout form.
//
// WHY A STATE MACHINE INSTEAD OF SCATTERED useState?
//
// A checkout form with 6+ fields, cross-field rules, dirty tracking, and
// server-error merging has too many states to manage with individual
// useState calls.  A reducer centralises transitions: every possible state
// change is an explicit case, making illegal transitions impossible by
// construction.  E.g. the "submitting" state simply cannot transition back
// to "idle" — it must go through "success" or "error".
//
// STATE TOPOLOGY (explicit machine — no library needed):
//
//   idle ──[START_EDIT]──► editing ──[SUBMIT]──► validating
//             ▲                                      │
//             │                          ┌───────────┴────────────┐
//             │                          │ (valid)                 │ (invalid)
//             │                      submitting               editing (with errors)
//             │                          │
//             │              ┌───────────┴────────────┐
//             │              │ (success)              │ (server error)
//           ──►  success          error (with field errors merged in)
//
//   RESET transitions back to idle from success or error.
//   SERVER_ERRORS merges field-level errors from the server into editing state.

// ---------------------------------------------------------------------------
// Field definitions for the checkout form
// ---------------------------------------------------------------------------

// The set of field names is a union literal so TypeScript flags any typo.
export type FieldName =
  | "fullName"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "postcode"
  | "cardNumber"
  | "cardExpiry"
  | "cardCvc"
  | "giftMessage"; // only required when isGift is true (cross-field rule)

// All field-level errors are indexed by FieldName so error display is
// co-located with the field, never a generic banner.
export type FieldErrors = Partial<Record<FieldName, string>>;

// Each field also carries a dirty flag: was it modified by the user since
// the form was last clean?  We track this per-field rather than a single
// boolean so we can (a) warn on navigation only if something changed, and
// (b) disable submit until at least one field is dirty (avoid accidental
// double-submits on stale forms).
export type DirtyFields = Partial<Record<FieldName, boolean>>;

// ---------------------------------------------------------------------------
// The machine state (status tag + payload)
// ---------------------------------------------------------------------------

export type FormStatus =
  | "idle"          // form not yet interacted with
  | "editing"       // user is actively filling in fields
  | "validating"    // client-side validation running (synchronous here, but
                    // the separate status lets us add async checks later)
  | "submitting"    // Server Action in-flight
  | "success"       // Server confirmed the submission
  | "error";        // Server returned errors after submission

export interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  isGift: boolean;
  giftMessage: string;
}

export interface FormState {
  // The machine's current status — drives which UI branch to render.
  status: FormStatus;

  // The current field values, kept in sync with controlled inputs.
  values: FormValues;

  // Per-field dirty tracking.  A field becomes dirty the first time it is
  // changed from the initial value.  Resetting the form clears dirty state.
  dirtyFields: DirtyFields;

  // Merged field errors — set by client-side validation OR by server response.
  // Cleared on each successful validate/submit, re-populated on failure.
  fieldErrors: FieldErrors;

  // Non-field error (e.g. network failure, unexpected server 500).
  formError: string | null;

  // Tracks whether the form is currently valid.  Computed during validation
  // and stored here so the submit button can read it cheaply without
  // re-running validation on every render.
  isValid: boolean;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const INITIAL_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postcode: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
  isGift: false,
  giftMessage: "",
};

export const INITIAL_STATE: FormState = {
  status: "idle",
  values: INITIAL_VALUES,
  dirtyFields: {},
  fieldErrors: {},
  formError: null,
  isValid: false,
};

// ---------------------------------------------------------------------------
// Actions (events sent to the reducer)
// ---------------------------------------------------------------------------

// SET_FIELD: user typed/changed a single field value.
//   Also marks the field as dirty and transitions to "editing" if idle.
export interface SetFieldAction {
  type: "SET_FIELD";
  field: FieldName | "isGift"; // isGift is a checkbox, not a FieldName
  value: string | boolean;
}

// VALIDATE: run client-side cross-field validation.
//   Fired before submit to give the user inline feedback.
export interface ValidateAction {
  type: "VALIDATE";
}

// SUBMIT: transition to "submitting".
//   Only allowed when status is "editing" or "error" and isValid is true.
export interface SubmitAction {
  type: "SUBMIT";
}

// SERVER_ERRORS: server returned field-level errors.
//   We merge these into fieldErrors and revert status to "editing"
//   so the user can fix the fields.
export interface ServerErrorsAction {
  type: "SERVER_ERRORS";
  fieldErrors: FieldErrors;
  formError?: string | null;
}

// SUCCESS: server confirmed the submission.
export interface SuccessAction {
  type: "SUCCESS";
}

// RESET: return to initial state (e.g. user clicks "Start over").
export interface ResetAction {
  type: "RESET";
}

export type FormAction =
  | SetFieldAction
  | ValidateAction
  | SubmitAction
  | ServerErrorsAction
  | SuccessAction
  | ResetAction;

// ---------------------------------------------------------------------------
// Cross-field validation
// ---------------------------------------------------------------------------
//
// This is the hard part that justifies the state machine.  Cross-field rules
// cannot be expressed with per-field useState because each field's validity
// depends on other fields' values, and we need a single authoritative pass.
//
// Rules:
//   1. email must contain @ and a dot after the @  (format)
//   2. phone is optional BUT if provided must be digits/spaces/+/()/- only
//   3. cardNumber must be 16 digits (stripped of spaces)
//   4. cardExpiry must be MM/YY and not in the past
//   5. giftMessage is REQUIRED only if isGift is true  ← the cross-field rule
//   6. All other fields (fullName, address, city, postcode, cardCvc) must be
//      non-empty.

function validateValues(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  // --- fullName ---
  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  // --- email ---
  const emailParts = values.email.trim().split("@");
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (emailParts.length !== 2 || !emailParts[1].includes(".")) {
    errors.email = "Enter a valid email address (e.g. you@example.com).";
  }

  // --- phone (optional; validated only if provided) ---
  const phoneTrimmed = values.phone.trim();
  if (phoneTrimmed) {
    // Allow digits, spaces, +, (, ), and - only.
    if (!/^[\d\s+\-()]+$/.test(phoneTrimmed)) {
      errors.phone = "Phone may only contain digits, spaces, and +/()-";
    }
  }

  // --- address ---
  if (!values.address.trim()) {
    errors.address = "Street address is required.";
  }

  // --- city ---
  if (!values.city.trim()) {
    errors.city = "City is required.";
  }

  // --- postcode ---
  if (!values.postcode.trim()) {
    errors.postcode = "Postcode is required.";
  }

  // --- cardNumber ---
  const cardDigits = values.cardNumber.replace(/\s/g, "");
  if (!cardDigits) {
    errors.cardNumber = "Card number is required.";
  } else if (!/^\d{16}$/.test(cardDigits)) {
    errors.cardNumber = "Card number must be 16 digits.";
  }

  // --- cardExpiry ---
  const expiryMatch = values.cardExpiry.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!values.cardExpiry.trim()) {
    errors.cardExpiry = "Expiry date is required.";
  } else if (!expiryMatch) {
    errors.cardExpiry = "Use MM/YY format (e.g. 09/27).";
  } else {
    // Cross-time check: is the card expired?
    // We build the first day of the month AFTER the expiry month to determine
    // expiry.  Using a fixed year base (2000) since card years are 2-digit.
    const month = parseInt(expiryMatch[1], 10);
    const year = 2000 + parseInt(expiryMatch[2], 10);
    if (month < 1 || month > 12) {
      errors.cardExpiry = "Month must be 01–12.";
    } else {
      // The card is valid until the last day of the expiry month.
      // Build a Date for the first day of the following month and compare
      // to now.  Using UTC to avoid timezone issues in server/client mismatch.
      const expiryDate = new Date(Date.UTC(year, month, 1)); // first day of next month
      const now = new Date();
      const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      if (expiryDate <= utcNow) {
        errors.cardExpiry = "This card has expired.";
      }
    }
  }

  // --- cardCvc ---
  if (!values.cardCvc.trim()) {
    errors.cardCvc = "CVC is required.";
  } else if (!/^\d{3,4}$/.test(values.cardCvc.trim())) {
    errors.cardCvc = "CVC must be 3 or 4 digits.";
  }

  // --- CROSS-FIELD RULE: giftMessage required only when isGift is true ---
  //
  // This is the canonical cross-field example in this challenge: field B
  // (giftMessage) is required only when field A (isGift) is checked.
  // With per-field useState this would require either a useEffect watching
  // isGift or duplicated logic in the submit handler.  In a reducer, it is
  // a single check in one place and is always consistent.
  if (values.isGift && !values.giftMessage.trim()) {
    errors.giftMessage = "Gift message is required when sending as a gift.";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Dirty-check helper
// ---------------------------------------------------------------------------

// Returns true if at least one field has been modified from the initial value.
// Used to disable the submit button on an untouched form.
export function hasDirtyFields(dirtyFields: DirtyFields): boolean {
  return Object.values(dirtyFields).some(Boolean);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {

    case "SET_FIELD": {
      // Transition from idle to editing on first user interaction.
      const nextStatus: FormStatus =
        state.status === "idle" ? "editing" : state.status;

      // Merge the new value into values.
      // isGift is a checkbox — it maps to FormValues.isGift (boolean), not
      // a FieldName string field, so we handle it separately.
      const nextValues: FormValues =
        action.field === "isGift"
          ? { ...state.values, isGift: action.value as boolean }
          : { ...state.values, [action.field]: action.value as string };

      // Mark the field as dirty.  We never un-dirty a field on input change
      // because the user might type then clear — they still touched it.
      const nextDirty: DirtyFields = {
        ...state.dirtyFields,
        [action.field]: true,
      };

      // Run live validation so errors update as the user types.
      // We run the full validation pass (not just the changed field) because
      // cross-field rules mean changing one field can fix/break another.
      const nextErrors = validateValues(nextValues);
      const nextIsValid = Object.keys(nextErrors).length === 0;

      return {
        ...state,
        status: nextStatus === "submitting" ? "submitting" : "editing",
        values: nextValues,
        dirtyFields: nextDirty,
        fieldErrors: nextErrors,
        isValid: nextIsValid,
        formError: null, // clear the top-level error on any field change
      };
    }

    case "VALIDATE": {
      // Explicit validate pass (e.g. on blur, or just before submit).
      const errors = validateValues(state.values);
      const isValid = Object.keys(errors).length === 0;
      return {
        ...state,
        status: "editing", // stay in editing; submitting is gated separately
        fieldErrors: errors,
        isValid,
      };
    }

    case "SUBMIT": {
      // Guard: only allow submit when editing/error and the form is valid.
      // Returning the current state unchanged is the right no-op here — it
      // does not log or throw because the submit button is already disabled
      // when !isValid, so this branch is a safety backstop only.
      if (state.status === "submitting") return state;
      if (!state.isValid) {
        // Run a full validation pass to surface all errors if the user somehow
        // bypassed the button-disabled check (e.g. keyboard submit).
        const errors = validateValues(state.values);
        return { ...state, fieldErrors: errors, isValid: false };
      }
      return { ...state, status: "submitting", formError: null };
    }

    case "SERVER_ERRORS": {
      // MERGING SERVER ERRORS INTO CLIENT STATE — the hard part.
      //
      // When the server returns field-level errors (e.g. "email already taken",
      // "postcode not found in our system"), we need to:
      //   (a) display them on the correct input fields — not just a banner.
      //   (b) revert status back to "editing" so the user can fix them.
      //   (c) merge with any still-present client validation errors (though in
      //       practice the server only returns errors for fields that passed
      //       client validation — it validated more deeply server-side).
      //
      // We MERGE rather than REPLACE to keep any client-side errors that the
      // server didn't return (e.g. the server doesn't re-check the already-
      // validated format of cardNumber, but the client error stays visible).
      //
      // The result: the user sees both client AND server field errors at once,
      // pointing to the exact fields that need fixing.
      return {
        ...state,
        status: "error",
        // Spread server errors on top of existing field errors so a server
        // error on a field overrides the client error on that same field.
        fieldErrors: { ...state.fieldErrors, ...action.fieldErrors },
        formError: action.formError ?? null,
        isValid: false, // must re-validate after fixing server errors
      };
    }

    case "SUCCESS": {
      return {
        ...state,
        status: "success",
        formError: null,
      };
    }

    case "RESET": {
      // Return to pristine initial state.
      return INITIAL_STATE;
    }

    default: {
      // TypeScript exhaustiveness check: if we add a new action type and
      // forget to handle it here, the compiler will flag this line.
      const _never: never = action;
      return _never;
    }
  }
}
