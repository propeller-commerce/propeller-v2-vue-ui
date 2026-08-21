<template>
  <div
    :class="`propeller-product-grid w-full ${className || ''}`"
    :data-loading="getIsLoading() ? 'true' : 'false'"
  >
    <template v-if="getIsLoading()">
      <div
        :class="`propeller-product-grid__skeleton-grid ${getGridColsClass()}`"
      >
        <template :key="idx" v-for="(_, idx) in getSkeletonItems()">
          <div
            class="propeller-product-grid__skeleton-card flex flex-col overflow-hidden rounded-[var(--radius-container)] border border-border bg-card shadow-sm"
          >
            <div
              class="propeller-product-grid__skeleton-image aspect-square bg-surface-hover animate-pulse"
            ></div>
            <div class="p-4 flex flex-col gap-2 flex-1">
              <div
                class="propeller-product-grid__skeleton-line h-3 bg-surface-hover animate-pulse rounded w-1/4"
              ></div>
              <div
                class="propeller-product-grid__skeleton-line h-4 bg-surface-hover animate-pulse rounded w-3/4"
              ></div>
              <div
                class="propeller-product-grid__skeleton-line h-4 bg-surface-hover animate-pulse rounded w-1/2"
              ></div>
              <div class="mt-auto pt-2">
                <div
                  class="propeller-product-grid__skeleton-line h-5 bg-surface-hover animate-pulse rounded w-1/3"
                ></div>
              </div>
            </div>
            <template v-if="showAddToCart()">
              <div class="p-4 pt-0">
                <div class="flex items-center gap-2">
                  <div
                    class="propeller-product-grid__skeleton-line h-9 flex-1 bg-surface-hover animate-pulse rounded"
                  ></div>
                  <div
                    class="propeller-product-grid__skeleton-line h-9 flex-1 bg-surface-hover animate-pulse rounded"
                  ></div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>

    <template v-if="!getIsLoading()">
      <template v-if="getDisplayProducts().length === 0">
        <div
          class="propeller-product-grid__empty text-center py-24 bg-surface-hover rounded-xl border border-dashed border-border"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="propeller-product-grid__empty-icon mx-auto h-12 w-12 text-foreground-subtle"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              :strokeWidth="1"
            ></path>
          </svg>
          <h3
            class="propeller-product-grid__empty-title mt-4 text-lg font-semibold text-foreground"
          >
            {{ getLabel("noProductsFound", "No products found") }}
          </h3>
          <p
            class="propeller-product-grid__empty-message mt-1 text-sm text-muted-foreground"
          >
            {{ getLabel("noProductsHelp", "Try adjusting your filters or search term.") }}
          </p>
        </div>
      </template>

      <template v-if="getDisplayProducts().length > 0">
        <div :class="`propeller-product-grid__grid ${getGridColsClass()}`">
          <template
            :key="(item as Product).productId || (item as Cluster).clusterId || idx"
            v-for="(item, idx) in getDisplayProducts()"
          >
            <slot name="beforeItem" :item="item" :index="idx" />
            <div>
              <template v-if="isClusterItem(item)">
                <component
                  :is="ClusterCardImpl"
                  :columns="props.columns || 3"
                  :cluster="(item as Cluster)"
                  :configuration="infra.configuration"
                  :includeTax="resolvedIncludeTax"
                  :showPrice="props.showPrice"
                  :language="infra.language || 'NL'"
                  :showStock="props.showStock"
                  :showAvailability="props.showAvailability"
                  :labels="props.clusterCardLabels"
                  :stockLabels="props.stockLabels"
                  :enableAddFavorite="props.enableAddFavorite"
                  :onToggleFavorite="
                    (cluster: Cluster, isFav: boolean) => {
                      if (props.onToggleFavorite) {
                        props.onToggleFavorite(cluster, isFav);
                      }
                    }
                  "
                  :onClusterClick="
                    (cluster: Cluster) => {
                      if (props.onClusterClick) {
                        props.onClusterClick(cluster);
                      }
                    }
                  "
                />
              </template>

              <template v-if="!isClusterItem(item)">
                <component
                  :is="ProductCardImpl"
                  :columns="props.columns || 3"
                  :product="(item as Product)"
                  :showPrice="props.showPrice"
                  :allowAddToCart="
                    showAddToCart() ? props.allowAddToCart : false
                  "
                  :graphqlClient="infra.graphqlClient!"
                  :user="infra.user || null"
                  :configuration="infra.configuration"
                  :includeTax="resolvedIncludeTax"
                  :cartId="props.cartId"
                  :createCart="props.createCart"
                  :onCartCreated="props.onCartCreated"
                  :afterAddToCart="props.afterAddToCart"
                  :showModal="props.showModal"
                  :allowIncrDecr="props.allowIncrDecr"
                  :enableStockValidation="props.stockValidation"
                  :language="infra.language || 'NL'"
                  :onProceedToCheckout="props.onProceedToCheckout"
                  :onRequestQuoteClick="props.onRequestQuoteClick"
                  :onLoginClick="props.onLoginClick"
                  :labels="props.productCardLabels"
                  :addToCartLabels="props.addToCartLabels"
                  :enableAddFavorite="props.enableAddFavorite"
                  :showStock="props.showStock"
                  :showAvailability="props.showAvailability"
                  :stockLabels="props.stockLabels"
                  :priceLabels="props.priceLabels"
                  :companyId="infra.companyId"
                  :onToggleFavorite="
                    (product: Product, isFav: boolean) => {
                      if (props.onToggleFavorite)
                        props.onToggleFavorite(product, isFav);
                    }
                  "
                  :onProductClick="
                    (product: Product) => {
                      if (props.onProductClick) props.onProductClick(product);
                    }
                  "
                />
              </template>
            </div>
            <slot name="afterItem" :item="item" :index="idx" />
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, type Component } from "vue";

