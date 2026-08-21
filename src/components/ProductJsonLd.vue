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
 * with the schema.org Product payload built from the SDK `Product`.
 *
 * Renders nothing when the input has no usable name AND no URL. Offers are
 * gated by portal mode (semi-closed + anonymous → no `offers` block).
 *
 * The component uses `<component :is="'script'">` rather than a literal
 * `<script>` element in the template because Vue's template compiler treats
 * a literal `<script>` as the SFC's own script block. The dynamic-component
 * wrapper sidesteps that parsing rule and emits a real `<script>` element in
 * the rendered DOM (and in the SSR output).
 *
 * No `@unhead/vue` dep — keeps the package framework-head-agnostic.
 * Crawlers accept JSON-LD anywhere in the HTML, not just `<head>`.
 */
import { computed } from 'vue';
import type { Product } from '@propeller-commerce/propeller-sdk-v2';
import {
  buildProductJsonLd,
  safeJsonStringify,
  type JsonLdContext,
} from '@propeller-commerce/propeller-v2-core-ui';

export interface ProductJsonLdProps {
  /** The product to describe. */
  product: Product;
  /** Per-request context: siteUrl, language, currency, portalMode, user, URL builders. */
  context: JsonLdContext;
}

const props = defineProps<ProductJsonLdProps>();

const payload = computed<string | null>(() => {
  const data = buildProductJsonLd(props.product, props.context);
  return data ? safeJsonStringify(data) : null;
});
</script>
