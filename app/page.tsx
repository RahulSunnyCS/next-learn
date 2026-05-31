// This is an async Server Component (the default in Next.js App Router).
// It calls discoverChallenges() at render/build time and renders the index.
// No hand-maintained nav list exists here — everything comes from the registry.

import { discoverChallenges, challengesByTier } from "@/lib/registry";
import type { DiscoveredChallenge } from "@/lib/registry";

// ─── Tier meta (display names only — not routing data) ───────────────────
const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 — Rendering & Components",
  2: "Tier 2 — Data, Caching & Actions",
  3: "Tier 3 — Client Data & State",
  4: "Tier 4 — Deployment, Testing & OAuth",
  5: "Tier 5 — Capstone",
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
  const { config, routePath } = challenge;
  const badge = STATUS_BADGE[config.status] ?? STATUS_BADGE["not-started"];

  return (
    <a
      href={routePath}
      className="block rounded-lg border border-gray-200 p-4 hover:border-indigo-400 hover:shadow-sm transition-all no-underline bg-white"
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
    // This is the expected view at T-00 time.  The first real challenge
    // (C02) arrives in T-03.
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
      <p className="text-2xl mb-3">🏗️</p>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        No challenges yet
      </h2>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">
        Challenge directories are added by their own task (starting with T-03).
        Once a challenge folder contains{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          _meta/challenge.config.ts
        </code>
        , it will appear here automatically.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  // discoverChallenges() is synchronous and safe to call in a Server Component.
  // It reads the filesystem using Node's built-in globSync — no network call.
  const challenges = discoverChallenges();
  const grouped = challengesByTier(challenges);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Challenge Index
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Auto-discovered from{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          app/(challenges)/*/_meta/challenge.config.ts
        </code>
        . No hand-maintained list.
      </p>

      {grouped.size === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-10">
          {[...grouped.entries()].map(([tier, items]) => (
            <section key={tier}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {TIER_LABELS[tier] ?? `Tier ${tier}`}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((ch) => (
                  <ChallengeCard key={ch.config.slug} challenge={ch} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
