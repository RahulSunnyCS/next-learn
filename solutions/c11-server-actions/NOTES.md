# Solution Notes — C11 Server Actions

## What Was Built

A product review form that demonstrates the core Server Actions mechanics:

1. A `"use server"` action (`submitReview`) in `_lib/actions.ts`.
2. A `"use client"` form component (`ReviewForm.tsx`) that wires the action
   using `useActionState`.
3. A `SubmitButton` child component that reads `useFormStatus().pending` to
   show a spinner while the action is in-flight.
4. A static shell page (`page.tsx`) that wraps the dynamic review panel in
   `<Suspense>` per the Cache Components rules.
5. Cached data helpers (`getCachedReviews`, `getCachedProduct`) that use
   `'use cache'` + `cacheTag` so `revalidateTag` can invalidate them after a
   successful write.

---

## Progressive Enhancement: How It Works Without JavaScript

**Test procedure:**

1. Open Chrome DevTools.
2. Press `⌘+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux).
3. Type "Disable JavaScript" and run the command.
4. Navigate to `/challenges/c11-server-actions`.
5. Fill in the rating and review fields.
6. Click "Submit Review".

**What you observe:**
- The browser performs a full HTTP POST (you see the page reload in the
  address bar — the spinner in the browser tab fires).
- After the reload, the new review appears at the top of the list.
- If you left the fields empty, the page reloads showing a validation error.
- No JavaScript was involved at any point.

**How it works under the hood:**

Next.js automatically injects a hidden `<input name="$ACTION_ID" value="...">` 
into every `<form action={serverAction}>`.  When the browser sends the
multipart POST, this field tells the Next.js server which action function
to invoke.  The action runs, calls `addReview`, calls `revalidateTag`, and
returns a state object.  The page re-renders server-side with that state —
errors or success — and the HTML response is sent back to the browser, causing
the full-page reload the user sees.

With JavaScript enabled, React intercepts the `submit` event before the
browser fires the native POST, calls the action via a managed `fetch` call,
and updates only the affected component tree — no full-page reload.

---

## useActionState Flow

```
// In ReviewForm.tsx ("use client"):
const [state, formAction, isPending] = useActionState(submitReview, initialState);
//       │         │           │
//       │         │           └─ true while action is in-flight
//       │         └─ pass as <form action={formAction}>
//       └─ the return value of the last action call

// In actions.ts ("use server"):
export async function submitReview(
  prevState: ReviewActionState,  // ← what the action returned last time
  formData: FormData             // ← the form's fields
): Promise<ReviewActionState> {
  // validate → mutate → revalidate → return state
}
```

The `prevState` argument is passed by React automatically — it is the return
value of the previous call (or `initialState` on the first call).  This
allows the action to inspect previous errors or values if needed.

---

## useFormStatus Placement Rule

```
// CORRECT: useFormStatus in a child component rendered inside the <form>
function SubmitButton() {
  const { pending } = useFormStatus();  // reads the enclosing <form>'s state
  return <button disabled={pending}>Submit</button>;
}

function ReviewForm() {
  return (
    <form action={formAction}>
      ...
      <SubmitButton />  {/* inside the <form> → works */}
    </form>
  );
}

// WRONG: useFormStatus in the same component that renders <form>
function ReviewForm() {
  const { pending } = useFormStatus();  // reads OUTER form context → always false
  return (
    <form action={formAction}>
      <button disabled={pending}>Submit</button>  {/* never goes pending */}
    </form>
  );
}
```

---

## revalidateTag vs revalidatePath

After `addReview` succeeds, the action calls:

```ts
revalidateTag(tags.reviews(productId));
// → purges all 'use cache' entries tagged `reviews:${productId}`
// → surgical: only this product's review list is invalidated

revalidatePath("/challenges/c11-server-actions");
// → purges the full route cache for this URL (belt-and-suspenders)
// → blunt: forces re-render of the entire route on next visit
```

In production you would typically use `revalidateTag` only — it is cheaper
and more targeted.  `revalidatePath` is added here as a safety net to show
that both mechanisms exist and can be combined.

---

## When to Prefer Server Actions over Route Handlers

| Situation | Prefer |
|---|---|
| HTML form mutation (progressive enhancement matters) | Server Action |
| Mutation tightly coupled to one UI component | Server Action |
| Revalidate cache immediately after write | Server Action |
| External client (mobile app, webhook) calls the endpoint | Route Handler |
| Need custom HTTP status codes or response headers | Route Handler |
| Non-form payload (raw JSON body, binary upload) | Route Handler |
| Building a REST/GraphQL API for multiple clients | Route Handler |

A key difference: a Server Action's URL is **not a stable public API** — the
action ID in the POST body is internal and may change between builds.  If you
need a stable external API, use a Route Handler.

---

## Security Note (Deferred to C12)

This challenge focuses on the happy-path mechanics.  The action here:
- Does NOT check authentication (who is calling it?).
- Does NOT check ownership (can this user review this product?).
- Uses a hard-coded demo user ID.

These gaps are intentional for teaching purposes.  **Do not ship a production
form without adding auth + ownership guards** — any user (or attacker) can
POST to the action endpoint.  C12 (T-14) adds those guards using the
`lib/auth` session.

---

## Files Changed

| File | Purpose |
|---|---|
| `app/(challenges)/c11-server-actions/_lib/actions.ts` | Server Action (validate, mutate, revalidate) |
| `app/(challenges)/c11-server-actions/_components/ReviewForm.tsx` | Client Component — useActionState |
| `app/(challenges)/c11-server-actions/_components/SubmitButton.tsx` | Client Component — useFormStatus |
| `app/(challenges)/c11-server-actions/page.tsx` | Static shell + Suspense + cached data helpers |
| `app/(challenges)/c11-server-actions/_meta/` | Config, spec, defend-it, verification |
| `solutions/c11-server-actions/` | Reference solution with full annotations |
