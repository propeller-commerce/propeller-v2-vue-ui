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
 * Pure SSR-safe component. Emits a `<script type="application/ld+json">` with
 * a schema.org Product payload representing the cluster (clusters use
 * `@type: "Product"` — schema.org has no Cluster type; the cluster's
 * `defaultProduct` supplies brand/SKU/price/image).
 *
 * See `ProductJsonLd.vue` for the dynamic-`script` rendering rationale.
 */
import { computed } from 'vue';
import type { Cluster } from '@propeller-commerce/propeller-sdk-v2';
import {
  buildClusterJsonLd,
  safeJsonStringify,
  type JsonLdContext,
} from '@propeller-commerce/propeller-v2-core-ui';

export interface ClusterJsonLdProps {
  /** The cluster to describe. */
  cluster: Cluster;
  /** Per-request context: siteUrl, language, currency, portalMode, user, URL builders. */
  context: JsonLdContext;
}

const props = defineProps<ClusterJsonLdProps>();

const payload = computed<string | null>(() => {
  const data = buildClusterJsonLd(props.cluster, props.context);
  return data ? safeJsonStringify(data) : null;
});
</script>
