# Challenge Spec — Optimistic UI: Instant Updates with Graceful Rollback

> **File:** `app/(challenges)/c18-optimistic-ui/_meta/spec.md`

---

## Learning Goal

Master `useOptimistic` — React's built-in hook for showing an instant
speculative update while a Server Action runs in the background.  The graded
focus is **not** the happy path.  It is the **failure path**: what happens when
the server rejects the mutation, how the optimistic state rolls back to the
pre-action value, and how the UI then reconciles with the authoritative data
that the server revalidated.

---

## Background: What is Optimistic UI?

Without optimistic UI, a user clicks a "Helpful" button and waits for a
server round-trip before anything on screen changes — even though the outcome
is almost always success.  The wait feels sluggish.

Optimistic UI (sometimes called "optimistic updates") applies the **expected**
result to the UI immediately, before the server responds.  If the server
confirms the action, the optimistic value is already correct and a subtle
reconcile makes it authoritative.  If the server **rejects** the action, React
must **roll back** to the state it held before the action was applied.

### `useOptimistic` — the React primitive

```ts
const [optimisticValue, addOptimistic] = useOptimistic(
  serverValue,               // the "real" value from the server
  (currentState, newValue) => newValue  // how to merge a new optimistic update
);
```

- `serverValue` is what is currently stored on the server (passed in as a prop).
- `optimisticValue` is what the component should **display** — during an
  in-flight action this is the speculative value; outside an action it equals
  `serverValue`.
- `addOptimistic(newValue)` enqueues an optimistic update.  Call it inside a
  `startTransition` callback (React 19 does this automatically when you use the
  action as a form action).

### The reconciliation contract

`useOptimistic` reverts automatically once the enclosing transition settles.
Two outcomes:

| Outcome | What happens |
|---------|-------------|
| Server action **succeeds** | Parent re-renders with updated `serverValue`; `optimisticValue` snaps to the new authoritative count. |
| Server action **fails / throws** | The transition ends without a new `serverValue`; `optimisticValue` snaps back to the old `serverValue`. React does **not** touch local UI state beyond this — error display is the component's responsibility. |

The critical insight: **`useOptimistic` never permanently diverges from
`serverValue`.** When the transition ends, the displayed value is guaranteed to
equal whatever `serverValue` the parent passed in — the optimistic layer is a
temporary override, not a permanent local state fork.

### Why this matters

A naive implementation that maintains a local `useState` counter will diverge
permanently if the server rejects the action.  `useOptimistic` prevents that
class of bug at the type level: the speculative update is strictly scoped to
the in-flight transition.

---

## Scenario

The Nextmart product page shows reviews.  Each review has a `Helpful` button
that lets users mark the review as useful.  The demo simulates a "helpful"
count directly in the in-memory store via a Server Action.

The **failure mode** is the lesson: every 3rd submission is forced to fail (a
simulated transient server error).  When failure occurs:

1. The helpful count reverts to the pre-click value (rollback).
2. An error message appears explaining why the update was rejected.
3. The count shown after rollback matches the server-authoritative value
   (reconciliation).

---

## Tasks

### Part 1 — Build the Server Action

- [ ] **T1 — `_lib/actions.ts`.**  Write a `"use server"` action
  `markHelpful(prevState, formData)` that:
  - Reads `reviewId` and `currentHelpfulCount` from `FormData`.
  - Reads the session with `getSession()` (inside the Server Action — the
    action already runs on the server, so no Suspense boundary is needed here).
  - Falls back to a guest identity if the session is null (so the demo works
    without login, but teaches the auth-check pattern).
  - Every 3rd call (tracked with a module-level counter) throws a simulated
    server error — this is the **forced failure** that exercises rollback.
  - On success, updates the in-memory helpful count (via `addHelpfulVote` in
    `_lib/helpfulStore.ts` — a local helper, NOT editing `lib/data`) and calls
    `revalidateTag(tags.reviews(productId))`.
  - Returns `{ success: boolean; error?: string; helpfulCount: number }`.

