# Migration guide

## `GridFilters` / `GridToolbar`: stock filter is a toggle plus a quantity

**When:** `0.13.0`.

The two stock checkboxes (In stock / Out of stock) are now a two-state toggle
plus an editable quantity — "in stock, at least N pcs". The out-of-stock
bucket has no replacement.

Two checkboxes could express "in stock or out of stock", which is every
product and so had to collapse to no filter — a state that looked active and
did nothing. They also could not express a quantity.

**`GridFilters`**

```vue
<!-- before -->
<GridFilters
  :activeAvailability="['in-stock']"
  :onAvailabilityChange="(sel) => (availability = sel)"
/>

<!-- after -->
<GridFilters
  :activeAvailability="'in-stock'"
  :activeMinStock="5"
  :onAvailabilityChange="(sel, min) => { availability = sel; minStock = min }"
/>
```

**`GridToolbar`**

```vue
<!-- before -->
<GridToolbar
  :availability="['in-stock']"
  :onAvailabilityFilterRemove="(value) => remove(value)"
/>

<!-- after -->
<GridToolbar
  :availability="'in-stock'"
  :minStock="5"
  :onAvailabilityFilterRemove="() => reset()"
/>
```

**`ProductGrid`** takes `availability?: Availability` and `minStock?: number`
in place of `availability?: Availability[]`.

**Steps**

1. Upgrade `@propeller-commerce/propeller-v2-core-ui` to `^0.6.0`, where
   `Availability` becomes `'all' | 'in-stock'` and `buildInventoryFilter`
   takes `(selection, minQuantity?)`.
2. Replace array state with a single value plus a quantity number.
3. Drop any out-of-stock option from your own UI and URL handling.
4. If you serialise the selection into a URL, decide how to carry the
   quantity. The boilerplates use `?availability=in-stock` for the default
   and `?availability=in-stock:5` for a raised quantity, omitting the
   parameter entirely for "all products".
5. Add labels for the new keys: `allProducts`, `atLeast`, `pcs`,
   `quantityDecrease`, `quantityIncrease`. Remove `outOfStock`.

Matches `propeller-v2-react-ui` 0.15.0.

## `Menu`: optional pre-fetched `tree` prop (additive)

**When:** during `0.1.0` stabilization (pre-publish).

`Menu` now accepts an optional `tree?: MenuCategory[]` prop. When supplied,
the component skips its internal `useMenu` fetch and renders the tree
directly — mirroring the long-standing `ProductGrid.products` opt-in.

**No migration required.** Omitting the prop preserves the legacy
client-side fetch behaviour. This is purely opt-in for hosts that want to
move the category tree fetch into the SSR layer (e.g. propeller-vue's
`entry-server.ts` always-on prefetch) so the menu HTML lands in the initial
response and the host can attach cache tags via the SDK's `headers` config.

### Recommended pattern for Vue SSR consumers

```ts
// entry-server.ts — Vue 3 + Vite SSR (or any Node-side render hook)
import { fetchMenu, getAnonymousInfra } from '@/lib/server'
import { useMenuStore } from '@/stores/menu'

// Inside the render flow, before renderToString:
const tree = await fetchMenu(getAnonymousInfra(), BASE_CATEGORY_ID)
useMenuStore().setTree(tree)
```

```vue
<!-- AppHeader.vue or wherever the menu lives -->
<script setup lang="ts">
import { computed } from 'vue'
import { Menu as PropellerMenu } from 'propeller-v2-vue-ui'
import { useMenuStore } from '@/stores/menu'

const menuStore = useMenuStore()
const menuTreeProp = computed(() => menuStore.tree ?? undefined)
</script>

<template>
  <PropellerMenu
    :graphqlClient="graphqlClient"
    :categoryId="BASE_CATEGORY_ID"
    :language="lang"
    :tree="menuTreeProp"
    :onMenuItemClick="handleClick"
  />
</template>
```

`MenuCategory` is exported from `/shared` (type-only) so the server-side
fetch helper can build the tree without pulling the Vue composable's
runtime into the server bundle.

See [TECH.md §7 "Pre-fetched data prop pattern"](./TECH.md) for the broader
context and the same pattern as it applies to `ProductGrid`.

---

## From in-app components → the `propeller-v2-vue-ui` package

Before this package existed, the Propeller Commerce Vue components and
composables lived directly inside the `propeller-vue` storefront under
`src/components/propeller/` and `src/composables/`. They are now a
standalone package. This guide is for moving a consumer onto it.

### 1. Install the package

```bash
npm install propeller-v2-vue-ui propeller-sdk-v2 --install-links
```

`propeller-sdk-v2` is a **peer dependency** — install it yourself so the
package and your app share one SDK instance. `--install-links` is needed
on Windows for `file:` / `github:` installs (a symlinked install breaks the
nested `propeller-sdk-v2` resolution).

### 2. Import the stylesheet

```ts
// main.ts
import 'propeller-v2-vue-ui/styles.css';
```

Import it once, at your app entry. You no longer compile the components'
Tailwind classes yourself — the package ships a precompiled stylesheet.

### 3. Build the SDK seam and install the provider

The biggest change: the package ships **no `graphqlClient` singleton**.
Previously composables imported a shared client from `src/lib/api.ts` and
did `new XxxService(graphqlClient)` internally. Now:

```ts
// src/lib/api.ts — YOUR app keeps this file; it just changes shape
import { GraphQLClient } from 'propeller-sdk-v2';
import { createServices } from 'propeller-v2-vue-ui';

export const graphqlClient = new GraphQLClient({
  endpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || '/api/graphql',
  apiKey: import.meta.env.VITE_API_KEY || '',
  timeout: 30_000,
});

export const services = createServices(graphqlClient);
```

Then install the provider once, high in the tree (root `App.vue`):

```vue
<script setup lang="ts">
import { providePropeller } from 'propeller-v2-vue-ui';
import { graphqlClient, services } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
// …

const auth = useAuthStore();
const lang = useLanguageStore();

providePropeller({
  graphqlClient,
  services,
  user: auth.user,
  companyId: undefined,
  language: lang.language,
  includeTax: false,
  currency: '€',
  configuration: config,
  portalMode: 'open',
});
</script>
```

### 4. Update component imports

```diff
- import ProductCard from '@/components/propeller/ProductCard.vue';
+ import { ProductCard } from 'propeller-v2-vue-ui';
```

The 60 component names are unchanged.

### 5. Composables

Composable signatures are unchanged — they still accept a `graphqlClient`
option. Internally they now route through `createServices`. Update imports:

```diff
- import { useCart } from '@/composables/useCart';
+ import { useCart } from 'propeller-v2-vue-ui';
```

The three framework-agnostic cart helpers (`initCart`, `fetchActiveCart`,
`mergeAnonymousCart`) take a `services` bundle in their config rather than
a raw `graphqlClient`.

### 6. URL builders and routing

`ProductCard` no longer depends on `vue-router`. Pass an `onProductClick`
callback for SPA navigation:

```vue
<ProductCard :product="p" :onProductClick="(prod) => router.push(productUrl(prod))" />
```

`SearchBar` and `CartIconAndSidebar` build result URLs from the
`configuration.urls` builders you pass in — supply
`configuration.urls.getProductUrl` / `getClusterUrl` if you need
language-prefixed or custom paths.

### What you keep in your own app

- `src/lib/api.ts` — the `GraphQLClient` construction and `createServices`
  call. Endpoint, env-var names, timeout — all consumer-specific.
- Any server-side (Nuxt) data fetching — the package has no `/server`
  entry.
- Routing, Pinia stores, the app shell.
