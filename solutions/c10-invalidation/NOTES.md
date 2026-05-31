# Solution Notes — C10: Cache Invalidation, Dynamic Triggers & Footguns

---

## 1. revalidateTag: the v16 two-argument form

### What changed

In Next.js 14/15, `revalidateTag` took one argument:
```ts
revalidateTag("reviews:p-elec-001")  // v14/v15 — ONE argument
```

In Next.js 16, the type definition is:
```ts
export declare function revalidateTag(
  tag: string,
  profile: string | CacheLifeConfig  // ← REQUIRED second argument
): undefined;
```

The second argument is the `cacheLife` profile name (e.g. `"hours"`, `"minutes"`,
`"days"`) or an inline `CacheLifeConfig` object (`{ expire?: number }`).

### Why the second argument?

The profile tells the cache scheduler how to re-schedule background revalidation
after the tag purge. When the entry is purged, Next.js knows from the profile
what the intended freshness window was, and can set up the next background
revalidation timer correctly.

### The one-argument footgun (TypeScript error in v16)

```ts
// FOOTGUN — does NOT compile in v16 TypeScript strict mode:
revalidateTag(tags.reviews(productId));
// Error: Expected 2 arguments, but got 1.

// CORRECT — v16:
revalidateTag(tags.reviews(productId), "hours");
```

### Rule of thumb

Pass the SAME profile string in both places:
```ts
// In the cached function:
async function getCachedReviews(productId: string) {
  "use cache";
  cacheTag(tags.reviews(productId));
  cacheLife("hours");  ← profile: "hours"
  return listReviews(productId);
}

// In the Server Action that invalidates it:
revalidateTag(tags.reviews(productId), "hours");  ← same profile: "hours"
```

---

## 2. revalidatePath vs revalidateTag

| | `revalidateTag` | `revalidatePath` |
|---|---|---|
| Granularity | Purges all cache entries with the matching tag | Purges all cached responses for a URL path |
| Precision | Surgical — only entries you explicitly tagged | Broad — everything for that URL |
| When to use | You own the `cacheTag()` call and the tags are well-defined | Third-party pages, CMS content, safety net |
| v16 signature | `revalidateTag(tag, profile)` | `revalidatePath(path, type?)` |
| Second arg | Required (profile name) | Optional (`"layout"` or `"page"`) |

**Pattern in this challenge:**

```ts
// After addReview:
revalidateTag(tags.reviews(productId), "hours");  // purges the specific data cache
revalidatePath("/c10-invalidation");              // purges the full-route cache (belt-and-suspenders)
```

Using both is a valid production pattern. The tag purge handles the data layer;
the path purge handles any page-level caching that might have escaped the tags.

---

## 3. The stale-cache footgun: tag mismatch

This is the most common caching mistake in Next.js 16 applications.

### The bug

```ts
// Cached function uses tag A:
async function getCachedReviewsBuggy(productId: string) {
  "use cache";
  cacheTag(tags.product(productId));  // tag: "product:p-elec-001"
  cacheLife("hours");
  return listReviews(productId);
}

// Server Action invalidates tag B:
revalidateTag(tags.reviews(productId), "hours");  // purges: "reviews:p-elec-001"
```

`"product:p-elec-001"` ≠ `"reviews:p-elec-001"`. The action and the cache entry
are talking about different tags. The entry is NEVER purged. The user sees stale
data until the `cacheLife` TTL expires naturally (up to 24 hours for the "hours"
profile).

### The fix

One line change in the cached function:
```ts
cacheTag(tags.reviews(productId));  // tag: "reviews:p-elec-001" ← matches the action
```

### How to prevent this

1. Use the `tags` object from `@/lib/data` everywhere — never hard-code tag strings.
2. When you write a `cacheTag()` call, immediately note which action will
   call `revalidateTag()` with the same tag.
3. In code review, check that every `revalidateTag(X, ...)` call corresponds to
   at least one `cacheTag(X)` call somewhere in the codebase.

---

## 4. Dynamic-rendering triggers

Under `cacheComponents: true`, these four operations force the enclosing
Server Component into per-request dynamic rendering:

| Trigger | Why it forces dynamic |
|---|---|
| `await cookies()` | Reads the Cookie request header — different for every visitor |
| `await headers()` | Reads arbitrary request headers — per-request values |
| `await searchParams` | Reads the URL query string — set by the visitor at request time |
| `connection()` | Unconditionally signals "I need a live server connection" |

**Cache Components rule:** these MUST run inside a `<Suspense>` boundary.
Reading them at the page's top level causes the build to fail with:
```
Error: Uncached data was accessed outside of <Suspense>
```

**Correct pattern:**
```tsx
// In page.tsx (static shell — no dynamic reads):
export default function Page({ searchParams }: ...) {
  return (
    <Suspense fallback={<Skeleton />}>
      <DynamicHole searchParams={searchParams} />
    </Suspense>
  );
}

// Separate async component (dynamic hole):
async function DynamicHole({ searchParams }: ...) {
  const sp = await searchParams;  // ← await required in v16
  const jar = await cookies();    // ← await required in v16
  return <p>{sp.tab} / {jar.get("theme")?.value}</p>;
}
```

**Note:** `export const dynamic = "force-dynamic"` is incompatible with
`cacheComponents`. Never use it. Dynamic is the default; opt INTO caching
with `'use cache'`.

---

## 5. draftMode() and caching

```ts
const draft = await draftMode();  // ← await required in v16

if (draft.isEnabled) {
  // 'use cache' boundaries are BYPASSED for this request.
  // Every cached function runs fresh, returning the latest data.
}
```

**What draft mode does:**
- Reads a per-request cookie (`__prerender_bypass`) to determine if the editor
  has previewed the page.
- When enabled: bypasses `'use cache'` boundaries for this request. The page
  is always freshly rendered, so editors see unpublished content.
- When disabled: normal caching applies.

**Typical CMS preview flow:**
1. Editor clicks "Preview" in Contentful/Sanity.
2. CMS calls `/api/preview?secret=TOKEN`.
3. Route handler: validate token → `draftMode().enable()` → redirect to content URL.
4. Content page detects `isEnabled === true` → renders fresh (ignores cache).
5. Editor publishes → calls `/api/preview/exit` → `draftMode().disable()`.
6. Subsequent visitors get the cached published version.

**Build route table:** any page that reads `draftMode()` shows as **ƒ (Dynamic)**
because it reads a per-request cookie. This is intentional.

---

## 6. File structure decisions

### Why `_lib/actions.ts` instead of `app/actions.ts`

Server Actions co-located with the challenge page under `_lib/` follow the
same pattern as `_components/` — they are private to this challenge route and
cannot be accidentally imported by other challenges.

### Why a local `_lib/` wrapper over `@/lib/data`

The task contract forbids modifying `lib/data/**`. Local wrappers (`getCachedReviews`,
`getCachedReviewsBuggy`) add the `'use cache'` directive and the specific
`cacheTag`/`cacheLife` calls for this challenge, without touching the shared data layer.

### Why the buggy action also calls `revalidateTag`

The buggy action calls `revalidateTag(tags.reviews(productId), "hours")` — the
CORRECT revalidateTag call — but the cached function is tagged with the WRONG tag.
This demonstrates that the bug is in the `cacheTag()` call (inside the cached
function), not in the `revalidateTag()` call (inside the action). The action is
correct; the data reader is broken.

### Why `revalidatePath` in the fixed action

Belt-and-suspenders. In a real app you might have several components on the page
that all cache reviews but use slightly different tags. `revalidatePath` ensures
the page-level cache is also purged, even if you missed a tag somewhere.
