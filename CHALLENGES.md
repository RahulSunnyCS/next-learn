# Nextmart — Challenge Progress Tracker

Work through the 25 challenges in order (each tier builds on the last). For each:
**read `_meta/spec.md` → answer `_meta/defend-it.md` from memory & commit → implement →
self-check with `_meta/verification.md` → compare against `solutions/<slug>/` → revise your defend-it notes.**

Mark progress by editing `status` in each challenge's `_meta/challenge.config.json`
(`not-started` → `in-progress` → `complete`) — the home page (`/`) reflects it.

See `README.md` for setup, `docs/cache-components-rules.md` for the Next 16 rules every
challenge follows, and `docs/epics/nextjs-16-learning-curriculum.md` for the full delivery notes.

> Note: `id` is the curriculum sequence number (1–25); the `cNN` directory prefix differs
> slightly (the optimizations lab takes id 7; there is no `c22` directory).

## Tier 0 — Foundation
- [ ] c01-auth — Session security: attack the toy, then build it right (jose JWT)

## Tier 1 — Rendering & Components
- [ ] c02-catalog-ssg-isr — SSG + ISR via `'use cache'`/`cacheLife`, `generateStaticParams`, `dynamicParams`
- [ ] c03-product-ppr — Partial Prerendering: cached static shell + Suspense-streamed dynamic holes
- [ ] c04-rsc-boundary — RSC vs Client boundary, bundle size, deliberate CSR vs SSR
- [ ] c05-app-router — Route groups, dynamic/catch-all, parallel + intercepting routes (modal-via-URL)
- [ ] c06-metadata-seo — `generateMetadata`, OG `ImageResponse`, sitemap/robots
- [ ] lab-optimizations — `next/image` (CLS), `next/font`, `next/script`, code splitting

## Tier 2 — Data, Caching & Actions
- [ ] c07-data-fetching — request memoization (`cache()`), parallel vs waterfall, preload
- [ ] c08-use-cache — the current model: `'use cache'` (file/fn/component), `cacheTag`, `cacheLife`
- [ ] c09-legacy-caches — the legacy four-cache model + why it changed + migration
- [ ] c10-invalidation — `revalidateTag`/`revalidatePath`, dynamic triggers, `draftMode`, stale-cache footgun
- [ ] c11-server-actions — progressive enhancement, `useActionState`, `useFormStatus`
- [ ] c12-action-security — actions as public POST: authn → authz (IDOR) → zod → rate-limit
- [ ] c13-route-handlers — Route Handlers, Edge runtime, `proxy.ts` auth-gate/redirect/rewrite

## Tier 3 — Client Data & State
- [ ] c14-tanstack-query — `useQuery`/`useInfiniteQuery`, server-prefetch + hydration, TanStack vs RSC
- [ ] c15-cart-state — persistence, SSR-safe hydration, reconcile-on-login (Context vs Zustand)
- [ ] c16-url-state — URL as the single source of truth (shareable filters/sort/pagination)
- [ ] c17-form-state-machine — `useReducer` state machine, cross-field validation, server-error merge-back
- [ ] c18-optimistic-ui — `useOptimistic` graded on the rollback/failure path
- [ ] c19-two-sources-of-truth — client cache vs server cache reconciliation + cross-tab sync

## Tier 4 — Deployment, Testing, OAuth & Advanced
- [ ] c20-deployment — serverless vs edge, `output: 'export'`/`standalone`, ISR at infra level
- [ ] c21-testing — testing RSCs, Server Actions, Route Handlers (vitest) + Playwright E2E
- [ ] c23-oauth-authjs — Auth.js: OAuth flow, JWT sessions, CSRF `state` (vs the c01 hand-rolled session)
- [ ] c24-normalized-state — normalized store, memoized selectors, virtualization, no re-render storms

## Tier 5 — Capstone
- [ ] c25-capstone — synthesise everything: perf budget, a11y, error/empty states, SEO, deploy
