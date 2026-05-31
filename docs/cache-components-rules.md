# Cache Components Rules (Next.js 16, `cacheComponents: true`)

This repo runs with `cacheComponents: true` in `next.config.ts` (the current-model
primary decision). That flag enforces the **Partial Prerendering (PPR)** discipline
app-wide. Every challenge page MUST follow these rules or `next build` fails.

> Canonical reference: **`app/(challenges)/c01-auth/page.tsx`** — a static shell
> with a `<Suspense>`-wrapped dynamic hole (`SessionPanel`). Copy that shape.

## The rules

1. **NEVER use `export const dynamic = "force-dynamic"` (or `= "force-static"`).**
   Route-segment `dynamic` config is **incompatible** with `cacheComponents` and
   fails the build. Under Cache Components, **dynamic is the default**; you opt
   INTO caching with `'use cache'`, you never opt out with a directive.

2. **Read uncached/dynamic data only INSIDE a `<Suspense>` boundary.**
   Accessing dynamic data at a route's top level (outside Suspense) fails the build
   with *"Uncached data was accessed outside of `<Suspense>`"*. Dynamic data means:
   `cookies()`, `headers()`, `await searchParams`, `await params` (when used
   dynamically), `connection()`, and any **uncached** data read (a repository call
   or `fetch` that is not wrapped in `'use cache'`).
   - Pattern: the page is a **static shell**; move each dynamic read into a child
     async component and wrap it `<Suspense fallback={<Skeleton/>}>`. The shell
     prerenders/streams immediately; the hole streams in.

3. **Opt into caching with the `'use cache'` directive** (not implicit fetch caching).
   - File-level: `'use cache'` at the top of a module caches all its exports.
   - Function-level: `'use cache'` as the first line of an async function caches its return.
   - Tag it for targeted invalidation: `cacheTag(tags.product(id))` (import the
     stable tag helpers from `@/lib/data`).
   - Set lifetime: `cacheLife('hours')` (or a custom profile) for time-based revalidation.
   - `cacheTag` / `cacheLife` are now STABLE in v16 (no `unstable_` prefix).

4. **`revalidateTag` / `revalidatePath`** invalidate cached entries on a write
   (e.g. inside a Server Action after a mutation). In v16, prefer the tag helpers
   from `@/lib/data` (`tags.*`). Note v16 changed `revalidateTag`'s signature — check
   the installed types; pass a `cacheLife` profile as the 2nd arg if required.

5. **Async request APIs are await-only in v16:** `const c = await cookies()`,
   `const h = await headers()`, `const sp = await searchParams`, `const p = await params`.

6. **Aim for the right symbol in the build's Route table:**
   - `○ (Static)` — fully static (good for marketing/SSG content).
   - `◐ (Partial Prerender)` — static shell + streamed dynamic holes (the target for
     most product pages: fast first paint + fresh dynamic data).
   - `ƒ (Dynamic)` — fully dynamic / route handlers.

## The legacy model (for the C09 challenge only)

The pre-v16 "four caches" model (Request Memoization, Data Cache, Full Route Cache,
Router Cache) + `unstable_cache` + implicit `fetch` caching is **superseded** by
Cache Components and cannot run in this app while `cacheComponents` is on. The legacy
challenge (`c09-*`) teaches it as a **self-contained, isolated comparison** (own
config variant / documented demo) and the migration story — it does NOT toggle the
app-wide flag.

## Do / Don't quick table

| Goal | Do | Don't |
|---|---|---|
| Make a page dynamic | just read dynamic data (inside Suspense) | `export const dynamic = 'force-dynamic'` |
| Cache a data read | `'use cache'` + `cacheTag()` + `cacheLife()` | rely on implicit fetch caching |
| Read cookies/searchParams | `await` them, inside `<Suspense>` | read at route top level |
| Fast first paint with fresh data | static shell + `<Suspense>` hole (◐) | block the whole route on a fetch |