### Part 2 — Build the Client Component

- [ ] **T2 — `_components/ReviewLikes.tsx`.**  A `"use client"` component that:
  - Accepts `reviews` (array), `productId` (string), and a `helpfulCounts` map
    (record of reviewId → count) as props.
  - For each review, calls `useOptimistic` to track the **displayed** helpful
    count during in-flight transitions.
  - Wraps `markHelpful` in a `startTransition` (or uses a `<form>` action)
    so React treats it as a non-urgent update and allows the optimistic state
    to apply before the server responds.
  - On action **success** — the optimistic count is confirmed; the
    revalidated server value reconciles with it on the next render.
  - On action **failure** — the optimistic update rolls back; the error
    message from `prevState.error` is surfaced next to the button.

### Part 3 — Build the Page

- [ ] **T3 — `page.tsx`.**  Static shell + Suspense-wrapped dynamic hole
  that reads the session (inside the hole), fetches reviews + helpful counts,
  and passes them as props to `<ReviewLikes>`.

### Part 4 — Defend Your Understanding

- [ ] Fill in `_meta/defend-it.md` **before** reading
  `solutions/c18-optimistic-ui/`.

---

## Acceptance Criteria

1. Clicking "Helpful" updates the count instantly (optimistic update visible
   before the server responds — no loading spinner, no wait).
2. When the server **succeeds**, the final displayed count equals the
   server-authoritative value after cache revalidation.
3. When the server **rejects** (every 3rd click), the count **rolls back**
   to the pre-click value and an error message appears — no phantom +1 lingers.
4. No React or hydration errors are thrown during rollback.
5. The displayed count after rollback matches the value passed in from the
   server (no drift between `optimisticValue` and `serverValue`).
6. `NOTES.md` in `solutions/c18-optimistic-ui/` documents the rollback
   semantics and reconciliation behaviour as the primary lesson.
7. `challenge.config.json` matches `{ id: 19, tier: 3, slug: "c18-optimistic-ui" }`.

---

## Hints

<details>
<summary>Hint 1 — useOptimistic signature</summary>

```ts
const [optimisticCount, addOptimistic] = useOptimistic(
  serverCount,
  (_current, next: number) => next
);
```

Call `addOptimistic(serverCount + 1)` inside a `startTransition` before the
Server Action runs.  React sets `optimisticCount = serverCount + 1` immediately
and the button re-renders without waiting.

</details>

<details>
<summary>Hint 2 — Triggering rollback on failure</summary>

`useOptimistic` rolls back automatically when the enclosing transition ends
without a new server value.  To trigger rollback, throw an error inside the
Server Action (or return a failure state and have the calling code NOT call
`addOptimistic`).  The safest pattern: put `addOptimistic` and the Server
Action call both inside a `startTransition` callback.  If the action throws,
React abandons the transition and reverts `optimisticCount` to `serverCount`.

</details>

<details>
<summary>Hint 3 — Surfacing the error after rollback</summary>

`useOptimistic` does not store an error for you — that is outside its contract.
Maintain a separate `useState<string | null>` for the error message.  Clear it
on the next successful click; set it when the Server Action returns
`{ success: false, error: "..." }`.

</details>

<details>
<summary>Hint 4 — Per-review state with useOptimistic</summary>

Each review needs its own optimistic counter.  If you have N reviews and put
them all in a single list component, you can call `useOptimistic` per review
by extracting each row into its own `<ReviewRow>` client component — React
hooks must be called unconditionally at the top level of a component.

</details>

<details>
<summary>Hint 5 — Reconciliation after success</summary>

After a successful action the parent page re-renders (triggered by
`revalidateTag`).  It passes the updated `helpfulCounts` as new props to
`ReviewLikes`.  `useOptimistic` in each row sees the new `serverCount` and
snaps `optimisticCount` to it — this is automatic, you do not need to call
anything.  The displayed count is now the authoritative server value.

</details>
