# Defend-It Worksheet — Client Form State-Machine

> **Instructions:** Fill in your answers BEFORE reading the reference solution
> under `solutions/c17-form-state-machine/`.  Write in your own words — the
> goal is explicit reasoning, not a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Why useReducer instead of useState?

*Explain why a checkout form with 8+ fields, cross-field rules, dirty tracking,
and a submission lifecycle is better managed with `useReducer` and an explicit
state machine than with individual `useState` calls.  Name at least three
concrete advantages.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

1. **Atomic updates** — a reducer dispatches one action and returns one new
   state object.  React applies it in one render.  With separate `useState`
   calls, setting 5 error states triggers up to 5 renders (or requires manual
   `unstable_batchedUpdates`) and intermediate invalid states can flash.

2. **Illegal states are impossible by construction** — `status` is a single
   field that can only hold one value at a time (`"submitting"` OR `"editing"`,
   never both).  With booleans you can accidentally have
   `isSubmitting=true, isIdle=true` simultaneously.

3. **Cross-field rules are first-class** — the `validateValues()` function
   receives all field values at once.  The `giftMessage` required-when-isGift
   rule is one `if` statement.  With separate atoms it requires a `useEffect`
   watching `isGift` or duplicated checks in every submit path.

4. **All transitions are explicit and discoverable** — every way state can
   change is a case in the `switch`.  You can read the reducer like a spec.
   With scattered `useState`, transitions are spread across event handlers and
   effects across the file.

5. **Dirty tracking is co-located** — the `SET_FIELD` case marks the field
   dirty in the same reducer step that updates the value.  No separate effect
   or handler needed.

</details>

---

### Q2 — Cross-field validation

*The `giftMessage` field is required only when `isGift` is true.  How is this
rule enforced on the client?  How is it enforced on the server?  Why must the
server enforce it independently even though the client already does?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**Client:** in `form-reducer.ts`, `validateValues()` runs on every `SET_FIELD`
dispatch.  It has access to both `values.isGift` and `values.giftMessage`
simultaneously and adds an error to `errors.giftMessage` when the rule is
violated.

**Server:** in `_lib/actions.ts`, the Zod schema uses `.superRefine((data, ctx) => {...})`
on the whole parsed object.  `superRefine` runs after all per-field validators
and receives the fully-parsed data, so it can compare two fields and call
`ctx.addIssue({ path: ["giftMessage"], message: "..." })` to attach the error
to the correct field key.

**Why the server must enforce it independently:** the client is under the
user's control.  A malicious caller can skip the React form entirely and POST
directly to the Server Action endpoint with `isGift=on` and an empty
`giftMessage`.  The server-side Zod validation is the only enforcement that
cannot be bypassed.  Never trust the client.

</details>

---

### Q3 — Dirty tracking

*What is dirty tracking and why does the form disable the submit button until
at least one field is dirty?  How does the reducer track which fields are
dirty?  What clears the dirty flags?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**What it is:** dirty tracking records whether a field has been modified from
its initial (blank) value.  A "dirty" field has been touched by the user; a
"clean" field has not.

**Why the submit button requires dirty:** an unmodified form is identical to
the initial state — submitting it would create a pointless order with blank
delivery details.  Requiring at least one dirty field prevents accidental
submissions on a form the user has not yet started filling in.  It also
prevents double-submits: after a successful submission, resetting the form
clears dirty flags and the button is disabled again immediately.

**How the reducer tracks it:** in the `SET_FIELD` case:
```ts
dirtyFields: { ...state.dirtyFields, [action.field]: true }
```
Each field is keyed in a `Partial<Record<FieldName, boolean>>`.  The flag is
set to `true` the first time the field is changed and is never reverted to
`false` by further edits (even if the user clears the field back to blank —
they still touched it).

**What clears dirty flags:** `RESET` returns `INITIAL_STATE`, which has an
empty `dirtyFields: {}`.  Dirty flags do not clear on submission (so the user
can see unsaved changes are still present if submission fails).

</details>

---

### Q4 — Server error merging

*Explain the flow from "server action returns field errors" to "the error
appears under the correct input".  What does the `SERVER_ERRORS` reducer case
do?  Why does it spread server errors on top of client errors rather than
replacing them entirely?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**Flow:**
1. The Server Action (in `startTransition`) returns
   `{ outcome: "field-errors", fieldErrors: { email: "already taken" } }`.
2. The component dispatches `{ type: "SERVER_ERRORS", fieldErrors: { email: "…" } }`.
3. The reducer merges: `fieldErrors: { ...state.fieldErrors, ...action.fieldErrors }`.
4. Status becomes `"error"` and `isValid` becomes `false`.
5. The `CheckoutForm` component renders `state.fieldErrors.email` as a
   `<p role="alert">` directly under the email `<input>`.

**Why merge rather than replace:** the server only returns errors for the
fields it checked (e.g. email uniqueness, postcode validity).  It does not
re-validate every field.  If the client had an error on `cardNumber` AND a
server error on `email`, replacing fieldErrors entirely would erase the card
error.  Merging (with server errors winning on conflict) preserves the full
picture: the user sees ALL fields that need fixing, regardless of which side
detected each error.

**Why server errors win on conflict:** if both sides flag the same field, the
server error is more specific (e.g. "email already registered" vs the client's
generic "enter a valid email").  The `...action.fieldErrors` spread at the end
ensures the server's message wins.

</details>

---

### Q5 — State machine vs URL-state vs useActionState

*This challenge uses a `useReducer` state machine.  C16 used URL-state.  C11
used `useActionState`.  Give a concrete example of a form where you would
choose each approach, and explain why.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**`useActionState` (C11) — simple single-mutation form:**
A product review form: one or two fields, no cross-field rules, no dirty
tracking, no multi-step lifecycle.  The action's return value is exactly the
state needed to display errors.  Simple and correct — no reducer overhead
needed.

**URL-state (C16) — filter/search/pagination:**
A product search page with a category filter, a price range, a sort
dropdown, and a page number.  These are shareable (you can copy the URL and
send it), browser-back-button navigable, and bookmarkable.  There is no
submission lifecycle, no dirty tracking, and no sensitive data.  URL-state is
the right fit.

**useReducer state machine (this challenge) — complex transient form:**
A checkout or profile editor: 8+ fields, cross-field validation (postcode
depends on country, card expiry must not be past), dirty tracking (warn before
navigating away), and a submission lifecycle with server-returned field errors
that must appear on specific inputs.  The data is transient (not preserved on
refresh) and contains sensitive fields (card number) that must not appear in
the URL.  A state machine is the right fit: atomic updates, explicit lifecycle,
cross-field rules first-class.

**Summary:**
- Simple mutation + progressive enhancement: `useActionState`.
- State that belongs in the URL (shareable, bookmarkable): URL-state.
- Complex transient form with lifecycle and server error merging: `useReducer`
  state machine.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | useReducer vs useState advantages | | |
| 2 | Cross-field validation (client + server) | | |
| 3 | Dirty tracking mechanics | | |
| 4 | Server error merging | | |
| 5 | Choosing between the three approaches | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &ldquo;I don&apos;t know&rdquo; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c17-form-state-machine/`.*
