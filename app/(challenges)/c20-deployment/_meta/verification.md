# Verification Checklist — Deployment & Runtime Model

> **Purpose:** A human-runnable checklist to verify the challenge resources are
> in place and the page renders correctly.  Run each item in order.

---

## Environment

- [ ] `npm run build` exits 0 with no type or lint errors.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Page Render Checks

- [ ] Navigate to `/c20-deployment`.  The page loads without error.
- [ ] The page shows the route slug `c20-deployment` in monospace at the top.
- [ ] The **Rendering → Infrastructure** table is visible and shows at least 6
  rows covering routes from the Nextmart repo (c01, c02, c03, c11, c13).
- [ ] The `○ / ◐ / ƒ` build symbols appear in the table.
- [ ] The `output:'export'` section lists features that break with static export.
- [ ] The **Defend-It reminder** section is visible at the bottom of the page.
- [ ] The challenge appears in the challenge index at `/` under Tier 4.

---

## Solution Artifact Checks

- [ ] `solutions/c20-deployment/next.config.export.ts` exists and is non-empty.
- [ ] `solutions/c20-deployment/next.config.standalone.ts` exists and is non-empty.
- [ ] `solutions/c20-deployment/Dockerfile` exists.
- [ ] `solutions/c20-deployment/runtime-map.md` exists with the full route table.
- [ ] `solutions/c20-deployment/NOTES.md` exists with cold-start comparison table.

---

## Config Variant Checks (manual read)

- [ ] `next.config.export.ts` contains `output: 'export'` and comments explaining
  at least 6 features that break (ISR, Route Handlers, Server Actions, PPR,
  cacheComponents, on-demand revalidation).
- [ ] `next.config.standalone.ts` contains `output: 'standalone'` and explains
  the standalone server model.
- [ ] Neither file modifies `cacheComponents`, `images`, or any setting that
  would conflict with the canonical `next.config.ts`.
- [ ] The canonical `next.config.ts` has NOT been modified.

---

## Frozen File Check

Run the following to confirm the canonical config was not touched:

```bash
git diff HEAD -- next.config.ts
```

The output must be empty (no changes).

---

## Docker Check (optional — requires Docker)

```bash
# From repo root, using the standalone build:
cp solutions/c20-deployment/Dockerfile ./Dockerfile.c20
# Build with the standalone config variant:
# (This is illustrative — do NOT run next build in the challenge repo itself)
```

- [ ] The Dockerfile references `output: standalone` and copies `.next/standalone/`.
- [ ] The Dockerfile `CMD` runs `node server.js`.
- [ ] The Dockerfile does NOT copy all of `node_modules/` into the final image.

---

## Registry Discovery

- [ ] `lib/registry.ts`'s `discoverChallenges()` picks up this challenge.
- [ ] The index page shows the challenge with slug `c20-deployment`, tier 4,
  id 21, and status `not-started`.
