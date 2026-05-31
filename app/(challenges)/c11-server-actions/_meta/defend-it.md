# Defend-It Worksheet — Server Actions: Forms That Work Without JavaScript

> **Instructions:** Fill in your answers BEFORE reading the reference solution
> under `solutions/c11-server-actions/`.  Write in your own words — the goal
> is explicit reasoning, not a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Progressive Enhancement

*Explain what "progressive enhancement" means for an HTML form.  How does
a `<form action={serverAction}>` work when JavaScript is completely disabled
in the browser?  What does the browser send, and what does Next.js do with it?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Progressive enhancement means the feature works at its baseline level without
any JavaScript and then improves when JavaScript is available.  For a form,
the baseline is a native HTML form POST.

When JavaScript is disabled:
1. The user fills in the form fields and clicks the submit button.
2. The browser serialises the form fields into a `multipart/form-data` (or
   `application/x-www-form-urlencoded`) POST body and sends a full HTTP POST
   request to the server — this is standard, decades-old browser behaviour
   that requires zero JavaScript.
3. Next.js receives the POST, identifies the target Server Action from a
   hidden `$ACTION_ID` field that Next.js automatically injects into the HTML
   form, and invokes the action function with a `FormData` object constructed
   from the POST body.
4. The action runs, mutates data, and either calls `redirect()` or simply
   returns.  Next.js then responds with the new page HTML — a full-page reload
   from the browser's perspective.

With JavaScript enabled, React intercepts the form submission before the
browser fires the native POST, calls the action via a `fetch` under the hood,
and updates only the affected parts of the UI using concurrent rendering.

</details>

---

### Q2 — useActionState vs useState

*Why use `useActionState` instead of a plain `useState` + `fetch` call to
submit the form data?  Name at least two advantages.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

1. **Progressive enhancement** — `useActionState` integrates with the `<form
   action={...}>` prop so the form works without JavaScript.  A plain
   `useState` + `fetch` approach requires JavaScript — if it fails to load,
   the form is broken.

2. **Server-side state flows back automatically** — The action's return value
   becomes the `state` on the client without any additional `fetch` / JSON
   deserialisation plumbing.  You return `{ errors: { rating: "too low" } }`
   from the action and it arrives in the component as `state.errors.rating`.
   With `useState` + `fetch` you must manually parse the JSON response and
   call `setState`.

3. **Pending state is automatic** — `useActionState` returns `isPending` (and
   the companion hook `useFormStatus` exposes it to child components) so you
   get a loading UI with no extra boilerplate.

4. **Type safety** — the action, its return type, and the client state are all
   typed in one place, reducing the surface area for mistakes.

</details>

---

### Q3 — useFormStatus placement

*Why must the `<SubmitButton>` that reads `useFormStatus()` be a separate
child component rather than being inlined in the same component that renders
the `<form>`?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`useFormStatus()` works by reading React context that the enclosing `<form>`
element provides **to its children**.  A component cannot read context provided
by an element it is currently rendering — the `<form>` element and its context
don't exist yet at the time the parent component's render function executes.

Put differently: when `ParentForm` renders `<form action={...}>`, the form's
React context (including the `pending` flag) is only visible to components
rendered as descendants of that `<form>`.  If you call `useFormStatus()` in
`ParentForm` itself, you are calling it outside the `<form>`'s context and get
`{ pending: false, data: null, method: null, action: null }` regardless of the
actual submission state.

The fix: extract `<button type="submit">` into its own `<SubmitButton>`
component that is rendered as a child of the `<form>`.  `useFormStatus()` in
that child correctly reads the parent form's pending state.

</details>

---

### Q4 — Server Actions are public endpoints

*Server Actions look like private function calls but they are actually public
POST endpoints.  What are the security implications?  What does this challenge
NOT cover (deferred to C12)?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

At runtime Next.js gives every `"use server"` function a unique action ID and
exposes a server-side handler that receives POST requests containing that ID.
A malicious caller can construct the same POST request manually using `curl`
or a fetch call, bypassing any client-side validation entirely.

Implications:
- **Input must be validated server-side** — HTML `required`, `min`, `max`, and
  `pattern` attributes only run in the browser.  An attacker sends raw POST
  data; the action receives whatever `FormData` values it wants.
- **Authentication is mandatory** — without checking who the caller is, anyone
  on the internet can invoke the action.  This challenge deliberately uses a
  hard-coded demo user to keep the focus on the mechanics.
- **Ownership must be checked** — even an authenticated user must only be
  allowed to mutate resources they own.
- **CSRF** — Next.js adds same-origin enforcement for Server Actions
  automatically (the `Origin` header is checked), but any additional
  cross-origin relaxation (CORS) must be explicit.

What C12 covers: authentication guard (session check before the mutation),
ownership validation, and rate limiting.

</details>

---

### Q5 — revalidateTag vs revalidatePath

*Both `revalidateTag` and `revalidatePath` can invalidate cached data.  When
would you prefer one over the other?  Give a concrete example from this
challenge.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`revalidateTag(tag)` invalidates all cache entries that were tagged with that
specific string — across every route that uses that tag.  It is surgical: it
only purges the entries that are relevant to the mutation.

`revalidatePath(path)` invalidates the full Route Cache for a specific URL
(including layout, page, and any `'use cache'` calls within it).  It is blunt:
it forces a full re-render of that route on the next visit.

In this challenge:
- Use `revalidateTag(tags.reviews(productId))` after `addReview()` to
  invalidate only the cached review list for that product — no other product's
  cache entries are affected.
- Optionally also call `revalidatePath("/challenges/c11-server-actions")` to
  ensure the outer page shell is also refreshed if it caches any review counts.

Prefer `revalidateTag` when you have fine-grained tag control (you do, because
`lib/data/tags.ts` defines `tags.reviews(productId)`) — it is cheaper than
blowing away an entire route.  Use `revalidatePath` as a fallback when you
do not have tag control over the data that changed (e.g. invalidating a page
that reads from an external API you did not instrument with `cacheTag`).

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Progressive enhancement mechanics | | |
| 2 | useActionState vs useState | | |
| 3 | useFormStatus placement rule | | |
| 4 | Server Actions as public endpoints | | |
| 5 | revalidateTag vs revalidatePath | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don&apos;t know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c11-server-actions/`.*
