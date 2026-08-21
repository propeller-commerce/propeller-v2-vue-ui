# TECH.md — propeller-v2-vue-ui architecture

Engineering reference for the package. For day-to-day workflow see
[CONTRIBUTING.md](./CONTRIBUTING.md); for consumer usage see
[README.md](./README.md).

This package is the Vue mirror of `propeller-v2-react-ui`. Where the two
diverge, it is noted; otherwise assume parity.

## 1. What this package is

The Propeller Commerce Vue 3 UI surface extracted from the `propeller-vue`
storefront into a standalone, installable package. It contains:

- **60 components** (`src/components/*.vue`) — e-commerce UI.
- **15 feature composables** (`src/composables/vue/use*.ts`) — headless
  reactive state + actions over the SDK.
- **4 provider/prop composables** — `useServices`, `usePropeller`-style
  context access, `useInfraProps`, `useResolvedProps`.
- **The shared layer** (`src/composables/shared/`) — pure-TS utilities and
  domain types, plus three Vue-reactive wrappers.
- **The SDK seam** (`src/lib/`) — `createServices`, `toPlain`.
- **Two context providers** (`src/context/`) — `PropellerContext`,
  `ProductGridContext`.

It is **not** an application. It has no router, no Pinia store, no `.env`,
no GraphQL endpoint. Those belong to the consumer.

## 2. Entry points and the build

`vite.config.ts` uses Vite **library mode** with two entries:

- `src/index.ts` — the Vue surface (components, composables, provider, SDK
  seam).
- `src/shared.ts` — the runtime-agnostic subset (pure TS, no Vue).

Output: dual ESM (`.js`) + CJS (`.cjs`) bundles plus `.d.ts` declarations
(via `vite-plugin-dts`). `@vitejs/plugin-vue` compiles the `.vue` SFCs.

Unlike the React package there is **no `"use client"` banner** — Vue has no
such directive. This is a real simplification: no post-build hook.

`build` runs `vite build && npm run build:css` in that order — `vite build`
empties `dist/`, so the Tailwind stylesheet must be compiled after.

`package.json` declares a `prepare` script that runs `build`. This is
load-bearing: the package is consumed via a `github:` / `file:` URL and
`dist/` is gitignored, so npm must rebuild it at install time. All build
tooling is in `devDependencies` so it is present when `prepare` runs.

## 3. Why two entry points

`src/index.ts` pulls in `vue` and the 60 `.vue` components. Importing it
into a context that should stay Vue-free (a Nuxt server route, a build
script) drags that whole graph along. `src/shared.ts` re-exports only the
pure layer — `createServices`, `toPlain`, the formatters, the domain types
— with no Vue import, so it is safe everywhere.

There is deliberately **no `/server` entry**. Server-side GraphQL wiring
(endpoint, API keys, cookie names) is application-specific; a Nuxt consumer
hosts that itself.

## 4. The SDK seam

`src/lib/createServices.ts` and `src/lib/toPlain.ts` are copied **verbatim**
from `propeller-v2-react-ui` — pure TS, framework-agnostic, identical across
the two packages.

`createServices(client: GraphQLClient): Services` builds a bundle of all 15
SDK service instances keyed to a consumer-provided client. It is memoized
per client via a `WeakMap`, so repeated calls with the same client return
the same bundle — composables call `createServices(graphqlClient).cart` at
each use site without re-instantiating anything.

Pre-extraction, every composable did `new XxxService(graphqlClient)` inline
(57 call sites across 13 composables). That coupled the whole surface to the
SDK constructors with zero reuse. The extraction routed all of them through
`createServices`.

`toPlain<T>(value)` recursively strips the SDK's underscore-prefixed backing
fields (`_items`, `_firstName`) from class instances so serialization and
reactivity see the clean public type.

## 5. The provider — `provide` / `inject`

`src/context/PropellerContext.ts` defines `PropellerInjectionKey` (a
`Symbol`-keyed `InjectionKey<PropellerInfra>`), `providePropeller(value)`,
and `usePropellerContext()`.

This is the Vue analogue of React's `<PropellerProvider value={…}>`. The
consumer calls `providePropeller` once in its root `setup()` with the
constructed `graphqlClient` + `services` and the reactive auth / language /
currency state. Components and composables below it read the infra.

`src/context/ProductGridContext.ts` is the Tier-2 grid config provider —
`provideProductGridConfig` / `useProductGridConfig`. `ProductGrid` installs
it; `ProductCard` / `ClusterCard` and their subtree consume it, collapsing
~20 cascaded props.

Both accessors are **non-throwing** (return `null` outside a provider) so
components stay usable standalone. `useServices()` is the throwing accessor
— a missing provider is an integration error worth surfacing.

## 6. Infra prop resolution

`useInfraProps(props)` resolves the Tier-1 infrastructure values
(`user`, `language`, `currency`, `graphqlClient`, …): an explicit prop wins;
otherwise the value comes from the provider; non-infra props pass through.

