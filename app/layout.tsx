import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Nextmart",
    default: "Nextmart",
  },
  description:
    "Nextmart — a Next.js 16 learning repo covering rendering, caching, and server actions through hands-on challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Site-wide navigation header — links to the challenge index */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
            {/* Use next/link so that navigation is client-side (no full page
                reload) and the @next/next/no-html-link-for-pages ESLint rule
                is satisfied. */}
            <Link
              href="/"
              className="font-semibold text-lg tracking-tight no-underline text-gray-900 hover:text-indigo-600"
            >
              Nextmart
            </Link>
            <span className="text-gray-300 select-none">|</span>
            <Link
              href="/"
              className="text-sm text-gray-600 no-underline hover:text-indigo-600"
            >
              Challenges
            </Link>
          </nav>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-100 text-center text-xs text-gray-400 py-4">
          Nextmart learning repo — Next.js {/* version baked into package.json */}{" "}
          16 · App Router
        </footer>
      </body>
    </html>
  );
}
