import { inject, type InjectionKey } from 'vue';
import type { Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';
import type { ShopMode, UserMode } from '@propeller-commerce/propeller-v2-core-ui';
import { deriveUserMode } from '@propeller-commerce/propeller-v2-core-ui';
import {
  type PropellerDeps,
  usePropellerDeps,
  tryUsePropellerDeps,
} from '../plugin';

/**
 * Tier 2 — per-scope state. Bound by `<PropellerProvider>` and replaceable
 * by nesting a second provider deeper in the tree (for impersonation,
 * multi-cart, multi-language widgets, …). Distinct from the Tier 1 deps
 * installed by the `propellerVue` plugin.
 */
export interface PropellerScope {
  user: Contact | Customer | null;
  companyId: number | undefined;
  language: string;
  includeTax: boolean;
  portalMode: string;
  /**
   * Shop mode declared in `propeller.json`. Combined with `user` to derive
   * `userMode` on the composite context. Defaults to `'hybrid'` when omitted
   * so existing call sites keep their current branching semantics.
   */
  shopMode?: ShopMode;
}

/** Symbol-keyed scope injection — never collides with consumer keys. */
export const PropellerScopeKey: InjectionKey<PropellerScope> =
  Symbol('propeller-scope');

/**
 * Composite read of Tier 1 deps + Tier 2 scope. Mirrors the previous
 * `PropellerInfra` shape so existing consumers (cards, useResolvedProps,
 * useInfraProps) keep working unchanged.
 *
 * Composables that only need services should call `useServices()` /
 * `usePropellerDeps()` instead — they don't depend on a scope provider.
 */
export interface PropellerInfra extends PropellerDeps, PropellerScope {
  userMode: UserMode;
}

/**
 * Build a live composite of Tier 1 deps + Tier 2 scope. The returned object
 * exposes scope/userMode reads as getters that pierce through to the
 * underlying reactive scope — so callers that cache this object at setup
 * (e.g. `useInfraProps`) still see live updates when the provider's props
 * change (login, language switch, VAT toggle). Spreading `scope` would
 * snapshot the values at call time and break that reactivity.
 */
function buildInfra(deps: PropellerDeps, scope: PropellerScope): PropellerInfra {
  return {
    ...deps,
    get user() {
      return scope.user;
    },
    get companyId() {
      return scope.companyId;
    },
    get language() {
      return scope.language;
    },
    get includeTax() {
      return scope.includeTax;
    },
    get portalMode() {
      return scope.portalMode;
    },
    get shopMode() {
      return scope.shopMode;
    },
    get userMode() {
      return deriveUserMode(scope.user, scope.shopMode ?? 'hybrid');
    },
  } as PropellerInfra;
}

/**
 * Non-throwing accessor: returns `null` if either tier is missing so
 * components stay usable standalone / in tests.
 */
export function usePropellerContext(): PropellerInfra | null {
  const deps = tryUsePropellerDeps();
  const scope = inject(PropellerScopeKey, null);
  if (!deps || !scope) return null;
  return buildInfra(deps, scope);
}

/**
 * Throwing accessor — call when both tiers are required and a missing
 * provider is an integration bug, not a render-standalone scenario.
 */
export function useRequiredPropellerContext(): PropellerInfra {
  const deps = usePropellerDeps();
  const scope = inject(PropellerScopeKey, null);
  if (!scope) {
    throw new Error(
      '[propeller-v2-vue-ui] useRequiredPropellerContext() called outside ' +
        'a <PropellerProvider>. Wrap your routed tree with ' +
        '<PropellerProvider :user :companyId :language :includeTax :portalMode>.'
    );
  }
  return buildInfra(deps, scope);
}

/**
 * Read the active `userMode` directly. Returns `'anonymous'` outside the
 * provider so components stay usable standalone / in tests.
 */
export function useUserMode(): UserMode {
  const scope = inject(PropellerScopeKey, null);
  if (!scope) return 'anonymous';
  return deriveUserMode(scope.user, scope.shopMode ?? 'hybrid');
}
