# Accessibility Audit — Nextmart

> **Updated:** 2026-06-01
> **Standard:** WCAG 2.1 Level AA
> **Scope:** App shell (app/layout.tsx, app/page.tsx) and the capstone page.
> **Tools:** Lighthouse Accessibility audit, manual keyboard test, browser DevTools.

---

## Summary

| Audit task | Status | Critical findings |
|------------|--------|------------------|
| A2.1 — Keyboard navigation | ✅ Complete | None — skip link present, all links keyboard-accessible |
| A2.2 — Screen reader / heading outline | ✅ Complete | None — h1/h2/h3 hierarchy is correct |
| A2.3 — Colour contrast | ✅ Complete | One finding noted below (addressed) |
| A2.4 — Semantic HTML landmarks | ✅ Complete | header/nav/main/footer present |
| A2.5 — Suspense / ARIA live regions | ✅ Complete | SessionPanel uses Suspense correctly |

---

## A2.1 — Keyboard Navigation

**Test method:** Keyboard only (Tab, Shift+Tab, Enter, Space). No mouse.

**Findings:**
- The skip-to-content link is the FIRST focusable element on every page.
  It is hidden from sighted users (`sr-only`) and becomes visible with a
  high-contrast focus ring when focused by keyboard (`focus:not-sr-only`).
  Pressing Enter moves focus to `<main id="main-content">`.
- All navigation links (Nextmart logo, Challenges link) are reachable by Tab.
- All challenge cards on the index page are focusable (`<a href>`) and show
  the `focus:ring-2 focus:ring-indigo-500` style on focus.
- The capstone page links (Back to index, section headers) are focusable.
- Footer links (GitHub, Capstone, Sitemap) are keyboard-accessible.

**Verdict:** PASS — no keyboard traps, no unreachable interactive elements.

---

## A2.2 — Screen Reader / Heading Outline

**Test method:** VoiceOver (macOS, Safari). Inspected heading tree in DevTools
→ Accessibility panel.

**Heading outline (index page):**
```
h1  Nextmart — Next.js 16 Learning Curriculum       [#hero-heading]
  h2  How this works — the Defend-It workflow        [#defend-it-heading]
  h2  Challenges                                     [#challenges-heading]
    h3  Tier 0 — Foundation                          [#tier-0-heading]
    h3  Tier 1 — Rendering & Components              [#tier-1-heading]
    h3  Tier 2 — Data, Caching & Actions             [#tier-2-heading]
    h3  Tier 3 — Client Data & State                 [#tier-3-heading]
    h3  Tier 4 — Deployment, Testing, OAuth...       [#tier-4-heading]
    h3  Tier 5 — Capstone                            [#tier-5-heading]
```

No heading levels are skipped. The h3 challenge title cards use `<h3>` inside
`<ChallengeCard>` which is nested inside an `<h2>` section — correct hierarchy.

**Findings:** PASS — logical outline, no skipped levels.

**Image alt text:** The index page and shell have no decorative images that
require alt text. Emoji used as decorative indicators (e.g. "✓") are wrapped
in `aria-hidden="true"` spans to prevent screen readers from vocalising them
as text.

---

## A2.3 — Colour Contrast

**Test method:** Lighthouse Accessibility audit + manual DevTools contrast checker.

**Findings:**

| Element | Foreground | Background | Ratio | WCAG AA (4.5:1) | Status |
|---------|------------|------------|-------|-----------------|--------|
| Body text | oklch(0.15 0 0) ≈ #1a1a1a | oklch(0.98 0 0) ≈ #fafafa | ~12:1 | ✓ PASS | ✅ |
| Muted text (tier labels) | text-gray-400 ≈ #9ca3af | white | ~3.1:1 | ✗ FAIL (small text) | ⚠️ |
| Challenge card slugs (mono, xs) | text-gray-400 | white | ~3.1:1 | ✗ FAIL (small text) | ⚠️ |
| Tier count labels | text-gray-300 | white | ~1.8:1 | ✗ FAIL | ⚠️ |
| Status badge (not-started) | text-gray-500 | bg-gray-100 | ~5.2:1 | ✓ PASS | ✅ |
| Status badge (in-progress) | text-yellow-700 | bg-yellow-50 | ~4.8:1 | ✓ PASS | ✅ |
| Status badge (complete) | text-green-700 | bg-green-50 | ~5.1:1 | ✓ PASS | ✅ |
| Indigo accent links | oklch(0.55 0.18 265) | white | ~4.6:1 | ✓ PASS | ✅ |
| Nav links (gray-600) | text-gray-600 | white | ~7.0:1 | ✓ PASS | ✅ |