import {
  GraphQLClient,
  Product,
  Cluster,
  Cart,
  CartMainItem,
  AttributeFilter,
  ProductTextFilterInput,
  ProductsResponse,
  Category,
  Contact,
  Customer,
} from "@propeller-commerce/propeller-sdk-v2";
import DefaultProductCard from "./ProductCard.vue";
import DefaultClusterCard from "./ClusterCard.vue";
import { useProductSearch } from "../composables/vue/useProductSearch";
import { getLabel as _getLabel, isContentHidden, type Availability } from "@propeller-commerce/propeller-v2-core-ui";
import { useInfraProps } from "../composables/vue/useInfraProps";
import { usePropellerContext } from "../context/PropellerContext";
import {
  provideProductGridConfig,
  type ProductGridConfig,
} from "../context/ProductGridContext";

export interface ProductGridProps {
  // ── Data source ──────────────────────────────────────────────────────────

  /**
   * Initialised Propeller SDK GraphQL client.
   * Required when `products` is not provided — used for internal data fetching.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Pre-fetched products/clusters to display.
   * When provided the component skips internal API calls entirely.
   * Pass an empty array (not undefined) to show the empty state while the
   * parent controls loading.
   */
  products?: (Product | Cluster)[];

  // ── Locale / pricing ─────────────────────────────────────────────────────

  /** Language code for product data. Defaults to 'NL'. */
  language?: string;

  /** Tax zone used for price calculation. Defaults to 'NL'. */
  taxZone?: string;

  // ── Query mode (only used when graphqlClient is provided) ─────────────────

  /**
   * Category ID to list products for (category-page mode).
   * When omitted alongside `term` and `brand`, `config.baseCategoryId` is used.
   */
  categoryId?: number;

  /**
   * Search term — passes `term` into categoryProductSearchInput and uses
   * `config.baseCategoryId` so the whole catalog is searched.
   */
  term?: string;

  /**
   * Manufacturer/brand name — passes `manufacturers: [brand]` into
   * categoryProductSearchInput and uses `config.baseCategoryId`.
   */
  brand?: string;

  /** Scope the product fetch to specific orderlist IDs (e.g. a chosen B2B contract). */
  orderlistIds?: number[];

  /**
   * Apply the orderlist filter. Defaults to `true` when `orderlistIds` is
   * non-empty, `false` otherwise — so an authenticated user without a contract
   * still sees the full catalogue.
   */
  applyOrderlists?: boolean;

