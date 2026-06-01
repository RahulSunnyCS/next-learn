/**
 * Vitest configuration for the Nextmart project.
 *
 * Design decisions:
 * - environment: "node" because the lib/data layer is a pure Node.js module
 *   (no DOM APIs needed).  Using the jsdom environment for these tests would
 *   add unnecessary overhead and noise.
 * - include pattern covers lib data tests. Challenge-scoped tests
 *   in app/(challenges)/cNN-slug can use a different include pattern
 *   if they need jsdom (they can specify testEnvironment at the file level
 *   with a vitest-environment jsdom comment).
 * - No transform config needed: vitest handles TypeScript via esbuild by
 *   default; the tsconfig paths alias (@/*) is resolved via the alias option.
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/_tests/*.test.ts",
      "lib/**/_tests/*.test.tsx",
      // C21-Testing challenge: unit/integration tests for RSC logic, Server
      // Actions, and Route Handlers. These live in solutions/c21-testing/ so
      // the challenge can ship runnable test examples alongside the teaching
      // content without scattering test files across the challenge directories.
      "solutions/c21-testing/*.test.ts",
      "solutions/c21-testing/*.test.tsx",
    ],
  },
  resolve: {
    alias: {
      // Mirror the @/* path alias from tsconfig.json so tests can use
      // `import { ... } from "@/lib/data"` the same way challenge code does.
      "@": path.resolve(__dirname, "."),
    },
  },
});
