/**
 * SSR-safety tests for Vue composables.
 *
 * These ensure every composable that touches a browser global is gated with
 * `typeof window !== 'undefined'` (or equivalent) and can be imported AND
 * instantiated inside a Node environment without throwing.
 *
 * Why: SSR (`entry-server.ts` in the consumer) renders Vue components on the
 * server, and composables run during that render. Any unguarded `localStorage`
 * / `window.X` access blows the whole request up.
 *
 * The test runs in vitest's Node env (per vitest.config.ts) — no jsdom, no
 * window, no localStorage. If a composable accesses one of those without a
 * typeof-guard, this file fails.
 */

import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';

// Sanity: we really are in Node, not jsdom.
describe('test environment', () => {
  it('is Node — window is undefined', () => {
    expect(typeof window).toBe('undefined');
  });

  it('Node — localStorage is undefined', () => {
    expect(typeof localStorage).toBe('undefined');
  });
});

function makeClient(): GraphQLClient {
  // Dummy endpoint; constructing GraphQLClient performs no network I/O.
  return new GraphQLClient({ endpoint: 'http://test.local/graphql', apiKey: '' });
}

describe('useAuth — SSR-safe', () => {
  it('imports without throwing', async () => {
    await expect(import('../useAuth')).resolves.toBeDefined();
  });

  it('factory call does not throw in Node', async () => {
    const { useAuth } = await import('../useAuth');
    expect(() =>
      useAuth({
        graphqlClient: makeClient(),
        language: 'NL',
      }),
    ).not.toThrow();
  });
});

describe('useCart — SSR-safe', () => {
  it('imports without throwing', async () => {
    await expect(import('../useCart')).resolves.toBeDefined();
  });

  it('factory call does not throw in Node', async () => {
    const { useCart } = await import('../useCart');
    expect(() =>
      useCart({
        graphqlClient: makeClient(),
        user: ref(null),
        configuration: {
          imageSearchFiltersGrid: {} as any,
          imageVariantFiltersSmall: {} as any,
        },
      }),
    ).not.toThrow();
  });
});

describe('useOrders — SSR-safe', () => {
  it('imports without throwing', async () => {
    await expect(import('../useOrders')).resolves.toBeDefined();
  });
});

describe('useMenu — SSR-safe', () => {
  it('imports without throwing', async () => {
    await expect(import('../useMenu')).resolves.toBeDefined();
  });
});

describe('usePurchaseAuthorization — SSR-safe', () => {
  it('imports without throwing', async () => {
    await expect(import('../usePurchaseAuthorization')).resolves.toBeDefined();
  });
});

describe('all other Vue composables — SSR-safe (import only)', () => {
  // Spread-import coverage: every composable that doesn't touch a browser
  // global still has to be importable in Node. If any of these starts pulling
  // in a DOM-only module via a transitive import, this catches it.
  const modules = [
    () => import('../useAddress'),
    () => import('../useCheckout'),
    () => import('../useClusterConfigurator'),
    () => import('../useCompany'),
    () => import('../useFavorites'),
    () => import('../useInfraProps'),
    () => import('../useProductBundles'),
    () => import('../useProductInfo'),
    () => import('../useProductSearch'),
    () => import('../useMachines'),
    () => import('../useSpareParts'),
    () => import('../useProductSlider'),
    () => import('../useProductSpecs'),
    () => import('../useResolvedProps'),
    () => import('../useServices'),
  ];

  for (const mod of modules) {
    const name = mod.toString().match(/import\(['"]\.\.\/(\w+)['"]\)/)?.[1] ?? 'unknown';
    it(`${name} imports without throwing`, async () => {
      await expect(mod()).resolves.toBeDefined();
    });
  }
});
