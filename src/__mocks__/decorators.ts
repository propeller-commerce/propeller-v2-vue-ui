/**
 * Storybook decorators for propeller-v2-vue-ui.
 *
 * Most components resolve infrastructure (`services`, `user`, `language`,
 * `currency`, …) from the Propeller plugin + `<PropellerProvider>` via
 * `useInfraProps()` / `useServices()`. A story that renders such a component
 * must therefore install the plugin AND mount inside the provider.
 *
 * For stories we don't go through `app.use(propellerVue)` because story apps
 * are recreated per render and don't expose `app` to the decorator. Instead
 * we `provide(PropellerDepsKey, deps)` from the wrapper component, which
 * lands in the same injection slot the plugin would use.
 *
 * Pure display components (ProductPrice, Breadcrumbs, …) take everything as
 * props and do not need this decorator — applying it anyway is harmless, so
 * stories can use it uniformly.
 */
import { defineComponent, h, provide } from 'vue';
import type { Decorator, StoryContext } from '@storybook/vue3-vite';
import type { GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
import { PropellerDepsKey, type PropellerDeps } from '../plugin';
import PropellerProvider from '../components/PropellerProvider.vue';
import type { PropellerScope } from '../context/PropellerContext';
import { mockServices } from './mockServices';
import { makeContact } from './fixtures';

// The plugin's value object types `graphqlClient` as a GraphQLClient.
// Stories never make a real request — the mock Services intercept every
// call — so a non-functional stand-in satisfies the type without a network.
const dummyClient = {} as GraphQLClient;

/** The default deps a story runs against. */
function defaultDeps(): PropellerDeps {
  return {
    graphqlClient: dummyClient,
    services: mockServices,
    currency: '€',
    configuration: {},
  };
}

/** The default scope a story runs against. */
function defaultScope(): PropellerScope {
  return {
    user: makeContact(),
    companyId: 3001,
    language: 'EN',
    includeTax: false,
    portalMode: 'open',
  };
}

/**
 * Wrap a story so it runs inside the Propeller plugin + provider with mock infra.
 *
 * Override individual scope/deps fields per-story via the `propeller` parameter:
 *
 *   export const Anonymous: Story = {
 *     parameters: { propeller: { user: null } },
 *   };
 */
export const withPropeller: Decorator = (story, context: StoryContext) => {
  const overrides = (context.parameters.propeller ?? {}) as Partial<
    PropellerDeps & PropellerScope
  >;
  const deps: PropellerDeps = {
    ...defaultDeps(),
    ...(overrides as Partial<PropellerDeps>),
  };
  const scope: PropellerScope = {
    ...defaultScope(),
    ...(overrides as Partial<PropellerScope>),
  };
  return defineComponent({
    name: 'WithPropeller',
    setup() {
      provide(PropellerDepsKey, deps);
      return () =>
        h(
          PropellerProvider,
          {
            user: scope.user,
            companyId: scope.companyId,
            language: scope.language,
            includeTax: scope.includeTax,
            portalMode: scope.portalMode,
          },
          { default: () => h(story()) },
        );
    },
  });
};

/**
 * Constrain a story's width — many components (cards, cart items) are built
 * to fill their container; an unconstrained Storybook canvas stretches them
 * edge to edge. Wrap with a sensible max-width.
 */
export function withMaxWidth(px: number): Decorator {
  return (story) =>
    defineComponent({
      name: 'WithMaxWidth',
      setup() {
        return () =>
          h(
            'div',
            { style: { maxWidth: `${px}px`, margin: '1rem auto' } },
            [h(story())],
          );
      },
    });
}
