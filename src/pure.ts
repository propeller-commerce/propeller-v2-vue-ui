/**
 * SSR-safe component surface for `propeller-v2-vue-ui`.
 *
 * Vue has no `"use client"` directive — every component renders fine under
 * `@vue/server-renderer`. So why a separate `/pure` entry? Two reasons:
 *
 *  1. **Import cost.** The main `.` entry pulls in the whole component tree
 *     plus the composables, `swiper`, `vue-hot-toast`, etc. A server module
 *     that only needs to render a price or a stock badge into the static
 *     shell should not drag that in.
 *  2. **SSR-correctness guarantee.** Every component re-exported here is
 *     verified to be purely presentational: no composable calls
 *     (`useCart`/`useProductSearch`/…), no `window`/`localStorage`/`document`,
 *     no `onMounted`-driven fetching. It produces identical output on the
 *     server and the client, so it can be rendered into the SSR shell with
 *     no hydration mismatch and no client-only fallback.
 *
 * For the interactive surface (components with composables, the provider, the
 * SDK seam) import from the main `propeller-v2-vue-ui` entry. For pure
 * utilities / types / `createServices` / `toPlain` use `propeller-v2-vue-ui/shared`.
 *
 * NOTE on `Breadcrumbs`: it accepts a `configuration` prop that may carry
 * function-valued URL builders. Functions don't serialize into the SSR state
 * payload — pass plain data, or build the breadcrumb hrefs on the server.
 */
export { default as Breadcrumbs } from './components/Breadcrumbs.vue';
export { default as CategoryShortDescription } from './components/CategoryShortDescription.vue';
export { default as GridTitle } from './components/GridTitle.vue';
export { default as ItemStock } from './components/ItemStock.vue';
export { default as MachineCard } from './components/MachineCard.vue';
export { default as OrderItemCard } from './components/OrderItemCard.vue';
export { default as OrderSummary } from './components/OrderSummary.vue';
export { default as OrderTotals } from './components/OrderTotals.vue';
export { default as ProductBulkPrices } from './components/ProductBulkPrices.vue';
export { default as ProductDownloads } from './components/ProductDownloads.vue';
export { default as ProductPrice } from './components/ProductPrice.vue';
export { default as ProductShortDescription } from './components/ProductShortDescription.vue';
export { default as ProductVideos } from './components/ProductVideos.vue';
