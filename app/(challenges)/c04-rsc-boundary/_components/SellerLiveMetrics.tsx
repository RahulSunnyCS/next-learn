"use client";
// ─── SellerLiveMetrics.tsx ───────────────────────────────────────────────────
//
// DELIBERATE CSR (Client-Side Rendering) — see spec.md §CSR-vs-SSR.
//
// WHY CSR IS THE RIGHT CALL HERE:
//   1. NO SEO VALUE — live metrics (active visitors, orders in the last 5 min)
//      are not crawlable or indexable.  Search engines will never see or care
//      about these numbers.  SSR would waste server resources on data that
//      Google ignores.
//
//   2. HIGHLY REAL-TIME / INTERACTIVE — the widget polls every 3 seconds.
//      Polled data has no point-in-time value for a prerender snapshot.  An
//      SSR render would be stale by the time the HTML reaches the browser.
//
//   3. BEHIND AUTHENTICATION — this widget is only shown to authenticated
//      sellers in the seller dashboard.  It sits behind navigation that
//      requires login.  There is no public URL where a crawler would see it,
//      so the SSR-for-SEO argument does not apply.
//
//   4. INTERVAL POLLING REQUIRES CLIENT RUNTIME — `setInterval` and the Fetch
//      API are browser APIs.  A Server Component cannot run an interval; this
//      is genuinely a client-only concern.
//
// CONTRAST WITH THE ACCOUNT SUMMARY (account/page.tsx):
//   The account summary DOES use SSR — it reads `await getSession()` from
//   `@/lib/auth` inside a <Suspense> boundary.  That page IS accessible via a
//   direct URL, the session data is needed for the initial render (so the user
//   does not see a flash of empty state), and there is no polling requirement.
//   SSR is the right call there; CSR is the right call here.
//
// PROPS SERIALIZATION NOTE:
//   This component accepts no props from the server, so there is no
//   serialization concern.  It fetches all data itself over HTTP.

import { useState, useEffect } from "react";

interface MetricsSnapshot {
  activeVisitors: number;
  ordersLast5Min: number;
  revenueToday: number;
  lowStockAlerts: number;
}

// How often to poll the metrics endpoint (milliseconds).
const POLL_INTERVAL_MS = 3000;

export default function SellerLiveMetrics() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // fetchMetrics is defined inside the effect so it can be called both
    // immediately (on mount) and on the interval tick.
    async function fetchMetrics() {
      try {
        // In a real app this would be a dedicated API route.  For the demo we
        // use the built-in Next.js route at /api/c04-metrics (simulated here
        // by a direct function call stand-in via a fetch to a data URL).
        //
        // We simulate the fetch by generating numbers client-side so the demo
        // works without a real API route wired up.  In production, replace
        // this with:  const res = await fetch('/api/c04-metrics');
        const data: MetricsSnapshot = {
          activeVisitors:  Math.floor(Math.random() * 40) + 10,
          ordersLast5Min:  Math.floor(Math.random() * 8),
          revenueToday:    (Math.floor(Math.random() * 300) + 50) * 100,
          lowStockAlerts:  Math.floor(Math.random() * 4),
        };
        setMetrics(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }

    // Fetch immediately on mount — avoids a 3-second blank state.
    fetchMetrics();

    // Then poll on the interval.
    const id = setInterval(fetchMetrics, POLL_INTERVAL_MS);

    // Cleanup: clear the interval when the component unmounts.
    return () => clearInterval(id);
  }, []); // empty dep array — set up once on mount, tear down on unmount

  // ── INITIAL LOAD STATE ────────────────────────────────────────────────────
  //
  // This null state is intentional and is the KEY OBSERVABLE DIFFERENCE
  // between CSR and SSR.  On initial page load (before JS executes), this
  // component renders NOTHING — the server HTML is empty here.  A crawler or
  // a "view source" will see no metrics data.
  //
  // An SSR component would have initial data in the HTML.  We WANT the CSR
  // behaviour here because:
  //   a) The data is real-time and irrelevant stale.
  //   b) No SEO value means no need for server-rendered content.
  if (!metrics) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
          <h3 className="text-sm font-semibold text-orange-800">Seller Live Metrics</h3>
          <span className="text-xs font-mono text-orange-500 bg-orange-100 rounded px-1.5 py-0.5 ml-auto">
            CSR — client polling
          </span>
        </div>
        <p className="text-xs text-orange-600 animate-pulse">
          Connecting to live metrics stream...
        </p>
        {/* NOTE FOR CHALLENGE: open DevTools → Network tab and disable JS to
            confirm this element is NOT in the initial server HTML. */}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
        </span>
        <h3 className="text-sm font-semibold text-orange-800">Seller Live Metrics</h3>
        <span className="text-xs font-mono text-orange-500 bg-orange-100 rounded px-1.5 py-0.5 ml-auto">
          CSR — polling every {POLL_INTERVAL_MS / 1000}s
        </span>
      </div>

      {/* Metrics grid */}
      <dl className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Active Visitors"
          value={metrics.activeVisitors}
          unit="now"
          color="orange"
        />
        <MetricCard
          label="Orders (last 5 min)"
          value={metrics.ordersLast5Min}
          unit="orders"
          color="orange"
        />
        <MetricCard
          label="Revenue Today"
          value={`$${(metrics.revenueToday / 100).toFixed(2)}`}
          unit=""
          color="orange"
        />
        <MetricCard
          label="Low Stock Alerts"
          value={metrics.lowStockAlerts}
          unit="SKUs"
          color={metrics.lowStockAlerts > 0 ? "red" : "orange"}
        />
      </dl>

      {/* Error display */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
      )}

      {/* Timestamp */}
      {lastUpdated && (
        <p className="text-xs text-orange-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Challenge explanation callout */}
      <div className="rounded-md bg-orange-100 border border-orange-200 p-3 text-xs text-orange-700 space-y-1">
        <p className="font-medium">Why CSR here?</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>No SEO value — live numbers aren&apos;t crawlable.</li>
          <li>Real-time polling must run in the browser (setInterval).</li>
          <li>Behind auth — no public URL for a crawler to find.</li>
          <li>Stale snapshot would mislead the seller.</li>
        </ul>
        <p className="mt-2">
          <strong>Observable test:</strong> disable JavaScript and reload the
          page.  This widget disappears; the SSR account summary below remains.
        </p>
      </div>
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
// A pure display sub-component.  Could be a Server Component but it is small
// and already inside a "use client" boundary, so it stays here.

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  color: "orange" | "red";
}) {
  const colorMap = {
    orange: "bg-white border-orange-100 text-orange-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">
        {value}
        {unit && (
          <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
        )}
      </dd>
    </div>
  );
}
