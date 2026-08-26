<template>
  <tbody class="propeller-order-item-card">
    <tr
      :class="`propeller-order-item-card__row ${isChildItem ? 'border-0' : 'hover:bg-surface-hover transition'}`"
      :data-child="isChildItem ? 'true' : 'false'"
    >
      <td
        :class="`propeller-order-item-card__cell propeller-order-item-card__cell--product ${isChildItem ? 'px-6 py-2 pl-28' : 'px-6 py-4'}`"
      >
        <div class="flex items-center gap-4">
          <template v-if="showImage">
            <template v-if="productImage">
              <div
                class="propeller-order-item-card__media relative w-16 h-16 flex-shrink-0 rounded overflow-hidden"
              >
                <img
                  class="propeller-order-item-card__image object-cover w-full h-full"
                  :src="productImage"
                  :alt="productName"
                />
              </div>
            </template>

            <template v-if="!productImage">
              <div
                class="propeller-order-item-card__image-placeholder w-16 h-16 bg-surface-hover rounded flex items-center justify-center text-foreground-subtle text-xs"
              >
                {{ getLabel('noImage', 'No Img') }}
              </div>
            </template>
          </template>

          <div>
            <template v-if="titleLinkable && productUrl && !isChildItem">
              <a
                class="propeller-order-item-card__title font-medium text-foreground hover:text-primary hover:underline"
                :href="productUrl"
                >{{ productName }}</a
              >
            </template>

            <template v-if="!titleLinkable || !productUrl || isChildItem">
              <span
                :class="`propeller-order-item-card__title ${isChildItem ? 'text-sm text-muted-foreground' : 'font-medium'}`"
                >{{ productName }}</span
              >
            </template>

            <template v-if="showSku && productSku">
              <p
                class="propeller-order-item-card__sku text-sm text-muted-foreground mt-1"
              >
                SKU: {{ productSku }}
              </p>
            </template>

            <template v-if="showItemNotes && notes">
              <p
                class="propeller-order-item-card__notes text-sm text-foreground-subtle mt-1 italic"
              >
                {{ notes }}
              </p>
            </template>

            <!-- Delegate to the injected stock slot, or fall back to the
                 default stock display. Replaces the prior literal "Stock info"
                 placeholder text. The `inventory` guard bridges the
                 contract-vs-default mismatch: shared StockComponentProps.inventory
                 is optional while DefaultItemStock requires it, so we only
                 render when the SDK actually returned inventory data. -->
            <component
              v-if="showStockComponent !== false && orderItem?.product?.inventory"
              :is="StockImpl"
              :inventory="orderItem.product.inventory"
              :show-stock="true"
              :show-availability="true"
              :labels="labels"
            />
          </div>
        </div>
      </td>
      <template v-if="showQuantity">
        <td
          :class="
            isChildItem
              ? 'propeller-order-item-card__cell propeller-order-item-card__cell--quantity px-6 py-2 text-center text-sm text-muted-foreground'
              : 'propeller-order-item-card__cell propeller-order-item-card__cell--quantity px-6 py-4 text-center'
          "
        >
          {{ quantity }}
        </td>
      </template>

      <template v-if="showDiscount">
        <td
          :class="
            isChildItem
              ? 'propeller-order-item-card__cell propeller-order-item-card__cell--discount px-6 py-2 text-right text-sm text-muted-foreground'
              : 'propeller-order-item-card__cell propeller-order-item-card__cell--discount px-6 py-4 text-right whitespace-nowrap text-orange-600'
          "
        >
          <template v-if="discount > 0">
            {{ formatDiscountDisplay() }}
          </template>
        </td>
      </template>

      <template v-if="showPrice">
        <td
          :class="
            isChildItem
              ? 'propeller-order-item-card__cell propeller-order-item-card__cell--price px-6 py-2 text-right whitespace-nowrap text-sm text-muted-foreground'
              : 'propeller-order-item-card__cell propeller-order-item-card__cell--price px-6 py-4 text-right whitespace-nowrap'
          "
        >
          <!-- When the consumer injects a priceComponent, delegate to it;
               otherwise keep the existing inline line-total rendering.
               Contract-vs-data note (same as CartItem): the
               PriceComponentProps.price contract expects an SDK ProductPrice
               (catalog/unit price), while this cell historically renders the
               line total `orderItem.priceTotal`. We pass `orderItem.product.price`
               (catalog price) to the injected component to honour the contract;
               consumers who need the line total can compute their own. The
               default (uninjected) path is unchanged. -->
          <component
            v-if="props.priceComponent"
            :is="PriceImpl"
            :price="orderItem?.product?.price"
            :currency="currency"
            :labels="labels"
          />
          <span v-else>{{ formatItemPrice(priceTotal) }}</span>
        </td>
      </template>
    </tr>
    <template v-if="hasChildren">
      <template
        :key="child.id || child.uuid"
        v-for="(child, index) in childItems || []"
      >
        <tr
          class="propeller-order-item-card__child-row border-0"
          data-child="true"
        >
          <td
            class="propeller-order-item-card__cell propeller-order-item-card__cell--product px-6 py-2 pl-28"
          >
            <span
              class="propeller-order-item-card__child-title text-sm text-muted-foreground"
              >{{
                getLanguageString(child.product?.names, infra.language || "NL") || child.name || "Unknown"
              }}</span
            >
          </td>
          <template v-if="showQuantity">
            <td
              class="propeller-order-item-card__cell propeller-order-item-card__cell--quantity px-6 py-2 text-center text-sm text-muted-foreground"
            >
              {{ child.quantity || 0 }}
            </td>
          </template>

          <template v-if="showDiscount">
            <td
              class="propeller-order-item-card__cell propeller-order-item-card__cell--discount px-6 py-2 text-right text-sm text-muted-foreground"
            ></td>
          </template>

          <template v-if="showPrice">
            <td
              class="propeller-order-item-card__cell propeller-order-item-card__cell--price px-6 py-2 text-right whitespace-nowrap text-sm text-muted-foreground"
            >
              {{ formatItemPrice(child.priceTotal || 0) }}
            </td>
          </template>
        </tr>
      </template>
    </template>
  </tbody>
