/**
 * Infra props fall back to the provider, as in react-ui.
 *
 * ForgotPassword, RegisterForm, ProductTabs, Breadcrumbs and the CartSummary
 * quote button read graphqlClient / language / configuration / user from their
 * props only. The apps leave those props out, so on propeller-vue and
 * propeller-nuxt the password reset and registration failed before any
 * request, the specifications tab stayed empty, English breadcrumbs linked to
 * Dutch 404s and a Contact never got the quote button (storefront-testing
 * pins, 2026-11-04; PWP-971).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSSRApp, h, ref, toRaw } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { PropellerScopeKey } from '../../context/PropellerContext';
import { PropellerDepsKey } from '../../plugin';

const seen = vi.hoisted(() => ({ auth: [] as any[], specs: [] as any[] }));

vi.mock('../../composables/vue/useAuth', () => ({
  useAuth: (opts: any) => {
    seen.auth.push(opts);
    return { loading: ref(false), error: ref(null), forgotPassword: vi.fn(), registerContact: vi.fn(), registerCustomer: vi.fn() };
  },
}));
vi.mock('../../composables/vue/useProductSpecs', () => ({
  useProductSpecs: (opts: any) => {
    seen.specs.push(opts);
    return { attributes: ref([]), fetchSpecs: vi.fn() };
  },
}));

import ForgotPassword from '../ForgotPassword.vue';
import RegisterForm from '../RegisterForm.vue';
import ProductTabs from '../ProductTabs.vue';
import Breadcrumbs from '../Breadcrumbs.vue';
import CartSummary from '../CartSummary.vue';

const providerClient = { execute: async () => ({ data: {} }) } as never;
const configuration = {
  baseCategoryId: 1,
  urls: { getCategoryUrl: (cat: any, lang: string) => `/${lang.toLowerCase()}/category/${cat.categoryId}` },
};
const contact = { contactId: 73, firstName: 'Test' };

/** Render inside an English shop whose plugin + provider carry the infra. */
function renderInShop(component: any, props: Record<string, unknown>) {
  const app = createSSRApp({ render: () => h(component, props) });
  app.provide(PropellerDepsKey, { graphqlClient: providerClient, configuration } as any);
  app.provide(PropellerScopeKey, { language: 'EN', includeTax: false, portalMode: 'open', user: contact } as any);
  return renderToString(app);
}

beforeEach(() => {
  seen.auth.length = 0;
  seen.specs.length = 0;
});

describe('infra props fall back to the provider', () => {
  it('ForgotPassword hands the provider client to useAuth', async () => {
    await renderInShop(ForgotPassword, {});
    expect(toRaw(seen.auth[0].graphqlClient)).toBe(providerClient);
  });

  it('RegisterForm hands the provider client to useAuth', async () => {
    await renderInShop(RegisterForm, { showUserType: 'Customer' });
    expect(toRaw(seen.auth[0].graphqlClient)).toBe(providerClient);
  });

  it('ProductTabs fetches specifications with the provider client and language', async () => {
    await renderInShop(ProductTabs, { product: { productId: 1, descriptions: [] } });
    expect(toRaw(seen.specs[0].graphqlClient)).toBe(providerClient);
    expect(seen.specs[0].language.value).toBe('EN');
  });

  it('Breadcrumbs builds English links through the provider configuration', async () => {
    const path = [
      { categoryId: 1, names: [{ language: 'NL', value: 'Root' }] },
      { categoryId: 1332, names: [{ language: 'NL', value: 'Kantoor' }, { language: 'EN', value: 'Office' }] },
      { categoryId: 1333, names: [{ language: 'EN', value: 'Paper' }] },
    ];
    const html = await renderInShop(Breadcrumbs, { categoryPath: path });
    expect(html).toContain('href="/en/category/1332"');
    expect(html).toContain('Office');
    expect(html).not.toContain('Root'); // the configured base category is dropped
  });

  it('CartSummary offers the quote request to the provider user', async () => {
    const html = await renderInShop(CartSummary, { cart: { cartId: 'c1', items: [] }, onRequestQuoteClick: () => {} });
    expect(html).toContain('propeller-cart-summary__quote-btn');
  });

  it('still lets an explicit prop win over the provider', async () => {
    const own = { execute: async () => ({ data: {} }) } as never;
    await renderInShop(ForgotPassword, { graphqlClient: own });
    expect(toRaw(seen.auth[0].graphqlClient)).toBe(own);
  });
});
