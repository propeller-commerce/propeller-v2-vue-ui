<template>
  <template v-if="!!html">
    <div
      v-html="html"
      :class="`propeller-product-short-description prose prose-slate max-w-none text-muted-foreground ${
        className || ''
      }`"
    ></div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { Product, Cluster, LocalizedString } from '@propeller-commerce/propeller-sdk-v2';
import { getLanguageString, getLanguageUri } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface ProductShortDescriptionProps {
  /**
   * Product or Cluster object.
   * The component reads `product.shortDescriptions` (an array of LocalizedString)
   * and renders the matching language entry as HTML.
   */
  product: Product | Cluster;

  /**
   * Language code used to resolve the correct localised short description.
   * Defaults to 'NL'.
   */
  language?: string;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface ProductShortDescriptionState {
  html: string;
  getShortDescription: () => string;
}

const props = defineProps<ProductShortDescriptionProps>();
const infra = useInfraProps(props);
const html = ref<ProductShortDescriptionState['html']>('');

watch(
  () => [props.product, infra.language],
  () => {
    html.value = getShortDescription();
  },
  { immediate: true }
);
function getShortDescription(): ReturnType<ProductShortDescriptionState['getShortDescription']> {
  const product = props.product as Product;
  if (!product?.shortDescriptions) return '';
  return getLanguageString(product.shortDescriptions, infra.language || 'NL', '');
}
</script>
