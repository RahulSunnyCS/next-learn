// ─── solutions/c18-optimistic-ui/_lib/actions.ts ─────────────────────────
//
// REFERENCE SOLUTION — the Server Action for C18.
//
// This file is identical to the challenge action.  It is included here so
// the solution page is self-contained and importable.

"use server";

import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { tags } from "@/lib/data";

// Re-use the same in-process store as the challenge (module-level Map
// is shared across all imports within a single server process).
const helpfulStore = new Map<string, number>();
let callCounter = 0;

export async function getHelpfulCounts(
  reviewIds: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const id of reviewIds) {
    result[id] = helpfulStore.get(id) ?? 0;
  }
  return result;
}

export interface HelpfulActionState {
  success: boolean;
  error?: string;
  helpfulCount: number;
}

export async function markHelpful(
  prevState: HelpfulActionState,
  formData: FormData
): Promise<HelpfulActionState> {
  const reviewId = (formData.get("reviewId") as string | null)?.trim() ?? "";
  const productId = (formData.get("productId") as string | null)?.trim() ?? "";

  if (!reviewId) {
    return {
      success: false,
      error: "Missing reviewId.",
      helpfulCount: prevState.helpfulCount,
    };
  }

  const session = await getSession();
  void session; // auth pattern demonstrated; fallback to guest for demo

  callCounter++;

  if (callCounter % 3 === 0) {
    const currentCount = helpfulStore.get(reviewId) ?? 0;
    return {
      success: false,
      error:
        "Simulated server error (every 3rd vote fails — rollback demo). " +
        "Vote NOT recorded.",
      helpfulCount: currentCount,
    };
  }

  const prev = helpfulStore.get(reviewId) ?? 0;
  const next = prev + 1;
  helpfulStore.set(reviewId, next);

  if (productId) {
    revalidateTag(tags.reviews(productId), "seconds");
  }

  return { success: true, helpfulCount: next };
}
