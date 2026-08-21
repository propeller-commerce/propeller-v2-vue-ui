<template>
  <template v-if="!(isCrossUpsellMode() && !isLoading && items().length === 0)">
    <div
      :class="`propeller-product-slider ${containerClassName || 'mb-12'}`"
      :data-loading="isLoading ? 'true' : 'false'"
    >
      <template v-if="sliderTitle() || items().length > 0">
        <div
          class="propeller-product-slider__header flex items-center justify-between mb-6"
        >
          <template v-if="sliderTitle()">
            <h2 class="propeller-product-slider__title text-2xl font-bold">
              {{ sliderTitle() }}
            </h2>
          </template>

          <template v-if="items().length > desktopCount()">
            <div class="propeller-product-slider__nav flex gap-2">
              <button
                class="propeller-product-slider__nav-btn propeller-product-slider__nav-btn--prev p-2 rounded-full bg-card shadow hover:bg-surface-hover transition disabled:opacity-30 disabled:cursor-not-allowed"
                @click="
                  () => {
                    if (sliderRef) sliderScrollLeft(sliderRef as HTMLElement);
                  }
                "
                :disabled="!canScrollLeft"
                :aria-label="getLabel('scrollLeft', 'Scroll left')"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  class="w-5 h-5"
                >
                  <path d="M15 19l-7-7 7-7"></path>
                </svg></button
              ><button
                class="propeller-product-slider__nav-btn propeller-product-slider__nav-btn--next p-2 rounded-full bg-card shadow hover:bg-surface-hover transition disabled:opacity-30 disabled:cursor-not-allowed"
                @click="
                  () => {
                    if (sliderRef) sliderScrollRight(sliderRef as HTMLElement);
                  }
                "
                :disabled="!canScrollRight"
                :aria-label="getLabel('scrollRight', 'Scroll right')"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  class="w-5 h-5"
                >
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </template>
        </div>
      </template>

      <template v-if="isLoading">
        <div
          class="propeller-product-slider__skeleton flex gap-6 overflow-hidden"
        >
          <div
            class="propeller-product-slider__skeleton-card flex-shrink-0 w-72 h-80 bg-surface-hover rounded-[var(--radius-container)] animate-pulse"
          ></div>
          <div
            class="propeller-product-slider__skeleton-card flex-shrink-0 w-72 h-80 bg-surface-hover rounded-[var(--radius-container)] animate-pulse"
          ></div>
          <div
            class="propeller-product-slider__skeleton-card flex-shrink-0 w-72 h-80 bg-surface-hover rounded-[var(--radius-container)] animate-pulse"
          ></div>
          <div
            class="propeller-product-slider__skeleton-card flex-shrink-0 w-72 h-80 bg-surface-hover rounded-[var(--radius-container)] animate-pulse"
          ></div>
        </div>
      </template>

      <template v-if="!isLoading && items().length > 0">
        <div
          ref="sliderRef"
          class="propeller-product-slider__track flex gap-6 overflow-x-auto scroll-smooth pb-4"
          @scroll="(e) => sliderOnScroll(e.target as HTMLElement)"
          :style="{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }"
        >
          <template
            :key="getItemId(item) + '-' + index"
            v-for="(item, index) in items()"
          >
            <div
              class="propeller-product-slider__slide flex-shrink-0 w-[calc((100%_-_1.5rem)_/_1.5)] md:w-[calc((100%_-_3rem)_/_2.5)] lg:w-[calc((100%_-_4.5rem)_/_4)]"
            >
              <slot name="beforeItem" :item="item" :index="index" />
              <template v-if="isCluster(item)">
                <component
                  :is="ClusterCardImpl"
                  :cluster="item as Cluster"
                  :configuration="configuration"
                  :includeTax="includeTax"
                  :language="language"
                  :columns="3"
                  :enableAddFavorite="enableAddFavorite"
                  :showStock="showStock"
                  :showAvailability="showAvailability"
                  :labels="props.clusterCardLabels"
                  :stockLabels="stockLabels"
                  :onToggleFavorite="
                    (cluster: Cluster, isFav: boolean) => {
                      if (onToggleFavorite) {
                        onToggleFavorite(cluster, isFav);
                      }
                    }
                  "
                  :onClusterClick="(cluster: Cluster) => handleClusterClick(cluster)"
                />
              </template>

              <template v-if="!isCluster(item)">
                <component
                  :is="ProductCardImpl"
                  :product="item as Product"
                  :graphqlClient="graphqlClient"
                  :user="user || null"
                  :companyId="companyId"
                  :cartId="cartId"
                  :configuration="configuration"
                  :includeTax="includeTax"
                  :columns="3"
                  :allowAddToCart="showAddToCart()"
                  :createCart="createCart"
                  :onCartCreated="onCartCreated"
                  :afterAddToCart="afterAddToCart"
                  :showModal="showModal"
                  :allowIncrDecr="showIncrDecr !== false"
                  :enableStockValidation="stockValidation"
                  :language="language"
                  :onProceedToCheckout="onProceedToCheckout"
                  :onRequestQuoteClick="onRequestQuoteClick"
                  :onLoginClick="onLoginClick"
                  :labels="props.productCardLabels"
                  :addToCartLabels="addToCartLabels"
                  :enableAddFavorite="enableAddFavorite"
                  :showStock="showStock"
                  :showAvailability="showAvailability"
                  :stockLabels="stockLabels"
                  :priceLabels="props.priceLabels"
                  :onToggleFavorite="
                    (product: Product, isFav: boolean) => {
                      if (onToggleFavorite) onToggleFavorite(product, isFav);
                    }
                  "
                  :onProductClick="(product: Product) => handleProductClick(product)"
                />
              </template>
              <slot name="afterItem" :item="item" :index="index" />
            </div>
          </template>
        </div>
      </template>

      <template
        v-if="
          !isLoading &&
          items().length === 0 &&
          !products &&
          !isCrossUpsellMode()
        "
      >
        <div
          class="propeller-product-slider__empty text-center text-muted-foreground py-8"
        >
          {{ getLabel("noProducts", "No products found") }}
        </div>
      </template>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type Component } from "vue";

