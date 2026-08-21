<template>
  <div v-if="labels.length > 0" :class="className ?? 'pointer-events-none absolute left-2 top-2 flex flex-col gap-1'">
    <span
      v-for="label in labels"
      :key="label"
      class="inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground shadow-sm"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { collectAttributeValues } from '@propeller-commerce/propeller-v2-core-ui';
import type { BadgesComponentProps } from '@propeller-commerce/propeller-v2-core-ui';

const props = defineProps<BadgesComponentProps>();

const labels = computed(() => {
  const target = props.product ?? props.cluster;
  if (!target) return [] as string[];
  const attributes = (target as { attributes?: unknown[] }).attributes ?? [];
  return collectAttributeValues(attributes as never, 'imageLabel') ?? [];
});

const className = computed(() => props.className);
</script>