  /**
   * Attribute names to request per product, e.g. `['MPN']` — makes
   * `product.attributes` usable in card slots. Unset returns the first page of
   * ALL attributes (12 per product), so products with more than 12 silently
   * lose the rest.
   */
  productTrackAttributes?: string[];

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Number of columns in the grid. Accepts 2, 3, 4, 5, or 6. Defaults to 3. */
  columns?: number;

  // ── Loading ───────────────────────────────────────────────────────────────

  /**
   * Show a skeleton loader.
   * Useful when the parent controls loading state and passes `products` down.
   * The grid automatically shows a skeleton during internal fetches regardless
   * of this prop. Defaults to false.
   */
  isLoading?: boolean;

  // ── Portal / visibility ───────────────────────────────────────────────────

  /**
   * Controls portal visibility mode.
   * 'open'        — full e-commerce; AddToCart is visible in product cards.
   * 'semi-closed' — catalog-only; AddToCart is hidden.
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user passed through to ProductCard / AddToCart. */
  user?: Contact | Customer | null;

  /** Active company ID from the company switcher. Overrides user's default company for price calculation. Triggers a re-fetch when changed. */
  companyId?: number;

  /**
   * When true, tax-inclusive (gross) price is the leading price.
   * Defaults to false.
   */
  includeTax?: boolean;

  /**
   * Enables stock validation inside AddToCart.
   * Blocks add when requested quantity exceeds available stock.
   * Defaults to false.
   */
  stockValidation?: boolean;

  /**
   * When false, hides the AddToCart control in product cards.
   * ClusterCards always show their "View cluster" navigation button.
   * Defaults to true.
   */
  allowAddToCart?: boolean;

  /* ── External hooks ───────────────────────────────────────────────────────── */

  /**
   * Called after each internal data fetch with the filterable attributes
   * returned by the API (for driving a sibling FiltersSidebar).
   */
  onFiltersChange?: (filters: AttributeFilter[]) => void;

  /**
   * Active text filters to apply — built by the parent from FiltersSidebar
   * `onFilterChange` callbacks.  Each entry maps to a `textFilters` input
   * row in the CategoryService query.
   * When this prop changes the grid automatically re-fetches (page resets to 1).
   */
  textFilters?: ProductTextFilterInput[];

  /**
   * Active price range lower bound from the FiltersSidebar `onPriceChange`.
   * Triggers a re-fetch when changed.
   */
  priceFilterMin?: number;

  /**
   * Active price range upper bound from the FiltersSidebar `onPriceChange`.
   * Triggers a re-fetch when changed.
   */
  priceFilterMax?: number;

  /**
   * Active stock selection from the filters sidebar. Triggers a re-fetch when
   * changed. `'all'` or undefined means no stock filter.
   */
  availability?: Availability;

  /** Minimum stock quantity for the `'in-stock'` selection. Defaults to the minimum threshold. */
  minStock?: number;

  /**
   * Called when sort state changes internally (for syncing a sibling toolbar).
   */
  onSortChange?: (sort: any) => void;

  /**
   * Called after each internal data fetch with the min/max price of the
   * current product set — use to populate a price range slider in the parent.
   */
  onPriceBoundsChange?: (min: number, max: number) => void;

  /**
   * Called after each fetch with the total number of products found —
   * use to display a result count in the parent toolbar.
   */
  onItemsFoundChange?: (count: number) => void;

  /**
   * Called after each fetch with the number of items visible on the current page
   * (after client-side language filtering).
   */
  onPageItemCountChange?: (count: number) => void;

  /**
   * Called when the user clicks Previous / Next in the built-in pagination —
   * use to keep the parent URL / page state in sync.
   */
  onPageChange?: (page: number) => void;

  /**
   * Called after each successful internal data fetch with the full
   * ProductsResponse object — use to drive an external GridPagination
   * component by passing the result as its `products` prop.
   */
  onProductsResponse?: (products: ProductsResponse) => void;

  /**
   * Called after each successful internal data fetch with the full
   * Category object — use to populate sibling components like GridTitle,
   * CategoryDescription, and CategoryShortDescription.
   */
  onCategoryChange?: (category: Category) => void;

  /**
   * Called whenever the internal loading state changes.
   * Use to disable sibling components (e.g. GridFilters) while a fetch is in flight.
   */
  onLoadingChange?: (isLoading: boolean) => void;

