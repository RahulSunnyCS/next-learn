# TODO — Next.js 16 Learning Curriculum ("Nextmart")

> Single-writer mirror of the plan (orchestrator-maintained). Source of truth: `pipeline/`.
> **Status: Phase 1 complete → awaiting HUMAN GATE 1 approval + 4 decisions.**
> Nothing below is built yet. Track/version decisions may change the in-scope set.

## Pipeline state
- [x] Phase 0 — Triage (MEDIUM · feature-full · 2 sprints)
- [x] Phase 1 — Planning (Red Team ×2 · score 8.5/10 · QA checklist · translated)
- [ ] **HUMAN GATE 1** ← you are here
- [ ] Phase 2 — Decomposition (atomic task contracts per challenge)
- [ ] Phase 3 — Implementation
- [ ] Phase 4 — Specialist Review → GATE 2
- [ ] Phase 5/6 — Tests + Automation Gate
- [ ] Phase 7 — Final Review → GATE 3

## Decisions pending (Gate 1)
- [ ] D1 — Next.js version/model: **16 + Cache-Components-primary + legacy taught (recommended)** vs 15-primary
- [ ] D2 — Track: Core ~15 / **Complete ~20–21 (recommended)** / Deep ~24
- [ ] D3 — Theme: **Nextmart storefront+dashboard (recommended)** vs blog / social / SaaS
- [ ] D4 — Realism: **mocked checkout + real-ish session + Prisma/SQLite (recommended)** vs real OAuth / in-memory

## Proposed curriculum (Recommended track ~20–21, 5 tiers)
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

_Testing woven as acceptance on 3 representative solutions (RSC / Server Action / Route Handler)._
