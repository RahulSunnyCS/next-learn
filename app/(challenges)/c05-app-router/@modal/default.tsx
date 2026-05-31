// ─── @modal/default.tsx ───────────────────────────────────────────────────
//
// WHY THIS FILE EXISTS — THE DEFAULT.TSX CONTRACT:
//
// In a parallel-routes layout, every named slot MUST have either a matching
// page OR a default.tsx for every URL in the layout's subtree.  Without it,
// Next.js cannot render the layout at all for non-matching URLs and returns
// a 404.
//
// The @modal slot only has a page at (.)products/[id]/page.tsx.
// For EVERY OTHER URL under c05-app-router/ (the listing, catch-all pages,
// error states, etc.) the @modal slot has no match.  This default.tsx is the
// explicit "render nothing for this slot" instruction.
//
// CONCRETELY:
//   URL: /challenges/c05-app-router
//     → @modal slot: no match → falls back to default.tsx → renders null
//     → children slot: matches page.tsx → renders the product listing
//
//   URL: /challenges/c05-app-router/products/p-elec-001 (hard-refresh)
//     → Intercepting route is SKIPPED on hard-refresh
//     → @modal slot: no match → falls back to default.tsx → renders null
//     → children slot: matches products/[id]/page.tsx → renders full product page
//
//   URL: /challenges/c05-app-router/products/p-elec-001 (soft nav via Link)
//     → Intercepting route FIRES
//     → @modal slot: matches @modal/(.)products/[id]/page.tsx → renders modal
//     → children slot: STAYS MOUNTED (listing page stays visible behind modal)

// Returning null is intentional: "no modal is currently open".
export default function ModalDefault() {
  return null;
}
