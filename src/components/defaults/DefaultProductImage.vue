<!-- src/components/defaults/DefaultProductImage.vue -->
<template>
  <img
    v-if="url"
    :src="url"
    :alt="altText"
    :class="className ?? 'h-full w-full object-contain'"
    loading="lazy"
  />
  <div
    v-else
    :class="className ?? 'propeller-default-image-placeholder flex items-center justify-center bg-surface-hover'"
    aria-hidden="true"
  >
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-12 w-12 text-foreground-subtle">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        :stroke-width="1"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getLanguageString } from '@propeller-commerce/propeller-v2-core-ui';
import type { ImageComponentProps } from '@propeller-commerce/propeller-v2-core-ui';

/**
 * Default product / cluster image renderer for the extension API.
 *
 * Vue mirror of React's DefaultProductImage. Picks the best image URL for the
 * consumer's language with a 4-step fallback chain:
 *   1. imageVariant matching target language
 *   2. originalUrl matching target language
 *   3. any imageVariant URL (any language)
 *   4. any originalUrl (any language)
 * Falls back to a placeholder SVG when no URL resolves.
 */

interface LocalizedImage {
  language?: string;
  originalUrl?: string;
}
interface ImageVariant {
  language?: string;
  url?: string;
  name?: string;
}
interface MediaItem {
  images?: LocalizedImage[];
  imageVariants?: ImageVariant[];
}

const props = defineProps<ImageComponentProps>();

function pickImageUrl(mediaItems: MediaItem[], target: string): string | null {
  if (!mediaItems || mediaItems.length === 0) return null;
  for (const m of mediaItems) {
    const match = m.imageVariants?.find((v) => v.language === target && v.url);
    if (match?.url) return match.url;
  }
  for (const m of mediaItems) {
    const match = m.images?.find((i) => i.language === target && i.originalUrl);
    if (match?.originalUrl) return match.originalUrl;
  }
  for (const m of mediaItems) {
    const first = m.imageVariants?.find((v) => v.url);
    if (first?.url) return first.url;
  }
  for (const m of mediaItems) {
    const first = m.images?.find((i) => i.originalUrl);
    if (first?.originalUrl) return first.originalUrl;
  }
  return null;
}

const targetLanguage = computed(() => props.language ?? 'NL');

const mediaItems = computed<MediaItem[]>(() => {
  const target =
    props.product ??
    (props.cluster as { defaultProduct?: unknown } | undefined)?.defaultProduct ??
    props.cluster;
  return (
    (target as { media?: { images?: { items?: unknown[] } } } | undefined)?.media?.images?.items ?? []
  ) as MediaItem[];
});

const url = computed(() => pickImageUrl(mediaItems.value, targetLanguage.value));

const altText = computed(() => {
  const target = props.product ?? props.cluster;
  if (!target) return '';
  const name = (target as { name?: unknown }).name;
  if (Array.isArray(name)) {
    return getLanguageString(name as never, targetLanguage.value, '') ?? '';
  }
  return typeof name === 'string' ? name : '';
});

const className = computed(() => props.className);
</script>
