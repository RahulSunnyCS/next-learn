// ─── fonts.ts — next/font/google helper scoped to this challenge ───────────
//
// WHY THIS FILE EXISTS HERE (not in app/layout.tsx):
//   We intentionally scope this font to the lab-optimizations route subtree,
//   not the whole app.  This demonstrates how next/font works at layout-level:
//   you can add a font just to a single route's layout without affecting other
//   routes.  In a real app you'd do this to load a display font only on a
//   landing page, for example.
//
// HOW next/font/google AVOIDS LAYOUT SHIFT:
//   1. At BUILD time Next.js downloads the font files from Google Fonts and
//      stores them in the .next/ output — zero external network request at
//      runtime.
//   2. The font-face declaration uses `font-display: swap` by default, with an
//      inline `size-adjust` CSS property pre-calculated by Next.js so the
//      fallback font takes up the same space as the real font — this eliminates
//      the jump (layout shift) that normally happens when the custom font loads.
//   3. Because the font data is self-hosted and inlined in the HTML as a CSS
//      variable, there is no extra <link> tag pointing to fonts.googleapis.com.
//      That means: no render-blocking stylesheet, no third-party DNS lookup, no
//      flicker.
//
// USAGE:
//   Import { labFont } here and apply the .className or .variable on a wrapper
//   element in the layout/page.  Restricting it to a wrapper (rather than
//   <html>) means Tailwind's global font-family on `body` is unaffected.

import { Inter } from "next/font/google";

// Inter is an open-source typeface widely used for UI.  We're using it here
// purely as a teaching demo — in a real project you'd pick the right font for
// your brand.
//
// `subsets: ["latin"]` — load only the Latin character subset.  Loading every
// subset would unnecessarily bloat the bundle for an English-only site.
//
// `display: "swap"` — explicitly set (this is already the default in next/font
// but stated here for teaching clarity).  With "swap" the browser shows the
// fallback font immediately and swaps when the custom font is ready.
// `size-adjust` (injected automatically by Next.js) removes the CLS.
//
// `variable: "--font-lab"` — exposes the font as a CSS custom property so we
// can write Tailwind utilities like `font-[var(--font-lab)]` or use it in
// arbitrary CSS.  This is the recommended way when you want to combine with
// Tailwind.
export const labFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lab",
  // `preload: true` (default) — Next.js emits a <link rel="preload"> for this
  // font in the page's <head> so the browser fetches it early, before CSS
  // parsing would normally discover it.
  preload: true,
});
