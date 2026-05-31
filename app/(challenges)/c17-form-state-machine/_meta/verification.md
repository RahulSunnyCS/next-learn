# Verification Checklist — Client Form State-Machine

> **Purpose:** A human-runnable checklist to verify the challenge is solved
> correctly.  Run each item in order.  Check the box when it passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no type errors.
- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Page renders

- [ ] Navigate to `/challenges/c17-form-state-machine`.  The page loads with:
  - The challenge header (slug badge, title, description).
  - The state machine status badge showing `idle`.
  - All form sections (Delivery details, Payment details, Gift options, submit
    button).
  - The submit button is disabled (form is idle/pristine).

---

## State transitions

- [ ] **idle → editing:** Type a character into the Full name field.  The
  status badge changes from `idle` to `editing`.  The `Unsaved changes`
  indicator appears.

- [ ] **editing (invalid) → editing (valid):** Fill all required fields with
  valid values (any card number of 16 digits, a future expiry like 12/30, any
  3-digit CVC).  The status badge stays `editing`.  The &ldquo;Form is valid —
  ready to submit&rdquo; hint appears.  The submit button becomes active.

- [ ] **Submit button disabled until dirty+valid:** With a freshly loaded page
  the button is disabled.  After typing in all required fields with valid
  values, the button becomes enabled.

---

## Cross-field validation

- [ ] **Gift message required when isGift checked:**
  Check the &ldquo;Send as a gift&rdquo; checkbox.  The gift message textarea
  appears.  Leave it blank and click anywhere else (blur).  An error message
  appears under the gift message textarea: &ldquo;Gift message is required when
  sending as a gift.&rdquo;

- [ ] **Error clears when isGift unchecked:**
  Uncheck the &ldquo;Send as a gift&rdquo; box.  The textarea disappears and
  the error is gone.  The form can now be submitted without a gift message.

- [ ] **Card expiry cross-time check:**
  Enter an expired expiry date such as `01/20`.  An error appears:
  &ldquo;This card has expired.&rdquo;  Correct it to a future date (e.g.
  `12/30`).  The error disappears.

---

## Live validation (as-you-type)

- [ ] **Email format:** Type `notanemail` in the email field.  The error
  &ldquo;Enter a valid email address&rdquo; appears immediately (without
  submitting).

- [ ] **Card number length:** Type 15 digits in the card number field.  The
  error &ldquo;Card number must be 16 digits&rdquo; appears.  Add the 16th
  digit.  The error disappears.

---

## Dirty tracking + submit gate

- [ ] Load the page.  Submit button is disabled.
- [ ] Fill in all fields.  Button becomes enabled.
- [ ] Click &ldquo;Reset form&rdquo;.  All fields clear, the status badge shows
  `idle`, and the button is disabled again.

---

## Server error merging (field-level)

- [ ] **Email deny-list:** Fill all fields with valid values.  Set email to
  `taken@example.com`.  Submit.  Client validation passes (the format is
  valid).  The server returns a field-level error.  The error
  &ldquo;This email is already registered…&rdquo; appears under the email
  field — NOT in a generic top-level banner.  All other fields show no errors.
  Status badge shows `error`.

- [ ] **Postcode deny-list:** Set postcode to `XX99 9XX` (with a valid email).
  Submit.  The server returns a field-level error under the postcode field only.
  Fix the postcode.  The postcode error clears (the email field stays
  error-free this time).

---

## Successful submission

- [ ] Fill all fields with valid, non-deny-listed values.  Submit.  The form
  transitions to the `success` state and shows &ldquo;Order placed!&rdquo;.

- [ ] Click &ldquo;Start over (reset form)&rdquo;.  The form returns to initial
  `idle` state with all fields blank.

---

## Code checks

- [ ] Open `_lib/form-reducer.ts`.  Confirm:
  - `FormStatus` is a union type with at least 5 states.
  - `formReducer` is a pure function (no side effects, no async).
  - `validateValues()` contains the cross-field rule for `giftMessage`.
  - The `SERVER_ERRORS` case spreads `action.fieldErrors` on top of
    `state.fieldErrors`.

- [ ] Open `_lib/actions.ts`.  Confirm:
  - `"use server"` is at the file level.
  - Zod is used for server-side validation.
  - `.superRefine()` enforces the `giftMessage` cross-field rule.
  - `createOrder` from `@/lib/data` is called on success.
  - No raw error messages are sent to the client (try/catch around createOrder
    with a generic fallback message).

- [ ] Open `_components/CheckoutForm.tsx`.  Confirm:
  - `"use client"` at the top.
  - `useReducer(formReducer, INITIAL_STATE)` — NOT `useState` for form state.
  - `useTransition` used to call the server action.
  - The `SERVER_ERRORS` dispatch happens inside the `startTransition` callback.
  - The submit button reads `submitDisabled = !dirty || !state.isValid || isSubmitting`.

---

## Build / type checks

- [ ] Run `npx tsc --noEmit`.  Zero errors.
- [ ] Run `npm run build`.  Route `/challenges/c17-form-state-machine` compiles
  as `○ (Static)` — the page has no server-side dynamic data reads; the form
  is a fully client-side component.
- [ ] Confirm the challenge appears in the index at `/` under Tier 3 with the
  title from `challenge.config.json`.
