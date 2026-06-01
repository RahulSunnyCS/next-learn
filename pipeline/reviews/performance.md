# PERFORMANCE REVIEW REPORT
# Nextmart Next.js 16 Learning Curriculum — 25 Challenges
# Reviewer: Performance Reviewer Agent (claude-sonnet-4-6)
# Date: 2026-06-01

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## IMPORTANT CONTEXT NOTE

This repo uses an in-memory data layer (lib/data/repository.ts) with
deliberate Math.random() latency of 30–120ms per call. That latency is
INTENTIONAL — the challenges teach caching, streaming, and waterfall
prevention by making timing differences visible. All findings below
distinguish accidental bugs from intentional teaching patterns.

Build route table (from `npm run build`):
- 25 challenge routes confirmed built
- Route types: static (○), partial prerender (◐), dynamic (ƒ) all present
  and match documented intent for each challenge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FINDINGS

---

FINDING: Aggregate selectors iterate all 500 rows on every stock edit in c24
Severity: Medium
File and line: /home/user/next-learn/app/(challenges)/c24-normalized-state/_lib/selectors.ts lines 89–104, consumed by DataGrid.tsx lines 57–59
What it is: The Toolbar subscribes to three aggregate selectors — selectSelectedCount (filter over allIds), selectTotalRevenue (reduce over allIds), and selectRowCount (allIds.length). All three read state.rows.allIds (500 items). Because every stock edit creates a new rows.byId reference (via the spread in updateStock), these selectors all fire on every stock change even though the stock change is irrelevant to selection count or revenue for selectSelectedCount and selectRowCount. selectTotalRevenue is genuinely correct to recalculate on stock changes. selectSelectedCount and selectRowCount, however, do not depend on byId at all — only on allIds — which never changes during a stock edit. Despite this, Zustand sees a new rows reference (because byId changed) and re-runs all three selectors, causing the Toolbar to re-render on every inline stock edit.
Impact at scale: With 500 rows in a high-edit scenario (multiple users editing simultaneously via future real-time sync), every single stock update forces three O(n) passes over allIds and re-renders the entire Toolbar. At 10x the current use (5000 rows or rapid edits), this compounds noticeably but remains sub-millisecond in practice on modern hardware with an in-memory structure. The current 500-row scale makes this a negligible real-world cost; however it contradicts the stated teaching goal of zero wasted work for unrelated rows — the Toolbar renders when it shouldn't.
How to fix it: Split the Zustand slice so allIds and byId are separate top-level store keys, not nested under rows. selectSelectedCount and selectRowCount subscribe to state.allIds (primitive length or stable reference) while selectTotalRevenue subscribes to state.byId. With this split, a stock edit changes state.byId but not state.allIds, so selectSelectedCount and selectRowCount return the same value and Zustand skips the Toolbar's re-render for those two selectors. Alternatively, use a shallow equality comparator (Zustand's useShallow) for the aggregate selectors so they skip re-render when the computed result is the same number.

---

FINDING: c18 ReviewsPanel fetches product and reviews sequentially despite both being cacheable and independent
Severity: Low
File and line: /home/user/next-learn/app/(challenges)/c18-optimistic-ui/page.tsx lines 113, 118 (inside ReviewsPanel)
What it is: ReviewsPanel calls `await getCachedProduct(productId)` then `await getCachedReviews(productId)` as two sequential awaits. The product and review caches are independent — neither result is needed to call the other. Even though both go through 'use cache' and are warm on repeat requests, on a cold cache miss both suffer the full 30–120ms simulated delay sequentially (total 60–240ms) instead of in parallel (30–120ms max).
Impact at scale: On first request or after a cache purge triggered by addReview's revalidateTag, both caches are cold simultaneously. Sequential cold fetches double the time to first byte for the dynamic hole. With 10x concurrent users, this doubles the SSR compute time for the most write-heavy page in the curriculum. The third call, getHelpfulCounts, is a pure in-memory Map read (zero latency) so sequencing it after reviews is fine.
How to fix it: Replace the two sequential awaits with a Promise.all:
  `const [product, reviews] = await Promise.all([getCachedProduct(productId), getCachedReviews(productId)]);`
