# Defend-It Worksheet — Optimistic UI: Instant Updates with Graceful Rollback

> **Instructions:** Fill in your answers BEFORE reading the reference solution
> under `solutions/c18-optimistic-ui/`.  Write in your own words — the goal
> is explicit reasoning, not a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — useOptimistic vs useState

*Why does `useOptimistic` roll back automatically on action failure, while a
plain `useState` counter does not?  What is the fundamental difference in
their data-flow models?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`useState` is independent local state — React never automatically reverts it.
If you call `setState(count + 1)` before the server responds and the server
then returns an error, your `setState` has already fired and the value stays
at `count + 1` until you explicitly call `setState(count)` yourself.  You are
responsible for the rollback, and easy to forget.

`useOptimistic` is scoped to a React **transition**.  The optimistic value
lives inside the same concurrent rendering scope as the Server Action call.
When the transition ends (action resolves or rejects), React reconciles the
optimistic state with the `serverValue` that was passed into the hook.  If the
action threw / the parent prop did not change, `optimisticValue` snaps back to
the original `serverValue` automatically — React discards the speculative
override when the transition settles without a new server value.

The key contract: `useOptimistic` is a *temporary overlay* on `serverValue`,
not a fork of it.  Once the transition ends, `optimisticValue === serverValue`.

</details>

---

### Q2 — The rollback mechanism

*Walk through the sequence of events when the Server Action rejects.  What
does React do with the optimistic state, and when exactly does the UI revert?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

1. User clicks "Helpful".  The click handler enters a `startTransition`.
2. Inside the transition, `addOptimistic(serverCount + 1)` is called — React
   immediately re-renders with `optimisticCount = serverCount + 1`.  The button
   shows the new count before the network request even starts.
3. The Server Action fires in the background.  The action encounters the
   simulated error (every 3rd call) and throws.
4. The transition ends in failure — React marks the transition as rejected.
5. Because the parent component did NOT receive new `serverCount` props (the
   revalidation that would trigger that never ran), `useOptimistic` resets
   `optimisticCount` back to `serverCount`.  The button reverts to the old count.
6. The component surfaces the error message from the action's return value in
   a separate `useState<string | null>`.  This is not handled by `useOptimistic`
   itself — error display is the component's responsibility.

The revert happens synchronously when the transition settles (step 5).  From
the user's perspective, the count flashes up momentarily and then snaps back,
accompanied by the error message.

</details>

---

### Q3 — Reconciliation after success

*After a successful action, how does the UI know to switch from the optimistic
value to the authoritative server value?  Who triggers this and when?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The Server Action calls `revalidateTag(tags.reviews(productId))` after the
successful write.  This purges the `'use cache'` entry on the server.

On the next render (which React initiates at the end of the transition), the
parent Server Component re-fetches the reviews and helpful counts from the
now-invalidated cache — getting fresh data from the in-memory store.  It passes
the updated `helpfulCounts` as new props to `ReviewLikes` and then to each
`ReviewRow`.

`useOptimistic` in each row receives the new `serverCount` prop.  Because the
transition has just ended, `optimisticCount` snaps to the new `serverCount`.
The displayed count is now the authoritative server value — the optimistic
overlay dissolved and was replaced by the real data.

No explicit setState is needed: the reconciliation is driven entirely by the
parent re-rendering with new props.

</details>

---

### Q4 — Why `startTransition` is required

*Why must the `addOptimistic` call and the Server Action call both be wrapped
in `startTransition`?  What happens if you call `addOptimistic` outside a
transition?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`useOptimistic` is designed for React concurrent mode transitions.  The
optimistic update is a speculative render — React needs to know it is inside
a transition so that:
1. It can commit the optimistic render immediately to the screen (high-priority
   synchronous paint) while the server work continues in the background.
2. It knows when the transition "ends" so it can revert the overlay.

If you call `addOptimistic` outside a transition, React still applies the
update, but it has no transition boundary to scope the revert to — the
rollback behaviour is undefined/unreliable.  In practice, `useOptimistic`
only guarantees its rollback contract when called within a `startTransition`.

When you use a Server Action as a `<form action={...}>` prop, React 19
automatically wraps the submission in a transition — you do not need to call
`startTransition` explicitly.  If you trigger the action imperatively (e.g. in
an onClick), you must call `startTransition` yourself.

</details>

---

### Q5 — Phantom updates and why they are harmful

*What is a "phantom update" in the context of optimistic UI?  Give a concrete
example from this challenge and explain how `useOptimistic` prevents it.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

A phantom update is an optimistic change that the server rejected, but the UI
still shows as if it succeeded — because the rollback was not implemented or
failed.

Example in this challenge: a user clicks "Helpful" on a review.  The component
immediately shows "5 helpful" (optimistic +1 from 4).  The server rejects the
action (simulated 3rd-click failure).  If rollback is not handled, the button
still shows "5 helpful" even though the server never stored that vote — the
database says 4.  The user sees data that is permanently wrong.

`useOptimistic` prevents this because the optimistic value is scoped to the
transition lifetime.  When the transition ends without a new server value, React
forcibly resets `optimisticCount` to `serverCount` (which is still 4).  There
is no way for the phantom update to persist — the hook's internal model
guarantees `optimisticValue === serverValue` once the transition is over.

A `useState` approach has no such guarantee.  The developer must remember to
call `setState(serverCount)` in the catch path — and every time someone forgets
or the error path is untested, phantom updates can appear in production.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | useOptimistic vs useState | | |
| 2 | Rollback mechanism | | |
| 3 | Reconciliation after success | | |
| 4 | startTransition requirement | | |
| 5 | Phantom updates | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &ldquo;I don&apos;t know&rdquo; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c18-optimistic-ui/`.*