</template>

<script setup lang="ts">
import type { OrderItem } from "@propeller-commerce/propeller-sdk-v2";
import { computed, type Component } from "vue";
import { formatPrice as _formatPrice, getLabel as _getLabel, getLanguageString } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';
import DefaultProductPrice from './ProductPrice.vue';
import DefaultItemStock from './ItemStock.vue';

export interface OrderItemCardProps {
  /** The order item to display */
  orderItem: OrderItem;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /**
   * Active language for the localized product name. Resolved from
   * `<PropellerProvider>` when omitted. Without it the card showed
   * `names[0]` — whichever language the backend happened to return first,
   * which is how a German product name reached a Dutch thank-you page.
   */
  language?: string;

  /** Child order items (rendered as indented sub-rows beneath the parent) */
  childItems?: OrderItem[];

  /** Should the item title be a link to the PDP */
  titleLinkable?: boolean;

  /** Display a small thumbnail of the order item */
  showImage?: boolean;

  /** Should stock info be displayed */
  showStockComponent?: boolean;

  /** Display the SKU of the order item beneath the item name */
  showSku?: boolean;

  /** Display the quantity of the order item */
  showQuantity?: boolean;

  /** Display the price of the order item */
  showPrice?: boolean;

  /** Display the discount column */
  showDiscount?: boolean;

  /** Should the order item notes field be displayed */
  showItemNotes?: boolean;

  /** Render as a child/sub-item (indented, no image) */
  isChildItem?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Translated labels keyed by the slugs used inside the component (see
   * `getLabel` calls). Missing keys fall back to the English defaults. */
  labels?: Record<string, string>;

  // ───── Extension API (no resolver — direct prop fallback) ─────
  priceComponent?: Component;
  stockComponent?: Component;
}
interface OrderItemCardState {
  titleLinkable: boolean;
  showImage: boolean;
  showSku: boolean;
  showQuantity: boolean;
  showPrice: boolean;
  showDiscount: boolean;
  showStockComponent: boolean;
  showItemNotes: boolean;
  isChildItem: boolean;
  productName: string;
  productSku: string;
  productImage: string;
  productId: number | undefined;
  productSlug: string;
  productUrl: string;
  quantity: number;
  price: number;
  priceTotal: number;
  discount: number;
  originalPrice: number;
  discountPercentage: number;
  notes: string;
  hasChildren: boolean;
  formatItemPrice: (price: number) => string;
  formatDiscountDisplay: () => string;
}

const props = withDefaults(defineProps<OrderItemCardProps>(), {
  titleLinkable: true,
  showImage: true,
  showSku: true,
  showQuantity: true,
  showPrice: true,
  showDiscount: false,
  showStockComponent: false,
  showItemNotes: false,
  isChildItem: false,
});
const infra = useInfraProps(props);

// Direct prop > default. No `useResolvedProps` here — mirrors React's
// RSC-safe design where OrderItemCard skips the resolver to stay safe to
// render in server contexts.
const PriceImpl = computed(() => props.priceComponent ?? DefaultProductPrice);
const StockImpl = computed(() => props.stockComponent ?? DefaultItemStock);

