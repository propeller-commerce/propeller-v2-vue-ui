<template>
  <div
    :class="`propeller-grid-filters space-y-4 ${isMobile ? 'pb-8' : 'sticky top-24'} ${
      isPending ? 'opacity-50 pointer-events-none' : ''
    } ${className || ''}`"
    :data-mobile="isMobile ? 'true' : 'false'"
    :data-pending="isPending ? 'true' : 'false'"
  >
    <template
      v-if="
        showPriceFilter() && (priceMin !== undefined || priceMax !== undefined)
      "
    >
      <div class="propeller-grid-filters__price space-y-3">
        <h3
          class="propeller-grid-filters__price-title text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {{ getLabel("priceRange", "Price Range") }}
        </h3>
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <span
              class="propeller-grid-filters__price-currency absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle pointer-events-none"
              >{{ currencySymbol }}</span
            ><input
              type="number"
              class="propeller-grid-filters__price-input w-full pl-6 pr-2 h-8 rounded-[var(--radius-control)] border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
              :value="minInput"
              :min="getMinBound()"
              :max="getMaxBound()"
              @input="(e) => (minInput = (e.target as HTMLInputElement).value)"
              @blur="async (event) => commitMinInput()"
              @keyup.enter="(e) => (e.target as HTMLInputElement).blur()"
            />
          </div>
          <span
            class="propeller-grid-filters__price-separator text-foreground-subtle text-sm select-none"
            >–</span
          >
          <div class="relative flex-1">
            <span
              class="propeller-grid-filters__price-currency absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle pointer-events-none"
              >{{ currencySymbol }}</span
            ><input
              type="number"
              class="propeller-grid-filters__price-input w-full pl-6 pr-2 h-8 rounded-[var(--radius-control)] border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
              :value="maxInput"
              :min="getMinBound()"
              :max="getMaxBound()"
              @input="(e) => (maxInput = (e.target as HTMLInputElement).value)"
              @blur="async (event) => commitMaxInput()"
              @keyup.enter="(e) => (e.target as HTMLInputElement).blur()"
            />
          </div>
        </div>
        <div class="propeller-grid-filters__price-slider relative h-4 pt-1">
          <input
            type="range"
            class="propeller-grid-filters__price-slider-thumb absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
            :min="getMinBound()"
            :max="getMaxBound()"
            :value="currentMin"
            @input="(e) => handleMinChange(parseFloat((e.target as HTMLInputElement).value))"
            @pointerup="applyPrice()"
            @touchend="applyPrice()"
            @keyup.enter="applyPrice()"
          /><input
            type="range"
            class="propeller-grid-filters__price-slider-thumb absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
            :min="getMinBound()"
            :max="getMaxBound()"
            :value="currentMax"
            @input="(e) => handleMaxChange(parseFloat((e.target as HTMLInputElement).value))"
            @pointerup="applyPrice()"
            @touchend="applyPrice()"
            @keyup.enter="applyPrice()"
          />
          <div
            class="propeller-grid-filters__price-slider-track absolute top-1.5 left-0 right-0 h-1.5 bg-surface-hover rounded z-10"
          ></div>
        </div>
      </div>
      <div class="propeller-grid-filters__divider h-px bg-surface-hover"></div>
    </template>

    <template v-if="showAvailability()">
      <div class="propeller-grid-filters__availability space-y-3">
        <h3
          class="propeller-grid-filters__availability-title text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {{ getLabel("availability", "Availability") }}
        </h3>
        <div
          class="propeller-grid-filters__availability-toggle inline-flex h-8 w-full rounded-[var(--radius-control)] border border-input overflow-hidden"
        >
          <button
            type="button"
            :class="`propeller-grid-filters__availability-option flex-1 text-xs font-medium transition-colors ${
              availability === 'all' ? 'bg-secondary text-secondary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`"
            :aria-pressed="availability === 'all'"
            :disabled="!!isLoading"
            @click="() => handleAvailabilityChange('all')"
          >
            {{ getLabel("allProducts", "All products") }}
          </button>
          <button
            type="button"
            :class="`propeller-grid-filters__availability-option flex-1 text-xs font-medium transition-colors ${
              availability === 'in-stock' ? 'bg-secondary text-secondary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`"
            :aria-pressed="availability === 'in-stock'"
            :disabled="!!isLoading"
            @click="() => handleAvailabilityChange('in-stock')"
          >
            {{ getLabel("inStock", "In stock") }}
          </button>
        </div>
        <div
          v-if="availability === 'in-stock'"
          class="propeller-grid-filters__availability-quantity flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>{{ getLabel("atLeast", "at least") }}</span>
          <div
            class="propeller-grid-filters__availability-stepper inline-flex items-center h-8 rounded-[var(--radius-control)] border border-input bg-card overflow-hidden focus-within:ring-1 focus-within:ring-secondary"
          >
            <button
              type="button"
              class="propeller-grid-filters__quantity-decrease h-full w-8 flex items-center justify-center text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent hover:text-foreground transition-colors"
              :aria-label="getLabel('quantityDecrease', 'Decrease quantity')"
              :disabled="!!isLoading || minStock <= MIN_STOCK_THRESHOLD"
              @click="() => handleMinStockChange(minStock - 1)"
            >
              −
            </button>
            <input
              type="number"
              inputmode="numeric"
              class="propeller-grid-filters__availability-quantity-input w-10 h-full px-0 text-center font-medium text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              :aria-label="getLabel('atLeast', 'at least')"
              :min="MIN_STOCK_THRESHOLD"
              :step="1"
              :value="minStockInput"
              :disabled="!!isLoading"
              @input="(e) => (minStockInput = (e.target as HTMLInputElement).value)"
              @blur="() => commitMinStockInput()"
              @keyup.enter="(e) => (e.target as HTMLInputElement).blur()"
            />
            <button
              type="button"
              class="propeller-grid-filters__quantity-increase h-full w-8 flex items-center justify-center text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent hover:text-foreground transition-colors"
              :aria-label="getLabel('quantityIncrease', 'Increase quantity')"
              :disabled="!!isLoading"
              @click="() => handleMinStockChange(minStock + 1)"
            >
              +
            </button>
          </div>
          <span>{{ getLabel("pcs", "pcs") }}</span>
        </div>
      </div>
      <div class="propeller-grid-filters__divider h-px bg-surface-hover"></div>
    </template>

    <template v-if="filters.length === 0">
      <p
        class="propeller-grid-filters__empty text-sm text-foreground-subtle italic"
      >
        {{ getLabel("noFiltersAvailable", "No filters available") }}
      </p>
    </template>

    <template
      :key="getFilterName(filter)"
      v-for="(filter, index) in getFilteredFilters()"
    >
      <div
        class="propeller-grid-filters__group border-b border-border-subtle pb-3 last:border-b-0"
        :data-expanded="isExpanded(getFilterName(filter)) ? 'true' : 'false'"
      >
        <button
          type="button"
          class="propeller-grid-filters__group-toggle w-full flex items-center justify-between gap-2 text-left py-1 hover:text-secondary transition-colors"
          @click="async (event) => toggleAccordion(getFilterName(filter))"
        >
          <span
            class="propeller-grid-filters__group-title text-sm font-semibold text-muted-foreground truncate"
            >{{ getFilterTitle(filter) }}</span
          ><svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            :class="`propeller-grid-filters__chevron h-4 w-4 flex-shrink-0 text-foreground-subtle transition-transform duration-200 ${
              isExpanded(getFilterName(filter)) ? 'rotate-180' : ''
            }`"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
              :strokeWidth="2"
            ></path>
          </svg>
        </button>
        <template v-if="isExpanded(getFilterName(filter))">
          <div class="propeller-grid-filters__options pt-2 space-y-1.5">
            <template
              :key="option.value"
              v-for="(option, index) in getValidOptions(filter)"
            >
              <label
                class="propeller-grid-filters__option flex items-center gap-2 cursor-pointer group"
                ><input
                  type="checkbox"
                  class="propeller-grid-filters__checkbox h-4 w-4 rounded border-input text-secondary focus:ring-secondary cursor-pointer flex-shrink-0"
                  :checked="isSelected(getFilterName(filter), option.value)"
                  @change="
                    async (e) =>
                      handleCheckbox(filter, option.value, (e.target as HTMLInputElement).checked)
                  "
                /><span
                  class="propeller-grid-filters__option-label flex-1 text-sm text-muted-foreground leading-none select-none group-hover:text-foreground"
                  >{{ option.value
                  }}<span
                    class="propeller-grid-filters__option-count ml-1 text-xs text-foreground-subtle"
                  >
                    ({{ getCount(option) }})
                  </span></span
                ></label
              >
            </template>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { Contact, Customer, AttributeFilter } from "@propeller-commerce/propeller-sdk-v2";
import { getLabel as _getLabel, isContentHidden, type Availability, MIN_STOCK_THRESHOLD } from "@propeller-commerce/propeller-v2-core-ui";
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface GridFiltersProps {
  /** Currency symbol shown in the price-range inputs. Resolved from <PropellerProvider> when omitted; defaults to '€'. */
  currency?: string;

  /**
   * Attribute filter definitions from the ProductGrid API response.
   * Each entry describes one filterable attribute (e.g. colour, brand, size).
   */
  filters: AttributeFilter[];

  /**
   * Price bounds { min, max } from the current product set.
   * When absent the price section is hidden.
   */
  priceMin?: number;
  priceMax?: number;

  /** Language code. Defaults to 'NL'. */
  language?: string;

  /** Notification called after every filter change. */
  getSelectedFilters?: () => void;

  /**
   * Called on every checkbox toggle.
   * `filter` is the AttributeFilter; `value` is the toggled option string.
   */
  onFilterChange: (filter: AttributeFilter, value: string | number) => void;

  /**
   * Called when the price range changes (on blur / slider release).
   */
  onPriceChange?: (minPrice: number, maxPrice: number) => void;

  /** Called when "Clear all" is clicked. */
  onClearFilters?: () => void;

  /** Enable mobile-specific behaviour (drops sticky positioning). */
  isMobile?: boolean;

  /**
   * 'open' — show price filter for all users.
   * 'semi-closed' — hide price filter for unauthenticated users.
   */
  portalMode?: string;

  /** Authenticated user — price filter visibility depends on this in semi-closed mode. */
  user?: Contact | Customer | null;

  /**
   * Whether filter accordions start collapsed.
   * Defaults to true.
   */
  collapsed?: boolean;

  /** Increment this counter to reset all selected filters and price inputs externally. */
  clearSignal?: number;

  /** Currently active text filters (URL-driven). Syncs internal checkbox state when filters are removed externally. */
  activeTextFilters?: Record<string, string[]>;

  /** Currently active price filter range (URL-driven). When undefined, resets price inputs to bounds. */
  activePriceMin?: number;
  activePriceMax?: number;

  /**
   * Show the availability (stock) section. Defaults to false so hosts opt in
   * rather than gaining a new filter section on upgrade.
   *
   * The host should pass its own "show stock" setting here — a stock filter
   * is meaningless when no stock is displayed anywhere in the grid. When
   * truthy the section is still subject to the same semi-closed-portal
   * visibility rule as the price filter (hidden for anonymous users).
   */
  showAvailabilityFilter?: boolean;

  /**
   * Currently active availability selection (URL-driven). Seeds the toggle
   * on the first render so a restored filtered URL renders it correctly.
   */
  activeAvailability?: Availability;

  /** Currently active minimum stock quantity (URL-driven). Undefined means the minimum. */
  activeMinStock?: number;

  /** Called on every toggle or stepper change with both values. */
  onAvailabilityChange?: (sel: Availability, minStock: number) => void;

  /**
   * When true, all checkboxes and price inputs are disabled.
   * Wire to ProductGrid's `onLoadingChange` to block rapid re-clicks while a fetch is in flight.
   */
  isLoading?: boolean;

  /** Extra CSS class on the root element. */
  className?: string;

  /** Translated labels keyed by the slugs used inside the component (see
   * `getLabel` calls). Missing keys fall back to the English defaults. */
  labels?: Record<string, string>;
}
interface GridFiltersState {
  selectedFilters: Record<string, string[]>;
  currentMin: number;
  currentMax: number;
  expandedFilters: Record<string, boolean>;
  isPending: boolean;
  showPriceFilter: () => boolean;
  showAvailability: () => boolean;
  getFilterName: (filter: AttributeFilter) => string;
  getFilterTitle: (filter: AttributeFilter) => string;
  getFilteredFilters: () => AttributeFilter[];
  getValidOptions: (filter: AttributeFilter) => any[];
  getSelectedCount: () => number;
  hasActiveFilters: () => boolean;
  isSelected: (filterName: string, value: string) => boolean;
  isExpanded: (filterName: string) => boolean;
  toggleAccordion: (filterName: string) => void;
  handleCheckbox: (
    filter: AttributeFilter,
    value: string,
    checked: boolean,
  ) => void;
  handleAvailabilityChange: (value: Availability) => void;
  handleMinStockChange: (value: number) => void;
  commitMinStockInput: () => void;
  handleMinChange: (value: number) => void;
  handleMaxChange: (value: number) => void;
  applyPrice: () => void;
  clearAll: () => void;
  getCount: (option: any) => number;
  getMinBound: () => number;
  getMaxBound: () => number;
}

const props = withDefaults(defineProps<GridFiltersProps>(), {
  collapsed: true,
  showAvailabilityFilter: false,
});

// The glyph was a literal euro, so a non-euro shop had no handle on it.
const infra = useInfraProps(props);
const currencySymbol = computed(() => (infra.currency as string | undefined) ?? '€');
const selectedFilters = ref<GridFiltersState["selectedFilters"]>({});
const currentMin = ref<GridFiltersState["currentMin"]>(0);
const currentMax = ref<GridFiltersState["currentMax"]>(9999);
// Raw text-input buffers (strings) so the user can clear a field and type a
// fresh value. The numeric currentMin/currentMax (shared with the sliders) are
// only committed on blur/Enter — binding the inputs to the numbers forced an
// empty field back to 0 on every keystroke, making them impossible to edit.
const minInput = ref<string>("0");
const maxInput = ref<string>("9999");
const expandedFilters = ref<GridFiltersState["expandedFilters"]>({});
const isPending = ref<GridFiltersState["isPending"]>(false);
// Last range pushed to the parent — guards applyPrice against no-op re-applies
// that would leave isPending (panel blur/disable) stuck on.
const appliedMin = ref<number | undefined>(undefined);
const appliedMax = ref<number | undefined>(undefined);
// Seeded directly from `activeAvailability`/`activeMinStock` (not defaults +
// a watcher) so the toggle/stepper are correct on the very first render, including SSR.
const availability = ref<Availability>(props.activeAvailability || "all");
const minStock = ref<number>((props.activeMinStock as number) ?? MIN_STOCK_THRESHOLD);
// Raw buffer so the field can be cleared while typing; committed on blur/Enter.
const minStockInput = ref<string>(String((props.activeMinStock as number) ?? MIN_STOCK_THRESHOLD));

watch(
  () => [props.filters],
  () => {
    const currentExp = expandedFilters.value as Record<string, boolean>;
    const open = props.collapsed === false;
    const nextExp: Record<string, boolean> = {
      ...currentExp,
    };
    let changed = false;
    ((props.filters as AttributeFilter[]) || []).forEach(
      (f: AttributeFilter) => {
        const n = f?.attributeDescription?.name;
        if (n && nextExp[n] === undefined) {
          nextExp[n] = open;
          changed = true;
        }
      },
    );
    const sel = selectedFilters.value as Record<string, string[]>;
    Object.keys(nextExp).forEach((k: string) => {
      if (nextExp[k] && !(sel[k] || []).length) {
        nextExp[k] = false;
        changed = true;
      }
    });
    if (changed) expandedFilters.value = nextExp;
  },
  { immediate: true },
);
watch(
  () => [props.priceMin, props.priceMax],
  () => {
    currentMin.value = (props.priceMin as number) || 0;
    currentMax.value = (props.priceMax as number) || 9999;
  },
  { immediate: true },
);
watch(
  () => [props.clearSignal],
  () => {
    if (props.clearSignal === undefined) return;
    selectedFilters.value = {};
    currentMin.value = (props.priceMin as number) || 0;
    currentMax.value = (props.priceMax as number) || 9999;
    expandedFilters.value = {};
    availability.value = "all";
    minStock.value = MIN_STOCK_THRESHOLD;
    minStockInput.value = String(MIN_STOCK_THRESHOLD);
  },
  { immediate: true },
);
watch(
  () => [props.activeTextFilters],
  () => {
    if (!props.activeTextFilters) return;
    selectedFilters.value = props.activeTextFilters as Record<string, string[]>;
  },
  { immediate: true },
);
// Adopt parent-supplied availability (URL state rehydration).
watch(
  () => [props.activeAvailability, props.activeMinStock],
  () => {
    if (!props.activeAvailability) return;
    availability.value = props.activeAvailability;
    minStock.value = (props.activeMinStock as number) ?? MIN_STOCK_THRESHOLD;
    minStockInput.value = String((props.activeMinStock as number) ?? MIN_STOCK_THRESHOLD);
  },
);
watch(
  () => [props.activePriceMin, props.activePriceMax],
  () => {
    if (
      props.activePriceMin === undefined &&
      props.activePriceMax === undefined
    ) {
      currentMin.value = (props.priceMin as number) || 0;
      currentMax.value = (props.priceMax as number) || 9999;
    }
  },
  { immediate: true },
);
watch(
  () => [props.isLoading],
  () => {
    if (!props.isLoading) isPending.value = false;
  },
  { immediate: true },
);

// Keep the price text-input buffers in step with the numeric source of truth
// (slider drags, prop-driven resets). User keystrokes only touch the buffers,
// so this never fights typing — it only re-seeds them when the number moves.
watch(
  () => [currentMin.value, currentMax.value],
  () => {
    minInput.value = String(currentMin.value);
    maxInput.value = String(currentMax.value);
  },
);
function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
function showPriceFilter(): ReturnType<GridFiltersState["showPriceFilter"]> {
  const mode = (props.portalMode as string) || "open";
  if (mode === "open") return true;
  return !!props.user;
}
function showAvailability(): ReturnType<GridFiltersState["showAvailability"]> {
  if (!props.showAvailabilityFilter) return false;
  return !isContentHidden(props.portalMode, props.user);
}
function getFilterName(
  filter: AttributeFilter,
): ReturnType<GridFiltersState["getFilterName"]> {
  return (filter as AttributeFilter)?.attributeDescription?.name || "";
}
// Resolve the label in the active language; falls back to the first
// description, then the raw attribute name.
function getFilterTitle(
  filter: AttributeFilter,
): ReturnType<GridFiltersState["getFilterTitle"]> {
  const descriptions = (filter as AttributeFilter)?.attributeDescription
    ?.descriptions;
  const lang = props.language?.toUpperCase();
  const match = lang
    ? descriptions?.find((d) => d?.language?.toUpperCase() === lang)
    : undefined;
  return (
    match?.value ||
    descriptions?.[0]?.value ||
    (filter as AttributeFilter)?.attributeDescription?.name ||
    ""
  );
}
function getFilteredFilters(): ReturnType<
  GridFiltersState["getFilteredFilters"]
> {
  const list = (props.filters as AttributeFilter[]) || [];
  return list.filter((f: AttributeFilter) => {
    const opts = (f?.textFilters as any[]) || [];
    return opts.some(
      (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0,
    );
  });
}
function getValidOptions(
  filter: AttributeFilter,
): ReturnType<GridFiltersState["getValidOptions"]> {
  return (((filter as AttributeFilter)?.textFilters as any[]) || []).filter(
    (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0,
  );
}
function getSelectedCount(): ReturnType<GridFiltersState["getSelectedCount"]> {
  let n = 0;
  const sel = selectedFilters.value as Record<string, string[]>;
  Object.keys(sel).forEach((k: string) => {
    n += (sel[k] || []).length;
  });
  // Unlike React's GridFilters (where the equivalent counter omits
  // availability and is never called), this counter IS used — include
  // availability so it stays accurate.
  if (availability.value === "in-stock") n += 1;
  return n;
}
function hasActiveFilters(): ReturnType<GridFiltersState["hasActiveFilters"]> {
  const sel = selectedFilters.value as Record<string, string[]>;
  const hasText = Object.keys(sel).some((k: string) => (sel[k] || []).length > 0);
  return hasText || availability.value === "in-stock";
}
function isSelected(
  filterName: string,
  value: string,
): ReturnType<GridFiltersState["isSelected"]> {
  return (
    (selectedFilters.value as Record<string, string[]>)[filterName] || []
  ).includes(value);
}
function isExpanded(
  filterName: string,
): ReturnType<GridFiltersState["isExpanded"]> {
  const stored = (expandedFilters.value as Record<string, boolean>)[filterName];
  if (stored === undefined) return props.collapsed === false;
  return !!stored;
}
function toggleAccordion(
  filterName: string,
): ReturnType<GridFiltersState["toggleAccordion"]> {
  const cur = !!(expandedFilters.value as Record<string, boolean>)[filterName];
  expandedFilters.value = {
    ...expandedFilters.value,
    [filterName]: !cur,
  };
}
function handleCheckbox(
  filter: AttributeFilter,
  value: string,
  checked: boolean,
): ReturnType<GridFiltersState["handleCheckbox"]> {
  const name = (filter as AttributeFilter)?.attributeDescription?.name || "";
  const cur = (selectedFilters.value as Record<string, string[]>)[name] || [];
  const next = checked
    ? [...cur, value]
    : cur.filter((v: string) => v !== value);
  selectedFilters.value = {
    ...selectedFilters.value,
    [name]: next,
  };
  if (next.length === 0) {
    expandedFilters.value = {
      ...expandedFilters.value,
      [name]: false,
    };
  }
  isPending.value = true;
  props.onFilterChange(filter, value);
  if (props.getSelectedFilters) props.getSelectedFilters();
}
function handleAvailabilityChange(
  value: Availability,
): ReturnType<GridFiltersState["handleAvailabilityChange"]> {
  const nextMinStock = value === "all" ? MIN_STOCK_THRESHOLD : minStock.value;
  availability.value = value;
  minStock.value = nextMinStock;
  minStockInput.value = String(nextMinStock);
  isPending.value = true;
  if (props.onAvailabilityChange) props.onAvailabilityChange(value, nextMinStock);
  if (props.getSelectedFilters) props.getSelectedFilters();
}
function handleMinStockChange(
  value: number,
): ReturnType<GridFiltersState["handleMinStockChange"]> {
  const n = Math.max(Math.floor(value) || MIN_STOCK_THRESHOLD, MIN_STOCK_THRESHOLD);
  const prev = minStock.value;
  minStock.value = n;
  minStockInput.value = String(n);
  if (n === prev) return;
  isPending.value = true;
  if (props.onAvailabilityChange) props.onAvailabilityChange(availability.value, n);
  if (props.getSelectedFilters) props.getSelectedFilters();
}
// Commit the raw buffer on blur/Enter; empty or non-numeric falls back to the minimum.
function commitMinStockInput(): ReturnType<GridFiltersState["commitMinStockInput"]> {
  const parsed = parseInt(minStockInput.value, 10);
  handleMinStockChange(isNaN(parsed) ? MIN_STOCK_THRESHOLD : parsed);
}
function handleMinChange(
  value: number,
): ReturnType<GridFiltersState["handleMinChange"]> {
  const n = value > currentMax.value ? currentMax.value : value;
  currentMin.value = n;
  minInput.value = String(n);
}
function handleMaxChange(
  value: number,
): ReturnType<GridFiltersState["handleMaxChange"]> {
  const n = value < currentMin.value ? currentMin.value : value;
  currentMax.value = n;
  maxInput.value = String(n);
}
// Commit the raw text buffers on blur/Enter. Empty / non-numeric falls back to
// the bound; the value is clamped into the valid range.
function commitMinInput(): void {
  const parsed = parseFloat(minInput.value);
  const value = isNaN(parsed) ? getMinBound() : parsed;
  const n = Math.min(Math.max(value, getMinBound()), currentMax.value);
  currentMin.value = n;
  minInput.value = String(n);
  applyPrice(n, currentMax.value);
}
function commitMaxInput(): void {
  const parsed = parseFloat(maxInput.value);
  const value = isNaN(parsed) ? getMaxBound() : parsed;
  const n = Math.min(Math.max(value, currentMin.value), getMaxBound());
  currentMax.value = n;
  maxInput.value = String(n);
  applyPrice(currentMin.value, n);
}
// Apply only when the committed range differs from what's already applied —
// re-applying an unchanged range produced no parent loading cycle, so isPending
// (which blurs/disables the whole panel) never cleared.
function applyPrice(
  min: number = currentMin.value,
  max: number = currentMax.value,
): ReturnType<GridFiltersState["applyPrice"]> {
  if (min === appliedMin.value && max === appliedMax.value) return;
  appliedMin.value = min;
  appliedMax.value = max;
  isPending.value = true;
  if (props.onPriceChange) props.onPriceChange(min, max);
  if (props.getSelectedFilters) props.getSelectedFilters();
}
function clearAll(): ReturnType<GridFiltersState["clearAll"]> {
  selectedFilters.value = {};
  currentMin.value = (props.priceMin as number) || 0;
  currentMax.value = (props.priceMax as number) || 9999;
  availability.value = "all";
  minStock.value = MIN_STOCK_THRESHOLD;
  minStockInput.value = String(MIN_STOCK_THRESHOLD);
  if (props.onClearFilters) props.onClearFilters();
  if (props.getSelectedFilters) props.getSelectedFilters();
}
// Prefer `countActive`. Once a group has a selection, `count` is the
// INTERSECTION with that selection — for an unticked sibling in a multi-select
// (OR) group that is "products carrying both values", which is near-meaningless
// and reads as a wildly low total: a season facet showing "(1)" that adds 2
// products when ticked. `countActive` is the same option counted with its own
// group's filters lifted (other groups still applied), which is what the option
// actually contributes. With no selection in the group the backend returns
// count === countActive, so this is a no-op there.
function getCount(option: any): ReturnType<GridFiltersState["getCount"]> {
  const c = option?.count || 0;
  const ca = option?.countActive || 0;
  return ca > 0 ? ca : c;
}
function getMinBound(): ReturnType<GridFiltersState["getMinBound"]> {
  return (props.priceMin as number) || 0;
}
function getMaxBound(): ReturnType<GridFiltersState["getMaxBound"]> {
  return (props.priceMax as number) || 9999;
}
</script>
