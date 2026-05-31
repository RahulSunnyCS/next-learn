// ─── app/(challenges)/c10-invalidation/draft/page.tsx ────────────────────────
//
// Draft Mode Mini-Lab — C10
//
// draftMode() makes the page fully dynamic (ƒ in the build route table)
// because it reads a per-request cookie to determine if draft is active.
// Under cacheComponents: true, calling draftMode() inside a page component
// opts the entire route into dynamic rendering — the same constraint as
// cookies() or headers().
//
// WHAT DRAFT MODE DOES TO CACHING
// ────────────────────────────────
// When draftMode().isEnabled === true:
//   - 'use cache' boundaries for this request are bypassed.
//   - The full route cache is skipped.
//   - Every data fetch runs fresh, so editors see the latest unpublished content.
//
// When draftMode().isEnabled === false (normal):
//   - Caching works normally — 'use cache' functions return cached data.
//   - The page may be served from the full-route cache if all dynamic holes
//     have resolved.
//
// USE CASE
// ────────
// CMS preview flows. A headless CMS (Contentful, Sanity, etc.) typically
// sends the editor to a preview URL like /api/draft?secret=TOKEN&slug=/about.
// The route handler validates the token, calls draftMode().enable(), and
// redirects to /about. From that point, the editor sees fresh unpublished
// content. Clicking "exit preview" calls draftMode().disable().
//
// NOTE: draftMode() requires await in Next.js 16.

import { Suspense } from "react";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { enableDraftMode, disableDraftMode } from "../_lib/actions";
import { listReviews } from "@/lib/data";
import { cacheTag, cacheLife } from "next/cache";
import { tags } from "@/lib/data";

export const metadata: Metadata = {
  title: "C10 — Draft Mode Mini-Lab",
};

// ─── A cached read — to show it is bypassed in draft mode ────────────────────

async function getCachedReviewsForDraft(productId: string) {
  "use cache";
  cacheTag(tags.reviews(productId));
  cacheLife("hours");
  return listReviews(productId);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// This page reads draftMode() at the top level (inside Suspense) — that makes
// the entire route dynamic (ƒ).

export default function DraftPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      <div>
        <p className="text-xs font-mono text-violet-500 mb-1">c10-invalidation / draft</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Draft Mode Mini-Lab
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Toggle draft mode to see how it bypasses{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">&apos;use cache&apos;</code>{" "}
          boundaries, making every data read fresh for the duration of the request.
        </p>
      </div>

      {/* Wrap the draft-mode-dependent UI in Suspense so the static shell above
          can prerender while the dynamic hole resolves. */}
      <Suspense fallback={<DraftStatusSkeleton />}>
        <DraftStatusPanel />
      </Suspense>

      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">How draft mode affects caching</h2>
        <dl className="text-sm space-y-3">
          <div>
            <dt className="font-medium text-gray-700">
              <code className="font-mono text-xs bg-gray-100 rounded px-1">isEnabled === false</code>
              {" "}(normal mode)
            </dt>
            <dd className="text-gray-600 mt-1">
              The{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">&apos;use cache&apos;</code>{" "}
              function runs on the first request and stores the result. Subsequent requests get the
              cached result until the TTL expires or a revalidateTag/revalidatePath call purges it.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">
              <code className="font-mono text-xs bg-gray-100 rounded px-1">isEnabled === true</code>
              {" "}(draft mode)
            </dt>
            <dd className="text-gray-600 mt-1">
              Next.js detects the draft-mode cookie and bypasses{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">&apos;use cache&apos;</code>{" "}
              for this request. The data function runs fresh every time, so editors see the latest
              unpublished content without waiting for a cache invalidation.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Typical production flow</dt>
            <dd className="text-gray-600 mt-1">
              1. Editor clicks &quot;Preview&quot; in the CMS. <br />
              2. CMS calls <code className="font-mono text-xs bg-gray-100 rounded px-1">/api/preview?secret=TOKEN&slug=/about</code>. <br />
              3. Route handler validates the token, calls{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">draftMode().enable()</code>,
              and redirects to <code className="font-mono text-xs bg-gray-100 rounded px-1">/about</code>. <br />
              4. <code className="font-mono text-xs bg-gray-100 rounded px-1">/about</code> detects draft mode, fetches unpublished content, renders it. <br />
              5. Editor approves, publishes. CMS calls{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">/api/preview/exit</code>{" "}
              which calls <code className="font-mono text-xs bg-gray-100 rounded px-1">draftMode().disable()</code>.
            </dd>
          </div>
        </dl>
      </section>

      <a
        href="/c10-invalidation"
        className="inline-block text-xs text-violet-600 underline hover:text-violet-800"
      >
        ← Back to C10 main challenge
      </a>
    </div>
  );
}

// ─── Dynamic hole: reads draftMode and shows reviews ─────────────────────────

async function DraftStatusPanel() {
  // draftMode() is async in Next.js 16 — must be awaited.
  const draft = await draftMode();

  // With draft enabled, the getCachedReviewsForDraft call below will run fresh
  // (bypassing the 'use cache' boundary) — so you'll always get the latest data.
  // With draft disabled, the cached version is served.
  const reviews = await getCachedReviewsForDraft("p-elec-001");

  return (
    <div className="space-y-4">
      {/* Draft status banner */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 ${
          draft.isEnabled
            ? "border-amber-200 bg-amber-50"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex-1">
          <p className="font-semibold text-sm">
            Draft mode is currently:{" "}
            <span
              className={
                draft.isEnabled ? "text-amber-700" : "text-gray-500"
              }
            >
              {draft.isEnabled ? "ENABLED (cache bypassed)" : "DISABLED (cache active)"}
            </span>
          </p>
          {draft.isEnabled && (
            <p className="text-xs text-amber-700 mt-1">
              The review list below is rendered fresh every request — &apos;use cache&apos; is bypassed.
              Every CMS editor visiting this page sees the latest unpublished data.
            </p>
          )}
          {!draft.isEnabled && (
            <p className="text-xs text-gray-500 mt-1">
              The review list below is served from the cache (if it exists).
              Enable draft mode to bypass caching.
            </p>
          )}
        </div>
      </div>

      {/* Toggle buttons (Server Action forms) */}
      <div className="flex gap-3">
        <form action={enableDraftMode}>
          <button
            type="submit"
            disabled={draft.isEnabled}
            className="rounded bg-amber-600 px-4 py-2 text-xs text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enable Draft Mode
          </button>
        </form>
        <form action={disableDraftMode}>
          <button
            type="submit"
            disabled={!draft.isEnabled}
            className="rounded bg-gray-600 px-4 py-2 text-xs text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Disable Draft Mode
          </button>
        </form>
      </div>

      {/* Review list — demonstrates fresh vs cached rendering */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-600">
          Reviews (p-elec-001) — {draft.isEnabled ? "FRESH (draft bypassed cache)" : "from cache (or fresh on miss)"}:
        </p>
        {reviews.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No reviews yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="text-xs text-gray-700 border-b border-gray-100 pb-1">
                <span className="font-medium">{r.authorName}</span>{" "}
                <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                {" — "}{r.body}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DraftStatusSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
      <div className="flex gap-3">
        <div className="h-8 w-32 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-32 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
    </div>
  );
}
