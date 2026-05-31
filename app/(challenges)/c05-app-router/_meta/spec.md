# Challenge Spec — App Router Architecture

> **File:** `app/(challenges)/c05-app-router/_meta/spec.md`

---

## Learning Goal

This challenge teaches the major file-system routing conventions of the Next.js App Router:
route groups, dynamic segments, catch-all segments, special files (`loading.tsx`, `error.tsx`,
`not-found.tsx`), parallel routes, and intercepting routes.  The crowning demonstration is the
**modal-via-URL pattern**: a product quick-view that opens as a modal on soft navigation but
renders as a full page on hard-refresh or direct link — without duplicating any code.

---

## Route Group Conventions

### Route Groups `(folder)`

A folder whose name is wrapped in parentheses is a **route group**.  It exists purely for
organisational purposes — it is invisible in the URL.

```
app/(challenges)/c05-app-router/page.tsx
      ↓
URL:  /challenges/c05-app-router
```

The `(challenges)` segment never appears in the URL.  Route groups let you co-locate related
routes under a shared layout without adding an extra URL segment.

---

### Dynamic Segment `[id]`

A folder whose name is wrapped in single square brackets matches any single URL path segment.
The captured value is available as `params.id`.

```
app/(challenges)/c05-app-router/products/[id]/page.tsx
      ↓
URL:  /challenges/c05-app-router/products/p-elec-001
      params = { id: "p-elec-001" }
```

**v16 rule:** `params` is a `Promise` — always `await` it before reading.

---

### Catch-All Segment `[...slug]`

Three dots before the name match **one or more** path segments.  `params.slug` is a `string[]`.

```
app/(challenges)/c05-app-router/products/[...slug]/page.tsx
      ↓
URL:  /challenges/c05-app-router/products/electronics/keyboards
      params = { slug: ["electronics", "keyboards"] }
```

Route priority: `[id]` wins over `[...slug]` for exactly one segment.
- `/products/p-elec-001` → `[id]` (single segment)
- `/products/electronics/keyboards` → `[...slug]` (two segments)

An **optional catch-all** `[[...slug]]` additionally matches zero segments (the folder URL
itself).  This challenge uses the non-optional form.

---

## Special Files

### `loading.tsx`

Next.js automatically wraps every page in this subtree in a `<Suspense>` boundary when
`loading.tsx` is present.  The component exported from `loading.tsx` is the fallback shown
while the page's async work resolves.

This is a coarser boundary than placing `<Suspense>` directly in the page — it applies to the
entire page render, not just a sub-component.  Both can be used together: `loading.tsx` covers
the initial page transition while page-level `<Suspense>` boundaries cover individual dynamic
holes within the already-transitioned page.

### `error.tsx`

**Must start with `"use client"`.**  Next.js requires error boundaries to be Client Components
because the error-boundary mechanism relies on React's client-side rendering tree.

`error.tsx` is automatically placed as an error boundary around the page in its segment.  It
receives two props:
- `error: Error & { digest?: string }` — the thrown error.
- `reset: () => void` — call this to re-render the segment (retry).

Important: `error.tsx` does NOT catch errors thrown in the **same segment's `layout.tsx`** —
only in `page.tsx` and deeper segments.

### `not-found.tsx`

Rendered when `notFound()` is called from any Server Component in the subtree.  `notFound()`
throws a special Next.js internal signal that bypasses `error.tsx` and is caught only by the
nearest `not-found.tsx`.

In this challenge, `products/[id]/page.tsx` calls `notFound()` when a product ID is not in
the catalog.

---

## Parallel Routes (`@slot`)

Parallel routes let a single layout render **multiple independent pages at the same time**,
each in its own named slot.  Slots are declared as `@slotname` folders at the layout level.

```
c05-app-router/
  layout.tsx          ← declares { modal, children } props
  @modal/
    default.tsx       ← fallback: renders null when no modal is active
    (.)products/
      [id]/
        page.tsx      ← intercepting-route modal
  products/
    [id]/
      page.tsx        ← full product detail page
  page.tsx            ← listing page (renders in "children" slot)
```

The layout receives:
```tsx
interface LayoutProps {
  modal: React.ReactNode;   // from @modal/**
  children: React.ReactNode; // from page.tsx
}
```

### Why `default.tsx` is Non-Negotiable

