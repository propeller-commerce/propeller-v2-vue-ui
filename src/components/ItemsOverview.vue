<template>
  <div :class="`propeller-items-overview ${containerClass}`">
    <template v-if="title">
      <h2 class="propeller-items-overview__title text-lg font-bold mb-4">
        {{ title }}
      </h2>
    </template>

    <div class="propeller-items-overview__list space-y-4">
      <template :key="item.itemId || index" v-for="(item, index) in items">
        <div
          class="propeller-items-overview__item flex gap-3 pb-3 border-b border-border last:border-b-0 last:pb-0"
          :data-bundle="isBundleItem(item) ? 'true' : 'false'"
        >
          <template v-if="showImage">
            <div
              class="propeller-items-overview__item-media w-16 h-16 flex-shrink-0 bg-surface-hover rounded-[var(--radius-control)] overflow-hidden border border-border-subtle flex items-center justify-center"
            >
              <template v-if="getItemImageUrl(item)">
                <img
                  class="propeller-items-overview__item-image w-full h-full object-contain p-1.5"
                  :src="getItemImageUrl(item)"
                  :alt="getItemName(item)"
                />
              </template>

              <template v-if="!getItemImageUrl(item)">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  class="propeller-items-overview__item-image-placeholder w-6 h-6 text-foreground-subtle"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  ></path>
                </svg>
              </template>
            </div>
          </template>

          <div class="propeller-items-overview__item-body flex-1 min-w-0">
            <template v-if="isBundleItem(item)">
              <div>
                <div class="flex justify-between items-start gap-2">
                  <span
                    class="propeller-items-overview__item-title text-sm font-medium leading-tight text-foreground line-clamp-2"
                    >{{ getBundleName(item) }}</span
                  >
                  <template v-if="showPrice && !!getBundlePrice(item)">
                    <span
                      class="propeller-items-overview__item-price font-semibold text-sm text-foreground whitespace-nowrap"
                      >{{ getBundlePrice(item) }}</span
                    >
                  </template>
                </div>
                <div
                  class="propeller-items-overview__item-bundle mt-1.5 space-y-1 border-l-2 border-secondary/10 pl-2"
                >
                  <template v-if="!!getBundleLeaderName(item)">
                    <div
                      class="propeller-items-overview__item-bundle-leader flex justify-between items-center text-xs"
                    >
                      <span class="font-medium text-muted-foreground">{{
                        getBundleLeaderName(item)
                      }}</span>
                      <template v-if="!!getBundleLeaderPrice(item)">
                        <span
                          class="text-muted-foreground whitespace-nowrap ml-2"
                          >{{ getBundleLeaderPrice(item) }}</span
                        >
                      </template>
                    </div>
                  </template>

                  <template
                    :key="idx"
                    v-for="(bundleItem, idx) in getBundleNonLeaders(item)"
                  >
                    <div
                      class="propeller-items-overview__item-bundle-item flex justify-between items-center text-xs text-muted-foreground"
                    >
                      <span class="line-clamp-1">{{
                        getBundleItemName(bundleItem)
                      }}</span>
                      <template v-if="!!getBundleItemPrice(bundleItem)">
                        <span
                          class="text-foreground-subtle whitespace-nowrap ml-2"
                          >{{ getBundleItemPrice(bundleItem) }}</span
                        >
                      </template>
                    </div>
                  </template>
                </div>
              </div>
              <div
                class="propeller-items-overview__item-qty flex items-center text-xs text-foreground-subtle mt-1"
              >
                <span
                  >{{ getLabel("quantity", "Qty:") }}{{ item.quantity }}</span
                >
              </div>
            </template>

            <template v-if="!isBundleItem(item)">
              <div>
                <div class="flex justify-between items-start gap-2">
                  <template v-if="itemNameClickable">
                    <p
                      class="propeller-items-overview__item-title font-medium text-sm leading-tight cursor-pointer hover:text-secondary transition-colors line-clamp-2"
                      @click="async (event) => handleItemNameClick(item)"
                    >
                      {{ getItemName(item) }}
                    </p>
                  </template>

                  <template v-if="!itemNameClickable">
                    <p
                      class="propeller-items-overview__item-title font-medium text-sm leading-tight line-clamp-2"
                    >
                      {{ getItemName(item) }}
                    </p>
                  </template>

                  <template v-if="showPrice">
                    <span
                      class="propeller-items-overview__item-price font-semibold text-sm text-foreground whitespace-nowrap"
                      >{{ formatItemPrice(getItemTotalPrice(item)) }}</span
                    >
                  </template>
                </div>
                <template v-if="showSku && getItemSku(item)">
                  <p
                    class="propeller-items-overview__item-sku text-xs text-muted-foreground mt-0.5"
                  >
                    SKU: {{ getItemSku(item) }}
                  </p>
                </template>

                <template v-if="getItemSurcharges(item).length > 0">
                  <div class="propeller-items-overview__item-surcharges mt-1 text-xs text-muted-foreground">
                    <span class="font-medium">{{ getLabel("surcharges", "Additional surcharges:") }}</span>
                    <ul class="propeller-items-overview__item-surcharges-list mt-0.5">
                      <li
                        v-for="(line, idx) in getItemSurcharges(item)"
                        :key="idx"
                        class="propeller-items-overview__item-surcharge"
                      >
                        {{ line }}
                      </li>
                    </ul>
                  </div>
                </template>

                <template v-if="getItemChildItems(item).length > 0">
                  <div
                    class="propeller-items-overview__item-options mt-1.5 space-y-1 border-l-2 border-border-subtle pl-2"
                  >
                    <template
                      :key="idx"
                      v-for="(child, idx) in getItemChildItems(item)"
                    >
                      <div
                        class="propeller-items-overview__item-option flex justify-between items-center text-xs text-muted-foreground"
                      >
                        <span class="line-clamp-1">{{
                          getLanguageString(child.product?.names, infra.language || "NL", "Option")
                        }}</span
                        ><span
                          class="text-foreground-subtle whitespace-nowrap ml-2"
                          >{{ formatItemPrice(getItemTotalPrice(child)) }}</span
                        >
                      </div>
                    </template>
                  </div>
                </template>
              </div>
              <div
                class="propeller-items-overview__item-qty flex items-center text-xs text-foreground-subtle mt-1"
              >
                <span
                  >{{ getLabel("quantity", "Qty:") }}{{ item.quantity }}</span
                >
                <template v-if="showAvailability && getItemAvailability(item)">
                  <span
                    :class="`propeller-items-overview__item-availability ml-2 ${isInStock(item) ? 'text-success' : 'text-destructive'}`"
                    :data-in-stock="isInStock(item) ? 'true' : 'false'"
                    >{{ getItemAvailability(item) }}</span
                  >
                </template>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
    <template v-if="items.length === 0">
      <p
        class="propeller-items-overview__empty text-muted-foreground italic text-sm"
      >
        {{ getLabel("noItems", "No items in cart.") }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { BundleItem, Cart, CartBaseItem, CartMainItem, YesNo } from "@propeller-commerce/propeller-sdk-v2";
import { getLabel as _getLabel, getLanguageString } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice, formatSurcharge as _formatSurcharge } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface ItemsOverviewProps {
  /** Shopping cart object from which the cart items overview will be displayed */
  cart: Cart;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /** Active language for localized surcharge names. */
  language?: string;

  /** The CSS class for the cart items overview container */
  itemsOverviewContainerClass?: string;

  /** Title of the cart items overview */
  title?: string;

  /** The cart items names are clickable links */
  itemNameClickable?: boolean;

  /** Action when a cart item's name is clicked */
  onCartItemNameClick?: (item: CartMainItem) => void;

  /** Show the quantity of the cart item */
  showQuantity?: boolean;

  /** Show the availability of the cart item */
  showAvailability?: boolean;

  /** Show the SKU of the cart item */
  showSku?: boolean;

  /** Show a small image of the cart item */
  showImage?: boolean;

  /** Show the price of the cart item */
  showPrice?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** Include tax in the line prices. Resolved from `PropellerProvider` when omitted; defaults to `false`. */
  includeTax?: boolean;
}
interface ItemsOverviewState {
  containerClass: string;
  itemNameClickable: boolean;
  showQuantity: boolean;
  showAvailability: boolean;
  showSku: boolean;
  showImage: boolean;
  showPrice: boolean;
  getLabel: (key: string, fallback: string) => string;
  formatItemPrice: (price: number) => string;
  items: any[];
  getItemName: (item: any) => string;
  getItemSku: (item: any) => string;
  getItemImageUrl: (item: any) => string;
  getItemTotalPrice: (item: any) => number;
  getItemAvailability: (item: any) => string;
  isInStock: (item: any) => boolean;
  handleItemNameClick: (item: any) => void;
  getItemChildItems: (item: any) => any[];
  isBundleItem: (item: any) => boolean;
  getBundleName: (item: any) => string;
  getBundlePrice: (item: any) => string;
  getBundleLeaderName: (item: any) => string;
  getBundleLeaderPrice: (item: any) => string;
  getBundleNonLeaders: (item: any) => any[];
  getBundleItemName: (bundleItem: any) => string;
  getBundleItemPrice: (bundleItem: any) => string;
}

