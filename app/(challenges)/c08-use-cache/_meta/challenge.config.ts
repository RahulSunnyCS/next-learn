// ─── challenge.config.ts — C08 Current Caching Model ('use cache') ───────────
//
// This file provides type-safe access to the challenge config for TypeScript
// code within this challenge directory. The RUNTIME source of truth is the
// companion challenge.config.json — the registry reads the JSON directly via
// fs.readFileSync to avoid dynamic-require issues with Turbopack.

import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
