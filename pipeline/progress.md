# Pipeline Progress

**Task:** Design a Next.js App Router learning project + a curriculum of medium/hard challenges for a senior React engineer (interview-readiness across 12 topic areas).

**Lane:** feature-full | **Risk:** MEDIUM | **sprint_count:** 2 | **Human gates:** 3
**Effort:** Planning at max (per CLAUDE.md default table). Global effort: default.
**recommendation_rounds_used:** 0

**AUTONOMY GRANT (user, 2026-05-31):** Auto-approve ALL human gates (Gate 1 done; Gate 2 + Gate 3 pre-approved) and run Phase 2→7 to completion WITHOUT pausing — EXCEPT on a "critical concern": an unsafe security default, a Critical/High Phase-4 finding in auth/server-action/OAuth solutions, an architectural ambiguity risking large rework, a foundation build failure I can't resolve, or anything contradicting user intent. Commit+push after every batch (ephemeral container). At cleanup: delete pipeline/ but PRESERVE a learner-facing challenge checklist; permanent record → docs/epics/.

## Phase status

- [x] Phase 0 — Triage (risk_manifest.json written)
- [ ] Phase 1 — Planning (Red Team loop ×2 → score → QA Planner → Translator → seed TODO)
  - [x] Red Team sprint 1 — found verification + caching-vocab + auth-sequencing gaps → folded into v2
  - [x] Red Team sprint 2 — CRITICAL: curriculum was built on pre-v16 APIs. Verified Next.js 16 (Oct 2025) is current stable: middleware→proxy.ts (Node), unstable_cache→'use cache', PPR→cacheComponents, cacheTag/cacheLife stable, revalidateTag 2-arg, async request APIs await-only, Turbopack default. Folded into v3.
  - [x] Internal score — 8.5/10 (Completeness 9, Security 8.5, Feasibility 8.5, Clarity 8.5) ≥ 8 → no 3rd sprint
  - [x] QA checklist — 🔴11 / 🟡24 / 🟢6 (pipeline/qa-checklist.md)
  - [x] Translated Plan Report
  - [x] **HUMAN GATE 1 — APPROVED** with decisions (see below)
  - recommendation_rounds_used: 0 (R1/R2/R3 were already folded into the recommended plan; user selected a presented track, not a new AI rec → no re-plan round consumed)

### Gate 1 outcome (decisions locked)
- **D1 = Next.js 16 + BOTH models** — v16 Cache Components / 'use cache' / cacheTag/cacheLife / proxy.ts PRIMARY; legacy four-cache + unstable_cache + middleware + migration taught.
- **D2 = Deep (~24)** — Complete (C00–C20) + C21 testing + C22 capstone + C23 real OAuth (Auth.js) + C24 large-scale normalized state.
- **D3 = theme delegated → orchestrator chose "Nextmart" (storefront + seller dashboard).**
- **D4 = in-memory mock data** (no DB). MITIGATION: thin async repo layer over in-memory stores w/ seeded fixtures + simulated latency; some reads via Route Handlers so fetch-cache is demonstrable; 'use cache'/unstable_cache/ISR wrap the repo. OAuth (C23) uses Auth.js JWT strategy (no DB) — compatible; needs a free OAuth app or a no-setup Credentials fallback.

- [x] Phase 2 — Decomposition DONE — 27 contracts (T-00..T-26) + BUILD-ORDER.md
  - Independence verified: each challenge writes only app/(challenges)/cNN-*/** + solutions/cNN-*/**; proxy.ts sole owner T-15; shared shell sole writer T-24 (last, alone); nav auto-discovers via registry
  - Checkpoint AUTO-APPROVED (user autonomy grant) → proceeding to Phase 3
  - ARCH DECISION: main app runs cacheComponents ON (D1 current-model primary). Legacy four-cache (T-11) taught as self-contained variant/comparison, NOT by toggling app-wide defaults. output:'export' (T-22) via alternate config variant only.

