// ─── _lib/metrics.ts ─────────────────────────────────────────────────────────
//
// Simulated live seller metrics endpoint.
//
// WHY THIS MODULE EXISTS:
//   The SellerLiveMetrics widget (a deliberate "use client" component) polls
//   this endpoint on a client-side interval.  In a real app this would be a
//   separate API route or a WebSocket; here we expose a plain object that the
//   Route Handler at /api/c04-metrics (or the client component itself via a
//   relative fetch) can return.
//
// SERVER-SIDE ONLY:
//   This file may be imported by Server Components and Route Handlers.  It
//   must NOT be imported directly by a Client Component — client code fetches
//   the data over HTTP rather than importing this module.  This keeps the
//   in-memory store on the server and prevents the mutable state from being
//   duplicated in the browser bundle.

/** A snapshot of the seller's live dashboard metrics. */
export interface SellerMetrics {
  activeVisitors: number;
  ordersLast5Min: number;
  revenueToday: number; // cents
  lowStockAlerts: number;
}

/**
 * Returns a freshly-simulated metrics snapshot.
 *
 * In a real app this would query a database or analytics service.  Here we
 * generate plausible numbers so the widget has something to poll.
 *
 * The values change on every call so the client-side interval produces
 * visible updates — that is the whole point of the CSR widget demo.
 */
export function getSellerMetrics(): SellerMetrics {
  return {
    activeVisitors:  Math.floor(Math.random() * 40) + 10,  // 10–49
    ordersLast5Min:  Math.floor(Math.random() * 8),         // 0–7
    revenueToday:    (Math.floor(Math.random() * 300) + 50) * 100, // $50–$349 in cents
    lowStockAlerts:  Math.floor(Math.random() * 4),         // 0–3
  };
}
