import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    // %s is replaced by the page-level title via the metadata export.
    // The default is shown on the root page (/) where no override is set.
    template: "%s | Nextmart",
    default: "Nextmart — Next.js 16 Learning Curriculum",
  },
  description:
    "Nextmart is a Next.js 16 hands-on learning curriculum covering rendering strategies, caching, server actions, client state, and deployment — through 25 challenge exercises.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextmart.vercel.app"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        body uses flex-col so the <main> flex-1 fills the available vertical
        space, pushing the footer to the bottom regardless of content height.
        min-h-screen ensures this works even on short pages.
      */}
      <body className="min-h-screen flex flex-col bg-[--background] text-[--foreground]">
        {/*
          Skip-to-content link: the FIRST focusable element on the page.
          - Hidden off-screen for mouse users (sr-only = clip + position:absolute).
          - Becomes visible (focus:not-sr-only) when a keyboard user presses Tab.
          - Jumps focus to <main id="main-content">, bypassing the nav.
          This is a WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks) requirement.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-indigo-700 focus:font-medium focus:text-sm focus:ring-2 focus:ring-indigo-500 focus:rounded-md focus:shadow-md"
        >
          Skip to main content
        </a>

        {/*
          <header> is the ARIA banner landmark. Sticky so learners always
          have access to the nav regardless of scroll position.
          The header is NOT <nav> — it wraps the nav and the brand logo.
        */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          {/*
            <nav> is the ARIA navigation landmark. aria-label distinguishes
            it from any in-page nav landmarks (e.g. a sidebar nav).
            Using next/link satisfies @next/next/no-html-link-for-pages.
          */}
          <nav
            aria-label="Main navigation"
            className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6"
          >
            <Link
              href="/"
              className="font-semibold text-lg tracking-tight no-underline text-gray-900 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:rounded"
              aria-label="Nextmart — go to challenge index"
            >
              Nextmart
            </Link>

            <span className="text-gray-300 select-none" aria-hidden="true">
              |
            </span>

            <Link
              href="/"
              className="text-sm text-gray-600 no-underline hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:rounded"
            >
              Challenges
            </Link>

            {/* Spacer — pushes the right-side content (if any) to the far end */}
            <span className="flex-1" aria-hidden="true" />

            {/* Badge: curriculum version indicator */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-400 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
              Next.js 16
            </span>
          </nav>
        </header>

        {/*
          <main> is the ARIA main landmark. id="main-content" is the target
          of the skip-to-content link above. tabIndex={-1} allows the skip
          link to programmatically move focus to <main> (without adding it
          to the natural tab order). The negative tabIndex means it is only
          reachable via .focus() — not by pressing Tab.
        */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 focus:outline-none"
        >
          {children}
        </main>

        {/*
          <footer> is the ARIA contentinfo landmark. Should appear exactly
          once per page (as a child of <body>). Provides site-wide context
          (repo name, stack, year).
        */}
        <footer className="border-t border-gray-100 text-center text-xs text-gray-400 py-4 space-y-1">
          <p>
            Nextmart learning curriculum — Next.js 16 · App Router · Tailwind 4
          </p>
          <p>
            <Link
              href="https://github.com"
              className="hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:rounded"
            >
              GitHub
            </Link>
            {" · "}
            <Link
              href="/c25-capstone"
              className="hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:rounded"
            >
              Capstone
            </Link>
            {" · "}
            <Link
              href="/sitemap.xml"
              className="hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:rounded"
            >
              Sitemap
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
