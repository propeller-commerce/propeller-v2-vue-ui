<template>
  <div
    :data-search-bar="true"
    :class="`propeller-search-bar ${containerClassName || 'relative flex-1 max-w-2xl mx-8'}`"
    :data-open="showDropdown ? 'true' : 'false'"
  >
    <form class="propeller-search-bar__form" @submit="async (e) => handleSubmit(e)">
      <div class="propeller-search-bar__input-wrapper relative">
        <button
          type="submit"
          class="propeller-search-bar__submit absolute left-3 top-1/2 transform -translate-y-1/2 p-0 bg-transparent border-none cursor-pointer"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="propeller-search-bar__submit-icon w-5 h-5 text-foreground-subtle hover:text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg></button
        ><input
          type="search"
          autoComplete="off"
          class="propeller-search-bar__input w-full pl-10 pr-10 py-2 bg-white/95 border border-white/20 rounded-[var(--radius-container)] focus:outline-none focus:ring-2 focus:ring-secondary placeholder:text-muted-foreground"
          :placeholder="placeholder"
          :value="searchTerm"
          @input="async (e) => handleInputChange((e.target as HTMLInputElement).value)"
        />
        <template v-if="isLoading">
          <div class="propeller-search-bar__spinner-wrapper absolute right-3 top-1/2 transform -translate-y-1/2">
            <div class="propeller-search-bar__spinner animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        </template>
      </div>
    </form>
    <template v-if="showDropdown">
      <div
        class="propeller-search-bar__dropdown absolute top-full left-0 right-0 mt-2 bg-card rounded-[var(--radius-container)] shadow-xl border z-50 flex flex-col max-h-96"
      >
        <template v-if="results.length > 0">
          <div class="propeller-search-bar__results flex-1 overflow-y-auto">
            <template :key="result.id + '-' + index" v-for="(result, index) in results">
              <component
                :is="props.getResultHref ? 'a' : 'div'"
                :href="props.getResultHref ? props.getResultHref(result) : undefined"
                class="propeller-search-bar__result flex items-center gap-4 p-3 hover:bg-surface-hover cursor-pointer border-b border-border last:border-b-0"
                @click="(event: MouseEvent) => handleResultAnchorClick(event, result)"
              >
                <template v-if="result.imageUrl || noImageUrl">
                  <div class="propeller-search-bar__result-media relative w-16 h-16 flex-shrink-0">
                    <img
                      class="propeller-search-bar__result-image w-full h-full object-contain"
                      :src="result.imageUrl || noImageUrl"
                      :alt="result.name"
                    />
                  </div>
                </template>

                <div class="flex-1 min-w-0">
                  <div class="propeller-search-bar__result-name font-semibold truncate">{{ result.name }}</div>
                  <template v-if="result.sku">
                    <div class="propeller-search-bar__result-sku text-sm text-muted-foreground">SKU: {{ result.sku }}</div>
                  </template>
                </div>
                <!-- Custom price cell via the scoped #price slot (e.g. a
                     "Price by quotation" label); otherwise the default price,
                     which `showPrice: false` hides entirely. -->
                <slot
                  v-if="$slots.price"
                  name="price"
                  :result="result"
                />
                <template v-else-if="showPrice !== false && result.price !== undefined && result.price !== null">
                  <div class="propeller-search-bar__result-price text-sm font-semibold text-foreground flex-shrink-0 text-right">
                    <span class="propeller-search-bar__result-price-value">{{ formatItemPrice(leadingPrice(result)) }}</span>
                    <span class="propeller-search-bar__result-price-label block text-xs font-normal text-muted-foreground">{{ priceTaxLabel() }}</span>
                  </div>
                </template>
              </component>
            </template>
          </div>

          <template v-if="itemsFound > results.length">
            <a
              v-if="props.getViewAllHref"
              :href="props.getViewAllHref(searchTerm)"
              class="propeller-search-bar__view-all block flex-shrink-0 p-3 text-center text-primary hover:bg-primary/5 cursor-pointer font-semibold border-t border-border bg-card rounded-b-[var(--radius-container)]"
              @click="handleViewAllAnchorClick"
            >
              {{ getLabel('viewAll', 'View all results') }} ({{ itemsFound }})
            </a>
            <button
              v-else
              type="button"
              class="propeller-search-bar__view-all block w-full flex-shrink-0 p-3 text-center text-primary hover:bg-primary/5 cursor-pointer font-semibold border-t border-border bg-card rounded-b-[var(--radius-container)]"
              @click="handleViewAllClick"
            >
              {{ getLabel('viewAll', 'View all results') }} ({{ itemsFound }})
            </button>
          </template>
        </template>

        <template v-if="results.length === 0 && searchTerm.length >= minLength && !isLoading">
          <div class="propeller-search-bar__empty p-4 text-center text-muted-foreground">
            {{ getLabel('noResults', 'No products found for') }} &quot;{{ searchTerm }}&quot;
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
} from '@propeller-commerce/propeller-sdk-v2';
import { useProductSearch } from '../composables/vue/useProductSearch';
import { getLabel as _getLabel, getLanguageString } from '@propeller-commerce/propeller-v2-core-ui';
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';
// No host-config import: result URLs are built from the `configuration`
// prop's url builders when supplied, else a plain /product|/cluster path.

