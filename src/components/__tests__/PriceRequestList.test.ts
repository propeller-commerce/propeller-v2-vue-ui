/**
 * PriceRequestList — the anti-spam honeypot field.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import PriceRequestList from '../PriceRequestList.vue';

const items = [{ productId: 1, code: 'SKU-1', name: 'Widget', quantity: 1, minQuantity: 1, unit: 1 }];

const render = (props: Record<string, unknown>) =>
  renderToString(createSSRApp({ render: () => h(PriceRequestList, props as never) }));

function honeypotInput(html: string): string {
  const m = html.match(/<input[^>]*name="website"[^>]*>/);
  expect(m).not.toBeNull();
  return m![0];
}

describe('PriceRequestList — honeypot', () => {
  it('renders an off-screen, unfocusable website input', async () => {
    const html = await render({ items });
    expect(html).toContain('propeller-price-request__honeypot');
    const input = honeypotInput(html);
    expect(input).toContain('tabindex="-1"');
    expect(input).toMatch(/autocomplete="off"/i);
    expect(input).toContain('aria-hidden="true"');
    expect(input).toContain('id="propeller-price-request-website"');
    expect(html).toMatch(/class="propeller-price-request__honeypot"[^>]*style="[^"]*position:absolute[^"]*left:-10000px/);
    expect(html).not.toMatch(/class="propeller-price-request__honeypot[^"]*hidden/);
  });

  it('labels the field, with a default and an override', async () => {
    expect(await render({ items })).toMatch(
      /<label[^>]*for="propeller-price-request-website"[^>]*>\s*Leave this field empty\s*<\/label>/
    );
    expect(await render({ items, labels: { honeypotLabel: 'Laat leeg' } })).toMatch(/>\s*Laat leeg\s*<\/label>/);
  });

  it('is not rendered for an empty list', async () => {
    expect(await render({ items: [] })).not.toContain('name="website"');
  });
});
