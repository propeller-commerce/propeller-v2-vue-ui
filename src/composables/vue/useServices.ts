import { usePropellerDeps } from '../../plugin';
import type { Services } from '@propeller-commerce/propeller-v2-core-ui';

/**
 * Read the SDK services bundle from the Propeller plugin.
 *
 * The package ships no default `graphqlClient` / `services`. The consumer
 * constructs both at app startup and installs them via
 * `app.use(propellerVue, { graphqlClient, services, ... })`. Anything in
 * the app tree calls `useServices()` to get the bundle.
 *
 * Throws when the plugin wasn't installed — that's an integration error the
 * consumer fixes at app startup, not something to paper over with a singleton.
 */
export function useServices(): Services {
  return usePropellerDeps().services;
}
