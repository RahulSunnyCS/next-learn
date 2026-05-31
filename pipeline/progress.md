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

- [ ] Phase 2 — Decomposition (IN PROGRESS — 27 task contracts: T-00..T-26)
  - Foundation: T-00 scaffold+harness, T-01 in-memory data, T-02 auth (C01, frozen lib/auth)
  - Challenges: T-03..T-26 (C02..C24 + optimizations lab)
  - Shared-file freezes: next.config (T-00), lib/auth (T-02), lib/data (T-01), proxy.ts (T-15) → files_forbidden for dependents; nav uses a per-challenge registry (no shared writes)
  - [ ] Present task list → checkpoint "Shall I proceed with implementation?"

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
