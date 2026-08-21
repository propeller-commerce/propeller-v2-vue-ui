<template>
  <ul v-if="surcharges.length > 0" :class="className ?? 'text-xs text-foreground-subtle space-y-0.5'">
    <li v-for="(s, idx) in surcharges" :key="s?.id ?? idx">
      {{ getLabelFor(s) }}: {{ formatSurcharge(s as never, includeTax as never) }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatSurcharge, getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import type { ProductSurchargesComponentProps } from '@propeller-commerce/propeller-v2-core-ui';

const props = defineProps<ProductSurchargesComponentProps>();

const surcharges = computed(() => {
  const src =
    (props.cartItem as { surcharges?: unknown[] } | undefined)?.surcharges ??
    (props.product as { surcharges?: unknown[] } | undefined)?.surcharges ??
    [];
  return src as Array<{
    id?: string | number;
    code?: string;
    name?: string;
    description?: string;
  }>;
});

const includeTax = computed(() => props.includeTax);
const className = computed(() => props.className);

function getLabelFor(s: { code?: string; name?: string; description?: string }): string {
  const labelKey = s?.code ?? 'surcharge';
  const fallback = s?.description ?? s?.name ?? 'Surcharge';
  return getLabel(props.labels, labelKey, fallback);
}
</script>
