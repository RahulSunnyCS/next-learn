# Defend-It Worksheet — Cart State: Persisted, Hydration-Safe, Reconciled on Login

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c15-cart-state/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — The hydration mismatch problem

*You persist the cart in localStorage.  The server renders the page with an
empty cart (it cannot read localStorage).  The client loads and finds items in
localStorage.  What specific error does React produce, and why?  What is the
general pattern to fix it?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

React renders the server-generated HTML to the DOM first (this is the "hydration"
step).  It then runs the client-side render and compares the result with the
existing HTML.  If they differ — for example, the server rendered "0 items" but
the client render produces "3 items" (because it found those in localStorage) —
React throws:

> Warning: Text content did not match. Server: "0" Client: "3"

Or, for more complex mismatches:

> Error: Hydration failed because the initial UI does not match what was
> rendered on the server.

The fix: never read localStorage during the first render.  Use a `mounted` flag
(set to `true` in a `useEffect`) so the first client render produces the same
output as the server (empty cart).  Only after the component mounts (and
hydration is complete) does the `useEffect` fire and load the persisted data.
Zustand's `skipHydration: true` + `rehydrate()` in `useEffect` is the same
pattern expressed through the persist middleware.

</details>

---

### Q2 — `skipHydration` vs a `mounted` flag

*Zustand's `persist` middleware has a `skipHydration` option.  What does it
do?  How does it differ from manually adding a `mounted` state variable in a
React Context?  When would you choose each approach?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`skipHydration: true` tells the persist middleware to NOT automatically read
from localStorage when the store is first created.  This means the store starts
with the default initial state (empty cart) on both server and client — they
agree.  You then call `useCartStore.persist.rehydrate()` inside a `useEffect`,
which is safe because `useEffect` only runs on the client after hydration.

The `mounted` flag approach in a React Context is conceptually identical: the
Context starts with the initial state (empty), a `useEffect` fires on mount,
reads localStorage, and calls `dispatch` to hydrate the context.  Any UI that
depends on the cart waits until `mounted === true` before rendering cart data.

Choosing between them:
- Use `skipHydration` when you are already using Zustand's persist middleware —
  it is built-in and requires zero extra code.
- Use the `mounted` flag when you are using React Context, `useReducer`, or any
  custom persistence solution where persist middleware is not available.
- Both are equally correct; they solve the same problem at different abstraction
  levels.

</details>

---

### Q3 — Optimistic updates

*"Add to Cart" updates the UI immediately — before any server confirmation.
What are the risks of optimistic updates?  How does this challenge mitigate
them?  When would you NOT use optimistic updates?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Optimistic updates assume the operation will succeed and update the UI instantly,
rolling back only on failure.  Risks:

1. **False success.** The server may reject the add (e.g. out of stock, product
   deleted).  If the UI shows "in cart" but the server rejects, you must roll
   back the local state — and the user may have navigated away.

2. **Stale data.** If another tab or device adds the same item, the optimistic
   state in the current tab diverges from the real server state.

3. **Confusing rollback UX.** Removing an item the user just "added" is
   jarring unless the rollback animation and error message are well-designed.

This challenge mitigates risk by: (a) storing the cart client-side only — there
is no server mutation to fail; (b) using in-memory product data from `lib/data`
that does not have network failure modes in development.

When NOT to use optimistic updates: financial transactions (payment processing
where a failure costs money), destructive operations (delete account, place
order), or any action where the server has authoritative side effects that
cannot be reversed cleanly.

</details>

---

### Q4 — Cart reconciliation on login

*A guest has 3 items in their cart.  They log in and their account already has
2 items in a saved cart.  One product appears in both carts with different
quantities.  Describe the merge strategy this challenge uses.  What alternative
strategies exist, and what are the tradeoffs?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

This challenge uses a **take-the-max** strategy: for items that appear in both
the guest cart and the server cart, keep whichever quantity is larger.  For
items that appear in only one cart, keep them as-is.  This strategy never
silently drops items.

Example: guest has `{shoe: 2, hat: 1}`, server has `{shoe: 3, bag: 1}`.
Merged: `{shoe: 3, hat: 1, bag: 1}`.

Alternative strategies:

1. **Guest wins.** Replace the server cart entirely with the guest cart.
   Simple, but loses server-side items the user added on another device.

2. **Server wins.** Discard the guest cart if any server cart exists.
   Safest for financial correctness (no mystery items), but frustrating if
   the guest added items before remembering to log in.

3. **Add quantities.** Sum quantities for shared products.  Risk: unintended
   bulk purchases (user adds 1 item on mobile, has 1 saved on server, now
   they have 2 — were they expecting that?).

4. **Prompt the user.** Show a dialog: "You have 3 items from your session and
   2 saved items. Merge or replace?"  Best UX, most code.

The take-the-max approach is a reasonable default because it always preserves
intent (the user wanted at least that quantity) without silently multiplying
quantities.

</details>

---

### Q5 — Context re-render cost

*Why do React Context consumers re-render on every state change, even if the
component only reads one field from the cart?  How does Zustand avoid this?
Give a concrete example with the cart widget and a product card.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

React's Context is based on reference equality: whenever the value passed to
`<Context.Provider value={...}>` changes, EVERY component that called
`useContext(CartContext)` re-renders — even if the specific field it reads
did not change.

Concrete example: the cart widget reads `items.length` (the count).  A product
card also reads `items` to know whether a product is already in the cart.  When
the user updates the quantity of item A (which changes `items`), the product
card for item B also re-renders, even though item B's state did not change.
For a product list with 50 items, that is 50 unnecessary re-renders.

Mitigation for Context: split the context into a "data" context and a "dispatch"
context.  Reads go to the data context (re-renders on any data change), writes
go to the dispatch context (stable reference — never triggers re-renders).
Further optimisation: `useMemo` + `useCallback` on the state object.

Zustand avoids this with **selectors**.  `useCartStore(state => state.items.length)`
creates a subscription to exactly that derived value.  React only schedules a
re-render for this component if `items.length` changes.  If you update the
quantity of an item without changing the count, the badge component does NOT
re-render.  This is the primary performance advantage of Zustand over Context
for medium-to-large state trees with many consumers.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Hydration mismatch problem | | |
| 2 | `skipHydration` vs `mounted` flag | | |
| 3 | Optimistic updates | | |
| 4 | Cart reconciliation on login | | |
| 5 | Context re-render cost | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c15-cart-state/`.*
