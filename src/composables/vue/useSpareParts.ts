/**
 * useSpareParts (Vue) — a machine node's spare-parts list.
 *
 * The machine-tree sibling of `useProductSearch`: same contract (options in,
 * state + actions out), same controlled/uncontrolled sentinel, same race
 * guard — but sourced from `machine(slug:).sparePartProducts` instead of
 * `category(categoryId:).products`.
 *
 * Mirrors `propeller-v2-react-ui`'s `useSpareParts`. The machine pages are CSR,
 * so the fetch is client-only (`typeof window` guard) — no SSR self-fetch.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import {
  machineService,
  ProductStatus,
  type GraphQLClient,
  type SparePartsMachine,
  type SparePartsMachineProductSearchInput,
  type SparePart,
  type SparePartsResponse,
  type AttributeFilter,
  type Contact,
  type Customer,
  type ProductSortInput,
  type ProductSortField,
  type SortOrder,
  type ProductTextFilterInput,
  type ProductPriceFilterInput,
  type PriceCalculateProductInput,
  type FilterAvailableAttributeInput,
} from '@propeller-commerce/propeller-sdk-v2';
import { resolveListingUserId } from '../shared/utils/listingUserId';

/** Statuses the storefront shows. Mirrors `useProductSearch` / `lib/server`. */
const STOREFRONT_STATUSES: ProductStatus[] = [
  ProductStatus.A,
  ProductStatus.P,
  ProductStatus.T,
  ProductStatus.S,
];

export interface UseSparePartsOptions {
  /** SDK client. Without it the composable stays idle (controlled mode needs no client). */
  graphqlClient?: GraphQLClient;
  /**
   * Controlled mode: pre-fetched parts (e.g. SSR-seeded). When the ref's VALUE
   * is DEFINED the composable performs no fetching and echoes these back. Pass
   * `[]` (not `undefined`) to show an empty state while the host controls loading.
   */
  parts?: Ref<SparePart[] | undefined>;
  /** Slug of the machine whose parts to list. */
  slug?: Ref<string | undefined>;
  /** Free-text search, scoped server-side to this machine's parts. */
  term?: Ref<string | undefined>;
  /** Language for the spare parts themselves (the storefront language). */
  language: Ref<string>;
  /**
   * Language the MACHINE TREE is authored in. Defaults to `language`.
   *
   * `machine(slug:, language:)` is language-scoped and hard-errors with
   * "No machine found for slug and language" when the machine has no name/slug
   * in that language. Machine trees are commonly maintained in one language
   * (typically EN) while their spare parts are localized.
   */
  machineLanguage?: Ref<string | undefined>;
  /** Tax zone for price calculation. */
  taxZone?: string;
  /** Active user — drives `userId` scoping and contact/customer pricing. */
  user?: Ref<Contact | Customer | null>;
  /** Active company — scopes the assortment. */
  companyId?: Ref<number | undefined>;
  /** Attribute (facet) filters. */
  textFilters?: Ref<ProductTextFilterInput[] | undefined>;
  /** Price-range filter lower bound. */
  priceFilterMin?: Ref<number | undefined>;
  /** Price-range filter upper bound. */
  priceFilterMax?: Ref<number | undefined>;
  /** Sort field. */
  sortField?: Ref<string | undefined>;
  /** Sort direction. */
  sortOrder?: Ref<string | undefined>;
  /** Items per page. Defaults to 12. */
  pageSize?: Ref<number>;
  /** Image filter config, mirroring `useProductSearch`'s `configuration`. */
  configuration?: {
    /** The channel's anonymous user — logged-out listings are scoped to it. */
    anonymousUserId?: number;
    imageSearchFiltersGrid?: unknown;
    imageVariantFiltersMedium?: unknown;
  };
  /** Fired with the facet list after each fetch. */
  onFiltersChange?: (filters: AttributeFilter[]) => void;
  /** Fired with the price-slider bounds after each fetch. */
  onPriceBoundsChange?: (min: number, max: number) => void;
  /** Fired with the total item count after each fetch. */
  onItemsFoundChange?: (count: number) => void;
  /** Fired with the raw parts response after each fetch. */
  onPartsResponse?: (response: SparePartsResponse) => void;
  /** Fired with the machine itself after each fetch (name, child machines, …). */
  onMachineChange?: (machine: SparePartsMachine) => void;
}

