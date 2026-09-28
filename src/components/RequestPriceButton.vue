<template>
  <button
    type="button"
    :data-added="added ? 'true' : 'false'"
    :class="`propeller-request-price inline-flex items-center justify-center gap-2 h-10 px-4 w-full rounded-[var(--radius-control)] text-sm font-medium transition-opacity hover:opacity-90 ${
      added && !anonymous
        ? 'bg-surface-hover text-foreground border border-border'
        : 'bg-primary text-primary-foreground'
    } ${className || ''}`"
    @click="handleClick"
  >
    <Tag class="propeller-request-price__icon w-4 h-4" aria-hidden="true" />
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Tag } from 'lucide-vue-next';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';

export interface RequestPriceButtonProps {
  /** Adds the product to the price-request list. */
  onRequestPrice?: () => void;
  /**
   * Sends an anonymous visitor to log in. A quote is addressed to someone, so
   * the list is only offered to signed-in shoppers.
   */
  onLoginClick?: () => void;
  /** True once the product is on the list. */
  added?: boolean;
  /** Whether a session exists. Anonymous visitors get the log-in action. */
  isAuthenticated?: boolean;
  /** Translated labels. Keys: `requestPrice`, `priceRequested`. */
  labels?: Record<string, string>;
  /** Extra classes appended to the button. */
  className?: string;
}

const props = defineProps<RequestPriceButtonProps>();

const anonymous = computed<boolean>(() => !props.isAuthenticated);

const label = computed<string>(() => {
  if (anonymous.value) return _getLabel(props.labels, 'requestPrice', 'Request a price');
  return props.added
    ? _getLabel(props.labels, 'priceRequested', 'On your request list')
    : _getLabel(props.labels, 'requestPrice', 'Request a price');
});

function handleClick(): void {
  if (anonymous.value) {
    if (props.onLoginClick) props.onLoginClick();
    return;
  }
  if (props.onRequestPrice) props.onRequestPrice();
}
</script>