  /**
   * Externally controlled current page.
   * When provided, the grid uses this value instead of its internal page
   * counter. Wire this to the `onPageChange` callback from a sibling
   * GridPagination so the two components stay in sync.
   * When changed the grid automatically re-fetches.
   */
  page?: number;

  /**
   * Number of products per page. Defaults to 12.
   * When changed the grid automatically re-fetches (page resets to 1).
   */
  pageSize?: number;

  /**
   * Sort field to use (e.g. 'NAME', 'PRICE').
   * When provided overrides internal sort state.
   * When changed the grid automatically re-fetches (page resets to 1).
   */
  sortField?: string;

  /**
   * Sort direction: 'ASC' or 'DESC'.
   * Only used when sortField is also provided.
   * When changed the grid automatically re-fetches (page resets to 1).
   */
  sortOrder?: string;

  /* ── Configuration ──────────────────────────────────────────────────────── */

  /**
   * Configuration object providing:
   *   imageSearchFiltersGrid, imageVariantFiltersMedium — passed to CategoryService
   *   baseCategoryId — used when querying by term or brand
   *   urls.getProductUrl / urls.getClusterUrl — for card URL generation
   */
  configuration?: any;

  /* ── ProductCard / AddToCart pass-through props ─────────────────────────── */

  /** ID of an existing cart to add items into. */
  cartId?: string;

  /**
   * Auto-create a cart when none is available.
   * Always pair with `onCartCreated` to persist the new cart ID.
   */
  createCart?: boolean;

  /** Called after AddToCart creates a new cart internally. */
  onCartCreated?: (cart: Cart) => void;

  /** Called after every successful add-to-cart operation. */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true, AddToCart shows a success modal instead of a toast.
   * Defaults to false.
   */
  showModal?: boolean;

  /**
   * Render − / + stepper buttons in AddToCart.
   * Defaults to true.
   */
  allowIncrDecr?: boolean;

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
   * Label overrides forwarded directly to the embedded AddToCart component.
   * Keys: add, adding, addedToCart, outOfStock, noCartId, errorAdding,
   *       modalTitle, quantity, continueShopping, proceedToCheckout
   */
  addToCartLabels?: Record<string, string>;

  /** Translated labels forwarded to embedded `<ProductCard>` instances.
   * See `ProductCardProps.labels` for slugs. */
  productCardLabels?: Record<string, string>;

  /** Translated labels forwarded to embedded `<ClusterCard>` instances.
   * See `ClusterCardProps.labels` for slugs. */
  clusterCardLabels?: Record<string, string>;

  /* ── Stock display ───────────────────────────────────────────────────────── */

  /**
   * Show the stock / availability widget on each product card.
   * Forwarded directly to `ProductCard.showStock`.
   * Defaults to false.
   */
  showStock?: boolean;

  /**
   * Show only the availability indicator inside the stock widget.
   * Forwarded to `ProductCard.showAvailability`.
   * Defaults to true.
   */
  showAvailability?: boolean;

  /**
   * Show the price below the product name.
   * Defaults to true.
   */
  showPrice?: boolean;

  /**
   * Label overrides forwarded to the embedded ItemStock component inside each card.
   * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
   */
  stockLabels?: Record<string, string>;

  /** Translated labels forwarded to the embedded `<ProductPrice>` display
   * inside each `<ProductCard>`. See `ProductPriceProps.labels` for slugs. */
  priceLabels?: Record<string, string>;

  /* ── Card interaction ────────────────────────────────────────────────────── */

  /** Show a heart-icon favourite toggle on each card. */
  enableAddFavorite?: boolean;

  /**
   * Called when a favourite is toggled on any card.
   * Receives the full Product or Cluster object and the new favourite state.
   */
  onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;

  /**
   * Called when a cluster card name, image, or "View cluster" button is
   * clicked — use for SPA-style routing instead of full-page navigation.
   */
  onClusterClick?: (cluster: Cluster) => void;

  /**
   * Called when a product card name or image is clicked — use for SPA
   * routing instead of full-page navigation.
   */
  onProductClick?: (product: Product) => void;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Translated labels keyed by the slugs used inside the component (see
   * `getLabel` calls). Missing keys fall back to the English defaults. */
  labels?: Record<string, string>;

