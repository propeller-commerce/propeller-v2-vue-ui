<template>
  <div :class="`propeller-cart-carriers ${containerClass}`">
    <template v-if="carriers.length > 0">
      <div
        class="propeller-cart-carriers__grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        role="radiogroup"
        :aria-label="getLabel('carriersLabel', 'Delivery method')"
      >
        <template
          :key="`${carrier.name}-${index}`"
          v-for="(carrier, index) in carriers"
        >
          <div
            @click="async (event) => handleSelect(carrier)"
            @keydown="radioGroupKeydown"
            role="radio"
            :aria-checked="activeName === carrier.name ? 'true' : 'false'"
            :tabindex="radioTabIndex(activeName === carrier.name, index, activeName !== '')"
            :data-selected="activeName === carrier.name ? 'true' : 'false'"
            :class="`propeller-cart-carriers__carrier relative cursor-pointer border rounded-[var(--radius-container)] p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 flex flex-col items-center justify-center gap-2 text-center aspect-square transition-all ${
              activeName === carrier.name
                ? 'border-secondary bg-secondary/5 shadow-sm'
                : 'border-border hover:border-secondary/30'
            }`"
          >
            <template v-if="showPrice !== false">
              <span
                class="propeller-cart-carriers__carrier-price absolute top-2 right-2 text-xs bg-surface-hover text-muted-foreground px-2 py-0.5 rounded-full"
                >{{ formatCarrierPrice(carrier.price) }}</span
              >
            </template>
            <template v-if="showLogo && getLogoUrl(carrier)">
              <span
                class="propeller-cart-carriers__carrier-logo-wrap flex items-center justify-center h-10 w-full"
              >
                <img
                  class="propeller-cart-carriers__carrier-logo max-h-10 max-w-[80%] w-auto object-contain"
                  :src="getLogoUrl(carrier)"
                  :alt="carrier.name"
                />
              </span>
            </template>
            <span
              class="propeller-cart-carriers__carrier-name font-medium text-sm"
              >{{ carrier.name }}</span
            >
            <template v-if="carrier.deliveryDeadline">
              <p
                class="propeller-cart-carriers__carrier-deadline text-xs text-muted-foreground"
              >
                {{ getLabel("deliveryDeadline", "Delivery deadline:")
                }}{{ carrier.deliveryDeadline }}
              </p>
            </template>
          </div>
        </template>
      </div>
    </template>

    <template v-if="carriers.length === 0">
      <p class="propeller-cart-carriers__empty text-muted-foreground italic">
        {{ getLabel("noCarriers", "No carriers available.") }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { Cart, CartCarrier } from "@propeller-commerce/propeller-sdk-v2";
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';
import { radioGroupKeydown, radioTabIndex } from '../composables/shared/utils/radioGroup';
import { pickPreselected } from '../composables/shared/utils/preselect';

export interface CartCarriersProps {
  /** Shopping cart object from which the carriers will be displayed */
  cart: Cart;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /** The CSS class for the carriers container */
  carriersContainerClass?: string;

  /** Display the carrier logo */
  showCarrierLogo?: boolean;

  /** Action when a carrier is selected */
  onCarrierSelect?: (carrier: CartCarrier) => void;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Show carrier price (default: true) */
  showPrice?: boolean;

  /** Labels for the component */
  labels?: Record<string, string>;
}
interface CartCarriersState {
  selectedName: string;
  containerClass: string;
  showLogo: boolean;
  carriers: CartCarrier[];
  getLabel: (key: string, fallback: string) => string;
  formatCarrierPrice: (price: number) => string;
  getLogoUrl: (carrier: CartCarrier) => string;
  handleSelect: (carrier: CartCarrier) => void;
}

const props = withDefaults(defineProps<CartCarriersProps>(), {
  showCarrierLogo: true,
  showPrice: true,
});
const infra = useInfraProps(props);
const selectedName = ref<CartCarriersState["selectedName"]>("");

const containerClass = computed(() => {
  return props.carriersContainerClass || "cart-carriers";
});
const showLogo = computed(() => {
  return props.showCarrierLogo !== undefined ? props.showCarrierLogo : true;
});
const carriers = computed(() => {
  return props.cart?.carriers || [];
});

// Something is always selected — the cart's stored carrier, else the first one
// offered, so the user can hit Continue without a click. Computed
// rather than assigned state so it is right in the first render; the cart
// arrives after mount.
const preselected = computed(() =>
  pickPreselected(
    carriers.value,
    props.cart?.postageData?.carrier as string | undefined,
    (c: CartCarrier) => c.name,
  ),
);
const activeName = computed(() => selectedName.value || preselected.value?.name || "");

// Report the preselection upwards. Deliberately NOT an `immediate` watch —
// that also fires during SSR, where the host's callback would mutate the cart
// while rendering. A user pick sets `selectedName` and takes over from here.
function notifyPreselection() {
  if (selectedName.value || !preselected.value) return;
  if (props.onCarrierSelect) props.onCarrierSelect(preselected.value);
}
watch(() => preselected.value?.name, notifyPreselection);
onMounted(notifyPreselection);
function getLabel(
  key: string,
  fallback: string,
): ReturnType<CartCarriersState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
function formatCarrierPrice(
  price: number,
): ReturnType<CartCarriersState["formatCarrierPrice"]> {
  if (props.formatPrice) {
    return props.formatPrice(price);
  }
  return _formatPrice(price || 0, { symbol: infra.currency ?? "€", locale: localeForLanguage(infra.language) });
}
function getLogoUrl(
  carrier: CartCarrier,
): ReturnType<CartCarriersState["getLogoUrl"]> {
  return carrier.logo || "";
}
function handleSelect(
  carrier: CartCarrier,
): ReturnType<CartCarriersState["handleSelect"]> {
  selectedName.value = carrier.name;
  if (props.onCarrierSelect) {
    props.onCarrierSelect(carrier);
  }
}
</script>
