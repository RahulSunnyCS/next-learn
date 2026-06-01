// ─── app/(challenges)/c25-capstone/page.tsx ───────────────────────────────
//
// C25 — Capstone challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page is a fully STATIC shell — no per-request data is needed.
//   The capstone exercise description, tier summary, and task checklist are
//   all known at build time. The page prerenders to static HTML (○ Static).
//
//   No `export const dynamic` directive — under cacheComponents, that
//   directive is incompatible with the build. Static is simply the outcome
//   of reading no dynamic data at the route's top level.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "C25 — Capstone: Harden, Polish & Deploy",
  description:
    "Synthesise every skill from Tiers 0–4: performance budgeting, accessibility auditing, error states, SEO, and production deployment.",
};

// ─── Static data (build-time) ─────────────────────────────────────────────

const PARTS = [
  {
    id: "P1",
    title: "Performance Budget",
    description:
      "Define and measure Core Web Vitals targets. Identify routes that can move from ƒ Dynamic to ◐ PPR or ○ Static. Run Lighthouse and record baselines in docs/perf-budget.md.",
    tasks: [
      "Run next build and audit the route table",
      "Run Lighthouse against the production URL",
      "Identify heavy JS chunks that can be split or moved server-side",
      "Verify all <Image> components have explicit dimensions",
    ],
  },
  {
    id: "P2",
    title: "Accessibility Audit",
    description:
      "Verify keyboard navigation, screen-reader landmarks, colour contrast, and ARIA usage. Document findings and resolutions in docs/a11y-pass.md.",
    tasks: [
      "Keyboard nav: tab through every interactive element",
      "Screen reader: headings form a logical outline (no skipped levels)",
      "Colour contrast: WCAG 2.1 AA — 4.5:1 normal text, 3:1 large text",
      "Landmarks: <header>, <nav>, <main>, <footer> present and skip link works",
      "Suspense holes announced correctly with aria-live if needed",
    ],
  },
  {
    id: "P3",
    title: "Error, Empty & Loading States",
    description:
      "Verify app-level error, 404, and loading states. Ensure Suspense fallbacks are meaningful skeletons that prevent layout shift.",
    tasks: [
      "app/error.tsx: test by throwing in a Server Component",
      "app/not-found.tsx: navigate to a non-existent URL",
      "app/loading.tsx: throttle network and observe skeleton",
      "Suspense fallbacks match the layout of the actual content",
    ],
  },
  {
    id: "P4",
    title: "SEO",
    description:
      "Verify sitemap.xml and robots.txt are reachable at their canonical paths. Verify every challenge page has unique metadata.",
    tasks: [
      "GET /sitemap.xml — lists all challenge routes",
      "GET /robots.txt — has Allow: / and Sitemap: pointer",
      "Every challenge page has a unique <title> and <meta description>",
      "OG image is reachable (check /og or challenge-specific OG routes)",
    ],
  },
  {
    id: "P5",
    title: "Deployment",
    description:
      "Deploy to Vercel. Set required environment variables. Verify the build log and at least two end-to-end flows in production.",
    tasks: [
      "Push repository to GitHub",
      "Import into Vercel and set SESSION_SECRET, NODE_ENV, NEXT_PUBLIC_SITE_URL",
      "Verify build log exits 0",
      "Test two challenge flows end-to-end in the live deployment",
      "Document the live URL and env vars in docs/deploy-notes.md",
    ],
  },
] as const;

