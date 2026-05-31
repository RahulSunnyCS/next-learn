// ─── challenge.config.ts — COPY-ME template ──────────────────────────────
//
// This file provides type-safe access to the challenge config for TypeScript
// code within the challenge directory.  The RUNTIME source of truth is the
// companion challenge.config.json file — the registry (lib/registry.ts) reads
// the JSON directly using fs.readFileSync to avoid dynamic-require issues with
// Turbopack.
//
// HOW TO USE THIS TEMPLATE:
//   1. Copy the entire _template/ directory to app/(challenges)/cNN-slug/.
//   2. Edit challenge.config.json — that is the file the registry reads.
//   3. Update the type assertion below to match if you need typed access in
//      challenge code (e.g. import config from './_meta/challenge.config').
//
// PRIVATE FOLDER CONVENTION:
//   This file lives under _template/ which starts with underscore.
//   Next.js App Router treats underscore-prefixed folders as NON-ROUTABLE —
//   they are excluded from the file-system router.  The registry glob pattern
//   also explicitly excludes dirs starting with _ so this template never
//   appears in the challenge index.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

// Re-export with type assertion so callers get the full ChallengeConfig type.
const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