- [ ] Phase 3 — Implementation (batched per BUILD-ORDER; commit+push after each batch)
  - [x] Batch F1: T-00 scaffold — DONE. Next 16.2.6 pinned, cacheComponents:true (top-level), Tailwind 4, ESLint flat (next lint removed in 16). Build/typecheck/lint pass (verified independently). NOTE: registry discovers challenge.config.JSON (Turbopack can't dynamic-require .ts) + typed .ts re-export — ALL challenges must add challenge.config.json.
  - [x] Batch F2: T-01 data + T-02 auth — DONE. T-01: 55 tests pass. T-02: jose-signed JWT session (httpOnly/secure/sameSite, HS256 allowlist, expiry verified), attack-the-toy→secure C01. Build green: /c01-auth = ◐ Partial Prerender, login/logout = Dynamic. Registry discovers it.
    - Fixed: ChallengeTier 1-5 → 0-5 (+page label) so foundation=Tier 0; c01-auth tier 0.
    - DISCOVERY (cacheComponents): (a) `export const dynamic` is DISALLOWED; (b) uncached/dynamic data (cookies/searchParams/uncached reads) MUST be inside <Suspense> (static shell + streamed hole). Wrote docs/cache-components-rules.md; c01-auth/page.tsx is the canonical example. These rules go into EVERY challenge brief.
  - [x] Batch 1 (Tier1): T-03..T-08 — DONE & GREEN. 6 challenges built in parallel + 1 fix cycle. Route table verified: ○ static (c04,c05,c06,lab), ◐ Partial Prerender (c03/[slug], c04/account, c05 intercepting+products, c06/[slug]), ƒ dynamic (og image, sitemap). Lint clean; 55 tests pass.
    - More cacheComponents rules learned & documented: dynamicParams/revalidate/fetchCache exports also banned; Math.random() in lib/data latency forces 'use cache' or <Suspense>; next/dynamic ssr:false needs a client wrapper. (docs/cache-components-rules.md updated.)
  - [x] Batch 2 (Tier2 — caching+actions core): T-09..T-15 — DONE & GREEN. 7 challenges + 1 fix cycle. Routes: ◐ c07/c08/c10/c12/c13, ○ c09/c11/c10-draft, ƒ edge-geo/search route handlers + Proxy(Middleware). Lint clean; 55 tests pass.
    - c12-action-security: 5-layer hardened action (authn→rate-limit→zod→IDOR ownership→write); insecure toy doesn't write. Looks genuinely secure (Phase-4 audit will confirm).
    - More learnings: proxy.ts must export `proxy` (not `middleware`); `export const runtime` ALSO incompatible w/ cacheComponents (edge selection = deploy-level); need `await connection()` before Math.random()/Date.now() even inside Suspense. (rules doc updated.)
  - [x] Batch 3 (Tier3 — state mgmt, the ≥5 ask): T-16..T-21 — DONE & GREEN. 6 challenges + 1 fix cycle. ◐ c14/c15/c16/c18/c19, ○ c17, ƒ api routes. 46 routes total, lint clean, 55 tests. 5 distinct state challenges (cart+hydration, URL-as-truth, form state-machine, optimistic+rollback, two-sources+cross-tab) + TanStack Query. Fix: moved non-async helper out of a 'use server' file.
  - [x] Batch 4 (Tier4/5): T-22 deploy, T-23 testing, T-25 OAuth, T-26 normalized-state — DONE & GREEN. Interrupted by a session limit mid-run; the partial work already built green, then 4 completion agents filled in missing meta/solutions + 1 fix cycle (no-op, confirmed green). Full verify: build OK, lint 0 errors/1 warning, typecheck exit 0, 104 tests pass (4 files incl. c21 testing suites). c23-oauth = Auth.js JWT (Credentials + GitHub), dev-fallback AUTH_SECRET + trustHost (flag for Phase-4 sec review).
  - [x] Batch 5: T-24 capstone — DONE & GREEN. Shell polished, README, global states, sitemap/robots. 55 routes, lint 0 errors, typecheck exit 0, 104 tests.
  - [x] **PHASE 3 COMPLETE — all 25 challenges (c01..c25) implemented & verified green.**
- [~] Phase 4 — Specialist Review (security-auditor Opus/max + performance + architecture) → synthesize → Gate 2 (auto-approve unless Critical/High) — RUNNING
  - Security focus: the 5 security-teaching solutions (c01 lib/auth, c11/c12 actions, c13 proxy/handlers, c23 oauth) + live surface (no committed secrets, insecure-toys not live-reachable, input validation, dev-fallback secrets).
  - [ ] Batch 4 (Tier4/5): T-22,T-23,T-25,T-26 (parallel)
  - [ ] Batch 5: T-24 capstone (alone, last)

### v3 revisions folded in (from sprint 1 + 2)
- Version/model fork resolved at C00 (RECOMMEND: pin Next 16, Cache Components primary, teach legacy four-cache model + migration as "what's in production / interview classic"). USER DECISION at Gate 1.
- "Defend It" active-recall = committed artifact before solution + self-scored rubric (enforceable, not honor-system).
- C01 auth = toy-tamperable-session (to demonstrate attacks) THEN vetted-library (jose/iron-session); downstream depends on the library version. Frozen immutable lib/auth/ in files_forbidden for dependents (Phase-2 independence).
- Caching split: C08 current model ('use cache'/cacheTag/cacheLife, cache() vs 'use cache') + C09 legacy four-cache + migration + C10 invalidation/dynamic-triggers/draftMode (revalidateTag 2-arg, async-only request APIs).
- C13 Edge restricted-API lesson moved to runtime='edge' route handler (proxy.ts is Node in v16).
- C03 explicit "name-the-strategy" table (CSR/SSR/SSG/ISR/Streaming-SSR/PPR distinct) + deliberate CSR widget.
- State (≥5) sharpened to distinct named problems (C15 cart+hydration-reconcile, C16 URL-as-truth, C17 form state-machine, C18 optimistic failure-path, C19 two-sources-of-truth+cross-tab flagship).
- Testing = acceptance criterion on ~3 representative solutions (Recommended); dedicated challenge in Deep.
- Tracks: A "Core/on-ramp ~15" (reframed as Phase 1 of B, not a knowingly-incomplete finish), B "Recommended/Complete ~20-21" (satisfies all incl. ≥5 state), C "Deep ~24".
- [ ] Phase 2 — Decomposition
- [ ] Phase 3 — Implementation
- [ ] Phase 4 — Specialist Review (security + performance + architecture) → HUMAN GATE 2
- [ ] Phase 5 — Test Generation
- [ ] Phase 6 — Test Execution + Automation Gate
- [ ] Phase 7 — Final Review → HUMAN GATE 3

## Notes
- Project context files (.claude/project/overview.md, business.md, technical.md) do NOT exist yet — this plan is defining the project from scratch, so that is expected. /setup-project can capture them after Gate 1.
