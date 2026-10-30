/**
 * Pins the provider setup the README documents: deps app-wide via the
 * `propellerVue` plugin, per-scope state via `<PropellerProvider>`.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
import * as pkg from '../../index';

const { propellerVue, PropellerProvider, createServices, useServices, usePropellerContext } = pkg;

const graphqlClient = new GraphQLClient({ endpoint: 'https://example.test/graphql' });
const services = createServices(graphqlClient);

const Probe = defineComponent({
  setup() {
    const s = useServices();
    const infra = usePropellerContext();
    return () => h('span', `${s === services}|${infra?.language}|${infra?.currency}`);
  },
});

const Root = defineComponent({
  render: () => h(PropellerProvider, { language: 'EN' }, { default: () => h(Probe) }),
});

describe('documented provider setup', () => {
  it('exposes services and scope through the plugin and PropellerProvider', async () => {
    const app = createSSRApp(Root);
    app.use(propellerVue, { graphqlClient, services, currency: '€', configuration: {} });
    expect(await renderToString(app)).toContain('true|EN|€');
  });

  it('throws when the plugin is not installed', async () => {
    await expect(renderToString(createSSRApp(Root))).rejects.toThrow(/propellerVue/);
  });

  it('does not export a providePropeller function', () => {
    expect('providePropeller' in pkg).toBe(false);
  });
});
