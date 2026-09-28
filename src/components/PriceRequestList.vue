<template>
  <div v-if="sent" :class="`propeller-price-request ${className || ''}`">
    <p class="propeller-price-request__sent py-8 text-center text-foreground">
      {{ L('sent', 'Price request sent. We will contact you.') }}
    </p>
  </div>

  <div v-else-if="!items.length" :class="`propeller-price-request ${className || ''}`">
    <p class="propeller-price-request__empty py-8 text-center text-foreground-subtle">
      {{ L('empty', 'Your price request list is empty.') }}
    </p>
  </div>

  <form v-else :class="`propeller-price-request ${className || ''}`" @submit="handleSubmit">
    <h2 class="propeller-price-request__title mb-4 text-xl font-semibold text-foreground">
      {{ L('title', 'Price request') }}
    </h2>

    <table class="propeller-price-request__table w-full text-sm">
      <thead>
        <tr class="border-b border-border text-left text-foreground-subtle">
          <th scope="col" class="py-2 pr-4 font-medium">{{ L('colCode', 'Article no. / SKU') }}</th>
          <th scope="col" class="py-2 pr-4 font-medium">{{ L('colName', 'Product name') }}</th>
          <th scope="col" class="py-2 pr-4 font-medium">{{ L('colQuantity', 'Quantity') }}</th>
          <th scope="col" class="py-2 w-10"><span class="sr-only">{{ L('remove', 'Remove') }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.code" class="border-b border-border-subtle">
          <td class="py-2 pr-4 font-mono text-xs text-foreground">{{ item.code }}</td>
          <td class="py-2 pr-4 text-foreground">{{ item.name }}</td>
          <td class="py-2 pr-4">
            <label class="sr-only" :for="`pr-qty-${item.code}`">
              {{ L('colQuantity', 'Quantity') }}
            </label>
            <input
              :id="`pr-qty-${item.code}`"
              type="number"
              :min="item.minQuantity"
              :step="item.unit || 1"
              :value="item.quantity"
              @input="onQuantityInput(item.code, item.minQuantity, $event)"
              class="w-20 rounded border border-border bg-background px-2 py-1"
            />
          </td>
          <td class="py-2">
            <button
              type="button"
              @click="onRemove && onRemove(item.code)"
              :aria-label="L('remove', 'Remove')"
              :title="L('remove', 'Remove')"
              class="text-foreground-subtle transition-colors hover:text-destructive"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="propeller-price-request__comment mt-6">
      <label
        for="propeller-price-request-comment"
        class="mb-2 block font-medium text-foreground"
      >
        {{ L('comments', 'Comments') }}
      </label>
      <textarea
        id="propeller-price-request-comment"
        v-model="comment"
        :rows="4"
        class="w-full rounded border border-border bg-background px-3 py-2"
      ></textarea>
    </div>

    <button
      type="submit"
      :disabled="submitting"
      class="propeller-price-request__submit mt-4 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {{ submitting ? L('sending', 'Sending…') : L('send', 'Send request') }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import type { PriceRequestItem } from '../composables/shared/utils/priceRequestList';

export interface PriceRequestListProps {
  /** The collected products. Pass `items` from `usePriceRequest`. */
  items: PriceRequestItem[];
  /** Drops a product from the list. */
  onRemove?: (code: string) => void;
  /** Changes a requested quantity. */
  onQuantityChange?: (code: string, quantity: number) => void;
  /** Sends the request. Resolves true on success. */
  onSubmit?: (comment: string) => Promise<boolean> | boolean;
  /** True while the request is in flight. */
  submitting?: boolean;
  /**
   * Override any UI string. Keys: `title`, `colCode`, `colName`, `colQuantity`,
   * `comments`, `send`, `sending`, `empty`, `remove`, `sent`.
   */
  labels?: Record<string, string>;
  /** Extra CSS class applied to the root element. */
  className?: string;
}

const props = defineProps<PriceRequestListProps>();

const comment = ref('');
const sent = ref(false);

function L(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}

function onQuantityInput(code: string, minQuantity: number, event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  props.onQuantityChange?.(code, parseInt(raw, 10) || minQuantity);
}

async function handleSubmit(e: Event): Promise<void> {
  e.preventDefault();
  if (!props.onSubmit) return;
  const ok = await props.onSubmit(comment.value);
  if (ok) {
    comment.value = '';
    sent.value = true;
  }
}
</script>
