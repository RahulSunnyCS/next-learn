# Defend-It Worksheet — C16: URL as Single Source of Truth

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c16-url-state/`. Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Why is URL-as-state better than a client store (useState/Zustand) for product filters?

*Think about: what happens when a user refreshes the page, shares the URL,
presses Back, or opens the page in a new tab. How does each approach handle
these scenarios?*

**Your answer:**

<!-- Write here -->

---

### Q2 — Why must `await searchParams` be read INSIDE a `<Suspense>` boundary and NOT at the top level of the page component?

*Think about: what does `cacheComponents: true` enforce? What is the build
error if you read dynamic data outside Suspense? What does "static shell" mean
in this context?*

**Your answer:**

<!-- Write here -->

---

### Q3 — Why is the text-search input debounced, and why use `router.replace` instead of `router.push`?

*Think about: what happens if you push a history entry for every keystroke. How
does the debounce pattern with `useRef` work vs `useState`? What does Back do
in each case?*

**Your answer:**

<!-- Write here -->

---

### Q4 — The `FilterBar` component uses `useSearchParams()` to read values. Why does this mean the filter inputs automatically reflect the URL on initial load and on browser back/forward?

*Think about: what `useSearchParams()` actually returns. When does it update?
What about a shared link — what does the filter show when the URL already has
`?category=electronics`?*

**Your answer:**

<!-- Write here -->

---

### Q5 — Name two situations where you would NOT use URL state and would use a client store instead. Explain why URL state is wrong for each.

*Think about: the limits of URL state — length, visibility, serialisation.*

**Your answer:**

<!-- Write here -->

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | URL state vs client store |  |  |
| 2 | searchParams + Suspense constraint |  |  |
| 3 | Debounce + router.replace |  |  |
| 4 | useSearchParams reflects URL on load and navigation |  |  |
| 5 | Limits of URL state |  |  |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague on a whiteboard. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c16-url-state/`.*
