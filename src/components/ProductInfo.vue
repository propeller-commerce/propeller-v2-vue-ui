<template>
  <div
    v-if="!useNewShell"
    :class="`propeller-product-info ${className || ''}`"
    :data-loading="loading ? 'true' : 'false'"
  >
    <template v-if="loading && !product">
      <div class="propeller-product-info__skeleton animate-pulse space-y-3">
        <div
          class="propeller-product-info__skeleton-line h-4 bg-surface-hover rounded w-1/4"
        ></div>
        <div
          class="propeller-product-info__skeleton-line h-8 bg-surface-hover rounded w-3/4"
        ></div>
      </div>
    </template>

    <template v-if="!loading || !!product">
      <template v-if="showSku !== false && !!getProductSku()">
        <div class="text-sm font-mono text-muted-foreground mb-2">
          SKU: {{ getProductSku() }}
        </div>
      </template>

      <template v-if="showTitle !== false && !!getProductName()">
        <h1 class="text-4xl font-bold tracking-tight text-foreground mb-4">
          {{ getProductName() }}
        </h1>
      </template>
    </template>
  </div>

  <div
    v-else
    :class="`propeller-product-info ${className || ''}`"
  >
    <slot name="beforeContent" :product="resolvedProduct" />
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="propeller-product-info__media relative">
        <slot
          v-if="showImage !== false && resolvedProduct"
          name="image"
          :product="resolvedProduct"
          :language="language"
          :imageSearchFilters="imageSearchFilters"
          :imageVariantFilters="imageVariantFilters"
        >
          <component
            :is="ImageImpl"
            :product="resolvedProduct"
            :language="language"
            :image-search-filters="imageSearchFilters"
            :image-variant-filters="imageVariantFilters"
          />
        </slot>
        <slot
          v-if="showBadges !== false && resolvedProduct"
          name="badges"
          :product="resolvedProduct"
          :labels="labels"
        >
          <component
            :is="BadgesImpl"
            :product="resolvedProduct"
            :labels="labels"
          />
        </slot>
      </div>
      <div class="propeller-product-info__content space-y-4">
        <slot
          v-if="showTitle !== false && !!getProductName(resolvedProduct)"
          name="title"
          :product="resolvedProduct"
          :name="getProductName(resolvedProduct)"
        >
          <h1 class="text-2xl font-bold tracking-tight text-foreground">
            {{ getProductName(resolvedProduct) }}
          </h1>
        </slot>
        <slot
          v-if="showSku !== false && !!getProductSku(resolvedProduct)"
          name="sku"
          :product="resolvedProduct"
          :sku="getProductSku(resolvedProduct)"
        >
          <div class="text-sm font-mono text-muted-foreground">
            SKU: {{ getProductSku(resolvedProduct) }}
          </div>
        </slot>
        <slot
          v-if="showFavorite !== false && resolvedProduct"
          name="favorite"
          :product="resolvedProduct"
          :user="user"
        >
          <component
            :is="FavoriteImpl"
            :product="resolvedProduct"
            :product-id="resolvedProduct.productId"
            :graphql-client="graphqlClient"
            :user="user"
            :labels="labels"
          />
        </slot>
        <slot
          v-if="showPrice !== false && resolvedProduct?.price"
          name="price"
          :product="resolvedProduct"
          :price="resolvedProduct.price"
          :includeTax="includeTax"
          :currency="currency"
          :labels="labels"
        >
          <component
            :is="PriceImpl"
            :price="resolvedProduct.price"
            :include-tax="includeTax"
            :currency="currency"
            :tax-zone="taxZone"
            :user="user"
            :labels="labels"
            :portal-mode="portalMode"
            :show-login-prompt="false"
          />
        </slot>
        <slot
          v-if="showStock !== false && resolvedProduct?.inventory && !contentHidden"
          name="stock"
          :product="resolvedProduct"
          :inventory="resolvedProduct.inventory"
          :showStock="true"
          :showAvailability="true"
          :labels="labels"
        >
          <component
            :is="StockImpl"
            :inventory="resolvedProduct.inventory"
            :show-stock="true"
            :show-availability="true"
            :labels="labels"
          />
        </slot>
        <LoginToOrderButton
          v-if="contentHidden && resolvedProduct"
          :labels="labels"
          :on-login-click="onLoginClick"
        />
        <slot
          v-else-if="showAddToCart !== false && resolvedProduct"
          name="addToCart"
          :product="resolvedProduct"
          :cartId="undefined"
          :labels="labels"
        >
          <component
            :is="AddToCartImpl"
            :product="resolvedProduct"
            :graphql-client="graphqlClient"
            :user="user"
            :company-id="companyId"
            :configuration="configuration"
            :include-tax="includeTax"
            :currency="currency"
            :language="language"
            :labels="labels"
          />
        </slot>
        <slot
          v-if="showBundles !== false && resolvedProduct"
          name="bundles"
          :product="resolvedProduct"
          :labels="labels"
        >
          <component
            :is="BundlesImpl"
            :product="resolvedProduct"
            :product-id="resolvedProduct.productId"
            :graphql-client="graphqlClient"
            :user="user"
            :company-id="companyId"
            :configuration="configuration"
            :include-tax="includeTax"
            :tax-zone="taxZone"
            :language="language"
            :labels="labels"
          />
        </slot>
        <slot
          v-if="showBulkPrices !== false && resolvedProduct?.bulkPrices"
          name="bulkPrices"
          :product="resolvedProduct"
          :bulkPrices="resolvedProduct.bulkPrices"
          :includeTax="includeTax"
          :labels="labels"
        >
          <component
            :is="BulkPricesImpl"
            :product="resolvedProduct"
            :bulk-prices="resolvedProduct.bulkPrices"
            :include-tax="includeTax"
            :tax-zone="taxZone"
            :currency="currency"
            :user="user"
            :labels="labels"
          />
        </slot>
        <slot
          v-if="showSurcharges !== false && resolvedProduct"
          name="surcharges"
          :product="resolvedProduct"
          :includeTax="includeTax"
          :labels="labels"
        >
          <component
            :is="SurchargesImpl"
            :product="resolvedProduct"
            :include-tax="includeTax"
            :labels="labels"
          />
        </slot>
      </div>
    </div>
    <slot name="afterContent" :product="resolvedProduct" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, type Component } from "vue";

