import type { StorybookConfig } from '@storybook/vue3-vite';

/**
 * Storybook configuration for propeller-v2-vue-ui.
 *
 * Storybook is the component workbench: every public component has a story
 * that renders it in isolation against fixture data and a mock Propeller
 * provider (see src/__mocks__/). This is *not* a substitute for the
 * consumer's e2e suite — it's for developing and visually reviewing
 * components without a running storefront or a live backend.
 *
 * Storybook 9 ships the docs and controls addons in core, so there is no
 * separate addons list. Prop tables on the Docs tab are auto-generated from
 * each component's TypeScript prop interface by `vue-docgen-api`, which the
 * `@storybook/vue3-vite` framework wires in automatically.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
};

export default config;
