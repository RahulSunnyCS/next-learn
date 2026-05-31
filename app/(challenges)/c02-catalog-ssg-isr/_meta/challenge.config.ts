// ─── challenge.config.ts — c02-catalog-ssg-isr ────────────────────────────
//
// Typed re-export of challenge.config.json for TypeScript callers inside
// this challenge's directory.
//
// The RUNTIME source of truth is challenge.config.json — the registry
// (lib/registry.ts) reads the JSON directly via fs.readFileSync.  This TS
// file exists solely to give challenge code a typed import path without
// dynamic require(), which Turbopack cannot handle.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
