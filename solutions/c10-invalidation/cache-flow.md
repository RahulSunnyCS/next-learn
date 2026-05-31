# Cache Flow Diagram — C10: Tag Life Cycle

This document traces the exact life cycle of a cache entry tagged with
`tags.reviews("p-elec-001")` through a write-then-read sequence.

---

## 1. First Request (cache miss)

```
GET /c10-invalidation
       │
       ▼
Page renders static shell immediately (prerendered at build time)
       │
       ▼
<Suspense> boundary triggers streaming for <ReviewList>
       │
       ▼
getCachedReviews("p-elec-001") called
       │
       ├─ 'use cache' → check cache by (function, args) key
       │
       └─ CACHE MISS (first request or after revalidation)
              │
              ▼
         listReviews("p-elec-001") runs (hits in-memory store)
              │
              ▼
         cacheTag("reviews:p-elec-001")  ← tag registered on this entry
         cacheLife("hours")              ← stale: 5m, revalidate: 1h, expire: 24h
              │
              ▼
         Result stored in cache
              │
              ▼
         Reviews streamed to browser
```

---

## 2. Subsequent Requests (cache hit)

```
GET /c10-invalidation
       │
       ▼
getCachedReviews("p-elec-001")
       │
       ├─ CACHE HIT (within TTL)
       │
       └─ Cached result returned immediately
              │
              ▼
         Reviews streamed from cache (no store call)
```

---

## 3. Server Action: addReviewFixed fires

```
POST (Server Action: addReviewFixed)
       │
       ▼
  Validate inputs (rating 1–5, non-empty body)
       │
       ▼
  addReview({ productId: "p-elec-001", ... })
  → writes new review to in-memory store
       │
       ▼
  revalidateTag("reviews:p-elec-001", "hours")
       │
       ├─ Next.js cache: find all entries tagged "reviews:p-elec-001"
       ├─ PURGE those entries (mark as stale/expired)
       └─ Re-schedule background revalidation per "hours" profile
       │
       ▼
  revalidatePath("/c10-invalidation")
       │
       └─ PURGE: full-route cache for /c10-invalidation URL
       │
       ▼
  Action returns { success: true }
```

---

## 4. Next Request After Invalidation (cache miss again)

```
GET /c10-invalidation
       │
       ▼
getCachedReviews("p-elec-001")
       │
       ├─ CACHE MISS (entry was purged by revalidateTag)
       │
       └─ listReviews("p-elec-001") runs fresh
              │
              ▼
         Returns updated list INCLUDING the new review
              │
              ▼
         New cache entry stored with fresh tag + TTL
              │
              ▼
         Updated reviews streamed to browser
```

---

## 5. The Footgun: Wrong Tag

```
getCachedReviewsBuggy("p-elec-001")
       │
       ├─ cacheTag("product:p-elec-001")  ← tagged with WRONG tag
       └─ cacheLife("hours")
              │
              ▼
         Result stored in cache, tagged "product:p-elec-001"

--- Server Action (buggy): addReviewBuggy fires ---

  revalidateTag("reviews:p-elec-001", "hours")
       │
       ├─ Looks for entries tagged "reviews:p-elec-001"
       └─ FINDS NONE (the buggy cache used "product:p-elec-001")
              │
              ▼
         Cache entry UNTOUCHED ← FOOTGUN

--- Next request ---

getCachedReviewsBuggy("p-elec-001")
       │
       └─ CACHE HIT (entry was not purged!)
              │
              ▼
         Returns OLD list (new review is missing)
              │
              ▼
         User sees stale data until TTL expires (up to 24h)
```

**Fix:** Change `cacheTag(tags.product(productId))` to `cacheTag(tags.reviews(productId))`
in the buggy cached function. The tag must match what the action passes to `revalidateTag`.

---

## Summary Table

| Step | Call | Result |
|---|---|---|
| First read | `getCachedReviews("p-elec-001")` | Cache miss → runs → stores with tag `reviews:p-elec-001` |
| Repeat read | `getCachedReviews("p-elec-001")` | Cache hit → returns stored result |
| Write + correct invalidation | `revalidateTag("reviews:p-elec-001", "hours")` | Purges entry → next read is a miss |
| Write + wrong tag | `revalidateTag("reviews:p-elec-001", "hours")` when tagged `product:p-elec-001` | No match → entry NOT purged → stale data |
| Draft mode | any `'use cache'` function | Entry ignored for this request → always fresh |
