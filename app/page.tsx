// ─── app/page.tsx ─────────────────────────────────────────────────────────
//
// Challenge index — the root page of the Nextmart curriculum.
//
// CACHE COMPONENTS (Next 16, cacheComponents: true):
//   This page is a STATIC shell (○ Static). discoverChallenges() uses
//   fs.globSync — a synchronous filesystem read with NO dynamic/per-request
//   data. The challenge list is fixed at build time; adding a new challenge
//   requires a rebuild. This is intentional: the challenge index changes only
//   when new challenges are shipped, which is a deploy-time event.
//
//   No `export const dynamic` directive — that is incompatible with
//   cacheComponents. Static is simply the outcome of reading no dynamic data.

import { discoverChallenges, challengesByTier } from "@/lib/registry";
import type { DiscoveredChallenge } from "@/lib/registry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenge Index | Nextmart",
  description:
    "25 hands-on Next.js 16 challenges across 5 tiers: rendering, caching, server actions, client state, and deployment.",
};

// ─── Tier meta ────────────────────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
  0: "Tier 0 — Foundation",
  1: "Tier 1 — Rendering & Components",
  2: "Tier 2 — Data, Caching & Actions",
  3: "Tier 3 — Client Data & State",
  4: "Tier 4 — Deployment, Testing, OAuth & Advanced",
  5: "Tier 5 — Capstone",
};