export interface SearchBarResult {
  /** Unique identifier */
  id: number | string;
  /** Display name */
  name: string;
  /** SKU code */
  sku?: string;
  /**
   * Leading price value (kept for back-compat). Populated with the net or gross
   * amount per the active toggle — see `priceNet`/`priceGross` for both values.
   */
  price?: number;
  /** Tax-inclusive price (SDK `price.net`). */
  priceNet?: number;
  /** Tax-exclusive price (SDK `price.gross`). */
  priceGross?: number;
  /** Image URL */
  imageUrl?: string;
  /** URL path to navigate to */
  url?: string;
  /** Whether this is a cluster (vs product) */
  isCluster?: boolean;
}
export interface SearchBarProps {
  /** Propeller SDK GraphQL client. Resolved from PropellerProvider when omitted. */
  graphqlClient?: GraphQLClient;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /** The currently logged in user (Contact or Customer) */
  user?: Contact | Customer | null;

  /** Language code for search requests */
  language?: string;

  /** Placeholder text for the search input */
  placeholder?: string;

  /** Minimum characters before search triggers */
  minSearchLength?: number;

  /** Debounce delay in milliseconds */
  debounceMs?: number;

  /** Maximum number of results to show in dropdown */
  maxResults?: number;

  /** Fallback image URL when product has no image */
  noImageUrl?: string;

  /** Fires when the search form is submitted (Enter key). Receives the search term. */
  onSubmit?: (term: string) => void;

  /** Fires when a result item is clicked. Receives the result object. */
  onResultClick?: (result: SearchBarResult) => void;

  /** Fires when "View all results" is clicked. Receives the search term. */
  onViewAllClick?: (term: string) => void;

  /**
   * Build the destination URL for a result item. When provided, each result
   * renders as a real `<a href>` (middle-clickable, new-tab, crawlable) while
   * `onResultClick` still fires for SPA navigation. Omit to keep the
   * div-based fallback.
   */
  getResultHref?: (result: SearchBarResult) => string;

  /**
   * Build the destination URL for the "View all results" CTA. When provided,
   * the CTA renders as a real `<a href>` (middle-clickable, new-tab, crawlable,
   * keyboard-focusable) while `onViewAllClick` still fires for SPA navigation.
   * Omit to keep the button fallback.
   */
  getViewAllHref?: (term: string) => string;

  /**
   * Show the price column on each autosuggest result. Defaults to `true`.
   * Set `false` to hide prices entirely in the dropdown — e.g. a B2B
   * contract-catalogue context where prices are quote-only and shouldn't
   * appear in the live preview. Ignored when the `price` slot is provided.
   *
   * For custom per-result price content (e.g. a "Price by quotation" label),
   * use the scoped `#price` slot instead — it receives `{ result }` and fully
   * overrides the default price cell.
   */
  showPrice?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /**
   * When true, the tax-inclusive (net) price leads; false shows tax-exclusive
   * (gross). SDK mapping: `price.net` = incl. VAT, `price.gross` = excl. VAT.
   * Resolved from `<PropellerProvider>` when omitted; defaults to `false`.
   */
  includeTax?: boolean;

  /**
   * Labels for the incl./excl. price suffix. Keys: `inclTax`, `exclTax`.
   * Falls back to English 'incl. VAT' / 'excl. VAT'.
   */
  priceLabels?: Record<string, string>;

  /** Additional class name for the container */
  containerClassName?: string;

  /** Tax zone used for price calculation. Defaults to 'NL'. */
  taxZone?: string;

  /**
   * Active company ID from the company switcher.
   * When provided, can be forwarded to price calculation in search results
   * if the underlying SDK call supports priceCalculateProductInput.
   */
  companyId?: number;

  /** Scope the autosuggest fetch to specific orderlist IDs (e.g. a chosen B2B contract). */
  orderlistIds?: number[];

  /**
   * Apply the orderlist filter. Defaults to `true` when `orderlistIds` is
   * non-empty, `false` otherwise — so an authenticated user without a contract
   * still sees the full catalogue.
   */
  applyOrderlists?: boolean;