const props = withDefaults(defineProps<ItemsOverviewProps>(), {
  itemNameClickable: true,
  showQuantity: true,
  showAvailability: true,
  showSku: true,
  showImage: true,
  showPrice: true,
});
const infra = useInfraProps(props);
// The component read neither `includeTax` nor the toggle, so it printed line
// prices always excl. VAT while `<CartItem>` on /cart followed the toggle —
// the same lines on two tax bases in consecutive steps.
// SDK mapping: net = incl. VAT, gross = excl. VAT.
const useTax = computed(() => !!infra.includeTax);
/** Bundle / bundle-item price on the active tax basis. */
function bundlePriceOf(price: any): number | null | undefined {
  if (!price) return undefined;
  return useTax.value ? price.net : price.gross;
}

const containerClass = computed(() => {
  return props.itemsOverviewContainerClass || "cart-items-overview";
});
const itemNameClickable = computed(() => {
  return props.itemNameClickable !== undefined ? props.itemNameClickable : true;
});
const showQuantity = computed(() => {
  return props.showQuantity !== undefined ? props.showQuantity : true;
});
const showAvailability = computed(() => {
  return props.showAvailability !== undefined ? props.showAvailability : true;
});
const showSku = computed(() => {
  return props.showSku !== undefined ? props.showSku : true;
});
const showImage = computed(() => {
  return props.showImage !== undefined ? props.showImage : true;
});
const showPrice = computed(() => {
  return props.showPrice !== undefined ? props.showPrice : true;
});
const items = computed(() => {
  return (props.cart as any)?.items || [];
});

