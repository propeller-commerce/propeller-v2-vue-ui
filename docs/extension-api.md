# Partner Extension API

This package supports three mechanisms for customising the rendering of
nested components without forking the package.

## Mechanism 1 — Component injection

Pass a partner-built component into a `*-component` prop on any host. The
host renders your component in place of the default. The component must
implement the documented contract (TypeScript interface in
`propeller-v2-core-ui`).

### Hosts and their injection slots

| Host | Slots |
| --- | --- |
| `ProductGrid` | `productCardComponent`, `clusterCardComponent`, `priceComponent`, `stockComponent`, `addToCartComponent`, `imageComponent`, `badgesComponent`, `favoriteComponent` |
| `ProductSlider` | Same as `ProductGrid` |
| `ProductCard` | `priceComponent`, `stockComponent`, `addToCartComponent`, `imageComponent`, `badgesComponent`, `favoriteComponent` |
| `ClusterCard` | `priceComponent`, `stockComponent`, `imageComponent`, `badgesComponent`, `favoriteComponent` |
| `ProductInfo` | `imageComponent`, `badgesComponent`, `favoriteComponent`, `priceComponent`, `stockComponent`, `addToCartComponent`, `bundlesComponent`, `bulkPricesComponent`, `surchargesComponent` |
| `CartItem` | `priceComponent`, `stockComponent`, `surchargesComponent` |
| `OrderItemCard` | `priceComponent`, `stockComponent` |
| `AddToCart` | `priceComponent`, `stockComponent` (modal only) |

> Vue attributes are kebab-case in templates: `:price-component="MyPrice"`,
> `:product-card-component="MyCard"`, etc.

### Cascade

A slot set on `ProductGrid` or `ProductSlider` flows via `provide` /
`inject` (the `provideProductGridConfig` / `useProductGridConfig` pair) to
every nested `ProductCard` / `ClusterCard`. Explicit per-card props
override.

Precedence (highest first):

```
explicit prop > grid context > Propeller infra > default
```

### Precedence rule (slot mode)

When a consumer provides BOTH a named slot AND a `*Component` injection,
the slot's default content delegates to the injection:

- If `priceComponent` is set, the `#price` slot's default content renders the injected component
- If `priceComponent` is not set, the `#price` slot's default content renders the default markup
- A consumer who does not override `#price` always honors the injection cascade

To force the default render in slot mode, the consumer renders
`<DefaultProductPrice :price="product.price" />` explicitly inside the
slot override.

## Migration note

`renderProductCard` and `renderClusterCard` on `<ProductGrid>` were removed
in favour of `productCardComponent` and `clusterCardComponent`. The original
props were template-dead — silently rendered nothing when used — no real
consumers can be affected. Switch:

```vue
<!-- Old (didn't work) -->
<ProductGrid :render-product-card="MyCard" />

<!-- New -->
<ProductGrid :product-card-component="MyCard" />
```

### Example: brand the price everywhere (Vue)

```vue
<script setup lang="ts">
import { ProductGrid } from 'propeller-v2-vue-ui';
import MyPrice from './MyPrice.vue';
</script>

<template>
  <ProductGrid :category-id="17" :price-component="MyPrice" />
</template>
```

Where `MyPrice.vue` accepts `PriceComponentProps`:

```vue
<script setup lang="ts">
import type { PriceComponentProps } from 'propeller-v2-vue-ui';
const props = defineProps<PriceComponentProps>();
</script>

<template>
  <strong class="my-price">
    {{ props.currency ?? '€' }}{{ (props.includeTax ? props.price?.gross : props.price?.net) ?? 0 }}
  </strong>
</template>
```

Every `ProductCard` inside the grid now uses `MyPrice` for its price block —
no per-card prop needed.

### Example: decorate the default

Import the `Default*` component and wrap it instead of rebuilding from scratch:

