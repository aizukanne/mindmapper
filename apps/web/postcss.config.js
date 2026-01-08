/**
 * PostCSS Configuration
 *
 * This configuration processes CSS through the following pipeline:
 * 1. tailwindcss - Processes Tailwind directives (@tailwind, @apply, etc.)
 * 2. autoprefixer - Adds vendor prefixes for cross-browser compatibility
 *
 * The configuration supports:
 * - Tailwind CSS 3.x with JIT mode enabled
 * - Modern CSS features with automatic vendor prefixing
 * - Optimized for both development and production builds
 */
export default {
  plugins: {
    // Tailwind CSS processing
    tailwindcss: {},

    // Autoprefixer for vendor prefixes
    // Uses browserslist config from package.json or .browserslistrc
    autoprefixer: {
      // Flexbox prefixes for better compatibility
      flexbox: 'no-2009',
      // Grid prefixes for CSS Grid support in older browsers
      grid: 'autoplace',
    },
  },
};
