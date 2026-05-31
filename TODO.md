# TODO — Next.js 16 Learning Curriculum ("Nextmart")

> Single-writer mirror of the plan (orchestrator-maintained). Source of truth: `pipeline/`.
> **Status: Phase 2 done (27 contracts). Phase 3 IMPLEMENTATION in progress — all gates auto-approved by user; building batch-by-batch.**
> Contracts: `pipeline/tasks/T-00..T-26.json` · order: `pipeline/tasks/BUILD-ORDER.md`. Challenge CNN ↔ task: C01=T-02, C02=T-03 … C24=T-26 (offset by the 2 foundation tasks + the lab).

## Pipeline state
- [x] Phase 0 — Triage (MEDIUM · feature-full · 2 sprints)
- [x] Phase 1 — Planning (Red Team ×2 · score 8.5/10 · QA checklist · translated)
- [x] **HUMAN GATE 1 — APPROVED**
- [ ] Phase 2 — Decomposition (atomic task contracts per challenge) ← next
- [ ] Phase 3 — Implementation
- [ ] Phase 4 — Specialist Review → GATE 2
- [ ] Phase 5/6 — Tests + Automation Gate
- [ ] Phase 7 — Final Review → GATE 3

## Decisions locked (Gate 1 ✓)
- [x] D1 — **Next.js 16 + both models** (Cache Components primary + legacy four-cache + migration)
- [x] D2 — **Deep (~24)**
- [x] D3 — **Nextmart** storefront + seller dashboard (delegated to orchestrator)
- [x] D4 — **In-memory mock data** (async repo + simulated latency + route-handler reads for fetch-cache)

## Curriculum (Deep track ~24, 6 tiers)
### Tier 0 — Foundation
- [ ] C00 — Scaffold + pin Next 16 + rendering-strategy decision log
- [ ] C01 — Auth/session foundation (attack-the-toy → rebuild on vetted library; frozen `lib/auth/`)
### Tier 1 — Rendering & components
- [ ] C02 — Catalog: SSG + ISR (+ un-prerendered-slug gotcha)
- [ ] C03 — Product page: PPR/cacheComponents + Streaming SSR + name-the-strategy table
- [ ] C04 — Server/client boundary refactor (bundle, deliberate CSR, server-only)
- [ ] C05 — App Router: groups, dynamic/catch-all, loading/error/not-found, parallel (+default.tsx), intercepting modal-via-URL
- [ ] C06 — Metadata & SEO (generateMetadata, OG ImageResponse, sitemap/robots)
- [ ] LAB — Optimizations checklist (next/image+CLS, next/font, next/script, Link prefetch)
### Tier 2 — Data, caching, actions (staff core)
- [ ] C07 — Data fetching (dedupe, parallel vs sequential, waterfall fix, preload)
- [ ] C08 — Current caching: `'use cache'`, cacheTag/cacheLife, cache() vs 'use cache'
- [ ] C09 — Legacy four-cache model + why it changed + migration
- [ ] C10 — Invalidation + dynamic-rendering triggers + 2-arg revalidateTag + stale-cache footgun
- [ ] C11 — Server Actions (progressive enhancement, useActionState/useFormStatus, revalidate)
- [ ] C12 — Server Action SECURITY (authz, validation, origin protection; break→harden)
- [ ] C13 — Route Handlers + Edge (runtime='edge') + proxy.ts (auth/redirect/rewrite)
### Tier 3 — Client data & state (≥5 distinct)
- [ ] C14 — TanStack Query (dedupe/cache, infinite scroll, prefetch+hydrate, vs RSC)
- [ ] C15 — Cart state (persist + reconcile on login, hydration-safe)
- [ ] C16 — URL as single source of truth (shareable filters/sort/pagination)
- [ ] C17 — Client form state-machine (cross-field validation, server-error merge-back)
- [ ] C18 — Optimistic UI (graded on rollback/failure path)
- [ ] C19 — Flagship: two sources of truth (client vs server cache) + cross-tab sync
### Tier 4 — Deployment
- [ ] C20 — Runtime model (serverless vs edge, output:'export', standalone/Docker, ISR at infra)
### Tier 5 — Deep extensions
- [ ] C21 — Testing (RSC + Server Action + Route Handler unit/integration + Playwright E2E)
- [ ] C22 — Capstone: polish Nextmart into a deployable portfolio piece (perf budget, a11y, error/empty states, README, deploy)
- [ ] C23 — Real OAuth via Auth.js (JWT session, no DB; replaces self-contained session; OAuth flow/callbacks/CSRF state) — needs a free OAuth app or a no-setup Credentials fallback
- [ ] C24 — Large-scale normalized state (seller data-grid: normalize, memoized selectors, virtualization, no re-render storms)

_Testing also woven as acceptance on 3 representative solutions (RSC / Server Action / Route Handler); C21 is the dedicated deep-dive._
