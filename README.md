# Nextmart — Next.js 16 Learning Curriculum

Nextmart is a **hands-on, challenge-based curriculum** for engineers who want to
understand Next.js 16 deeply — not just use it. The project is a fictional
e-commerce storefront (Nextmart) that serves as the vehicle for 25 coding
challenges across 6 tiers, from session security to production deployment.

Each challenge teaches one concept by having you **break it, build it, and
defend it** (the Defend-It workflow). You never just read docs — you write code,
answer questions from memory, and compare your reasoning against model answers.

---

## Quick Start

```bash
# 1. Install dependencies (Node 22+ required)
npm install

# 2. Set required environment variables
cp .env.example .env.local
# Edit .env.local — at minimum, set SESSION_SECRET (see below)

# 3. Start the dev server
npm run dev
# Open http://localhost:3000 — the challenge index loads automatically
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes (C01+) | 64-char hex string for JWT signing. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SITE_URL` | No | Production URL for sitemap/OG tags. Defaults to `https://nextmart.vercel.app`. |
| `AUTH_SECRET` | Only for C23 | Auth.js secret. Same generation method as SESSION_SECRET. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Only for C23 | GitHub OAuth App credentials for the OAuth challenge. |

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start dev server with Turbopack (hot reload) |
| **build** | `npm run build` | Production build — must exit 0 before any challenge is considered complete |
| **start** | `npm run start` | Serve the production build locally |
| **lint** | `npm run lint` | ESLint with Next.js config — 0 errors required |
| **typecheck** | `npm run typecheck` | TypeScript `tsc --noEmit` — 0 errors required |
| **test** | `npm test` | Vitest unit/integration tests |
| **test:e2e** | `npm run test:e2e` | Playwright end-to-end tests |

---

## Curriculum Overview

The curriculum is divided into 6 tiers. Each tier builds on the previous.
Complete them in order.

### Tier 0 — Foundation

Security first. Before you write any rendering logic, understand the attack
surface that every Next.js app exposes.

| # | Slug | Title | Key Topics |
|---|------|-------|------------|
| C01 | `c01-auth` | Session Security: Attack the Toy, Then Build It Right | auth, sessions, cookies, JWT, security |

### Tier 1 — Rendering & Components

How Next.js decides where and when to render each byte of HTML.

| # | Slug | Title | Key Topics |
|---|------|-------|------------|
| C02 | `c02-catalog-ssg-isr` | Catalog: SSG + ISR with Cache Components | SSG, ISR, use cache, generateStaticParams |
| C03 | `c03-product-ppr` | Product Detail: Partial Prerendering + Streaming SSR | PPR, Streaming SSR, Suspense, use cache |
| C04 | `c04-rsc-boundary` | RSC vs Client Boundary Refactor | RSC, use client, bundle size, CSR, composition |
| C05 | `c05-app-router` | App Router Architecture: Parallel Routes, Intercepting Routes | App Router, parallel routes, intercepting routes, error boundaries |
| C06 | `c06-metadata-seo` | Metadata & SEO | Metadata API, generateMetadata, OG image, sitemap, robots |
| Lab | `lab-optimizations` | Built-in Next.js Optimizations — Guided Checklist | next/image, CLS, next/font, next/script, code splitting, prefetch |

### Tier 2 — Data, Caching & Actions

The Cache Components model: `'use cache'`, invalidation, Server Actions, and
Route Handlers.

| # | Slug | Title | Key Topics |
|---|------|-------|------------|
| C07 | `c07-data-fetching` | Data Fetching Patterns: Memoisation, Waterfalls, and Preloading | data fetching, request memoization, cache(), waterfall, parallel |
| C08 | `c08-use-cache` | Current Caching Model: `'use cache'` | use cache, cacheTag, cacheLife, Cache Components |
| C09 | `c09-legacy-caches` | Legacy Four-Cache Model + Migration to Cache Components | four caches, unstable_cache, fetch cache, migration |
| C10 | `c10-invalidation` | Cache Invalidation, Dynamic-Rendering Triggers & Footguns | revalidateTag, revalidatePath, invalidation, draftMode |
| C11 | `c11-server-actions` | Server Actions: Forms That Work Without JavaScript | Server Actions, progressive enhancement, useActionState, useFormStatus |
| C12 | `c12-action-security` | Server Action Security: Break It, Then Harden It | Server Action security, authorization, IDOR, zod, CSRF, rate limit |
| C13 | `c13-route-handlers` | Route Handlers, Edge Runtime, and proxy.ts | Route Handlers, Edge runtime, proxy.ts, middleware, auth gating |

