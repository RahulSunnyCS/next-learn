// @tailwindcss/postcss is the Tailwind 4 PostCSS integration.  In v4 the
// separate autoprefixer plugin is not needed because @tailwindcss/postcss
// bundles Lightning CSS (which handles prefixing) in production builds.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
