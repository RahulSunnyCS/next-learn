// ─── solutions/c10-invalidation/page.tsx ──────────────────────────────────────
//
// Reference solution for C10: Cache Invalidation, Dynamic Triggers & Footguns.
//
// This file is the canonical correct implementation. Read it AFTER filling in
// your defend-it.md worksheet.
//
// Key decisions and why:
//
// 1. getCachedReviews uses cacheTag(tags.reviews(productId))
//    → tag must EXACTLY match what addReview passes to revalidateTag().
//    A mismatch is the stale-cache footgun. See NOTES.md for the full story.
//
// 2. revalidateTag(tag, "hours") — two arguments required in v16.
//    The one-argument form is a TypeScript compile error. The profile ("hours")
//    tells the cache scheduler how to re-schedule background revalidation after
//    the purge.
//
// 3. Dynamic probes wrapped in individual <Suspense> boundaries.
//    Each probe triggers per-request dynamic rendering. Under cacheComponents,
//    they must be inside Suspense or the build fails.
//
// 4. No `export const dynamic` directive anywhere.
//    Incompatible with cacheComponents. Dynamic is the default; opt INTO cache
//    with 'use cache'.

import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheTag, cacheLife } from "next/cache";
import { listReviews, tags } from "@/lib/data";
import type { Review } from "@/lib/data";
import { cookieProbe, headerProbe, searchParamsProbe, connectionProbe } from "../../app/(challenges)/c10-invalidation/_lib/dynamic-probes";
import { addReviewBuggy, addReviewFixed } from "../../app/(challenges)/c10-invalidation/_lib/actions";

export const metadata: Metadata = {
  title: "C10 Solution — Cache Invalidation, Dynamic Triggers & Footguns",
};

const DEMO_PRODUCT_ID = "p-elec-001";

// ─── Cached reads (the correct one and the buggy one for comparison) ──────────

async function getCachedReviews(productId: string): Promise<Review[]> {
  "use cache";
  // CORRECT: tag matches revalidateTag call in the fixed action.
  cacheTag(tags.reviews(productId)); // "reviews:p-elec-001"
  cacheLife("hours");
  return listReviews(productId);
}