import { Cart, CartMainItem, Cluster, Contact, CrossupsellType, Customer, GraphQLClient, Product } from "@propeller-commerce/propeller-sdk-v2";
import DefaultProductCard from "./ProductCard.vue";
import DefaultClusterCard from "./ClusterCard.vue";
import { useProductSlider } from "../composables/vue/useProductSlider";
import { getLabel as _getLabel, isContentHidden } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from "../composables/vue/useInfraProps";
import {
  provideProductGridConfig,
  type ProductGridConfig,
} from "../context/ProductGridContext";

export interface ProductSliderProps {
  // === Data source ===

  /**
   * Propeller SDK GraphQL client.
   * Optional — resolved from the `propellerVue` plugin scope via `useInfraProps`
   * when omitted. An explicit prop still wins.
   */
  graphqlClient?: GraphQLClient;

  /** Pre-loaded products or clusters to display. When provided, skips internal fetching. */
  products?: (Product | Cluster)[];

  /** Product IDs to fetch internally when `products` is not provided */
  productIds?: number[];

  /** Cluster IDs to fetch internally when `products` is not provided */
  clusterIds?: number[];

  /**
   * Cross-upsell types to fetch. When provided, fetches cross-upsells for the given
   * productId/clusterId instead of fetching products by IDs.
   * Values: 'ACCESSORIES' | 'ALTERNATIVES' | 'RELATED' | 'OPTIONS' | 'PARTS'
   */
  crossUpsellTypes?: CrossupsellType[];

  /** Source product ID for cross-upsell lookup. Required when crossUpsellTypes is set. */
  productId?: number;

  /** Source cluster ID for cross-upsell lookup. Required when crossUpsellTypes is set. */
  clusterId?: number;

  // === Locale / pricing ===

  /**
   * Language code for API requests and localized content.
   * Optional — resolved from `<PropellerProvider>` scope via `useInfraProps`
   * when omitted. An explicit prop still wins.
   */
  language?: string;

