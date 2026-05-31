"use client";
// ─── app/(challenges)/c14-tanstack-query/_components/QueryProvider.tsx ────
//
// A local QueryClientProvider scoped to the c14 subtree.
//
// WHY LOCAL INSTEAD OF GLOBAL (in app/layout.tsx)?
//
//  1. LESSON ISOLATION: Each challenge is self-contained. If we modified
//     app/layout.tsx we would affect every other challenge, violating the
//     constraint that challenge code is isolated.
//
//  2. REACT QUERY DOCS RECOMMENDATION: The v5 docs recommend creating the
//     QueryClient inside a useState (not at module level) so each component
//     tree instance gets its own client. This prevents state from leaking
//     between test runs or server renders in SSR scenarios.
//
//  3. "use client" BOUNDARY: QueryClientProvider uses React context, which
//     requires a client component boundary. This wrapper is the minimal
//     "use client" shell that lets us use Server Components everywhere else
//     in the challenge.
//
// HOW SERVER PREFETCH + HYDRATION WORKS (the HydrationBoundary flow):
//
//  The page.tsx Server Component creates a server-side QueryClient, prefetches
//  the first page of products via queryClient.prefetchQuery(), then calls
//  dehydrate(queryClient) to serialise the cache to a plain object.
//
//  That dehydrated state is passed as a prop to <HydrationBoundary state={...}>
//  which lives inside this QueryProvider. On the client, HydrationBoundary
//  rehydrates the cache entries from the server state so the client QueryClient
//  already has those results — the first render has data without any client
//  fetch, eliminating the loading flash.
//
//  The server QueryClient is intentionally separate from the client QueryClient
//  created here. The server one is throw-away (not stored in state); the client
//  one persists for the lifetime of the component tree.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Create the QueryClient inside useState so it is stable across re-renders
  // but each tree instance gets its own client. This is the pattern recommended
  // by TanStack Query v5 for Next.js App Router.
  //
  // The initializer function (lazy setState) ensures the client is created only
  // once on the client, not on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // staleTime: how long cached data is considered fresh before
            // a background refetch is triggered. 30 seconds is a reasonable
            // default for this demo — repeated searches within 30s won't
            // re-hit the server.
            staleTime: 30_000,
            // gcTime (formerly cacheTime): how long inactive cache entries
            // are kept in memory before garbage collection. Default is 5m.
            // We keep the default (omitting it) to show the cache outliving
            // the component.
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