// One-paragraph description displayed under each tier heading.
// These are static and known at build time.
const TIER_DESCRIPTIONS: Record<number, string> = {
  0: "Security foundations. Before rendering, understand sessions, cookies, and JWTs — because every tier above depends on auth being correct.",
  1: "Next.js rendering strategies. Static generation, ISR, Partial Prerendering, RSC vs client boundaries, App Router architecture, metadata, and built-in optimisations.",
  2: "Data and mutations. The 'use cache' model, cache invalidation footguns, legacy four-cache comparison, Server Actions with progressive enhancement, action security, and Route Handlers.",
  3: "Client-side state. TanStack Query for server data, Zustand for cart persistence, URL as state, form state machines, optimistic UI with rollback, and cross-tab sync.",
  4: "Production concerns. Deployment output modes, comprehensive testing (RSC, Server Actions, E2E), real OAuth with Auth.js, and large-scale normalised state with virtualised grids.",
  5: "Capstone. Synthesise Tiers 0–4: performance budgeting, accessibility audit, error and loading states, SEO, and a live Vercel deployment.",
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  "not-started": {
    label: "Not started",
    classes: "bg-gray-100 text-gray-500",
  },
  "in-progress": {
    label: "In progress",
    classes: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  },
  complete: {
    label: "Complete",
    classes: "bg-green-50 text-green-700 ring-1 ring-green-200",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: DiscoveredChallenge }) {
  const { config, href } = challenge;
  const badge = STATUS_BADGE[config.status] ?? STATUS_BADGE["not-started"];

  return (
    <a
      href={href}
      className="block rounded-lg border border-gray-200 p-4 hover:border-indigo-400 hover:shadow-sm transition-all no-underline bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:rounded-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-0.5">
            {config.slug}
          </p>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">
            {config.title}
          </h3>
          {config.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {config.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${badge.classes}`}
        >
          {badge.label}
        </span>
      </div>
    </a>
  );
}

function EmptyState() {
  return (
    // Graceful empty state — shown when no real challenge dirs exist yet.
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
      <p className="text-2xl mb-3" aria-hidden="true">🏗️</p>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        No challenges yet
      </h2>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">
        Challenge directories are added by their own task (starting with T-03).
        Once a challenge folder contains{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          _meta/challenge.config.json
        </code>
        , it will appear here automatically.
      </p>
    </div>
  );
}

// ─── Defend-It workflow explainer ─────────────────────────────────────────
// Static — no dynamic data, prerenders at build time.

function DefendItSection() {
  const steps = [
    {
      num: "1",
      title: "Read the spec",
      body: "Open _meta/spec.md. Understand the learning goal, scenario, and tasks before touching any code.",
    },
    {
      num: "2",
      title: "Fill in defend-it.md",
      body: "Answer the Defend-It questions from memory, in your own words. Commit before reading the model answers.",
    },
    {
      num: "3",
      title: "Implement the challenge",
      body: "Work through the tasks in spec.md. Use the verification checklist in verification.md to self-test.",
    },
    {
      num: "4",
      title: "Compare with the solution",
      body: "Open solutions/<slug>/ to see the reference implementation. Note what you got right and what you missed.",
    },
    {
      num: "5",
      title: "Revise your defend-it answers",
      body: "Update your defend-it.md with corrections. The file becomes your study notes for interview prep.",
    },
  ] as const;

  return (
    <section
      className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-4"
      aria-labelledby="defend-it-heading"
    >
      <div>
        <h2
          id="defend-it-heading"
          className="text-base font-semibold text-gray-900"
        >
          How this works — the Defend-It workflow
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Active recall, not passive reading. Each challenge uses a five-step
          loop designed to build long-term retention.
        </p>
      </div>

      <ol className="space-y-3 list-none">
        {steps.map((step) => (
          <li key={step.num} className="flex items-start gap-3">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0 mt-0.5"
              aria-hidden="true"
            >
              {step.num}
            </span>
            <span className="text-sm text-gray-700">
              <strong>{step.title}</strong> — {step.body}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-xs text-gray-400 pt-1 border-t border-gray-200">
        Per-challenge structure:{" "}
        <code className="font-mono bg-white border border-gray-100 rounded px-1">_meta/spec.md</code>{" "}
        <code className="font-mono bg-white border border-gray-100 rounded px-1">_meta/defend-it.md</code>{" "}
        <code className="font-mono bg-white border border-gray-100 rounded px-1">_meta/verification.md</code>{" "}
        <code className="font-mono bg-white border border-gray-100 rounded px-1">solutions/&lt;slug&gt;/</code>
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  // discoverChallenges() is synchronous and safe to call in a Server Component.
  // It reads the filesystem using Node's built-in globSync — no network call.
  // The result is deterministic at build time — no dynamic data here.
  const challenges = discoverChallenges();
  const grouped = challengesByTier(challenges);

  // Total count for the hero stat — computed from the discovered set.
  const totalCount = challenges.length;

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section aria-labelledby="hero-heading">
        <div className="space-y-3 max-w-2xl">
          <h1
            id="hero-heading"
            className="text-3xl font-bold text-gray-900 leading-tight"
          >
            Nextmart — Next.js 16 Learning Curriculum
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            A hands-on, challenge-based curriculum for engineers who want to
            understand Next.js 16 deeply — not just use it. Each challenge
            teaches one concept by having you break it, build it, and defend it.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {/* Stat chips */}
            {[
              { label: `${totalCount} challenges`, classes: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
              { label: "6 tiers (0–5)", classes: "bg-gray-100 text-gray-600" },
              { label: "Next.js 16 · App Router", classes: "bg-gray-100 text-gray-600" },
              { label: "cacheComponents: true", classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
            ].map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${chip.classes}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Defend-It workflow explainer ── */}
      <DefendItSection />

      {/* ── Challenge index ── */}
      <section aria-labelledby="challenges-heading">
        <h2
          id="challenges-heading"
          className="text-sm font-semibold text-gray-700 mb-2"
        >
          Challenges
          <span className="ml-2 text-xs font-normal text-gray-400">
            — auto-discovered from{" "}
            <code className="font-mono bg-gray-100 rounded px-1">
              app/(challenges)/*/_meta/challenge.config.json
            </code>
            . No hand-maintained list.
          </span>
        </h2>

        {grouped.size === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {[...grouped.entries()].map(([tier, items]) => (
              <section key={tier} aria-labelledby={`tier-${tier}-heading`}>
                <div className="mb-3">
                  <h3
                    id={`tier-${tier}-heading`}
                    className="text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {TIER_LABELS[tier] ?? `Tier ${tier}`}
                    <span className="ml-2 text-gray-300 normal-case tracking-normal font-normal">
                      ({items.length} challenge{items.length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  {TIER_DESCRIPTIONS[tier] && (
                    <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                      {TIER_DESCRIPTIONS[tier]}
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((ch) => (
                    <ChallengeCard key={ch.config.slug} challenge={ch} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
