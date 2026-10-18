// ClusterCard withholds price and stock from anonymous visitors in a semi-closed portal.

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ClusterCard from '../ClusterCard.vue';

const CLUSTER = {
  clusterId: 7,
  sku: 'CL-7',
  names: [{ language: 'NL', value: 'Cluster zeven' }],
  slugs: [{ language: 'NL', value: 'cluster-zeven' }],
  defaultProduct: {
    productId: 70,
    price: { gross: 282.17, net: 341.43 },
    inventory: { totalQuantity: 135 },
  },
} as any;

const CONFIGURATION = { urls: { getClusterUrl: () => '/cluster/7/cluster-zeven' } };

const render = (props: Record<string, unknown>) =>
  renderToString(
    createSSRApp({
      render: () =>
        h(ClusterCard as any, {
          cluster: CLUSTER,
          configuration: CONFIGURATION,
          language: 'NL',
          showStock: true,
          ...props,
        }),
    })
  );

describe('ClusterCard in a semi-closed portal', () => {
  it('hides price and stock from an anonymous visitor', async () => {
    const html = await render({ portalMode: 'semi-closed', user: null });
    expect(html).not.toContain('282');
    expect(html).not.toContain('135');
  });

  it('shows price and stock to a logged-in visitor', async () => {
    const html = await render({ portalMode: 'semi-closed', user: { contactId: 1 } });
    expect(html).toContain('282');
  });

  it('shows the price in an open portal', async () => {
    const html = await render({ portalMode: 'open', user: null });
    expect(html).toContain('282');
  });
});
