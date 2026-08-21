<template>
  <component
    :is="'script'"
    v-if="payload"
    type="application/ld+json"
    v-html="payload"
  />
</template>

<script setup lang="ts">
/**
 * Pure SSR-safe component. Emits a single `<script type="application/ld+json">`
 * containing a schema.org `ItemList` of `Product` items, one per element in
 * the `products` array. Scope is first-page only — caller passes whatever
 * array is present in the initial SSR HTML; client-side filter/sort/page
 * navigation does NOT update the script tag.
 *
 * See `ProductJsonLd.vue` for the dynamic-`script` rendering rationale.
 */
import { computed } from 'vue';
import type { Product } from '@propeller-commerce/propeller-sdk-v2';
import {
  buildItemListJsonLd,
  safeJsonStringify,
  type JsonLdContext,
} from '@propeller-commerce/propeller-v2-core-ui';

export interface ItemListJsonLdProps {
  /** First-page products (from server-side fetch). */
  products: ReadonlyArray<Product>;
  /** Per-request context: siteUrl, language, currency, portalMode, user, URL builders. */
  context: JsonLdContext;
}

const props = defineProps<ItemListJsonLdProps>();

const payload = computed<string | null>(() => {
  const data = buildItemListJsonLd(props.products, props.context);
  return data ? safeJsonStringify(data) : null;
});
</script>