  /** Attribute names to request per product, e.g. `['MPN']`. See ProductGrid. */
  productTrackAttributes?: string[];

  /**
   * Configuration object providing:
   *   imageSearchFiltersGrid, imageVariantFiltersMedium — passed to CategoryService
   *   baseCategoryId — used when querying by term or brand
   *   urls.getProductUrl / urls.getClusterUrl — for card URL generation
   */
  configuration?: any;

  /**
   * Bump this counter to clear the search input from outside (e.g. on route
   * change). Each unique value triggers a one-time reset of the local term.
   */
  clearSignal?: number;
}
interface SearchBarState {
  searchTerm: string;
  results: SearchBarResult[];
  isLoading: boolean;
  showDropdown: boolean;
  itemsFound: number;
  debounceTimer: any;
  clickOutsideListener: {
    fn: ((e: MouseEvent) => void) | null;
  };
  placeholder: string;
  minLength: number;
  debounceMs: number;
  maxResults: number;
  noImageUrl: string;
  getLabel: (key: string, fallback: string) => string;
  formatItemPrice: (price: number) => string;
  mapProductToResult: (item: Product | Cluster) => SearchBarResult;
  handleInputChange: (value: string) => void;
  fetchResults: (term: string) => Promise<void>;
  handleSubmit: (e: any) => void;
  handleResultClick: (result: SearchBarResult) => void;
  handleViewAllClick: () => void;
}

const props = defineProps<SearchBarProps>();
const infra = useInfraProps(props);

const userRef = computed(() => (infra.user ?? null) as Contact | Customer | null);
const companyRef = computed(() => infra.companyId);
const orderlistIdsRef = computed(() => props.orderlistIds);
const applyOrderlistsRef = computed(() => props.applyOrderlists);
const productTrackAttributesRef = computed(() => props.productTrackAttributes);

const { search, searchResults, searchItemsFound, searchLoading } = useProductSearch({
  graphqlClient: infra.graphqlClient,
  language: computed(() => infra.language || 'NL'),
  configuration: infra.configuration || {},
  // `user` supplies userId/contactId/customerId to the autosuggest query.
  // Without it the dropdown's results diverge from the grid's: orderlist
  // scoping is driven by userId, so `orderlistIds` alone is ignored by the
  // backend and the dropdown shows the whole catalogue while the grid below
  // shows only the contract's products.
  user: userRef,
  companyId: companyRef,
  orderlistIds: orderlistIdsRef,
  applyOrderlists: applyOrderlistsRef,
  productTrackAttributes: productTrackAttributesRef,
});

const searchTerm = ref<SearchBarState['searchTerm']>('');
const results = ref<SearchBarState['results']>([]);
const isLoading = searchLoading;
const showDropdown = ref<SearchBarState['showDropdown']>(false);
const itemsFound = ref<SearchBarState['itemsFound']>(0);
const clickOutsideListener = ref<SearchBarState['clickOutsideListener']>({
  fn: null as any,
});

onMounted(() => {
  const listener = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && !target.closest('[data-search-bar]')) {
      showDropdown.value = false;
    }
  };
  clickOutsideListener.value = {
    fn: listener,
  };
  document.addEventListener('mousedown', listener);
});
onUnmounted(() => {
  if (clickOutsideListener.value.fn) {
    document.removeEventListener('mousedown', clickOutsideListener.value.fn);
  }
});
const placeholder = computed(() => {
  return props.placeholder || 'Search products...';
});
const minLength = computed(() => {
  return props.minSearchLength !== undefined ? props.minSearchLength : 3;
});
const maxResults = computed(() => {
  return props.maxResults !== undefined ? props.maxResults : 8;
});
const noImageUrl = computed(() => {
  return props.noImageUrl || '';
});

// Sync composable search results into local mapped results + dropdown state
watch(searchResults, (rawItems) => {
  const mapped: SearchBarResult[] = [];
  const limit = maxResults.value;
  for (let i = 0; i < rawItems.length && i < limit; i++) {
    mapped.push(mapProductToResult(rawItems[i] as Product | Cluster));
  }
  results.value = mapped;
  showDropdown.value = mapped.length > 0 || searchTerm.value.length >= minLength.value;
});

watch(searchItemsFound, (total) => {
  itemsFound.value = total;
});

// Parents bump `clearSignal` (e.g. on route change) to reset the input. We
// also stop any in-flight search and close the dropdown.
watch(
  () => props.clearSignal,
  () => {
    searchTerm.value = '';
    results.value = [];
    showDropdown.value = false;
    search('');
  },
);

