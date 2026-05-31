// ─── app/(challenges)/c10-invalidation/page.tsx ──────────────────────────────
//
// C10 — Cache Invalidation + Dynamic-Rendering Triggers + Footguns
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//
//   This page is a STATIC SHELL. Every dynamic read (reviews, cookies, headers,
//   searchParams, connection) is isolated in its own async Server Component
//   wrapped in <Suspense>. The shell prerenders; each hole streams in on demand.
//
//   NO `export const dynamic` directive — that is incompatible with cacheComponents.
//   You opt INTO caching with 'use cache', not out of it.
//
//   Key concepts taught here:
//   1. revalidateTag(tag, profile) — v16 two-argument form
//   2. revalidatePath(path) — coarser path-level invalidation
//   3. The stale-cache FOOTGUN: wrong cacheTag → revalidateTag misses → stale data
//   4. Dynamic triggers: cookies(), headers(), searchParams, connection()

import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheTag, cacheLife } from "next/cache";
import { listReviews, tags } from "@/lib/data";
import type { Review } from "@/lib/data";
import {
  cookieProbe,
  headerProbe,
  searchParamsProbe,
  connectionProbe,
} from "./_lib/dynamic-probes";
import { addReviewBuggy, addReviewFixed } from "./_lib/actions";

export const metadata: Metadata = {
  title: "C10 — Cache Invalidation, Dynamic Triggers & Footguns",
};

// ─── Cached data readers ──────────────────────────────────────────────────────

/**
 * CORRECT version — tagged with tags.reviews(productId).
 * When addReviewFixed fires, it calls revalidateTag(tags.reviews(id), "hours")
 * which matches THIS tag exactly, purging this cache entry.
 */
async function getCachedReviews(productId: string): Promise<Review[]> {
  "use cache";
  // tags.reviews("p-elec-001") === "reviews:p-elec-001"
  cacheTag(tags.reviews(productId));
  cacheLife("hours");
  return listReviews(productId);
}

/**
 * BUGGY version — tagged with tags.product(productId) (WRONG tag).
 * When addReviewBuggy fires, it calls revalidateTag(tags.reviews(id), "hours")
 * which does NOT match this tag ("product:p-elec-001" ≠ "reviews:p-elec-001").
 * Result: this cache entry is NEVER purged by the action → stale data served.
 */
async function getCachedReviewsBuggy(productId: string): Promise<Review[]> {
  "use cache";
  // BUG: wrong tag! "product:p-elec-001" is not what the action invalidates.
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return listReviews(productId);
}

const DEMO_PRODUCT_ID = "p-elec-001";
const DEMO_PRODUCT_NAME = "Wireless Noise-Cancelling Headphones";

// ─── Page (static shell) ──────────────────────────────────────────────────────

