/**
 * useProductSearch (Vue) — Product fetching, filtering, race condition prevention.
 *
 * Covers: ProductGrid, GridFilters, GridToolbar, SearchBar components.
 *
 * Responsibilities:
 * - CategoryService query building
 * - Race condition prevention (fetchId counter)
 * - Language-based product filtering (untranslated excluded)
 * - Dual-mode: controlled (external products prop) vs uncontrolled (internal fetch)
 * - Sort, page size, text filters, price range, pagination
 * - Debounced search bar (300ms)
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { CategoryService, ProductSearchableField, ProductSortField, ProductStatus, SortOrder } from '@propeller-commerce/propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  ProductsResponse,
  AttributeFilter,
  ProductTextFilterInput,
  Category,
  CategoryQueryVariables,
  CategoryProductSearchInput,
  ProductSortInput,
  SearchFieldsInput,
  ProductPriceFilterInput,
  PriceCalculateProductInput,
  FilterAvailableAttributeInput,
  MediaImageProductSearchInput,
  TransformationsInput,
  ProductsQueryVariables,
  ProductSearchInput,
  AttributeResultSearchInput,
} from '@propeller-commerce/propeller-sdk-v2';
import { usePagination } from '../shared/usePagination';
import { createServices, buildInventoryFilter, type Availability } from '@propeller-commerce/propeller-v2-core-ui';
import { resolveListingUserId } from '../shared/utils/listingUserId';

/** `productTrackAttributes` → the query's attribute input. Undefined when empty. */
function buildAttributeInput(names?: string[]): AttributeResultSearchInput | undefined {
  if (!names || names.length === 0) return undefined;
  return { attributeDescription: { names } } as AttributeResultSearchInput;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseProductSearchOptions {
  graphqlClient?: GraphQLClient;
  /** Controlled mode: pass products in, skip internal fetch */
  products?: Ref<(Product | Cluster)[] | undefined>;
  categoryId?: Ref<number | undefined>;
  term?: Ref<string | undefined>;
  brand?: Ref<string | undefined>;
  language?: Ref<string>;
  taxZone?: string;
  user?: Ref<Contact | Customer | null>;
  companyId?: Ref<number | undefined>;
  /** Scope the product fetch to specific orderlist IDs (e.g. a chosen B2B contract). */
  orderlistIds?: Ref<number[] | undefined>;
  /**
   * Apply the orderlist filter. Defaults to `true` when `orderlistIds` is
   * non-empty, `false` otherwise — so an authenticated user without a contract
   * still sees the full catalogue.
   */
  applyOrderlists?: Ref<boolean | undefined>;
  /**
   * Attribute names to request per product, e.g. `['MPN']`. Unset returns the
   * first page of ALL attributes (12 per product), so products with more than
   * 12 silently lose the rest — name what you render.
   */
  productTrackAttributes?: Ref<string[] | undefined>;
  textFilters?: Ref<ProductTextFilterInput[] | undefined>;
  priceFilterMin?: Ref<number | undefined>;
  priceFilterMax?: Ref<number | undefined>;
  /**
   * Stock selection to filter by. `'all'` or unset sends no stock filter.
   * Filtering happens server-side, so `itemsFound` and the page count
   * describe the filtered set.
   */
  availability?: Ref<Availability | undefined>;
  /** Minimum stock quantity for the `'in-stock'` selection. */
  minStock?: Ref<number | undefined>;
  sortField?: Ref<string | undefined>;
  sortOrder?: Ref<string | undefined>;
  page?: Ref<number | undefined>;
  pageSize?: Ref<number>;
  configuration: {
    baseCategoryId?: number;
    /** The channel's anonymous user — logged-out listings are scoped to it. */
    anonymousUserId?: number;
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersMedium?: TransformationsInput;
  };
  onFiltersChange?: (filters: AttributeFilter[]) => void;
  onPriceBoundsChange?: (min: number, max: number) => void;
  onItemsFoundChange?: (count: number) => void;
  onPageChange?: (page: number) => void;
  onProductsResponse?: (products: ProductsResponse) => void;
  onCategoryChange?: (category: Category) => void;
}

export interface UseProductSearchReturn {
  displayProducts: ComputedRef<(Product | Cluster)[]>;
  itemsFound: Ref<number>;
  isLoading: ComputedRef<boolean>;
  currentSortField: Ref<string>;
  currentSortOrder: Ref<string>;
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  // Search bar
  searchTerm: Ref<string>;
  searchResults: Ref<(Product | Cluster)[]>;
  searchItemsFound: Ref<number>;
  searchLoading: Ref<boolean>;
  // Actions
  fetchProducts: () => Promise<void>;
  search: (term: string) => void;
  goToPage: (page: number) => void;
}

export function useProductSearch(options: UseProductSearchOptions): UseProductSearchReturn {
  const {
    graphqlClient,
    configuration,
    onFiltersChange,
    onPriceBoundsChange,
    onItemsFoundChange,
    onProductsResponse,
    onCategoryChange,
  } = options;

  const languageRef = options.language ?? ref('NL');
  const taxZone = options.taxZone || 'NL';
  const textFiltersRef = options.textFilters ?? ref<ProductTextFilterInput[] | undefined>(undefined);
  const priceMinRef = options.priceFilterMin ?? ref<number | undefined>(undefined);
  const priceMaxRef = options.priceFilterMax ?? ref<number | undefined>(undefined);
  const availabilityRef = options.availability ?? ref<Availability | undefined>(undefined);
  const minStockRef = options.minStock ?? ref<number | undefined>(undefined);
  const sortFieldRef = options.sortField ?? ref<string | undefined>(undefined);
  const sortOrderRef = options.sortOrder ?? ref<string | undefined>(undefined);
  const pageSizeRef = options.pageSize ?? ref(12);
  const userRef = options.user ?? ref(null);
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);

  // ── Internal state ────────────────────────────────────────────────────────
  const internalProducts = ref<(Product | Cluster)[]>([]) as Ref<(Product | Cluster)[]>;
  const internalLoading = ref(false);
  let fetchId = 0;

  // Search bar state
  const searchTerm = ref('');
  const searchResults = ref<(Product | Cluster)[]>([]) as Ref<(Product | Cluster)[]>;
  const searchItemsFound = ref(0);
  const searchLoading = ref(false);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  const pagination = usePagination(pageSizeRef.value);

  // Controlled vs uncontrolled — check the ref's VALUE, not the ref object itself.
  // ProductGrid always passes a computed ref (even when props.products is undefined),
  // so checking options.products !== undefined is always true and would break fetching.
  const isControlled = computed(() => options.products?.value !== undefined);

  const displayProducts = computed<(Product | Cluster)[]>(() => {
    if (isControlled.value) return options.products!.value ?? [];
    return internalProducts.value;
  });

  const isLoading = computed(() => !isControlled.value && internalLoading.value);

  const itemsFound = ref(0);
  const currentSortField = ref(options.sortField?.value ?? ProductSortField.RELEVANCE);
  const currentSortOrder = ref(options.sortOrder?.value ?? 'DESC');

  // ── Language filter ───────────────────────────────────────────────────────

  function filterByLanguage(products: (Product | Cluster)[], lang: string): (Product | Cluster)[] {
    if (!lang) return products;
    return products.filter((p) => {
      const names = (p as Product).names || (p as Cluster).names || [];
      if (!names || names.length === 0) return true;
      return names.some((n: { language?: string }) => n.language === lang);
    });
  }

  // ── Fetch products ────────────────────────────────────────────────────────

  async function fetchProducts(): Promise<void> {
    if (!graphqlClient || isControlled.value) return;

    // Bail out when nothing to fetch: no categoryId, term, or brand.
    // This prevents components like SearchBar (which only use `search()`) from
    // triggering a spurious category fetch on mount via the baseCategoryId fallback.
    if (!options.categoryId?.value && !options.term?.value && !options.brand?.value) return;

    const thisId = ++fetchId;
    internalLoading.value = true;

    try {
      const service = createServices(graphqlClient).category;
      const lang = languageRef.value || 'NL';
      const isWideSearch = !!(options.term?.value) || !!(options.brand?.value);
      const catId = isWideSearch
        ? (configuration?.baseCategoryId ?? 0)
        : (options.categoryId?.value ?? configuration?.baseCategoryId ?? 0);

      if (!catId) return;

      const activeSortField = (sortFieldRef.value ?? currentSortField.value) as ProductSortField;
      const activeSortOrder = (sortOrderRef.value ?? currentSortOrder.value) as SortOrder;

      // Build sort inputs
      const sortInputs: ProductSortInput[] = activeSortField
        ? [{ field: activeSortField, order: activeSortOrder }]
        : [];

      // Build search fields with boost when searching by term
      const searchFields: SearchFieldsInput[] = options.term?.value
        ? [
            {
              fieldNames: [
                ProductSearchableField.NAME,
                ProductSearchableField.KEYWORDS,
                ProductSearchableField.SKU,
                ProductSearchableField.CUSTOM_KEYWORDS,
              ],
              boost: 5,
            },
            {
              fieldNames: [
                ProductSearchableField.DESCRIPTION,
                ProductSearchableField.MANUFACTURER,
                ProductSearchableField.MANUFACTURER_CODE,
                ProductSearchableField.EAN_CODE,
                ProductSearchableField.BAR_CODE,
                ProductSearchableField.CLUSTER_ID,
                ProductSearchableField.CUSTOM_KEYWORDS,
                ProductSearchableField.PRODUCT_ID,
                ProductSearchableField.SHORT_DESCRIPTION,
                ProductSearchableField.SUPPLIER,
                ProductSearchableField.SUPPLIER_CODE,
              ],
              boost: 1,
            },
          ]
        : [];

      // Build price filter
      const priceFilter: ProductPriceFilterInput | undefined =
        priceMinRef.value !== undefined || priceMaxRef.value !== undefined
          ? { from: priceMinRef.value ?? 0, to: priceMaxRef.value ?? 999999 }
          : undefined;

      const inventoryFilter = buildInventoryFilter(availabilityRef.value, minStockRef.value);

      // Resolve user IDs
      const user = userRef.value;
      const userId = resolveListingUserId(user, configuration);

      const contactId: number | undefined =
        user && 'contactId' in user ? (user as Contact).contactId : undefined;

      const customerId: number | undefined =
        user && 'customerId' in user ? (user as Customer).customerId : undefined;

      // Orderlist (contract) scoping. When orderlistIds are supplied, apply them
      // (unless explicitly disabled); otherwise send applyOrderlists:false so an
      // authenticated user without a contract still sees the full catalogue.
      // `applyOrderlists`/`orderlistIds` are accepted by the backend but not yet
      // present on the SDK's CategoryProductSearchInput type — cast to include them.
      const orderlistIdsVal = options.orderlistIds?.value;
      const orderlistScope =
        orderlistIdsVal && orderlistIdsVal.length > 0
          ? {
              applyOrderlists: options.applyOrderlists?.value !== false,
              orderlistIds: orderlistIdsVal,
            }
          : { applyOrderlists: false };

      const categoryProductSearchInput = {
        language: lang,
        page: pagination.currentPage.value,
        offset: pageSizeRef.value,
        statuses: [
          ProductStatus.A,
          ProductStatus.P,
          ProductStatus.T,
          ProductStatus.S,
        ],
        hidden: false,
        ...(options.term?.value && { term: options.term.value, searchFields }),
        ...(options.brand?.value && { manufacturers: [options.brand.value] }),
        ...(textFiltersRef.value?.length && { textFilters: textFiltersRef.value }),
        ...(priceFilter && { price: priceFilter }),
        ...(inventoryFilter && { inventory: inventoryFilter }),
        ...(sortInputs.length && { sortInputs }),
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(userId !== undefined && { userId }),
        ...orderlistScope,
      } as CategoryProductSearchInput & {
        applyOrderlists?: boolean;
        orderlistIds?: number[];
      };

      const priceCalculateProductInput: PriceCalculateProductInput = {
        taxZone,
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(contactId !== undefined && { contactId }),
        ...(customerId !== undefined && { customerId }),
      };

      const filterAvailableAttributeInput: FilterAvailableAttributeInput = {
        isSearchable: true,
      };

      const attributeInput = buildAttributeInput(options.productTrackAttributes?.value);

      const variables: CategoryQueryVariables = {
        categoryId: catId,
        language: lang,
        categoryProductSearchInput,
        priceCalculateProductInput,
        filterAvailableAttributeInput,
        imageSearchFilters: configuration?.imageSearchFiltersGrid,
        imageVariantFilters: configuration?.imageVariantFiltersMedium,
        ...(attributeInput && { attributeResultSearchInput: attributeInput }),
      };

      const response = await service.getCategory(variables);

      // Ignore stale responses
      if (thisId !== fetchId) return;

      const productsResponse = response?.products as ProductsResponse | undefined;
      const rawProducts = (productsResponse?.items ?? []) as (Product | Cluster)[];
      const filtered = filterByLanguage(rawProducts, lang);

      internalProducts.value = filtered;

      const untranslatedCount = rawProducts.length - filtered.length;
      const apiTotal = productsResponse?.itemsFound ?? rawProducts.length;
      const found = Math.max(0, apiTotal - untranslatedCount);

      itemsFound.value = found;
      onItemsFoundChange?.(found);

      if (productsResponse) {
        pagination.setFromResponse({
          itemsFound: found,
          pages: productsResponse.pages ?? 1,
          offset: productsResponse.offset ?? pageSizeRef.value,
        });
        onProductsResponse?.(productsResponse);
      }

      if (productsResponse?.filters) {
        onFiltersChange?.(productsResponse.filters);
      }

      // Price-slider bounds. The API's aggregated `minPrice`/`maxPrice` are
      // populated for anonymous catalog reads, but come back as 0 for a
      // logged-in (contact/company-priced) request — which would make the slider
      // fall back to a bogus 9999 cap. When the aggregate max is missing or 0,
      // derive the bounds from the resolved per-item prices in THIS result set
      // instead (the items carry the contact price). Uses `gross` (the catalog
      // filter scale; same field the API aggregate reflects), falling back to
      // `net`. Note: derived bounds reflect the current result page, not the
      // whole catalog — but that is strictly better than no/9999 bound, and the
      // anonymous path still uses the true catalog aggregate.
      const aggMin = productsResponse?.minPrice;
      const aggMax = productsResponse?.maxPrice;
      if (aggMax !== undefined && aggMax > 0) {
        onPriceBoundsChange?.(aggMin ?? 0, aggMax);
      } else {
        const prices = ((productsResponse?.items ?? []) as Product[])
          .map((p) => (p?.price?.gross ?? p?.price?.net))
          .filter((n): n is number => typeof n === 'number' && n > 0);
        if (prices.length) {
          onPriceBoundsChange?.(Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices)));
        }
      }

      if (response) {
        onCategoryChange?.(response as Category);
      }
    } catch (e) {
      console.error('[useProductSearch] fetchProducts error:', e);
      if (thisId === fetchId) internalProducts.value = [];
    } finally {
      if (thisId === fetchId) internalLoading.value = false;
    }
  }

  // ── Search bar (debounced, 300ms) ─────────────────────────────────────────

  function search(term: string): void {
    searchTerm.value = term;
    if (searchTimer) clearTimeout(searchTimer);
    if (!term.trim()) {
      searchResults.value = [];
      searchItemsFound.value = 0;
      return;
    }
    searchTimer = setTimeout(async () => {
      if (!graphqlClient) return;
      searchLoading.value = true;
      try {
        const lang = languageRef.value || 'NL';
        // Route the autosuggest through the SAME category term-search the grid
        // uses (`getCategory` over the base category), NOT the flat
        // `getProducts` search. Orderlist (contract) scoping is honoured by the
        // `category.products` resolver but NOT by the flat `products` resolver —
        // sending orderlistIds on a ProductSearchInput is silently ignored
        // server-side, so the preview leaked the full catalogue while the grid
        // (and the submitted results) stayed contract-scoped. Using the category
        // path makes the preview and the grid agree.
        const service = createServices(graphqlClient).category;
        const catId = configuration?.baseCategoryId ?? 0;
        if (!catId) {
          searchResults.value = [];
          searchItemsFound.value = 0;
          return;
        }

        // When orderlistIds are supplied, apply them (unless explicitly
        // disabled); otherwise send applyOrderlists:false so an authed user
        // without a contract still previews the full catalogue.
        const searchOrderlistIds = options.orderlistIds?.value;
        const orderlistScope =
          searchOrderlistIds && searchOrderlistIds.length > 0
            ? {
                applyOrderlists: options.applyOrderlists?.value !== false,
                orderlistIds: searchOrderlistIds,
              }
            : { applyOrderlists: false };

        const user = userRef.value;
        const userId = resolveListingUserId(user, configuration);
        const contactId: number | undefined =
          user && 'contactId' in user ? (user as Contact).contactId : undefined;
        const customerId: number | undefined =
          user && 'customerId' in user ? (user as Customer).customerId : undefined;

        const inventoryFilter = buildInventoryFilter(availabilityRef.value, minStockRef.value);

        const categoryProductSearchInput = {
          language: lang,
          page: 1,
          offset: 10,
          statuses: [
            ProductStatus.A,
            ProductStatus.P,
            ProductStatus.T,
            ProductStatus.S,
          ],
          hidden: false,
          ...(inventoryFilter && { inventory: inventoryFilter }),
          term,
          searchFields: [
            {
              fieldNames: [
                ProductSearchableField.NAME,
                ProductSearchableField.KEYWORDS,
                ProductSearchableField.SKU,
                ProductSearchableField.CUSTOM_KEYWORDS,
              ],
              boost: 5,
            },
            {
              fieldNames: [
                ProductSearchableField.DESCRIPTION,
                ProductSearchableField.MANUFACTURER,
                ProductSearchableField.MANUFACTURER_CODE,
                ProductSearchableField.EAN_CODE,
                ProductSearchableField.BAR_CODE,
                ProductSearchableField.CLUSTER_ID,
                ProductSearchableField.CUSTOM_KEYWORDS,
                ProductSearchableField.PRODUCT_ID,
                ProductSearchableField.SHORT_DESCRIPTION,
                ProductSearchableField.SUPPLIER,
                ProductSearchableField.SUPPLIER_CODE,
              ],
              boost: 1,
            },
          ],
          sortInputs: [{ field: ProductSortField.RELEVANCE, order: SortOrder.DESC }],
          ...(companyIdRef.value && { companyId: companyIdRef.value }),
          ...(userId !== undefined && { userId }),
          ...orderlistScope,
        } as CategoryProductSearchInput & {
          applyOrderlists?: boolean;
          orderlistIds?: number[];
        };

        const priceCalculateProductInput: PriceCalculateProductInput = {
          taxZone,
          ...(companyIdRef.value && { companyId: companyIdRef.value }),
          ...(contactId !== undefined && { contactId }),
          ...(customerId !== undefined && { customerId }),
        };

        const attributeInput = buildAttributeInput(options.productTrackAttributes?.value);

        const variables: CategoryQueryVariables = {
          categoryId: catId,
          language: lang,
          categoryProductSearchInput,
          priceCalculateProductInput,
          imageSearchFilters: configuration?.imageSearchFiltersGrid,
          imageVariantFilters: configuration?.imageVariantFiltersMedium as TransformationsInput,
          ...(attributeInput && { attributeResultSearchInput: attributeInput }),
        };

        const response = await service.getCategory(variables);
        const productsResponse = response?.products as ProductsResponse | undefined;
        const rawItems = (productsResponse?.items ?? []) as (Product | Cluster)[];
        // Drop products with no name in the active language — same as the grid
        // (`fetchProducts`), so the preview shows EN results under EN instead of
        // leaking other-language variants. Adjust the total by the dropped count.
        const items = filterByLanguage(rawItems, lang);
        const untranslated = rawItems.length - items.length;
        const apiTotal = productsResponse?.itemsFound ?? rawItems.length;
        searchResults.value = items;
        searchItemsFound.value = Math.max(0, apiTotal - untranslated);
      } catch {
        searchResults.value = [];
        searchItemsFound.value = 0;
      } finally {
        searchLoading.value = false;
      }
    }, 300);
  }

  // ── Watchers ──────────────────────────────────────────────────────────────

  // Sync externally-controlled page prop → internal pagination
  if (options.page) {
    watch(options.page, (newPage) => {
      if (newPage !== undefined && newPage !== pagination.currentPage.value) {
        pagination.currentPage.value = newPage;
      }
    });
  }

  watch(
    [
      () => options.categoryId?.value,
      () => options.term?.value,
      () => options.brand?.value,
      languageRef,
      textFiltersRef,
      priceMinRef,
      priceMaxRef,
      availabilityRef,
      minStockRef,
      sortFieldRef,
      sortOrderRef,
      pageSizeRef,
      companyIdRef,
      userRef,
      pagination.currentPage,
      // Joined: callers pass an array literal, so its identity changes each render.
      () => (options.productTrackAttributes?.value ?? []).join(','),
      // Track the controlled flag so a parent that flips OUT of controlled
      // mode (e.g. on SPA navigation between categories, when the new route
      // has no SSR seed and the boilerplate sets :products="undefined")
      // re-fires this watcher with the new uncontrolled state. Without this
      // dependency, the watcher had already fired when `categoryId` updated
      // but bailed because `isControlled.value` was still `true` from the
      // previous route; once the parent flipped controlled mode off, no
      // input the watcher tracks had changed again, so the fetch that
      // should run for the new category never started — the grid stayed
      // stuck on the previous category's items (or empty) until F5.
      isControlled,
    ],
    () => {
      if (!isControlled.value) fetchProducts();
    },
    { immediate: true }
  );

  return {
    displayProducts,
    itemsFound,
    isLoading,
    currentSortField,
    currentSortOrder,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    searchTerm,
    searchResults,
    searchItemsFound,
    searchLoading,
    fetchProducts,
    search,
    goToPage: pagination.goToPage,
  };
}
