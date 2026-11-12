// OrderTotals must not count shipping in the subtotal: `total.gross` already includes it.

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import OrderTotals from '../OrderTotals.vue';

const row = (html: string, name: string) =>
  html.match(new RegExp(`data-row="${name}"[^]*?propeller-order-totals__value"[^>]*>([^<]*)<`))?.[1]?.trim();

const render = (order: unknown) =>
  renderToString(createSSRApp({ render: () => h(OrderTotals, { order: order as any, language: 'EN', formatPrice: String }) }));

describe('OrderTotals', () => {
  it('shows the lines as the subtotal, without the shipping costs', async () => {
    const html = await render({
      total: { gross: 800.58, net: 968.7, tax: 168.12, discountType: 'N', discountValue: 0, taxPercentages: [] },
      postageData: { gross: 24.79 },
      paymentData: { gross: 0 },
    });
    expect(row(html, 'subtotal')).toBe('775.79');
    expect(row(html, 'shipping-costs')).toBe('24.79');
    expect(row(html, 'total-excl-vat')).toBe('800.58');
  });

  it('shows the subtotal after an amount discount without the costs', async () => {
    const html = await render({
      total: { gross: 56.575, net: 68.46, tax: 11.88, discountType: 'A', discountValue: 4, taxPercentages: [] },
      postageData: { gross: 10 },
      paymentData: { gross: 25 },
    });
    expect(row(html, 'subtotal')).toBe('25.575');
    expect(row(html, 'subtotal-with-discount')).toBe('21.575');
  });
});
