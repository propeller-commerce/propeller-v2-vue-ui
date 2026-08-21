<template>
  <div :class="className">
    <!-- ── Root render ─────────────────────────────────────────────────────── -->
    <template v-if="isRoot">
      <h1 class="propeller-grid-title mb-6 text-2xl font-semibold">
        {{ rootTitle ?? 'Machines' }}
      </h1>
      <p v-if="rootLoading" class="py-12 text-center text-foreground-subtle">
        {{ getMachineLabel('loading', 'Loading…') }}
      </p>
      <p v-else-if="rootCards.length === 0" class="py-12 text-center text-foreground-subtle">
        {{ getMachineLabel('noMachines', 'No machines found.') }}
      </p>
      <!-- Bare `grid` (no `grid-cols-1`) is 1 implicit column on mobile. Do NOT
           add `grid-cols-1`: a consumer app that ships its own Tailwind build
           after this package's CSS emits an unprefixed `.grid-cols-1` that wins
           the cascade tie and pins the grid to one column at every breakpoint
           (ProductGrid dodges this with a `grid-cols-2` base). -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MachineCard
          v-for="entry in rootCards"
          :key="entry.machine.id"
          :machine="entry.machine"
          :href="entry.href"
          :language="machineLanguage"
          :labels="machineCardLabels"
        />
      </div>
    </template>

    <!-- ── Node render ─────────────────────────────────────────────────────── -->
    <template v-else>
      <!-- Breadcrumbs from the URL segments — leaf name from the fetched machine,
           ancestors title-cased from their slug (backend only knows the leaf). -->
      <nav aria-label="Breadcrumb" class="propeller-breadcrumbs mb-6">
        <ol class="flex flex-wrap items-center gap-2 text-sm text-foreground-subtle">
          <li>
            <a :href="basePath" class="hover:text-primary">{{ rootTitle ?? 'Machines' }}</a>
          </li>
          <li
            v-for="(segment, i) in segments"
            :key="`${basePath}/${segments.slice(0, i + 1).join('/')}`"
            class="flex items-center gap-2"
          >
            <span aria-hidden="true">/</span>
            <span
              v-if="i === segments.length - 1"
              aria-current="page"
              class="text-foreground"
            >
              {{ machineName }}
            </span>
            <a
              v-else
              :href="`${basePath}/${segments.slice(0, i + 1).join('/')}`"
              class="hover:text-primary"
            >
              {{ slugToLabel(segment) }}
            </a>
          </li>
        </ol>
      </nav>

      <h1 class="propeller-grid-title mb-6 text-2xl font-semibold">{{ machineName }}</h1>

      <!-- Child machines — their own section above the parts. A node with zero
           parts still shows its children. -->
      <div
        v-if="childMachines.length > 0"
        class="propeller-machine-children mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <template v-for="child in childMachines" :key="`machine-${child.id}`">
          <MachineCard
            v-if="childSlugHref(child)"
            :machine="child"
            :href="childSlugHref(child) as string"
            :language="machineLanguage"
            :labels="machineCardLabels"
          />
        </template>
      </div>

      <div v-if="hasParts" class="flex flex-col gap-8 lg:flex-row">
        <GridFiltersPanel
          :filters="gridFilters"
          :priceMin="priceBoundsMin"
          :priceMax="priceBoundsMax"
          :onFilterChange="handleFilterChange"
          :onPriceChange="handlePriceRangeChange"
          :onClearFilters="clearAllFilters"
          :collapsed="true"
          :clearSignal="clearSignal"
          :activeTextFilters="listing.filters"
          :activePriceMin="listing.minPrice"
          :activePriceMax="listing.maxPrice"
          :isLoading="partsLoading"
          :labels="filtersLabels"
        />

        <div class="w-full flex-1">
          <!-- In-node search box: draft synced to the URL term (reset on
               back/forward/clear), read on submit. -->
          <div class="mb-4 flex gap-2">
            <input
              v-model="searchDraft"
              type="search"
              :placeholder="toolbarLabels?.searchParts ?? 'Search parts…'"
              :aria-label="toolbarLabels?.searchParts ?? 'Search parts'"
              class="w-full rounded border border-border bg-card px-3 py-2"
              @keydown.enter="submitSearch"
            />
            <button
              type="button"
              class="rounded bg-primary px-4 py-2 text-primary-foreground"
              @click="submitSearch"
            >
              {{ toolbarLabels?.search ?? 'Search' }}
            </button>
          </div>

          <div
            class="sticky top-[80px] z-30 mb-2 bg-card/95 py-2 backdrop-blur lg:static lg:bg-transparent lg:py-0"
          >
            <GridToolbar
              :itemsFound="itemsFound"
              :page="currentPage"
              :pageSize="listing.offset"
              :pageItemCount="partProducts.length"
              :activeTextFilters="listing.filters"
              :priceFilterMin="listing.minPrice"
              :priceFilterMax="listing.maxPrice"
              :defaultSort="defaultSort"
              :onSortChange="(field: string, order: string) => handleSortChange(field, order as 'ASC' | 'DESC')"
              :onOffsetChange="handleOffsetChange"
              :viewMode="viewMode"
              :onViewChange="(mode: string) => (viewMode = mode as 'grid' | 'list')"
              :onFilterRemove="handleFilterRemove"
              :onPriceFilterRemove="() => handlePriceRangeChange(undefined, undefined)"
              :onClearFilters="clearAllFilters"
              :labels="toolbarLabels"
            />
          </div>

          <!-- Always controlled: `useSpareParts` owns fetching, the grid renders. -->
          <ProductGrid
            :products="partProducts"
            :isLoading="partsLoading"
            :onProductClick="onProductClick"
            :allowAddToCart="allowAddToCart ?? true"
            :showPrice="showPrice ?? true"
            :showModal="true"
            :createCart="createCart ?? true"
            :cartId="cartId"
            :onCartCreated="onCartCreated"
            :afterAddToCart="afterAddToCart"
            :columns="viewMode === 'list' ? 1 : 3"
            :showAvailability="showAvailability ?? false"
            :showStock="showStock ?? true"
            :belowNameComponent="QtyBelowName"
          />

          <div class="mt-8">
            <GridPagination
              :products="{ page: currentPage, pages: totalPages } as any"
              :onPageChange="handlePageChange"
              :labels="paginationLabels"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * MachineGrid (Vue) — the spare-parts machine tree, as one self-contained grid.
 *
 * The machine-tree sibling of `ProductGrid`. Driven by the current URL path
 * (`segments`), it renders one of two modes:
 *  - **Root** (`segments` empty): resolves the company's installations in ONE
 *    concatenated request via `useMachines(source, sourceIds)` → `MachineCard`s.
 *  - **Node** (`segments` non-empty): fetches that machine by its leaf slug via
 *    `useSpareParts`, and renders its child machines (`MachineCard`s) above a
 *    category-style spare-parts listing (facets + toolbar + a permanently
 *    controlled `ProductGrid` + pagination, with the qty-in-machine below-name).
 *
 * Navigation between levels is via `MachineCard`'s `href` (built from `basePath`
 * + segments + child slug) — the package owns no router. The parts listing is
 * **controlled**: the current state comes in via `listing`, and every filter /
 * sort / page / search interaction emits the next state via `onListingChange`.
 * The host route maps that to the URL. Mirrors `propeller-v2-react-ui`'s
 * `MachineGrid`. The machine pages are CSR — the composables fetch client-only.
 */
