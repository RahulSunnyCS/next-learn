// ─── solutions/c24-normalized-state/page.tsx ─────────────────────────────────
//
// REFERENCE SOLUTION — C24 Large-scale Normalized State (Seller Data Grid)
//
// This file is the annotated reference page for the challenge at
// app/(challenges)/c24-normalized-state/page.tsx.
//
// It is NOT a runnable Next.js page — it lives in the solutions/ directory,
// which is NOT part of the Next.js app routing tree. It exists for study and
// comparison only.
//
// ─── KEY DECISIONS DOCUMENTED BELOW ─────────────────────────────────────────
//
// DECISION 1: Static shell + Suspense hole (Cache Components pattern)
// ─────────────────────────────────────────────────────────────────────────────
// The page exports no route-segment config directives (`export const dynamic`,
// `export const revalidate`, etc.) because those are incompatible with the
// `cacheComponents: true` flag in next.config.ts (see cache-components-rules.md).
//
// Instead, the page is a static shell (renders immediately at build time) and
// the data-fetching logic lives in <GridDataLoader>, an async Server Component
// wrapped in <Suspense>. This is the "◐ Partial Prerender" pattern.
//
// DECISION 2: await connection() before any non-deterministic call
// ─────────────────────────────────────────────────────────────────────────────
// lib/data functions use Math.random() for simulated latency, which is
// non-deterministic. Under cacheComponents, non-deterministic calls during the
// static prerender phase fail with "Uncached data was accessed outside of
// <Suspense>". Calling `await connection()` first opts this component into the
// dynamic render path, after which non-deterministic calls are safe.
//
// DECISION 3: Data normalized on the server, serialized as props
// ─────────────────────────────────────────────────────────────────────────────
// GridDataLoader runs on the server. It fetches products+orders, normalizes them
// into a NormalizedRows object, expands to 500 rows, and passes the result as a
// single prop to the <DataGrid> client component. The client never re-fetches —
// the initial state comes from the server and all subsequent updates are local
// Zustand mutations (stock edits, selections).
//
// This avoids a useEffect + fetch pattern on the client, which would cause a
// flash of empty state and an extra network round-trip.
//
// DECISION 4: Synthetic row expansion (expandToCount)
// ─────────────────────────────────────────────────────────────────────────────
// The real product dataset has ~30 entries — not enough to demonstrate
// virtualization benefits (30 rows are fast even without virtualization).
// expandToCount synthesizes additional rows from real product data, cycling
// through templates and varying price/stock/revenue. The synthetic rows are
// clearly labeled "(Variant N)" in their names so learners can distinguish them.
//
// DECISION 5: Hard-coded seller id
// ─────────────────────────────────────────────────────────────────────────────
// listProductsBySeller requires a seller id. Rather than implement auth just
// for this challenge, we use a fixed "u-seller-1" id from the fixture data.
// This keeps the challenge focused on state management, not session handling.

// ── Reference implementation starts here ────────────────────────────────────
// (This code mirrors app/(challenges)/c24-normalized-state/page.tsx exactly)

import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listProductsBySeller, listOrdersForUser } from "@/lib/data";
import { DataGrid } from "@/app/(challenges)/c24-normalized-state/_components/DataGrid";
import {
  buildNormalizedRows,
  expandToCount,
} from "@/app/(challenges)/c24-normalized-state/_lib/normalize";

export const metadata: Metadata = {
  title: "C24 — Normalized State (Solution Reference)",
};

export default function C24SolutionReferencePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          solutions/c24-normalized-state (reference)
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          C24 Reference Solution: Large-scale Normalized State
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This file is a non-runnable reference. Read NOTES.md alongside this
          source to understand every decision. Compare with the challenge at{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            app/(challenges)/c24-normalized-state/
          </code>
          .
        </p>
      </div>

      <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
        <GridDataLoader />
      </Suspense>
    </div>
  );
}

// ─── Dynamic hole — async Server Component ───────────────────────────────────
//
// Why GridDataLoader is a separate component (not inlined in the page):
//   1. It must be async (uses await) — Next.js requires async components to be
//      separate function declarations when used inside JSX, not inline closures.
//   2. Wrapping it in <Suspense> requires it to be a distinct component so React
//      can suspend the component tree at this boundary while streaming.
//   3. It keeps the page component clean and static — no async logic at the
//      page level, which would force the whole page into a dynamic render.

async function GridDataLoader() {
  // RULE: await connection() before any non-deterministic call (cache-components-rules.md §7)
  // listProductsBySeller calls Math.random() for simulated latency — without connection(),
  // this would fail during static prerender with a cacheComponents build error.
  await connection();

  const SELLER_ID = "u-seller-1"; // Hard-coded — see DECISION 5 above

  const [products, orders] = await Promise.all([
    listProductsBySeller(SELLER_ID),
    listOrdersForUser("u-buyer-1").then((buyerOrders) => [
      ...buyerOrders,
    ]).catch(() => [] as import("@/lib/data").Order[]),
  ]);

  // buildNormalizedRows: O(n) pass — joins products+orders, builds byId map + allIds array.
  // expandToCount: synthesizes additional rows from real data to reach 500.
  const baseRows = buildNormalizedRows(products, orders as import("@/lib/data").Order[]);
  const rows = expandToCount(baseRows, 500);

  // Serialized as a prop — the client DataGrid receives a plain NormalizedRows object.
  // No client-side fetching; no useEffect for initial load (beyond the store bootstrap).
  return <DataGrid initialRows={rows} />;
}
