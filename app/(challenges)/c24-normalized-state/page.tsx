// ─── app/(challenges)/c24-normalized-state/page.tsx ──────────────────────────
//
// C24 — Large-scale Normalized State (Seller Data Grid)
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   Static shell + Suspense-wrapped dynamic hole.
//   The data fetch (listProductsBySeller, listOrdersForUser) is inside
//   GridDataLoader — an async Server Component rendered inside <Suspense>.
//   No route-segment config exports (those are banned under cacheComponents).
//
// TEACHING STRATEGY:
//   The page explains the PROBLEM first (nested arrays at scale), then the
//   three-part fix: normalization + memoized selectors + virtualization.
//   The DataGrid component has a "Show render counts" toggle that makes the
//   fix observable — learners see that editing one row increments only that
//   row's render count, not all 500 rows.

import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listProductsBySeller, listOrdersForUser } from "@/lib/data";
import { DataGrid } from "./_components/DataGrid";
import {
  buildNormalizedRows,
  expandToCount,
} from "./_lib/normalize";

export const metadata: Metadata = {
  title: "C24 — Normalized State",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE — Static shell
// ─────────────────────────────────────────────────────────────────────────────

export default function C24NormalizedStatePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ──────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c24-normalized-state
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Large-scale Normalized State: Seller Data Grid
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches how to manage large client-side datasets without
          re-render storms. You will normalize entity storage, wire up memoized
          selectors for fine-grained subscriptions, and virtualize a 500-row grid
          so only visible rows ever hit the DOM.
        </p>
      </div>

      {/* ── STATIC SHELL: the problem ─────────────────────────────────── */}
      <section className="rounded-xl border border-red-100 bg-red-50 p-6 space-y-4">
        <h2 className="font-semibold text-red-900">
          The Problem: Re-render Storms with Nested Arrays
        </h2>
        <p className="text-sm text-red-800">
          The naive approach stores products as a flat array:{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            state.rows: SellerRow[]
          </code>
          . To update one row&apos;s stock, you map over the entire array:
        </p>
        <pre className="bg-red-100 rounded-lg p-4 text-xs font-mono overflow-x-auto text-red-900 whitespace-pre-wrap">
{`// ❌ NAIVE — re-render storm
function NaiveRow({ index }) {
  const rows = useStore(state =>
    state.rows.map(r => r)  // New array reference on every render!
  );
  const row = rows[index];
  // ...
}

// When ANY row updates:
// • map() returns a new array reference every time
// • Zustand sees a new slice reference for EVERY NaiveRow subscription
// • All N rows re-render, even the N-1 unchanged ones
// • With 500 rows: 500 × (vdom diff + React reconcile) on each keystroke`}
        </pre>

        <p className="text-sm text-red-800 mt-2">
          The fix is three parts working together:
          <strong> normalization</strong> (O(1) point updates),{" "}
          <strong>fine-grained selectors</strong> (only the updated row
          re-subscribes), and{" "}
          <strong>React.memo</strong> (prevents parent re-renders cascading).
          Virtualization then eliminates DOM overhead for off-screen rows.
        </p>
      </section>

      {/* ── DYNAMIC HOLE: the live grid ───────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Live Seller Grid (500 rows, virtualized)
          </h2>
          <span className="text-xs text-gray-500">
            Click any stock value to edit it inline
          </span>
        </div>
        <Suspense fallback={<GridSkeleton />}>
          <GridDataLoader />
        </Suspense>
      </section>

      {/* ── STATIC SHELL: normalization explainer ─────────────────────── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
        <h2 className="font-semibold text-indigo-900">
          Normalization: The Shape That Makes O(1) Updates Possible
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Nested Array (before)
            </p>
            <pre className="bg-white rounded border border-red-200 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-gray-800">
{`// Update stock: O(n) map
state.rows = state.rows.map(r =>
  r.id === id
    ? { ...r, stock: newStock }
    : r   // still touched!
);`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Normalized byId (after)
            </p>
            <pre className="bg-white rounded border border-green-200 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-gray-800">
{`// Update stock: O(1) point update
state.rows = {
  ...state.rows,
  byId: {
    ...state.rows.byId,
    [id]: { ...state.rows.byId[id],
             stock: newStock }
  }
};`}
            </pre>
          </div>
        </div>
        <p className="text-sm text-indigo-800">
          With the <code className="font-mono text-xs bg-indigo-100 rounded px-1">byId</code>{" "}
          map, spreading the outer objects creates a new{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">byId</code>{" "}
          reference (so the whole store sees a change), but{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">byId[otherId]</code>{" "}
          still points to the exact same object it did before. A selector reading{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">state.rows.byId[otherId]</code>{" "}
          gets the identical reference back — Zustand&apos;s{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">Object.is</code>{" "}
          check passes — and that subscriber is never notified.
        </p>
      </section>

      {/* ── STATIC SHELL: selector memoization explainer ──────────────── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
        <h2 className="font-semibold text-indigo-900">
          Memoized Selectors: Fine-grained Subscriptions per Row
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Unstable selector (re-render storm)
            </p>
            <pre className="bg-white rounded border border-red-200 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-gray-800">
{`function Row({ id }) {
  // New function created each render →
  // Zustand re-subscribes every time →
  // All rows get notified on any update
  const row = useStore(s =>
    s.rows.byId[id]
  );
}`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Stable selector (granular subscription)
            </p>
            <pre className="bg-white rounded border border-green-200 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-gray-800">
{`function Row({ id }) {
  // useMemo → same fn ref when id unchanged
  // Zustand sees stable selector →
  // Only THIS row re-renders when byId[id] changes
  const sel = useMemo(
    () => makeSelectRow(id), [id]
  );
  const row = useStore(sel);
}`}
            </pre>
          </div>
        </div>
        <p className="text-sm text-indigo-800">
          Toggle <strong>&quot;Show render counts&quot;</strong> in the grid toolbar. Edit a stock
          value and watch: only the edited row&apos;s counter increments. All 499 other
          rows stay at their previous count — zero wasted renders.
        </p>
      </section>

      {/* ── STATIC SHELL: virtualization explainer ────────────────────── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
        <h2 className="font-semibold text-indigo-900">
          Virtualization: Only Render What&apos;s Visible
        </h2>
        <p className="text-sm text-indigo-800">
          The grid has 500 rows but the browser creates only ~25 DOM nodes at
          any time (the visible rows plus an overscan buffer).{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            @tanstack/react-virtual
          </code>{" "}
          measures the scroll container, computes which index range is visible,
          and renders only those items — each positioned with{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            position: absolute; transform: translateY(...)
          </code>{" "}
          inside a container that is sized to the full list height so the
          scrollbar behaves correctly.
        </p>
        <p className="text-xs text-indigo-700">
          Open DevTools → Elements tab → scroll the grid and watch the DOM: the
          same ~25 <code className="font-mono bg-indigo-100 rounded px-1">div</code>{" "}
          elements get their <code className="font-mono bg-indigo-100 rounded px-1">transform</code>{" "}
          updated, rather than 500 elements being created and destroyed.
        </p>
      </section>

      {/* ── STATIC SHELL: react DevTools guide ────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-6 space-y-3">
        <h2 className="font-semibold text-amber-900">
          Diagnosing Re-render Storms: React DevTools Profiler
        </h2>
        <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
          <li>
            Install the{" "}
            <strong>React Developer Tools</strong> browser extension (Chrome /
            Firefox).
          </li>
          <li>
            Open DevTools → <strong>Profiler</strong> tab →{" "}
            <strong>Start profiling</strong>.
          </li>
          <li>Edit a stock value in the grid, then stop profiling.</li>
          <li>
            The flame graph shows which components rendered and how long they
            took. Look for a sea of Row components all lighting up — that is
            the re-render storm. After the fix, only one Row is highlighted.
          </li>
          <li>
            Also enable{" "}
            <strong>&quot;Highlight updates when components render&quot;</strong>{" "}
            (in the Profiler settings gear) to see flashing outlines in real time
            as you interact with the page.
          </li>
        </ol>
      </section>

      {/* ── STATIC SHELL: defend-it reminder ─────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c24-normalized-state/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c24-normalized-state/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC HOLE — async Server Component (renders inside Suspense)
// ─────────────────────────────────────────────────────────────────────────────

// GridDataLoader fetches seller products and orders, normalizes them, expands to
// 500 rows for scale, and passes the result as a prop to the client DataGrid.
// All of this happens on the server — the client receives a single serialized
// NormalizedRows object as a prop, not raw fetch calls.
async function GridDataLoader() {
  // connection() opts into the dynamic render path.  Must come before any
  // non-deterministic call (listProductsBySeller uses Math.random() for latency).
  // See cache-components-rules.md rule 7.
  await connection();

  // The seller id is hard-coded here because this challenge is about state
  // management, not authentication.  In production, you would read the session.
  const SELLER_ID = "u-seller-1";

  const [products, orders] = await Promise.all([
    listProductsBySeller(SELLER_ID),
    // listOrdersForUser is keyed by buyer id, but we use it here to represent
    // orders visible to the seller (orders touching their products).
    // In a real app, a listOrdersBySeller endpoint would exist; we reuse the
    // available function and filter client-side in buildNormalizedRows.
    listOrdersForUser("u-buyer-1").then((buyerOrders) => [
      ...buyerOrders,
      // Combine orders from the second buyer too for richer data.
    ]).catch(() => [] as import("@/lib/data").Order[]),
  ]);

  // Normalize and join products + orders.
  const baseRows = buildNormalizedRows(products, orders as import("@/lib/data").Order[]);

  // Expand to 500 rows to demonstrate virtualization.
  // Synthetic rows are derived from real product data with varied names/prices.
  const rows = expandToCount(baseRows, 500);

  return <DataGrid initialRows={rows} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton (shown while the dynamic hole streams in)
// ─────────────────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="h-12 bg-gray-50 border-b border-gray-200 animate-pulse" />
      <div className="h-10 bg-gray-50 border-b border-gray-200 animate-pulse opacity-60" />
      <div className="space-y-0.5 p-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-gray-100 rounded animate-pulse"
            style={{ opacity: 1 - i * 0.07 }}
          />
        ))}
      </div>
    </div>
  );
}
