// ─── app/sitemap.ts ───────────────────────────────────────────────────────
//
// THE REAL app-root sitemap — served at /sitemap.xml.
//
// This must live at app/sitemap.ts (not inside a route segment) so that
// Next.js generates it at the domain root (https://example.com/sitemap.xml).
// A sitemap.ts inside a route group would generate the XML at the segment's
// path instead, which search engines would never find.
//
// The challenge routes are enumerated via the registry (lib/registry.ts),
// so this file stays in sync automatically as new challenges are added —
// no hand-maintained list.
//
// Design: the SITE_URL is read from NEXT_PUBLIC_SITE_URL if set (production),
// falling back to a placeholder so the build does not fail in development
// or CI where the env var is not present.

import type { MetadataRoute } from "next";
import { discoverChallenges } from "@/lib/registry";

// Use the public site URL env var in production; fall back to the dev URL.
// NEXT_PUBLIC_ prefix is intentional: this value is also used in OG tags
// and meta tags on the client side and must not be a secret.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextmart.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Discover all challenges from the registry at build time.
  // discoverChallenges() uses fs.globSync — a synchronous filesystem read
  // that is safe to call in a Server Component or special file at build time.
  const challenges = discoverChallenges();

  // ── Static routes ───────────────────────────────────────────────────────
  // The root challenge index is the highest-priority page. It changes on
  // every build (when challenges are added), so changeFrequency is "weekly".
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // ── Challenge routes ────────────────────────────────────────────────────
  // Each challenge is a learner-facing content page. They change rarely
  // (only when the curriculum is updated), so changeFrequency is "monthly".
  const challengeRoutes: MetadataRoute.Sitemap = challenges.map((ch) => ({
    // routePath is e.g. "/(challenges)/c01-auth".
    // The (challenges) route group is transparent to the URL — the actual
    // URL is just /c01-auth.
    url: `${SITE_URL}${ch.routePath.replace("/(challenges)", "")}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...challengeRoutes];
}