function getLabel(key: string, fallback: string): ReturnType<SearchBarState['getLabel']> {
  return _getLabel(props.labels, key, fallback);
}
function formatItemPrice(price: number): ReturnType<SearchBarState['formatItemPrice']> {
  if (props.formatPrice) {
    return props.formatPrice(price);
  }
  return _formatPrice(price || 0, { symbol: infra.currency ?? '€' });
}
// Match ProductPrice: the toggle picks which value leads. SDK mapping —
// net = incl. VAT, gross = excl. VAT. Default (includeTax undefined) is excl.
const useTax = computed(() => !!infra.includeTax);
function leadingPrice(result: SearchBarResult): number {
  return useTax.value
    ? result.priceNet ?? result.price ?? 0
    : result.priceGross ?? result.price ?? 0;
}
function priceTaxLabel(): string {
  return useTax.value
    ? _getLabel(props.priceLabels, 'inclTax', 'incl. VAT')
    : _getLabel(props.priceLabels, 'exclTax', 'excl. VAT');
}
function mapProductToResult(
  item: Product | Cluster
): ReturnType<SearchBarState['mapProductToResult']> {
  const isCluster = 'clusterId' in item;
  const displayItem = isCluster ? (item as Cluster).defaultProduct : item;
  const id = isCluster ? (item as Cluster).clusterId : (item as Product).productId;
  // `slugs[0]` is the catalog default language; the result's name
  // below is already resolved by language.
  const slug = getLanguageString(item.slugs, infra.language || 'NL', '');
  // Prefer the consumer-supplied url builders from `configuration.urls`
  // (which can language-prefix, etc.); fall back to a plain path.
  const urls = (infra.configuration as { urls?: Record<string, unknown> } | undefined)?.urls;
  const builder = isCluster ? urls?.getClusterUrl : urls?.getProductUrl;
  const url =
    typeof builder === 'function'
      ? (builder as (it: unknown, lang?: string) => string)(item, infra.language)
      : isCluster
        ? '/cluster/' + id + '/' + slug
        : '/product/' + id + '/' + slug;
  const priceNet = displayItem?.price?.net || 0;
  const priceGross = displayItem?.price?.gross || 0;
  // Prefer the name in the active language; fall back to the first available.
  // The backend search doesn't language-filter, so a product may carry names in
  // several languages — without this the row could show the wrong-language name
  // (e.g. FR while EN is selected).
  const lang = infra.language;
  const localizedName =
    (lang && item.names?.find((n: { language?: string }) => n.language === lang)?.value) ||
    getLanguageString(item.names, infra.language || "NL") ||
    'Product';
  return {
    id: id,
    name: localizedName,
    sku: item.sku || displayItem?.sku || '',
    // `price` stays gross for back-compat; the row picks net/gross per toggle.
    price: priceGross,
    priceNet: priceNet,
    priceGross: priceGross,
    imageUrl: displayItem?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '',
    url: url,
    isCluster: isCluster,
  } as SearchBarResult;
}
function handleInputChange(value: string): ReturnType<SearchBarState['handleInputChange']> {
  searchTerm.value = value;
  if (value.length < minLength.value) {
    results.value = [];
    showDropdown.value = false;
    return;
  }
  // Delegate debouncing + fetching to composable
  search(value);
}
function handleSubmit(e: any): ReturnType<SearchBarState['handleSubmit']> {
  e.preventDefault();
  const term = searchTerm.value.trim();
  if (props.onSubmit) {
    props.onSubmit(term);
    showDropdown.value = false;
  }
}
function handleResultClick(
  result: SearchBarResult
): ReturnType<SearchBarState['handleResultClick']> {
  if (props.onResultClick) {
    props.onResultClick(result);
  }
  showDropdown.value = false;
  searchTerm.value = '';
}
function handleViewAllClick(): ReturnType<SearchBarState['handleViewAllClick']> {
  if (props.onViewAllClick) {
    props.onViewAllClick(searchTerm.value);
  }
  showDropdown.value = false;
}

// True when a click should be left to the browser (open in new tab/window)
// instead of intercepted for SPA navigation.
function isModifiedClick(event: MouseEvent): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

// Result rows render as <a href> when getResultHref is set. Intercept plain
// clicks for SPA nav; let modified clicks open natively.
function handleResultAnchorClick(event: MouseEvent, result: SearchBarResult): void {
  if (props.getResultHref) {
    if (isModifiedClick(event)) return;
    event.preventDefault();
  }
  handleResultClick(result);
}

// "View all" renders as <a href> when getViewAllHref is set — same guard.
function handleViewAllAnchorClick(event: MouseEvent): void {
  if (isModifiedClick(event)) return;
  event.preventDefault();
  handleViewAllClick();
}
</script>