function getLabel(
  key: string,
  fallback: string,
): ReturnType<ItemsOverviewState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
function formatItemPrice(
  price: number,
): ReturnType<ItemsOverviewState["formatItemPrice"]> {
  if (props.formatPrice) {
    return props.formatPrice(price);
  }
  return _formatPrice(price || 0, { symbol: infra.currency ?? "€", locale: localeForLanguage(props.language) });
}
function getItemName(item: any): ReturnType<ItemsOverviewState["getItemName"]> {
  return getLanguageString(item.product?.names, infra.language || "NL", "Product");
}
function getItemSku(item: any): ReturnType<ItemsOverviewState["getItemSku"]> {
  return item.product?.sku || "";
}
function getItemImageUrl(
  item: any,
): ReturnType<ItemsOverviewState["getItemImageUrl"]> {
  const url = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
  if (url && typeof url === "string" && url.startsWith("http")) {
    return url;
  }
  return "";
}
function getItemTotalPrice(
  item: any,
): ReturnType<ItemsOverviewState["getItemTotalPrice"]> {
  return (useTax.value ? item.totalSumNet : item.totalSum) || 0;
}
function getItemAvailability(
  item: any,
): ReturnType<ItemsOverviewState["getItemAvailability"]> {
  const stock = item.product?.inventory?.totalQuantity;
  if (stock === undefined || stock === null) return "";
  if (stock > 0) return props.labels?.["inStock"] || "In stock";
  return props.labels?.["outOfStock"] || "Out of stock";
}
function isInStock(item: any): ReturnType<ItemsOverviewState["isInStock"]> {
  const stock = item.product?.inventory?.totalQuantity;
  return stock !== undefined && stock !== null && stock > 0;
}
function handleItemNameClick(
  item: any,
): ReturnType<ItemsOverviewState["handleItemNameClick"]> {
  if (
    (props.itemNameClickable !== undefined ? props.itemNameClickable : true) &&
    props.onCartItemNameClick
  ) {
    props.onCartItemNameClick(item as CartMainItem);
  }
}
function getItemChildItems(
  item: any,
): ReturnType<ItemsOverviewState["getItemChildItems"]> {
  const children = item.childItems;
  if (!children || !Array.isArray(children)) return [];
  return children;
}
function getItemSurcharges(item: any): string[] {
  // Cart-line surcharges (CartItemSurcharge: localized `names`, own quantity).
  // Format: `{qty} x € {value} (name)` / `{qty} x {value}% (name)`.
  type SurchargeLike = {
    name?: { value?: string; language?: string }[];
    names?: { value?: string; language?: string }[];
    type?: string;
    value?: number;
    quantity?: number;
    enabled?: boolean;
  };
  const list = ((item.surcharges ?? []) as SurchargeLike[]).filter(
    (s: SurchargeLike) => s.enabled !== false,
  );
  return list
    .map((s: SurchargeLike) =>
      _formatSurcharge(s, {
        quantity: s.quantity ?? item.quantity ?? 1,
        language: infra.language,
        currency: infra.currency ?? "€",
      }),
    )
    .filter((line: string) => line.length > 0);
}
function isBundleItem(
  item: any,
): ReturnType<ItemsOverviewState["isBundleItem"]> {
  return !!item.bundle;
}
function getBundleName(
  item: any,
): ReturnType<ItemsOverviewState["getBundleName"]> {
  return item.bundle?.name || "Bundle";
}
function getBundlePrice(
  item: any,
): ReturnType<ItemsOverviewState["getBundlePrice"]> {
  const price = bundlePriceOf(item.bundle?.price);
  if (price === undefined || price === null) return "";
  return _formatPrice(Number(price), { symbol: infra.currency ?? "€", locale: localeForLanguage(props.language) });
}
function getBundleLeaderName(
  item: any,
): ReturnType<ItemsOverviewState["getBundleLeaderName"]> {
  const items = item.bundle?.items;
  if (!items) return "";
  const leader = items.find((bi: BundleItem) => bi.isLeader === YesNo.Y);
  if (!leader) return "";
  return getLanguageString(leader.product.names, infra.language || "NL", "Product");
}
function getBundleLeaderPrice(
  item: any,
): ReturnType<ItemsOverviewState["getBundleLeaderPrice"]> {
  const items = item.bundle?.items;
  if (!items) return "";
  const leader = items.find((bi: BundleItem) => bi.isLeader === YesNo.Y);
  if (!leader) return "";
  const price = bundlePriceOf(leader.price);
  if (price === undefined || price === null) return "";
  return _formatPrice(Number(price), { symbol: infra.currency ?? "€", locale: localeForLanguage(props.language) });
}
function getBundleNonLeaders(
  item: any,
): ReturnType<ItemsOverviewState["getBundleNonLeaders"]> {
  const items = item.bundle?.items;
  if (!items) return [];
  return items.filter((bi: BundleItem) => bi.isLeader !== YesNo.Y);
}
function getBundleItemName(
  bundleItem: any,
): ReturnType<ItemsOverviewState["getBundleItemName"]> {
  return getLanguageString(bundleItem.product?.names, infra.language || "NL", "Product");
}
function getBundleItemPrice(
  bundleItem: any,
): ReturnType<ItemsOverviewState["getBundleItemPrice"]> {
  const price = bundlePriceOf(bundleItem.price);
  if (price === undefined || price === null) return "";
  return _formatPrice(Number(price), { symbol: infra.currency ?? "€", locale: localeForLanguage(props.language) });
}
</script>
