import { getCurrentInstance, reactive } from 'vue';
import { usePropellerContext, type PropellerInfra } from '../../context/PropellerContext';

type InfraKey = keyof PropellerInfra;

/** `fooBar` -> `foo-bar`, so a template writing `:include-tax` is recognised. */
function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Did the parent actually pass this prop? Falls back to `true` when there is no
 * instance (a composable called outside a component, e.g. in a unit test), so
 * the previous "explicit value wins" behaviour is preserved there.
 */
function wasPassed(instance: ReturnType<typeof getCurrentInstance>, key: string): boolean {
  const raw = instance?.vnode?.props;
  if (!raw) return !instance;
  return key in raw || kebab(key) in raw;
}

const INFRA_KEYS: InfraKey[] = [
  'graphqlClient',
  'services',
  'user',
  'companyId',
  'language',
  'includeTax',
  'currency',
  'configuration',
  'portalMode',
  'isAuthenticated',
];

/**
 * Resolves the Tier 1 (deps) + Tier 2 (scope) infrastructure props for a
 * component.
 *
 * Precedence: an explicit prop value (defined and non-null) always wins —
 * existing call sites keep working unchanged. Otherwise the value is taken
 * from the composite of plugin deps and `<PropellerProvider>` scope. Non-infra
 * props pass through untouched.
 *
 * Null-context safe: with no plugin or no provider the props are returned
 * as-is, so components still work standalone / in tests.
 *
 * MUST be called from `setup()` — Vue's `inject()` only works there. Calling
 * this lazily from inside a `computed` getter, an effect, or a click handler
 * yields `null` for the provider context (and a console warning), which is
 * what the previous "wrap in computed" pattern caused for any prop that hadn't
 * been read synchronously during setup.
 *
 * The returned object is a `reactive` proxy whose infra-key reads always
 * reflect (explicit prop OR provider snapshot OR undefined). Non-infra props
 * pass through unchanged via getter forwarding, so consumers can iterate or
 * destructure it as they would a plain object.
 */
export function useInfraProps<P extends Partial<Record<InfraKey, unknown>>>(
  props: P
): P & Partial<PropellerInfra> {
  // Resolve once at setup — inject() is only valid here.
  const ctx = usePropellerContext();
  // `instance.vnode.props` is what the PARENT actually passed, before Vue
  // applies prop defaults and type casting. We need it because a resolved
  // `props` object cannot answer "did the host pass this?" for a boolean:
  // `defineProps<{ includeTax?: boolean }>()` compiles to `{ type: Boolean }`,
  // and Vue casts an ABSENT Boolean prop to `false`, not `undefined`. Reading
  // the resolved props therefore saw an explicit `false` on every component
  // nobody passed `includeTax` to, and the provider was never consulted — a
  // shop configured for incl-VAT prices rendered every price excl. VAT.
  //
  // String keys (`language`, `currency`) were never affected, which is why
  // locale resolution worked while VAT kept coming back.
  //
  // `instance.vnode` is reassigned on each re-render, so reading it lazily
  // inside the getters below keeps this reactive to prop changes.
  const instance = getCurrentInstance();

  const merged: Record<string, unknown> = {};
  // Forward every non-infra key as a getter so reads on the returned object
  // pick up reactive prop updates without us having to enumerate them.
  for (const key of Object.keys(props as Record<string, unknown>)) {
    if (INFRA_KEYS.includes(key as InfraKey)) continue;
    Object.defineProperty(merged, key, {
      enumerable: true,
      configurable: true,
      get() {
        return (props as Record<string, unknown>)[key];
      },
    });
  }
  // Each infra key reads the live prop first, then falls back to the snapshot
  // ctx captured during setup. Provider mutations are still reactive because
  // `ctx` is a `reactive` object on the PropellerProvider side.
  for (const key of INFRA_KEYS) {
    Object.defineProperty(merged, key, {
      enumerable: true,
      configurable: true,
      get() {
        if (wasPassed(instance, key)) {
          const explicit = (props as Record<string, unknown>)[key];
          if (explicit !== undefined && explicit !== null) return explicit;
        }
        return ctx ? (ctx as unknown as Record<string, unknown>)[key] : undefined;
      },
    });
  }
  return reactive(merged) as unknown as P & Partial<PropellerInfra>;
}
