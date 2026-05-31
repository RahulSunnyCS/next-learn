# Route Map — C05 App Router Architecture

This file shows every file in the challenge and the URL (or slot condition) it serves.

---

## File → URL Mapping

| File | URL | Rendered when |
|---|---|---|
| `page.tsx` | `/challenges/c05-app-router` | Direct visit or soft-nav to listing |
| `layout.tsx` | Wraps all pages in subtree | Always |
| `loading.tsx` | N/A (automatic Suspense wrapper) | During page stream-in |
| `error.tsx` | N/A (error boundary) | When a page throws |
| `not-found.tsx` | N/A (triggered by `notFound()`) | When `notFound()` is called |
| `products/[id]/page.tsx` | `/challenges/c05-app-router/products/{id}` | Hard-refresh or direct link only |
| `products/[...slug]/page.tsx` | `/challenges/c05-app-router/products/{a}/{b}/...` | Any URL with 2+ segments after `products/` |
| `@modal/default.tsx` | N/A (slot fallback, renders null) | All URLs where @modal has no match |
| `@modal/(.)products/[id]/page.tsx` | Intercepts `/challenges/c05-app-router/products/{id}` | Soft navigation ONLY |

---

## Directory Tree

```
app/(challenges)/c05-app-router/
│
├── layout.tsx                      ← parallel-route layout: { modal, children }
├── page.tsx                        ← listing page (children slot)
├── loading.tsx                     ← streaming skeleton for all sub-pages
├── error.tsx                       ← "use client" error boundary with reset()
├── not-found.tsx                   ← shown when notFound() is called
│
├── @modal/                         ← named parallel slot
│   ├── default.tsx                 ← renders null (no modal active)
│   └── (.)products/                ← (.) = same level as slot-parent (c05-app-router/)
│       └── [id]/
│           └── page.tsx            ← intercepting-route modal (soft-nav only)
│
├── products/
│   ├── [id]/
│   │   └── page.tsx                ← full product detail page (hard-refresh / direct link)
│   └── [...slug]/
│       └── page.tsx                ← catch-all for 2+ segment paths
│
├── _components/
│   └── QuickViewModal.tsx          ← "use client" modal chrome (backdrop, close button)
│
├── _lib/
│   └── catalog.ts                  ← cached wrappers over @/lib/data
│
└── _meta/
    ├── challenge.config.json       ← id:5, slug:"c05-app-router", tier:1
    ├── challenge.config.ts         ← typed re-export of JSON
    ├── spec.md                     ← full convention explanations + acceptance criteria
    ├── defend-it.md                ← 5 from-memory questions with answer space
    └── verification.md             ← human-runnable checklist
```

---

## Key Invariants

1. **Soft-nav to `/products/{id}`** → `@modal/(.)products/[id]` fires → modal overlay + listing behind
2. **Hard-refresh `/products/{id}`** → `products/[id]/page.tsx` → full page, `@modal` → null
3. **`/products/{a}/{b}`** → `products/[...slug]/page.tsx` → catch-all (not [id])
4. **Any URL without a modal match** → `@modal/default.tsx` → null (no 404)

---

## Segment Parameter Resolution

```
URL: /challenges/c05-app-router/products/p-elec-001
  → [id]/page.tsx → params = { id: "p-elec-001" }

URL: /challenges/c05-app-router/products/electronics/keyboards
  → [...slug]/page.tsx → params = { slug: ["electronics", "keyboards"] }

URL: /challenges/c05-app-router/products/a/b/c/d
  → [...slug]/page.tsx → params = { slug: ["a", "b", "c", "d"] }
```
