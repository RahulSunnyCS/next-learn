# Solution Notes — C17 Client Form State-Machine

## What Was Built

A multi-field checkout form that demonstrates state-machine-based form
management in Next.js App Router.  Key files:

| File | Purpose |
|---|---|
| `_lib/form-reducer.ts` | `useReducer` state machine: states, actions, transitions, cross-field validation, dirty tracking |
| `_lib/actions.ts` | Server Action with Zod validation and cross-field superRefine |
| `_components/CheckoutForm.tsx` | "use client" form component; drives the machine via dispatch |
| `page.tsx` | Static shell page; no dynamic reads |

---

## The State Machine Design

### States

```
type FormStatus =
  | "idle"        // form not yet touched
  | "editing"     // user is actively filling fields
  | "validating"  // explicit validate pass (sync here; reserved for async)
  | "submitting"  // server action in-flight
  | "success"     // server confirmed success
  | "error"       // server returned errors
```

The status is a union literal — NOT a set of booleans.  This eliminates
impossible combinations (`isSubmitting && isIdle` cannot happen).

### Transitions

```
idle  ──[SET_FIELD]──►  editing  ──[SUBMIT (valid)]──►  submitting
        ◄──[RESET]──             ◄──[SERVER_ERRORS]─────────┤
                                                      [SUCCESS]──► success
```

Every transition is a case in the reducer switch.  There is no code path
outside the reducer that changes form state.

### State shape

```ts
interface FormState {
  status: FormStatus;       // the machine's phase
  values: FormValues;       // all field values (controlled inputs)
  dirtyFields: DirtyFields; // per-field dirty flags
  fieldErrors: FieldErrors; // merged client + server errors
  formError: string | null; // non-field error (network, 500, etc.)
  isValid: boolean;         // cached result of last validateValues() call
}
```

`isValid` is computed and cached during `SET_FIELD` and `VALIDATE` so the
submit button can read it in O(1) without re-running validation on every render.

---

## Cross-Field Validation

The giftMessage rule is the canonical cross-field example:

```
field B (giftMessage) is required if and only if field A (isGift) is true
```

**Client side (form-reducer.ts):**
```ts
// In validateValues() — runs on every SET_FIELD dispatch:
if (values.isGift && !values.giftMessage.trim()) {
  errors.giftMessage = "Gift message is required when sending as a gift.";
}
```

**Server side (actions.ts) — Zod superRefine:**
```ts
const CheckoutSchema = z.object({ ... }).superRefine((data, ctx) => {
  if (data.isGift && (!data.giftMessage || !data.giftMessage.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["giftMessage"],
      message: "Gift message is required when sending as a gift.",
    });
  }
});
```

Why `superRefine` instead of `giftMessage: z.string().min(1)`?

Because `giftMessage.min(1)` would fire even when `isGift` is false.
`superRefine` runs after all per-field validators and receives the fully-parsed
object — it is the Zod mechanism for rules that span multiple fields.

**Why both sides enforce it independently:**
The client-side rule is UX — fast feedback.  The server-side rule is
security — it runs regardless of what the client sent.  A malicious caller
can POST to the Server Action endpoint directly, bypassing all client code.

---

## Dirty Tracking

```ts
// SET_FIELD case:
dirtyFields: { ...state.dirtyFields, [action.field]: true }
```

Dirty flags:
- Are set `true` on first change and never reverted on subsequent changes
  (even if the user clears the field — they still touched it).
- Are cleared only by `RESET` (returns `INITIAL_STATE`).
- Gate the submit button: `hasDirtyFields(state.dirtyFields)` must be `true`.

This prevents two bugs:
1. Submitting a pristine form (creates a blank order).
2. Double-submit after success + reset (button disabled immediately on reset).

---

## Server Error Merging — The Hard Part

### The flow

1. User submits a valid form with `email = taken@example.com`.
2. Client dispatches `{ type: "SUBMIT" }` → status becomes `"submitting"`.
3. `startTransition(() => submitCheckout(fd))` sends the request.
4. Server validates with Zod (passes), runs the deny-list check, returns:
   ```ts
   { outcome: "field-errors", fieldErrors: { email: "This email is already registered…" } }
   ```
5. Client dispatches `{ type: "SERVER_ERRORS", fieldErrors: { email: "…" } }`.
6. Reducer merges:
   ```ts
   fieldErrors: { ...state.fieldErrors, ...action.fieldErrors }
   ```