import {
  GraphQLClient,
  Product,
  LocalizedString,
  Contact,
  Customer,
} from "@propeller-commerce/propeller-sdk-v2";
import { useProductInfo } from "../composables/vue/useProductInfo";
import {
  getLanguageString,
  getLanguageUri,
} from '@propeller-commerce/propeller-v2-core-ui';
import {
  provideProductGridConfig,
  type ProductGridConfig,
} from '../context/ProductGridContext';
import { isContentHidden } from '@propeller-commerce/propeller-v2-core-ui';
import LoginToOrderButton from './LoginToOrderButton.vue';
import DefaultProductPrice from './ProductPrice.vue';
import DefaultItemStock from './ItemStock.vue';
import DefaultAddToCart from './AddToCart.vue';
import DefaultAddToFavorite from './AddToFavorite.vue';
import DefaultProductBundles from './ProductBundles.vue';
import DefaultProductBulkPrices from './ProductBulkPrices.vue';
import DefaultProductImage from './defaults/DefaultProductImage.vue';
import DefaultProductBadges from './defaults/DefaultProductBadges.vue';
import DefaultProductSurcharges from './defaults/DefaultProductSurcharges.vue';

export interface ProductInfoProps {
  // ── Data source ──────────────────────────────────────────────────────────
  /** The authenticated user (Contact or Customer). Resolved from PropellerProvider when omitted. */
  user?: Contact | Customer | null;

  /** Active company ID from the company switcher.
   * Overrides default company for price calculation.
   * Triggers a re-fetch when changed. */
  companyId?: number;

  /**
   * Scope the product fetch to specific orderlist IDs (e.g. a chosen B2B
   * contract). Overrides the default resolution of all the company's orderlists.
   */
  orderlistIds?: number[];

  /**
   * Apply the orderlist filter. Defaults to `true`; set `false` to browse
   * unscoped (full catalogue) for an authenticated user without a contract.
   */
  applyOrderlists?: boolean;

