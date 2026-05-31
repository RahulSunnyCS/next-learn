// Tailwind CSS 4 is primarily CSS-first: the @import "tailwindcss" directive
// in globals.css handles the utility layers.  This JS config file is kept as
// an extension point for custom plugins or theme tokens if needed by later
// challenge tasks.  At T-00 it is intentionally minimal.
import type { Config } from "tailwindcss";

const config: Config = {
  // Tailwind 4 auto-detects source files from the filesystem; an explicit
  // content array is only needed when files are outside the project root.
  plugins: [],
};

export default config;
