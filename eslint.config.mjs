// ESLint flat config — required by eslint-config-next 16 (ESLint 9+).
// The next config preset handles: @next/eslint-plugin-next, react,
// react-hooks, typescript-eslint, import, and jsx-a11y.
// See: https://nextjs.org/docs/app/api-reference/config/eslint

import nextConfig from "eslint-config-next";

// Spread the Next.js recommended rules array (it is already a flat config
// array).  eslint-config-next also installs global ignores for .next/**,
// out/**, build/**, and next-env.d.ts.
const config = [...nextConfig];

export default config;
