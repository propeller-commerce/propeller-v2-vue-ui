import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for propeller-v2-vue-ui.
 *
 * Covers the *pure-logic* surface: `src/lib/` (createServices, toPlain) and
 * `src/composables/shared/utils/` (formatters, truncation, attribute
 * extraction, etc.). These are framework-free functions — no Vue, no DOM,
 * no SDK calls — so the `node` environment is sufficient and fast.
 *
 * Component tests (which would need a mock-SDK + a provider wrapper, and the
 * `jsdom` environment) are intentionally NOT in scope here — components are
 * verified by the consumer's Playwright e2e suite via the downstream CI gate.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/composables/shared/utils/**/*.ts'],
      // The shared cart helpers (cartInit / fetchActiveCart /
      // mergeAnonymousCart) orchestrate SDK service calls — they need a mock
      // Services bundle to test meaningfully, which belongs with
      // component-level test work, not this pure-logic pass.
      exclude: [
        'src/composables/shared/utils/cartInit.ts',
        'src/composables/shared/utils/fetchActiveCart.ts',
        'src/composables/shared/utils/mergeAnonymousCart.ts',
      ],
    },
  },
});