  // ───── Extension API ─────
  // Sub-component injection — cascades through ProductGridConfig context
  // to every nested ProductCard / ClusterCard.
  priceComponent?: Component;
  stockComponent?: Component;
  addToCartComponent?: Component;
  imageComponent?: Component;
  badgesComponent?: Component;
  favoriteComponent?: Component;

  // Iteration-level: replace the whole ProductCard / ClusterCard.
  productCardComponent?: Component;
  clusterCardComponent?: Component;

  /**
   * Render arbitrary content directly below each card's product name. Receives
   * the product as a prop; cascades to every ProductCard via ProductGridConfig.
   * Lets hosts surface extra per-product info (e.g. package descriptions)
   * across the whole grid without swapping the entire card.
   */
  belowNameComponent?: Component;
}
interface ProductGridState {
  internalProducts: (Product | Cluster)[];
  isInternalLoading: boolean;
  currentPage: number;
  totalPages: number;
  itemsFound: number;
  currentSortField: string;
  currentSortOrder: string;
  fetchId: number;
  fetchProducts: () => Promise<void>;
  isClusterItem: (item: Product | Cluster) => boolean;
  getGridColsClass: () => string;
  handlePageChange: (page: number) => void;
  getDisplayProducts: () => (Product | Cluster)[];
  getIsLoading: () => boolean;
  showAddToCart: () => boolean;
  getSkeletonItems: () => number[];
}

const props = withDefaults(defineProps<ProductGridProps>(), {
  allowAddToCart: true,
  allowIncrDecr: true,
  showAvailability: true,
  showPrice: true,
  showStock: false,
  isLoading: false,
});

// Resolve infrastructure props (graphqlClient, configuration, user, companyId,
// language, includeTax, portalMode) from the propellerVue plugin scope +
// <PropellerProvider> when the host doesn't pass them explicitly. Without this
// a consumer that relies on the provider (e.g. propeller-vue's CategoryView,
// which omits :graphqlClient) leaves useProductSearch with no client, so its
// fetch short-circuits and the grid only ever shows SSR-seeded items — empty
// on every client-side navigation. Explicit props still win via useInfraProps
// precedence. Mirrors the pattern already used by Menu.vue.
const infra = useInfraProps(props);
// Effective tax-inclusive flag for the whole grid, passed down to every card.
// Vue coerces an absent `includeTax?: boolean` prop to `false`, so `false` is
// indistinguishable from "not set" — `infra.includeTax` would therefore always
// read the coerced `false` and shadow the provider. Resolve from the provider
// context directly instead: an explicit `true` is a host opt-in; otherwise the
// PropellerProvider scope (the VAT toggle) decides.
const ctxForTax = usePropellerContext();
const resolvedIncludeTax = computed<boolean>(() =>
  props.includeTax === true
    ? true
    : !!(ctxForTax ? ctxForTax.includeTax : false),
);

// ───── Extension API ─────
// Iteration-level component override: swap the whole card or fall back to
// the built-in implementation.
const ProductCardImpl = computed(
  () => props.productCardComponent ?? DefaultProductCard,
);
const ClusterCardImpl = computed(
  () => props.clusterCardComponent ?? DefaultClusterCard,
);

// Build the ProductGridConfig that cascades to nested cards. Includes the
// existing show*/allow* flags + callbacks PLUS the new component-slot keys.
// NOTE: provideProductGridConfig takes a plain ProductGridConfig, so
// consumers receive the snapshot at mount time. Extension-API props are
// expected to be stable for the lifetime of a mounted ProductGrid; if
// reactivity is later required, change `provideProductGridConfig` to accept
// a ref/computed and have consumers read `.value`.
const gridConfig = computed<ProductGridConfig>(() => ({
  columns: (props.columns as number) || 3,
  showStock: props.showStock,
  showAvailability: props.showAvailability,
  showPrice: props.showPrice,
  allowAddToCart: props.allowAddToCart,
  enableAddFavorite: props.enableAddFavorite,
  createCart: props.createCart,
  showModal: props.showModal,
  allowIncrDecr: props.allowIncrDecr,
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
  belowNameComponent: props.belowNameComponent,
}));

// CRITICAL: provide() must be called from setup synchronously.
provideProductGridConfig(gridConfig.value);

