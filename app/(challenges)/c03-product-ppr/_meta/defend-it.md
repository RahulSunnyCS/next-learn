# Defend-It Worksheet — C03: Product Detail PPR + Streaming SSR

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c03-product-ppr/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — What is a "static shell" in PPR and how does it reach the browser faster than full SSR?

*Think about: when is the shell produced? What happens to it between deploys?
How does that differ from a dynamic SSR page?*

**Your answer:**

<!-- Write here -->

---

### Q2 — Why must the dynamic holes (LiveInventory, Recommendations, Reviews) be inside `<Suspense>` boundaries and NOT at the top level of the page component?

*Think about: what would `next build` do if you called `getProductBySlug`
(uncached) at the page's top level? What rule does `cacheComponents: true`
enforce?*

**Your answer:**

<!-- Write here -->

---

### Q3 — Explain the "error after flush" gotcha. Draw or describe the timeline:

```
Request arrives
      │
      ▼
[Shell rendered + flushed]  → HTTP 200 sent
      │
      ▼
[Suspense hole resolves...]
      │
      ├─ Success → hole HTML streamed to client
      └─ ERROR  → ???
```

*What does the browser see? Can the HTTP status change to 500?
Where does `error.tsx` fit in this picture?*

**Your answer:**

<!-- Write here -->

---

### Q4 — What is the difference between `loading.tsx` and a manual `<Suspense>` boundary? When would you use each?

*Sketch two diagrams: one showing `loading.tsx` wrapping the entire page, and
one showing three independent `<Suspense>` boundaries each wrapping a different
part of the page.*

**Your answer:**

<!-- Write here -->

---

### Q5 — When should you use PPR (◐) vs full SSG (○) vs full SSR/dynamic (ƒ)?

*Name the three routes from this table and give one real-world example for each:*

| Symbol | Strategy | Example route you'd use it for |
|--------|----------|-------------------------------|
| ○      | SSG (full static)  |  |
| ◐      | PPR (shell + holes)|  |
| ƒ      | Dynamic (full SSR) |  |

**Your answer:**

<!-- Write here -->

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Static shell in PPR |  |  |
| 2 | Dynamic holes + Suspense constraint |  |  |
| 3 | Error-after-flush gotcha |  |  |
| 4 | loading.tsx vs manual Suspense |  |  |
| 5 | PPR vs SSG vs SSR decision |  |  |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague on a whiteboard. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c03-product-ppr/`.*
