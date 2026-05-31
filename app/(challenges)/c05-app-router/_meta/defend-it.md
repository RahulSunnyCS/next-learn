# Defend-It Worksheet — App Router Architecture

> **Instructions:** Fill in your answers BEFORE you look at the reference solution
> under `solutions/c05-app-router/`.  Write in your own words — the goal is to force
> explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Intercepting routes and hard-refresh

You've built the `@modal/(.)products/[id]` intercepting route.  A teammate copies the URL
from their browser and pastes it into Slack.  When a colleague clicks the link, they see the
full product page — not the modal.  Your teammate thinks it's broken.  Explain why this is
actually the correct behaviour, and how Next.js decides which component to render.

**Your answer:**

<!-- Write here -->

---

### Q2 — Why default.tsx is required for @modal

You remove `@modal/default.tsx` and visit `/challenges/c05-app-router`.  Next.js returns a
404 even though `page.tsx` exists.  Explain why the `default.tsx` file is required and what
contract it fulfils for parallel routes.

**Your answer:**

<!-- Write here -->

---

### Q3 — Why error.tsx must be a Client Component

Explain why the `"use client"` directive at the top of `error.tsx` is non-negotiable — you
cannot make it a Server Component even if you wanted to.  What does React require of error
boundaries that makes this a hard constraint?

**Your answer:**

<!-- Write here -->

---

### Q4 — (.) vs (..) interception prefix

In `@modal/(.)products/[id]`, the `(.)` means "same level as the slot's parent segment".
If the `@modal` folder were one level deeper (e.g. `app/(challenges)/@modal/`), what prefix
would you need to intercept `c05-app-router/products/[id]`, and why?

**Your answer:**

<!-- Write here -->

---

### Q5 — notFound() vs throwing an error

Your product detail page calls `notFound()` when the product is missing.  A junior dev says
"why not just throw a new Error('not found')? That would trigger error.tsx".  Explain the
difference in outcome: what does each approach render, and which is correct for a missing
resource?

**Your answer:**

<!-- Write here -->

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Intercepting routes and hard-refresh |             |       |
| 2 | Why default.tsx is required          |             |       |
| 3 | error.tsx must be a Client Component |             |       |
| 4 | (.) vs (..) prefix                   |             |       |
| 5 | notFound() vs throw new Error        |             |       |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c05-app-router/`.*
