// Registry: auto-discovers challenges by reading challenge.config.json files
// under app/(challenges)/.
//
// Architecture decision — JSON instead of TS dynamic require:
//   Turbopack (Next.js 16's default bundler) cannot handle dynamic require()
//   calls with variable paths at build time ("server relative imports are not
//   implemented yet").  Using fs.readFileSync + JSON.parse avoids any module
//   system involvement — it is a plain filesystem read that works in any Node
//   server environment.
//
//   Each challenge provides two colocated files:
//     _meta/challenge.config.json  — runtime data (read by this registry)
//     _meta/challenge.config.ts    — typed TypeScript module (imports the JSON,
//                                    used by challenge code that needs typing)
//
//   The JSON is the single source of truth.  The TS file re-exports it with
//   type assertions for IDE support and import convenience.
//
// Design decision — why fs.globSync instead of a glob npm package:
//   Node 22 ships globSync in node:fs, so no extra dependency is needed.
//
// Design decision — underscore exclusion:
//   Next.js App Router treats folders starting with _ as non-routable.  The
//   glob pattern `[^_]*` at the slug position excludes _template and any
//   other private dirs.

import path from "node:path";
import fs, { globSync } from "node:fs";

// --------------------------------------------------------------------------
// Types (shared — also imported by challenge.config.ts files)
// --------------------------------------------------------------------------

export type ChallengeTier = 0 | 1 | 2 | 3 | 4 | 5;
export type ChallengeStatus = "not-started" | "in-progress" | "complete";

export interface ChallengeConfig {
  /**
   * CURRICULUM SEQUENCE NUMBER (1–25) used for sort order and cross-references.
   *
   * IMPORTANT: id is NOT necessarily equal to the numeric portion of the cNN
   * directory prefix.  Two structural exceptions apply:
   *   - `lab-optimizations` has no cNN prefix but occupies id 7, which shifts
   *     every subsequent directory prefix by one relative to its id
   *     (c07-data-fetching → id 8, c08-use-cache → id 9, etc.).
   *   - There is intentionally no c22 directory (the sequence skips from c21
   *     to c23).
   *
   * Use this field for ordering logic.  Use `slug` for human-readable labels.
   */
  id: number;
  /** URL-safe slug used in the route, e.g. "c02-catalog". */
  slug: string;
  /** Human-readable title. */
  title: string;
  /** Tier 0–5 (0 = foundation) as defined by the curriculum / BUILD-ORDER. */
  tier: ChallengeTier;
  /** Concept tags, e.g. ["SSG", "ISR", "caching"]. */
  topics: string[];
  /** Learner-controlled progress state. */
  status: ChallengeStatus;
}

export interface DiscoveredChallenge {
  /** The route path relative to the App Router root, e.g. "/(challenges)/c02-catalog". */
  routePath: string;
  /**
   * The public URL the route is actually served at, e.g. "/c02-catalog".
   *
   * The (challenges) route group is transparent to the URL — Next.js strips
   * any parenthesised segment from the path. This `href` is the route-group-
   * stripped form and is the ONLY value that should be used in a Link/anchor
   * or sitemap entry. Linking to `routePath` directly produces a 404.
   */
  href: string;
  config: ChallengeConfig;
}

// --------------------------------------------------------------------------
// Discovery
// --------------------------------------------------------------------------

/**
 * Discovers all real challenges by globbing for challenge.config.json files
 * under app/(challenges)/.  Underscore-prefixed directories (like _template)
 * are excluded because they are private/non-routable by convention.
 *
 * This function reads the filesystem synchronously using fs.readFileSync +
 * JSON.parse — no dynamic require() — so it works correctly with Turbopack.
 *
 * Call site: invoked at render/build time from a Next.js Server Component.
 * The sync cost is acceptable (Node build pass, not a hot request handler).
 *
 * @remarks build-time-only
 * This function uses `fs.globSync` and `fs.readFileSync` — Node.js filesystem
 * APIs.  It MUST NOT be called from:
 *   - Route Handlers (they may run at the Edge or in a read-only filesystem)
 *   - Server Actions (same constraints as Route Handlers)
 *   - Any dynamic hole that executes per-request in production
 * Only call this from a Server Component that renders at BUILD TIME (○ Static
 * or the static shell of a ◐ PPR page).  The homepage (app/page.tsx) is the
 * only authorised call site in this repo.
 *
 * If you add a new call site, verify the route type in `npm run build` output:
 * it must show ○ (Static) or ◐ (PPR shell), never ƒ (Dynamic) for this call.
 */
export function discoverChallenges(repoRoot?: string): DiscoveredChallenge[] {
  // Default to process.cwd() which Next.js sets to the project root.
  const root = repoRoot ?? process.cwd();

  // Glob pattern: one path segment after (challenges)/ that starts with a
  // non-underscore character, followed by /_meta/challenge.config.json.
  // Using .json so the registry does a plain file read, not a module import.
  const pattern = "app/(challenges)/[^_]*/_meta/challenge.config.json";

  // cwd option makes glob results relative to the project root.
  // The /* turbopackIgnore: true */ annotation asks Turbopack's file tracer
  // (NFT) to treat the following expression as intentionally dynamic so it
  // does not emit the "Encountered unexpected file in NFT list" build warning.
  // This globSync is intentional and build-time-only; the warning is a false
  // positive when called from a static (○) Server Component.
  const matches = /* turbopackIgnore: true */ globSync(pattern, { cwd: root });

  const challenges: DiscoveredChallenge[] = [];

  for (const match of matches) {
    // match is e.g. "app/(challenges)/c02-catalog/_meta/challenge.config.json"
    const slugSegment = match.split("/")[2]; // "c02-catalog"
    const configPath = path.join(root, match);

    let config: ChallengeConfig;
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(raw) as ChallengeConfig;
    } catch {
      // Skip malformed configs without crashing the entire index page.
      console.warn(`[registry] Could not load config from ${configPath}`);
      continue;
    }

    challenges.push({
      routePath: `/(challenges)/${slugSegment}`,
      // Public URL: the (challenges) route group is transparent, so the slug
      // segment alone is what Next.js actually serves.
      href: `/${slugSegment}`,
      config,
    });
  }

  // Sort by id so the index is deterministic regardless of filesystem order.
  challenges.sort((a, b) => a.config.id - b.config.id);

  return challenges;
}

/**
 * Returns challenges grouped by tier (1–5), in tier order.
 * Tiers with no challenges are omitted from the result.
 */
export function challengesByTier(
  challenges: DiscoveredChallenge[]
): Map<ChallengeTier, DiscoveredChallenge[]> {
  const map = new Map<ChallengeTier, DiscoveredChallenge[]>();
  for (const ch of challenges) {
    const tier = ch.config.tier;
    if (!map.has(tier)) map.set(tier, []);
    map.get(tier)!.push(ch);
  }
  // Return sorted by tier number.
  return new Map([...map.entries()].sort(([a], [b]) => a - b));
}
