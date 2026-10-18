// A semi-closed portalMode set only on the provider hides prices in filters, cluster options and cluster cards.

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { PropellerScopeKey } from '../../context/PropellerContext';
import { PropellerDepsKey } from '../../plugin';
import GridFilters from '../GridFilters.vue';
import ClusterOptions from '../ClusterOptions.vue';
import ClusterCard from '../ClusterCard.vue';

const OPTIONS = [
  {
    id: 3,
    isRequired: 'N',
    hidden: 'N',
    names: [{ language: 'NL', value: 'Montage' }],
    products: [
      { productId: 31, names: [{ language: 'NL', value: 'Met montage' }], price: { gross: 47.5, net: 57.48 } },
    ],
  },
] as any;

const CLUSTER = {
  clusterId: 7,
  sku: 'CL-7',
  names: [{ language: 'NL', value: 'Cluster zeven' }],
  slugs: [{ language: 'NL', value: 'cluster-zeven' }],
  defaultProduct: { productId: 70, price: { gross: 282.17, net: 341.43 } },
} as any;

const CONFIGURATION = { urls: { getClusterUrl: () => '/cluster/7/cluster-zeven' } };

function renderInPortal(portalMode: string, user: unknown, component: any, props: Record<string, unknown>) {
  const app = createSSRApp({ render: () => h(component, props) });
  app.provide(PropellerDepsKey, {} as any);
  app.provide(PropellerScopeKey, { language: 'NL', includeTax: false, portalMode, user } as any);
  return renderToString(app);
}

const CASES = [
  ['GridFilters price range', GridFilters, { priceMin: 10, priceMax: 500, filters: [] }, 'propeller-grid-filters__price'],
  ['ClusterOptions option price', ClusterOptions, { clusterId: 7, options: OPTIONS }, '47,50'],
  ['ClusterCard price', ClusterCard, { cluster: CLUSTER, configuration: CONFIGURATION }, '282,17'],
] as const;

describe.each(CASES)('%s with portalMode from the provider', (_name, component, props, marker) => {
  it('is hidden from an anonymous visitor in a semi-closed portal', async () => {
    const html = await renderInPortal('semi-closed', null, component, props);
    expect(html).not.toContain(marker);
  });

  it('is shown to a logged-in visitor', async () => {
    const html = await renderInPortal('semi-closed', { contactId: 1 }, component, props);
    expect(html).toContain(marker);
  });

  it('is shown in an open portal', async () => {
    const html = await renderInPortal('open', null, component, props);
    expect(html).toContain(marker);
  });
});
