<template>
  <template v-if="!!html">
    <div
      :class="`propeller-product-description ${className || ''}`"
      :data-expanded="expanded ? 'true' : 'false'"
      :data-truncatable="shouldTruncate() ? 'true' : 'false'"
    >
      <template v-if="!shouldTruncate() || expanded">
        <div
          class="propeller-product-description__content prose prose-slate max-w-none text-muted-foreground"
          v-html="html"
        ></div>
      </template>

      <template v-if="shouldTruncate() && !expanded">
        <p class="propeller-product-description__truncated text-muted-foreground">{{ getTruncated() }}</p>
      </template>

      <template v-if="shouldTruncate()">
        <button
          type="button"
          class="propeller-product-description__toggle mt-2 text-sm font-medium text-primary hover:underline"
          @click="async (event) => toggle()"
        >
          <template v-if="expanded"> {{ getLabel('readLess', 'Read less') }} </template>

          <template v-if="!expanded"> {{ getLabel('readMore', 'Read more') }} </template>
        </button>
      </template>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { Product, Cluster, LocalizedString } from '@propeller-commerce/propeller-sdk-v2';
import { getLabel as _getLabel, getLanguageString, getLanguageUri } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface ProductDescriptionProps {
  /**
   * Product or Cluster object.
   * The component reads `product.descriptions` (an array of LocalizedString)
   * and renders the matching language entry as HTML.
   */
  product: Product | Cluster;

  /**
   * Language code used to resolve the correct localised description.
   * Defaults to 'NL'.
   */
  language?: string;

  /**
   * When true, the description is initially collapsed to `maxLength` characters.
   * A "Read more" / "Read less" toggle is shown.
   * Defaults to false.
   */
  collapsed?: boolean;

  /**
   * Maximum number of characters shown when collapsed.
   * Set to 0 to display the entire description without truncation.
   * Defaults to 0.
   */
  maxLength?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Translated labels: `readMore`, `readLess`. */
  labels?: Record<string, string>;
}
interface ProductDescriptionState {
  expanded: boolean;
  html: string;
  getDescription: () => string;
  getMaxLen: () => number;
  shouldTruncate: () => boolean;
  getTruncated: () => string;
  toggle: () => void;
}

const props = defineProps<ProductDescriptionProps>();
const infra = useInfraProps(props);
function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
const expanded = ref<ProductDescriptionState['expanded']>(false);
const html = ref<ProductDescriptionState['html']>('');

watch(
  () => [props.product, infra.language],
  () => {
    html.value = getDescription();
  },
  { immediate: true }
);
function getDescription(): ReturnType<ProductDescriptionState['getDescription']> {
  const product = props.product as Product;
  if (!product?.descriptions) return '';
  return getLanguageString(product.descriptions, infra.language || 'NL', '');
}
function getMaxLen(): ReturnType<ProductDescriptionState['getMaxLen']> {
  const max = props.maxLength;
  if (!max || (max as number) <= 0) return 0;
  return max as number;
}
function shouldTruncate(): ReturnType<ProductDescriptionState['shouldTruncate']> {
  if (props.collapsed === false) return false;
  if (!props.collapsed) return false;
  const maxLen = getMaxLen();
  if (maxLen === 0) return false;
  const plain = html.value.replace(/<[^>]*>/g, '');
  return plain.length > maxLen;
}
function getTruncated(): ReturnType<ProductDescriptionState['getTruncated']> {
  const plain = html.value.replace(/<[^>]*>/g, '');
  const maxLen = getMaxLen();
  if (maxLen === 0 || plain.length <= maxLen) return html.value;
  const truncated = plain.substring(0, maxLen);
  return truncated.substring(0, truncated.lastIndexOf(' ')) + '\u2026';
}
function toggle(): ReturnType<ProductDescriptionState['toggle']> {
  expanded.value = !expanded.value;
}
</script>
