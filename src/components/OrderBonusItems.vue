<template>
  <!--
    An order's bonus items — free items added through incentives — as a
    read-only "Bonus items" section (heading + table of OrderItemCard rows).
    Bonus items are order items of class 'product' with isBonus === 'Y'. The
    discount lives on a sibling 'incentive' item linked via parentOrderItemId,
    so each line is netted against its siblings before display.
    Renders nothing when empty, so it's safe to drop into any order surface.
  -->
  <div
    v-if="bonusItems.length > 0"
    :class="`propeller-order-bonus-items ${className || 'mb-8'}`"
  >
    <h3
      class="propeller-order-bonus-items__title text-lg font-bold mb-3 text-foreground"
    >
      {{ getLabel("title", "Bonus items") }}
    </h3>
    <div
      class="propeller-order-bonus-items__table bg-card rounded-[var(--radius-container)] shadow overflow-hidden"
    >
      <table class="w-full">
        <component
          :is="OrderItemCardImpl"
          v-for="item in bonusItems"
          :key="item.id"
          :orderItem="item"
          :titleLinkable="false"
          :currency="resolvedCurrency"
        />
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import { Order, OrderItem } from "@propeller-commerce/propeller-sdk-v2";
import { getLabel as _getLabel, getNettedBonusItems } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from "../composables/vue/useInfraProps";
import DefaultOrderItemCard from "./OrderItemCard.vue";

export interface OrderBonusItemsProps {
  /** Order whose bonus items are displayed. When omitted, pass `items` directly. */
  order?: Order | null;
  /** Pre-resolved order items. When omitted, `order.items` is used. */
  items?: OrderItem[];
  /** Currency symbol for prices, forwarded to OrderItemCard. Resolved from the Propeller provider when omitted; defaults to '€'. */
  currency?: string;
  /** Additional CSS class for the root element. */
  className?: string;
  /** Label overrides. Keys: `title` ('Bonus items'). */
  labels?: Record<string, string>;
  // ───── Extension API ─────
  orderItemCardComponent?: Component;
}

const props = withDefaults(defineProps<OrderBonusItemsProps>(), {
  order: null,
});

const OrderItemCardImpl = computed(() => props.orderItemCardComponent ?? DefaultOrderItemCard);

// `currency` resolves from the Propeller provider when not passed explicitly.
const resolvedCurrency = computed(() => useInfraProps(props).currency);

const bonusItems = computed<OrderItem[]>(() =>
  getNettedBonusItems(props.items ?? props.order?.items ?? []),
);

function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
</script>
