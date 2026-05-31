"use client";
// ─── _components/Pagination.tsx — URL-driven pagination for C16 ───────────
//
// Pagination is also URL-driven: clicking Next/Prev calls router.replace()
// with the updated `page` param rather than managing a page number in state.
//
// WHY router.replace (not router.push)?
//   replace() does not push a new history entry — so clicking Next → Prev
//   returns to the same page rather than generating two Back steps.
//
//   In contrast, the search bar uses replace() for the same reason: partial
//   typed states must not bloat the history stack.
//
// NOTE: this component receives the total page count from the server as a
// prop — the server does the counting, the client just updates the URL.

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { buildSearchParams, parseSearchParams } from "../_lib/search-params";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export default function Pagination({
  totalPages,
  currentPage,
  totalCount,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = parseSearchParams(
    Object.fromEntries(searchParams.entries())
  );

  const goToPage = useCallback(
    (page: number) => {
      const sp = buildSearchParams(current, { page });
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : "?");
    },
    [current, router]
  );

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm text-gray-500">
        {totalCount} product{totalCount !== 1 ? "s" : ""} &mdash; page{" "}
        <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
