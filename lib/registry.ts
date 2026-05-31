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

export type ChallengeTier = 1 | 2 | 3 | 4 | 5;
export type ChallengeStatus = "not-started" | "in-progress" | "complete";

export interface ChallengeConfig {
  /** Numeric id matching the cNN prefix, e.g. 2 for c02-catalog. */
  id: number;
  /** URL-safe slug used in the route, e.g. "c02-catalog". */
  slug: string;
  /** Human-readable title. */
  title: string;
  /** Tier 1–5 as defined by BUILD-ORDER. */
  tier: ChallengeTier;
  /** Concept tags, e.g. ["SSG", "ISR", "caching"]. */
  topics: string[];
  /** Learner-controlled progress state. */
  status: ChallengeStatus;
}

export interface DiscoveredChallenge {
  /** The route path relative to the App Router root, e.g. "/(challenges)/c02-catalog". */
  routePath: string;
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
 */
export function discoverChallenges(repoRoot?: string): DiscoveredChallenge[] {
  // Default to process.cwd() which Next.js sets to the project root.
  const root = repoRoot ?? process.cwd();

  // Glob pattern: one path segment after (challenges)/ that starts with a
  // non-underscore character, followed by /_meta/challenge.config.json.
  // Using .json so the registry does a plain file read, not a module import.
  const pattern = "app/(challenges)/[^_]*/_meta/challenge.config.json";

  // cwd option makes glob results relative to the project root.
  const matches = globSync(pattern, { cwd: root });

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
