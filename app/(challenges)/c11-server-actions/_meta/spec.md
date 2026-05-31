# Challenge Spec — Server Actions: Forms That Work Without JavaScript

> **File:** `app/(challenges)/c11-server-actions/_meta/spec.md`

---

## Learning Goal

Understand Server Actions — the mechanism that lets Next.js App Router handle
form mutations on the server without writing a separate Route Handler.  You
will build a review form that works entirely without client-side JavaScript
(progressive enhancement), then layer on `useActionState` for rich inline
validation feedback and `useFormStatus` for a pending UI while the submission
is in flight.  Finally, you will call `revalidateTag` / `revalidatePath` so
the new review appears without a manual cache-bust.

---

## Background: Why Server Actions?

A Server Action is a plain `async` function marked with `"use server"`.  When
that function is used as `<form action={...}>`, Next.js automatically handles
the POST — no `fetch`, no API route, no JSON serialisation needed.  The
function runs exclusively on the server and has direct access to your data
layer, environment variables, and secrets.

Key facts:
- Every Server Action is a **public POST endpoint** at runtime.  Next.js
  routes each action call to the server automatically.  Input MUST be
  validated server-side — client-side validation is UX, not security.
- Actions work **with or without JavaScript**.  The browser submits the HTML
  form natively; the action runs on the server; the page reloads with the
  result.  With JS enabled, React intercepts the POST and updates the UI
  without a full reload.
- Security hardening (authentication, ownership, CSRF protection beyond
  same-origin) is covered in **C12** — this challenge teaches the mechanics.

---

## Scenario

Nextmart product pages display user reviews.  You will build the review form
that lets a user submit a star rating + comment.  The demo uses a fixed
demo user (no auth required — that is C12's job).

---

## Tasks

### Part 1 — The Base Form (Progressive Enhancement)

- [ ] **T1.1 — Build `_lib/actions.ts`.**  Write a `"use server"` action
  `submitReview(prevState, formData)` that reads `productId`, `rating`, and
  `body` from `FormData`, validates them, calls the local `_lib/data.ts`
  wrapper (which calls `addReview`), then calls `revalidateTag(tags.reviews(productId))`.

- [ ] **T1.2 — Verify progressive enhancement.**  Disable JavaScript in your
  browser (DevTools → Settings → Disable JavaScript, or use the NoScript
  extension).  Submit the form.  The page should reload with the new review
  visible.  There should be no error — the form still works.

### Part 2 — Rich Client Enhancement

- [ ] **T2.1 — Wrap the form with `useActionState`.**  Import the action in
  `ReviewForm.tsx` (a Client Component) and pass it to `useActionState`.
  Show inline field errors from the returned state without a full page reload.

- [ ] **T2.2 — Add `useFormStatus` to `SubmitButton.tsx`.**  Create a
  `<SubmitButton>` child component that reads `pending` from `useFormStatus`
  and disables itself + shows a spinner while the action is in flight.

### Part 3 — Cache Revalidation

- [ ] **T3.1 — Confirm revalidation.**  After a successful submission, call
  `revalidateTag(tags.reviews(productId))` and `revalidatePath(...)` in the
  action.  Reload the page — the new review must appear without needing to
  restart the server.

### Part 4 — Defend Your Understanding

- [ ] Fill in `_meta/defend-it.md` with your answers **before** reading
  `solutions/c11-server-actions/`.

---

## Acceptance Criteria

1. `next build` exits 0 with no type or lint errors.
2. The review form at `/challenges/c11-server-actions` renders without errors.
3. Submitting the form with JavaScript **disabled** results in a page reload
   that shows the new review (progressive enhancement works).
4. Submitting an invalid rating (out of range) or empty body shows an inline
   error message (useActionState state).
5. The submit button shows a pending state while the action is in flight
   (useFormStatus).
6. After a successful submission the review list updates on the same page
   without a manual reload (revalidateTag invalidated the cache entry).
7. The action validates all inputs server-side (no reliance on HTML required
   or min/max attributes as the sole guard).
8. `_lib/actions.ts` contains `"use server"` at the top of the file (or on
   the function) and calls `revalidateTag` on success.
9. The `_meta/` folder contains all required files and `challenge.config.json`
   matches `{ id: 12, tier: 2, slug: "c11-server-actions" }`.

---

## When to Prefer Server Actions over Route Handlers

Use a **Server Action** when:
- You are mutating data in response to an HTML form submission.
- You want progressive enhancement (works without JavaScript).
- The mutation is tightly coupled to a single UI component (co-locate the
  action with the form rather than writing a separate endpoint).
- You want to revalidate the cache immediately in the same function.

Use a **Route Handler** (`app/api/.../route.ts`) when:
- An external service (webhook, mobile app, third-party client) needs to call
  your endpoint — a Server Action URL is not a stable public API.
- You need full control over the HTTP response (custom status codes, streaming
  body, `Set-Cookie`, CORS headers).
- You are building a REST or GraphQL API meant to be consumed by multiple clients.
- You need to handle non-form payloads (JSON body, file upload via `multipart`).

**Security note:** A Server Action IS a public POST endpoint.  Never trust
`FormData` values without server-side validation.  Authentication and
ownership checks are mandatory before any mutation — see C12 for the full
story.

---

## Hints

<details>
<summary>Hint 1 — How useActionState works</summary>

`useActionState(action, initialState)` returns `[state, formAction, isPending]`.
Pass `formAction` as the `<form action={...}>` prop.  The `state` value is
whatever the server action returns — start with `{ errors: {}, success: false }`.
Your action signature becomes `async function submitReview(prevState, formData)`.

</details>

<details>
<summary>Hint 2 — Why useFormStatus must be in a child component</summary>

`useFormStatus()` reads the status of the closest enclosing `<form>`.  It must
be called in a component that is rendered **inside** the `<form>`, not in the
same component that renders the `<form>` itself — React cannot read the
pending state of a form it is currently rendering.  The standard pattern is a
small `<SubmitButton>` component that wraps `<button type="submit">` and reads
`useFormStatus().pending`.

</details>

<details>
<summary>Hint 3 — Progressive enhancement mechanics</summary>

When `<form action={serverAction}>` is used and JavaScript is disabled, the
browser sends a native multipart form POST to the Next.js server.  Next.js
intercepts it, invokes the action with the `FormData`, and redirects back
(or re-renders the page).  This is standard HTML form behaviour — no JS
required.  With JS enabled, React additionally calls the action via `fetch`
and avoids the full-page reload.

</details>

<details>
<summary>Hint 4 — revalidateTag signature in Next 16</summary>

In Next.js 16 with cacheComponents, use:
```ts
import { revalidateTag } from "next/cache";
revalidateTag(tags.reviews(productId));
```
Call it **after** the successful write, before returning from the action.
This purges all `'use cache'` entries tagged with that string so the next
render fetches fresh data.

</details>
