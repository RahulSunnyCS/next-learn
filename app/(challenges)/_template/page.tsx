// ─── Challenge Page Template ─────────────────────────────────────────────
//
// Copy this file to app/(challenges)/cNN-slug/page.tsx and implement the
// challenge here.  Delete this comment block once you have real content.
//
// Route convention:
//   app/(challenges)/cNN-slug/page.tsx  →  renders at /challenges/cNN-slug
//   (the route group "(challenges)" is invisible in the URL)
//
// Private sub-folders in this directory:
//   _meta/      — spec, defend-it worksheet, verification checklist, config
//   _components/ — local UI components (non-routable, challenge-scoped)
//   _lib/        — local data helpers or utilities (non-routable)
//   _tests/      — unit/integration tests (non-routable)
//
// These underscore folders are private by Next.js App Router convention
// (not included in the file-system router) even though they sit inside a
// routable directory.  See HARNESS.md for the full convention.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Template Challenge", // REPLACE with your challenge title
};

// RENDERING STRATEGY NOTE:
//   Add your rendering strategy here.  Example:
//
//   // Static generation with 5-minute revalidation (ISR):
//   export const revalidate = 300;
//
//   // Opt into dynamic rendering:
//   export const dynamic = "force-dynamic";
//
//   // Enable PPR for this route (requires cacheComponents: true in next.config.ts):
//   export const experimental_ppr = true;

export default function ChallengePage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        c00-template — replace with your challenge
      </h1>
      <p className="text-gray-600">
        Implement the challenge here.  See{" "}
        <code className="font-mono text-sm bg-gray-100 rounded px-1">
          _meta/spec.md
        </code>{" "}
        for the task description.
      </p>
    </div>
  );
}