const TIER_CONNECTIONS = [
  {
    tier: "Tier 0",
    challenge: "C01 — Session Security",
    connection: "Deploy-time secret rotation; verify SESSION_SECRET is server-only (never NEXT_PUBLIC_).",
  },
  {
    tier: "Tier 1",
    challenge: "C02–C06, Lab",
    connection: "PPR architecture; static shell patterns; generateMetadata; sitemap/robots from C06.",
  },
  {
    tier: "Tier 2",
    challenge: "C07–C13",
    connection: "'use cache' discipline; invalidation; Server Action security; Route Handler auth gating.",
  },
  {
    tier: "Tier 3",
    challenge: "C14–C19",
    connection: "Client data freshness; optimistic UI rollback; URL state preservability (shareability).",
  },
  {
    tier: "Tier 4",
    challenge: "C20–C24",
    connection: "Deployment output modes; testing strategy; OAuth setup; normalized state render budget.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────

function PartCard({
  part,
}: {
  part: (typeof PARTS)[number];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold shrink-0">
          {part.id}
        </span>
        <h2 className="font-semibold text-gray-900 text-base">{part.title}</h2>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{part.description}</p>
      <ul className="space-y-1.5 mt-2">
        {part.tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            {/* Checkbox placeholder — learner checks off in the spec */}
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 bg-white inline-block" aria-hidden="true" />
            {task}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function C25CapstonePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* ── Header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c25-capstone · tier 5</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Capstone: Harden, Polish &amp; Deploy Nextmart
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          The capstone synthesises every skill from Tiers 0–4. You will apply
          rendering-strategy knowledge, caching discipline, security hardening,
          performance optimisation, accessibility auditing, and production
          deployment — all on a real Next.js 16 application.
        </p>
      </div>

      {/* ── Goal banner ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-2">
        <h2 className="font-semibold text-indigo-900 text-sm">By the end of this capstone you will have:</h2>
        <ul className="text-sm text-indigo-800 space-y-1.5 list-none">
          {[
            "A Lighthouse score of 90+ in Performance, Accessibility, Best Practices, and SEO",
            "A documented performance budget with measured Core Web Vitals baselines",
            "A documented accessibility audit with all critical findings addressed",
            "A live, publicly accessible Vercel deployment",
            "A portfolio-quality README explaining the curriculum and the project",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Five parts ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">The Five Parts</h2>
        {PARTS.map((part) => (
          <PartCard key={part.id} part={part} />
        ))}
      </section>

      {/* ── Curriculum connections ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">How This Connects to the Curriculum</h2>
        <p className="text-sm text-gray-500">
          Each tier taught a skill set that you apply directly in this capstone.
        </p>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-700 w-24">Tier</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700">Challenges</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700">Capstone connection</th>
              </tr>
            </thead>
            <tbody>
              {TIER_CONNECTIONS.map((row, i) => (
                <tr key={row.tier} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2 text-indigo-600 font-mono text-xs font-medium whitespace-nowrap">{row.tier}</td>
                  <td className="px-4 py-2 text-gray-700 text-xs whitespace-nowrap">{row.challenge}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{row.connection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Acceptance criteria summary ── */}
      <section className="rounded-xl border border-green-100 bg-green-50 p-5 space-y-2">
        <h2 className="font-semibold text-green-900 text-sm">Acceptance Criteria (summary)</h2>
        <ol className="text-sm text-green-800 space-y-1.5 list-decimal list-inside">
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">npm run build</code> exits 0, all 25 routes present</li>
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">npm run lint</code> exits 0 (0 errors)</li>
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">npm test</code> — all vitest tests pass</li>
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">docs/perf-budget.md</code> defines and measures six metrics</li>
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">docs/a11y-pass.md</code> records audit findings</li>
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">docs/deploy-notes.md</code> has the live Vercel URL</li>
          <li>Shell uses semantic HTML landmarks and skip-to-content link</li>
          <li><code className="font-mono text-xs bg-green-100 rounded px-1">/sitemap.xml</code> and <code className="font-mono text-xs bg-green-100 rounded px-1">/robots.txt</code> are reachable</li>
        </ol>
      </section>

      {/* ── Full spec link ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you start:</p>
        <p>
          Read the full spec in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c25-capstone/_meta/spec.md
          </code>
          . Then fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            _meta/defend-it.md
          </code>{" "}
          with your own answers before revealing the solutions.
        </p>
        <p className="mt-2">
          Reference solution notes:{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c25-capstone/NOTES.md
          </code>
        </p>
      </section>

      {/* ── Navigation ── */}
      <div className="pt-2 border-t border-gray-100">
        <Link
          href="/"
          className="text-sm text-indigo-600 no-underline hover:underline"
        >
          ← Back to challenge index
        </Link>
      </div>
    </div>
  );
}
