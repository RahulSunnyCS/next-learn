// ─── app/(challenges)/c18-optimistic-ui/page.tsx ────────────────────────
//
// C18 — Optimistic UI challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   Static shell + <Suspense>-wrapped dynamic hole.  The page prerenders
//   immediately while the hole streams in.  Dynamic reads (getSession,
//   listReviews, getHelpfulCounts) happen inside the hole only.
//
// TEACHING FOCUS:
//   The graded part is the FAILURE PATH of useOptimistic.  The page passes
//   server-authoritative helpfulCounts to ReviewLikes.  ReviewLikes uses
//   useOptimistic per row to show instant updates.  The Server Action forces
//   a failure on every 3rd call — triggering rollback and demonstrating that
//   useOptimistic never permanently diverges from serverHelpfulCount.
//
// NO route-segment config exports (dynamic, revalidate, etc.) — these are
// incompatible with cacheComponents and fail the build.

import { Suspense } from "react";
import { cacheTag, cacheLife } from "next/cache";
import { listReviews, getProductById, tags } from "@/lib/data";
import type { Metadata } from "next";
import ReviewLikes from "./_components/ReviewLikes";
import { getHelpfulCounts } from "./_lib/actions";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "C18 — Optimistic UI",
};

// Fixed product — same as C11 so reviews are populated from seed data.
const DEMO_PRODUCT_ID = "p-elec-001";

// ---------------------------------------------------------------------------
// Page (static shell)
// ---------------------------------------------------------------------------

export default function C18OptimisticUIPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c18-optimistic-ui
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Optimistic UI: Instant Updates with Graceful Rollback
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Learn how <code className="font-mono text-xs bg-gray-100 rounded px-1">useOptimistic</code>{" "}
          shows an immediate speculative update before the server responds —
          and how it automatically rolls back when the server rejects the
          mutation.  The graded focus is the failure path, not the happy path.
        </p>
      </div>

      {/* ── STATIC SHELL: concept explainer ── */}
      <ConceptExplainer />

      {/* ── DYNAMIC HOLE: reviews with optimistic like buttons ── */}
      {/*
        Everything inside this Suspense reads from lib/data (non-deterministic
        Math.random() latency — must be inside Suspense per cacheComponents rules).
        getSession() inside ReviewsPanel also reads cookies() — a dynamic signal
        that requires a Suspense boundary.
      */}
      <Suspense fallback={<ReviewsPanelSkeleton />}>
        <ReviewsPanel productId={DEMO_PRODUCT_ID} />
      </Suspense>

      {/* ── STATIC SHELL: rollback explainer ── */}
      <RollbackExplainer />

      {/* ── STATIC SHELL: reconciliation explainer ── */}
      <ReconciliationExplainer />

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c18-optimistic-ui/_meta/defend-it.md
          </code>{" "}
          with your answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c18-optimistic-ui/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DYNAMIC HOLE — ReviewsPanel
// ---------------------------------------------------------------------------
// Reads reviews and helpful counts inside Suspense so cacheComponents is
// satisfied.  Passes server-authoritative data to ReviewLikes (Client
// Component).