`useResolvedProps(rawProps, spec)` is the declarative two-tier resolver used
by `ProductCard` / `ClusterCard`: `explicit prop > grid config > infra >
default`, expressed as a spec table instead of a hand-written ladder of
`??` fallbacks.

These three composables (`useServices`, `useInfraProps`, `useResolvedProps`)
are **new to the Vue surface** — the React package had them; the original
in-app Vue composables did not. They were written during the extraction.

## 7. Composables

The 15 feature composables (`useCart`, `useAuth`, `useProductSearch`, …)
follow the propeller-vue convention: they take a `UseXxxOptions` object;
`user` / `companyId` / `language` are passed as **refs** so the composable
tracks changes; they return reactive `ref`s and action functions.

Composable signatures were left unchanged by the extraction — they still
accept an explicit `graphqlClient` option. Internally they now resolve
services via `createServices(graphqlClient)` rather than `new XxxService()`.

`useMenu` is the one composable that calls `graphqlClient.query()` directly
(raw GraphQL, no service) — left as-is.

### Pre-fetched data prop pattern

Several client components accept an optional `<data>` prop that, when
present, **skips the component's internal fetch**. This is the bridge
between server-side data resolution and the client component:

| Component | Prop | Type |
|---|---|---|
| `ProductGrid` | `products` | `ProductsResponse` |
| `Menu` | `tree` | `MenuCategory[]` |

Pattern: the host's SSR layer fetches the data once (and gets to attach
cache hints — e.g. propeller-vue's `X-Propeller-Cache-Tags` header
consumed by its `/api/graphql` proxy LRU), seeds a Pinia store with the
result, and the component reads it via the prop. The component renders it
directly on first paint; the internal fetch is short-circuited so there
is no avoidable client-side roundtrip after hydration.

If the prop is omitted the component falls back to its legacy client-side
fetch — no breaking change for consumers that haven't migrated.

When adding a new fetching component to the package, prefer this shape:
expose an optional `<data>` prop with the same name/type as the internal
composable's primary return value, branch the fetch watch on its presence,
and document the dual mode in the component's JSDoc / TypeScript props
interface.

`MenuCategory` is re-exported from `/shared` (type-only) for the same
reason `Services` is — server modules need the type without pulling the
Vue composable's runtime into the server bundle.

## 8. Host-coupling removal

A library component must not reach into the host app. The extraction
removed four coupling points:

- **`ProductCard.vue`** — dropped the `vue-router` import. Navigation goes
  through the `onProductClick` callback prop; without it, a native
  `window.location` change is the fallback.
- **`SearchBar.vue` / `CartIconAndSidebar.vue`** — dropped `localizeHref`
  from the host config. URLs come from the `configuration.urls` builders
  the consumer passes in.
- **`AddToCart.vue` / `CartIconAndSidebar.vue`** — `<router-link>` replaced
  with a plain `<a :href>` (a library cannot assume `vue-router`'s global
  component is registered).
- **`usePurchaseAuthorization.ts`** — dropped an `import.meta.env` read.

After this, `src/` imports zero `@/` host paths, zero `vue-router`, and
reads no environment variables.

## 9. Styling

`src/styles.css` is the Tailwind v4 entry. `@source` directives scan
`./components/**/*.vue`, `./composables/vue/**/*.ts`, `./context/**/*.ts`.
`@source inline(...)` is the escape hatch for responsive utilities that live
only inside template-literal `:class` expressions, which the v4 scanner can
miss.

`build:css` compiles it to `dist/styles.css` (minified) with the Tailwind v4
CLI. The consumer imports that one file; they do not need Tailwind.

Theme tokens (`:root` CSS variables) and BEM hook class names are kept
**identical to `propeller-v2-react-ui`**, so a project running both
frameworks can share a single override stylesheet. See
[STYLING.md](./STYLING.md).

## 10. Typing

`tsconfig.json` extends `@vue/tsconfig/tsconfig.dom.json` — the same base
the original `propeller-vue` app uses — so the package type-checks under the
exact rules the components were written against. `typecheck` runs
`vue-tsc --noEmit`.

Note: the original `propeller-vue` excluded `components/propeller/` from its
own `vue-tsc` run, so the 60 components were never type-checked there. This
package type-checks the whole surface; the extraction surfaced and fixed
~186 pre-existing type errors (see CHANGELOG).

## 11. What ships

`package.json` `files` ships `dist/`, the markdown docs, and `LICENSE`.
`src/`, `.storybook/`, `docs/`, tests, and configs are not published. The
`exports` map exposes `.`, `./shared`, `./styles.css`, and `./package.json`.

## 12. Customization model

A consumer adapts the package without forking it through, in order of
scope: theme tokens → BEM-hook CSS → the per-instance `class` attribute →
component slots → wrap-and-extend. If none fit, the right move is a PR here
that adds the prop / slot / hook that does.
