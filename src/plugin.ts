import type { App, InjectionKey } from 'vue';
import { inject } from 'vue';
import type { GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
import type { Services } from '@propeller-commerce/propeller-v2-core-ui';

/**
 * Tier 1 — application-wide infrastructure. Installed once at app startup via
 * `app.use(propellerVue, { … })`. These values are app-singletons: the
 * GraphQL client, the SDK Services bundle wired to it, and the cosmetic /
 * branding defaults (currency, configuration). They do not change per
 * subtree — for per-scope state (user, companyId, language) use
 * `<PropellerProvider>` instead.
 */
export interface PropellerDeps {
  /**
   * The GraphQL client the consumer constructed. Exposed for code that needs
   * to pass it back into SDK helpers (rare — most code should use `services`).
   */
  graphqlClient: GraphQLClient;
  /**
   * The Services bundle (`{ product, cart, user, ... }`) wired to
   * `graphqlClient`. Build it via `createServices(graphqlClient)`.
   */
  services: Services;
  /**
   * Currency symbol used by display components when formatting prices.
   * Default: `'€'`.
   */
  currency: string;
  /**
   * Free-form configuration bag forwarded to components — kept as `unknown`
   * so consumers can stuff extra config in without changing this interface.
   */
  configuration: unknown;
}

/** Symbol-keyed so it never collides with a consumer's own provide/inject. */
export const PropellerDepsKey: InjectionKey<PropellerDeps> =
  Symbol('propeller-deps');

export interface PropellerVuePluginOptions extends PropellerDeps {}

/**
 * Vue plugin: install the Propeller infrastructure singletons app-wide.
 *
 * Call once at startup, before mount:
 *
 * @example
 * import { propellerVue, createServices } from 'propeller-v2-vue-ui';
 * import { GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
 *
 * const graphqlClient = new GraphQLClient({ endpoint: '/api/graphql' });
 * app.use(propellerVue, {
 *   graphqlClient,
 *   services: createServices(graphqlClient),
 *   currency: '€',
 *   configuration: myConfig,
 * });
 *
 * Then wrap the routed tree with `<PropellerProvider>` to bind the per-scope
 * state (user / companyId / language / includeTax / portalMode).
 */
export const propellerVue = {
  install(app: App, options: PropellerVuePluginOptions) {
    if (!options || !options.graphqlClient || !options.services) {
      throw new Error(
        '[propeller-v2-vue-ui] propellerVue plugin requires { graphqlClient, services, currency, configuration }. ' +
          'Build services once via `createServices(graphqlClient)` and pass both in.'
      );
    }
    app.provide(PropellerDepsKey, {
      graphqlClient: options.graphqlClient,
      services: options.services,
      currency: options.currency ?? '€',
      configuration: options.configuration,
    });
  },
};

/**
 * Read the installed Propeller deps. Throws when the plugin wasn't installed —
 * that's an integration error the consumer fixes at app startup.
 */
export function usePropellerDeps(): PropellerDeps {
  const deps = inject(PropellerDepsKey, null);
  if (!deps) {
    throw new Error(
      '[propeller-v2-vue-ui] usePropellerDeps() called without the plugin. ' +
        'Add `app.use(propellerVue, { graphqlClient, services, currency, configuration })` at startup.'
    );
  }
  return deps;
}

/** Non-throwing variant — useful for standalone / story rendering. */
export function tryUsePropellerDeps(): PropellerDeps | null {
  return inject(PropellerDepsKey, null);
}
