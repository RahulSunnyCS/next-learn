// ─── challenge.config.ts — C21 Testing ────────────────────────────────────
//
// Typed re-export of challenge.config.json.
//
// The registry (lib/registry.ts) reads the JSON file directly using
// fs.readFileSync — not this TypeScript file — to avoid dynamic-require
// limitations in Turbopack.  This file exists so that challenge code that
// needs typed access can `import config from './_meta/challenge.config'`
// and get the full ChallengeConfig type.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