```vue
<script setup lang="ts">
import { DefaultProductPrice } from 'propeller-v2-vue-ui';
import type { PriceComponentProps } from 'propeller-v2-vue-ui';
import PromoBadge from './PromoBadge.vue';
const props = defineProps<PriceComponentProps>();
</script>

<template>
  <div>
    <PromoBadge :product="props.price" />
    <DefaultProductPrice v-bind="props" />
  </div>
</template>
```

### Example: swap the whole card

```vue
<!-- MyCard.vue -->
<script setup lang="ts">
import { useProductGridConfig } from 'propeller-v2-vue-ui';
import type { Product } from '@propeller-commerce/propeller-sdk-v2';

const props = defineProps<{ product: Product }>();

// Honor cascaded sub-component slots from the grid context.
const grid = useProductGridConfig();
const PriceComp = grid?.priceComponent;
</script>

<template>
  <article class="my-card">
    <img :src="props.product.media?.images?.items?.[0]?.imageVariants?.[0]?.url" />
    <h3>{{ props.product.name?.[0]?.value }}</h3>
    <component :is="PriceComp" v-if="PriceComp" :price="props.product.price" />
  </article>
</template>
```

```vue
<script setup lang="ts">
import { ProductGrid } from 'propeller-v2-vue-ui';
import MyCard from './MyCard.vue';
</script>

<template>
  <ProductGrid :category-id="17" :product-card-component="MyCard" />
</template>
```

**Trade-off**: swapping the whole card opts you out of automatic
sub-component injection unless you explicitly read `useProductGridConfig()`
inside your card. Most partners prefer per-section injection (Mechanism 1
above) — the whole-card swap is the escape hatch for fully different layouts.

## Mechanism 2 — Before / after iteration slots

`ProductGrid`, `ProductSlider`, and `ProductInfo` accept Vue scoped slots
for content added between iterated items or before/after the PDP content.

### Example: before/after slots (Vue scoped slots)

```vue
<template>
  <ProductGrid :category-id="17">
    <template #beforeItem="{ item, index }">
      <FreeShippingBanner v-if="index === 0" />
    </template>
    <template #afterItem="{ item }">
      <CompareCheckbox :item="item" />
    </template>
  </ProductGrid>
</template>
```

### Example: ProductInfo expanded shell (Vue)

```vue
<template>
  <ProductInfo
    :product-id="42"
    :show-price="true"
    :price-component="MyPrice"
  >
    <template #beforeContent="{ product }">
      <CategoryBreadcrumb :product="product" />
    </template>
    <template #afterContent="{ product }">
      <RelatedProductsSlider :product-id="product.productId" />
    </template>
  </ProductInfo>
</template>
```

## Mechanism 3 — Named slots (inside-card structural extension)

Each of the seven cards below renders its monolithic layout by default.
The consumer can override individual sections by providing matching named
slots. Slots not overridden keep their default content.

