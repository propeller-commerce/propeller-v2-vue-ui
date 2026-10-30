# propeller-v2-vue-ui

A Vue 3 component library for **Propeller Commerce** storefronts. It ships
ready-made e-commerce UI — product cards, grids, carts, checkout, account
pages — together with headless composables that talk to the Propeller
GraphQL API, plus the shared utilities and types those parts build on.

📖 **Docs (canonical reference for props & usage):** https://propeller-commerce.github.io/propeller-v2-vue-ui/

It is the Vue mirror of [`@propeller-commerce/propeller-v2-react-ui`](https://github.com/propeller-commerce/propeller-v2-react-ui):
same component set, same SDK seam, same styling contract.

The package is framework-flexible within the Vue ecosystem: it runs in any
Vue 3.4+ app — a Vite SPA, a Nuxt 3 app — and ships its own precompiled
stylesheet, so you do **not** need Tailwind in your project to use it.

## Table of contents

- [Installation](#installation)
- [Peer dependencies](#peer-dependencies)
- [Entry points](#entry-points)
- [Core concept: the SDK seam](#core-concept-the-sdk-seam)
- [Quick start](#quick-start)
- [The Propeller provider](#the-propeller-provider)
- [Using components](#using-components)
- [Using composables](#using-composables)
- [Styling](#styling)
- [API reference](#api-reference)
- [Building from source](#building-from-source)

## Installation

```bash
npm install @propeller-commerce/propeller-v2-vue-ui @propeller-commerce/propeller-sdk-v2 --install-links
```

`@propeller-commerce/propeller-sdk-v2` is a **peer dependency** — install it yourself so the
package and your application share a single SDK instance. `--install-links`
is needed on Windows for `file:` / `github:` installs.

## Peer dependencies

| Package            | Version  | Required |
| ------------------ | -------- | -------- |
| `vue`              | `>=3.4`  | Yes      |
| `@propeller-commerce/propeller-sdk-v2` | `*`      | Yes      |

There is no dependency on Nuxt or `vue-router` — nothing in the package
imports them. A plain Vite + Vue app works out of the box.

## Entry points

| Import path                  | Contents                                              |
| ----------------------------- | ----------------------------------------------------- |
| `@propeller-commerce/propeller-v2-vue-ui`         | Components, composables, the provider, `createServices`, `toPlain` |
| `@propeller-commerce/propeller-v2-vue-ui/shared`  | `createServices`, `toPlain`, formatters, helpers, types — pure TS |
| `@propeller-commerce/propeller-v2-vue-ui/pure`    | SSR-safe presentational components — no composables, no browser APIs |
| `@propeller-commerce/propeller-v2-vue-ui/styles.css` | The precompiled stylesheet |

The `/shared` entry is plain TypeScript with no Vue dependency — import the
pure helpers and `createServices` from there when you want them outside a
component (a Nuxt server route, a build script, a test).

The `/pure` entry re-exports a curated subset of components that are
guaranteed SSR-safe: no composable calls, no `window`/`localStorage`/`document`
access, no `onMounted` fetching. Render them directly into the static shell
of a server-rendered page with no hydration mismatch. Mirrors the React
package's `/pure` entry component-for-component.

## Core concept: the SDK seam

This is the one architectural idea to understand before using the package.

**The package ships no GraphQL client** and **no hardcoded API endpoint.**
GraphQL transport is application-specific — a Vite SPA hits the API through
its dev proxy; a Nuxt app may use a server route; another app uses a custom
rewrite. Baking a URL into a component library would lock it to one app
shape.

The contract is three steps:

1. **You construct the `GraphQLClient`** from `@propeller-commerce/propeller-sdk-v2`, with your
   endpoint, headers and auth resolver.
2. **You call `createServices(client)`** once — it returns a typed
   `Services` bundle (`product`, `cart`, `user`, `order`, …) keyed to that
   client.
3. **You install both** via `app.use(propellerVue, { graphqlClient, services, currency, configuration })`,
   and bind the per-scope state (user, company, language, …) with
   `<PropellerProvider>`.

Inside the provider, every component and composable reads the services via
`useServices()` — they never instantiate the SDK themselves.

`createServices` is a pure factory, memoized per client via a `WeakMap`, so
calling it again with the same client returns the same bundle. `toPlain`
recursively strips the SDK's underscore-prefixed backing fields so
downstream code sees the clean public shape.

## Quick start

### 1. Build the client and services

```ts
// src/lib/api.ts — your app owns this file
import { GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
import { createServices } from '@propeller-commerce/propeller-v2-vue-ui';

export const graphqlClient = new GraphQLClient({
  endpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || '/api/graphql',
  apiKey: import.meta.env.VITE_API_KEY || '',
  timeout: 30_000,
});

export const services = createServices(graphqlClient);
```

### 2. Install the plugin, the provider and the stylesheet

The app-wide dependencies go in once, through the `propellerVue` plugin:

```ts
// src/main.ts
import { createApp } from 'vue';
import { propellerVue } from '@propeller-commerce/propeller-v2-vue-ui';
import '@propeller-commerce/propeller-v2-vue-ui/styles.css';
import App from './App.vue';
import { graphqlClient, services } from '@/lib/api';

createApp(App)
  .use(propellerVue, {
    graphqlClient,
    services,
    currency: '€',
    configuration: {},   // free-form config bag (url builders, image filters)
  })
  .mount('#app');
```

The per-scope state goes through the `<PropellerProvider>` component around
your routed tree:

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { PropellerProvider } from '@propeller-commerce/propeller-v2-vue-ui';
</script>

<template>
  <PropellerProvider
    :user="null"
    language="NL"
    :include-tax="false"
    portal-mode="open"
  >
    <RouterView />
  </PropellerProvider>
</template>
```

Bind the props to your auth / company / language / price stores (`:user`
takes a `Contact` / `Customer` or `null`); the provider stays reactive.

### 3. Use components and composables anywhere below the provider

```vue
<script setup lang="ts">
import { ProductCard } from '@propeller-commerce/propeller-v2-vue-ui';
</script>

<template>
  <ProductCard :product="product" />
</template>
```

## The Propeller provider

Infrastructure comes from two tiers:

- `app.use(propellerVue, deps)` installs the app-wide `PropellerDeps` once.
- `<PropellerProvider>` provides the per-scope `PropellerScope` for its
  subtree; nest another one deeper to override the scope (impersonation,
  multi-cart, …).

`usePropellerContext()` reads the merged `PropellerInfra` (non-throwing —
returns `null` when either tier is missing).

### `PropellerDeps` fields (`propellerVue` plugin options)

| Field           | Type                       | Notes |
| --------------- | -------------------------- | ----- |
| `graphqlClient` | `GraphQLClient`            | The client you constructed. |
| `services`      | `Services`                 | The bundle from `createServices(client)`. |
| `currency`      | `string`                   | Currency symbol for price formatting. Default `'€'`. |
| `configuration` | `unknown`                  | Config bag (url builders, image filters). Recognized keys include `baseCategoryId` and `anonymousUserId` — see below. |
| `imgComponent`  | `Component` (optional)     | Replaces the `<img>` every component renders. |

### `<PropellerProvider>` props

| Prop              | Type                       | Notes |
| ----------------- | -------------------------- | ----- |
| `user`            | `Contact \| Customer \| null` | Your auth state. Default `null`. |
| `isAuthenticated` | `boolean` (optional)       | Whether a session exists before `user` has loaded. |
| `companyId`       | `number \| undefined`      | Active company for B2B pricing. |
| `language`        | `string`                   | e.g. `'NL'`, `'EN'`. Default `'EN'`. |
| `includeTax`      | `boolean`                  | Leading price is net (incl. VAT) when true. Default `false`. |
| `portalMode`      | `string`                   | e.g. `'open'`, `'semi-closed'`. Default `'open'`. |

**`configuration.anonymousUserId`** — the channel's guest account. Listing
composables scope logged-out catalog queries to it, so the client asks the
same question the server-rendered seed did. Resolve it server-side (only the
server can reach the channel) and pass it in; when absent, anonymous queries
send no `userId` and the backend falls back to the api key's own scope.
Getting it wrong is invisible — the grid renders, just with the wrong
assortment.

**Per-instance class overrides** — the `*ClassName` props (`iconClassName`,
`menuClassName`, `sidebarClassName`) merge through
[`tailwind-merge`](https://github.com/dcastil/tailwind-merge) since 0.16.0, so
an override replaces the base utility it conflicts with instead of racing it
in the cascade. To remove a default outright, target the component's BEM hook.

A component reads infra via `useInfraProps(props)` — an explicit prop always
wins, otherwise the value comes from the provider, otherwise a default. This
means components also work standalone (no provider) for tests and
Storybook.

## Using components

The package exports 60 components. They are prop-driven. Components that
need infrastructure resolve it from the provider, so most usages are short:

```vue
<ProductGrid :categoryId="17" />
<CartIconAndSidebar />
<Breadcrumbs :categoryPath="category.categoryPath" />
```

`ProductGrid` installs a Tier-2 grid config (`provideProductGridConfig`)
that `ProductCard` / `ClusterCard` and their subtree consume — so you do not
thread display flags and callbacks through by hand.

See [STYLING.md](./STYLING.md) for restyling, and the docs site for the full
component catalogue.

## Partner extension API

Customise nested components (price, stock, add-to-cart, whole card) without
forking. See [docs/extension-api.md](docs/extension-api.md) for the full
guide covering injection slots, cascade rules, before/after iteration slots,
whole-card swap, ProductInfo expanded shell, and contract types.

## Using composables

The 15 composables are headless — reactive state + actions, no markup.

```ts
import { useCart } from '@propeller-commerce/propeller-v2-vue-ui';
import { computed } from 'vue';
import { graphqlClient } from '@/lib/api';

const { cart, addItem, loading } = useCart({
  graphqlClient,
  user: computed(() => authStore.user),
  language: computed(() => languageStore.language),
  configuration: { imageSearchFiltersGrid: {}, imageVariantFiltersSmall: {} },
});
```

Composables that take `user` / `companyId` / `language` expect **refs** —
wrap props or store values with `computed()` before passing them in, so the
composable tracks changes.

The framework-agnostic cart helpers (`initCart`, `fetchActiveCart`,
`mergeAnonymousCart`) take a `services` bundle rather than a raw client.

## Styling

The package ships a precompiled stylesheet — import it once:

```ts
import '@propeller-commerce/propeller-v2-vue-ui/styles.css';
```

Three override surfaces — theme tokens (CSS variables), BEM hook classes,
and a per-instance `class` attribute. Full detail in [STYLING.md](./STYLING.md).

## API reference

### From `@propeller-commerce/propeller-v2-vue-ui`

- **SDK seam:** `createServices`, `toPlain`, `Services` (type)
- **Provider:** `propellerVue` (plugin), `PropellerProvider` (component),
  `usePropellerContext`, `useRequiredPropellerContext`, `usePropellerDeps`,
  `tryUsePropellerDeps`, `provideProductGridConfig`, `useProductGridConfig`,
  `PropellerDeps` / `PropellerScope` / `PropellerInfra` /
  `ProductGridConfig` (types)
- **Composables:** `useAddress`, `useAuth`, `useCart`, `useCheckout`,
  `useClusterConfigurator`, `useCompany`, `useFavorites`, `useInfraProps`,
  `useMenu`, `useOrders`, `useProductBundles`, `useProductInfo`,
  `useProductSearch`, `useProductSlider`, `useProductSpecs`,
  `usePurchaseAuthorizationConfigurator`,
  `usePurchaseAuthorizationRequests`, `useResolvedProps`, `useServices`
- **Utilities:** `formatPrice`, `formatDate`, `getLanguageString`,
  `getProductImageUrl`, `getStockStatus`, `getLabel`, `isContact`,
  `isCustomer`, … (see `src/index.ts` for the full list)
- **60 components** — `AccountIconAndMenu` … `UserDetails`

### From `@propeller-commerce/propeller-v2-vue-ui/shared`

The runtime-agnostic subset: `createServices`, `toPlain`, the framework-free
utilities, and all domain types. No Vue, safe in a server context.

## Building from source

```bash
npm install        # runs `prepare` → build
npm run build      # vite build + Tailwind CSS compile
npm run typecheck  # vue-tsc --noEmit
npm test           # Vitest unit suite
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow and
[TECH.md](./TECH.md) for the architecture.