async function getCachedReviewsBuggy(productId: string): Promise<Review[]> {
  "use cache";
  // FOOTGUN: wrong tag. The action invalidates "reviews:p-elec-001" but this
  // entry is tagged "product:p-elec-001" — they never match.
  cacheTag(tags.product(productId)); // "product:p-elec-001" ← WRONG
  cacheLife("hours");
  return listReviews(productId);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function C10SolutionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-16">
      <div>
        <p className="text-xs font-mono text-violet-500 mb-1">solutions / c10-invalidation</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Reference Solution — C10
        </h1>
        <p className="text-gray-600 text-sm">
          Read <code className="font-mono text-xs bg-gray-100 rounded px-1">NOTES.md</code> and{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">cache-flow.md</code>{" "}
          in this directory for full explanation.
        </p>
      </div>

      {/* Correct invalidation */}
      <section className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
            CORRECT
          </span>
          <h2 className="font-semibold text-green-900">Correctly invalidated reviews</h2>
        </div>
        <p className="text-xs text-green-800">
          <code className="font-mono bg-green-100 rounded px-1">cacheTag(tags.reviews(id))</code>{" "}
          matches{" "}
          <code className="font-mono bg-green-100 rounded px-1">revalidateTag(tags.reviews(id), &quot;hours&quot;)</code>.
        </p>
        <Suspense fallback={<ReviewListSkeleton />}>
          <ReviewListHole productId={DEMO_PRODUCT_ID} variant="fixed" />
        </Suspense>
        <AddReviewForm action={addReviewFixed} label="Add Review (correct action)" />
      </section>

      {/* Footgun */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
            FOOTGUN
          </span>
          <h2 className="font-semibold text-red-900">Wrong-tag stale-cache demo</h2>
        </div>
        <p className="text-xs text-red-800">
          <code className="font-mono bg-red-100 rounded px-1">cacheTag(tags.product(id))</code>{" "}
          does NOT match{" "}
          <code className="font-mono bg-red-100 rounded px-1">revalidateTag(tags.reviews(id), &quot;hours&quot;)</code>.
          Cache entry survives the action → stale data.
        </p>
        <Suspense fallback={<ReviewListSkeleton />}>
          <ReviewListHole productId={DEMO_PRODUCT_ID} variant="buggy" />
        </Suspense>
        <AddReviewForm action={addReviewBuggy} label="Add Review (buggy action)" />
      </section>

      {/* Dynamic triggers */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
        <h2 className="font-semibold text-blue-900">Dynamic Triggers</h2>
        <div className="space-y-3 text-xs">
          <Suspense fallback={<ProbeSkeleton />}>
            <ProbeRow label="cookies()" probePromise={cookieProbe()} />
          </Suspense>
          <Suspense fallback={<ProbeSkeleton />}>
            <ProbeRow label="headers()" probePromise={headerProbe()} />
          </Suspense>
          <Suspense fallback={<ProbeSkeleton />}>
            <SearchParamsProbeRow searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={<ProbeSkeleton />}>
            <ProbeRow label="connection()" probePromise={connectionProbe()} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

// ─── Hole components ──────────────────────────────────────────────────────────

async function ReviewListHole({
  productId,
  variant,
}: {
  productId: string;
  variant: "fixed" | "buggy";
}) {
  const reviews =
    variant === "fixed"
      ? await getCachedReviews(productId)
      : await getCachedReviewsBuggy(productId);

  if (!reviews.length) {
    return <p className="text-xs text-gray-400 italic">No reviews yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {reviews.map((r) => (
        <li key={r.id} className="rounded border border-gray-200 bg-white px-3 py-2 text-xs">
          <span className="font-medium">{r.authorName}</span>{" "}
          <span className="text-amber-500">{"★".repeat(r.rating)}</span>{" "}
          — {r.body}
        </li>
      ))}
    </ul>
  );
}

async function ProbeRow({
  label,
  probePromise,
}: {
  label: string;
  probePromise: Promise<string>;
}) {
  const result = await probePromise;
  return (
    <div className="rounded bg-blue-100 px-3 py-2">
      <span className="font-semibold text-blue-700">{label}: </span>
      <span className="font-mono text-blue-800 break-all">{result}</span>
    </div>
  );
}

async function SearchParamsProbeRow({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await searchParamsProbe(searchParams);
  return (
    <div className="rounded bg-blue-100 px-3 py-2">
      <span className="font-semibold text-blue-700">searchParams: </span>
      <span className="font-mono text-blue-800">{result}</span>
    </div>
  );
}

function AddReviewForm({
  action,
  label,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  label: string;
}) {
  // Cast to void-returning signature — React <form> action expects void | Promise<void>.
  // Double-cast through unknown required by TypeScript strict mode when types don't overlap.
  // The return value is ignored by the form; it would only matter with useActionState().
  const voidAction = action as unknown as (formData: FormData) => Promise<void>;
  return (
    <form action={voidAction} className="flex gap-2 flex-wrap items-end border-t border-gray-200 pt-3">
      <p className="w-full text-xs font-semibold text-gray-600">{label}</p>
      <select name="rating" defaultValue="5" className="rounded border border-gray-300 px-2 py-1 text-xs bg-white">
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>
        ))}
      </select>
      <input
        type="text"
        name="body"
        required
        placeholder="Write a short review..."
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs min-w-0"
      />
      <button type="submit" className="rounded bg-gray-800 px-3 py-1 text-xs text-white hover:bg-gray-700">
        Submit
      </button>
    </form>
  );
}

function ReviewListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-8 rounded bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}

function ProbeSkeleton() {
  return <div className="h-7 rounded bg-blue-100 animate-pulse" />;
}
