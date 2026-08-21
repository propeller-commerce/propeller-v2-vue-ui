/**
 * useProductSlider (Vue) — Crossupsell/product fetch + DOM scroll tracking.
 *
 * Covers: ProductSlider component.
 *
 * Responsibilities:
 * - fetchCrossupsells: CrossupsellService with priceCalculateProductInput + extract productTo/clusterTo
 * - fetchProducts: ProductService.getProducts() batch call (NOT per-item getProduct())
 *   with statuses filter and filterAvailableAttributeInput
 * - Scroll position tracking for responsive sliding
 */

import { ref, type Ref } from 'vue';
import { CrossupsellService, CrossupsellType, ProductService, ProductStatus } from '@propeller-commerce/propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  Crossupsell,
  CrossupsellsQueryVariables,
  ProductsQueryVariables,
  ProductSearchInput,
  PriceCalculateProductInput,
  FilterAvailableAttributeInput,
  MediaImageProductSearchInput,
  TransformationsInput,
} from '@propeller-commerce/propeller-sdk-v2';
import { createServices } from '@propeller-commerce/propeller-v2-core-ui';
import { resolveListingUserId } from '../shared/utils/listingUserId';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FetchCrossupsellsInput {
  productId?: number;
  clusterId?: number;
  types?: CrossupsellType[];
}

export interface UseProductSliderOptions {
  graphqlClient: GraphQLClient;
  language?: Ref<string>;
  taxZone?: string;
  user?: Ref<Contact | Customer | null>;
  companyId?: Ref<number | undefined>;
  configuration?: {
    /** The channel's anonymous user — logged-out listings are scoped to it. */
    anonymousUserId?: number;
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersMedium?: TransformationsInput;
  };
}

