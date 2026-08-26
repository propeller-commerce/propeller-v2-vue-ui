<template>
  <div
    :class="`propeller-cluster-card group relative flex h-full overflow-hidden rounded-[var(--radius-container)] border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${
      isRow() ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'
    } ${className || ''}`"
    :data-layout="isRow() ? 'row' : 'grid'"
  >
    <template v-if="showImage !== false">
      <!-- Injected imageComponent takes over the full image area
           (no auto-rendered badges/favorite around it). -->
      <component
        v-if="props.imageComponent"
        :is="ImageImpl"
        :cluster="cluster"
        :language="language"
        :image-search-filters="configuration?.imageSearchFiltersGrid"
        :image-variant-filters="configuration?.imageVariantFiltersMedium"
        :class="`propeller-cluster-card__media relative overflow-hidden bg-surface-hover ${
          isRow()
            ? 'w-20 h-20 flex-shrink-0 p-2'
            : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'
        }`"
      />
      <!-- Default image area; consumer can override via #image slot.
           Slot default still renders the badges/favorite injection/slot blocks. -->
      <slot
        v-else
        name="image"
        :cluster="cluster"
        :language="language"
        :imageUrl="getClusterImageUrl()"
        :imageSearchFilters="configuration?.imageSearchFiltersGrid"
        :imageVariantFilters="configuration?.imageVariantFiltersMedium"
        :onNavigate="handleClusterClick"
      >
        <div
          :class="`propeller-cluster-card__media relative overflow-hidden bg-surface-hover ${
            isRow()
              ? 'w-20 h-20 flex-shrink-0 p-2'
              : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'
          }`"
        >
          <a
            class="block h-full w-full"
            :href="getClusterUrl()"
            @click="async (e) => handleClusterClick(e)"
          >
            <template v-if="!!getClusterImageUrl()">
              <img
                class="propeller-cluster-card__image h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                :src="getClusterImageUrl()"
                :alt="getClusterName()"
              />
            </template>

            <template v-if="!getClusterImageUrl()">
              <div
                class="propeller-cluster-card__image-placeholder flex h-full w-full items-center justify-center text-foreground-subtle"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="h-16 w-16"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    :strokeWidth="1"
                  ></path>
                </svg>
              </div>
            </template>
          </a>
          <!-- Injected badgesComponent takes precedence; otherwise #badges slot
               (default content is the inline badges block). -->
          <component
            v-if="props.badgesComponent"
            :is="BadgesImpl"
            :cluster="cluster"
            :labels="labels"
          />
          <slot
            v-else-if="
              !!imageLabels &&
              imageLabels.length > 0 &&
              computedImageLabels().length > 0
            "
            name="badges"
            :cluster="cluster"
            :imageLabels="computedImageLabels()"
            :labels="labels"
          >
            <div
              class="propeller-cluster-card__badges pointer-events-none absolute left-2 top-2 flex flex-col gap-1"
            >
              <template
                :key="index"
                v-for="(label, index) in computedImageLabels()"
              >
                <span
                  class="propeller-cluster-card__badge inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-sm"
                  >{{ label }}</span
                >
              </template>
            </div>
          </slot>

          <!-- Injected favoriteComponent takes precedence; otherwise #favorite slot
               (default content is the inline heart button). -->
          <component
            v-if="props.favoriteComponent && enableAddFavorite"
            :is="FavoriteImpl"
            :cluster="cluster"
            :on-toggle-favorite="onToggleFavorite"
            :labels="labels"
          />
          <slot
            v-else-if="enableAddFavorite"
            name="favorite"
            :cluster="cluster"
            :isFavorite="isFavorite"
            :toggle="handleToggleFavorite"
            :labels="labels"
          >
            <button
              type="button"
              @click="async (e) => handleToggleFavorite(e)"
              :aria-label="
                isFavorite
                  ? getLabel('removeFromFavorites', 'Remove from favourites')
                  : getLabel('addToFavorites', 'Add to favourites')
              "
              :data-favorite="isFavorite ? 'true' : 'false'"
              :class="`propeller-cluster-card__favorite-btn absolute right-2 top-2 rounded-full border bg-card p-1.5 shadow-sm transition-colors ${
                isFavorite
                  ? 'border-destructive text-destructive'
                  : 'border-border-subtle text-foreground-subtle hover:text-destructive'
              }`"
            >
              <svg
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="h-4 w-4"
                :fill="isFavorite ? 'currentColor' : 'none'"
                :strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                ></path>
              </svg>
            </button>
          </slot>
        </div>
      </slot>
    </template>

    <template v-if="isRow()">
      <div
        class="propeller-cluster-card__body flex flex-1 flex-row items-center gap-4 px-4 py-2 min-w-0"
      >
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <slot
            v-if="showSku !== false && !!getClusterSku()"
            name="sku"
            :cluster="cluster"
            :sku="getClusterSku()"
          >
            <div
              class="propeller-cluster-card__sku font-mono text-xs text-foreground-subtle"
            >
              {{ getClusterSku() }}
            </div>
          </slot>

          <slot
            v-if="showName !== false"
            name="name"
            :cluster="cluster"
            :clusterUrl="getClusterUrl()"
            :handleClusterClick="handleClusterClick"
            :linkable="true"
            :name="getClusterName()"
          >
            <a
              class="propeller-cluster-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-1"
              :href="getClusterUrl()"
              @click="async (e) => handleClusterClick(e)"
              >{{ getClusterName() }}</a
            >
          </slot>

          <slot
            v-if="
              !!textLabels &&
              textLabels.length > 0 &&
              computedTextLabels().length > 0
            "
            name="textLabels"
            :cluster="cluster"
            :values="computedTextLabels()"
          >
            <div class="flex flex-col gap-0.5">
              <template
                :key="index"
                v-for="(item, index) in computedTextLabels()"
              >
                <div
                  class="propeller-cluster-card__label text-xs text-muted-foreground"
                >
                  {{ item.value }}
                </div>
              </template>
            </div>
          </slot>

          <slot
            v-if="showManufacturer && !!getClusterManufacturer()"
            name="manufacturer"
            :cluster="cluster"
            :manufacturer="getClusterManufacturer()"
          >
            <div
              class="propeller-cluster-card__manufacturer text-xs text-muted-foreground"
            >
              {{ getClusterManufacturer() }}
            </div>
          </slot>

          <slot
            v-if="showShortDescription && !!getClusterShortDescription()"
            name="shortDescription"
            :cluster="cluster"
            :text="getClusterShortDescription()"
          >
            <p
              class="propeller-cluster-card__description line-clamp-2 text-xs text-muted-foreground"
            >
              {{ getClusterShortDescription() }}
            </p>
          </slot>
        </div>
      </div>
      <div
        class="propeller-cluster-card__footer w-full md:w-auto flex flex-col gap-2 md:flex-row md:items-center md:gap-3 px-4 py-2 md:py-0 border-t md:border-t-0 border-border-subtle"
      >
        <div
          class="propeller-cluster-card__footer-meta flex items-center justify-between gap-3 md:contents"
        >
        <slot
          v-if="showStock && !!cluster.defaultProduct?.inventory"
          name="stock"
          :cluster="cluster"
          :inventory="cluster.defaultProduct?.inventory"
          :showAvailability="false"
          :labels="stockLabels"
        >
          <component
            v-if="props.stockComponent"
            :is="StockImpl"
            :inventory="cluster.defaultProduct?.inventory"
            :show-availability="false"
            :show-stock="true"
            :labels="stockLabels"
          />
          <ItemStock
            v-else
            :inventory="cluster.defaultProduct?.inventory"
            :showAvailability="false"
            :showStock="true"
            :labels="stockLabels"
          ></ItemStock>
        </slot>

        <slot
          v-if="!!getClusterPrice()"
          name="price"
          :cluster="cluster"
          :price="cluster.defaultProduct?.price"
          :includeTax="resolvedIncludeTax"
          :currency="currency"
          :labels="labels"
        >
          <component
            v-if="props.priceComponent"
            :is="PriceImpl"
            :price="cluster.defaultProduct?.price"
            :include-tax="resolvedIncludeTax"
            :currency="currency"
            :labels="labels"
          />
          <span
            v-else
            class="propeller-cluster-card__price font-bold text-foreground text-sm whitespace-nowrap"
            >{{ getClusterPrice() }}</span
          >
        </slot>
        </div>

        <div class="propeller-cluster-card__cta w-full md:w-auto md:flex-shrink-0 md:ml-auto">
          <slot
            name="viewClusterLink"
            :cluster="cluster"
            :clusterUrl="getClusterUrl()"
            :handleClusterClick="handleClusterClick"
            :label="getLabel('viewCluster', 'View cluster')"
          >
            <a
              class="propeller-cluster-card__cta-link flex w-full min-w-0 items-center justify-center rounded-[var(--radius-control)] bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              :href="getClusterUrl()"
              @click="async (e) => handleClusterClick(e)"
              ><span class="propeller-cluster-card__cta-label min-w-0 truncate">{{ getLabel("viewCluster", "View cluster") }}</span></a
            >
          </slot>
        </div>
      </div>
    </template>

    <template v-if="!isRow()">
      <div
        class="propeller-cluster-card__body flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4"
      >
        <slot
          v-if="showSku !== false && !!getClusterSku()"
          name="sku"
          :cluster="cluster"
          :sku="getClusterSku()"
        >
          <div
            class="propeller-cluster-card__sku font-mono text-xs text-foreground-subtle"
          >
            {{ getClusterSku() }}
          </div>
        </slot>

        <slot
          v-if="showName !== false"
          name="name"
          :cluster="cluster"
          :clusterUrl="getClusterUrl()"
          :handleClusterClick="handleClusterClick"
          :linkable="true"
          :name="getClusterName()"
        >
          <a
            class="propeller-cluster-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-2"
            :href="getClusterUrl()"
            @click="async (e) => handleClusterClick(e)"
            >{{ getClusterName() }}</a
          >
        </slot>

        <div
          v-if="showStock && !!cluster.defaultProduct?.inventory"
          class="hidden md:block"
        >
          <slot
            name="stock"
            :cluster="cluster"
            :inventory="cluster.defaultProduct?.inventory"
            :showAvailability="showAvailability !== false"
            :labels="stockLabels"
          >
            <component
              v-if="props.stockComponent"
              :is="StockImpl"
              :inventory="cluster.defaultProduct?.inventory"
              :show-availability="showAvailability !== false"
              :show-stock="true"
              :labels="stockLabels"
            />
            <ItemStock
              v-else
              :inventory="cluster.defaultProduct?.inventory"
              :showAvailability="showAvailability !== false"
              :showStock="true"
              :labels="stockLabels"
            ></ItemStock>
          </slot>
        </div>

        <slot
          v-if="
            !!textLabels &&
            textLabels.length > 0 &&
            computedTextLabels().length > 0
          "
          name="textLabels"
          :cluster="cluster"
          :values="computedTextLabels()"
        >
          <div class="propeller-cluster-card__labels flex flex-col gap-0.5">
            <template
              :key="index"
              v-for="(item, index) in computedTextLabels()"
            >
              <div
                class="propeller-cluster-card__label text-xs text-muted-foreground"
              >
                {{ item.value }}
              </div>
            </template>
          </div>
        </slot>

        <slot
          v-if="showManufacturer && !!getClusterManufacturer()"
          name="manufacturer"
          :cluster="cluster"
          :manufacturer="getClusterManufacturer()"
        >
          <div
            class="propeller-cluster-card__manufacturer text-xs text-muted-foreground"
          >
            {{ getClusterManufacturer() }}
          </div>
        </slot>

        <slot
          v-if="showShortDescription && !!getClusterShortDescription()"
          name="shortDescription"
          :cluster="cluster"
          :text="getClusterShortDescription()"
        >
          <p
            class="propeller-cluster-card__description line-clamp-2 text-xs text-muted-foreground"
          >
            {{ getClusterShortDescription() }}
          </p>
        </slot>

        <div
          v-if="!!getClusterPrice()"
          class="mt-auto hidden md:block"
        >
          <slot
            name="price"
            :cluster="cluster"
            :price="cluster.defaultProduct?.price"
            :includeTax="resolvedIncludeTax"
            :currency="currency"
            :labels="labels"
          >
            <div class="propeller-cluster-card__price pt-1">
              <component
                v-if="props.priceComponent"
                :is="PriceImpl"
                :price="cluster.defaultProduct?.price"
                :include-tax="resolvedIncludeTax"
                :currency="currency"
                :labels="labels"
              />
              <span v-else class="font-bold text-foreground text-base sm:text-lg">{{
                getClusterPrice()
              }}</span>
            </div>
          </slot>
        </div>
      </div>
      <div
        v-if="(showStock && !!cluster.defaultProduct?.inventory) || !!getClusterPrice()"
        class="propeller-cluster-card__footer-meta flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 pt-1 sm:px-4 md:hidden"
      >
        <slot
          v-if="showStock && !!cluster.defaultProduct?.inventory"
          name="stock"
          :cluster="cluster"
          :inventory="cluster.defaultProduct?.inventory"
          :showAvailability="showAvailability !== false"
          :labels="stockLabels"
        >
          <component
            v-if="props.stockComponent"
            :is="StockImpl"
            :inventory="cluster.defaultProduct?.inventory"
            :show-availability="showAvailability !== false"
            :show-stock="true"
            :labels="stockLabels"
          />
          <ItemStock
            v-else
            :inventory="cluster.defaultProduct?.inventory"
            :showAvailability="showAvailability !== false"
            :showStock="true"
            :labels="stockLabels"
          ></ItemStock>
        </slot>

        <slot
          v-if="!!getClusterPrice()"
          name="price"
          :cluster="cluster"
          :price="cluster.defaultProduct?.price"
          :includeTax="resolvedIncludeTax"
          :currency="currency"
          :labels="labels"
        >
          <component
            v-if="props.priceComponent"
            :is="PriceImpl"
            :price="cluster.defaultProduct?.price"
            :include-tax="resolvedIncludeTax"
            :currency="currency"
            :labels="labels"
          />
          <span v-else class="propeller-cluster-card__price font-bold text-foreground text-base min-w-0 text-right">{{
            getClusterPrice()
          }}</span>
        </slot>
      </div>
      <div class="propeller-cluster-card__cta px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <slot
          name="viewClusterLink"
          :cluster="cluster"
          :clusterUrl="getClusterUrl()"
          :handleClusterClick="handleClusterClick"
          :label="getLabel('viewCluster', 'View cluster')"
        >
          <a
            class="propeller-cluster-card__cta-link flex w-full min-w-0 items-center justify-center rounded-[var(--radius-control)] bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            :href="getClusterUrl()"
            @click="async (e) => handleClusterClick(e)"
            ><span class="propeller-cluster-card__cta-label min-w-0 truncate">{{ getLabel("viewCluster", "View cluster") }}</span></a
          >
        </slot>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from "vue";

import { Cluster, AttributeResult } from "@propeller-commerce/propeller-sdk-v2";
import ItemStock from "./ItemStock.vue";
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import {
  getClusterImageUrl as _getClusterImageUrl,
  getClusterSku as _getClusterSku,
} from '@propeller-commerce/propeller-v2-core-ui';
import { getLanguageString } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { useResolvedProps, type ResolveSpec } from '../composables/vue/useResolvedProps';
import { useInfraProps } from '../composables/vue/useInfraProps';
import DefaultProductPrice from './ProductPrice.vue';
import DefaultItemStock from './ItemStock.vue';
import DefaultAddToFavorite from './AddToFavorite.vue';
import DefaultProductImage from './defaults/DefaultProductImage.vue';
import DefaultProductBadges from './defaults/DefaultProductBadges.vue';

export interface ClusterCardProps {
  // === Core ===

  /** The cluster object to display */
  cluster: Cluster;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  // === Display toggles ===

  /** Show the cluster name. Defaults to true. */
  showName?: boolean;

  /** Show the default product image. Defaults to true. */
  showImage?: boolean;

  /** Show the cluster short description. Defaults to false. */
  showShortDescription?: boolean;

  /**
   * Show the SKU. Displays the cluster SKU; falls back to the default product SKU
   * if the cluster SKU is empty. Defaults to true.
   */
  showSku?: boolean;

  /** Show the default product manufacturer. Defaults to false. */
  showManufacturer?: boolean;

  /**
   * Show default product stock information (quantity badge).
   * Reads `defaultProduct.inventory.totalQuantity`. Defaults to true.
   */
  showStock?: boolean;

  /**
   * Show only the availability indicator (Available / Not available) inside ItemStock.
   * Only relevant when `showStock` is true.
   * Defaults to true.
   */
  showAvailability?: boolean;

  /**
   * Show the price below the product name.
   * Defaults to true.
   */
  showPrice?: boolean;

  /**
   * Label overrides forwarded to the embedded ItemStock component.
   * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
   */
  stockLabels?: Record<string, string>;

  // === Attribute labels ===

  /**
   * Attribute codes/names to look up on the default product and display as
   * badge overlays on the image. Resolved against
   * `defaultProduct.attributes.items[].attributeDescription.name`.
   * Attributes with no matching value are silently omitted.
   * Example: ['new', 'sale']
   */
  imageLabels?: string[];

  /**
   * Attribute codes/names to look up on the default product and display as
   * extra text rows below the cluster name. Resolved the same way as `imageLabels`.
   * Example: ['brand', 'color']
   */
  textLabels?: string[];

  // === Favourites ===

  /** Renders a heart-icon toggle button on the cluster image. Defaults to false. */
  enableAddFavorite?: boolean;

  /**
   * Called whenever the favourite state is toggled.
   * The second argument indicates the new state: `true` = added, `false` = removed.
   */
  onToggleFavorite?: (cluster: Cluster, isFavorite: boolean) => void;

  // === Navigation ===

  /**
   * Called when the cluster name, image, or "View cluster" button is clicked.
   * When provided, the default `<a>` navigation is prevented so the consumer
   * can use framework-specific routing (e.g. Next.js `router.push`).
   */
  onClusterClick?: (cluster: Cluster) => void;

  // === UI string overrides ===

  /**
   * Override any UI string.
   * Available keys: addToFavorites, removeFromFavorites, viewCluster,
   *                 inStock, lowStock, outOfStock
   */
  labels?: Record<string, string>;

  /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
  columns?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Configuration object passed to the component */
  configuration?: any;

  /** Include tax in the price display */
  includeTax?: boolean;

  /** Language code used to resolve localised names and slugs. Defaults to 'NL'. */
  language?: string;

  // ───── Extension API ─────
  // Per-card overrides for sub-components.
  // (No addToCartComponent — ClusterCard does not render AddToCart by default.)
  priceComponent?: Component;
  stockComponent?: Component;
  imageComponent?: Component;
  badgesComponent?: Component;
  favoriteComponent?: Component;
}
interface ClusterCardState {
  isFavorite: boolean;
  isRow: () => boolean;
  getClusterName: () => string;
  getClusterSku: () => string;
  getClusterImageUrl: () => string;
  getClusterUrl: () => string;
  getClusterShortDescription: () => string;
  getClusterManufacturer: () => string;
  getStockQuantity: () => number;
  getStockStatusLabel: () => string;
  getStockStatusClass: () => string;
  getClusterPrice: () => string;
  getLabel: (key: string, fallback: string) => string;
  handleClusterClick: (e: any) => void;
  handleToggleFavorite: (e: any) => void;
  computedImageLabels: () => string[];
  computedTextLabels: () => {
    name: string;
    value: string;
  }[];
}

const props = withDefaults(defineProps<ClusterCardProps>(), {
  showImage: true,
  showName: true,
  showSku: true,
  showPrice: true,
  showAvailability: true,
  showShortDescription: false,
  showManufacturer: false,
  showStock: false,
  enableAddFavorite: false,
});

// ───── Extension API ─────
// Resolve sub-component slots from explicit props → ProductGrid context.
const RESOLVE_SPEC: ResolveSpec<ClusterCardProps> = {
  // NOTE: includeTax is resolved separately (see `infra`/`resolvedIncludeTax`
  // below) because the infra fallback must read injected context at setup —
  // useResolvedProps runs inside a `computed` here, where inject() returns null.
  priceComponent: { grid: 'priceComponent' },
  stockComponent: { grid: 'stockComponent' },
  imageComponent: { grid: 'imageComponent' },
  badgesComponent: { grid: 'badgesComponent' },
  favoriteComponent: { grid: 'favoriteComponent' },
};

const resolved = computed(() => useResolvedProps(props, RESOLVE_SPEC));

// Resolve infra ONCE at setup (inject() is setup-only; lazy use inside a
// computed yields null). The returned proxy is reactive, so the VAT toggle
// still propagates. Effective flag: explicit prop > provider infra > false.
// Vue coerces an absent boolean prop to `false`; treat only explicit `true` as
// a host override and otherwise defer to the provider scope (VAT toggle).
const infra = useInfraProps(props);
const resolvedIncludeTax = computed<boolean>(() =>
  props.includeTax === true ? true : !!infra.includeTax,
);

const PriceImpl = computed(() => resolved.value.priceComponent ?? DefaultProductPrice);
const StockImpl = computed(() => resolved.value.stockComponent ?? DefaultItemStock);
const ImageImpl = computed(() => resolved.value.imageComponent ?? DefaultProductImage);
const BadgesImpl = computed(() => resolved.value.badgesComponent ?? DefaultProductBadges);
const FavoriteImpl = computed(() => resolved.value.favoriteComponent ?? DefaultAddToFavorite);

const isFavorite = ref<ClusterCardState["isFavorite"]>(false);

function isRow(): ReturnType<ClusterCardState["isRow"]> {
  return (props.columns as number) === 1;
}
function getClusterName(): ReturnType<ClusterCardState["getClusterName"]> {
  const lang = (props.language as string) || "NL";
  const clusterName = getLanguageString(
    (props.cluster as Cluster)?.names,
    lang,
    "",
  );
  if (clusterName) return clusterName;
  return getLanguageString(
    (props.cluster as Cluster)?.defaultProduct?.names,
    lang,
    "Cluster",
  );
}
function getClusterSku(): ReturnType<ClusterCardState["getClusterSku"]> {
  return _getClusterSku(props.cluster as Cluster);
}
function getClusterImageUrl(): ReturnType<
  ClusterCardState["getClusterImageUrl"]
> {
  return _getClusterImageUrl(props.cluster as Cluster);
}
function getClusterUrl(): ReturnType<ClusterCardState["getClusterUrl"]> {
  return props.configuration?.urls?.getClusterUrl(props.cluster, props.language) ?? "#";
}
function getClusterShortDescription(): ReturnType<
  ClusterCardState["getClusterShortDescription"]
> {
  const lang = (props.language as string) || "NL";
  const desc = getLanguageString(
    (props.cluster as Cluster)?.shortDescriptions,
    lang,
    "",
  );
  if (desc) return desc;
  return getLanguageString(
    (props.cluster as Cluster)?.defaultProduct?.shortDescriptions,
    lang,
    "",
  );
}
function getClusterManufacturer(): ReturnType<
  ClusterCardState["getClusterManufacturer"]
> {
  return (props.cluster as Cluster)?.defaultProduct?.manufacturer || "";
}
function getStockQuantity(): ReturnType<ClusterCardState["getStockQuantity"]> {
  const qty = (props.cluster as Cluster)?.defaultProduct?.inventory
    ?.totalQuantity;
  return qty !== undefined && qty !== null ? qty : -1;
}
function getStockStatusLabel(): ReturnType<
  ClusterCardState["getStockStatusLabel"]
> {
  const qty = getStockQuantity();
  if (qty < 0) return "";
  if (qty === 0) return getLabel("outOfStock", "Out of stock");
  if (qty <= 5) return getLabel("lowStock", "Low stock");
  return getLabel("inStock", "In stock");
}
function getStockStatusClass(): ReturnType<
  ClusterCardState["getStockStatusClass"]
> {
  const qty = getStockQuantity();
  if (qty <= 0) return "text-destructive bg-destructive/10";
  if (qty <= 5) return "text-warning bg-warning/10";
  return "text-success bg-success/10";
}
function getClusterPrice(): ReturnType<ClusterCardState["getClusterPrice"]> {
  if (!props.showPrice) return "";
  const priceObj = (props.cluster as Cluster)?.defaultProduct?.price;
  const useTax: boolean = resolvedIncludeTax.value;
  const value: number | undefined = useTax ? priceObj?.net : priceObj?.gross;
  if (!value && value !== 0) return "";
  return _formatPrice(Number(value), { symbol: props.currency ?? "€", locale: localeForLanguage(props.language) });
}
function getLabel(
  key: string,
  fallback: string,
): ReturnType<ClusterCardState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
function handleClusterClick(
  e: any,
): ReturnType<ClusterCardState["handleClusterClick"]> {
  if (props.onClusterClick) {
    e.preventDefault();
    props.onClusterClick(props.cluster);
  }
}
function handleToggleFavorite(
  e: any,
): ReturnType<ClusterCardState["handleToggleFavorite"]> {
  e.preventDefault();
  e.stopPropagation();
  isFavorite.value = !isFavorite.value;
  if (props.onToggleFavorite) {
    props.onToggleFavorite(props.cluster, isFavorite.value);
  }
}
function computedImageLabels(): ReturnType<
  ClusterCardState["computedImageLabels"]
> {
  if (!props.imageLabels || (props.imageLabels as string[]).length === 0)
    return [];
  const attrs =
    (props.cluster as Cluster)?.defaultProduct?.attributes?.items || [];
  return (props.imageLabels as string[])
    .map((code: string) => {
      const found = attrs.find(
        (a: AttributeResult) => a.attributeDescription?.name === code,
      );
      return found?.value?.value || "";
    })
    .filter((v: string) => v.length > 0);
}
function computedTextLabels(): ReturnType<
  ClusterCardState["computedTextLabels"]
> {
  if (!props.textLabels || (props.textLabels as string[]).length === 0)
    return [];
  const attrs =
    (props.cluster as Cluster)?.defaultProduct?.attributes?.items || [];
  return (props.textLabels as string[])
    .map((code: string) => {
      const found = attrs.find(
        (a: AttributeResult) => a.attributeDescription?.name === code,
      );
      return {
        name: code,
        value: found?.value?.value || "",
      };
    })
    .filter((item: { name: string; value: string }) => item.value.length > 0);
}
</script>
