// ─── challenge.config.ts ────────────────────────────────────────────────────
//
// Type-safe re-export of challenge.config.json.
// The registry (lib/registry.ts) reads the JSON directly via fs.readFileSync;
// this TS file is for challenge code that needs typed access.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