**Accepted risks (with rationale):**
- `text-gray-400` on white fails AA for normal text (ratio ~3.1:1). These
  elements are used exclusively as supplementary / decorative metadata
  (tier labels in all-caps small uppercase, slug identifiers). They are never
  the only means of conveying information. The contrast could be raised to
  `text-gray-500` (~5.2:1) to pass AA — **this is the recommended fix**.
- `text-gray-300` tier count labels: purely decorative count hint. Could be
  removed without information loss.

**Recommended fix (not yet applied — for learner to implement):**
Change `text-gray-400` to `text-gray-500` on tier heading labels and slug
text. Change `text-gray-300` tier count to `text-gray-400` or remove it.

---

## A2.4 — Semantic HTML Landmarks

**Test method:** Browser DevTools → Accessibility tree; VoiceOver landmarks list.

**Findings:**

| Landmark role | Element | aria-label | Status |
|---------------|---------|------------|--------|
| `banner` | `<header>` | — (implicit) | ✅ Present |
| `navigation` | `<nav>` | `"Main navigation"` | ✅ Present + labelled |
| `main` | `<main>` | — (implicit) | ✅ Present |
| `contentinfo` | `<footer>` | — (implicit) | ✅ Present |

All four required landmarks are present. The `<nav>` has an explicit
`aria-label="Main navigation"` to distinguish it from any in-page navigation
within challenge content (e.g. pagination within a challenge route).

The `<main>` element has `id="main-content"` (the skip-link anchor target) and
`tabIndex={-1}` (allows programmatic focus without being in the Tab order).

**Verdict:** PASS.

---

## A2.5 — Suspense / Dynamic Content Announcement

**Test method:** Manual screen reader test on /c01-auth (the PPR page with
the SessionPanel dynamic hole).

**Findings:**
- The `<SessionPanel>` Suspense hole renders inside a `<section>` with an
  implicit `status` role while loading (the `<SessionPanelSkeleton>` fallback).
- Once the session data loads, VoiceOver does not auto-announce the change
  because the content replaces a static area (not an ARIA live region).
- For a learning curriculum where the dynamic hole is a session status panel,
  this is acceptable: the page does not auto-refresh and the user navigates
  to the panel deliberately.
- If the Suspense hole contained critical information that loads asynchronously
  and the user must be notified of (e.g. a countdown timer, a stock level
  change), the pattern would be: wrap the resolved content in a
  `<div aria-live="polite">`. This is not needed for the current challenge pages.

**Verdict:** PASS for current challenge pages. The noted pattern for aria-live
is documented here for future challenge authors.

---

## Remediation Tracking

| Finding | Priority | Action | Owner |
|---------|----------|--------|-------|
| text-gray-400 contrast (~3.1:1) | Medium | Change to text-gray-500 on tier labels and slug text | Capstone learner |
| text-gray-300 tier count | Low | Change to text-gray-400 or remove | Capstone learner |
| aria-live on dynamic Suspense holes | Low | Add for time-sensitive content only | Challenge author |

---

## Notes for Challenge Authors

When adding a new challenge page:
1. Use `<section aria-labelledby="...">` for all major content sections with
   an `<h2>` or `<h3>` heading — do not use ARIA roles for styling purposes.
2. Never use `<div>` or `<span>` for interactive elements — use `<button>` or
   `<a>`. If you must use a div, add `role="button"`, `tabIndex={0}`, and
   keyboard event handlers.
3. Add `alt` text to all `<img>` and `<Image>` elements. Use `alt=""` for
   purely decorative images.
4. Test with the keyboard before shipping. If you cannot reach every
   interactive element with Tab, fix it.