async function ReviewsPanel({ productId }: { productId: string }) {
  // connection() marks this component as dynamic — required before any
  // non-deterministic call (lib/data uses Math.random() for simulated latency).
  // This satisfies the cacheComponents rule: "await a dynamic signal BEFORE
  // any synchronous non-deterministic call."
  await connection();

  // Product info — cached for the lifetime of the dev session.
  const product = await getCachedProduct(productId);

  // Reviews — cached with a revalidatable tag.  The Server Action calls
  // revalidateTag(tags.reviews(productId)) on success, which purges this entry
  // and causes this component to re-fetch on the next render.
  const reviews = await getCachedReviews(productId);

  // Helpful counts live in an in-process Map (see _lib/actions.ts).
  // We read them here (server-side) so the initial counts passed to the
  // client are authoritative — no stale client-side state on first render.
  const helpfulCounts = await getHelpfulCounts(reviews.map((r) => r.id));

  if (!product) {
    return (
      <p className="text-red-600 text-sm">
        Demo product not found. Check that seed data is loaded.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-mono text-gray-400 mb-1">{product.id}</p>
        <h2 className="font-semibold text-gray-900 text-lg">{product.name}</h2>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.description}
        </p>
        <p className="text-indigo-600 font-bold mt-2">
          ${(product.priceCents / 100).toFixed(2)}
        </p>
      </section>

      {/* Reviews with optimistic Helpful buttons */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Reviews ({reviews.length})
          </h2>
          <span className="text-xs text-gray-400 italic">
            Every 3rd &ldquo;Helpful&rdquo; click fails — watch the rollback
          </span>
        </div>

        {/*
          ReviewLikes is a Client Component.  It receives the server-authoritative
          helpfulCounts as props and uses useOptimistic per row to show instant
          updates while the Server Action is pending.
        */}
        <ReviewLikes
          reviews={reviews}
          productId={productId}
          helpfulCounts={helpfulCounts}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cached data helpers
// ---------------------------------------------------------------------------

async function getCachedProduct(productId: string) {
  "use cache";
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return await getProductById(productId);
}

async function getCachedReviews(productId: string) {
  "use cache";
  // The Server Action calls revalidateTag(tags.reviews(productId)) on success,
  // which purges this entry.  Next render re-fetches and gets fresh counts.
  cacheTag(tags.reviews(productId));
  return await listReviews(productId);
}

// ---------------------------------------------------------------------------
// Static shell sections — prerender immediately, no dynamic data
// ---------------------------------------------------------------------------

function ConceptExplainer() {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3 text-sm text-indigo-900">
      <h2 className="font-semibold text-base">What is useOptimistic?</h2>
      <p>
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">
          useOptimistic(serverValue, mergeFn)
        </code>{" "}
        returns{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">
          [optimisticValue, addOptimistic]
        </code>.
        While a Server Action is pending, the component displays
        <strong> optimisticValue</strong> (the speculative update) instead of
        <strong> serverValue</strong> (the real data).
      </p>
      <p>
        The key contract: <strong>optimisticValue is a temporary overlay</strong>.
        When the transition ends, it always snaps back to{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">
          serverValue
        </code>{" "}
        — whether the action succeeded (new serverValue via revalidation) or
        failed (old serverValue, rollback).  You can never accidentally
        leave a phantom update behind.
      </p>
      <div className="rounded-lg bg-indigo-100 p-3 font-mono text-xs leading-relaxed text-indigo-800 overflow-x-auto">
        <p className="text-indigo-500 mb-1">{`// ReviewRow.tsx ("use client")`}</p>
        <p>{`const [optimisticCount, addOptimistic] = useOptimistic(`}</p>
        <p>{`  serverHelpfulCount,           // real count from server`}</p>
        <p>{`  (_cur, next: number) => next  // merge: replace with next value`}</p>
        <p>{`);`}</p>
        <p className="mt-2">{`startTransition(async () => {`}</p>
        <p>{`  addOptimistic(serverHelpfulCount + 1);  // instant UI update`}</p>
        <p>{`  const result = await markHelpful(...);  // server round-trip`}</p>
        <p>{`  if (!result.success) setErrorMsg(result.error); // rollback is automatic`}</p>
        <p>{`});`}</p>
      </div>
    </section>
  );
}

function RollbackExplainer() {
  return (
    <section className="rounded-xl border border-red-100 bg-red-50 p-5 space-y-3 text-sm text-red-900">
      <h2 className="font-semibold text-base">
        The Failure Path — Rollback
      </h2>
      <p>
        The Server Action above forces a failure on every 3rd &ldquo;Helpful&rdquo; click
        (a simulated server error).  Here is what React does when that happens:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-red-800">
        <li>
          <strong>Optimistic update applied</strong> — count jumps from N to N+1
          the instant you click (before the server responds).
        </li>
        <li>
          <strong>Server rejects</strong> — the action returns{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            {"{ success: false, error: '...' }"}
          </code>.
        </li>
        <li>
          <strong>Transition ends without a new serverValue</strong> —
          revalidation never ran, so the parent did not re-render with an
          updated count.
        </li>
        <li>
          <strong>React rolls back</strong> —{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            optimisticCount
          </code>{" "}
          snaps back to{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            serverHelpfulCount
          </code>{" "}
          automatically.  No phantom +1 lingers.
        </li>
        <li>
          <strong>Error surfaces</strong> — the component reads{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            result.error
          </code>{" "}
          and stores it in a separate{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            useState
          </code>{" "}
          for display.
        </li>
      </ol>
      <p className="text-xs text-red-700 mt-2">
        A plain{" "}
        <code className="font-mono bg-red-100 rounded px-1">useState</code>{" "}
        counter would stay at N+1 unless you manually reset it in the error
        path — easy to forget, and catastrophic in production.{" "}
        <code className="font-mono bg-red-100 rounded px-1">useOptimistic</code>{" "}
        makes rollback impossible to forget.
      </p>
    </section>
  );
}

function ReconciliationExplainer() {
  return (
    <section className="rounded-xl border border-green-100 bg-green-50 p-5 space-y-3 text-sm text-green-900">
      <h2 className="font-semibold text-base">
        The Happy Path — Reconciliation
      </h2>
      <p>
        When the action <strong>succeeds</strong>, here is what happens:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-green-800">
        <li>
          <strong>Optimistic update applied</strong> — count shows N+1
          immediately.
        </li>
        <li>
          <strong>Server persists</strong> — the helpful count is stored
          in the in-process Map and{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">
            revalidateTag
          </code>{" "}
          purges the reviews cache.
        </li>
        <li>
          <strong>Parent re-renders</strong> — the server component fetches
          fresh data and passes the updated{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">
            helpfulCounts
          </code>{" "}
          (including the new N+1 for this review) as new props to{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">
            ReviewLikes
          </code>.
        </li>
        <li>
          <strong>Reconciliation completes</strong> —{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">
            useOptimistic
          </code>{" "}
          receives the new{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">
            serverHelpfulCount
          </code>{" "}
          prop (N+1).  The transition ended, so{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">
            optimisticCount
          </code>{" "}
          snaps to N+1.  The displayed count is now the server-authoritative
          value — not a drift.
        </li>
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — shown while the Suspense hole loads
// ---------------------------------------------------------------------------

function ReviewsPanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Product skeleton */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-2">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-5 w-64 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-4 w-16 bg-gray-100 rounded mt-2" />
      </div>
      {/* Reviews skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 bg-white p-4 space-y-2"
        >
          <div className="h-3 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-6 w-28 bg-gray-100 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}