  /**
   * Pre-fetched product object to display.
   * When provided the component skips internal fetching.
   */
  product?: Product;

  /**
   * Product ID to fetch data for when no `product` prop is provided.
   * Requires `graphqlClient` to be set.
   */
  productId?: number;

  /**
   * Initialised Propeller SDK GraphQL client.
   * Required when `productId` is provided for internal data fetching.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Image search filter passed to ProductService.getProduct().
   * Controls how many image items are returned.
   * Example: { page: 1, offset: 20 }
   */
  imageSearchFilters?: any;

  /**
   * Image variant transformation filter passed to ProductService.getProduct().
   * Controls image size/format variants returned with the product.
   * Example: imageVariantFiltersLarge from @/data/defaults
   * Defaults to { transformations: [] } when omitted.
   */
  imageVariantFilters?: any;

  /**
   * Tax zone to use for price calculation.
   */
  taxZone?: string;

  /**
   * Called once the product data is loaded — either immediately (when
   * `product` prop is supplied) or after the internal fetch completes.
   * Use this to hydrate sibling components (gallery, price, descriptions, etc.).
   */
  onProductLoaded?: (product: Product) => void;

  // ── Display toggles ───────────────────────────────────────────────────────

  /** Show the product name. Defaults to true. */
  showTitle?: boolean;

  /** Show the product SKU. Defaults to true. */
  showSku?: boolean;

  // ── Locale ────────────────────────────────────────────────────────────────

  /** Language code used to resolve localised names. Defaults to 'NL'. */
  language?: string;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /**
   * Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall.
   */
  configuration?: any;

  /**
   * Attribute codes/names to look up and display as badge overlays on the product image.
   * Each code is resolved against `product.attributes.items[].attributeDescription.code`
   * (or `.name`). Attributes with no matching value are silently omitted.
   * Example: ['new', 'sale']
   */
  imageLabels?: string[];

  /**
   * Attribute codes/names to look up and display as extra text rows below the product name.
   * Resolved the same way as `imageLabels`.
   * Example: ['brand', 'color']
   */
  textLabels?: string[];

  // ───── Extension API ─────
  // New PDP shell. Passing ANY new `show*` prop or any *Component prop
  // opts INTO the new shell layout. When none is passed, ProductInfo
  // preserves the legacy minimal title+SKU block (backward compat).
  showImage?: boolean;
  showBadges?: boolean;
  showFavorite?: boolean;
  showPrice?: boolean;
  showStock?: boolean;
  showAddToCart?: boolean;

  /**
   * Portal access mode. In `'semi-closed'` price, stock and add-to-cart are
   * withheld from anonymous visitors, who get a log-in action instead.
   */
  portalMode?: string;

  /**
   * Invoked when an anonymous visitor clicks the log-in action that replaces
   * add-to-cart in a semi-closed portal. The host owns navigation.
   */
  onLoginClick?: () => void;
  showBundles?: boolean;
  showBulkPrices?: boolean;
  showSurcharges?: boolean;

  imageComponent?: Component;
  badgesComponent?: Component;
  favoriteComponent?: Component;
  priceComponent?: Component;
  stockComponent?: Component;
  addToCartComponent?: Component;
  bundlesComponent?: Component;
  bulkPricesComponent?: Component;
  surchargesComponent?: Component;

  // Forwarded display props for the shell:
  includeTax?: boolean;
  currency?: string;

  /**
   * Override any UI string.
   * Forwarded down to nested default components in the new shell.
   */
  labels?: Record<string, string>;
}

const props = withDefaults(defineProps<ProductInfoProps>(), {
  showSku: true,
  showTitle: true,
});

const userRef = computed(() => props.user ?? null);
const companyRef = computed(() => props.companyId);
const orderlistIdsRef = computed(() => props.orderlistIds);
const applyOrderlistsRef = computed(() => props.applyOrderlists);
const langRef = computed(() => props.language || "NL");

const { product, cluster, loading, error, fetchProduct, fetchCluster } =
  useProductInfo({
    graphqlClient: props.graphqlClient as GraphQLClient,
    language: langRef,
    taxZone: props.taxZone,
    user: userRef,
    companyId: companyRef,
    orderlistIds: orderlistIdsRef,
    applyOrderlists: applyOrderlistsRef,
    configuration: props.configuration,
  });