7. Status becomes `"error"`, `isValid` becomes `false`.
8. `CheckoutForm` renders `state.fieldErrors.email` as a `<p role="alert">`
   directly under the email `<input>`.  No banner.

### Why merge rather than replace?

The server only checks certain fields (email, postcode).  If the client had
a client-side error on `cardNumber` at the same time, replacing fieldErrors
entirely would erase the card error.  Merging (server wins on conflict)
preserves all errors across both validation contexts.

### Why the server returns field-level errors at all?

A generic "Something went wrong" banner forces the user to guess which field
is wrong.  A field-level error points directly to the problem.  The server
must return a typed `FieldErrors` object; a free-text message is not enough.

---

## Why startTransition Instead of useActionState?

`useActionState(action, initialState)` replaces the React state with the
action's return value on every call.  That conflicts with our useReducer:
we don't want the server action to own our state, we want to *dispatch* the
server's response into our reducer as an action.

Pattern used here:
```ts
// 1. Tell the machine we're submitting:
dispatch({ type: "SUBMIT" });

// 2. Call the server action inside startTransition:
startTransition(async () => {
  const result = await submitCheckout(fd);

  // 3. Dispatch the result into the reducer:
  if (result.outcome === "success") {
    dispatch({ type: "SUCCESS" });
  } else if (result.outcome === "field-errors") {
    dispatch({ type: "SERVER_ERRORS", fieldErrors: result.fieldErrors ?? {} });
  }
});
```

`startTransition` marks the state update as non-urgent so React can interrupt
it if a higher-priority update arrives.  `isPending` from `useTransition` gives
a loading indicator while waiting.

---

## Why Controlled Inputs?

This form uses `value={state.values.foo}` + `onChange={handleChange("foo")}`
(controlled inputs), unlike the simpler C11 form which used `defaultValue`
(uncontrolled).

Controlled is required here because:
1. We validate on every keystroke — we need the current value in the reducer,
   not in the DOM.
2. The reducer is the single source of truth.  If the reducer's value and the
   DOM's value could diverge (e.g. after a `RESET`), we'd have stale errors.
3. We build `FormData` from `state.values` (not from the form element), so
   the server receives exactly what the reducer holds.

---

## Contrast: state-machine vs URL-state (C16) vs useActionState (C11)

### useActionState (C11 — simple single-mutation form)

```
Simple form → simple approach.
useActionState(action, initialState) replaces state with server return.
```

Best for:
- 1-3 fields, no cross-field rules, no lifecycle complexity.
- Progressive enhancement matters (form works without JS).
- The server's return value IS the full state you want to display.

### URL-state (C16 — shareable, bookmarkable state)

```
State lives in the URL → survives reload, shareable, back-button navigable.
```

Best for:
- Search filters, active tab, pagination page number.
- State that should be copyable as a URL and sent to another person.
- No sensitive data (card numbers cannot go in a URL).
- No complex submission lifecycle.

### useReducer state machine (this challenge — complex transient form)

```
State lives in client memory → controlled, atomic, fully typed.
```

Best for:
- 5+ fields with cross-field validation.
- Sensitive data (card number, password — cannot go in URL or be re-rendered
  from server state).
- Multi-phase lifecycle (idle → editing → submitting → success/error).
- Server errors that must appear on specific fields, not a generic banner.
- Dirty tracking and navigation warnings.

**Decision rule:**
- Simple mutation form + progressive enhancement → `useActionState`.
- State that belongs in the URL → URL-state.
- Complex, sensitive, multi-phase form → `useReducer` state machine.

---

## Files Changed

| File | Notes |
|---|---|
| `app/(challenges)/c17-form-state-machine/_lib/form-reducer.ts` | State machine — all transitions, cross-field validation, dirty tracking |
| `app/(challenges)/c17-form-state-machine/_lib/actions.ts` | Server Action — Zod validation, superRefine, createOrder |
| `app/(challenges)/c17-form-state-machine/_components/CheckoutForm.tsx` | Client form component — useReducer, useTransition, controlled inputs |
| `app/(challenges)/c17-form-state-machine/page.tsx` | Static shell page |
| `app/(challenges)/c17-form-state-machine/_meta/` | Config, spec, defend-it, verification |
| `solutions/c17-form-state-machine/NOTES.md` | This file |
| `solutions/c17-form-state-machine/page.tsx` | Solution index page (re-uses challenge component) |
| `solutions/c17-form-state-machine/_lib/form-reducer.ts` | Annotated reference reducer |
