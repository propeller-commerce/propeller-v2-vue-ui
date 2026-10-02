<template>
  <component
    v-if="resolved"
    :is="resolved"
    :src="src"
    :alt="alt"
    :class="className"
    :width="width"
    :height="height"
    :loading="loading"
    @click="(event: Event) => $emit('click', event)"
  />
  <img
    v-else
    :src="src"
    :alt="alt"
    :class="className"
    :width="width"
    :height="height"
    :loading="loading"
    @click="$emit('click', $event)"
  />
</template>

<script setup lang="ts">
/** The package's single `<img>` site. Falls back to `<img>` when nothing is injected. */
import { computed, type Component } from 'vue';
import type { ImgComponentProps } from '@propeller-commerce/propeller-v2-core-ui';
import { useImgComponent } from '../plugin';

export interface PropellerImgProps {
  src: string;
  /** `''` for decorative images; always emitted. */
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  /** Overrides the plugin's image component for this one surface. */
  as?: Component<ImgComponentProps>;
}

const props = defineProps<PropellerImgProps>();
defineEmits<{ click: [event: Event] }>();

const injected = useImgComponent();
const resolved = computed(() => props.as ?? injected);
</script>