### Tier 3 — Client Data & State

Client-side state management and the interaction between server and client
caches.

| # | Slug | Title | Key Topics |
|---|------|-------|------------|
| C14 | `c14-tanstack-query` | TanStack Query: Client Data Management | TanStack Query, useQuery, useInfiniteQuery, hydration, client cache |
| C15 | `c15-cart-state` | Cart State: Persisted, Hydration-Safe, Reconciled on Login | cart, Zustand, Context, persistence, hydration, optimistic |
| C16 | `c16-url-state` | URL as Single Source of Truth: Filter, Sort & Paginate | URL state, searchParams, useRouter, shareable state, debounce |
| C17 | `c17-form-state-machine` | Client Form State-Machine: useReducer, Cross-Field Validation | form state, useReducer, state machine, cross-field validation |
| C18 | `c18-optimistic-ui` | Optimistic UI: Instant Updates with Graceful Rollback | useOptimistic, optimistic UI, rollback, reconciliation |
| C19 | `c19-two-sources-of-truth` | Two Sources of Truth + Cross-Tab Sync | TanStack vs RSC cache, BroadcastChannel, reconciliation |

### Tier 4 — Deployment, Testing, OAuth & Advanced

Production-grade concerns: where does your code run, how do you test it, and
how do you handle real authentication at scale?

| # | Slug | Title | Key Topics |
|---|------|-------|------------|
| C20 | `c20-deployment` | Deployment & Runtime Model — Where Does Your Code Actually Run? | deployment, output export, standalone, serverless, edge, Turbopack, PPR |
| C21 | `c21-testing` | Testing Next.js: RSC, Server Actions, Route Handlers, and E2E | testing, vitest, Playwright, RSC testing, Server Action testing |
| C23 | `c23-oauth-authjs` | Real OAuth with Auth.js (next-auth v5) | OAuth, Auth.js, next-auth, JWT session, CSRF state, callbacks |
| C24 | `c24-normalized-state` | Large-scale Normalized State: Seller Data Grid | normalized state, memoized selectors, virtualization, re-render, data grid |

### Tier 5 — Capstone

Apply everything from Tiers 0–4 on a single delivery.

| # | Slug | Title | Key Topics |
|---|------|-------|------------|
| C25 | `c25-capstone` | Capstone: Harden, Polish & Deploy Nextmart | capstone, performance, accessibility, deployment, portfolio |

---

## The Defend-It Workflow

Every challenge uses a five-step active-recall loop:

```
1. Read spec.md          — understand the learning goal and tasks
2. Fill defend-it.md     — answer questions from memory, commit it
3. Implement             — work through the tasks, use verification.md
4. Compare with solution — open solutions/<slug>/ for the reference
5. Revise your answers   — update defend-it.md, it becomes your study notes
```

The defend-it worksheet exists to force **explicit reasoning before seeing
the answer**. Write wrong answers — that is fine. The revision step is where
the learning happens.

---

## Per-Challenge Structure

Every challenge has the same directory layout:

```
app/(challenges)/<slug>/
  _meta/
    challenge.config.json    ← machine-readable config (id, slug, tier, topics, status)
    challenge.config.ts      ← typed re-export of the JSON (for IDE support)
    spec.md                  ← the challenge: learning goal, tasks, acceptance criteria, hints
    defend-it.md             ← questions to answer from memory before reading the solution
    verification.md          ← human-runnable checklist to verify the challenge is done
  page.tsx                   ← the challenge route (follows Cache Components rules)
  [other files as needed]

solutions/<slug>/
  NOTES.md                   ← reference implementation notes and model answers
  [source files as needed]
```

