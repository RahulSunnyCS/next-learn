# Defend-It Worksheet — C10: Cache Invalidation, Dynamic Triggers & Footguns

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c10-invalidation/`. Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — What is wrong with this Server Action, and how do you fix it?

```ts
"use server";
import { revalidateTag } from "next/cache";

export async function addReview(productId: string, body: string) {
  // ... write to store ...
  revalidateTag(`reviews:${productId}`);  // <-- is this correct in v16?
}
```

*Think about: What does the v16 type definition for `revalidateTag` require?
What happens if you omit the second argument in a TypeScript-strict project?
What is the correct call?*

**Your answer:**

<!-- Write here -->

---

### Q2 — Cache-flow diagram: trace what happens when `addReview` fires

Fill in the blanks below:

```
1. User submits form → Server Action runs
2. Server Action calls lib/data addReview (writes to in-memory store)
3. Server Action calls revalidateTag("reviews:p-elec-001", "hours")
         │
         ▼
4. Next.js cache: entry tagged "reviews:p-elec-001" is ___________
5. Next user request for /c10-invalidation arrives
         │
         ▼
6. getCachedReviews("p-elec-001") cache miss → re-runs → returns ___________
7. Browser renders ___________
```

**Your answer:**

<!-- Write here -->

---

### Q3 — The stale-cache footgun

Look at this cached function:

```ts
async function getCachedReviewsBuggy(productId: string) {
  "use cache";
  cacheTag(tags.product(productId));   // BUG: wrong tag!
  cacheLife("hours");
  return listReviews(productId);
}
```

And this Server Action:

```ts
revalidateTag(tags.reviews(productId), "hours");  // purges "reviews:p-elec-001"
```

*Why will the user still see stale reviews after the action fires?
What is the one-line fix?*

**Your answer:**

<!-- Write here -->

---

### Q4 — Dynamic-rendering triggers

For each of the four triggers below, explain WHY reading it forces dynamic
rendering (i.e. why Next.js cannot prerender or serve a cached response):

| Trigger | Why it forces dynamic rendering |
|---|---|
| `await cookies()` | |
| `await headers()` | |
| `await searchParams` | |
| `connection()` | |

Also: what is the Cache Components rule about where you must read these?

**Your answer:**

<!-- Write here -->

---

### Q5 — `draftMode()` and caching

```ts
const draft = await draftMode();
if (draft.isEnabled) {
  // what happens to 'use cache' boundaries in this request?
}
```

*Explain: When draft mode is enabled, does `'use cache'` still cache the
response? Why or why not? What is the intended use case?*

**Your answer:**

<!-- Write here -->

---

## Cache-Flow Diagram — Tag Life Cycle

```
                 ┌──────────────────────────────────────────────┐
                 │           CACHE ENTRY LIFE CYCLE             │
                 └──────────────────────────────────────────────┘

  getCachedReviews("p-elec-001") called for first time
       │
       ▼
  ┌─────────────────────────────────────────┐
  │  CACHE MISS                             │
  │  'use cache' function runs              │
  │  cacheTag("reviews:p-elec-001")  ◄──── tag registered
  │  cacheLife("hours")              ◄──── TTL: 1 hour revalidate, 24h expire
  │  result stored in cache          ◄──── keyed by function + args
  └─────────────────────────────────────────┘
       │
       ▼  (subsequent requests within TTL)
  ┌─────────────────────────────────────────┐
  │  CACHE HIT                              │
  │  Cached result returned immediately     │
  │  No DB/store call                       │
  └─────────────────────────────────────────┘
       │
       │  Server Action: addReview fires
       ▼
  ┌─────────────────────────────────────────┐
  │  revalidateTag("reviews:p-elec-001",    │
  │                "hours")                 │
  │                                         │
  │  ALL cache entries tagged with          │
  │  "reviews:p-elec-001" are PURGED        │
  └─────────────────────────────────────────┘
       │
       ▼  (next request)
  ┌─────────────────────────────────────────┐
  │  CACHE MISS again                       │
  │  Function re-runs, returns fresh data   │
  │  (new review is now visible)            │
  └─────────────────────────────────────────┘

  FOOTGUN — wrong tag:
  ┌─────────────────────────────────────────┐
  │  cacheTag("product:p-elec-001")         │ ← cached with WRONG tag
  │  ...                                    │
  │  revalidateTag("reviews:p-elec-001",..  │ ← purges DIFFERENT tag
  │                                         │
  │  Cache entry NEVER purged!              │
  │  User sees stale reviews until TTL      │
  └─────────────────────────────────────────┘
```

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | v16 revalidateTag signature |  |  |
| 2 | Cache-flow trace |  |  |
| 3 | Stale-cache footgun |  |  |
| 4 | Dynamic-rendering triggers |  |  |
| 5 | draftMode and caching |  |  |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague on a whiteboard. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c10-invalidation/`.*
