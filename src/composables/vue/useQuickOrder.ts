/**
 * useQuickOrder (Vue) — bulk "quick order" pad: resolve SKUs/codes to products
 * and add them all to the cart in a single bulk mutation. Vue port of the
 * React composable; same seams (`Category` + `CartItemBulk`).
 *
 *  - `searchProducts(term)` — product typeahead for a row (the component
 *    debounces). Scoped to `configuration.baseCategoryId` via the category
 *    resolver, the same path ProductGrid uses: the flat `products` resolver
 *    ignores orderlist scoping server-side and would return products outside
 *    the user's catalogue. Without a base category it returns nothing rather
 *    than falling back. Returns [] on empty/error (a typeahead must not throw).
 *  - `submit(lines)` — resolve/create the cart (shared `initCart`) then bulk-add
 *    every line via `CartService.bulkUpdateCartItems` (`CartItemBulk`).
 *
 * All product/price data comes from the API — a row's typed code is only ever a
 * *search term*, never trusted for the product identity or price.
 */

import { ref, type Ref } from 'vue';
import {
  ProductSearchableField,
  ProductSortField,
  ProductStatus,
  SortOrder,
} from '@propeller-commerce/propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
  Cart,
  CategoryProductSearchInput,
  CategoryQueryVariables,
  MediaImageProductSearchInput,
  TransformationsInput,
  CartItemBulkInput,
} from '@propeller-commerce/propeller-sdk-v2';
import type { AnyUser } from '@propeller-commerce/propeller-v2-core-ui';
import {
  createServices,
  getProductImageUrl,
  getClusterImageUrl,
} from '@propeller-commerce/propeller-v2-core-ui';
import { initCart } from '../shared/utils/cartInit';
import { resolveListingUserId } from '../shared/utils/listingUserId';

// ── Types ────────────────────────────────────────────────────────────────────

/** A product resolved from a typed code — the shape a row fills in on select. */
export interface QuickOrderMatch {
  productId: number;
  clusterId?: number;
  name: string;
  sku: string;
  netPrice: number;
  grossPrice: number;
  minQuantity: number;
  imageUrl: string;
}

/** One line a caller submits to be added to the cart. */
export interface QuickOrderLine {
  productId: number;
  quantity: number;
  clusterId?: number;
  code?: string;
}

export interface UseQuickOrderOptions {
  graphqlClient: GraphQLClient;
  /** The signed-in user (quick order is an authenticated feature). */
  user?: AnyUser;
  /** Active company id — scopes cart + pricing for B2B users. */
  companyId?: number;
  /** Language for search + cart queries. Defaults to `'NL'`. */
  language?: string;
  /** Max typeahead results per row. Defaults to 8. */
  searchLimit?: number;
  /** Tax zone for price calculation. Defaults to `'NL'`. */
  taxZone?: string;
  /** Orderlist (contract) ids to scope the catalogue by. */
  orderlistIds?: number[];
  /** Set `false` to ignore `orderlistIds`. Defaults to true when ids are given. */
  applyOrderlists?: boolean;
  /** Image filters + the base category the search is scoped to. */
  configuration?: {
    /** The channel's anonymous user — logged-out listings are scoped to it. */
    anonymousUserId?: number;
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersSmall?: TransformationsInput;
    /** Catalog root. Without it the search returns nothing — see `searchProducts`. */
    baseCategoryId?: number;
  };
  onCartCreated?: (cart: Cart) => void;
  afterAddToCart?: (cart: Cart) => void;
}

export interface QuickOrderSubmitResult {
  success: boolean;
  cart?: Cart;
  added?: number;
  error?: string;
}

