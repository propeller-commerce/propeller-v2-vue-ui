import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

/**
 * Library build for `propeller-v2-vue-ui`.
 *
 * Three entry points:
 *   - `src/index.ts`  → the Vue surface: components, composables, the
 *                       provider, `createServices`, `toPlain`.
 *   - `src/shared.ts` → runtime-agnostic surface — pure TS, no Vue. Safe to
 *                       import from a Nuxt server context, a script, or a
 *                       test. Contains the SDK factory and the framework-free
 *                       utilities.
 *   - `src/pure.ts`   → SSR-safe presentational components only (no
 *                       composables, no browser APIs). Cheap to import into
 *                       a server-render module for the static shell.
 *
 * Unlike the React package there is no `"use client"` banner to deal with —
 * Vue has no such directive. Output is plain ESM + CJS + `.d.ts`.
 *
 * `vite build` empties `dist/` first, so the Tailwind stylesheet
 * (`dist/styles.css`, produced by `npm run build:css`) MUST be compiled
 * *after* this build — see the `build` script ordering in package.json.
 */

// Dependencies the consumer already has (or that the package declares as
// peers / regular deps) — left as imports rather than bundled.
const EXTERNAL = [
  'vue',
  '@propeller-commerce/propeller-sdk-v2',
  '@vueuse/core',
  'class-variance-authority',
  'clsx',
  'lodash.debounce',
  'lucide-vue-next',
  'marked',
  'qs',
  'swiper',
  'tailwind-merge',
  'vue-hot-toast',
];

export default defineConfig({
  plugins: [
    vue(),
    dts({
      // Emit one `.d.ts` per entry, rolled up, into dist/.
      entryRoot: 'src',
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.test.ts', 'src/**/*.stories.ts'],
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        shared: resolve(__dirname, 'src/shared.ts'),
        pure: resolve(__dirname, 'src/pure.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: (id) =>
        EXTERNAL.includes(id) || EXTERNAL.some((dep) => id.startsWith(`${dep}/`)),
    },
    sourcemap: true,
    // Library output is the package's public surface — keep it readable.
    minify: false,
    target: 'es2022',
  },
});
