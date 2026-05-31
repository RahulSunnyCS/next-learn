"use client";
// ─── solutions/c16-url-state/PaginationSolution.tsx ───────────────────────
//
// Reference solution for URL-driven pagination.
// Uses router.replace() (not push) so pagination doesn't flood history.

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { buildSearchParams, parseSearchParams } from "./_lib/search-params";

interface PaginationSolutionProps {
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export default function PaginationSolution({
  totalPages,
  currentPage,
  totalCount,
}: PaginationSolutionProps) {
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
