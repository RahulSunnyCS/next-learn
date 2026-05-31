// ─── app/(challenges)/c19-two-sources-of-truth/api/saved-items/route.ts ────────
//
// GET /c19-two-sources-of-truth/api/saved-items
//
// This route handler is the TanStack Query data source for the C19 challenge.
// It returns the current saved-items list for the demo user.
//
// WHY a route handler (not a direct Server Action import in the client component):
//   TanStack Query's useQuery requires an async function that can be called from
//   the browser. You cannot import Server Actions directly into useQuery because
//   Server Actions are POST-only (form actions) — they are not designed as GET
//   data fetching endpoints. A route handler is the correct pattern for
//   client-driven data fetching with TanStack Query in Next.js App Router.
//
// NOTE on runtime: we intentionally do NOT export `export const runtime = 'edge'`
//   because under cacheComponents: true that directive is incompatible with the
//   build (see cache-components-rules.md §1). The default Node.js runtime is used.
//
// CACHE HEADERS: Cache-Control: no-store
//   We set this so that the browser HTTP cache does not serve stale data.
//   TanStack Query is the cache layer — we let it control freshness, not the
//   browser. Without this header the browser might serve a cached 200 response
//   even after the data changes, masking TanStack's invalidation behaviour.

import { NextResponse } from "next/server";
import { getSavedItems } from "../../_lib/actions";

const DEMO_USER_ID = "demo-user";

export async function GET(): Promise<NextResponse> {
  try {
    const items = await getSavedItems(DEMO_USER_ID);
    return NextResponse.json(items, {
      status: 200,
      headers: {
        // Prevent browser-level HTTP caching — TanStack Query owns freshness.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[c19/api/saved-items] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