Then call `const helpfulCounts = await getHelpfulCounts(reviews.map(r => r.id))` after, since it genuinely needs the review IDs first.

---

FINDING: c11 ReviewPanel fetches product and reviews sequentially (same pattern as c18)
Severity: Low
File and line: /home/user/next-learn/app/(challenges)/c11-server-actions/page.tsx lines 100, 103
What it is: Identical sequential-await pattern as c18. getCachedProduct and getCachedReviews are called one after the other inside the Suspense hole.
Impact at scale: Same as c18 — cold cache doubles streaming latency for the dynamic hole.
How to fix it: Same Promise.all fix as c18.

---

FINDING: sitemap.ts is ƒ Dynamic due to discoverChallenges() (fs.globSync at request time)
Severity: Low
File and line: /home/user/next-learn/app/sitemap.ts line 27 — confirmed ƒ Dynamic in build output
What it is: The sitemap function calls discoverChallenges(), which runs fs.globSync and reads 25 JSON files synchronously. Because the sitemap function is not async and has no 'use cache' wrapper, Next.js cannot prerender it. Every request to /sitemap.xml triggers the filesystem scan. The build also warns about this: "Encountered unexpected file in NFT list — filesystem operations in lib/registry.ts traced via sitemap.ts". The scan is ~1.7ms per call (measured), which is negligible per request, but the ƒ Dynamic classification means crawlers always hit the live server for a file that almost never changes.
Impact at scale: A search engine crawler hitting /sitemap.xml repeatedly (e.g. Googlebot crawl budget) causes N × 1.7ms synchronous filesystem scans plus full Node.js request handling per visit. With aggressive crawl frequency, this adds measurable server-side cost for a route that could trivially be cached. At 10x traffic (1000 crawl requests/day), the ƒ route processes all 1000 instead of the ○ Static route serving them from the CDN edge.
How to fix it: Two options.
  Option A (simplest): Wrap the sitemap function body with `'use cache'` + `cacheLife('days')` to make Next.js cache the output. Challenge: sitemap is a non-async function returning a value synchronously, which means 'use cache' cannot be applied directly (it requires async). Convert it to an async function first (Next.js sitemap supports async), then add the directive.
  Option B (better for scale): Compute the sitemap at build time by exporting from a static route using generateStaticParams or by caching the discoverChallenges result in a module-level constant. Since the challenge list only changes on deploy, a module-level cache (evaluated once at startup) is sufficient and avoids the per-request filesystem scan.
  Note: The Turbopack build warning is related — "filesystem operations traced via sitemap.ts" — and can be silenced by memoizing the result, which aligns with Option B.

---

FINDING: c05 product grid and modal use raw <img> instead of next/image (no optimization)
Severity: Low
File and line:
  /home/user/next-learn/app/(challenges)/c05-app-router/page.tsx line 190
  /home/user/next-learn/app/(challenges)/c05-app-router/products/[id]/page.tsx line 91
  /home/user/next-learn/app/(challenges)/c05-app-router/@modal/(.)products/[id]/page.tsx line 90
What it is: Three places in c05 render product images using a bare HTML <img> element with an eslint-disable-next-line comment to suppress the next/image warning. The images come from picsum.photos (an external CDN). Without next/image: no format conversion (WebP/AVIF), no srcset generation, no lazy loading, and the width/height attributes present in the markup are treated as styling hints by the browser rather than cache keys by the image optimizer.
Impact at scale: Each product page in c05 loads a full 600x400 image from picsum.photos for every visitor. With no format conversion or srcset, mobile users download the same large image as desktop users. In a 10x traffic scenario, this increases bandwidth costs and LCP time for users on slower connections. The teaching point of c05 is App Router architecture (route groups, parallel routes, intercepting routes), not image optimization — so the omission is understandable, but it could confuse learners who study this file later in lab-optimizations and wonder why c05 contradicts the lesson.
How to fix it: Replace the three raw <img> elements with next/image. The images already have explicit width and height attributes, so the replacement is mechanical. Add `sizes="(max-width: 640px) 100vw, 50vw"` for the product card thumbnails. This is a low-priority polish item since c05 is explicitly about routing architecture, not image handling.

