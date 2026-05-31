"use client";
// ─── HeavyAnalyticsChart.tsx ──────────────────────────────────────────────
//
// A deliberately "heavy" client component used to demonstrate next/dynamic
// (per-route code splitting).
//
// WHY SIMULATE A HEAVY COMPONENT?
//   In a real app this would be a charting library (Recharts, Chart.js, D3)
//   that weighs 60–200 kB.  Importing it at the top of a page pulls ALL that
//   JavaScript into the main bundle, inflating the JS parsed and executed on
//   every page load — even pages that don't show a chart.
//
//   With next/dynamic, this component's JS is split into a separate chunk.
//   Next.js only sends it to the browser when the component actually renders.
//   The route bundle stays small; users who never scroll to the chart section
//   never pay the download+parse cost.
//
// HOW TO VERIFY THE SPLIT:
//   Run `npm run build` and look at the .next/static/chunks/ directory.
//   You should see a chunk whose name contains "HeavyAnalyticsChart" (or a
//   hash-suffixed chunk that references it).  The main route chunk for
//   lab-optimizations will NOT contain the chart code.

import { useState } from "react";

// Simulate the kind of data a heavy charting lib would consume.
const SALES_DATA = [
  { month: "Jan", revenue: 12400, orders: 84 },
  { month: "Feb", revenue: 15200, orders: 103 },
  { month: "Mar", revenue: 9800, orders: 67 },
  { month: "Apr", revenue: 18700, orders: 127 },
  { month: "May", revenue: 22100, orders: 149 },
  { month: "Jun", revenue: 19500, orders: 132 },
];

const MAX_REVENUE = Math.max(...SALES_DATA.map((d) => d.revenue));

export default function HeavyAnalyticsChart() {
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">
        Monthly Revenue — Q1/Q2
      </h3>
      <p className="text-xs text-gray-500">
        This component is in a separate JS chunk (loaded on demand via{" "}
        <code className="font-mono bg-gray-100 rounded px-0.5">next/dynamic</code>).
        Its code is NOT in the main route bundle.
      </p>

      {/* Simple bar chart rendered with divs — no chart library dependency.
          A real "heavy" component would import recharts or d3 here. */}
      <div className="flex items-end gap-2 h-32 mt-2">
        {SALES_DATA.map((d) => (
          <button
            key={d.month}
            className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
            onClick={() =>
              setActiveMonth(activeMonth === d.month ? null : d.month)
            }
            aria-label={`${d.month}: $${(d.revenue / 100).toFixed(0)}`}
          >
            <div
              className="w-full rounded-t transition-colors duration-150"
              style={{
                height: `${(d.revenue / MAX_REVENUE) * 100}%`,
                backgroundColor:
                  activeMonth === d.month ? "#4f46e5" : "#818cf8",
              }}
            />
            <span className="text-xs text-gray-500 group-hover:text-indigo-600">
              {d.month}
            </span>
          </button>
        ))}
      </div>

      {activeMonth && (
        <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-800">
          {SALES_DATA.find((d) => d.month === activeMonth) && (
            <>
              <strong>{activeMonth}</strong>:{" "}
              ${(SALES_DATA.find((d) => d.month === activeMonth)!.revenue / 100).toFixed(0)}{" "}
              revenue · {SALES_DATA.find((d) => d.month === activeMonth)!.orders} orders
            </>
          )}
        </div>
      )}

      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
        In a real app, this component would import Recharts (~140 kB) or
        Chart.js — next/dynamic keeps that weight out of the initial bundle.
      </p>
    </div>
  );
}
