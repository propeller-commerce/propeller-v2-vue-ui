import type { Preview } from '@storybook/vue3-vite';

// The precompiled package stylesheet — produced by `npm run build:css`,
// which the `storybook` / `build-storybook` scripts run first. Stories
// render with the real component styling.
import '../dist/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#111111' },
      ],
    },
  },
};

export default preview;