onMounted(() => {
  if (props.product) {
    if (props.onProductLoaded) {
      props.onProductLoaded(props.product);
    }
    return;
  }
  if (props.productId) {
    fetchProduct(props.productId).then(() => {
      if (product.value && props.onProductLoaded) {
        props.onProductLoaded(product.value);
      }
    });
  }
});

watch(
  () => [
    props.productId,
    props.product,
    props.language,
    props.user,
    props.companyId,
  ],
  () => {
    if (props.product) {
      if (props.onProductLoaded) {
        props.onProductLoaded(props.product);
      }
      return;
    }
    if (!props.productId) return;
    fetchProduct(props.productId).then(() => {
      if (product.value && props.onProductLoaded) {
        props.onProductLoaded(product.value);
      }
    });
  },
);

function getDisplayProduct(): Product | null {
  return (props.product as Product) || product.value;
}
function getProductName(p?: Product | null): string {
  const target = p ?? getDisplayProduct();
  if (!target) return "";
  return getLanguageString(target.names, props.language || "NL", "");
}
function getProductSku(p?: Product | null): string {
  const target = p ?? getDisplayProduct();
  return target?.sku || "";
}

// ───── Extension API ─────
const resolvedProduct = computed<Product | null>(() => getDisplayProduct());

// Keys whose presence on `<ProductInfo>` opts the consumer into the new
// (composable) shell. Only `*Component` injection props count — Boolean
// `show*` props are deliberately excluded because Vue 3 normalizes any
// declared Boolean prop the parent doesn't pass to `false` (not `undefined`),
// which made `useNewShell` falsely fire on every legacy call site that did
// `<ProductInfo :product="..." />` with no slots and no injection. The
// new shell's per-section visibility is still honoured via the
// `v-if="show* !== false && …"` checks inside the template; consumers who
// only want to hide a section don't need the new shell anyway, because the
// legacy shell only renders SKU + title.
const NEW_SHELL_KEYS = [
  'imageComponent', 'badgesComponent', 'favoriteComponent', 'priceComponent',
  'stockComponent', 'addToCartComponent', 'bundlesComponent',
  'bulkPricesComponent', 'surchargesComponent',
] as const;

const useNewShell = computed(() =>
  NEW_SHELL_KEYS.some((k) => (props as Record<string, unknown>)[k] !== undefined)
);

const contentHidden = computed<boolean>(() =>
  isContentHidden(props.portalMode, props.user),
);

const ImageImpl = computed(() => props.imageComponent ?? DefaultProductImage);
const BadgesImpl = computed(() => props.badgesComponent ?? DefaultProductBadges);
const FavoriteImpl = computed(() => props.favoriteComponent ?? DefaultAddToFavorite);
const PriceImpl = computed(() => props.priceComponent ?? DefaultProductPrice);
const StockImpl = computed(() => props.stockComponent ?? DefaultItemStock);
const AddToCartImpl = computed(() => props.addToCartComponent ?? DefaultAddToCart);
const BundlesImpl = computed(() => props.bundlesComponent ?? DefaultProductBundles);
const BulkPricesImpl = computed(() => props.bulkPricesComponent ?? DefaultProductBulkPrices);
const SurchargesImpl = computed(() => props.surchargesComponent ?? DefaultProductSurcharges);

// Task 35: cascade injection slots to nested components via grid-config context.
// PDP isn't a grid; `columns: 1` is the conventional placeholder. The cascade
// carries only `undefined` values when no slot props are passed, so it is safe
// to call unconditionally even when the legacy path renders.
const pdpConfig = computed<ProductGridConfig>(() => ({
  columns: 1,
  priceComponent: props.priceComponent,
  stockComponent: props.stockComponent,
  addToCartComponent: props.addToCartComponent,
  imageComponent: props.imageComponent,
  badgesComponent: props.badgesComponent,
  favoriteComponent: props.favoriteComponent,
}));
provideProductGridConfig(pdpConfig.value);
</script>
