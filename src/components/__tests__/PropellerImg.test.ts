/** The image seam: plain `<img>` by default, the host's component when injected. */

import { describe, it, expect } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import PropellerImg from '../PropellerImg.vue';
import { PropellerDepsKey } from '../../plugin';

/** Stand-in for a host's `<NuxtImg>` wrapper. */
const HostImage = defineComponent({
  props: { src: { type: String, required: true }, alt: { type: String, default: '' } },
  setup(props) {
    return () =>
      h('img', {
        'data-host': '1',
        src: `/_ipx/${encodeURIComponent(props.src)}`,
        alt: props.alt,
      });
  },
});

const CDN = 'https://media.helice.cloud/x.webp';

/** Render a component with the plugin's deps provided, optionally injecting. */
async function render(node: ReturnType<typeof h>, imgComponent?: unknown): Promise<string> {
  const app = createSSRApp({ render: () => node });
  app.provide(PropellerDepsKey, { currency: '€', imgComponent } as never);
  return renderToString(app);
}

describe('PropellerImg', () => {
  it('renders a plain <img> when the host injects nothing', async () => {
    const html = await render(h(PropellerImg, { src: CDN, alt: 'Hose', className: 'h-full' }));
    expect(html).toContain(`src="${CDN}"`);
    expect(html).toContain('alt="Hose"');
    expect(html).not.toContain('data-host');
  });

  it('routes through the host component when injected on the plugin', async () => {
    const html = await render(h(PropellerImg, { src: CDN, alt: 'Hose' }), HostImage);
    expect(html).toContain('data-host="1"');
    expect(html).toContain('/_ipx/');
    // The bare CDN URL is the thing that escapes the crawler directives.
    expect(html).not.toContain(`src="${CDN}"`);
  });

  it('an explicit `as` overrides the plugin for one surface', async () => {
    const html = await render(h(PropellerImg, { src: CDN, alt: '', as: HostImage }));
    expect(html).toContain('data-host="1"');
  });

  it('forwards sizing and loading hints, and keeps an empty alt', async () => {
    const html = await render(
      h(PropellerImg, { src: '/a.webp', alt: '', width: 32, height: 32, loading: 'lazy' })
    );
    expect(html).toContain('width="32"');
    expect(html).toContain('height="32"');
    expect(html).toContain('loading="lazy"');
    // Vue SSR serialises an empty string attribute bare — still an empty alt,
    // which is what a decorative image needs.
    expect(html).toMatch(/alt(=""|\s|>)/);
  });
});
