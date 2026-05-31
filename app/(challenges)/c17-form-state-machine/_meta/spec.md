# Challenge Spec — Client Form State-Machine

> **File:** `app/(challenges)/c17-form-state-machine/_meta/spec.md`

---

## Learning Goal

Understand how to manage complex client-side form state as an explicit state
machine using `useReducer`.  You will build a multi-field checkout form that
tracks field values, dirty state, and cross-field validation rules in a single
reducer — then submit via a Server Action that returns field-level errors which
you merge back into the client state.

By the end you will understand:
- Why `useReducer` + a state machine is better than scattered `useState` for
  complex forms.
- How to write cross-field validation rules that span multiple fields.
- How to track "dirty" state per field and use it to disable the submit button.
- How to merge server-returned field-level errors into the client state machine
  so errors appear on the correct fields — not just a generic banner.
- When to choose this approach over URL-state (C16) or simple `useActionState`
  (C11).

---

## Background

### The problem with scattered useState

A checkout form with 8+ fields plus validation, dirty tracking, and a
submission lifecycle generates code like this when built with individual
`useState` calls:

```tsx
const [fullName, setFullName] = useState("");
const [fullNameError, setFullNameError] = useState("");
const [email, setEmail] = useState("");
const [emailError, setEmailError] = useState("");
const [isGift, setIsGift] = useState(false);
const [giftMessage, setGiftMessage] = useState("");
const [giftMessageError, setGiftMessageError] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
// … and so on for every field
```

Problems:
1. **Cross-field rules are hard to enforce** — `giftMessage` is required only
   when `isGift` is true.  With separate state atoms you need a `useEffect`
   watching `isGift`, or duplicated logic in every validation call.
2. **Illegal states are possible** — `isSubmitting=true` and `isIdle=true` at
   the same time should be impossible, but scattered booleans allow it.
3. **State updates can tear** — React batches some updates but not all; a
   validation pass that sets 5 error states may render intermediate invalid
   views.
4. **Dirty tracking is an afterthought** — you add another boolean per field
   and keep it in sync manually.

### The state-machine solution

A `useReducer`-based state machine solves all of these:
- All state lives in one object — atomic updates, no tearing.
- The current lifecycle phase (`idle | editing | submitting | success | error`)
  is an explicit field — not a set of overlapping booleans.
- Validation is a pure function over all values — cross-field rules are
  first-class, not an afterthought.
- Server errors are dispatched as a `SERVER_ERRORS` action and merged into the
  existing error map — they show up on the correct fields, not in a banner.

---

## State machine topology

```
   idle ──[SET_FIELD]──► editing ──[SUBMIT]──► submitting
             ▲               ▲                     │
             │               │          ┌──────────┴──────────┐
             │               │     [SUCCESS]           [SERVER_ERRORS]
             │               │          │                      │
             │           [RESET]     success            error (editing)
             └───────────────────────────┘
```

States: `idle` | `editing` | `validating` | `submitting` | `success` | `error`

Key transitions:
- Any `SET_FIELD` action on an `idle` form moves it to `editing`.
- `SUBMIT` is only effective when `isValid && hasDirtyFields`.
- `SERVER_ERRORS` merges field errors and reverts to `error` (a form of
  `editing` with pre-populated errors).
- `RESET` always returns to the pristine `INITIAL_STATE`.

---

## Cross-field validation rules

The form enforces at least one rule that spans two fields:

**Rule:** `giftMessage` is required if and only if `isGift === true`.

Client-side (in `form-reducer.ts`):
```ts
if (values.isGift && !values.giftMessage.trim()) {
  errors.giftMessage = "Gift message is required when sending as a gift.";
}
```

Server-side (in `_lib/actions.ts` via Zod `.superRefine()`):
```ts
.superRefine((data, ctx) => {
  if (data.isGift && (!data.giftMessage || !data.giftMessage.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["giftMessage"], ... });
  }
});
```

Both sides enforce the rule independently — the server never assumes the client
already validated.

---

## Dirty tracking

Every `SET_FIELD` action marks the changed field as dirty in
`state.dirtyFields`.  Dirty flags are:
- **Never cleared on input change** — even if the user types then deletes,
  they touched the field.
- **Cleared only on `RESET`** — returns to `INITIAL_STATE`.
- **Used to gate submission** — `hasDirtyFields()` must return true before
  the submit button is enabled.  This prevents double-submits on a pristine
  form.

---

## Server error merging

When `submitCheckout` returns `{ outcome: "field-errors", fieldErrors: {...} }`,
the client dispatches:

```ts
dispatch({ type: "SERVER_ERRORS", fieldErrors: result.fieldErrors });
```

The reducer merges server errors on top of existing field errors:

```ts
fieldErrors: { ...state.fieldErrors, ...action.fieldErrors }
```

This means:
- A server error on `email` shows up under the email input, not in a banner.
- A server error on a field that also had a client error overrides it.
- Fields without server errors keep their existing client errors.

---

## Contrast: state-machine vs URL-state (C16)

| Concern | State-machine (this challenge) | URL-state (C16) |
|---------|-------------------------------|-----------------|
| Where state lives | Client memory (`useReducer`) | URL search params |
| Survives page reload | No | Yes |
| Shareable link | No | Yes |
| Back button restores state | No (form clears on nav) | Yes |
| Server errors merge inline | Yes (via dispatch) | No — typically a redirect |
| Cross-field validation | Natural (full object in reducer) | Possible but cumbersome |
| Dirty tracking | Built in | Not applicable |
| When to use | Transient, sensitive form data (checkout, login, profile editor) | Filters, search, pagination, tab state |

