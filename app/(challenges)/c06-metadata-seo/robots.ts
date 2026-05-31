// ─── app/(challenges)/c06-metadata-seo/robots.ts ─────────────────────────────
//
// DOCUMENTED EXAMPLE — THIS IS NOT THE REAL APP ROBOTS FILE.
//
// ⚠  IMPORTANT SCOPING NOTE:
//   In a production Next.js app, robots.ts MUST live at:
//     app/robots.ts   → served at https://example.com/robots.txt
//
//   Placing it here (inside a route group segment) does NOT produce
//   /robots.txt.  It produces a robots response at the segment path.
//   Crawlers always look for /robots.txt at the domain root, so a
//   segment-scoped robots.ts is invisible to them.
//
//   In this repo the root app/ directory is owned by the shell/capstone.
//   This file is a teaching example.  The capstone copies/adapts this
//   into app/robots.ts.
//
// HOW IT WORKS:
//   Next.js calls the default-exported function, receives the object, and
//   serialises it into the text/plain robots.txt format automatically.
//   You do not write the text file — just return MetadataRoute.Robots.
//
// SEE ALSO:
//   solutions/c06-metadata-seo/NOTES.md

import type { MetadataRoute } from "next";

const SITE_URL = "https://nextmart.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default rule: allow all public content ──────────────────────────
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Disallow admin and private paths.  Even though they require auth,
          // explicit disallow prevents crawlers from hitting them at all and
          // leaking URL structure in Google Search Console.
          "/admin",
          "/admin/",
          // Disallow internal API routes that aren't useful to index.
          "/api/",
          // Disallow cart / checkout — no SEO value, personal data risk.
          "/cart",
          "/checkout",
          // Disallow user-specific pages.
          "/account",
          "/orders",
        ],
      },

      // ── AI scraper rule: disallow training data collection ──────────────
      // This is a convention adopted by many sites to opt out of AI model
      // training.  Not enforced technically (honoured only by compliant bots).
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ClaudeBot",
        disallow: "/",
      },
    ],

    // Sitemap location helps Google discover all pages.
    // Must be the absolute URL of the real sitemap.
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
