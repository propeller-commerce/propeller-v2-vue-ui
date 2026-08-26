<script setup lang="ts">
/**
 * <QuickOrder> (Vue) — a bulk "quick order" pad. Each row has a SKU/code
 * typeahead; selecting a match fills the row's name / net price / min-quantity.
 * "Add to cart" resolves the user's cart and bulk-adds every resolved row in a
 * single `CartItemBulk` mutation (via {@link useQuickOrder}). Optionally accepts
 * a spreadsheet parser so users can upload an XLSX of code+quantity pairs.
 *
 * The typed code is only ever a *search term* — a row's product identity, name
 * and price always come from the API, never from the typed/uploaded value.
 *
 * Vue port of the React `<QuickOrder>`; identical behaviour and prop contract.
 */
import { ref, computed } from 'vue';
import type { Cart, Contact, Customer, GraphQLClient, MediaImageProductSearchInput, TransformationsInput } from '@propeller-commerce/propeller-sdk-v2';
import { formatPrice as _formatPrice, getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { localeForLanguage } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';
import { useQuickOrder, type QuickOrderMatch } from '../composables/vue/useQuickOrder';

// ── Types ────────────────────────────────────────────────────────────────────

/** A parsed spreadsheet line: a product code and a desired quantity. */
export interface QuickOrderUploadLine {
  code: string;
  quantity: number;
}

export interface QuickOrderProps {
  /** The authenticated user. Resolved from PropellerProvider when omitted. */
  user?: Contact | Customer | null;
  /** GraphQL client. Resolved from PropellerProvider when omitted. */
  graphqlClient?: GraphQLClient;
  /** Active company id — scopes cart + pricing for B2B users. */
  companyId?: number;
  /** Language for search/cart queries. Defaults to `'NL'`. */
  language?: string;
  /** Currency symbol/code shown next to prices. Defaults to `'€'`. */
  currency?: string;
  /**
   * Image filters forwarded to the typeahead + cart queries so results carry
   * thumbnails (same values the SearchBar uses). Without them the API returns
   * no image variants and the dropdown shows no product images.
   */
  configuration?: {
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersSmall?: TransformationsInput;
    /**
     * Catalog root the code search is scoped to. Required: without it the
     * typeahead and the upload resolve nothing, since searching outside a
     * category ignores orderlist scoping and would surface products the user
     * has no access to.
     */
    baseCategoryId?: number;
    /** The channel's anonymous user — logged-out listings are scoped to it. */
    anonymousUserId?: number;
  };
  /** Tax zone for price calculation. Defaults to `'NL'`. */
  taxZone?: string;
  /** Orderlist (contract) ids to scope the catalogue by. */
  orderlistIds?: number[];
  /** Set `false` to ignore `orderlistIds`. Defaults to true when ids are given. */
  applyOrderlists?: boolean;
  /** Number of blank rows to start with. Defaults to 5. */
  initialRows?: number;
  /** Minimum characters before the typeahead fires. Defaults to 3. */
  searchThreshold?: number;
  /** Typeahead debounce in ms. Defaults to 300. */
  debounceMs?: number;
  /**
   * Optional spreadsheet parser. When supplied, the XLSX upload panel is shown;
   * the app parses the file (e.g. via SheetJS) and returns code+quantity lines.
   * Kept as a prop so the package stays free of a heavy xlsx dependency.
   */
  parseSpreadsheet?: (file: File) => Promise<QuickOrderUploadLine[]>;
  /** URL to a downloadable XLSX template. */
  templateUrl?: string;

  /**
   * Called when the template link is clicked. Navigation is untouched — this
   * is a notification, not a handler: a buyer fetching the template is a
   * quick-order intent signal that otherwise leaves no trace at all.
   */
  onTemplateDownload?: () => void;
  /** Max upload file size in bytes. Defaults to 2 MB. */
  maxUploadBytes?: number;
  /** Max rows accepted from an upload. Defaults to 500. */
  maxUploadRows?: number;
  /** Format a price. Defaults to the shared helper (renders the symbol). */
  formatPrice?: (price: number) => string;
  /** Fires when the bulk add creates a fresh cart — persist the cart id. */
  onCartCreated?: (cart: Cart) => void;
  /** Fires after a successful add — receives the resulting cart. */
  afterAddToCart?: (cart: Cart) => void;
  /** Fires when some uploaded/entered codes could not be resolved. */
  onMissingCodes?: (codes: string[]) => void;
  /** Override base container styles. */
  className?: string;
  /** Localization label overrides. */
  labels?: Record<string, string>;
}

// ── Row model ────────────────────────────────────────────────────────────────

interface Row {
  key: string;
  code: string;
  productId: number | null;
  clusterId?: number;
  name: string;
  netPrice: number;
  quantity: number;
  minQuantity: number;
  matches: QuickOrderMatch[];
  searching: boolean;
  /** `true` once a search completed for the current input (drives "no results"). */
  searched: boolean;
}

let ROW_SEQ = 0;
function blankRow(): Row {
  ROW_SEQ += 1;
  return {
    key: `qo-${ROW_SEQ}`,
    code: '',
    productId: null,
    name: '',
    netPrice: 0,
    quantity: 1,
    minQuantity: 1,
    matches: [],
    searching: false,
    searched: false,
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

const props = defineProps<QuickOrderProps>();
const infra = useInfraProps(props);

const currency = computed(() => props.currency ?? '€');
const language = computed(() => (infra.language as string) ?? props.language ?? 'NL');
const searchThreshold = computed(() => props.searchThreshold ?? 3);
const debounceMs = computed(() => props.debounceMs ?? 300);
const initialRows = computed(() => Math.max(1, props.initialRows ?? 5));
const maxUploadBytes = computed(() => props.maxUploadBytes ?? 2 * 1024 * 1024);
const maxUploadRows = computed(() => props.maxUploadRows ?? 500);

function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}

// Price formatter — a consumer-supplied `formatPrice` wins (it owns its own
// symbol); otherwise the shared helper renders the symbol via `symbol: currency`.
function displayPrice(n: number): string {
  return props.formatPrice ? props.formatPrice(n) : _formatPrice(n, { symbol: currency.value, locale: localeForLanguage(props.language) });
}

const { submitting, searchProducts, submit } = useQuickOrder({
  graphqlClient: infra.graphqlClient!,
  user: infra.user ?? null,
  companyId: infra.companyId,
  language: language.value,
  configuration: props.configuration,
  taxZone: props.taxZone,
  orderlistIds: props.orderlistIds,
  applyOrderlists: props.applyOrderlists,
  onCartCreated: props.onCartCreated,
  afterAddToCart: props.afterAddToCart,
});

const rows = ref<Row[]>(Array.from({ length: initialRows.value }, blankRow));
const missing = ref<string[]>([]);
const uploadError = ref<string | null>(null);
const uploading = ref(false);
const notice = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const searchTimers: Record<string, ReturnType<typeof setTimeout>> = {};

const resolvedCount = computed(() => rows.value.filter((r) => r.productId).length);

function patchRow(key: string, patch: Partial<Row>) {
  const i = rows.value.findIndex((r) => r.key === key);
  if (i !== -1) rows.value[i] = { ...rows.value[i], ...patch };
}

// ── Typeahead ────────────────────────────────────────────────────────────────
function onCodeInput(key: string, value: string) {
  patchRow(key, { code: value, productId: null, name: '', netPrice: 0, searched: false });
  notice.value = null;
  if (searchTimers[key]) clearTimeout(searchTimers[key]);
  if (value.trim().length < searchThreshold.value) {
    patchRow(key, { matches: [], searching: false, searched: false });
    return;
  }
  patchRow(key, { searching: true });
  searchTimers[key] = setTimeout(async () => {
    const results = await searchProducts(value);
    patchRow(key, { matches: results, searching: false, searched: true });
  }, debounceMs.value);
}

function selectMatch(key: string, match: QuickOrderMatch) {
  const dup = rows.value.some((r) => r.key !== key && r.productId && r.code === match.sku);
  if (dup) {
    notice.value = getLabel('alreadyInList', 'Product is already in the list');
    patchRow(key, { code: '', matches: [], productId: null, name: '', netPrice: 0, searched: false });
    return;
  }
  patchRow(key, {
    code: match.sku,
    productId: match.productId,
    clusterId: match.clusterId,
    name: match.name,
    netPrice: match.netPrice,
    quantity: match.minQuantity,
    minQuantity: match.minQuantity,
    matches: [],
    searching: false,
    searched: false,
  });
}

function setQuantity(key: string, raw: string) {
  const n = parseInt(raw, 10);
  const i = rows.value.findIndex((r) => r.key === key);
  if (i === -1) return;
  const r = rows.value[i];
  rows.value[i] = { ...r, quantity: Number.isFinite(n) && n > 0 ? Math.max(r.minQuantity, n) : r.minQuantity };
}

function addRow() {
  rows.value = [...rows.value, blankRow()];
}
function removeRow(key: string) {
  if (rows.value.length > 1) rows.value = rows.value.filter((r) => r.key !== key);
}

// ── XLSX upload ────────────────────────────────────────────────────────────────
async function onFileChosen(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !props.parseSpreadsheet) return;
  uploadError.value = null;
  missing.value = [];
  if (file.size > maxUploadBytes.value) {
    uploadError.value = `File too large (max ${Math.round(maxUploadBytes.value / 1024 / 1024)} MB)`;
    return;
  }
  uploading.value = true;
  try {
    let lines = await props.parseSpreadsheet(file);
    lines = lines
      .slice(0, maxUploadRows.value)
      .map((l) => ({ code: String(l.code ?? '').trim(), quantity: Math.max(1, parseInt(String(l.quantity), 10) || 1) }))
      .filter((l) => l.code.length > 0);
    if (!lines.length) {
      uploadError.value = 'No valid rows found in the file';
      return;
    }
    const resolved: Row[] = [];
    const notFound: string[] = [];
    for (const line of lines) {
      const matches = await searchProducts(line.code);
      const exact = matches.find((m) => m.sku.toLowerCase() === line.code.toLowerCase()) || matches[0];
      if (!exact) {
        notFound.push(line.code);
        continue;
      }
      if (resolved.some((r) => r.productId === exact.productId)) continue;
      resolved.push({
        ...blankRow(),
        code: exact.sku,
        productId: exact.productId,
        clusterId: exact.clusterId,
        name: exact.name,
        netPrice: exact.netPrice,
        quantity: Math.max(exact.minQuantity, line.quantity),
        minQuantity: exact.minQuantity,
      });
    }
    if (resolved.length) rows.value = [...resolved, blankRow()];
    if (notFound.length) {
      missing.value = notFound;
      props.onMissingCodes?.(notFound);
    }
  } catch {
    uploadError.value = 'Could not read the file';
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  const lines = rows.value
    .filter((r) => r.productId)
    .map((r) => ({ productId: r.productId as number, quantity: r.quantity, clusterId: r.clusterId, code: r.code }));
  if (!lines.length) {
    notice.value = getLabel('noItems', 'Add at least one product before submitting');
    return;
  }
  const res = await submit(lines);
  if (res.success) {
    rows.value = Array.from({ length: initialRows.value }, blankRow);
    missing.value = [];
    notice.value = null;
  } else {
    notice.value = res.error ?? 'Failed to add items to cart';
  }
}
</script>

<template>
  <div :class="className ?? 'propeller-quick-order'">
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Upload panel (only when a parser is supplied) -->
      <div v-if="parseSpreadsheet" class="w-full lg:w-1/3">
        <h3 class="text-lg font-semibold mb-3 text-foreground">{{ getLabel('uploadTitle', 'Upload Excel file') }}</h3>
        <a
          v-if="templateUrl"
          :href="templateUrl"
          target="_blank"
          rel="noopener nofollow"
          class="text-primary hover:underline text-sm inline-block mb-4"
          @click="onTemplateDownload?.()"
        >{{ getLabel('downloadTemplate', 'Download XLSX template') }}</a>
        <p class="text-xs text-muted-foreground mb-3">
          {{ getLabel('uploadHint', 'Column A: article no. / SKU — Column B: quantity. First two rows are ignored.') }}
        </p>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          class="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          :disabled="uploading"
          @change="onFileChosen"
        />
        <p v-if="uploading" class="text-sm text-muted-foreground mt-2">{{ getLabel('upload', 'Uploading…') }}</p>
        <p v-if="uploadError" class="text-sm text-destructive mt-2">{{ uploadError }}</p>
      </div>

      <!-- Manual row pad -->
      <div class="flex-1">
        <h3 class="text-lg font-semibold mb-3 text-foreground">{{ getLabel('title', 'Add your products manually') }}</h3>

        <!-- Header -->
        <div class="hidden md:grid grid-cols-12 gap-2 px-2 pb-2 text-xs font-medium text-muted-foreground border-b border-border">
          <div class="col-span-3">{{ getLabel('colCode', 'Article no. / SKU') }}</div>
          <div class="col-span-3">{{ getLabel('colName', 'Product name') }}</div>
          <div class="col-span-2">{{ getLabel('colPrice', 'excl. VAT') }}</div>
          <div class="col-span-1">{{ getLabel('colQuantity', 'Qty') }}</div>
          <div class="col-span-2 text-right">{{ getLabel('colTotal', 'Total') }}</div>
          <div class="col-span-1" />
        </div>

        <!-- Rows -->
        <div class="divide-y divide-border">
          <div v-for="r in rows" :key="r.key" class="grid grid-cols-12 gap-2 items-center py-2 relative">
            <!-- Code + typeahead -->
            <div class="col-span-12 md:col-span-3 relative">
              <input
                type="text"
                :value="r.code"
                :readonly="!!r.productId"
                :placeholder="getLabel('colCode', 'Article no. / SKU')"
                class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                @input="onCodeInput(r.key, ($event.target as HTMLInputElement).value)"
              />
              <ul
                v-if="(r.searching || r.matches.length > 0 || r.searched) && !r.productId"
                class="absolute z-20 mt-1 w-[320px] max-w-[90vw] bg-card border border-border rounded shadow-lg max-h-72 overflow-auto"
              >
                <li v-if="r.searching" class="px-3 py-2 text-sm text-muted-foreground">…</li>
                <template v-else-if="r.matches.length">
                  <li v-for="m in r.matches" :key="`${r.key}-${m.productId}`">
                    <button
                      type="button"
                      class="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      @click="selectMatch(r.key, m)"
                    >
                      <img v-if="m.imageUrl" :src="m.imageUrl" alt="" width="32" height="32" class="rounded object-cover" />
                      <span class="flex-1">
                        <span class="block text-foreground">{{ m.name }}</span>
                        <span v-if="m.sku" class="block text-xs text-muted-foreground">SKU: {{ m.sku }}</span>
                      </span>
                    </button>
                  </li>
                </template>
                <li v-else class="px-3 py-2 text-sm text-muted-foreground">{{ getLabel('noResults', 'No results found') }}</li>
              </ul>
            </div>

            <!-- Name -->
            <div class="col-span-6 md:col-span-3">
              <input type="text" :value="r.name" disabled class="w-full rounded border border-input bg-muted/40 px-2 py-1.5 text-sm text-muted-foreground" />
            </div>

            <!-- Net price -->
            <div class="col-span-3 md:col-span-2">
              <input type="text" :value="r.productId ? displayPrice(r.netPrice) : ''" disabled class="w-full rounded border border-input bg-muted/40 px-2 py-1.5 text-sm text-muted-foreground" />
            </div>

            <!-- Quantity -->
            <div class="col-span-3 md:col-span-1">
              <input
                type="number"
                :min="r.minQuantity"
                :step="1"
                :value="r.productId ? r.quantity : ''"
                :disabled="!r.productId"
                class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/40"
                @input="setQuantity(r.key, ($event.target as HTMLInputElement).value)"
                @keydown="(e: KeyboardEvent) => { if (['e','E','+','-','.'].includes(e.key)) e.preventDefault() }"
              />
            </div>

            <!-- Line total -->
            <div class="col-span-9 md:col-span-2 text-right text-sm text-foreground whitespace-nowrap">
              {{ r.productId ? displayPrice(r.netPrice * r.quantity) : '' }}
            </div>

            <!-- Remove -->
            <div class="col-span-3 md:col-span-1 flex justify-end">
              <button type="button" :aria-label="getLabel('remove', 'Remove')" class="text-muted-foreground hover:text-destructive p-1" @click="removeRow(r.key)">✕</button>
            </div>
          </div>
        </div>

        <!-- Add row -->
        <button type="button" class="mt-3 text-primary hover:underline text-sm font-medium" @click="addRow">
          + {{ getLabel('addRow', 'Add more rows') }}
        </button>

        <!-- Missing codes -->
        <p v-if="missing.length" class="text-sm text-destructive mt-4">
          {{ getLabel('missingCodes', 'The following products were not added:') }} {{ missing.join(', ') }}
        </p>
        <p v-if="notice" class="text-sm text-destructive mt-2">{{ notice }}</p>

        <!-- Submit -->
        <div class="flex items-center justify-end mt-6 pt-4 border-t border-border">
          <button
            type="button"
            :disabled="submitting || resolvedCount === 0"
            class="bg-primary text-primary-foreground px-6 py-2.5 rounded font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSubmit"
          >
            {{ submitting ? getLabel('adding', 'Adding…') : getLabel('addToCart', 'Add to cart') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
