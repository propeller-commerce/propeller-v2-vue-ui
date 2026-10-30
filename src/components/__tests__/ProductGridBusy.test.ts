/**
 * ProductGrid — loading is exposed to assistive tech via aria-busy.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ProductGrid from '../ProductGrid.vue';

const render = (isLoading: boolean) =>
  renderToString(createSSRApp({ render: () => h(ProductGrid, { products: [], isLoading }) }));

describe('ProductGrid — aria-busy', () => {
  it('is busy while loading', async () => {
    expect(await render(true)).toMatch(/class="propeller-product-grid [^"]*"[^>]*aria-busy="true"/);
  });

  it('is not busy once loaded', async () => {
    expect(await render(false)).not.toContain('aria-busy="true"');
  });
});
