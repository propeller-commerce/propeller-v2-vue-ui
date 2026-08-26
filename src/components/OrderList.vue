<template>
  <div
    :class="`propeller-order-list ${className || ''}`"
    :data-loading="loading ? 'true' : 'false'"
  >
    <template v-if="enableSearch && searchFields.length > 0">
      <div
        class="propeller-order-list__filters mb-6 bg-card p-4 rounded-[var(--radius-container)] shadow space-y-4"
      >
        <template v-if="searchFields.includes('term')">
          <div class="propeller-order-list__search-field w-full">
            <label
              class="propeller-order-list__filter-label block text-sm font-medium text-muted-foreground capitalize mb-1"
              >{{ getColumnLabel("term") }}</label
            ><input
              type="text"
              :placeholder='getLabel("searchPlaceholder", "Search...")'
              class="propeller-order-list__search-input block w-full rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
              :value="searchForm.term || ''"
              @input="
                async (e) => {
                  searchForm = {
                    ...searchForm,
                    term: (e.target as HTMLInputElement).value,
                  };
                }
              "
              @keydown="
                async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchForm = {
                      ...searchForm,
                      term: (e.target as HTMLInputElement).value,
                    };
                    fetchOrders(1);
                  }
                }
              "
            />
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <template
            :key="field"
            v-for="(field, index) in searchFields.filter((f) => f !== 'term')"
          >
            <div class="space-y-1">
              <label
                class="propeller-order-list__filter-label block text-sm font-medium text-muted-foreground capitalize"
                >{{ getColumnLabel(field) }}</label
              >
              <template v-if="field === 'createdAt'">
                <div class="flex space-x-2 w-full">
                  <input
                    type="date"
                    :placeholder='getLabel("dateFromPlaceholder", "From")'
                    :min="dateMin"
                    :max="dateMax"
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="
                      searchForm.createdAt?.greaterThan
                        ? searchForm.createdAt.greaterThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.createdAt || {};
                        const sanitized = sanitizeDateInput((e.target as HTMLInputElement).value);
                        if ((e.target as HTMLInputElement).value && !sanitized) {
                          (e.target as HTMLInputElement).value = current.greaterThan
                            ? current.greaterThan.split('T')[0]
                            : '';
                          return;
                        }
                        searchForm = {
                          ...searchForm,
                          createdAt: {
                            ...current,
                            greaterThan: sanitized ? `${sanitized}T00:00:00Z` : undefined,
                          },
                        };
                      }
                    "
                  /><input
                    type="date"
                    :placeholder='getLabel("dateToPlaceholder", "To")'
                    :min="dateMin"
                    :max="dateMax"
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="
                      searchForm.createdAt?.lessThan
                        ? searchForm.createdAt.lessThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.createdAt || {};
                        const sanitized = sanitizeDateInput((e.target as HTMLInputElement).value);
                        if ((e.target as HTMLInputElement).value && !sanitized) {
                          (e.target as HTMLInputElement).value = current.lessThan
                            ? current.lessThan.split('T')[0]
                            : '';
                          return;
                        }
                        searchForm = {
                          ...searchForm,
                          createdAt: {
                            ...current,
                            lessThan: sanitized ? `${sanitized}T23:59:59Z` : undefined,
                          },
                        };
                      }
                    "
                  />
                </div>
              </template>

              <template v-if="field === 'lastModifiedAt'">
                <div class="flex space-x-2 w-full">
                  <input
                    type="date"
                    :placeholder='getLabel("dateFromPlaceholder", "From")'
                    :min="dateMin"
                    :max="dateMax"
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="
                      searchForm.lastModifiedAt?.greaterThan
                        ? searchForm.lastModifiedAt.greaterThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.lastModifiedAt || {};
                        const sanitized = sanitizeDateInput((e.target as HTMLInputElement).value);
                        if ((e.target as HTMLInputElement).value && !sanitized) {
                          (e.target as HTMLInputElement).value = current.greaterThan
                            ? current.greaterThan.split('T')[0]
                            : '';
                          return;
                        }
                        searchForm = {
                          ...searchForm,
                          lastModifiedAt: {
                            ...current,
                            greaterThan: sanitized ? `${sanitized}T00:00:00Z` : undefined,
                          },
                        };
                      }
                    "
                  /><input
                    type="date"
                    :placeholder='getLabel("dateToPlaceholder", "To")'
                    :min="dateMin"
                    :max="dateMax"
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="
                      searchForm.lastModifiedAt?.lessThan
                        ? searchForm.lastModifiedAt.lessThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.lastModifiedAt || {};
                        const sanitized = sanitizeDateInput((e.target as HTMLInputElement).value);
                        if ((e.target as HTMLInputElement).value && !sanitized) {
                          (e.target as HTMLInputElement).value = current.lessThan
                            ? current.lessThan.split('T')[0]
                            : '';
                          return;
                        }
                        searchForm = {
                          ...searchForm,
                          lastModifiedAt: {
                            ...current,
                            lessThan: sanitized ? `${sanitized}T23:59:59Z` : undefined,
                          },
                        };
                      }
                    "
                  />
                </div>
              </template>

              <template v-if="field === 'price'">
                <div class="flex space-x-2 w-full">
                  <input
                    type="number"
                    :placeholder='getLabel("priceMinPlaceholder", "Min")'
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="searchForm.price?.greaterThan || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.price || {};
                        searchForm = {
                          ...searchForm,
                          price: {
                            ...current,
                            greaterThan: parseFloat((e.target as HTMLInputElement).value),
                          },
                        };
                      }
                    "
                  /><input
                    type="number"
                    :placeholder='getLabel("priceMaxPlaceholder", "Max")'
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="searchForm.price?.lessThan || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.price || {};
                        searchForm = {
                          ...searchForm,
                          price: {
                            ...current,
                            lessThan: parseFloat((e.target as HTMLInputElement).value),
                          },
                        };
                      }
                    "
                  />
                </div>
              </template>

              <template v-if="field === 'sortInput'">
                <div class="flex space-x-2 w-full">
                  <select
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="searchForm.sortInput?.field || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.sortInput || {};
                        searchForm = {
                          ...searchForm,
                          sortInput: {
                            ...current,
                            field: (e.target as HTMLInputElement).value as OrderSortField,
                          },
                        };
                      }
                    "
                  >
                    <option value="">{{ getLabel("sortFieldOption", "Sort Field") }}</option>
                    <template
                      :key="sortField"
                      v-for="(sortField, index) in Object.values(
                        OrderSortField,
                      )"
                    >
                      <option :value="sortField">{{ getLabel(sortField, sortField) }}</option>
                    </template></select
                  ><select
                    class="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="searchForm.sortInput?.order || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.sortInput || {};
                        searchForm = {
                          ...searchForm,
                          sortInput: {
                            ...current,
                            order: (e.target as HTMLInputElement).value as SortOrder,
                          },
                        };
                      }
                    "
                  >
                    <option value="">{{ getLabel("sortOrderOption", "Order") }}</option>
                    <template
                      :key="order"
                      v-for="(order, index) in Object.values(SortOrder)"
                    >
                      <option :value="order">{{ getLabel(order, order) }}</option>
                    </template>
                  </select>
                </div>
              </template>

              <template v-if="field === 'type'">
                <div class="flex space-x-2">
                  <select
                    class="propeller-order-list__filter-input block w-full rounded-[var(--radius-control)] border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                    :value="searchForm.type || ''"
                    @change="
                      async (e) => {
                        searchForm = {
                          ...searchForm,
                          type: (e.target as HTMLInputElement).value as OrderType,
                        };
                      }
                    "
                  >
                    <option value="">{{ getLabel("typeOption", "Type") }}</option>
                    <template
                      :key="type"
                      v-for="(type, index) in Object.values(OrderType)"
                    >
                      <option :value="type">{{ getLabel(type, type) }}</option>
                    </template>
                  </select>
                </div>
              </template>
            </div>
          </template>
        </div>
        <div
          class="propeller-order-list__filter-actions flex justify-end space-x-2"
        >
          <button
            class="propeller-order-list__clear-btn inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-[var(--radius-control)] shadow-sm text-muted-foreground bg-card hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            @click="
              async (event) => {
                resetSearch();
                props.onSearchApply?.({});
              }
            "
          >
            {{ getLabel("clearButton", "Clear") }}</button
          ><button
            class="propeller-order-list__search-btn inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-[var(--radius-control)] shadow-sm text-primary-foreground bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            @click="
              async (event) => {
                fetchOrders(1);
                props.onSearchApply?.(searchForm);
              }
            "
          >
            {{ getLabel("searchButton", "Search") }}
          </button>
        </div>
      </div>
    </template>

    <template v-if="!loading || orders.length > 0">
      <template v-if="orders.length > 0">
        <div
          :class="`propeller-order-list__results${flat ? '' : ' bg-card rounded-[var(--radius-container)] shadow'} overflow-hidden`"
        >
          <div class="overflow-x-auto">
            <table
              class="propeller-order-list__table min-w-full divide-y divide-gray-200"
            >
              <thead v-if="!hideHeader" class="propeller-order-list__thead bg-surface-hover">
                <tr>
                  <template :key="col" v-for="(col, index) in columns">
                    <th
                      :data-column="col"
                      :class="`propeller-order-list__th px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                        col === 'action' || col === 'total' ? 'text-right' : ''
                      }`"
                    >
                      {{ getColumnLabel(col) }}
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody
                class="propeller-order-list__tbody bg-card divide-y divide-gray-200"
              >
                <template :key="order.id" v-for="(order, index) in orders">
                  <tr
                    :class="`propeller-order-list__row hover:bg-surface-hover ${rowsClickable ? 'cursor-pointer' : ''}`"
                    :data-clickable="rowsClickable ? 'true' : 'false'"
                    @click="
                      async (event) => rowsClickable && onOrderClick(order.id)
                    "
                  >
                    <template :key="col" v-for="(col, index) in columns">
                      <td
                        :data-column="col"
                        :class="`propeller-order-list__cell px-6 py-4 whitespace-nowrap text-sm ${
                          col === 'id' || col === 'action'
                            ? 'font-medium'
                            : 'text-muted-foreground'
                        } ${col === 'action' || col === 'total' ? 'text-right' : ''}`"
                      >
                        <template v-if="col === 'id'">
                          <span
                            class="propeller-order-list__order-id text-foreground"
                            >{{ order.id }}</span
                          >
                        </template>

                        <template v-if="col === 'date'">
                          {{ formatDate((order as unknown as Record<string, string>).date || order.createdAt || "") }}
                        </template>

                        <template v-if="col === 'status'">
                          <span
                            :data-status="order.status"
                            :class="`propeller-order-list__status px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              order.status,
                            )}`"
                            >{{ statusLabel(order.status) }}</span
                          >
                        </template>

                        <template v-if="col === 'total'">
                          {{ formatPrice(order.total?.net) }}
                        </template>

                        <template v-if="col === 'action' && !rowsClickable">
                          <button
                            class="propeller-order-list__action-btn text-primary hover:text-primary/70 cursor-pointer"
                            @click="
                              async (event) => {
                                event.preventDefault();
                                onOrderClick(order.id);
                              }
                            "
                          >
                            {{ getLabel("view", "View") }}
                          </button>
                        </template>

                        <template v-if="col === 'validUntil'">
                          {{ formatDate(order.validUntil || "") }}
                        </template>

                        <template
                          v-if="
                            ![
                              'id',
                              'date',
                              'status',
                              'total',
                              'action',
                              'validUntil',
                            ].includes(col)
                          "
                        >
                          {{ (order as unknown as Record<string, unknown>)[col] }}
                        </template>
                      </td>
                    </template>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <template v-if="!hidePagination && totalPages > 1">
            <div
              class="propeller-order-list__pagination bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6"
            >
              <div
                class="propeller-order-list__pagination-mobile flex-1 flex justify-between sm:hidden"
              >
                <button
                  class="propeller-order-list__pagination-btn relative inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-[var(--radius-control)] text-muted-foreground bg-card hover:bg-surface-hover disabled:opacity-50"
                  @click="async (event) => goToPage(currentPage - 1)"
                  :disabled="currentPage === 1"
                >
                  {{ getLabel("previous", "Previous") }}</button
                ><button
                  class="propeller-order-list__pagination-btn ml-3 relative inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-[var(--radius-control)] text-muted-foreground bg-card hover:bg-surface-hover disabled:opacity-50"
                  @click="async (event) => goToPage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                >
                  {{ getLabel("next", "Next") }}
                </button>
              </div>
              <div
                class="propeller-order-list__pagination-desktop hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"
              >
                <div>
                  <p
                    class="propeller-order-list__pagination-summary text-sm text-muted-foreground"
                  >
                    {{ getLabel("showingPage", "Showing page") }}&nbsp;<span
                      class="font-medium"
                      >{{ currentPage }}</span
                    >&nbsp;{{ getLabel("of", "of") }}&nbsp;<span
                      class="font-medium"
                      >{{ totalPages }}</span
                    >
                  </p>
                </div>
                <div>
                  <nav
                    :aria-label='getLabel("paginationAriaLabel", "Pagination")'
                    class="propeller-order-list__pagination-nav relative z-0 inline-flex rounded-[var(--radius-control)] shadow-sm -space-x-px"
                  >
                    <button
                      class="propeller-order-list__pagination-btn relative inline-flex items-center px-2 py-2 rounded-l-[var(--radius-control)] border border-input bg-card text-sm font-medium text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                      @click="async (event) => goToPage(currentPage - 1)"
                      :disabled="currentPage === 1"
                    >
                      {{ getLabel("previous", "Previous") }}</button
                    ><button
                      class="propeller-order-list__pagination-btn relative inline-flex items-center px-2 py-2 rounded-r-[var(--radius-control)] border border-input bg-card text-sm font-medium text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                      @click="async (event) => goToPage(currentPage + 1)"
                      :disabled="currentPage === totalPages"
                    >
                      {{ getLabel("next", "Next") }}
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <template v-else>
        <div
          :class="`propeller-order-list__empty${flat ? '' : ' bg-card rounded-[var(--radius-container)] shadow'} p-8 text-center`"
        >
          <p class="text-muted-foreground mb-4">
            {{ getLabel("noOrders", "No orders found.") }}
          </p>
        </div>
      </template>
    </template>

    <template v-else>
      <!--
        A centred line of text collapsed the list to one row and then snapped it
        back, which is what made a language switch on the account pages look
        broken. Skeleton rows hold the layout instead.
      -->
      <div
        class="propeller-order-list__loading p-4"
        aria-busy="true"
        :aria-label="getLabel('loading', 'Loading orders...')"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="propeller-order-list__skeleton-row flex items-center gap-4 py-4 border-b border-border last:border-b-0 animate-pulse"
        >
          <div class="propeller-order-list__skeleton-line h-4 bg-surface-hover rounded w-24" />
          <div class="propeller-order-list__skeleton-line h-4 bg-surface-hover rounded w-32" />
          <div class="propeller-order-list__skeleton-line h-4 bg-surface-hover rounded w-20 ml-auto" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { Contact, Customer, GraphQLClient, Order, OrderSortField, OrderType, SortOrder } from "@propeller-commerce/propeller-sdk-v2";

import { useOrders, type OrderSearchForm } from "../composables/vue/useOrders";
import { formatPrice as _formatPrice } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface OrderListProps {
  /** The authenticated user (Contact or Customer). Resolved from PropellerProvider when omitted. */
  user?: Contact | Customer | null;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /** The initialized GraphQL Client instance. Resolved from PropellerProvider when omitted. */
  graphqlClient?: GraphQLClient;

  /** Callback when an order is clicked */
  onOrderClick: (orderId: number) => void;

  /** Columns to display. Defaults to ['id', 'date', 'status', 'total', 'action'] */
  columns?: string[];

  /** Label mapping for columns */
  columnConfig?: Record<string, string>;

  /** Enable searching */
  enableSearch?: boolean;

  /** Fields enabled for searching (UI inputs) */
  searchFields?: string[];

  /**
   * Seed the filter form on mount — typically rehydrated from the URL query so
   * a bookmarked/shared filtered view restores on reload. Pair with
   * `onSearchApply` so the page can keep the URL in sync when filters change.
   */
  initialSearchForm?: OrderSearchForm;

  /**
   * Fires when the user applies or clears filters (the "Search"/"Clear"
   * buttons). Receives the active filter form. Use it to persist the filters
   * to the URL — the component owns no router, so the page decides how (and
   * whether) to reflect them in `location`.
   */
  onSearchApply?: (form: OrderSearchForm) => void;

  /** Term fields configuration (backend) */
  termFields?: any[]; // Using any[] to avoid strict enum import issues for now, effectively OrderSearchFields[]

  /** Override company ID for order filtering (respects company switcher) */
  companyId?: number;

  /** Filter orders by these statuses */
  orderStatus?: string[];

  /** Override base styles */
  className?: string;

  /** Items per page default */
  initialItemsPerPage?: number;

  /** Rows are clickable */
  rowsClickable?: boolean;

  /** Show company orders */
  showCompanyOrders?: boolean;

  /** Hide pagination controls. Defaults to false. */
  hidePagination?: boolean;

  /** Hide the column header row. Defaults to false. */
  hideHeader?: boolean;

  /** Drop the results container's card chrome (background/border/shadow). Defaults to false. */
  flat?: boolean;

  /** Filter orders by channel IDs */
  channelIds?: number[];

  /** Format price */
  formatPrice?: (price: number) => string;

  /** Format date */
  formatDate?: (dateString: string) => string;

  /** Get status color */
  getStatusColor?: (status: string) => string;

  /**
   * Localized display labels for order/quote statuses, keyed by the raw backend
   * status value (e.g. `{ NEW: 'Nieuw', CONFIRMED: 'Bevestigd', REQUEST:
   * 'Aangevraagd' }`). Unknown statuses fall back to the raw value.
   */
  statusLabels?: Record<string, string>;

  /** Localization labels */
  labels?: {
    view?: string;
    previous?: string;
    next?: string;
    showingPage?: string;
    of?: string;
    noOrders?: string;
    loading?: string;
    order?: string;
    date?: string;
    status?: string;
    total?: string;
    action?: string;
  };

  /** Callback when a new cart is created during re-order */
  onCartCreated?: (cart: any) => void;

  /** Callback fired after all re-order items have been added */
  afterReorder?: (cart: any) => void;

  /** Configuration object (imageSearchFiltersGrid, imageVariantFiltersSmall, etc.) */
  configuration?: any;
}

interface OrderListState {
  columns: string[];
  rowsClickable: boolean;
  searchFields: string[];
  formatDate: (dateString: string) => string;
  formatPrice: (price: any) => string;
  getStatusColor: (status: string) => string;
  getColumnLabel: (col: string) => string;
  getLabel: (key: string, fallback: string) => string;
}

const props = withDefaults(defineProps<OrderListProps>(), {
  hideHeader: false,
  flat: false,
});
const infra = useInfraProps(props);

const userRef = computed(() => infra.user ?? null);
const companyRef = computed(() => infra.companyId);

const {
  orders,
  loading,
  error,
  searchForm,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  fetchOrders,
  goToPage,
  resetSearch,
} = useOrders({
  graphqlClient: infra.graphqlClient!,
  user: userRef,
  companyId: companyRef,
  itemsPerPage: props.initialItemsPerPage,
  orderStatuses: props.orderStatus,
  configuration: infra.configuration,
  channelIds: props.channelIds,
  onCartCreated: props.onCartCreated,
  afterReorder: props.afterReorder,
  initialSearchForm: props.initialSearchForm,
});

const columns = ref<OrderListState["columns"]>(
  props.columns || ["id", "date", "status", "total"],
);
const rowsClickable = ref<OrderListState["rowsClickable"]>(
  props.rowsClickable || false,
);

const searchFields = computed(() => {
  const fields = props.searchFields || [];
  if (props.enableSearch && !(fields as string[]).includes("term")) {
    return ["term", ...fields] as string[];
  }
  return fields;
});

const dateMin = "1970-01-01";
const dateMax = computed(() => new Date().toISOString().split("T")[0]);

// Returns a YYYY-MM-DD string only when the input value is a valid date in the
// allowed range; otherwise returns null. Native <input type="date"> happily
// accepts year-6 inputs ("0006-05-04") via keyboard, so we guard at the model layer.
function sanitizeDateInput(value: string): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1970 || year > new Date().getFullYear()) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

function formatDate(
  dateString: string,
): ReturnType<OrderListState["formatDate"]> {
  if (props.formatDate) return props.formatDate(dateString);
  if (!dateString) return "-";
  // Numeric day-first DD-MM-YYYY. `toLocaleDateString()` with no locale used
  // the runtime default (US M/D/YYYY on many hosts), misreading dates by months
  // on NL. Fixed, locale-neutral order; override via `props.formatDate`.
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
}
function formatPrice(price: number): ReturnType<OrderListState["formatPrice"]> {
  if (props.formatPrice) return props.formatPrice(price);
  if (!price) return "-";
  return _formatPrice(price, { symbol: infra.currency ?? "€", locale: localeForLanguage(infra.language) });
}
// Map the raw backend status to a localized label; unknown → raw value.
function statusLabel(status: string): string {
  return props.statusLabels?.[status] || status;
}
function getStatusColor(
  status: string,
): ReturnType<OrderListState["getStatusColor"]> {
  if (props.getStatusColor) return props.getStatusColor(status);
  switch (status) {
    case "COMPLETE":
    case "QUOTE_ACCEPTED":
      return "bg-secondary/10 text-secondary";
    case "CANCELLED":
    case "QUOTE_REJECTED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-warning/10 text-warning";
  }
}
function getColumnLabel(
  col: string,
): ReturnType<OrderListState["getColumnLabel"]> {
  if (props.columnConfig && props.columnConfig[col]) {
    return props.columnConfig[col];
  }
  // Translatable: consult labels with key 'col<Capitalized>'.
  const capitalized = col.charAt(0).toUpperCase() + col.slice(1);
  return _getLabel(props.labels, `col${capitalized}`, capitalized);
}
function getLabel(
  key: string,
  fallback: string,
): ReturnType<OrderListState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
</script>