  /** Tax zone for price calculations */
  taxZone?: string;

  /**
   * When true, net price (incl. tax) is the leading price.
   * Forwarded to each ProductCard / ClusterCard.
   */
  includeTax?: boolean;

  // === Portal / visibility ===

  /**
   * Controls portal visibility mode.
   * 'open' — AddToCart is shown on product cards.
   * 'semi-closed' — AddToCart is hidden (catalog-only view).
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user for cart operations */
  user?: Contact | Customer | null;

  /**
   * Show the add-to-cart control on each card. Defaults to true; a semi-closed
   * portal still withholds it from anonymous visitors regardless.
   */
  allowAddToCart?: boolean;

  /**
   * Active company ID from the company switcher.
   * Overrides the user's default company for price calculation in cross-upsell fetches
   * and is forwarded to each embedded ProductCard / AddToCart.
   * Triggers a re-fetch when changed.
   */
  companyId?: number;

  /* === Layout === */

  /** Items visible per breakpoint */
  itemsPerView?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /** Slider title displayed above the track */
  title?: string;

  /** Additional CSS class for the outer container */
  containerClassName?: string;

  /* === Card stock display === */

  /**
   * Show the stock / availability widget on each product card.
   * Forwarded to `ProductCard.showStock`.
   * Defaults to false.
   */
  showStock?: boolean;

  /**
   * Show only the availability indicator (Available / Not available) inside the stock widget.
   * Forwarded to `ProductCard.showAvailability`.
   * Defaults to true.
   */
  showAvailability?: boolean;

  /**
   * Label overrides forwarded to the embedded ItemStock component inside each card.
   * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
   */
  stockLabels?: Record<string, string>;

  /** Translated labels forwarded to the embedded `<ProductPrice>` display
   * inside each `<ProductCard>`. See `ProductPriceProps.labels` for slugs. */
  priceLabels?: Record<string, string>;

  /* === Card favourites === */

  /** Show a heart-icon favourite toggle on each card. Defaults to false. */
  enableAddFavorite?: boolean;

  /**
   * Called when a favourite is toggled on any card.
   * Receives the full Product or Cluster object and the new favourite state.
   */
  onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;

  /* === Card navigation === */

  /** Called when a product card is clicked — use for SPA-style routing. */
  onProductClick?: (product: Product) => void;

  /** Called when a cluster card is clicked — use for SPA-style routing. */
  onClusterClick?: (cluster: Cluster) => void;

  /* === AddToCart pass-through === */

  /** Validate stock before adding to cart. Defaults to false. */
  stockValidation?: boolean;

  /** Show increment/decrement stepper buttons in AddToCart. Defaults to true. */
  showIncrDecr?: boolean;

  /** ID of an existing cart to add items to. */
  cartId?: string;

  /** Auto-create a cart when none is available. Pair with onCartCreated. */
  createCart?: boolean;

  /** Called after AddToCart creates a new cart internally. */
  onCartCreated?: (cart: Cart) => void;

  /** Called after every successful add-to-cart. Receives the updated cart and the added item. */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true, AddToCart shows a success modal instead of a toast.
   * Defaults to false.
   */
  showModal?: boolean;

  /** Called when "Proceed to checkout" is clicked in the AddToCart modal. */
  onProceedToCheckout?: () => void;

  /** Called when "Request a Quote" is clicked in the AddToCart modal. */
  onRequestQuoteClick?: (cart: Cart) => void;

  /**
   * Called when an anonymous visitor clicks the log-in action that replaces
   * add-to-cart in a semi-closed portal. The host owns navigation.
   */
  onLoginClick?: () => void;

  /**
   * Label overrides forwarded to the embedded AddToCart component.
   * Keys: add, adding, addedToCart, outOfStock, noCartId, errorAdding,
   *       modalTitle, quantity, continueShopping, proceedToCheckout
   */
  addToCartLabels?: Record<string, string>;

  /* === Misc === */

