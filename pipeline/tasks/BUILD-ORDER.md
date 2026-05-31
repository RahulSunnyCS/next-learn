# BUILD-ORDER — Phase 3 Parallel Implementation Batches

Source of truth: `pipeline/tasks/T-XX.json`. This file describes the dependency
batches the orchestrator uses to schedule Phase 3. Tasks within a batch are
independent (no shared file writes) and may run in parallel; batches run in
order. The independence model is enforced by each task's `files_forbidden`
(foundation-owned files + all sibling challenge directories).

## Batches

### Batch F1 — Foundation root (alone, first)
- **T-00** Scaffold & challenge harness
- Runs ALONE before anything else. Owns all shared shell + config files
  (package.json, next.config.ts, tsconfig.json, tailwind/postcss, app/layout.tsx,
  app/page.tsx, app/globals.css, lib/registry.ts) plus HARNESS.md and
  docs/decision-log.md. Everything else depends on it.

### Batch F2 — Frozen libraries (parallel, after T-00)
- **T-01** In-memory data layer — owns `lib/data/**`
- **T-02** C01 Auth/session foundation — owns `lib/auth/**` [risk: auth]
- These two own disjoint frozen directories, so they parallelize cleanly.
  Both depend only on T-00. Their public interfaces (lib/data repository +
  tags, lib/auth getSession/createSession/destroySession) are frozen contracts
  that all later challenges IMPORT but never edit.

### Batch 1 — Tier 1: Rendering & components (parallel)
- **T-03** C02 Catalog SSG + ISR
- **T-04** C03 Product detail PPR + Streaming SSR
- **T-05** C04 RSC/Client boundary refactor  (imports frozen lib/auth)
- **T-06** C05 App Router architecture
- **T-07** C06 Metadata & SEO
- **T-08** LAB Optimizations checklist
- All depend on T-00 + T-01 (T-05 also on T-02). Each writes only inside its own
  `app/(challenges)/cNN-*/**` + `solutions/cNN-*/**`, so all six run in parallel.

### Batch 2 — Tier 2: Data, caching, actions (parallel)
- **T-09** C07 Data fetching & waterfalls
- **T-10** C08 Current caching model ('use cache')
- **T-11** C09 Legacy four-cache model + migration
- **T-12** C10 Invalidation + dynamic-rendering triggers + footguns
- **T-13** C11 Server Actions [risk: public-api]
- **T-14** C12 Server Action SECURITY  (imports frozen lib/auth) [risk: auth, public-api]
- **T-15** C13 Route Handlers + Edge + proxy.ts — OWNS `proxy.ts` (imports frozen lib/auth) [risk: auth, public-api]
- All depend on T-00 + T-01 (T-14 + T-15 also on T-02). T-15 is the sole owner of
  the root-level `proxy.ts`; no other task in any batch touches it, so it stays
  independent. Runs in parallel.

### Batch 3 — Tier 3: Client data & state
Parallel first, then T-21:
- **T-16** C14 TanStack Query
- **T-17** C15 Cart state  (imports frozen lib/auth)
- **T-18** C16 URL-as-source-of-truth state
- **T-19** C17 Client form state-machine
- **T-20** C18 Optimistic UI  (imports frozen lib/auth)
- then **T-21** C19 Two-sources-of-truth + cross-tab sync (FLAGSHIP) — depends on T-16
- T-16..T-20 run in parallel (each depends only on T-00/T-01, T-17 + T-20 on T-02).
  **T-21 depends on T-16** (it builds on the TanStack Query setup), so it runs
  after T-16 lands. T-21 stands up its OWN local QueryProvider inside its
  challenge directory — it does not import T-16's files — so the dependency is
  conceptual/sequencing, not a shared-file write.

### Batch 4 — Tier 4/5: Deployment, testing, OAuth, normalized state (parallel)
- **T-22** C20 Deployment & runtime model  (depends on T-00 only; forbids editing canonical next.config.ts)
- **T-23** C21 Testing  (depends on T-00, T-01, T-04, T-13, T-15 — reads those solutions READ-ONLY)
- **T-25** C23 Real OAuth (Auth.js) — additive variant (depends on T-00, T-02; must NOT edit frozen lib/auth or proxy.ts) [risk: auth]
- **T-26** C24 Large-scale normalized state (depends on T-00, T-01)
- These four write only inside their own scopes and run in parallel. T-23's
  three target solutions (T-04 RSC, T-13 Server Action, T-15 Route Handler) must
  already be complete (they are in Batches 1–2), and T-23 treats them as
  read-only context — it adds only its own tests under solutions/c21-testing/**.

### Batch 5 — Capstone (alone, last)
- **T-24** C22 Capstone (INTEGRATIVE)
- Runs ALONE, last, after every other task. It is the ONLY challenge task
  permitted to MODIFY the shared shell (app/layout.tsx, app/page.tsx,
  app/globals.css) + create README.md and docs/. Sequencing it alone guarantees
  those shared-shell edits never collide with a parallel task.

## Security-flagged tasks (Phase 4 targeting)
The following carry `risk_flags` and must be the focus of the Phase 4
security-auditor (Opus/max), even though project risk_level is MEDIUM:
- **T-02** C01 Auth/session foundation — [auth] (frozen session interface; tamperable-vs-vetted session)
- **T-13** C11 Server Actions — [public-api] (actions are public POST endpoints; happy-path mechanics)
- **T-14** C12 Server Action SECURITY — [auth, public-api] (authz + ownership + zod + origin protection; break-then-harden)
- **T-15** C13 Route Handlers + Edge + proxy.ts — [auth, public-api] (auth-gating /account in proxy.ts; GET caching footgun; edge restricted APIs)
- **T-25** C23 Real OAuth (Auth.js) — [auth] (OAuth flow/callbacks/CSRF state param; additive auth variant)

All other tasks carry no risk_flag. Per CLAUDE.md Phase 4, the full reviewer set
(security + performance + architecture) still runs because the lane is
feature-full, but the security-auditor should concentrate effort on the five
tasks above (auth + public-POST surfaces and the reference solutions that model
secure patterns).