**Rule of thumb:**
- Use URL-state for things that should survive a refresh or share (search
  filters, active tab, pagination).
- Use a state machine for forms where the data is transient, contains
  sensitive fields (card numbers), or involves a multi-step submission
  lifecycle with server validation.

---

## Tasks

### Part 1 — Study the reducer

- [ ] **T1.1 — Read `_lib/form-reducer.ts`.**  Identify the explicit states,
  the action types, and the cross-field rule in `validateValues()`.

- [ ] **T1.2 — Trace a field-change cycle.**  Follow a single `SET_FIELD`
  dispatch from the action through the reducer to the rendered error message.

### Part 2 — Trigger cross-field validation

- [ ] **T2.1 — Check the "Send as a gift" box.**  A gift message field appears.
  Submit without filling it.  The error appears under the gift message field.

- [ ] **T2.2 — Uncheck the box.**  The gift message field disappears and the
  error clears.  No stale errors remain.

### Part 3 — Observe dirty tracking

- [ ] **T3.1 — Load the page.**  The submit button is disabled (nothing is
  dirty; form is `idle`).

- [ ] **T3.2 — Type in any field.**  The status badge changes to `editing`.
  The `Unsaved changes` indicator appears.  The submit button becomes active
  only after all required fields are also valid.

### Part 4 — Trigger server errors

- [ ] **T4.1 — Fill all fields correctly.**  Use email
  `taken@example.com`.  Submit.  Client validation passes; the server returns
  a field-level error on `email`; the error appears under the email input.

- [ ] **T4.2 — Use postcode `XX99 9XX`.**  The server returns a field-level
  error on `postcode`.  Fix it (use any other postcode).  The error clears.

### Part 5 — Defend your understanding

- [ ] Fill in `_meta/defend-it.md` before opening `solutions/c17-form-state-machine/`.

---

## Acceptance Criteria

1. The checkout form at `/challenges/c17-form-state-machine` renders and is
   interactable without JavaScript errors.

2. The form is driven by `useReducer` with an explicit status field
   (`idle | editing | validating | submitting | success | error`); there is
   NO `useState` for form field values, errors, or dirty tracking.

3. The gift-message field is rendered only when "Send as a gift" is checked,
   and an error appears on that field (not as a generic banner) if it is left
   empty when the checkbox is checked.

4. The submit button is disabled until at least one field is dirty AND the
   form passes client-side validation.

5. Submitting with `email = taken@example.com` causes the server action to
   return a field-level error that appears under the email input — not in a
   generic banner.

6. Submitting a valid form creates an order via `createOrder` from `@/lib/data`
   and the form transitions to the `success` state.

7. `_lib/actions.ts` validates inputs server-side using Zod (the schema is
   defined in this file, not imported from the challenge page).

8. The `_meta/` folder contains `spec.md` (this file), `defend-it.md`,
   `verification.md`, `challenge.config.json` with
   `{ id: 18, tier: 3, slug: "c17-form-state-machine" }`, and
   `challenge.config.ts`.

9. `solutions/c17-form-state-machine/NOTES.md` explains the state-machine
   design and contrasts it with URL-state (C16) and simple `useActionState`
   (C11).

---

## Hints

<details>
<summary>Hint 1 — Why startTransition instead of useActionState?</summary>

`useActionState(action, initialState)` replaces the client state with the
action's return value on every call.  That fights our `useReducer` state
machine — we don't want the server action to replace our state; we want to
dispatch an action into our reducer based on the server result.

The pattern here is:
1. On submit, call `dispatch({ type: "SUBMIT" })` to move to "submitting".
2. Inside `startTransition`, call the server action directly.
3. When the action returns, dispatch `SUCCESS` or `SERVER_ERRORS` into the
   reducer.

`startTransition` ensures React doesn't block concurrent renders while the
server round-trip is in flight.  `useTransition` gives us `isPending` to
show a loading state on the button.

</details>

<details>
<summary>Hint 2 — Cross-field rule in Zod</summary>

Zod's per-field validators (`.min()`, `.email()`) run independently.  For
rules that span two fields, use `.superRefine((data, ctx) => { ... })` on the
whole schema object.  Call `ctx.addIssue({ path: ["fieldName"], message: "..." })`
to attach the error to the correct field key.

</details>

<details>
<summary>Hint 3 — Building FormData from reducer state</summary>

Don't read the DOM form element to build `FormData` — use the reducer's
`state.values` directly.  The reducer is the single source of truth for field
values; reading the DOM introduces a possible drift between what the reducer
thinks and what the DOM shows (e.g. if a field was programmatically updated).

```ts
const fd = new FormData();
fd.set("email", state.values.email);
fd.set("isGift", state.values.isGift ? "on" : ""); // checkbox convention
// …
await submitCheckout(fd);
```

</details>

<details>
<summary>Hint 4 — Merging server errors into the reducer</summary>

When the server returns `{ outcome: "field-errors", fieldErrors: { email: "taken" } }`:

```ts
// In the component's startTransition callback:
dispatch({
  type: "SERVER_ERRORS",
  fieldErrors: result.fieldErrors,
});
```

The `SERVER_ERRORS` case in the reducer spreads these on top of any existing
client-side errors:
```ts
fieldErrors: { ...state.fieldErrors, ...action.fieldErrors }
```

The error then flows to the field component via `state.fieldErrors.email` and
renders as an inline `<p role="alert">` under the email input.

</details>