Slot default content delegates to the matching `*Component` injection from
Mechanism 1 — see [Precedence rule (slot mode)](#precedence-rule-slot-mode).

### ProductCard slots

The card renders default content for each slot. Override any subset; the
rest stay as-is.

**Vue slots:**

- `image` — primary image
- `badges` — image-label badges
- `favorite` — add-to-favorite-list button
- `name` — product name
- `sku` — SKU line
- `shortDescription` — short description
- `manufacturer` — manufacturer name
- `textLabels` — text-label badges
- `stock` — stock indicator
- `price` — price block
- `addToCart` — add-to-cart control

**Example:**

```vue
<ProductCard :product="data">
  <template #image>
    <!-- default content kept when not overridden -->
  </template>
  <template #name>
    <MyBranding :product="data" />
  </template>
  <template #price>
    <MyCustomPrice :price="data.price" />
  </template>
</ProductCard>
```

**Slot delegation:** each slot's default content delegates to the matching
`*-component` injection from Mechanism 1 when set. Example:
`<ProductGrid :price-component="MyPrice">` causes the `#price` slot's
default content inside every nested `ProductCard` to render `MyPrice` via
the cascade.

### ClusterCard slots

**Vue slots:**

- `image` — primary image
- `badges` — image-label badges
- `favorite` — add-to-favorite-list button
- `name` — cluster name
- `sku` — SKU line
- `shortDescription` — short description
- `manufacturer` — manufacturer name
- `textLabels` — text-label badges
- `stock` — stock indicator
- `price` — price block
- `viewClusterLink` — "view cluster" call-to-action

**Example:**

```vue
<ClusterCard :cluster="data">
  <template #name>
    <MyBranding :cluster="data" />
  </template>
  <template #viewClusterLink>
    <MyCustomCta :cluster="data" />
  </template>
</ClusterCard>
```

**Slot delegation:** each slot's default content delegates to the matching
`*-component` injection from Mechanism 1 when set.

### ProductInfo slots

**Vue slots:**

- `image` — primary image
- `badges` — image-label badges
- `favorite` — add-to-favorite-list button
- `title` — product title
- `sku` — SKU line
- `price` — price block
- `stock` — stock indicator
- `addToCart` — add-to-cart control
- `bundles` — product bundles
- `bulkPrices` — bulk-price table
- `surcharges` — surcharges list

**Example:**

```vue
<ProductInfo :product-id="42">
  <template #title>
    <MyCustomTitle :product-id="42" />
  </template>
  <template #price>
    <MyCustomPrice />
  </template>
</ProductInfo>
```

**Slot delegation:** each slot's default content delegates to the matching
`*-component` injection from Mechanism 1 when set.

### CartItem slots

**Vue slots:**

- `image` — line-item image
- `title` — line-item title
- `sku` — SKU line
- `surcharges` — surcharges list
- `stock` — stock indicator
- `bundleItems` — child items of a bundle line
- `childItems` — child cart items
- `notes` — per-line notes input
- `crossupsells` — inline cross-sell suggestions
- `price` — line-item price
- `quantity` — quantity control
- `delete` — delete button (becomes empty when `:show-delete="false"`)

**Example:**

```vue
<CartItem :cart-item="item">
  <template #title>
    <MyCustomTitle :item="item" />
  </template>
  <template #price>
    <MyCustomPrice :item="item" />
  </template>
</CartItem>
```

**Slot delegation:** each slot's default content delegates to the matching
`*-component` injection from Mechanism 1 when set.

### CartItem variant props

Four optional props that adapt CartItem's rendering for non-default contexts
(cart drawer, summary widgets):

| Prop | Default | Effect |
| --- | --- | --- |
| `cardFrame` | `true` | When false, strips `bg-card p-4 rounded-container shadow-sm border border-border` from root |
| `showDelete` | `true` | When false, the `delete` slot becomes empty and inline delete hidden |
| `readOnlyQuantity` | `false` | When true, quantity renders as `Qty: {n}` text |
| `onTitleClick` | `undefined` | Fires `(event, item)` on title click; consumer may `preventDefault()` |

All four work in both monolithic and slot modes.

### Customising cart-drawer rows

`<CartIconAndSidebar>` composes `<CartItem>` with `:card-frame="false"`,
`:show-delete="false"`, `:read-only-quantity="true"`, and `onTitleClick`
wired to close the sidebar. The drawer accepts a `cartItemComponent` prop
that lets the consumer replace each row.

**Replace each cart row entirely:**

```vue
<CartIconAndSidebar :cart="cart" :cart-item-component="MyCustomCartItem" />
```

**Customise individual sections via slots:**

```vue
<!-- DrawerCartItem.vue -->
<script setup lang="ts">
import { CartItem } from 'propeller-v2-vue-ui';
import MyCustomDetails from './MyCustomDetails.vue';
const props = defineProps<{ cartItem: any }>();
</script>

<template>
  <CartItem v-bind="props">
    <template #title>
      <span>{{ cartItem.name }}</span>
      <MyCustomDetails :item="cartItem" />
    </template>
  </CartItem>
</template>
```

```vue
<CartIconAndSidebar :cart="cart" :cart-item-component="DrawerCartItem" />
```

### AddressCard slots

**Vue slots:**

- `typeBadge` — address-type badge (billing / shipping / etc.)
- `name` — contact name
- `addressLines` — street / postcode / city block
- `country` — country line
- `actions` — edit / delete / set-default buttons
- `defaultBadge` — "default address" badge (gated by `:show-default-badge`)

**Example:**

```vue
<AddressCard :address="address">
  <template #name>
    <MyContactName :contact="address.contact" />
  </template>
  <template #actions>
    <MyCustomActions :address="address" />
  </template>
</AddressCard>
```

### LoginForm slots

**Vue slots:**

- `emailField` — email input
- `passwordField` — password input
- `submitButton` — submit button
- `forgotPasswordLink` — forgot-password link
- `registerLink` — register link
- `guestCheckoutButton` — guest-checkout button
- `errorMessage` — server / validation error block

**Example:**

```vue
<LoginForm @submit="handleLogin">
  <template #errorMessage>
    <MyErrorBlock />
  </template>
  <template #submitButton>
    <MyCustomButton type="submit">Sign in</MyCustomButton>
  </template>
</LoginForm>
```

### FavoriteListItem slots

**Vue slots:**

- `image` — product image
- `sku` — SKU line
- `name` — product name
- `stock` — stock indicator
- `price` — price block
- `actions` — move / remove / add-to-cart controls

**Example:**

```vue
<FavoriteListItem :item="favoriteItem">
  <template #name>
    <MyBranding :item="favoriteItem" />
  </template>
  <template #actions>
    <MyCustomActions :item="favoriteItem" />
  </template>
</FavoriteListItem>
```

## ProductInfo expanded shell

`ProductInfo` now renders a full PDP layout when ANY of the new `show*`
props or injection components is passed. When none is passed, the legacy
minimal title+SKU output is preserved (backward compat).

To opt into the new shell:

```vue
<ProductInfo :product-id="42" :show-price="true" />
```

Once opted in, all sections default to `true`. Hide individual sections by
passing `false`:

```vue
<ProductInfo
  :product-id="42"
  :show-price="true"
  :show-bundles="false"
  :show-surcharges="false"
/>
```

Available toggles:
`showImage`, `showBadges`, `showFavorite`, `showPrice`, `showStock`,
`showAddToCart`, `showBundles`, `showBulkPrices`, `showSurcharges`,
plus pre-existing `showTitle` and `showSku`.

## Contract types

All slot contracts live in `propeller-v2-core-ui`:

- `PriceComponentProps`
- `StockComponentProps`
- `AddToCartComponentProps`
- `ImageComponentProps`
- `BadgesComponentProps`
- `FavoriteComponentProps`
- `ProductBundlesComponentProps`
- `ProductBulkPricesComponentProps`
- `ProductSurchargesComponentProps`

Import directly:

```ts
import type { PriceComponentProps } from 'propeller-v2-vue-ui';
// or
import type { PriceComponentProps } from 'propeller-v2-core-ui';
```

(`propeller-v2-vue-ui` re-exports them from `propeller-v2-core-ui` for
convenience.)

## Default sub-component exports

For decorate-don't-replace:

- `DefaultProductPrice` (alias of `ProductPrice`)
- `DefaultItemStock` (alias of `ItemStock`)
- `DefaultAddToCart` (alias of `AddToCart`)
- `DefaultAddToFavorite` (alias of `AddToFavorite`)
- `DefaultProductBundles` (alias of `ProductBundles`)
- `DefaultProductBulkPrices` (alias of `ProductBulkPrices`)
- `DefaultProductImage` (new — language-aware image picker)
- `DefaultProductBadges` (new — reads `imageLabel` attributes)
- `DefaultProductSurcharges` (new — formats `product.surcharges` / `cartItem.surcharges`)