import { computed, ref, watch, defineComponent, h, type Component } from 'vue';
import {
  AttributeType,
  type AttributeFilter,
  type Cluster,
  type Product,
  type ProductSortField,
  type SortOrder,
  type Cart,
  type CartMainItem,
  type SparePartsMachine,
  type ProductTextFilterInput,
  type Contact,
  type Customer,
  type GraphQLClient,
} from '@propeller-commerce/propeller-sdk-v2';
import { getLabel as _getLabel, getLocalizedValue } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';
import { useMachines } from '../composables/vue/useMachines';
import { useSpareParts } from '../composables/vue/useSpareParts';
import ProductGrid from './ProductGrid.vue';
import MachineCard from './MachineCard.vue';
import GridFiltersPanel from './GridFiltersPanel.vue';
import GridToolbar from './GridToolbar.vue';
import GridPagination from './GridPagination.vue';

/**
 * The controlled listing state for the spare-parts view — mirrors what the host
 * derives from the URL (`page`/`offset`/`sort`/attribute-`filters`/`price`/`term`).
 * Primitives + SDK enums only, so no app type leaks into the package.
 */
export interface MachineListingState {
  page: number;
  offset: number;
  sortField: ProductSortField | string;
  sortOrder: SortOrder | string;
  /** Attribute name → selected facet values. */
  filters: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  term: string;
}

