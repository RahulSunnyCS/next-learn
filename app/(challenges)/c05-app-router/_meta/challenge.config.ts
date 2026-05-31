// ─── challenge.config.ts — C05 App Router ─────────────────────────────────
//
// Typed re-export of challenge.config.json.
//
// The registry (lib/registry.ts) reads the JSON file directly using
// fs.readFileSync — not this TypeScript file — to avoid dynamic-require
// limitations with Turbopack.  This file provides typed access for
// challenge code that needs to import the config programmatically.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