const categoryIdRef = computed(() => props.categoryId);
const termRef = computed(() => props.term);
const brandRef = computed(() => props.brand);
const orderlistIdsRef = computed(() => props.orderlistIds);
const applyOrderlistsRef = computed(() => props.applyOrderlists);
const productTrackAttributesRef = computed(() => props.productTrackAttributes);
const langRef = computed(() => infra.language || "NL");
const userRef = computed(() => infra.user ?? null);
const companyRef = computed(() => infra.companyId);
const textFiltersRef = computed(() => props.textFilters);
const priceMinRef = computed(() => props.priceFilterMin);
const priceMaxRef = computed(() => props.priceFilterMax);
const availabilityRef = computed(() => props.availability);
const minStockRef = computed(() => props.minStock);
const sortFieldRef = computed(() => props.sortField);
const sortOrderRef = computed(() => props.sortOrder);
const pageRef = computed(() => props.page);
const pageSizeRef = computed(() => props.pageSize ?? 12);
const productsRef = computed(() => props.products);

const {
  displayProducts,
  isLoading,
  itemsFound,
  currentSortField,
  currentSortOrder,
  currentPage,
  totalPages,
  fetchProducts,
  goToPage,
} = useProductSearch({
  graphqlClient: infra.graphqlClient,
  products: productsRef,
  categoryId: categoryIdRef,
  term: termRef,
  brand: brandRef,
  orderlistIds: orderlistIdsRef,
  applyOrderlists: applyOrderlistsRef,
  productTrackAttributes: productTrackAttributesRef,
  language: langRef,
  taxZone: props.taxZone,
  user: userRef,
  companyId: companyRef,
  textFilters: textFiltersRef,
  priceFilterMin: priceMinRef,
  priceFilterMax: priceMaxRef,
  availability: availabilityRef,
  minStock: minStockRef,
  sortField: sortFieldRef,
  sortOrder: sortOrderRef,
  page: pageRef,
  pageSize: pageSizeRef,
  configuration: infra.configuration,
  onFiltersChange: props.onFiltersChange,
  onPriceBoundsChange: props.onPriceBoundsChange,
  onItemsFoundChange: props.onItemsFoundChange,
  onPageChange: props.onPageChange,
  onProductsResponse: props.onProductsResponse,
  onCategoryChange: props.onCategoryChange,
});

// onLoadingChange is not a composable option — wire via watch:
watch(
  () => isLoading.value,
  (v) => props.onLoadingChange?.(v),
);

function isClusterItem(
  item: Product | Cluster,
): ReturnType<ProductGridState["isClusterItem"]> {
  return !!(item as any)?.clusterId;
}
function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
function getGridColsClass(): ReturnType<ProductGridState["getGridColsClass"]> {
  const cols = (props.columns as number) || 3;
  if (cols === 1) return "flex flex-col gap-4";
  if (cols === 2) return "grid grid-cols-2 gap-3 sm:gap-6 auto-rows-fr";
  if (cols === 4)
    return "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 auto-rows-fr";
  if (cols === 5)
    return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 auto-rows-fr";
  if (cols === 6)
    return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6 auto-rows-fr";
  return "grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr";
}
function handlePageChange(
  page: number,
): ReturnType<ProductGridState["handlePageChange"]> {
  goToPage(page);
}
function getDisplayProducts(): ReturnType<
  ProductGridState["getDisplayProducts"]
> {
  return displayProducts.value;
}
function getIsLoading(): ReturnType<ProductGridState["getIsLoading"]> {
  return isLoading.value || (props.isLoading ?? false);
}
function showAddToCart(): ReturnType<ProductGridState["showAddToCart"]> {
  const allow = (props.allowAddToCart as boolean) !== false;
  // Anonymous visitors only — a signed-in user keeps add-to-cart.
  return (
    !isContentHidden(
      infra.portalMode as string | undefined,
      (props.user ?? infra.user) as Contact | Customer | null | undefined,
    ) && allow
  );
}
function getSkeletonItems(): ReturnType<ProductGridState["getSkeletonItems"]> {
  const cols = (props.columns as number) || 3;
  const count =
    cols === 2 ? 4 : cols === 4 ? 8 : cols === 5 ? 10 : cols === 6 ? 12 : 6;
  const items: number[] = [];
  for (let i = 0; i < count; i++) items.push(i);
  return items;
}
</script>