export interface UseQuickOrderReturn {
  submitting: Ref<boolean>;
  error: Ref<string | null>;
  searchProducts: (term: string) => Promise<QuickOrderMatch[]>;
  submit: (lines: QuickOrderLine[]) => Promise<QuickOrderSubmitResult>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toMatch(item: Product | Cluster, language?: string): QuickOrderMatch {
  const isCluster = 'clusterId' in item;
  const displayItem = isCluster ? (item as Cluster).defaultProduct : (item as Product);
  const productId = (displayItem as Product)?.productId ?? (item as Product).productId;
  const clusterId = isCluster ? (item as Cluster).clusterId : undefined;
  const name =
    (language && item.names?.find((n) => n.language === language)?.value) ||
    item.names?.[0]?.value ||
    'Product';
  const netPrice = displayItem?.price?.net ?? 0;
  const grossPrice = displayItem?.price?.gross ?? 0;
  const minQuantity = Math.max(1, (displayItem as Product)?.minimumQuantity ?? 1);
  const imageUrl = isCluster
    ? getClusterImageUrl(item as Cluster)
    : getProductImageUrl(item as Product);
  return {
    productId,
    clusterId,
    name,
    sku: item.sku || displayItem?.sku || '',
    netPrice,
    grossPrice,
    minQuantity,
    imageUrl,
  };
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useQuickOrder(options: UseQuickOrderOptions): UseQuickOrderReturn {
  const {
    graphqlClient,
    user,
    companyId,
    configuration = {},
    onCartCreated,
    afterAddToCart,
  } = options;
  const language = options.language || 'NL';
  const searchLimit = options.searchLimit ?? 8;
  const taxZone = options.taxZone || 'NL';
  const { orderlistIds, applyOrderlists } = options;

  const submitting = ref(false);
  const error = ref<string | null>(null);

  async function searchProducts(term: string): Promise<QuickOrderMatch[]> {
    const trimmed = term.trim();
    if (!trimmed || !graphqlClient) return [];
    // No catalog root means no scope to search within. Fail closed rather than
    // fall back to the flat resolver, which would leak the whole catalogue.
    const catId = configuration.baseCategoryId ?? 0;
    if (!catId) return [];
    try {
      const service = createServices(graphqlClient).category;

      // Apply the contract when ids are supplied, else explicitly disable so an
      // authenticated user without one still searches the full catalogue.
      const orderlistScope =
        orderlistIds && orderlistIds.length > 0
          ? { applyOrderlists: applyOrderlists !== false, orderlistIds }
          : { applyOrderlists: false };

      const userId = resolveListingUserId(user, configuration);
      const contactId: number | undefined =
        user && 'contactId' in user ? (user as { contactId?: number }).contactId : undefined;
      const customerId: number | undefined =
        user && 'customerId' in user ? (user as { customerId?: number }).customerId : undefined;

      const input = {
        term: trimmed,
        language,
        page: 1,
        offset: searchLimit,
        statuses: [ProductStatus.A, ProductStatus.P, ProductStatus.T, ProductStatus.S],
        hidden: false,
        sortInputs: [{ field: ProductSortField.RELEVANCE, order: SortOrder.DESC }],
        ...(companyId && { companyId }),
        ...(userId !== undefined && { userId }),
        ...orderlistScope,
        searchFields: [
          {
            fieldNames: [
              ProductSearchableField.SKU,
              ProductSearchableField.NAME,
              ProductSearchableField.KEYWORDS,
              ProductSearchableField.CUSTOM_KEYWORDS,
            ],
            boost: 5,
          },
          {
            fieldNames: [
              ProductSearchableField.MANUFACTURER_CODE,
              ProductSearchableField.EAN_CODE,
              ProductSearchableField.BAR_CODE,
              ProductSearchableField.SUPPLIER_CODE,
              ProductSearchableField.PRODUCT_ID,
            ],
            boost: 1,
          },
        ],
      } as CategoryProductSearchInput & {
        applyOrderlists?: boolean;
        orderlistIds?: number[];
      };

      const variables = {
        categoryId: catId,
        language,
        categoryProductSearchInput: input,
        priceCalculateProductInput: {
          taxZone,
          ...(companyId && { companyId }),
          ...(contactId !== undefined && { contactId }),
          ...(customerId !== undefined && { customerId }),
        },
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall as TransformationsInput,
      } as CategoryQueryVariables;

      const response = await service.getCategory(variables);
      const items = ((response?.products as { items?: unknown[] } | undefined)?.items ??
        []) as (Product | Cluster)[];
      return items.map((it) => toMatch(it, language));
    } catch {
      return [];
    }
  }

  async function submit(lines: QuickOrderLine[]): Promise<QuickOrderSubmitResult> {
    const valid = lines.filter((l) => l.productId && (l.quantity ?? 0) > 0);
    if (!valid.length) return { success: false, error: 'No items to add' };
    if (!graphqlClient) return { success: false, error: 'No GraphQL client' };

    submitting.value = true;
    error.value = null;
    try {
      const services = createServices(graphqlClient);
      const cart = await initCart({
        graphqlClient,
        user: user ?? null,
        companyId,
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
        onCartCreated,
      });

      const items: CartItemBulkInput[] = valid.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        ...(l.clusterId ? { clusterId: l.clusterId } : {}),
      }));

      const bulk = await services.cart.bulkUpdateCartItems({
        input: { cartId: cart.cartId, items },
      });

      // Re-hydrate the cart (the bulk mutation returns counts, not the cart).
      const updated = await services.cart.getCart({
        cartId: cart.cartId,
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid as MediaImageProductSearchInput,
        imageVariantFilters: configuration.imageVariantFiltersSmall as TransformationsInput,
      });
      const finalCart = updated ?? cart;

      afterAddToCart?.(finalCart);
      return {
        success: true,
        cart: finalCart,
        added: (bulk?.created ?? 0) + (bulk?.updated ?? 0),
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add items to cart';
      error.value = msg;
      return { success: false, error: msg };
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, error, searchProducts, submit };
}
