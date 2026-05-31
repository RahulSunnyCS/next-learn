# Nextmart Challenge Harness

This file documents the per-challenge conventions every contributor and
learner must follow.  It is the single authoritative reference — update it
whenever a convention changes.

---

## Repository Layout

```
app/
  (challenges)/           ← route group — "(challenges)" is invisible in URLs
    _template/            ← COPY-ME template (non-routable; starts with _)
      _meta/
        challenge.config.json  ← runtime data (read by registry via fs.readFileSync)
        challenge.config.ts    ← typed re-export of the JSON (for challenge code)
        spec.md
        defend-it.md
        verification.md
      _components/        ← challenge-scoped UI components
      _lib/               ← challenge-scoped utilities / data helpers
      _tests/             ← unit and integration tests
      page.tsx            ← the challenge's live route
    c02-catalog/          ← first real challenge (example)
      _meta/  …
      _components/  …
      page.tsx
    cNN-slug/             ← each additional challenge follows the same pattern
      …
  layout.tsx              ← root shell (nav + globals.css)
  page.tsx                ← auto-discovered challenge index
  globals.css

lib/
  registry.ts             ← auto-discovery helper (no hand-maintained nav list)
  data/                   ← owned by T-01 — in-memory product/user data layer
  auth/                   ← owned by T-02 — session helpers

solutions/
  c02-catalog/            ← reference solution for each challenge
  cNN-slug/               ← one directory per challenge, mirroring app/(challenges)

docs/
  decision-log.md         ← rendering-strategy decision log
  epics/                  ← collated delivery docs (auto-generated, post-Gate-3)
```

---

## Private-Folder Convention

Next.js App Router treats any folder whose name **starts with an underscore**
as **non-routable**.  This means `_meta/`, `_components/`, `_lib/`, and
`_tests/` inside a challenge directory are invisible to the router — they will
never be served as routes even though they live inside a routable segment.

The `_template/` directory at the `(challenges)` level is also non-routable
for the same reason, and the registry glob explicitly excludes any path segment
starting with `_`, so the template never appears in the challenge index.

**Rule:** never put any file you want served as a page inside an
underscore-prefixed folder.  Never put any file you want kept private
*outside* an underscore-prefixed folder (or inside `solutions/`).

---

## Adding a New Challenge

1. **Copy the template:**

   ```bash
   cp -r app/(challenges)/_template app/(challenges)/cNN-slug
   ```

2. **Rename and fill in `_meta/challenge.config.json`:**
   - Set `id`, `slug`, `title`, `tier`, `topics`, `status`.
   - `slug` must match the directory name exactly.
   - The `challenge.config.ts` re-exports the JSON automatically — no edit needed there.

3. **Implement `page.tsx`** — this is the learner's working canvas.

4. **Fill in `_meta/spec.md`** — task description, acceptance criteria, hints.

5. **Fill in `_meta/verification.md`** — human-runnable checklist.

6. **Add a reference solution** under `solutions/cNN-slug/` — this directory
   contains the authoritative correct implementation.

7. **Run validation:**

   ```bash
   npm run build   # must exit 0
   npm run typecheck
   npm run lint
   ```

Once `_meta/challenge.config.ts` exists, the challenge automatically appears
in the index at `/` — no manual nav update needed.

---

## The Defend-It Ritual

The Defend-It workflow enforces deliberate practice.  Follow it for every
challenge:

1. **Attempt the challenge** — implement a solution in `app/(challenges)/cNN-slug/`.

2. **Fill in `_meta/defend-it.md`** — answer every question in your own words
   *before* you open the reference solution.  Write full sentences; bullet
   points are fine but "I don't know" is not.

3. **Commit your worksheet:**

   ```bash
   git add app/(challenges)/cNN-slug/_meta/defend-it.md
   git commit -m "chore(cNN): fill defend-it worksheet"
   ```

4. **Reveal the reference solution** — read `solutions/cNN-slug/` and compare
   it to your implementation.

5. **Self-score** using the rubric in `defend-it.md`:

   | Score | Meaning |
   |-------|---------|
   | **2** | Correct and complete — you could explain this to a colleague. |
   | **1** | Partially correct — right direction but missing a key detail. |
   | **0** | Incorrect or "I don't know" — study the solution notes carefully. |

6. **Update your score** in the worksheet and commit again:

   ```bash
   git add app/(challenges)/cNN-slug/_meta/defend-it.md
   git commit -m "chore(cNN): self-score defend-it"
   ```

**Why commit before revealing?**  Git timestamps prove you wrote your answers
first.  This prevents the reflex of reading the solution and then reverse-
engineering a "correct" answer.

---

## Challenge Status Lifecycle

The `status` field in `challenge.config.ts` drives the badge shown in the
index.  Update it as you work:

| Status | When to use |
|---|---|
| `"not-started"` | Default; you have not yet read the spec. |
| `"in-progress"` | You are actively working on the challenge. |
| `"complete"` | You have passed the verification checklist AND self-scored the Defend-It worksheet. |

---

## Registry Convention

`lib/registry.ts` auto-discovers challenges at build time by globbing:

```
app/(challenges)/[^_]*/_meta/challenge.config.json
```

- The `[^_]*` pattern excludes underscore-prefixed dirs (`_template`, etc.).
- The registry reads **`challenge.config.json`** (not the `.ts` file) using
  `fs.readFileSync` + `JSON.parse`.  This avoids Turbopack's inability to
  resolve dynamic `require()` calls with variable paths at build time.
- The companion `challenge.config.ts` re-exports the JSON with TypeScript types;
  it is used by challenge code that needs typed access to the config.
- Challenges are sorted by `id` (ascending) so the index order is deterministic.
- A new challenge appears automatically once its `_meta/challenge.config.json`
  exists — no changes to `app/page.tsx` or any nav list are required.

---

## Rendering Strategy Decision Log

Document every non-trivial rendering strategy decision in
`docs/decision-log.md`.  See that file for the column schema and example rows.

The decision log is a living document — update it whenever a challenge route's
strategy changes.

---

## Dependency Rules

| File / directory | Owner task | Access rule |
|---|---|---|
| `lib/data/**` | T-01 | Other tasks import only — never modify. |
| `lib/auth/**` | T-02 | Other tasks import only — never modify. |
| `proxy.ts` | T-15 | Only T-15 owns it; no other task touches it. |
| `app/(challenges)/cNN-slug/**` | T-NN | Only the owning task writes here. |
| `solutions/cNN-slug/**` | T-NN | Only the owning task writes here. |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css` | T-00 (T-24 may modify) | Read-only for all tasks except T-24 (capstone). |

---

## Scripts Reference

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Start development server. |
| `build` | `next build` | Production build (also validates types). |
| `start` | `next start` | Serve the production build. |
| `lint` | `next lint` | Run ESLint via Next.js config. |
| `typecheck` | `tsc --noEmit` | TypeScript type-check without emitting files. |
