<template>
  <!--
    Cart bonus items — free items added through incentives — as a read-only
    list (image, name, SKU, quantity, total price). No quantity stepper, delete
    or cross-sells: bonus items aren't directly editable. Renders nothing when
    empty, so it's safe to drop into any cart surface unconditionally.
  -->
  <div
    v-if="bonusItems.length > 0"
    :class="`propeller-cart-bonus-items ${className || 'mt-2'}`"
  >
    <h2 class="propeller-cart-bonus-items__title text-lg font-semibold mb-3">
      {{ getLabel("title", "Bonus items") }}
    </h2>
    <div class="propeller-cart-bonus-items__list space-y-4">
      <div
        v-for="item in bonusItems"
        :key="item.itemId"
        class="propeller-cart-bonus-item flex items-center gap-4 bg-card p-4 rounded-[var(--radius-container)] shadow-sm border border-border"
      >
        <div
          class="propeller-cart-bonus-item__media w-20 h-20 flex-shrink-0 bg-surface-hover rounded-[var(--radius-control)] overflow-hidden flex items-center justify-center"
        >
          <img
            v-if="getItemImageUrl(item)"
            class="propeller-cart-bonus-item__image w-full h-full object-contain p-1"
            :src="getItemImageUrl(item)"
            :alt="getItemName(item)"
          />
          <svg
            v-else
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="propeller-cart-bonus-item__image-placeholder w-8 h-8 text-foreground-subtle"
            :strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            ></path>
          </svg>
        </div>
        <div class="propeller-cart-bonus-item__body flex-1 min-w-0">
          <p
            v-if="item.product?.sku"
            class="propeller-cart-bonus-item__sku font-mono text-xs text-foreground-subtle"
          >
            {{ getLabel("sku", "SKU") }}: {{ item.product.sku }}
          </p>
          <p
            class="propeller-cart-bonus-item__title font-semibold text-sm md:text-base text-foreground line-clamp-2"
          >
            {{ getItemName(item) }}
          </p>
        </div>
        <div
          class="propeller-cart-bonus-item__qty text-sm text-muted-foreground whitespace-nowrap"
        >
          {{ item.quantity }} &times;
        </div>
        <div
          class="propeller-cart-bonus-item__price font-semibold text-foreground whitespace-nowrap"
        >
          {{ getItemTotal(item) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Cart, CartBaseItem } from "@propeller-commerce/propeller-sdk-v2";
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { getLocalizedValue as _getLocalizedValue } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from "../composables/vue/useInfraProps";

export interface CartBonusItemsProps {
  /** Cart whose `bonusItems` (free items added via incentives) are displayed. */
  cart?: Cart | null;
  /** Pre-resolved bonus items. When omitted, `cart.bonusItems` is used. */
  bonusItems?: CartBaseItem[];
  /** When true, the tax-inclusive total (`totalPriceNet`) is shown. Resolved from the Propeller provider when omitted; defaults to false. */
  includeTax?: boolean;
  /** Currency symbol for prices. Resolved from the Propeller provider when omitted; defaults to '€'. */
  currency?: string;
  /** Active language for localized product names. Resolved from the Propeller provider when omitted. */
  language?: string;
  /** Additional CSS class for the root element. */
  className?: string;
  /** Label overrides. Keys: `title` ('Bonus items'), `sku` ('SKU'). */
  labels?: Record<string, string>;
}

const props = withDefaults(defineProps<CartBonusItemsProps>(), {
  cart: null,
});

// Resolve currency / includeTax / language from the Propeller provider when
// not passed explicitly (explicit props still win). Computed so it stays
// reactive to provider changes (e.g. VAT toggle, language switch).
const infra = useInfraProps(props);

const bonusItems = computed<CartBaseItem[]>(
  () => props.bonusItems ?? props.cart?.bonusItems ?? [],
);

function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
function getItemName(item: CartBaseItem): string {
  return _getLocalizedValue(item.product?.names, infra.language as string, "Product");
}
function getItemImageUrl(item: CartBaseItem): string {
  return item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || "";
}
function getItemTotal(item: CartBaseItem): string {
  const total = infra.includeTax ? item.totalPriceNet : item.totalPrice;
  return _formatPrice(Number(total ?? 0), { symbol: infra.currency ?? "€", locale: localeForLanguage(props.language) });
}
</script>