export interface MachineGridProps {
  // ── Identity / navigation ────────────────────────────────────────────────
  /** Current URL path under the machines root, e.g. `['mixer','frame']`. `[]` = root. */
  segments: string[];
  /** Localized machines base path (e.g. `/nl/machines`) — used to build hrefs. */
  basePath: string;

  // ── Root query ───────────────────────────────────────────────────────────
  /** External system the installation ids belong to (root mode). */
  source?: string;
  /** Installation ids from `MY_INSTALLATIONS` (root mode). */
  sourceIds?: string[];
  /** Title for the root list. Defaults to `'Machines'`. */
  rootTitle?: string;

  // ── Tree ─────────────────────────────────────────────────────────────────
  /** Language the machine tree is authored in (usually EN). Defaults to `'EN'`. */
  machineLanguage?: string;

  // ── Controlled listing (parts) ───────────────────────────────────────────
  listing: MachineListingState;
  onListingChange: (next: MachineListingState) => void;

  // ── Infra (resolved via useInfraProps; explicit wins) ────────────────────
  graphqlClient?: GraphQLClient;
  user?: Contact | Customer | null;
  companyId?: number;
  /** Storefront language (parts). */
  language?: string;
  taxZone?: string;
  configuration?: { imageSearchFiltersGrid?: unknown; imageVariantFiltersMedium?: unknown };
  portalMode?: string;

  // ── Parts card pass-through (to the inner ProductGrid) ────────────────────
  cartId?: string;
  createCart?: boolean;
  onCartCreated?: (cart: Cart) => void;
  /**
   * Fired after every successful add-to-cart (adds into an EXISTING cart too,
   * not just the first create). Forward to the host cart store or the cart
   * icon/sidebar/page won't reflect parts added from the grid.
   */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;
  allowAddToCart?: boolean;
  showPrice?: boolean;
  showStock?: boolean;
  showAvailability?: boolean;
  onProductClick?: (product: Product) => void;

  // ── Labels ────────────────────────────────────────────────────────────────
  paginationLabels?: Record<string, string>;
  filtersLabels?: Record<string, string>;
  toolbarLabels?: Record<string, string>;
  machineCardLabels?: Record<string, string>;

  className?: string;
}

const props = defineProps<MachineGridProps>();
function getMachineLabel(key: string, fallback: string): string {
  return _getLabel(props.machineCardLabels, key, fallback);
}

// Explicit props win; otherwise infra resolves from <PropellerProvider>.
const infra = useInfraProps(props);

const isRoot = computed(() => props.segments.length === 0);
const currentSlug = computed(() => props.segments[props.segments.length - 1] ?? '');
const currentPath = computed(() => [props.basePath, ...props.segments].join('/'));
const machineLanguage = computed(() => props.machineLanguage ?? 'EN');
const language = computed(() => (infra.language as string) ?? 'NL');
const configuration = computed(
  () => (props.configuration ?? (infra.configuration as MachineGridProps['configuration']))
);

const viewMode = ref<'grid' | 'list'>('list');
const clearSignal = ref(0);

