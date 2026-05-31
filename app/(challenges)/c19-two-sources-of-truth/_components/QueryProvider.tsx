"use client";
// ─── _components/QueryProvider.tsx — Local QueryClientProvider ────────────────
//
// WHY local (not a shared provider):
//   The task contract explicitly requires a QueryClientProvider local to this
//   challenge. Each challenge is self-contained — a sibling challenge may also
//   use TanStack Query with different configuration or a different cache. Sharing
//   a QueryClient across challenges would couple their cache lifetimes.
//
//   This mirrors the real-world pattern: a QueryClientProvider wraps only the
//   subtree that needs TanStack Query. In a Next.js App Router app you typically
//   place it at the layout level for your app's feature area, not globally.
//
// WHY a stable QueryClient across renders:
//   The QueryClient must survive React re-renders of the provider component —
//   if we created it with `new QueryClient()` in the render body, a parent
//   re-render would destroy the entire client cache and restart all queries.
//   We use useState(() => new QueryClient(...)) to initialise it exactly once.
//
// Configuration choices:
//   - staleTime: 0 (default) — queries refetch in background on window focus.
//     This is intentional for the demo: it means the TanStack cache naturally
//     shows "freshness" state and we can observe the refetch lifecycle.
//   - gcTime (was cacheTime in v4): 5 minutes — keeps data in cache for 5
//     minutes after the last subscriber unmounts. Long enough for the tab-sync
//     demo to stay interesting.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function LocalQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState with an initialiser function ensures the QueryClient is created
  // once per component mount, not once per render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // staleTime: 0 means data is considered stale immediately.
            // The background refetch on window-focus will be visible in DevTools,
            // which is useful for teaching "when does TanStack re-fetch?".
            staleTime: 0,
            // gcTime: how long to keep unused data in the cache after the last
            // subscriber unmounts. 5 minutes is a good demo value.
            gcTime: 5 * 60 * 1000,
            // retry: 1 — retry once on network failure. Avoids the demo getting
            // stuck on a transient error, without hiding errors entirely.
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