---

FINDING: c14 SearchAsYouType uses raw <img> for search result thumbnails
Severity: Low
File and line: /home/user/next-learn/app/(challenges)/c14-tanstack-query/_components/SearchAsYouType.tsx lines 151–155
What it is: The search results list renders product thumbnail images via a bare <img> element (with an eslint-disable comment). Since the search result list can show up to 8 items per query and queries happen rapidly as users type, up to 8 unoptimized images are loaded per debounced request. No lazy loading, no format conversion.
Impact at scale: With 10x users each running search queries, the picsum.photos origin receives unthrottled image requests for all 8 results on every debounced query. Each image is a full-resolution remote fetch. The 500ms debounce mitigates the frequency but not the per-query image volume.
How to fix it: Replace with next/image. The search images are 10x10 display thumbnails (w-10 h-10 classes), so width={40} height={40} is appropriate. This is a low-priority teaching-code limitation — c14 teaches TanStack Query patterns, not image optimization.

---

## INTENTIONAL PATTERNS — CONFIRMED CORRECT

The following patterns are INTENTIONAL teaching constructs. They are not findings.

1. WATERFALL in c07/waterfall/page.tsx (lines 134–142): Three sequential awaits (getProductRaw, listCategoriesRaw, listReviewsMemo) are deliberate. The page is explicitly labelled "Anti-pattern — Sequential Awaits" and is the counterpart to c07/parallel which uses Promise.all. Both are inside Suspense boundaries with static shells. CORRECT by design.

2. Simulated latency in lib/data/repository.ts (delay function, lines 72–78): Math.random() delays of 30–120ms on every accessor are the foundation of the entire curriculum. Without them, caching, streaming, and waterfall lessons produce no observable timing difference. CORRECT by design.

3. Raw (non-memoised) accessors in c07/_lib/queries.ts (getProductRaw, listCategoriesRaw, lines 128–149): These bypass React cache() intentionally so the waterfall demo shows real sequential latency. CORRECT by design.

4. Uncached dynamic holes in c03 (LiveInventory, Recommendations, Reviews): All three are explicitly inside Suspense and intentionally bypass 'use cache' to demonstrate streaming and per-request freshness. LiveInventory must be uncached (stock changes with orders). CORRECT by design.

5. SellerLiveMetrics in c04 (polling every 3s via setInterval): Deliberate CSR with a justified rationale — real-time polling, no SEO value, behind auth. The interval is correctly cleaned up in the useEffect return function. No memory leak. CORRECT by design.

6. c02 catalog skeleton (listCachedProducts/listCachedCategories missing cacheTag + cacheLife): These functions have a bare 'use cache' with TODO comments asking learners to add the tags and lifetime. This is the challenge exercise skeleton. CORRECT by design — the build passes because 'use cache' prevents the Math.random() prerender error.

7. c10 buggy action (addReviewBuggy calling revalidateTag with wrong tag): The stale-cache footgun is the teaching centerpiece of c10. CORRECT by design.

8. c07 dedup counter (underlyingFetchCount module-level state): Resets per request in the App Router module system. Serves the React cache() deduplication lesson. CORRECT by design.

9. c24 DataGrid virtualization: @tanstack/react-virtual is correctly wired with useVirtualizer, a fixed-height parentRef scroll container, and absolute positioning via translateY. Only ~15 DOM nodes are active at any time. CORRECT and working.

10. c24 Row component: React.memo wrapping is present. Per-row fine-grained Zustand subscription via useMemo(() => makeSelectRow(id), [id]) is correct. Local draft state (draftStock, editing) prevents store updates on every keystroke — only the final value triggers updateStock. CORRECT by design.

11. c24 GridDataLoader two-fetch pattern: Uses Promise.all([listProductsBySeller, listOrdersForUser]) — correctly parallel. CORRECT.

