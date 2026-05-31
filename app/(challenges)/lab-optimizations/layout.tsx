// ─── app/(challenges)/lab-optimizations/layout.tsx ───────────────────────
//
// Local layout for the lab-optimizations challenge route subtree.
//
// WHY A LOCAL LAYOUT (not in app/layout.tsx)?
//   next/font must be instantiated in a Server Component that wraps the content
//   where the font should apply.  By placing it here instead of the root layout,
//   we scope the font CSS variable to just this challenge's route — it doesn't
//   affect other challenges or the site-wide font.  This is the recommended
//   pattern for per-section fonts (e.g. a display font only on a landing page).
//
//   The font class/variable is applied to a wrapper <div> rather than <html>
//   so that the root layout's body font (system-ui, set in globals.css) is
//   unaffected.  Any element inside this layout that sets
//   `font-family: var(--font-lab)` will receive Inter.
//
// CACHE COMPONENTS:
//   This layout is a Server Component.  It performs no dynamic data reads,
//   so it is a static shell — no Suspense needed here.

import { labFont } from "./_lib/fonts";

export default function LabOptimizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Apply the font CSS variable to this subtree.
    // labFont.variable = "var(--font-lab, ...)" class definition.
    // labFont.className would apply the font directly; using .variable
    // exposes it as a CSS custom property so child elements can opt in
    // explicitly with font-[var(--font-lab)] or via CSS.
    <div className={labFont.variable}>
      {children}
    </div>
  );
}
