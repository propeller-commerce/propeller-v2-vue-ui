<template>
  <div :class="`propeller-cart-paymethods ${containerClass}`">
    <template v-if="payMethods.length > 0">
      <div
        class="propeller-cart-paymethods__grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        role="radiogroup"
        :aria-label="getLabel('methodsLabel', 'Payment method')"
      >
        <template :key="method.code" v-for="(method, index) in payMethods">
          <div
            @click="async (event) => handleSelect(method)"
            @keydown="radioGroupKeydown"
            role="radio"
            :aria-checked="activeCode === method.code ? 'true' : 'false'"
            :tabindex="radioTabIndex(activeCode === method.code, index, activeCode !== '')"
            :data-selected="activeCode === method.code ? 'true' : 'false'"
            :class="`propeller-cart-paymethods__method relative cursor-pointer border rounded-[var(--radius-container)] p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 flex flex-col items-center justify-center gap-2 text-center aspect-square transition-all ${
              activeCode === method.code
                ? 'border-secondary bg-secondary/5 shadow-sm'
                : 'border-border hover:border-secondary/30'
            }`"
          >
            <template v-if="method.price > 0">
              <span
                class="propeller-cart-paymethods__method-price absolute top-2 right-2 text-xs bg-surface-hover text-muted-foreground px-2 py-0.5 rounded-full"
                >{{ formatMethodPrice(method.price) }}</span
              >
            </template>
            <template v-if="showLogo && getLogoUrl(method)">
              <span
                class="propeller-cart-paymethods__method-logo-wrap flex items-center justify-center h-10 w-full"
              >
                <img
                  class="propeller-cart-paymethods__method-logo max-h-10 max-w-[80%] w-auto object-contain"
                  :src="getLogoUrl(method)"
                  :alt="methodName(method)"
                />
              </span>
            </template>
            <span
              class="propeller-cart-paymethods__method-name font-medium text-sm"
              >{{ methodName(method) }}</span
            >
          </div>
        </template>
      </div>
    </template>

    <template v-if="payMethods.length === 0">
      <p class="propeller-cart-paymethods__empty text-muted-foreground italic">
        {{ getLabel("noMethods", "No payment methods available.") }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { Cart, CartPaymethod, Contact, Customer } from "@propeller-commerce/propeller-sdk-v2";
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';
import { radioGroupKeydown, radioTabIndex } from '../composables/shared/utils/radioGroup';
import { pickPreselected } from '../composables/shared/utils/preselect';

export interface CartPaymethodsProps {
  /** Shopping cart object from which the payment methods will be displayed */
  cart: Cart;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /** Authenticated user — used for cart creation / lookup. Resolved from PropellerProvider when omitted. */
  user?: Contact | Customer | null;

  /** The CSS class for the payment methods container */
  paymentsContainerClass?: string;

  /** Display the on account payment method for anonymous users */
  showOnAccountForGuests?: boolean;

  /** Display the payment method logo (default: true). Falls back to the name when no logo is set. */
  showPaymethodLogo?: boolean;

  /** Action when a payment method is selected */
  onPaymethodSelect?: (paymethod: CartPaymethod) => void;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /**
   * Localized display names for payment methods, keyed by the method **code**
   * (lower-cased, e.g. `{ pickup: 'Bij afhalen', on_account: 'Op rekening' }`).
   * The backend `method.name` is often an un-localized English string, so this
   * map lets the host override it per locale. Lookup order:
   * `paymethodLabels[code]` → `method.name` → `method.code`.
   */
  paymethodLabels?: Record<string, string>;
}
interface CartPaymethodsState {
  selectedCode: string;
  containerClass: string;
  showOnAccountForGuests: boolean;
  showLogo: boolean;
  isGuest: boolean;
  payMethods: CartPaymethod[];
  isOnAccountMethod: (method: CartPaymethod) => boolean;
  getLabel: (key: string, fallback: string) => string;
  formatMethodPrice: (price: number) => string;
  getLogoUrl: (method: CartPaymethod) => string;
  handleSelect: (method: CartPaymethod) => void;
}

const props = withDefaults(defineProps<CartPaymethodsProps>(), {
  showOnAccountForGuests: false,
  showPaymethodLogo: true,
});
const infra = useInfraProps(props);
const selectedCode = ref<CartPaymethodsState["selectedCode"]>("");

const containerClass = computed(() => {
  return props.paymentsContainerClass || "cart-paymethods";
});
const showOnAccountForGuests = computed(() => {
  return props.showOnAccountForGuests !== undefined
    ? props.showOnAccountForGuests
    : false;
});
const showLogo = computed(() => {
  return props.showPaymethodLogo !== undefined ? props.showPaymethodLogo : true;
});
const isGuest = computed(() => {
  return !infra.user;
});
const payMethods = computed(() => {
  const methods: CartPaymethod[] = props.cart?.payMethods || [];
  return methods.filter((m: CartPaymethod) => {
    if (!m?.code) return false;
    // `.value` matters: both are computed refs, and a ref object is always
    // truthy — without it "on account" was never hidden from guests, and it
    // could then win the preselection below.
    if (!showOnAccountForGuests.value && isGuest.value && isOnAccountMethod(m)) {
      return false;
    }
    return true;
  });
});

// Something is always selected — the cart's stored method, else the first one
// offered, so the user can hit Continue without a click. Computed
// rather than assigned state so it is right in the first render; the cart
// arrives after mount.
const preselected = computed(() =>
  pickPreselected(
    payMethods.value,
    props.cart?.paymentData?.method as string | undefined,
    (m: CartPaymethod) => m.code,
  ),
);
const activeCode = computed(() => selectedCode.value || preselected.value?.code || "");

// Report the preselection upwards so the host persists it and the order
// summary shows THIS method's transaction costs; the host skips the mutation
// when the cart already stores it. Deliberately NOT an `immediate` watch —
// that also fires during SSR, where the callback would mutate the cart while
// rendering. A user pick sets `selectedCode` and takes over from here.
function notifyPreselection() {
  if (selectedCode.value || !preselected.value) return;
  if (props.onPaymethodSelect) props.onPaymethodSelect(preselected.value);
}
watch(() => preselected.value?.code, notifyPreselection);
onMounted(notifyPreselection);
// Localized display name: host override by code → backend name → code.
function methodName(method: CartPaymethod): string {
  const code = (method.code || "").toLowerCase();
  return props.paymethodLabels?.[code] || method.name || method.code || "";
}
function isOnAccountMethod(
  method: CartPaymethod,
): ReturnType<CartPaymethodsState["isOnAccountMethod"]> {
  const code = (method.code || "").toLowerCase();
  return code === "on_account" || code === "onaccount" || code === "on-account";
}
function getLabel(
  key: string,
  fallback: string,
): ReturnType<CartPaymethodsState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
function formatMethodPrice(
  price: number,
): ReturnType<CartPaymethodsState["formatMethodPrice"]> {
  if (props.formatPrice) {
    return props.formatPrice(price);
  }
  return _formatPrice(price || 0, { symbol: infra.currency ?? "€", locale: localeForLanguage(infra.language) });
}
function getLogoUrl(
  method: CartPaymethod,
): ReturnType<CartPaymethodsState["getLogoUrl"]> {
  return method.logo || "";
}
function handleSelect(
  method: CartPaymethod,
): ReturnType<CartPaymethodsState["handleSelect"]> {
  selectedCode.value = method.code;
  if (props.onPaymethodSelect) {
    props.onPaymethodSelect(method);
  }
}
</script>
