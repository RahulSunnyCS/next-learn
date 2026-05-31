// ─── solutions/c17-form-state-machine/_lib/form-reducer.ts ──────────────────
//
// REFERENCE SOLUTION — the complete, annotated state machine reducer.
//
// Compare this to your own implementation after completing the challenge tasks
// in spec.md.  Every non-obvious decision is explained in a comment.

// ---------------------------------------------------------------------------
// DESIGN NOTE: Why a union-literal status instead of boolean flags?
//
// Pattern to avoid:
//   const [isEditing, setIsEditing] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//
// Problem: these three booleans allow 2^3 = 8 combinations, but only 4 are
// valid.  The other 4 (isEditing && isSubmitting, etc.) are bugs waiting to
// happen.
//
// Solution: a single union-literal field:
//   type FormStatus = "idle" | "editing" | "submitting" | "success" | "error";
//
// Now there are exactly 5 valid states and zero impossible combinations.
// TypeScript can exhaustively check switch/case over this type.
// ---------------------------------------------------------------------------

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
  | "giftMessage";

export type FieldErrors = Partial<Record<FieldName, string>>;
export type DirtyFields = Partial<Record<FieldName, boolean>>;

export type FormStatus =
  | "idle"
  | "editing"
  | "validating"
  | "submitting"
  | "success"
  | "error";

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
  status: FormStatus;
  values: FormValues;
  dirtyFields: DirtyFields;
  fieldErrors: FieldErrors;
  formError: string | null;
  isValid: boolean;
}

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
// Action types
// ---------------------------------------------------------------------------

export interface SetFieldAction {
  type: "SET_FIELD";
  field: FieldName | "isGift";
  value: string | boolean;
}
export interface ValidateAction { type: "VALIDATE" }
export interface SubmitAction { type: "SUBMIT" }
export interface ServerErrorsAction {
  type: "SERVER_ERRORS";
  fieldErrors: FieldErrors;
  formError?: string | null;
}
export interface SuccessAction { type: "SUCCESS" }
export interface ResetAction { type: "RESET" }

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
// PATTERN NOTE: validateValues is a PURE function — it takes FormValues and
// returns FieldErrors.  It has no side effects and does not read from React
// state.  This makes it:
//   1. Trivially unit testable.
//   2. Callable from both the reducer (client) and the server action (Zod).
//   3. Readable as a standalone document of the form's business rules.

function validateValues(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  const emailParts = values.email.trim().split("@");
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (emailParts.length !== 2 || !emailParts[1].includes(".")) {
    errors.email = "Enter a valid email address (e.g. you@example.com).";
  }

  const phoneTrimmed = values.phone.trim();
  if (phoneTrimmed && !/^[\d\s+\-()]+$/.test(phoneTrimmed)) {
    errors.phone = "Phone may only contain digits, spaces, and +/()-";
  }

  if (!values.address.trim()) errors.address = "Street address is required.";
  if (!values.city.trim()) errors.city = "City is required.";
  if (!values.postcode.trim()) errors.postcode = "Postcode is required.";

  const cardDigits = values.cardNumber.replace(/\s/g, "");
  if (!cardDigits) {
    errors.cardNumber = "Card number is required.";
  } else if (!/^\d{16}$/.test(cardDigits)) {
    errors.cardNumber = "Card number must be 16 digits.";
  }

  const expiryMatch = values.cardExpiry.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!values.cardExpiry.trim()) {
    errors.cardExpiry = "Expiry date is required.";
  } else if (!expiryMatch) {
    errors.cardExpiry = "Use MM/YY format (e.g. 09/27).";
  } else {
    const month = parseInt(expiryMatch[1], 10);
    const year = 2000 + parseInt(expiryMatch[2], 10);
    if (month < 1 || month > 12) {
      errors.cardExpiry = "Month must be 01–12.";
    } else {
      const expiryDate = new Date(Date.UTC(year, month, 1));
      const now = new Date();
      const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      if (expiryDate <= utcNow) {
        errors.cardExpiry = "This card has expired.";
      }
    }
  }

  if (!values.cardCvc.trim()) {
    errors.cardCvc = "CVC is required.";
  } else if (!/^\d{3,4}$/.test(values.cardCvc.trim())) {
    errors.cardCvc = "CVC must be 3 or 4 digits.";
  }

  // ── CROSS-FIELD RULE ─────────────────────────────────────────────────────
  // giftMessage is only required when isGift is true.
  // This rule reads TWO fields — it cannot be expressed in a per-field
  // validator.  The reducer's validateValues function has access to the full
  // FormValues object, so the rule is a simple if-statement here.
  if (values.isGift && !values.giftMessage.trim()) {
    errors.giftMessage = "Gift message is required when sending as a gift.";
  }

  return errors;
}