12. Preload pattern in c07/_lib/preload.ts: preloadProduct/preloadCategories correctly kick off memoised promises without awaiting, so child components can resolve them synchronously later. CORRECT by design.

13. c16 CatalogContent: Uses Promise.all([searchParams, categories]) correctly. CORRECT.

14. Route classification in the build output matches documented intent:
    - app/page.tsx → ○ Static (fs.globSync only, no per-request data)
    - c03 product pages → ◐ PPR (static shell + dynamic holes)
    - c07 waterfall/parallel → ◐ PPR (static shells + Suspense holes)
    - c08 → ◐ PPR (cached reads still in Suspense for build compliance)
    - c24 → ◐ PPR (GridDataLoader inside Suspense, requires connection())
    - c13 edge-geo, c06 OG route → ƒ Dynamic (correct for their purpose)
    All routes match their documented rendering strategy.

15. lab-optimizations images: StaticImportImage uses static import with priority and placeholder="blur" (correct for LCP). RemoteImageWithSizes uses explicit width/height and sizes prop (correct). WrongWayImage intentionally demonstrates the anti-pattern. LazyChart wraps next/dynamic with ssr:false in a Client Component as required by cacheComponents. CORRECT by design.

16. c04 RSC boundary: "use client" is correctly pushed down to InteractiveIsland (~1KB chunk), keeping the static page shell, ServerInfoPanel, and CompositionWrapper as RSC (never in the client bundle). CORRECT.

17. c14 TanStack Query: SearchAsYouType correctly debounces (500ms), uses keepPreviousData to prevent loading flashes, and inherits staleTime from QueryProvider (30s). InfiniteList correctly uses IntersectionObserver for scroll detection (no scroll event listener). CORRECT.

18. c15 cart hydration: skipHydration:true with explicit rehydrate() call in useEffect correctly prevents SSR/CSR hydration mismatch while still loading persisted cart. CORRECT.

19. c18 ReviewsPanel — getHelpfulCounts: This is a synchronous Map lookup with zero simulated latency. Awaiting it sequentially after reviews is correct (it needs review IDs) and has zero performance cost. CORRECT.

20. discoverChallenges() in app/page.tsx: The homepage calls this synchronously at render time. The homepage is ○ Static — this runs once at build time, not per-request. Cost is irrelevant in production. CORRECT.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SUMMARY

Critical : 0
High     : 0
Medium   : 1
Low      : 4

VERDICT: CONDITIONAL PASS

The rendering strategies, caching discipline ('use cache' + cacheTag + cacheLife), PPR/streaming patterns, virtualization implementation, and client-state architecture are all correctly implemented and match the documented teaching intent. No accidental waterfalls outside the intentional teaching demos. No memory leaks. No missing Suspense boundaries. No dynamic routes that should be static.

The five findings are:
- One medium finding: the Toolbar aggregate selectors fire unnecessarily on stock edits in c24, partially undermining the "zero wasted renders" teaching claim.
- Two low findings (c18, c11): sequential awaits on independent cached reads that could be Promise.all — adds latency on cold cache.
- Two low findings (c05, c14): raw <img> elements instead of next/image — teaching code in non-image-optimization challenges, cosmetic for learners.
- One low finding (sitemap.ts): ƒ Dynamic route doing a filesystem scan on every crawl request; could be cached or made static.

Conditions for PASS:
1. Either fix the c24 Toolbar selector subscription (split allIds/byId at the store level, or use shallow equality on aggregate selectors) OR document in the challenge spec that the Toolbar re-render is an accepted tradeoff for teaching simplicity.
2. The sequential-await issues in c11 and c18 are low-priority but worth noting as missed teaching opportunities — the same pages that teach other patterns are subtly doing the thing c07 warns against. Consider fixing or noting them in spec.md.

All other patterns reviewed are correct. The build completes cleanly (one Turbopack NFT warning about registry.ts in sitemap.ts is informational and maps directly to the sitemap finding above).
