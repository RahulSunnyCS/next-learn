/**
 * C21 — Server Action Test: submitReview (C11)
 *
 * STRATEGY
 * ─────────
 * Server Actions are async functions with a "use server" directive.  In the
 * Next.js runtime that directive causes Next.js to:
 *   1. Assign the function a stable action ID.
 *   2. Route POST requests from the browser to the function.
 *   3. Inject same-origin CSRF protection.
 *
 * In plain Vitest those three things do NOT happen.  The "use server" string
 * is simply a pragma comment that the build strips — the function executes
 * like any other async function.  This means we CAN call it directly in tests
 * and assert its return value, which is exactly the right thing to test:
 *
 *   - Validation logic: does it reject bad inputs before touching the store?
 *   - Happy path: does it call addReview and revalidateTag on success?
 *   - Error path: does it surface data-layer errors as { _form } errors?
 *
 * What we do NOT test here:
 *   - The POST routing (that is Next.js framework territory).
 *   - The CSRF enforcement (that is tested via E2E — a raw fetch from a
 *     different origin must be rejected by the running server).
 *   - The revalidateTag + cache invalidation end-to-end (needs the Next.js
 *     cache runtime; we only assert the function was called with the right args).
 *
 * MOCKING DECISIONS
 * ─────────────────
 * 1. "next/cache" is mocked so revalidateTag / revalidatePath do not throw
 *    in a plain Node context (they are no-ops in tests, but we assert the
 *    call was made with the expected tag).
 *
 * 2. "@/lib/data" is partially mocked: we replace `addReview` with a spy so
 *    tests are deterministic (no in-memory store mutation between tests) and
 *    can simulate errors without corrupting other test suites that rely on
 *    the shared in-memory store (e.g. repository.test.ts).
 *    The `tags` export is NOT mocked — we import the real tags helper so the
 *    expected cache tag string is derived the same way the action derives it.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { tags } from "@/lib/data";

// ── Step 1: Mock next/cache before importing anything that uses it ──────────
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

// ── Step 2: Mock @/lib/data to control addReview behaviour ─────────────────
// We use vi.mock with a factory so the mock is hoisted before imports.
// addReview is replaced with a spy that resolves to a dummy Review object by
// default.  Individual tests can override this to simulate errors.
vi.mock("@/lib/data", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data")>();
  return {
    ...original,
    addReview: vi.fn().mockResolvedValue({
      id: "rev-test-001",
      productId: "p-elec-001",
      userId: "u-buyer-1",
      authorName: "Jamie Rivera (demo)",
      rating: 4,
      body: "Great product.",
      createdAt: new Date().toISOString(),
    }),
  };
});

// ── Step 3: Import the target AFTER mocks are in place ─────────────────────
import { submitReview, type ReviewActionState } from "@/app/(challenges)/c11-server-actions/_lib/actions";
import { addReview } from "@/lib/data";
import { revalidateTag } from "next/cache";

// ── Typed mock helpers ────────────────────────────────────────────────────
const mockAddReview = vi.mocked(addReview);
const mockRevalidateTag = vi.mocked(revalidateTag);

// A baseline prevState — submitReview ignores prevState on first call, but
// the signature requires it (useActionState convention).
const initialState: ReviewActionState = { success: false, errors: {} };

// Helper: build a FormData from a plain object
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

describe("submitReview — validation (no addReview call expected)", () => {
  beforeEach(() => {
    mockAddReview.mockClear();
    mockRevalidateTag.mockClear();
  });

  it("rejects when productId is missing", async () => {
    const fd = makeFormData({ productId: "", rating: "4", body: "Good product." });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors.productId).toBeTruthy();
    // No mutation should have occurred
    expect(mockAddReview).not.toHaveBeenCalled();
  });

  it("rejects a rating of 0 (out of range)", async () => {
    const fd = makeFormData({ productId: "p-elec-001", rating: "0", body: "Great product." });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors.rating).toMatch(/1.*5|5.*1/);
    expect(mockAddReview).not.toHaveBeenCalled();
  });

  it("rejects a rating of 6 (out of range)", async () => {
    const fd = makeFormData({ productId: "p-elec-001", rating: "6", body: "Great product." });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors.rating).toBeTruthy();
    expect(mockAddReview).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric rating", async () => {
    const fd = makeFormData({ productId: "p-elec-001", rating: "five", body: "Great product." });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors.rating).toBeTruthy();
    expect(mockAddReview).not.toHaveBeenCalled();
  });

  it("rejects a body shorter than 5 characters", async () => {
    const fd = makeFormData({ productId: "p-elec-001", rating: "4", body: "ok" });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors.body).toBeTruthy();
    expect(mockAddReview).not.toHaveBeenCalled();
  });

  it("rejects a body longer than 1000 characters", async () => {
    const longBody = "a".repeat(1001);
    const fd = makeFormData({ productId: "p-elec-001", rating: "4", body: longBody });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors.body).toBeTruthy();
    expect(mockAddReview).not.toHaveBeenCalled();
  });

  it("echoes submittedValues on validation failure (for form repopulation)", async () => {
    const fd = makeFormData({ productId: "p-elec-001", rating: "6", body: "Too short" });
    const state = await submitReview(initialState, fd);

    // submittedValues lets the form repopulate on error — critical for the no-JS path
    expect(state.submittedValues).toBeDefined();
    expect(state.submittedValues!.rating).toBe("6");
  });

  it("accumulates multiple field errors in a single pass", async () => {
    // Both productId and rating are invalid — both errors should appear together
    const fd = makeFormData({ productId: "", rating: "0", body: "ok" });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    // At minimum productId and rating should be flagged
    const errorKeys = Object.keys(state.errors);
    expect(errorKeys.length).toBeGreaterThanOrEqual(2);
    expect(state.errors.productId).toBeTruthy();
    expect(state.errors.rating).toBeTruthy();
  });
});

describe("submitReview — happy path (addReview succeeds)", () => {
  beforeEach(() => {
    mockAddReview.mockClear();
    mockRevalidateTag.mockClear();
    // Reset to default success mock
    mockAddReview.mockResolvedValue({
      id: "rev-test-002",
      productId: "p-elec-001",
      userId: "u-buyer-1",
      authorName: "Jamie Rivera (demo)",
      rating: 5,
      body: "Excellent product.",
      createdAt: new Date().toISOString(),
    });
  });

  it("returns { success: true, errors: {} } on a valid submission", async () => {
    const fd = makeFormData({
      productId: "p-elec-001",
      rating: "5",
      body: "Excellent product overall.",
    });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(true);
    expect(Object.keys(state.errors)).toHaveLength(0);
  });

  it("calls addReview with the correct payload (including demo user ID)", async () => {
    const fd = makeFormData({
      productId: "p-elec-001",
      rating: "5",
      body: "Excellent product overall.",
    });
    await submitReview(initialState, fd);

    expect(mockAddReview).toHaveBeenCalledOnce();
    const [payload] = mockAddReview.mock.calls[0];
    expect(payload.productId).toBe("p-elec-001");
    expect(payload.rating).toBe(5); // parsed to number, not string
    expect(payload.body).toBe("Excellent product overall.");
    // The action uses a hard-coded demo user (documented behaviour — auth is C12)
    expect(payload.userId).toBeDefined();
    expect(typeof payload.userId).toBe("string");
  });

  it("calls revalidateTag with the reviews tag for the submitted productId", async () => {
    const productId = "p-elec-001";
    const fd = makeFormData({
      productId,
      rating: "5",
      body: "Excellent product overall.",
    });
    await submitReview(initialState, fd);

    // Verify the cache is invalidated after a successful write.
    // The tag MUST match what tags.reviews() produces — if the action
    // hard-codes a different string, this test will catch it.
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      tags.reviews(productId),
      expect.anything() // Next.js 16 requires a profile arg; we accept any string
    );
  });

  it("trims whitespace from inputs before validation and storage", async () => {
    const fd = makeFormData({
      productId: "  p-elec-001  ",
      rating: " 4 ",
      body: "  Great product with spaces.  ",
    });
    const state = await submitReview(initialState, fd);

    // Should succeed (whitespace-trimmed values are valid)
    expect(state.success).toBe(true);
    // The stored body should be trimmed
    const [payload] = mockAddReview.mock.calls[0];
    expect(payload.body).toBe("Great product with spaces.");
  });
});

describe("submitReview — error path (addReview throws)", () => {
  beforeEach(() => {
    mockAddReview.mockClear();
    mockRevalidateTag.mockClear();
  });

  it("returns a _form error when the data layer throws unexpectedly", async () => {
    // Simulate a data-layer failure (e.g. concurrent store error)
    mockAddReview.mockRejectedValueOnce(new Error("Simulated store failure"));

    const fd = makeFormData({
      productId: "p-elec-001",
      rating: "4",
      body: "Great product.",
    });
    const state = await submitReview(initialState, fd);

    expect(state.success).toBe(false);
    expect(state.errors._form).toBeTruthy();
    // Must NOT leak the internal error message to the client
    expect(state.errors._form).not.toContain("Simulated store failure");
    // revalidateTag should NOT have been called (write never succeeded)
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