  /** Configuration object providing imageSearchFiltersGrid, imageVariantFiltersMedium, urls */
  configuration?: any;

  /**
   * Label overrides for the slider UI.
   * Available keys: scrollLeft, scrollRight, noProducts, viewCluster,
   *                 ACCESSORIES, ALTERNATIVES, RELATED, OPTIONS, PARTS
   */
  labels?: Record<string, string>;

  /** Translated labels forwarded to embedded `<ProductCard>` instances. */
  productCardLabels?: Record<string, string>;

  /** Translated labels forwarded to embedded `<ClusterCard>` instances. */
  clusterCardLabels?: Record<string, string>;

  // ───── Extension API ─────
  // Sub-component injection — cascades through ProductGridConfig context.
  priceComponent?: Component;
  stockComponent?: Component;
  addToCartComponent?: Component;
  imageComponent?: Component;
  badgesComponent?: Component;
  favoriteComponent?: Component;

  // Iteration-level: replace the whole ProductCard / ClusterCard.
  productCardComponent?: Component;
  clusterCardComponent?: Component;
}

const props = withDefaults(defineProps<ProductSliderProps>(), {
  showAvailability: true,
  showIncrDecr: true,
  showStock: false,
  enableAddFavorite: false,
});

// Resolve infrastructure props (graphqlClient, configuration, user, companyId,
// language, includeTax, portalMode) from the propellerVue plugin scope +
// <PropellerProvider> when the host doesn't pass them explicitly. Without this
// a consumer relying on the provider (e.g. propeller-vue's PDP / cluster
// pages, which omit :graphqlClient) leaves useProductSlider with no client, so
// the crossupsell fetch throws, is swallowed, and the slider renders nothing —
// no cross/upsells appear. Explicit props still win via useInfraProps
// precedence. Mirrors the pattern already used by Menu.vue / ProductGrid.vue.
const infra = useInfraProps(props);

// ───── Extension API ─────
// Iteration-level component override: swap the whole card or fall back to
// the built-in implementation.
const ProductCardImpl = computed(
  () => props.productCardComponent ?? DefaultProductCard,
);
const ClusterCardImpl = computed(
  () => props.clusterCardComponent ?? DefaultClusterCard,
);

// Build the ProductGridConfig that cascades to nested cards inside the slider.
// Mirrors ProductGrid.vue (Task 31). Slider doesn't have a real grid; use the
// existing default of 3 columns so cards size sensibly.
const gridConfig = computed<ProductGridConfig>(() => ({
  columns: 3,
  showStock: props.showStock,
  showAvailability: props.showAvailability,
  enableAddFavorite: props.enableAddFavorite,
  createCart: props.createCart,
  showModal: props.showModal,
  allowIncrDecr: props.showIncrDecr !== false,
  enableStockValidation: props.stockValidation,
  cartId: props.cartId,
  stockLabels: props.stockLabels,
  priceLabels: props.priceLabels,
  addToCartLabels: props.addToCartLabels,
  onCartCreated: props.onCartCreated,
  afterAddToCart: props.afterAddToCart,
  onProceedToCheckout: props.onProceedToCheckout,
  onRequestQuoteClick: props.onRequestQuoteClick,
  onToggleFavorite: props.onToggleFavorite,
  onProductClick: props.onProductClick,
  onClusterClick: props.onClusterClick,
  // Extension API slot cascade
  productCardComponent: props.productCardComponent,
  clusterCardComponent: props.clusterCardComponent,
  priceComponent: props.priceComponent,
  stockComponent: props.stockComponent,
  addToCartComponent: props.addToCartComponent,
  imageComponent: props.imageComponent,
  badgesComponent: props.badgesComponent,
  favoriteComponent: props.favoriteComponent,
}));

// Snapshot pattern (same as ProductGrid.vue Task 31): cascade is push-based.
// Documented caveat: nested cards see the config at mount time; future
// reactivity needs would require provideProductGridConfig to accept MaybeRef.
provideProductGridConfig(gridConfig.value);