export interface UseSparePartsReturn {
  /** The parts to render — the controlled prop when set, else the fetched list. */
  displayParts: ComputedRef<SparePart[]>;
  /** Child machines of this node, for rendering alongside the parts. */
  childMachines: Ref<SparePartsMachine[]>;
  /** Total parts found. */
  itemsFound: Ref<number>;
  /** `true` while an internal fetch is in flight. Always `false` when controlled. */
  isLoading: ComputedRef<boolean>;
  /** Current page (1-based). */
  currentPage: Ref<number>;
  /** Total pages. */
  totalPages: Ref<number>;
  /** Re-run the fetch. No-op in controlled mode. */
  fetchParts: () => Promise<void>;
  /** Navigate to a page. */
  goToPage: (page: number) => void;
}

/** Resolve contact/customer ids from the active user, mirroring the React hook. */
function resolveUserIds(
  user: Contact | Customer | null | undefined,
  configuration?: { anonymousUserId?: number }
): {
  userId?: number;
  contactId?: number;
  customerId?: number;
} {
  const contactId = user && 'contactId' in user ? (user as Contact).contactId : undefined;
  const customerId = user && 'customerId' in user ? (user as Customer).customerId : undefined;
  // contactId/customerId stay strictly the logged-in ids; only the listing
  // scope falls back to the channel's anonymous user.
  return { userId: resolveListingUserId(user, configuration), contactId, customerId };
}

/**
 * useSpareParts — fetch and paginate a machine node's spare-parts list.
 */
