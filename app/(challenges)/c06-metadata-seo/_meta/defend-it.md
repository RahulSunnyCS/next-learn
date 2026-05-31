# Defend-It Worksheet — C06 Metadata & SEO

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c06-metadata-seo/`.  Write in your own words —
> the goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Why must `generateMetadata` `await params` before accessing the slug?

_In Next.js 15+ the `params` object passed to page components and metadata
functions is a Promise, not a plain object.  Why is this, and what happens
if you forget the `await`?_

**Your answer:**

<!-- Write here -->

---

### Q2 — Why does the `opengraph-image.tsx` file convention automatically inject `<meta property="og:image">` into the page's `<head>`, but `og.ts` (a Route Handler) does not?

**Your answer:**

<!-- Write here -->

---

### Q3 — The product page uses `'use cache'` with `cacheTag` on the data read inside `generateMetadata`.  Why does caching the data fetch inside `generateMetadata` matter for performance?

**Your answer:**

<!-- Write here -->

---

### Q4 — Why can't `app/robots.ts` and `app/sitemap.ts` live inside the challenge sub-folder and still serve at `/robots.txt` and `/sitemap.xml`?

**Your answer:**

<!-- Write here -->

---

### Q5 — What is a canonical URL and why does omitting it hurt SEO for a product that can be reached by multiple URL paths?

**Your answer:**

<!-- Write here -->

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Awaiting params | | |
| 2 | File convention vs Route Handler | | |
| 3 | Caching inside generateMetadata | | |
| 4 | Sitemap/robots root placement | | |
| 5 | Canonical URL | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c06-metadata-seo/`.*