// Template-facing resolved bindings. The template reads bare identifiers
// (graphqlClient, user, companyId, configuration, includeTax, language) which
// in <script setup> bind to these — so nested cards and the fetch composable
// all see the context-resolved values, not raw (possibly undefined) props.
const graphqlClient = computed(() => infra.graphqlClient);
const user = computed(() => infra.user ?? null);
const companyId = computed(() => infra.companyId);
const configuration = computed(() => infra.configuration);
const includeTax = computed(() => infra.includeTax);
const language = computed(() => infra.language || "NL");

const langRef = language;
const userRef = user;
const companyRef = companyId;
const sliderRef = ref<HTMLElement | null>(null);

const {
  products: fetchedItems,
  loading: isLoading,
  canScrollLeft,
  canScrollRight,
  fetchCrossupsells,
  fetchProducts,
  scrollLeft: sliderScrollLeft,
  scrollRight: sliderScrollRight,
  onScroll: sliderOnScroll,
} = useProductSlider({
  graphqlClient: infra.graphqlClient as GraphQLClient,
  language: langRef,
  user: userRef,
  companyId: companyRef,
  configuration: infra.configuration as any,
});

onMounted(() => {
  if (props.products && props.products.length > 0) return;
  if (isCrossUpsellMode()) {
    fetchCrossupsells({
      productId: props.productId,
      clusterId: props.clusterId,
      types: props.crossUpsellTypes,
    });
  } else {
    fetchProducts(props.productIds || [], props.clusterIds || []);
  }
});

watch(
  () =>
    JSON.stringify([
      props.productIds,
      props.clusterIds,
      props.crossUpsellTypes,
      props.productId,
      props.clusterId,
      language.value,
      companyId.value,
    ]),
  () => {
    if (props.products && props.products.length > 0) return;
    if (isCrossUpsellMode()) {
      fetchCrossupsells({
        productId: props.productId,
        clusterId: props.clusterId,
        types: props.crossUpsellTypes,
      });
    } else {
      fetchProducts(props.productIds || [], props.clusterIds || []);
    }
  },
);

watch(isLoading, async (loading) => {
  if (!loading) {
    await nextTick();
    if (sliderRef.value) sliderOnScroll(sliderRef.value);
  }
});

function items(): (Product | Cluster)[] {
  if (props.products && props.products.length > 0) {
    return props.products;
  }
  return fetchedItems.value;
}
function isCrossUpsellMode(): boolean {
  return !!(props.crossUpsellTypes && props.crossUpsellTypes.length > 0);
}
function crossUpsellTitle(): string {
  if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return "";
  const typeLabels: Record<string, string> = {
    ACCESSORIES: "Accessories",
    ALTERNATIVES: "Alternatives",
    RELATED: "Related products",
    OPTIONS: "Options",
    PARTS: "Parts",
  };
  return props.crossUpsellTypes
    .map((t: string) => props.labels?.[t.toLowerCase()] || typeLabels[t] || t)
    .join(" & ");
}
function sliderTitle(): string | undefined {
  if (props.title !== undefined) return props.title;
  if (isCrossUpsellMode()) return crossUpsellTitle();
  return undefined;
}
function desktopCount(): number {
  return props.itemsPerView?.desktop || 4;
}
function showAddToCart(): boolean {
  const allow = (props.allowAddToCart as boolean) !== false;
  // Anonymous visitors only — a signed-in user keeps add-to-cart.
  return (
    !isContentHidden(
      infra.portalMode as string | undefined,
      (props.user ?? infra.user) as Contact | Customer | null | undefined
    ) && allow
  );
}
function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
function isCluster(item: any): boolean {
  return "clusterId" in item && !("productId" in item);
}
function getItemId(item: any): number {
  return isCluster(item) ? item.clusterId : item.productId;
}
function handleProductClick(product: Product): void {
  if (props.onProductClick) {
    props.onProductClick(product);
  }
}
function handleClusterClick(cluster: Cluster): void {
  if (props.onClusterClick) {
    props.onClusterClick(cluster);
  }
}
</script>
