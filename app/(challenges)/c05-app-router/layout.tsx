// ─── app/(challenges)/c05-app-router/layout.tsx ───────────────────────────
//
// PARALLEL ROUTES: this layout declares TWO named slots:
//   - @modal — hosts the intercepting-route modal
//   - children — the normal page tree (main content)
//
// Both props are required by Next.js when named slots exist.  The layout
// simply stacks them: the children render first (the product listing), and
// the @modal slot renders on top (it is either null via default.tsx, or the
// intercepted quick-view modal page).
//
// HOW THE MODAL WORKS AT BUILD TIME:
//   When the user navigates from the listing to /challenges/c05-app-router/products/[id]
//   via a <Link> (soft navigation), Next.js matches the @modal slot through
//   the intercepting route at @modal/(.)products/[id]/page.tsx.
//   The children (listing page) stay mounted; only the @modal slot changes.
//
//   When the user hard-refreshes /challenges/c05-app-router/products/[id],
//   the intercepting route is IGNORED (it only fires on soft navigation).
//   Next.js looks for an UNINTERCEPTED match: products/[id]/page.tsx.
//   The @modal slot finds no match and falls back to @modal/default.tsx (null).
//
// WHY default.tsx IS REQUIRED:
//   Without @modal/default.tsx, every page in this subtree that doesn't
//   explicitly match the @modal slot would throw a 404 on hard-refresh.
//   default.tsx provides the "no modal" state for all non-modal navigations.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "C05 — App Router Architecture",
};

interface C05LayoutProps {
  // Parallel slot: @modal — active when intercepted product route fires.
  // Receives null (rendered by default.tsx) when no route is intercepted.
  modal: React.ReactNode;
  // Normal children — the product listing or detail page.
  children: React.ReactNode;
}

export default function C05Layout({ modal, children }: C05LayoutProps) {
  return (
    <>
      {/* Render the main content (listing page or detail page) */}
      {children}
      {/* Render the modal slot on top — null when no interception is active */}
      {modal}
    </>
  );
}
