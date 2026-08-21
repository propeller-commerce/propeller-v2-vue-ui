<template>
  <button
    type="button"
    :class="`propeller-login-to-order inline-flex items-center justify-center gap-2 h-10 px-4 w-full rounded-[var(--radius-control)] bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity ${className || ''}`"
    @click="handleClick"
  >
    <User class="propeller-login-to-order__icon w-4 h-4" aria-hidden="true" />
    {{ getLabel('loginToOrder', 'Log in to order') }}
  </button>
</template>

<script setup lang="ts">
import { User } from 'lucide-vue-next';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';

export interface LoginToOrderButtonProps {
  /**
   * Invoked when the button is clicked. The host owns navigation — the package
   * cannot know whether the app routes with a router push or a plain redirect.
   * When omitted the button still renders but does nothing.
   */
  onLoginClick?: () => void;

  /** Translated labels. Key: `loginToOrder`. */
  labels?: Record<string, string>;

  /** Extra classes appended to the button. */
  className?: string;
}

const props = defineProps<LoginToOrderButtonProps>();

function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}

function handleClick(): void {
  if (props.onLoginClick) props.onLoginClick();
}
</script>
