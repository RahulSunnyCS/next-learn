"use client";
// ─── _components/QuickViewModal.tsx ──────────────────────────────────────────
//
// Client Component: the modal chrome (overlay + close button).
//
// WHY "use client"?
//   The close-on-backdrop-click logic and the router.back() call require browser
//   APIs (click event, window history).  This component ONLY renders when Next.js
//   activates the intercepting route at @modal/(.)products/[id]/page.tsx —
//   i.e. only during soft (client-side) navigation.  Hard-refresh skips this
//   component entirely and shows the full product page instead.
//
// DESIGN: the children prop carries the cached product detail Server Component.
// This keeps data-fetching in a Server Component (cache-friendly) while the
// interactive shell lives in this Client Component.

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface QuickViewModalProps {
  children: React.ReactNode;
}

export default function QuickViewModal({ children }: QuickViewModalProps) {
  const router = useRouter();
  // Ref lets us detect clicks on the backdrop (the overlay div behind the
  // modal card) versus clicks on the card itself without needing global state.
  const cardRef = useRef<HTMLDivElement>(null);

  // Dismiss modal with Escape key — keyboard accessibility.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Dismiss modal when clicking outside the card (on the dark backdrop).
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    // Only close if the click target is the backdrop, not the card.
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      router.back();
    }
  }

  return (
    // Semi-transparent full-screen backdrop.
    // z-50 so the modal sits above the background listing page content.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Product quick view"
    >
      {/* Modal card — stops click propagation so backdrop detector works */}
      <div
        ref={cardRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-6 mx-4"
      >
        {/* Close button — router.back() navigates back to the listing page */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition"
          aria-label="Close quick view"
        >
          ✕
        </button>

        {/* Product detail content rendered by the Server Component */}
        {children}
      </div>
    </div>
  );
}
