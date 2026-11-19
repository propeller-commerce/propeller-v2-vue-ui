// @vitest-environment happy-dom
// SearchBar autosuggest prices follow the shared `isContentHidden` rule.
//
// The dropdown opens from a watcher on the search results, which a server
// render never runs, so this file mounts in happy-dom instead of using
// `vue/server-renderer` like the other component tests. `useProductSearch` is
// replaced by refs the test fills; everything else is the real component.
// `showPrice` is passed explicitly: Vue casts the absent Boolean prop to false.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp, h, nextTick, type App, type Ref } from 'vue';
import { PropellerScopeKey } from '../../context/PropellerContext';
import { PropellerDepsKey } from '../../plugin';
import SearchBar from '../SearchBar.vue';
import ProductBulkPrices from '../ProductBulkPrices.vue';
import * as productSearch from '../../composables/vue/useProductSearch';

vi.mock('../../composables/vue/useProductSearch', async () => {
  const { ref } = await import('vue');
  const searchResults = ref<unknown[]>([]);
  return {
    searchResults,
    useProductSearch: () => ({
      search: () => {},
      searchResults,
      searchItemsFound: ref(1),
      searchLoading: ref(false),
      searchError: ref(null),
    }),
  };
});

// ponytail: core-ui <= 0.13.1 applies the guest rule to `semi-closed` only; the
// `closed` rule ships with core-ui's security-review-fixes (2450f32). Until the
// pin includes it, map closed onto the same rule so these tests pin this
// package's wiring. A no-op once core-ui ships it; delete it then.
vi.mock('@propeller-commerce/propeller-v2-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@propeller-commerce/propeller-v2-core-ui')>();
  return {
    ...actual,
    isContentHidden: (...[mode, user, isAuthenticated]: Parameters<typeof actual.isContentHidden>) =>
      actual.isContentHidden(mode === 'closed' ? 'semi-closed' : mode, user, isAuthenticated),
  };
});

const searchResults = (productSearch as unknown as { searchResults: Ref<unknown[]> }).searchResults;

const RESULTS = [
  {
    productId: 41,
    sku: 'DRILL-41',
    names: [{ language: 'NL', value: 'Boormachine' }],
    slugs: [{ language: 'NL', value: 'boormachine' }],
    price: { gross: 123.45, net: 149.37 },
  },
];

const CONTACT = { contactId: 1 };

let app: App | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = undefined;
  host = undefined;
});

/** Mount `component` under a provider scope and return its root element. */
async function mount(
  component: any,
  props: Record<string, unknown>,
  scope: Record<string, unknown>,
  slots?: Record<string, () => unknown>,
): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.appendChild(host);
  app = createApp({ render: () => h(component, props, slots) });
  app.provide(PropellerDepsKey, {} as any);
  app.provide(PropellerScopeKey, { language: 'NL', includeTax: false, ...scope } as any);
  app.mount(host);
  await nextTick();
  return host;
}

/** Mount SearchBar, then deliver the search results so the dropdown opens. */
async function mountSearchBar(
  scope: Record<string, unknown>,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => unknown>,
): Promise<HTMLElement> {
  searchResults.value = [];
  const el = await mount(SearchBar, { language: 'NL', showPrice: true, ...props }, scope, slots);
  searchResults.value = RESULTS.map((r) => ({ ...r }));
  await nextTick();
  await nextTick();
  return el;
}

describe('SearchBar autosuggest prices', () => {
  it('renders the result and its price in an open portal (fixture sanity)', async () => {
    const el = await mountSearchBar({ portalMode: 'open', user: null });
    expect(el.textContent).toContain('Boormachine');
    expect(el.querySelector('.propeller-search-bar__result-price')).not.toBeNull();
    expect(el.textContent).toContain('123,45');
  });

  it.each(['semi-closed', 'closed'])('hides the price from a guest in a %s portal', async (portalMode) => {
    const el = await mountSearchBar({ portalMode, user: null });
    expect(el.textContent).toContain('Boormachine');
    expect(el.querySelector('.propeller-search-bar__result-price')).toBeNull();
    expect(el.textContent).not.toContain('123,45');
    expect(el.textContent).not.toContain('149,37');
  });

  it('hides the price when portalMode is passed as a prop instead of the provider', async () => {
    const el = await mountSearchBar({ portalMode: 'open', user: null }, { portalMode: 'closed' });
    expect(el.textContent).toContain('Boormachine');
    expect(el.querySelector('.propeller-search-bar__result-price')).toBeNull();
  });

  it.each(['semi-closed', 'closed'])('hides "Price on request" from a guest in a %s portal', async (portalMode) => {
    searchResults.value = [];
    const el = await mount(SearchBar, { language: 'NL', showPrice: true }, { portalMode, user: null });
    searchResults.value = [{ ...RESULTS[0], priceData: { display: 'ON_REQUEST' } }];
    await nextTick();
    await nextTick();
    expect(el.textContent).toContain('Boormachine');
    expect(el.querySelector('.propeller-search-bar__result-price')).toBeNull();
  });

  it('skips the #price slot for a guest in a semi-closed portal', async () => {
    const el = await mountSearchBar({ portalMode: 'semi-closed', user: null }, {}, {
      price: () => h('span', { class: 'custom-price' }, 'custom'),
    });
    expect(el.textContent).toContain('Boormachine');
    expect(el.querySelector('.custom-price')).toBeNull();
  });

  it.each(['semi-closed', 'closed'])('shows the price to a logged-in user in a %s portal', async (portalMode) => {
    const el = await mountSearchBar({ portalMode, user: CONTACT });
    expect(el.querySelector('.propeller-search-bar__result-price')).not.toBeNull();
    expect(el.textContent).toContain('123,45');
  });

  // As a prop: the Vue provider composite (buildInfra) does not forward the
  // scope's isAuthenticated today.
  it('shows the price while the user is still loading but a session exists (isAuthenticated)', async () => {
    const el = await mountSearchBar({ portalMode: 'closed', user: null }, { isAuthenticated: true });
    expect(el.textContent).toContain('123,45');
  });
});

describe('ProductBulkPrices in a closed portal', () => {
  const TIERS = [
    { quantity: 10, gross: 9.5, net: 11.5 },
    { quantity: 50, gross: 8.75, net: 10.59 },
  ];

  it('hides the tier table from a guest', async () => {
    const el = await mount(ProductBulkPrices, { bulkPrices: TIERS }, { portalMode: 'closed', user: null });
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).not.toContain('8,75');
  });

  it('shows the tier table to a logged-in user', async () => {
    const el = await mount(ProductBulkPrices, { bulkPrices: TIERS }, { portalMode: 'closed', user: CONTACT });
    expect(el.querySelector('table')).not.toBeNull();
    expect(el.textContent).toContain('8,75');
  });
});