export interface UseProductSliderReturn {
  products: Ref<(Product | Cluster)[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  canScrollLeft: Ref<boolean>;
  canScrollRight: Ref<boolean>;
  fetchCrossupsells: (input: FetchCrossupsellsInput) => Promise<void>;
  fetchProducts: (productIds: number[], clusterIds?: number[]) => Promise<void>;
  scrollLeft: (containerEl: HTMLElement, itemWidth?: number) => void;
  scrollRight: (containerEl: HTMLElement, itemWidth?: number) => void;
  onScroll: (containerEl: HTMLElement) => void;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useProductSlider(options: UseProductSliderOptions): UseProductSliderReturn {
  const { graphqlClient, configuration = {} } = options;
  const languageRef = options.language ?? ref('NL');
  const taxZone = options.taxZone ?? 'NL';

  const products = ref<(Product | Cluster)[]>([]) as Ref<(Product | Cluster)[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const canScrollLeft = ref(false);
  const canScrollRight = ref(false);

  // ── Price input builder ───────────────────────────────────────────────────

  function buildPriceInput(): PriceCalculateProductInput {
    const user = options.user?.value ?? null;
    const companyId = options.companyId?.value;
    const input: PriceCalculateProductInput = { taxZone };
    if (companyId) input.companyId = companyId;
    if (user && 'contactId' in user) input.contactId = (user as Contact).contactId;
    if (user && 'customerId' in user) input.customerId = (user as Customer).customerId;
    return input;
  }

  // ── Assortment filter ───────────────────────────────────────────────────
  // Resolves crossupsell items against the user's assortment via the same
  // `getProducts` query the listings use, and returns only the items that come
  // back (preserving the input order). Products outside the contact's
  // assortment are dropped — the backend simply omits them, exactly as it does
  // on the catalog/search pages (which scope by userId/companyId). On a query
  // failure we return the input unchanged so the slider isn't blanked.

  function resolveUserId(): number | undefined {
    return resolveListingUserId(options.user?.value ?? null, configuration);
  }

  function resolveCompanyId(): number | undefined {
    if (options.companyId?.value) return options.companyId.value;
    const user = options.user?.value ?? null;
    if (user && 'contactId' in user) return (user as Contact).company?.companyId;
    return undefined;
  }

  async function filterToAssortment(items: (Product | Cluster)[]): Promise<(Product | Cluster)[]> {
    if (!items.length) return items;

    const productIds: number[] = [];
    const clusterIds: number[] = [];
    for (const item of items) {
      if ('productId' in item && (item as Product).productId !== undefined) {
        productIds.push((item as Product).productId);
      } else if ('clusterId' in item && (item as Cluster).clusterId !== undefined) {
        clusterIds.push((item as Cluster).clusterId);
      }
    }
    if (!productIds.length && !clusterIds.length) return items;

    const lang = languageRef.value || 'NL';
    const userId = resolveUserId();
    const companyId = resolveCompanyId();
    const searchInput: ProductSearchInput = {
      ...(productIds.length && { productIds }),
      ...(clusterIds.length && { clusterIds }),
      language: lang,
      page: 1,
      offset: 50,
      statuses: [ProductStatus.A, ProductStatus.P, ProductStatus.T, ProductStatus.S],
      ...(userId !== undefined && { userId }),
      ...(companyId !== undefined && { companyId }),
    };
    const filterAvailableAttributeInput: FilterAvailableAttributeInput = { isSearchable: true };
    const variables: ProductsQueryVariables = {
      input: searchInput,
      imageSearchFilters: configuration.imageSearchFiltersGrid,
      imageVariantFilters: configuration.imageVariantFiltersMedium as TransformationsInput,
      filterAvailableAttributeInput,
    };

    try {
      const response = await createServices(graphqlClient).product.getProducts(variables);
      const resolved = (response?.items ?? []) as (Product | Cluster)[];
      const allowed = new Set<number>();
      for (const r of resolved) {
        const id = (r as Product).productId ?? (r as Cluster).clusterId;
        if (id !== undefined) allowed.add(id);
      }
      return items.filter((item) => {
        const id = (item as Product).productId ?? (item as Cluster).clusterId;
        return id !== undefined && allowed.has(id);
      });
    } catch {
      // Verification failed — don't blank the slider; show the raw crossupsells.
      return items;
    }
  }

  // ── Fetch crossupsells ────────────────────────────────────────────────────
  // fetchCrossUpsells():
  // - includes priceCalculateProductInput
  // - extracts productTo / clusterTo from each Crossupsell

  async function fetchCrossupsells(input: FetchCrossupsellsInput): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = createServices(graphqlClient).crossupsell;
      const lang = languageRef.value || 'NL';
      const variables: CrossupsellsQueryVariables = {
        input: {
          page: 1,
          offset: 50,
          ...(input.types && input.types.length > 0 && { types: input.types }),
          ...(input.productId && { productIdsFrom: [input.productId] }),
          ...(input.clusterId && { clusterIdsFrom: [input.clusterId] }),
        },
        language: lang,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersMedium as TransformationsInput,
        priceCalculateProductInput: buildPriceInput(),
      };

      const result = await service.getCrossupsells(variables);
      const crossupsells: Crossupsell[] = result?.items ?? [];

      const items: (Product | Cluster)[] = [];
      for (const cu of crossupsells) {
        if (cu.productTo) items.push(cu.productTo as Product);
        else if (cu.clusterTo) items.push(cu.clusterTo as Cluster);
      }

      // Crossupsell relationships are NOT scoped to the user's assortment —
      // they can reference products/clusters the signed-in contact may not
      // order or even open (the PDP returns "not found"). Re-resolve the
      // extracted ids through the assortment-aware `getProducts` query (the
      // same one `fetchProducts` uses, scoped by userId/companyId like the
      // catalog/search listings) and keep only the items that come back, in
      // the original crossupsell order. If this verification call fails we
      // fall back to the raw items so a transient error doesn't blank the
      // slider.
      products.value = await filterToAssortment(items);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch crossupsells';
      products.value = [];
    } finally {
      loading.value = false;
    }
  }

  // ── Fetch products (batch) ────────────────────────────────────────────────
  // fetchItems():
  // - uses ProductService.getProducts() (batch), NOT per-item getProduct()
  // - includes statuses filter and filterAvailableAttributeInput

  async function fetchProducts(productIds: number[], clusterIds: number[] = []): Promise<void> {
    if (!productIds.length && !clusterIds.length) return;
    loading.value = true;
    error.value = null;
    try {
      const service = createServices(graphqlClient).product;
      const lang = languageRef.value || 'NL';

      const searchInput: ProductSearchInput = {
        productIds,
        clusterIds,
        language: lang,
        page: 1,
        offset: 50,
        statuses: [
          ProductStatus.A,
          ProductStatus.P,
          ProductStatus.T,
          ProductStatus.S,
        ],
      };

      const filterAvailableAttributeInput: FilterAvailableAttributeInput = { isSearchable: true };

      const variables: ProductsQueryVariables = {
        input: searchInput,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersMedium as TransformationsInput,
        filterAvailableAttributeInput,
      };

      const response = await service.getProducts(variables);
      products.value = (response?.items ?? []) as (Product | Cluster)[];
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch products';
      products.value = [];
    } finally {
      loading.value = false;
    }
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

  function onScroll(containerEl: HTMLElement): void {
    canScrollLeft.value = containerEl.scrollLeft > 0;
    canScrollRight.value =
      containerEl.scrollLeft + containerEl.clientWidth < containerEl.scrollWidth - 1;
  }

  function scrollLeft(containerEl: HTMLElement, itemWidth = 280): void {
    containerEl.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  }

  function scrollRight(containerEl: HTMLElement, itemWidth = 280): void {
    containerEl.scrollBy({ left: itemWidth, behavior: 'smooth' });
  }

  return {
    products,
    loading,
    error,
    canScrollLeft,
    canScrollRight,
    fetchCrossupsells,
    fetchProducts,
    scrollLeft,
    scrollRight,
    onScroll,
  };
}