export default function C10Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-16">

      {/* Header */}
      <div>
        <p className="text-xs font-mono text-violet-500 mb-1">c10-invalidation</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Cache Invalidation, Dynamic Triggers &amp; Footguns
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Learn how <code className="font-mono text-xs bg-gray-100 rounded px-1">revalidateTag</code> and{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">revalidatePath</code> work,
          what forces a route into dynamic rendering, how <code className="font-mono text-xs bg-gray-100 rounded px-1">draftMode()</code> bypasses
          caching, and — most importantly — the stale-cache footgun that bites everyone.
        </p>
      </div>

      {/* ── SECTION 1: Invalidation (Fixed) ────────────────────────────────── */}
      <section className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
            CORRECT
          </span>
          <h2 className="font-semibold text-green-900">
            Reviews for {DEMO_PRODUCT_NAME}
          </h2>
        </div>
        <p className="text-xs text-green-800">
          Cached with <code className="font-mono bg-green-100 rounded px-1">cacheTag(tags.reviews(id))</code>.
          The Server Action calls <code className="font-mono bg-green-100 rounded px-1">revalidateTag(tags.reviews(id), &quot;hours&quot;)</code>
          — tags match, cache is purged, fresh data appears after submit.
        </p>

        <Suspense fallback={<ReviewListSkeleton />}>
          <ReviewList productId={DEMO_PRODUCT_ID} variant="fixed" />
        </Suspense>

        <AddReviewForm action={addReviewFixed} label="Add Review (fixed action)" />
      </section>

      {/* ── SECTION 2: The Footgun ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
            FOOTGUN
          </span>
          <h2 className="font-semibold text-red-900">
            Reviews — Buggy (stale-cache footgun)
          </h2>
        </div>
        <div className="text-xs text-red-800 space-y-1">
          <p>
            This list is cached with the <strong>wrong tag</strong>:{" "}
            <code className="font-mono bg-red-100 rounded px-1">cacheTag(tags.product(id))</code>{" "}
            (tag: <code className="font-mono bg-red-100 rounded px-1">&quot;product:p-elec-001&quot;</code>).
          </p>
          <p>
            The buggy action calls{" "}
            <code className="font-mono bg-red-100 rounded px-1">revalidateTag(tags.reviews(id), &quot;hours&quot;)</code>{" "}
            (tag: <code className="font-mono bg-red-100 rounded px-1">&quot;reviews:p-elec-001&quot;</code>).
          </p>
          <p className="font-semibold">
            These are different strings → the cache entry is NEVER purged →
            you see stale data until the TTL expires.
          </p>
          <p>
            Fix: change <code className="font-mono bg-red-100 rounded px-1">cacheTag(tags.product(id))</code>{" "}
            to <code className="font-mono bg-red-100 rounded px-1">cacheTag(tags.reviews(id))</code>.
          </p>
        </div>

        <Suspense fallback={<ReviewListSkeleton />}>
          <ReviewList productId={DEMO_PRODUCT_ID} variant="buggy" />
        </Suspense>

        <AddReviewForm action={addReviewBuggy} label="Add Review (buggy action — see stale result)" />
      </section>

      {/* ── SECTION 3: Dynamic Triggers ─────────────────────────────────────── */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
        <h2 className="font-semibold text-blue-900">Dynamic-Rendering Triggers</h2>
        <p className="text-xs text-blue-800">
          Each probe below reads a per-request value. Under{" "}
          <code className="font-mono bg-blue-100 rounded px-1">cacheComponents: true</code>, these
          must run inside a <code className="font-mono bg-blue-100 rounded px-1">&lt;Suspense&gt;</code>{" "}
          boundary (the static shell is prerendered; these holes stream in per request).
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">
              1. cookies() — reads the Cookie header (per-visitor, per-request)
            </p>
            <Suspense fallback={<ProbeSkeleton />}>
              <CookieProbeHole />
            </Suspense>
          </div>

          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">
              2. headers() — reads request headers (User-Agent, Accept-Language, etc.)
            </p>
            <Suspense fallback={<ProbeSkeleton />}>
              <HeaderProbeHole />
            </Suspense>
          </div>

          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">
              3. searchParams — try adding ?tab=reviews&amp;sort=new to the URL
            </p>
            <Suspense fallback={<ProbeSkeleton />}>
              <SearchParamsProbeHole searchParams={searchParams} />
            </Suspense>
          </div>

          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">
              4. connection() — forces dynamic even if no request data is read
            </p>
            <Suspense fallback={<ProbeSkeleton />}>
              <ConnectionProbeHole />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Draft Mode ────────────────────────────────────────────── */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
        <h2 className="font-semibold text-amber-900">Draft Mode Mini-Lab</h2>
        <p className="text-xs text-amber-800">
          See the separate page at{" "}
          <a href="/c10-invalidation/draft" className="underline font-mono text-xs">
            /c10-invalidation/draft
          </a>{" "}
          — it demonstrates enabling/disabling draft mode and shows how it
          bypasses <code className="font-mono bg-amber-100 rounded px-1">&apos;use cache&apos;</code>{" "}
          boundaries for editors previewing unpublished content.
        </p>
      </section>

      {/* ── Defend-It reminder ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium mb-1">Before reading the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            app/(challenges)/c10-invalidation/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">solutions/c10-invalidation/</code>.
        </p>
      </section>
    </div>
  );
}

// ─── Dynamic holes (each inside Suspense above) ───────────────────────────────

// NOTE: These are async Server Components that do the actual dynamic reads.
// They live as local functions here (not a separate file) to keep the pattern
// easy to read alongside the Suspense usage. A real app would split them into
// a _components/ directory.

async function ReviewList({
  productId,
  variant,
}: {
  productId: string;
  variant: "fixed" | "buggy";
}) {
  // Call the appropriate cached reader based on which variant we're rendering.
  const reviews =
    variant === "fixed"
      ? await getCachedReviews(productId)
      : await getCachedReviewsBuggy(productId);

  if (reviews.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic">
        No reviews yet — submit the form above to add one.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="rounded-md border border-gray-200 bg-white p-3 text-xs space-y-1"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{r.authorName}</span>
            <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            <span className="text-gray-400 font-mono">{r.createdAt.slice(0, 19).replace("T", " ")}</span>
          </div>
          <p className="text-gray-700">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}

async function CookieProbeHole() {
  const result = await cookieProbe();
  return (
    <p className="rounded-md bg-blue-100 px-3 py-2 text-xs font-mono text-blue-800">
      {result}
    </p>
  );
}

async function HeaderProbeHole() {
  const result = await headerProbe();
  return (
    <p className="rounded-md bg-blue-100 px-3 py-2 text-xs font-mono text-blue-800 break-all">
      {result}
    </p>
  );
}

async function SearchParamsProbeHole({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await searchParamsProbe(searchParams);
  return (
    <p className="rounded-md bg-blue-100 px-3 py-2 text-xs font-mono text-blue-800">
      {result}
    </p>
  );
}

async function ConnectionProbeHole() {
  const result = await connectionProbe();
  return (
    <p className="rounded-md bg-blue-100 px-3 py-2 text-xs font-mono text-blue-800">
      {result}
    </p>
  );
}

// ─── Review submission form ───────────────────────────────────────────────────
// The React <form> action prop expects (formData: FormData) => void | Promise<void>.
// Our Server Actions return { error?, success? } for programmatic use, so we
// cast the action to the void signature here. The return value is unused by the
// form itself; it would be consumed by useFormState/useActionState in a client
// component if needed.

function AddReviewForm({
  action,
  label,
}: {
  // Accept value-returning Server Actions — cast to void signature for the form prop.
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  label: string;
}) {
  // Cast: React <form> action is typed as void-returning, but a Server Action
  // that returns a value is valid at runtime — the form ignores the return value.
  // The double-cast (through unknown) is required by TypeScript strict mode when
  // the two types don't overlap structurally. The value would only be consumed
  // if the form were wrapped with useActionState().
  const voidAction = action as unknown as (formData: FormData) => Promise<void>;
  return (
    <form action={voidAction} className="space-y-2 pt-2 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <div className="flex gap-2 items-end flex-wrap">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Rating
          <select
            name="rating"
            defaultValue="5"
            className="rounded border border-gray-300 px-2 py-1 text-xs bg-white"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600 flex-1">
          Review
          <input
            type="text"
            name="body"
            required
            placeholder="Write a short review..."
            className="rounded border border-gray-300 px-2 py-1 text-xs min-w-0 w-full"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-gray-800 px-3 py-1 text-xs text-white hover:bg-gray-700 whitespace-nowrap"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ReviewListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 rounded-md bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}

function ProbeSkeleton() {
  return <div className="h-7 w-full rounded-md bg-blue-100 animate-pulse" />;
}