Every named slot must have a renderable page for **every URL in the layout's subtree**.  The
`@modal` slot only has a page at `(.)products/[id]`.  For all other URLs (the listing page,
the catch-all, etc.), `@modal` has no match — and without `default.tsx`, Next.js returns a
404 instead of rendering the layout.

`default.tsx` exports a component that renders `null` ("no modal active").  It is the explicit
contract: "for any URL where the @modal slot has no match, render nothing."

---

## Intercepting Routes `(.) prefix`

Intercepting routes let you "hijack" a URL during **soft (client-side) navigation** and render
a different component than the one that would normally match.  They do NOT fire on hard-refresh
or direct links.

### The `(.)` Convention

The prefix indicates how many directory levels up to match:
- `(.)` — same level as the intercepting file's **slot parent** (most common)
- `(..)` — one level up
- `(..)(..)` — two levels up
- `(...)` — match from the app root

In this challenge:

```
@modal/(.)products/[id]/page.tsx
```

The `@modal` slot's parent is `c05-app-router/`.  The `(.)` means: intercept the route
`products/[id]` **relative to `c05-app-router/`**, i.e.
`c05-app-router/products/[id]`.

---

## The Modal-via-URL Pattern — Full Mechanics

This is the core learning outcome.  Read carefully.

### What the user sees

| Navigation | @modal slot | children slot | Result |
|---|---|---|---|
| Click a product card (soft nav) | `@modal/(.)products/[id]` fires | listing stays mounted | Modal overlay over listing |
| Hard-refresh that URL | Intercepting route skipped | `products/[id]/page.tsx` renders | Full product detail page |
| Open that URL in a new tab | Same as hard-refresh | Same as hard-refresh | Full product detail page |

### How Next.js decides

1. **Soft navigation** (React Router state, no full-page reload):
   - Next.js checks all intercepting routes for the target URL.
   - `@modal/(.)products/[id]` matches `/challenges/c05-app-router/products/[id]`.
   - It renders the intercepting route page in the `@modal` slot.
   - The `children` slot keeps its current page (the listing) mounted.
   - Result: the modal appears over the listing; the URL updates.

2. **Hard-refresh / direct URL entry**:
   - There is no prior navigation context for the intercepting rule to fire.
   - Next.js resolves the URL normally: `products/[id]/page.tsx`.
   - The `@modal` slot finds no match, falls back to `default.tsx` (renders null).
   - Result: the full product detail page, no modal.

### Why this is powerful

- The URL is **shareable**.  Copy-pasting the modal URL sends the recipient to the full
  product page — a complete, crawlable, bookmarkable view.
- No URL duplication.  One URL, two rendering modes.
- Back navigation works naturally: `router.back()` closes the modal without a full reload.

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0 with no type errors.
2. `next build` exits 0 (no cacheComponents violations).
3. `/challenges/c05-app-router` renders the product listing page.
4. Clicking a product card navigates to `/challenges/c05-app-router/products/[id]` and shows
   the quick-view modal overlay while the listing is still visible in the background.
5. Hard-refreshing `/challenges/c05-app-router/products/p-elec-001` shows the full product
   detail page, not the modal.
6. `/challenges/c05-app-router/products/electronics/keyboards` renders the catch-all page
   with `params.slug = ["electronics", "keyboards"]`.
7. `/challenges/c05-app-router/products/this-does-not-exist` shows `not-found.tsx`.
8. `error.tsx` has `"use client"` as its first directive and exports a `reset` prop.

---

## Hints

<details>
<summary>Hint 1 — Why isn't the modal showing on hard-refresh?</summary>

Intercepting routes only fire on soft (client-side) navigation.  When you hard-refresh, the
browser makes a full HTTP request with no prior route context.  The intercepting rule is
ignored and the real page renders instead.  This is by design — it makes deep-links work.

</details>

<details>
<summary>Hint 2 — Getting a 404 on the listing page after adding @modal?</summary>

You are missing `@modal/default.tsx`.  Every parallel slot must have a renderable component
for every URL in the layout's subtree.  Without `default.tsx`, the `@modal` slot has no
fallback for the listing page URL and Next.js returns 404.

</details>

<details>
<summary>Hint 3 — Why does error.tsx need "use client"?</summary>

React error boundaries are a client-side mechanism.  `error.tsx` must be a Client Component
so React can mount it as an error boundary in the browser rendering tree.  Server Components
cannot implement error boundaries.

</details>
