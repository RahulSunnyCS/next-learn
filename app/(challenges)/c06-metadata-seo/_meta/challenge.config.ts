// ─── challenge.config.ts ─────────────────────────────────────────────────────
//
// Typed TypeScript wrapper around challenge.config.json.
// The JSON file is the source of truth; the registry (lib/registry.ts)
// reads it directly with fs.readFileSync.  This file gives challenge code
// type-safe access without a dynamic require.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