export function useSpareParts(options: UseSparePartsOptions): UseSparePartsReturn {
  const graphqlClient = options.graphqlClient;
  const languageRef = options.language;
  const slugRef = options.slug ?? ref<string | undefined>(undefined);
  const termRef = options.term ?? ref<string | undefined>(undefined);
  const machineLanguageRef = options.machineLanguage ?? ref<string | undefined>(undefined);
  const textFiltersRef = options.textFilters ?? ref<ProductTextFilterInput[] | undefined>(undefined);
  const priceMinRef = options.priceFilterMin ?? ref<number | undefined>(undefined);
  const priceMaxRef = options.priceFilterMax ?? ref<number | undefined>(undefined);
  const sortFieldRef = options.sortField ?? ref<string | undefined>(undefined);
  const sortOrderRef = options.sortOrder ?? ref<string | undefined>(undefined);
  const pageSizeRef = options.pageSize ?? ref(12);
  const userRef = options.user ?? ref<Contact | Customer | null>(null);
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);
  const taxZone = options.taxZone;

  const internalParts = ref<SparePart[]>([]) as Ref<SparePart[]>;
  const childMachines = ref<SparePartsMachine[]>([]) as Ref<SparePartsMachine[]>;
  const itemsFound = ref(0);
  const internalLoading = ref(false);
  const currentPage = ref(1);
  const totalPages = ref(1);

  /** Per-instance guard: only the newest fetch commits. Mirrors `useProductSearch`. */
  let fetchId = 0;

  const isControlled = computed(() => options.parts?.value !== undefined);
  const displayParts = computed<SparePart[]>(() =>
    isControlled.value ? options.parts!.value ?? [] : internalParts.value
  );
  const isLoading = computed(() => !isControlled.value && internalLoading.value);

  async function fetchParts(): Promise<void> {
    if (!graphqlClient || isControlled.value || !slugRef.value) return;

    const thisId = ++fetchId;
    internalLoading.value = true;

    try {
      // `machineService(client)` rather than `createServices(client).machine` —
      // the core-ui `Services` bundle has no machine entry.
      const service = machineService(graphqlClient);
      const { userId, contactId, customerId } = resolveUserIds(userRef.value, options.configuration);

      const sortInputs: ProductSortInput[] = sortFieldRef.value
        ? [{ field: sortFieldRef.value as ProductSortField, order: sortOrderRef.value as SortOrder }]
        : [];

      const priceFilter: ProductPriceFilterInput | undefined =
        priceMinRef.value !== undefined || priceMaxRef.value !== undefined
          ? { from: priceMinRef.value ?? 0, to: priceMaxRef.value ?? 999999 }
          : undefined;

      // `language`/`page`/`offset`/`statuses` are NON_NULL on the schema —
      // passing this input at all means passing all four.
      const sparePartsMachineProductSearchInput: SparePartsMachineProductSearchInput = {
        language: languageRef.value,
        page: currentPage.value,
        offset: pageSizeRef.value,
        statuses: STOREFRONT_STATUSES,
        hidden: false,
        ...(termRef.value && { term: termRef.value }),
        ...(textFiltersRef.value?.length && { textFilters: textFiltersRef.value }),
        ...(priceFilter && { price: priceFilter }),
        ...(sortInputs.length && { sortInputs }),
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(userId !== undefined && { userId }),
      };

      const priceCalculateProductInput: PriceCalculateProductInput = {
        ...(taxZone && { taxZone }),
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(contactId !== undefined && { contactId }),
        ...(customerId !== undefined && { customerId }),
      };

      // Without this the response's `filters` array is empty and the filter
      // sidebar renders "No filters available".
      const filterAvailableAttributeInput: FilterAvailableAttributeInput = {
        isSearchable: true,
      };

      const machine = await service.getMachine({
        slug: slugRef.value,
        // The machine tree's language, NOT the parts' — see `machineLanguage`.
        language: machineLanguageRef.value ?? languageRef.value,
        sparePartsMachineProductSearchInput,
        filterAvailableAttributeInput,
        priceCalculateProductInput,
        imageSearchFilters: options.configuration?.imageSearchFiltersGrid as never,
        imageVariantFilters: options.configuration?.imageVariantFiltersMedium as never,
      });

      if (thisId !== fetchId) return;

      const partsResponse = machine?.sparePartProducts as SparePartsResponse | undefined;
      const items = (partsResponse?.items ?? []) as SparePart[];

      internalParts.value = items;
      childMachines.value = (machine?.machines ?? []) as SparePartsMachine[];

      const found = partsResponse?.itemsFound ?? items.length;
      itemsFound.value = found;
      options.onItemsFoundChange?.(found);
      totalPages.value = partsResponse?.pages ?? 1;

      if (partsResponse) options.onPartsResponse?.(partsResponse);
      if (partsResponse?.filters) options.onFiltersChange?.(partsResponse.filters);

      // Price-slider bounds. Same caveat as `useProductSearch`: the API's
      // aggregate is populated for anonymous reads but comes back 0 for a
      // contact-priced request, so fall back to the resolved per-item prices.
      const aggMin = partsResponse?.minPrice;
      const aggMax = partsResponse?.maxPrice;
      if (aggMax !== undefined && aggMax > 0) {
        options.onPriceBoundsChange?.(aggMin ?? 0, aggMax);
      } else {
        const prices = items
          .map((p) => {
            const product = p?.product as { price?: { gross?: number; net?: number } } | undefined;
            return product?.price?.gross ?? product?.price?.net;
          })
          .filter((n): n is number => typeof n === 'number' && n > 0);
        if (prices.length) {
          options.onPriceBoundsChange?.(Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices)));
        }
      }

      if (machine) options.onMachineChange?.(machine);
    } catch (e) {
      console.error('[useSpareParts] fetchParts error:', e);
      if (thisId === fetchId) internalParts.value = [];
    } finally {
      if (thisId === fetchId) internalLoading.value = false;
    }
  }

  function goToPage(page: number): void {
    // `totalPages <= 1` means the count isn't known yet, so don't reject — else
    // the first pagination click is silently dropped. Mirrors the React hook.
    if (page >= 1 && (totalPages.value <= 1 || page <= totalPages.value)) {
      currentPage.value = page;
    }
  }

  // Key the fetch on its INPUTS (content), NOT on the textFilters array
  // identity. MachineGrid rebuilds `textFilters` from the fetched facet list on
  // every response, so watching the array by reference would re-fetch on its own
  // output forever. `JSON.stringify` keys on filter *content*; a new-but-equal
  // array no longer retriggers. Client-only: the machine pages are CSR.
  watch(
    [
      slugRef,
      termRef,
      languageRef,
      machineLanguageRef,
      companyIdRef,
      () => JSON.stringify(textFiltersRef.value ?? []),
      priceMinRef,
      priceMaxRef,
      sortFieldRef,
      sortOrderRef,
      pageSizeRef,
      currentPage,
      () => {
        const { contactId, customerId } = resolveUserIds(userRef.value, options.configuration);
        return `${contactId ?? ''}:${customerId ?? ''}`;
      },
      isControlled,
    ],
    () => {
      if (!isControlled.value && typeof window !== 'undefined') void fetchParts();
    },
    { immediate: true }
  );

  return {
    displayParts,
    childMachines,
    itemsFound,
    isLoading,
    currentPage,
    totalPages,
    fetchParts,
    goToPage,
  };
}
