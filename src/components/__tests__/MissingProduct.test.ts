/**
 * Order and quote lines whose product came back null.
 *
 * A product that is hidden, withdrawn or deleted from the catalog still appears
 * on every order and quote it was sold on, but the API returns no product
 * record for it — `orderItem.product` is simply absent. The order item carries
 * its own snapshot of the line (name, sku, quantity, prices) taken when the
 * order was placed, so the row has to render from that alone: no image, no
 * localized name, no PDP link.
 *
 * Rendered through `vue/server-renderer` rather than a DOM harness — the card
 * is a pure display component, so SSR output is the whole of its behaviour and
 * the package needs neither jsdom nor a provider wrapper to assert on it.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import OrderItemCard from '../OrderItemCard.vue';

/** A quote line whose product is gone from the catalog. */
const HIDDEN_ITEM = {
  id: 9,
  name: 'Verborgen product',
  sku: 'HID-1',
  quantity: 3,
  price: 10,
  originalPrice: 12,
  discount: 2,
  priceTotal: 30.77,
} as any;

/** The same line, but the catalog still has the product. */
const VISIBLE_ITEM = {
  ...HIDDEN_ITEM,
  product: {
    productId: 42,
    sku: 'CAT-42',
    names: [{ language: 'NL', value: 'Zichtbaar product' }],
    slugs: [{ language: 'NL', value: 'zichtbaar-product' }],
    price: { gross: 10, net: 12.1 },
  },
} as any;

const render = (props: Record<string, unknown>) =>
  renderToString(
    createSSRApp({ render: () => h('table', [h(OrderItemCard as any, props)]) })
  );

const Injected = { render: () => h('span', 'injected') };

describe('OrderItemCard with no product', () => {
  it('falls back to the order item for the name and the sku', async () => {
    const html = await render({ orderItem: HIDDEN_ITEM, language: 'NL' });
    expect(html).toContain('Verborgen product');
    expect(html).toContain('HID-1');
  });

  it('renders no thumbnail and no PDP link', async () => {
    const html = await render({ orderItem: HIDDEN_ITEM, language: 'NL', titleLinkable: true });
    expect(html).toContain('propeller-order-item-card__image-placeholder');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<a ');
  });

  it('still prices the line from the order item', async () => {
    const html = await render({ orderItem: HIDDEN_ITEM, language: 'NL', showDiscount: true });
    expect(html).toContain('30,77');
    expect(html).toContain('2,00');
  });

  // The regression: an injected price slot is handed `product.price`, which a
  // product-less line does not have. Passing `undefined` rendered an empty
  // price cell and the line total vanished from the row.
  //
  // Asserted on the rendered element, not the bare word — Vue keeps the
  // template's HTML comments in SSR output and one of them says "injected".
  it('bypasses an injected price component and keeps the line total', async () => {
    const html = await render({ orderItem: HIDDEN_ITEM, language: 'NL', priceComponent: Injected });
    expect(html).not.toContain('<span>injected</span>');
    expect(html).toContain('30,77');
  });

  it('still delegates to the injected price component when the product is there', async () => {
    const html = await render({ orderItem: VISIBLE_ITEM, language: 'NL', priceComponent: Injected });
    expect(html).toContain('<span>injected</span>');
  });

  it('links and localizes normally when the product is there', async () => {
    const html = await render({ orderItem: VISIBLE_ITEM, language: 'NL' });
    expect(html).toContain('Zichtbaar product');
    expect(html).toContain('/product/42/zichtbaar-product');
    expect(html).toContain('CAT-42');
  });
});
