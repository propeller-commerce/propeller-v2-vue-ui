/**
 * ProductTabs — Downloads and Videos only when the product has them.
 *
 * Both tabs rendered unconditionally, so a product with no files showed a
 * Downloads tab whose panel said "No downloads" and a Videos tab saying
 * "No videos" (PWP-1061). They now follow Description: shown when there is
 * content to show.
 *
 * Mirrors the react-ui test of the same name — the two must stay in step.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ProductTabs from '../ProductTabs.vue';

const DESC = [{ language: 'NL', value: 'Een beschrijving' }];

function render(media: unknown) {
  const app = createSSRApp({
    render: () =>
      h(ProductTabs, {
        product: { productId: 1, descriptions: DESC, media } as never,
        language: 'NL',
      }),
  });
  return renderToString(app);
}

describe('ProductTabs — downloads and videos visibility', () => {
  it('hides both tabs when the product has neither', async () => {
    const html = await render({ documents: { items: [] }, videos: { items: [] } });
    expect(html).not.toContain('>Downloads<');
    expect(html).not.toContain('>Videos<');
  });

  it('hides both tabs when media is absent entirely', async () => {
    const html = await render(undefined);
    expect(html).not.toContain('>Downloads<');
    expect(html).not.toContain('>Videos<');
  });

  it('shows Downloads when the product has a document', async () => {
    const html = await render({ documents: { items: [{ documents: [] }] }, videos: { items: [] } });
    expect(html).toContain('>Downloads<');
    expect(html).not.toContain('>Videos<');
  });

  it('shows Videos when the product has a video', async () => {
    const html = await render({ documents: { items: [] }, videos: { items: [{ videos: [] }] } });
    expect(html).toContain('>Videos<');
    expect(html).not.toContain('>Downloads<');
  });

  // Description and Specifications are unaffected by this change.
  it('still shows description and specifications', async () => {
    const html = await render({ documents: { items: [] }, videos: { items: [] } });
    expect(html).toContain('>Description<');
    expect(html).toContain('>Specifications<');
  });
});
