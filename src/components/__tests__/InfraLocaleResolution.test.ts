/**
 * Money formatted at the `nl-NL` default because `language` never reached the
 * component.
 *
 * `localeForLanguage(undefined)` is `nl-NL`, so any money-rendering component
 * that reads `props.language` straight off its props prints Dutch separators
 * unless every single host remembers to pass the language. `ProductCard`
 * resolved it from the provider; the PDP price block, the volume-pricing table
 * and the cart lines read their props directly — so one page could show
 * `€ 1,42` in its hero price and `€1.70` on the cards beneath it.
 *
 * `CartItem` was the odd one: it declares `language` and `currency` in its
 * `RESOLVE_SPEC` and then formatted money off `props.*`, so the resolution was
 * dead code for exactly the keys this covers.
 *
 * Rendered through `vue/server-renderer` — these are display components, so
 * SSR output is the whole of their behaviour.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { PropellerScopeKey } from '../../context/PropellerContext';
import { PropellerDepsKey } from '../../plugin';
import ProductPrice from '../ProductPrice.vue';
import ProductBulkPrices from '../ProductBulkPrices.vue';

const PRICE = { gross: 30.77, net: 37.23 } as any;
const BULK = [{ quantity: 100, gross: 30.77, net: 37.23, discount: { quantityFrom: 100 } }] as any;

/** Render `component` inside an English storefront priced in pounds. */
function renderInEnShop(component: any, props: Record<string, unknown>) {
  const app = createSSRApp({ render: () => h(component, props) });
  app.provide(PropellerDepsKey, { currency: '\u00A3' } as any);
  app.provide(PropellerScopeKey, { language: 'EN', includeTax: false, portalMode: 'open', user: null } as any);
  return renderToString(app);
}

describe('money follows the provider language', () => {
  it('resolves the locale and currency for the PDP price block', async () => {
    const html = await renderInEnShop(ProductPrice, { price: PRICE });
    expect(html).toContain('\u00A330.77');
    expect(html).not.toContain('30,77');
  });

  it('resolves the locale and currency for the volume-pricing table', async () => {
    const html = await renderInEnShop(ProductBulkPrices, { bulkPrices: BULK });
    expect(html).toContain('\u00A330.77');
    expect(html).not.toContain('30,77');
  });

  it('still lets an explicit prop win over the provider', async () => {
    const html = await renderInEnShop(ProductPrice, { price: PRICE, language: 'NL', currency: '\u20AC' });
    expect(html).toContain('30,77');
  });

  it('falls back to the Dutch default with no provider at all', async () => {
    const app = createSSRApp({ render: () => h(ProductPrice, { price: PRICE }) });
    const html = await renderToString(app);
    expect(html).toContain('30,77');
  });
});
