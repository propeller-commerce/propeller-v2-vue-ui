<template>
  <div
    :class="`propeller-machine-card group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-container)] border border-border bg-card ${className ?? ''}`"
  >
    <a
      :href="href"
      class="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @click="handleClick"
    >
      <div
        v-if="showImage"
        class="propeller-machine-card__image aspect-square w-full overflow-hidden bg-surface-hover"
      >
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="name"
          loading="lazy"
          class="h-full w-full object-contain object-top"
        />
        <!-- Decorative placeholder: the name below already labels the card. -->
        <div
          v-else
          aria-hidden="true"
          class="propeller-machine-card__image-placeholder flex h-full w-full items-center justify-center text-foreground-subtle"
        >
          <svg
            class="h-12 w-12"
            fill="none"
            stroke="currentColor"
            :stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm9 4.5 9-4.5m-9 4.5-9-4.5m9 4.5V21"
            />
          </svg>
        </div>
      </div>

      <div
        class="propeller-machine-card__body flex flex-1 flex-col gap-1 p-4"
      >
        <span
          class="propeller-machine-card__name font-medium text-foreground group-hover:text-primary"
        >
          {{ name }}
        </span>

        <span
          v-if="description"
          class="propeller-machine-card__description line-clamp-2 text-sm text-foreground-subtle"
        >
          {{ description }}
        </span>

        <!-- Styled as a full-width button matching AddToCart's secondary colour.
             It's a span, not a button — the whole card is already the <a>, and a
             button inside an anchor is invalid; group-hover mirrors AddToCart's
             hover since the card is the hover target. -->
        <span
          class="propeller-machine-card__view mt-auto inline-flex w-full items-center justify-center rounded-[var(--radius-control)] h-10 px-6 text-sm font-medium text-secondary-foreground bg-secondary transition-colors group-hover:bg-secondary/90"
        >
          {{ viewLabel }}
        </span>
      </div>
    </a>
  </div>
</template>

<script setup lang="ts">
/**
 * MachineCard (Vue) — a single node in the spare-parts machine tree, rendered as
 * a card that navigates one level deeper.
 *
 * Deliberately a plain link, not an add-to-cart surface: a machine is a
 * container you browse into. Presentational only (SSR-safe → also in `pure.ts`).
 * Mirrors `propeller-v2-react-ui`'s `MachineCard`.
 */
import { computed } from 'vue';
import type { SparePartsMachine } from '@propeller-commerce/propeller-sdk-v2';
import { getLabel, getLocalizedValue } from '@propeller-commerce/propeller-v2-core-ui';

export interface MachineCardProps {
  /** The machine (spare-parts tree node) to display. */
  machine: SparePartsMachine;
  /**
   * Destination for the card link — the child node's URL.
   *
   * Passed in rather than derived from `configuration.urls` because a machine's
   * URL is its ancestor path (`/machines/a/b/c`), which only the host route
   * knows; the machine object carries just its own slug.
   */
  href: string;
  /** Show the machine image. Defaults to true. */
  showImage?: boolean;
  /** Show the machine description under the name. Defaults to false. */
  showDescription?: boolean;
  /** Language used to resolve the localized name/description. */
  language?: string;
  /** UI label overrides. Supported key: `viewMachine`. */
  labels?: Record<string, string>;
  /** Extra classes on the card root. */
  className?: string;
  /** Click handler for the card link (e.g. analytics). Does not prevent navigation. */
  onClick?: (machine: SparePartsMachine) => void;
}

const props = withDefaults(defineProps<MachineCardProps>(), {
  showImage: true,
  showDescription: false,
});

/** First image variant URL, mirroring `getProductImageUrl`'s media walk. */
function getMachineImageUrl(machine: SparePartsMachine | null | undefined): string {
  return machine?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}

const name = computed(() => getLocalizedValue(props.machine.name, props.language));
const description = computed(() =>
  props.showDescription ? getLocalizedValue(props.machine.description, props.language) : ''
);
const imageUrl = computed(() => (props.showImage ? getMachineImageUrl(props.machine) : ''));
const viewLabel = computed(() => getLabel(props.labels, 'viewMachine', 'View'));

function handleClick(): void {
  props.onClick?.(props.machine);
}
</script>
