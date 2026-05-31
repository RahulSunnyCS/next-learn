# Defend-It Worksheet — C08: Current Caching Model (`'use cache'`)

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c08-use-cache/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Name the three placement levels of `'use cache'` and give one sentence explaining when you would choose each over the other two.

*Think about: what changes between file-level, function-level, and component-level?
What is the unit being cached in each case?*

**Your answer:**

<!-- Write here -->

---

### Q2 — What is the difference between React `cache()` and Next.js `'use cache'`? Give a concrete scenario where you would use each.

*Think about: how long does each cache entry live? Who can access it?
What happens to the memo at the end of the request?*

**Your answer:**

<!-- Write here -->

---

### Q3 — Draw the cache-flow diagram for a `'use cache'` function with `cacheTag` and `cacheLife`.

Fill in the blanks:

```
First request (cache miss):
  Request A arrives
       │
       ▼
  'use cache' boundary: cache lookup for key = [___________]
       │
       ▼
  MISS → function body runs
       │
       ▼
  cacheTag([___________]) applied
  cacheLife([___________]) applied  → TTL set to [___________]
       │
       ▼
  Result stored in cache
       │
       ▼
  Result returned to Request A

Subsequent request (cache hit):
  Request B arrives
       │
       ▼
  'use cache' boundary: cache lookup for key = [___________]
       │
       ▼
  HIT → [___________] returned immediately (function body does NOT run)

Invalidation:
  Server Action calls revalidateTag([___________])
       │
       ▼
  Cache entry evicted
       │
       ▼
  Next request → [___________]
```

*Tip: the cache key is derived from the function's arguments.*

**Your answer (fill in the blanks above):**

<!-- Write here -->

---

### Q4 — What build symbol (`○`, `◐`, or `ƒ`) does the `/c08-use-cache` page produce and why?

*Think about: what data is read at the page's top level vs inside `<Suspense>` holes?
Which of those reads is cached?*

**Your answer:**

<!-- Write here -->

---

### Q5 — What are the built-in `cacheLife` profiles and what is the correct way to add a custom profile? What happens if you call `cacheLife('my-profile')` but the profile is not registered?

*Think about: where are custom profiles defined? What are the three fields of a custom profile?*

**Your answer:**

<!-- Write here -->

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Three `'use cache'` placement levels |  |  |
| 2 | `cache()` vs `'use cache'` |  |  |
| 3 | Draw the cache-flow diagram |  |  |
| 4 | Build symbol and why |  |  |
| 5 | `cacheLife` profiles + custom profiles |  |  |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague on a whiteboard. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c08-use-cache/`.*
