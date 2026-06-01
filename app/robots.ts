// ─── app/robots.ts ────────────────────────────────────────────────────────
//
// THE REAL app-root robots file — served at /robots.txt.
//
// This must live at app/robots.ts so that Next.js generates the file at
// /robots.txt. A robots.ts inside a route segment would generate a response
// at that segment's URL instead — crawlers would never find it.
//
// Design decisions:
//   - Allow all public challenge routes — they are the content of this
//     learning site and should be indexable.
//   - Disallow auth callback and API routes — no SEO value, and some contain
//     ephemeral state (e.g. the Auth.js callback URL) that should not be
//     indexed.
//   - Opt out of AI training scrapers by convention (GPTBot, ClaudeBot).
//     This is not technically enforced but is honoured by compliant crawlers.
//   - The sitemap pointer uses NEXT_PUBLIC_SITE_URL so it matches the
//     actual deployment URL in production.

import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextmart.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default rule: allow all learner-facing content ─────────────────
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Auth callback routes — ephemeral OAuth state, no SEO value.
          "/api/auth/",
          // Internal API endpoints — machine-to-machine, not page content.
          "/api/",
          // Challenge-specific login/logout actions (not page content).
          "/c01-auth/login",
          "/c01-auth/logout",
        ],
      },

      // ── AI scraper opt-out (convention, not technical enforcement) ─────
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ClaudeBot",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
    ],

    // Absolute URL of the sitemap so crawlers can find all challenge pages.
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