// Facets / bounds / the fetched node arrive from the parts hook.
const gridFilters = ref<AttributeFilter[]>([]) as import('vue').Ref<AttributeFilter[]>;
const priceBoundsMin = ref<number | undefined>();
const priceBoundsMax = ref<number | undefined>();
const itemsFound = ref(0);
const machine = ref<SparePartsMachine | undefined>();

/** Title-case a URL slug for a breadcrumb ancestor (no fetched name available). */
function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const activeTextFilters = computed<ProductTextFilterInput[]>(() =>
  Object.entries(props.listing.filters)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => {
      const def = gridFilters.value.find((f) => f.attributeDescription?.name === name);
      return { name, values, exclude: false, type: def?.type ?? AttributeType.TEXT };
    })
);

// ── Root: the installations, one concatenated request ──────────────────────
const { machines: rootMachines, isLoading: rootLoading } = useMachines({
  graphqlClient: infra.graphqlClient as GraphQLClient | undefined,
  source: computed(() => props.source),
  // Only fetch the root list at the root — idle while drilled in.
  sourceIds: computed(() => (isRoot.value ? props.sourceIds ?? [] : [])),
  language: machineLanguage,
  imageVariantFilters: configuration.value?.imageVariantFiltersMedium,
});

// ── Node: this machine's parts + direct children ───────────────────────────
const { displayParts, childMachines, isLoading: partsLoading, currentPage, totalPages, goToPage } =
  useSpareParts({
    graphqlClient: infra.graphqlClient as GraphQLClient | undefined,
    // Idle at the root (no slug).
    slug: computed(() => (isRoot.value ? undefined : currentSlug.value)),
    term: computed(() => props.listing.term || undefined),
    language,
    machineLanguage,
    taxZone: props.taxZone,
    user: computed(() => (infra.user as Contact | Customer | null) ?? null),
    companyId: computed(() => infra.companyId as number | undefined),
    textFilters: activeTextFilters,
    priceFilterMin: computed(() => props.listing.minPrice),
    priceFilterMax: computed(() => props.listing.maxPrice),
    sortField: computed(() => props.listing.sortField as string),
    sortOrder: computed(() => props.listing.sortOrder as string),
    pageSize: computed(() => props.listing.offset),
    configuration: configuration.value,
    onFiltersChange: (f) => (gridFilters.value = f),
    onPriceBoundsChange: (min, max) => {
      priceBoundsMin.value = min;
      priceBoundsMax.value = max;
    },
    onItemsFoundChange: (c) => (itemsFound.value = c),
    onMachineChange: (m) => (machine.value = m),
  });

// The parts hook owns its own page counter; feed the controlled URL page into
// it or pagination writes the page to the URL but never refetches. Mirrors
// ProductGrid's page sync; also resets to 1 when a filter/sort emit sets page=1.
watch(() => props.listing.page, (page) => goToPage(page), { immediate: true });

const machineName = computed(() =>
  machine.value ? getLocalizedValue(machine.value.name, machineLanguage.value) : slugToLabel(currentSlug.value)
);

const partProducts = computed(
  () => displayParts.value.map((p) => p.product).filter(Boolean) as unknown as (Product | Cluster)[]
);

const quantityBySku = computed(() => {
  const map = new Map<string, number>();
  for (const part of displayParts.value) {
    const sku = (part.product as { sku?: string } | undefined)?.sku ?? part.sku;
    if (sku && typeof part.quantity === 'number') map.set(sku, part.quantity);
  }
  return map;
});

const hasParts = computed(() => itemsFound.value > 0 || partProducts.value.length > 0);

const defaultSort = computed(() => [
  { field: props.listing.sortField as string, order: props.listing.sortOrder as string },
]);

function childSlugHref(child: SparePartsMachine): string | null {
  const slug = getLocalizedValue(child.slug, machineLanguage.value);
  if (!slug) return null;
  return `${currentPath.value}/${slug}`;
}

const rootCards = computed(() =>
  rootMachines.value
    .map((m) => ({ machine: m, href: childSlugHref(m) }))
    .filter((c): c is { machine: SparePartsMachine; href: string } => c.href !== null)
);

