"use client";

// ─── _components/SessionProviderWrapper.tsx ──────────────────────────────────
//
// Thin client-component wrapper around next-auth/react's SessionProvider.
//
// WHY THIS EXISTS
// ────────────────
// Because our Auth.js config uses a non-default basePath
// ("/c23-oauth-authjs/api/auth" instead of the default "/api/auth"), the
// SessionProvider must be told where the session endpoint lives.  Without
// this, calls to signIn() and signOut() from AuthButtons.tsx would POST to
// "/api/auth/..." and get 404s.
//
// We wrap SessionProvider in its own file so that:
//   1. The page.tsx and protected/page.tsx remain Server Components (static
//      shells) — they do not need "use client" themselves.
//   2. The SessionProvider (which must be a Client Component) is isolated in
//      a small leaf — a standard RSC boundary pattern.

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface Props {
  children: React.ReactNode;
  session: Session | null;
}

export function C23SessionProvider({ children, session }: Props) {
  return (
    <SessionProvider
      // Tell the React client where our custom-pathed auth API lives.
      basePath="/c23-oauth-authjs/api/auth"
      // Pass the server-side session as the initial value to avoid a client
      // round-trip on first render (prevents a flash of unauthenticated state).
      session={session}
    >
      {children}
    </SessionProvider>
  );
}
