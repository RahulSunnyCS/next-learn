# Solution Notes — C18 Optimistic UI

## What was built

A product review page where each review has a "Helpful" button.  Clicking the
button:

1. Increments the count **instantly** in the UI (optimistic update) before the
   server responds.
2. Sends a Server Action in the background to persist the vote.
3. On **success**: the server confirms, `revalidateTag` purges the cache, the
   parent re-renders with the authoritative count, and `useOptimistic` snaps to
   it.
4. On **failure** (every 3rd click is forced to fail): the count **rolls back**
   to the pre-click value automatically.  An error message appears.  No phantom
   +1 lingers.

---

## The graded focus: rollback and reconciliation

### Why useOptimistic, not useState

A plain `useState` counter stays at `count + 1` after a failed action unless
you explicitly call `setState(prevCount)` in the catch block — easy to forget,
and the bug is invisible until a user's count drifts in production.

`useOptimistic` makes rollback structurally impossible to forget.  The optimistic
value is scoped to a React **transition**:

```
optimisticValue ─► temporary overlay on serverValue
                 │
                 └─ when transition ends:
                      success → snaps to new serverValue (from revalidation)
                      failure → snaps back to old serverValue (rollback)
```

The revert is automatic.  The component never needs to call anything to undo
the optimistic update on failure.

### The rollback sequence (step by step)

1. User clicks "Helpful".  `startTransition` begins.
2. `addOptimistic(serverHelpfulCount + 1)` fires.  React immediately
   re-renders with `optimisticCount = serverHelpfulCount + 1`.  The button
   shows the new count before the network request starts.
3. The Server Action runs on the server.  Call counter hits a multiple of 3:
   the action returns `{ success: false, error: "Simulated server error..." }`.
4. The transition ends.  Because the parent did not receive new
   `serverHelpfulCount` props (revalidation never ran), `useOptimistic`
   resets `optimisticCount` to the current `serverHelpfulCount` (the
   pre-click value).
5. The component reads `result.error` from the action return value and stores
   it in a separate `useState<string | null>`.  The error banner appears.
6. The count shown is now identical to the server's authoritative count.
   Reconciliation is complete: `optimisticValue === serverValue`.

### The reconciliation sequence (happy path)

1. User clicks "Helpful".  Optimistic count shows `+1` immediately.
2. Server action persists the vote and calls
   `revalidateTag(tags.reviews(productId))`.
3. The parent Server Component re-renders (triggered by the invalidation).
   It fetches the updated `helpfulCounts` from the in-process store and passes
   the new count as a prop to `ReviewLikes` → `ReviewRow`.
4. `useOptimistic` in `ReviewRow` receives the new `serverHelpfulCount` prop.
   The transition has ended, so `optimisticCount` snaps to `serverHelpfulCount`.
   The displayed count is now the server-authoritative value — reconciliation
   complete.

---

## Key implementation decisions

### 1. Per-review `ReviewRow` component (not a single loop)

React hooks must be called at the top level of a component, not inside a loop.
We cannot call `useOptimistic` once per iteration inside `ReviewLikes`.  The
solution: extract each review card into its own `<ReviewRow>` component that
independently calls `useOptimistic` for its own count.  One hook call per
component instance — the rules are satisfied.

### 2. `startTransition` is required

`useOptimistic` only guarantees its rollback contract inside a React transition.
When the action is triggered imperatively (via `onClick`, not via
`<form action>`), we must call `startTransition` explicitly to scope the
optimistic update.  Without it, the rollback behaviour is undefined.

When the action is used as a `<form action={...}>` prop, React 19 wraps the
submission in a transition automatically.  We use `onClick` + `startTransition`
here to keep the FormData construction explicit and visible to learners.

### 3. Separate `useState` for errors

`useOptimistic` tracks the speculative value of a single piece of data
(the helpful count).  It has no concept of errors — those are orthogonal.  We
use a plain `useState<string | null>` for the error message.  The two states
are independent: `useOptimistic` handles the count, `useState` handles the
error.

### 4. In-process `Map` for helpful counts

The frozen `lib/data` layer does not have a `helpfulVote` field on `Review`.
Rather than mutating the library (forbidden by the task contract), we maintain
a module-level `Map<reviewId, count>` in `_lib/actions.ts`.  This map is
shared across all requests within a single server process and resets on server
restart — appropriate for a teaching demo, not for production.

### 5. Simulated failure counter

The `callCounter` module variable increments on every `markHelpful` call.
When `callCounter % 3 === 0`, the action returns a failure state without
persisting the vote.  This makes the failure path reliably reproducible so
learners can click exactly 3 times and see the rollback — no need to simulate
network errors via DevTools throttling.

### 6. `connection()` before `lib/data` reads

`lib/data` repository functions use `Math.random()` for simulated latency.
Under `cacheComponents: true`, any non-deterministic call during static
prerender fails the build.  The fix is to `await connection()` (from
`next/server`) before calling these functions — this marks the component as
dynamic and moves the execution to request-time.  The component is inside
`<Suspense>` so the build succeeds.

---

## What this challenge deliberately leaves out

- **Per-user vote deduplication** — a production implementation would check
  whether the user already voted before applying the +1.  The demo allows
  unlimited clicks to keep the interaction testable.
- **Persistent storage** — votes are in-process memory and reset on server
  restart.  Production would use a database.
- **Authentication enforcement** — `getSession()` is called and the auth
  pattern is shown, but unauthenticated users are allowed (guest fallback) so
  the demo works without login.  C12 covers full auth enforcement.
- **Rate limiting** — not implemented; out of scope for this challenge.

---

## Files

| File | Purpose |
|------|---------|
| `page.tsx` | Static shell + `<Suspense>` dynamic hole; passes `helpfulCounts` to client |
| `_components/ReviewLikes.tsx` | `useOptimistic` per `ReviewRow`; rollback + error display |
| `_lib/actions.ts` | `"use server"` action; simulated failure counter; in-process vote store |
| `_meta/spec.md` | Learning goals, tasks, acceptance criteria, hints |
| `_meta/defend-it.md` | 5 from-memory questions with model answers |
| `_meta/verification.md` | Human-runnable checklist |
| `_meta/challenge.config.json` | Registry entry (id: 19, tier: 3, slug: c18-optimistic-ui) |
| `_meta/challenge.config.ts` | Typed re-export of the JSON config |
| `solutions/c18-optimistic-ui/NOTES.md` | This file — rollback and reconciliation notes |