// Per-card qty below the name. React uses a render-prop; Vue's ProductGrid
// cascades a `belowNameComponent` (receiving `product`) through ProductGridConfig
// — a stable component whose render reads the reactive qty map.
const QtyBelowName: Component = defineComponent({
  name: 'MachinePartQuantity',
  props: { product: { type: Object, required: true } },
  setup(cprops) {
    return () => {
      const sku = (cprops.product as { sku?: string })?.sku;
      const qty = sku ? quantityBySku.value.get(sku) : undefined;
      if (!qty) return null;
      const label = props.toolbarLabels?.quantityInMachine ?? 'Qty in machine';
      return h(
        'span',
        { class: 'propeller-spare-part__quantity text-sm text-foreground-subtle' },
        `${label}: ${qty}`
      );
    };
  },
});

// ── Listing intent → onListingChange (host maps to the URL) ─────────────────
function emitListing(
  nextFilters: Record<string, string[]>,
  page = 1,
  nextMin?: number,
  nextMax?: number,
  nextOffset?: number,
  nextSortField?: ProductSortField | string,
  nextSortOrder?: SortOrder | string,
  nextTerm?: string
): void {
  props.onListingChange({
    filters: nextFilters,
    page,
    minPrice: nextMin,
    maxPrice: nextMax,
    offset: nextOffset ?? props.listing.offset,
    sortField: nextSortField ?? props.listing.sortField,
    sortOrder: (nextSortOrder as SortOrder) ?? props.listing.sortOrder,
    term: nextTerm ?? props.listing.term,
  });
}

function handleFilterChange(filter: AttributeFilter, value: string | number): void {
  const name = filter.attributeDescription?.name || '';
  const current = props.listing.filters[name] || [];
  const valueStr = String(value);
  const next = current.includes(valueStr)
    ? current.filter((v) => v !== valueStr)
    : [...current, valueStr];
  const nextFilters = { ...props.listing.filters, [name]: next };
  if (next.length === 0) delete nextFilters[name];
  emitListing(nextFilters, 1, props.listing.minPrice, props.listing.maxPrice, props.listing.offset, props.listing.sortField, props.listing.sortOrder);
}

function handlePriceRangeChange(newMin?: number, newMax?: number): void {
  emitListing(props.listing.filters, 1, newMin, newMax, props.listing.offset, props.listing.sortField, props.listing.sortOrder);
}

function clearAllFilters(): void {
  clearSignal.value += 1;
  emitListing({}, 1, undefined, undefined, props.listing.offset, props.listing.sortField, props.listing.sortOrder, '');
}

function handleSortChange(field: string, order: 'ASC' | 'DESC'): void {
  emitListing(props.listing.filters, 1, props.listing.minPrice, props.listing.maxPrice, props.listing.offset, field, order);
}

function handleOffsetChange(newOffset: number): void {
  emitListing(props.listing.filters, 1, props.listing.minPrice, props.listing.maxPrice, newOffset, props.listing.sortField, props.listing.sortOrder);
}

function handlePageChange(page: number): void {
  emitListing(props.listing.filters, page, props.listing.minPrice, props.listing.maxPrice, props.listing.offset, props.listing.sortField, props.listing.sortOrder);
}

function handleFilterRemove(filterName: string, value: string): void {
  const current = props.listing.filters[filterName] || [];
  const newVals = current.filter((v) => v !== value);
  const nextFilters = { ...props.listing.filters, [filterName]: newVals };
  if (newVals.length === 0) delete nextFilters[filterName];
  emitListing(nextFilters, 1, props.listing.minPrice, props.listing.maxPrice, props.listing.offset, props.listing.sortField, props.listing.sortOrder);
}

// In-node search: draft synced to the URL term, read on submit.
const searchDraft = ref(props.listing.term);
watch(() => props.listing.term, (t) => (searchDraft.value = t));
function submitSearch(): void {
  emitListing(props.listing.filters, 1, props.listing.minPrice, props.listing.maxPrice, props.listing.offset, props.listing.sortField, props.listing.sortOrder, searchDraft.value);
}
</script>
