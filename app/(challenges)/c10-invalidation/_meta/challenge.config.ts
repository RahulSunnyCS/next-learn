// ─── challenge.config.ts — C10 Invalidation + Dynamic Triggers + Footguns ───
//
// Type-safe re-export of the JSON config. The registry reads the JSON directly
// (Turbopack cannot handle dynamic require); this .ts file exists purely for
// IDE support and typed imports inside the challenge.
//
import type { ChallengeConfig } from "@/lib/registry";
import configData from "./challenge.config.json";

const config: ChallengeConfig = configData as ChallengeConfig;
export default config;