export function hasDirtyFields(dirtyFields: DirtyFields): boolean {
  return Object.values(dirtyFields).some(Boolean);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {

    case "SET_FIELD": {
      // ── Transition idle → editing on first change ──────────────────────
      // We use a ternary rather than a helper to keep the transition
      // logic visible at the call site.  The "submitting" guard prevents
      // a field change mid-flight from reverting to "editing" (shouldn't
      // happen with disabled inputs but is a safe backstop).
      const nextStatus: FormStatus =
        state.status === "idle" || state.status === "error"
          ? "editing"
          : state.status;

      const nextValues: FormValues =
        action.field === "isGift"
          ? { ...state.values, isGift: action.value as boolean }
          : { ...state.values, [action.field]: action.value as string };

      const nextDirty: DirtyFields = {
        ...state.dirtyFields,
        [action.field]: true,
      };

      // ── Live validation ────────────────────────────────────────────────
      // We validate on every keystroke.  The cost is negligible — all
      // validation is synchronous and purely computational.  The benefit is
      // that errors appear and disappear as the user types, including the
      // cross-field giftMessage rule.
      const nextErrors = validateValues(nextValues);
      const nextIsValid = Object.keys(nextErrors).length === 0;

      return {
        ...state,
        status: nextStatus === "submitting" ? "submitting" : "editing",
        values: nextValues,
        dirtyFields: nextDirty,
        fieldErrors: nextErrors,
        isValid: nextIsValid,
        formError: null,
      };
    }

    case "VALIDATE": {
      const errors = validateValues(state.values);
      return {
        ...state,
        status: "editing",
        fieldErrors: errors,
        isValid: Object.keys(errors).length === 0,
      };
    }

    case "SUBMIT": {
      if (state.status === "submitting") return state;
      if (!state.isValid) {
        const errors = validateValues(state.values);
        return { ...state, fieldErrors: errors, isValid: false };
      }
      return { ...state, status: "submitting", formError: null };
    }

    case "SERVER_ERRORS": {
      // ── MERGING SERVER ERRORS (the key teaching point) ─────────────────
      //
      // WHY MERGE instead of replace?
      //
      // The server only returns errors for the fields it *specifically
      // checked* (e.g. email uniqueness, postcode validity).  It does not
      // re-validate format rules it considers the client's responsibility.
      //
      // If we replaced fieldErrors entirely, we would lose client-side
      // errors on fields the server didn't check.
      //
      // If we merged client-then-server (server wins on conflict), we get:
      //   - All client format errors remain visible.
      //   - Server-specific errors ("email taken") appear on the right field.
      //   - Where both sides flagged the same field, the server's more
      //     specific message wins.
      //
      // Result: the user sees ALL broken fields at once, with the most
      // informative message for each.
      return {
        ...state,
        status: "error",
        fieldErrors: { ...state.fieldErrors, ...action.fieldErrors },
        formError: action.formError ?? null,
        isValid: false,
      };
    }

    case "SUCCESS": {
      return { ...state, status: "success", formError: null };
    }

    case "RESET": {
      return INITIAL_STATE;
    }

    default: {
      const _never: never = action;
      return _never;
    }
  }
}
