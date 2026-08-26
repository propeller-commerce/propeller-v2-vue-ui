<template>
  <div :class="`propeller-order-summary ${containerClass}`">
    <template v-if="title">
      <h2 class="propeller-order-summary__title text-xl font-bold mb-4">
        {{ title }}
      </h2>
    </template>

    <div
      class="propeller-order-summary__meta grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-border mb-5"
    >
      <template v-if="showOrderNumber && orderNumber">
        <div
          class="propeller-order-summary__meta-item"
          data-meta="order-number"
        >
          <p
            class="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1"
          >
            {{ getLabel("orderNumber", "Order Number") }}
          </p>
          <p class="propeller-order-summary__meta-value font-semibold">
            {{ orderNumber }}
          </p>
        </div>
      </template>

      <template v-if="showOrderDate && orderDate">
        <div class="propeller-order-summary__meta-item" data-meta="order-date">
          <p
            class="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1"
          >
            {{ getLabel("orderDate", "Order Date") }}
          </p>
          <p class="propeller-order-summary__meta-value font-semibold">
            {{ formatOrderDate(orderDate) }}
          </p>
        </div>
      </template>

      <template v-if="showOrderStatus && orderStatus">
        <div class="propeller-order-summary__meta-item" data-meta="status">
          <p
            class="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1"
          >
            {{ getLabel("status", "Status") }}
          </p>
          <span
            class="propeller-order-summary__status inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary"
            >{{ orderStatus }}</span
          >
        </div>
      </template>

      <template v-if="showOrderTotal">
        <div class="propeller-order-summary__meta-item" data-meta="total">
          <p
            class="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1"
          >
            {{ getLabel("total", "Total") }}
          </p>
          <p class="propeller-order-summary__total font-bold text-lg">
            {{ formatItemPrice(orderTotal) }}
          </p>
        </div>
      </template>
    </div>
    <div
      class="propeller-order-summary__addresses grid grid-cols-1 md:grid-cols-2 gap-6 pb-5"
    >
      <template v-if="showInvoiceAddress">
        <div
          class="propeller-order-summary__address space-y-2"
          data-address="invoice"
        >
          <h3
            class="propeller-order-summary__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {{ getLabel("invoiceAddress", "Invoice Address") }}
          </h3>
          <template v-if="invoiceAddress && invoiceAddress.street">
            <div class="text-sm space-y-1">
              <template v-if="invoiceAddress.company">
                <p class="font-medium">{{ invoiceAddress.company }}</p>
              </template>

              <p>
                {{
                  [
                    invoiceAddress.firstName,
                    invoiceAddress.middleName,
                    invoiceAddress.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ")
                }}
              </p>
              <p>
                {{
                  [
                    invoiceAddress.street,
                    invoiceAddress.number,
                    invoiceAddress.numberExtension,
                  ]
                    .filter(Boolean)
                    .join(" ")
                }}
              </p>
              <p>
                {{
                  [invoiceAddress.postalCode, invoiceAddress.city]
                    .filter(Boolean)
                    .join(" ")
                }}
              </p>
              <template v-if="invoiceAddress.country">
                <p>{{ getCountryName(invoiceAddress.country) }}</p>
              </template>

              <template v-if="invoiceAddress.email">
                <p
                  class="propeller-order-summary__address-email text-muted-foreground"
                >
                  {{ invoiceAddress.email }}
                </p>
              </template>
            </div>
          </template>
        </div>
      </template>

      <template v-if="showDeliveryAddress">
        <div
          class="propeller-order-summary__address space-y-2"
          data-address="delivery"
        >
          <h3
            class="propeller-order-summary__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {{ getLabel("deliveryAddress", "Delivery Address") }}
          </h3>
          <template v-if="deliveryAddress && deliveryAddress.street">
            <div class="text-sm space-y-1">
              <template v-if="deliveryAddress.company">
                <p class="font-medium">{{ deliveryAddress.company }}</p>
              </template>

              <p>
                {{
                  [
                    deliveryAddress.firstName,
                    deliveryAddress.middleName,
                    deliveryAddress.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ")
                }}
              </p>
              <p>
                {{
                  [
                    deliveryAddress.street,
                    deliveryAddress.number,
                    deliveryAddress.numberExtension,
                  ]
                    .filter(Boolean)
                    .join(" ")
                }}
              </p>
              <p>
                {{
                  [deliveryAddress.postalCode, deliveryAddress.city]
                    .filter(Boolean)
                    .join(" ")
                }}
              </p>
              <template v-if="deliveryAddress.country">
                <p>{{ getCountryName(deliveryAddress.country) }}</p>
              </template>

              <template v-if="deliveryAddress.email">
                <p
                  class="propeller-order-summary__address-email text-muted-foreground"
                >
                  {{ deliveryAddress.email }}
                </p>
              </template>
            </div>
          </template>
        </div>
      </template>
    </div>
    <template
      v-if="showDeliveryInfo && (paymentMethod || carrierName || requestDate)"
    >
      <div
        class="propeller-order-summary__info-panel bg-surface-hover p-4 rounded-[var(--radius-control)] border border-border space-y-2 text-sm"
      >
        <template v-if="paymentMethod">
          <div class="flex justify-between">
            <span class="font-medium">{{
              getLabel("payment", "Payment:")
            }}</span
            ><span>{{ paymentMethod }}</span>
          </div>
        </template>

        <template v-if="carrierName">
          <div class="flex justify-between">
            <span class="font-medium">{{
              getLabel("carrier", "Carrier:")
            }}</span
            ><span>{{ carrierName }}</span>
          </div>
        </template>

        <template v-if="requestDate">
          <div class="flex justify-between">
            <span class="font-medium">{{
              getLabel("deliveryDate", "Delivery Date:")
            }}</span
            ><span>{{ requestDate }}</span>
          </div>
        </template>
      </div>
    </template>

    <template v-if="showRemarks && (orderReference || orderRemarks)">
      <div
        class="propeller-order-summary__remarks-panel bg-surface-hover p-4 rounded-[var(--radius-control)] border border-border space-y-2 text-sm mt-4"
      >
        <template v-if="orderReference">
          <div class="flex justify-between">
            <span class="font-medium">{{
              getLabel("reference", "Reference:")
            }}</span
            ><span>{{ orderReference }}</span>
          </div>
        </template>

        <template v-if="orderRemarks">
          <div class="flex justify-between">
            <span class="font-medium">{{
              getLabel("remarks", "Remarks:")
            }}</span
            ><span>{{ orderRemarks }}</span>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Order } from "@propeller-commerce/propeller-sdk-v2";
import { computed } from "vue";
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { getCountryName as _getCountryName } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface OrderSummaryProps {
  /** The order object from propeller-sdk-v2 */
  order: Order;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /** The CSS class for the order summary container */
  orderSummaryContainerClass?: string;

  /** Title of the order summary */
  title?: string;

  /** Show the order number */
  showOrderNumber?: boolean;

  /** Show the order date */
  showOrderDate?: boolean;

  /** Show the order status */
  showOrderStatus?: boolean;

  /** Show the order total */
  showOrderTotal?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Show the invoice address */
  showInvoiceAddress?: boolean;

  /** Show the delivery address */
  showDeliveryAddress?: boolean;

  /** Show payment, carrier, and delivery date info */
  showDeliveryInfo?: boolean;

  /** Show order remarks and reference */
  showRemarks?: boolean;

  /** Custom date formatting function */
  formatDate?: (dateString: string) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /**
   * Localized order/quote status labels, keyed by the raw backend status
   * (e.g. `{ NEW: 'Nieuw', REQUEST: 'Aangevraagd' }`). Unknown → raw value.
   */
  statusLabels?: Record<string, string>;

  /**
   * Localized payment-method names, keyed by the raw method value LOWER-CASED
   * (e.g. `{ rekening: 'Op rekening', account: 'Op rekening' }`). The backend
   * sends different raw values on the order vs quote path (REKENING / ACCOUNT),
   * so mapping both here makes the same method render identically.
   */
  paymethodLabels?: Record<string, string>;

  /** List of countries for resolving codes to names [{code: 'NL', name: 'Netherlands'}, ...] */
  countries?: {
    code: string;
    name: string;
  }[];
}
interface OrderSummaryState {
  containerClass: string;
  showOrderNumber: boolean;
  showOrderDate: boolean;
  showOrderStatus: boolean;
  showInvoiceAddress: boolean;
  showDeliveryAddress: boolean;
  showOrderTotal: boolean;
  formatItemPrice: (price: number) => string;
  showDeliveryInfo: boolean;
  showRemarks: boolean;
  orderReference: string;
  orderRemarks: string;
  getLabel: (key: string, fallback: string) => string;
  getCountryName: (code: string) => string;
  formatOrderDate: (dateString: string) => string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  orderTotal: number;
  invoiceAddress: any;
  deliveryAddress: any;
  paymentMethod: string;
  carrierName: string;
  requestDate: string;
}

const props = withDefaults(defineProps<OrderSummaryProps>(), {
  showOrderNumber: true,
  showOrderDate: true,
  showOrderStatus: true,
  showOrderTotal: true,
  showInvoiceAddress: true,
  showDeliveryAddress: true,
  showDeliveryInfo: true,
  showRemarks: true,
});
const infra = useInfraProps(props);

const containerClass = computed(() => {
  return props.orderSummaryContainerClass || "order-summary";
});
const showOrderNumber = computed(() => {
  return props.showOrderNumber !== undefined ? props.showOrderNumber : true;
});
const showOrderDate = computed(() => {
  return props.showOrderDate !== undefined ? props.showOrderDate : true;
});
const showOrderStatus = computed(() => {
  return props.showOrderStatus !== undefined ? props.showOrderStatus : true;
});
const showInvoiceAddress = computed(() => {
  return props.showInvoiceAddress !== undefined
    ? props.showInvoiceAddress
    : true;
});
const showDeliveryAddress = computed(() => {
  return props.showDeliveryAddress !== undefined
    ? props.showDeliveryAddress
    : true;
});
const showOrderTotal = computed(() => {
  return props.showOrderTotal !== undefined ? props.showOrderTotal : true;
});
const showDeliveryInfo = computed(() => {
  return props.showDeliveryInfo !== undefined ? props.showDeliveryInfo : true;
});
const showRemarks = computed(() => {
  return props.showRemarks !== undefined ? props.showRemarks : true;
});
const orderReference = computed(() => {
  return props.order?.reference || "";
});
const orderRemarks = computed(() => {
  return props.order?.remarks || "";
});
const orderNumber = computed(() => {
  return props.order?.id || "";
});
const orderDate = computed(() => {
  return props.order?.createdAt || "";
});
const orderStatus = computed(() => {
  // Map raw backend enums to localized labels; unknown → raw value. Was printing
  // the raw enum (NEW / REQUEST) straight to the customer.
  const raw = props.order?.status || "";
  return raw ? props.statusLabels?.[raw] || raw : "";
});
const orderTotal = computed(() => {
  return Number(props.order?.total?.net || 0);
});
const invoiceAddress = computed(() => {
  const addresses = props.order?.addresses || [];
  return addresses.find((a: any) => a.type === "invoice") || null;
});
const deliveryAddress = computed(() => {
  const addresses = props.order?.addresses || [];
  return addresses.find((a: any) => a.type === "delivery") || null;
});
const paymentMethod = computed(() => {
  // Map the raw method (REKENING / ACCOUNT — differs order vs quote path) to a
  // localized name so the same method renders identically. Unknown → raw value.
  const raw = props.order?.paymentData?.method || "";
  return raw ? props.paymethodLabels?.[raw.toLowerCase()] || raw : "";
});
const carrierName = computed(() => {
  return props.order?.postageData?.carrier || "";
});
const requestDate = computed(() => {
  const date = props.order?.postageData?.requestDate;
  if (!date) return "";
  if (props.formatDate) {
    return props.formatDate(date);
  }
  return numericDate(date);
});

function formatItemPrice(
  price: number,
): ReturnType<OrderSummaryState["formatItemPrice"]> {
  if (props.formatPrice) {
    return props.formatPrice(price);
  }
  return _formatPrice(price || 0, { symbol: infra.currency ?? "€", locale: localeForLanguage(infra.language) });
}
function getLabel(
  key: string,
  fallback: string,
): ReturnType<OrderSummaryState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
function getCountryName(
  code: string,
): ReturnType<OrderSummaryState["getCountryName"]> {
  return _getCountryName(code, props.countries);
}
// Numeric day-first DD-MM-YYYY. Was hardcoded en-US (M/D/YYYY), which NL
// readers misparse by months. Locale-neutral order; override via `formatDate`.
function numericDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
}
function formatOrderDate(
  dateString: string,
): ReturnType<OrderSummaryState["formatOrderDate"]> {
  if (props.formatDate) {
    return props.formatDate(dateString);
  }
  return numericDate(dateString);
}
</script>