const titleLinkable = computed(() => {
  return props.titleLinkable !== undefined ? props.titleLinkable : true;
});
const showImage = computed(() => {
  if (props.isChildItem) return false;
  return props.showImage !== undefined ? props.showImage : true;
});
const showSku = computed(() => {
  if (props.isChildItem) return false;
  return props.showSku !== undefined ? props.showSku : true;
});
const showQuantity = computed(() => {
  return props.showQuantity !== undefined ? props.showQuantity : true;
});
const showPrice = computed(() => {
  return props.showPrice !== undefined ? props.showPrice : true;
});
const showDiscount = computed(() => {
  return props.showDiscount !== undefined ? props.showDiscount : false;
});
const showStockComponent = computed(() => {
  return props.showStockComponent !== undefined
    ? props.showStockComponent
    : false;
});
const showItemNotes = computed(() => {
  return props.showItemNotes !== undefined ? props.showItemNotes : false;
});
const isChildItem = computed(() => {
  return props.isChildItem || false;
});
const productName = computed(() => {
  const item = props.orderItem;
  return getLanguageString(item?.product?.names, infra.language || "NL") || item?.name || "Unknown Product";
});
const productSku = computed(() => {
  return props.orderItem?.product?.sku || props.orderItem?.sku || "";
});
const productImage = computed(() => {
  return (
    props.orderItem?.product?.media?.images?.items?.[0]?.imageVariants?.[0]
      ?.url || ""
  );
});
const productId = computed(() => {
  return props.orderItem?.product?.productId;
});
const productSlug = computed(() => {
  // `slugs[0]` is the catalog default language, so a non-default storefront
  // emitted a wrong-language slug into the link. The names around
  // here already resolved by language.
  return getLanguageString(props.orderItem?.product?.slugs, infra.language || "NL", "");
});
// Build the href with the host's own URL builders when the configuration
// supplies them — they are what applies the storefront's locale prefix (and its
// configured URL pattern). The literals are only a fallback for a bare mount;
// on a prefixed storefront they emit links into the default language.
const hostUrls = computed(
  () => (infra.configuration as { urls?: Record<string, any> } | undefined)?.urls,
);
const clusterUrl = computed(() => {
  const cluster = (props.orderItem?.product as any)?.cluster;
  if (!cluster) return "";
  const id = cluster.clusterId ?? cluster.urlId;
  const slug = getLanguageString(cluster.slugs, infra.language || "NL", "");
  if (!id || !slug) return "";
  return (
    hostUrls.value?.getClusterUrl?.(cluster, infra.language) ||
    "/cluster/" + id + "/" + slug
  );
});
const productUrl = computed(() => {
  if (clusterUrl.value) return clusterUrl.value;
  if (productId.value && productSlug.value) {
    return (
      hostUrls.value?.getProductUrl?.(props.orderItem?.product, infra.language) ||
      "/product/" + productId.value + "/" + productSlug.value
    );
  }
  return "";
});
const quantity = computed(() => {
  return props.orderItem?.quantity || 0;
});
const price = computed(() => {
  return props.orderItem?.price || 0;
});
const priceTotal = computed(() => {
  return props.orderItem?.priceTotal || 0;
});
const discount = computed(() => {
  return props.orderItem?.discount || 0;
});
const originalPrice = computed(() => {
  return props.orderItem?.originalPrice || 0;
});
const discountPercentage = computed(() => {
  if (originalPrice.value > 0 && discount.value > 0) {
    return (discount.value / originalPrice.value) * 100;
  }
  return 0;
});
const notes = computed(() => {
  return props.orderItem?.notes || "";
});
const hasChildren = computed(() => {
  return (props.childItems || []).length > 0;
});

function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
function formatItemPrice(
  price: number,
): ReturnType<OrderItemCardState["formatItemPrice"]> {
  if (props.formatPrice) {
    return props.formatPrice(price);
  }
  if (!price && price !== 0) return "-";
  return _formatPrice(price, { symbol: props.currency ?? "€", locale: localeForLanguage(props.language) });
}
function formatDiscountDisplay(): ReturnType<
  OrderItemCardState["formatDiscountDisplay"]
> {
  const discountStr = formatItemPrice(discount.value);
  if (discountPercentage.value > 0) {
    return (
      discountStr +
      " (" +
      discountPercentage.value.toFixed(2).replace(".", ",") +
      "%)"
    );
  }
  return discountStr;
}
</script>