The challenge index (`/`) is **auto-discovered** from
`app/(challenges)/*/_meta/challenge.config.ts` via `lib/registry.ts`. No
hand-maintained list exists — adding a challenge directory with a
`challenge.config.json` is sufficient to make it appear.

---

## Cache Components Rules

This repo runs with `cacheComponents: true` in `next.config.ts`. This is
Next.js 16's Partial Prerendering (PPR) discipline, enforced app-wide.

**Quick rules:**

| Goal | Do | Don't |
|------|----|-------|
| Make a page dynamic | read dynamic data inside `<Suspense>` | `export const dynamic = 'force-dynamic'` |
| Cache a data read | `'use cache'` + `cacheTag()` + `cacheLife()` | rely on implicit fetch caching |
| Read cookies/searchParams | `await` them inside `<Suspense>` | read at route top level |
| Fast first paint with fresh data | static shell + `<Suspense>` hole (◐) | block the whole route on a fetch |

**Full rules:** [`docs/cache-components-rules.md`](docs/cache-components-rules.md)

**Canonical example:** `app/(challenges)/c01-auth/page.tsx` — a static shell
with a `<Suspense>`-wrapped dynamic hole.

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| [Next.js](https://nextjs.org) | 16.2.6 | Framework (App Router, Turbopack, Cache Components) |
| [React](https://react.dev) | 19.2.6 | UI library (Server Components, useOptimistic, useActionState) |
| [TypeScript](https://typescriptlang.org) | 5.9.3 | Type safety (strict mode) |
| [Tailwind CSS](https://tailwindcss.com) | 4.3.0 | Styling (CSS-first, `@import "tailwindcss"`) |
| [TanStack Query](https://tanstack.com/query) | 5.x | Client data management (C14, C19) |
| [TanStack Virtual](https://tanstack.com/virtual) | 3.x | List virtualisation (C24) |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.x | Client state (C15) |
| [Zod](https://zod.dev) | 4.x | Schema validation (C12, C17) |
| [jose](https://github.com/panva/jose) | 6.x | JWT signing/verification (C01) |
| [Auth.js / next-auth](https://authjs.dev) | 5.x beta | OAuth (C23) |
| [Vitest](https://vitest.dev) | 4.x | Unit/integration tests |
| [Playwright](https://playwright.dev) | 1.x | E2E tests |

---

## Key Documentation

| Document | Purpose |
|----------|---------|
| [`docs/cache-components-rules.md`](docs/cache-components-rules.md) | Rules for writing code under `cacheComponents: true`. Read before writing any challenge page. |
| [`docs/decision-log.md`](docs/decision-log.md) | Per-route rendering strategy decisions and rationale. |
| [`docs/perf-budget.md`](docs/perf-budget.md) | Performance budget (Core Web Vitals targets and baselines). |
| [`docs/a11y-pass.md`](docs/a11y-pass.md) | Accessibility audit findings and remediation tracking. |
| [`docs/deploy-notes.md`](docs/deploy-notes.md) | Vercel deployment instructions and environment variables. |

---

## Navigation Tips

- **Start at the index:** `http://localhost:3000` — the challenge index is
  auto-discovered and shows all challenges grouped by tier.
- **Challenge route:** `/c01-auth`, `/c02-catalog-ssg-isr`, etc. — each
  renders a teaching page describing the challenge and its live demo.
- **Sitemap:** `/sitemap.xml` — lists all challenge routes (useful for
  verifying the registry discovery is working).
- **Build output:** `npm run build` prints a route table (○ ◐ ƒ) showing the
  rendering strategy chosen for each route. Study it — it is a key learning
  artifact of the curriculum.

---

## Contributing

This is a personal learning repository. Challenge files under
`app/(challenges)/c01-auth` through `c24-*` are reference implementations.
The capstone (`c25-capstone`) is the learner's own work — fill it in as you
complete the challenge.

---

## Licence

MIT — free to use, fork, and adapt for your own learning.
