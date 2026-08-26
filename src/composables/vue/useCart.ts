/**
 * useCart (Vue) — Cart management composable.
 *
 * Covers: AddToCart, CartItem, CartSummary, ActionCode, CartIconAndSidebar.
 */

import { ref, computed, unref, type Ref, type ComputedRef } from 'vue';
import { CartStatus, CrossupsellType, PurchaseRole } from '@propeller-commerce/propeller-sdk-v2';
import type {
  GraphQLClient,
  Cart,
  CartMainItem,
  CartSearchInput,
  Product,
  Cluster,
  Contact,
  Customer,
  MediaImageProductSearchInput,
  TransformationsInput,
  PurchaseAuthorizationConfig,
  Crossupsell,
  CrossupsellsQueryVariables,
  CrossupsellSearchInput,
  CartProcessResponse,
} from '@propeller-commerce/propeller-sdk-v2';
import { initCart, type CartInitConfig } from '../shared/utils/cartInit';
import {
  isContact,
  isCustomer,
  createServices,
  ok,
  err,
  type AnyUser,
  type Result,
} from '@propeller-commerce/propeller-v2-core-ui';

export interface UseCartOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  /** Initial cart id. Accepts a plain string or a (computed) ref. */
  cartId?: string | Ref<string | undefined>;
  companyId?: Ref<number | undefined>;
  language?: Ref<string>;
  configuration: {
    language?: string;
    imageSearchFiltersGrid: MediaImageProductSearchInput;
    imageVariantFiltersSmall: TransformationsInput;
  };
  onCartCreated?: (cart: Cart) => void;
}

export interface AddItemOptions {
  product: Product;
  cluster?: Cluster;
  childItems?: number[];
  quantity: number;
  notes?: string;
  price?: number;
  onAddToCart?: (product: Product, clusterId?: number, quantity?: number, childItems?: { productId: number; quantity: number }[], notes?: string, price?: number) => Cart;
  afterAddToCart?: (cart: Cart, item: CartMainItem | null) => void;
  enableStockValidation?: boolean;
  cartId?: string;
  createCart?: boolean;
}

export interface GetCrossupsellsOptions {
  productId?: number;
  clusterId?: number;
  types?: string[];
  taxZone?: string;
  imageVariantFilters?: TransformationsInput;
}

export interface UseCartReturn {
  cart: Ref<Cart | null>;
  cartId: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  checkoutAllowed: ComputedRef<boolean>;
  resolveCart: () => Promise<Cart>;
  fetchActiveCart: () => Promise<Cart | null>;
  addItem: (
    options: AddItemOptions,
  ) => Promise<Result<{ cart: Cart; item: CartMainItem | null }, string>>;
  /**
   * Adds several products in one call, sequentially, threading the resolved
   * cart id from each add into the next. Stops at the first failure.
   */
  addItems: (
    items: AddItemOptions[],
  ) => Promise<Result<{ cart: Cart; items: (CartMainItem | null)[] }, string>>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<Cart | undefined>;
  updateItemNotes: (cartItemId: string, notes: string, debounceMs?: number) => void;
  deleteItem: (cartItemId: string) => Promise<Cart | undefined>;
  addActionCode: (code: string) => Promise<Cart | undefined>;
  removeActionCode: (code: string) => Promise<Cart | undefined>;
  requestAuthorization: () => Promise<Result<void, string>>;
  processCart: (orderStatus?: string) => Promise<Result<CartProcessResponse, string>>;
  getCrossupsells: (options: GetCrossupsellsOptions) => Promise<Crossupsell[]>;
  getMinQuantity: (product: Product | null | undefined) => number;
  getStep: (product: Product | null | undefined) => number;
}

export function useCart(options: UseCartOptions): UseCartReturn {
  const { graphqlClient, user, configuration, onCartCreated } = options;
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);
  const languageRef = options.language ?? ref('NL');

  const cart = ref<Cart | null>(null) as Ref<Cart | null>;
  // The caller's cart id has to keep winning AFTER setup. This used to unwrap
  // it once into a plain ref, so a component created before the cart resolved —
  // the header's cart sidebar renders on the first paint of every page — held
  // '' forever, and every id-guarded action failed silently: "Request
  // authorization" rendered enabled, fired, and returned `err('No cart')`
  //. Computed, so a ref passed by the host stays reactive and a
  // plain string still works.
  const createdCartId = ref('');
  const cartId = computed<string>(() => unref(options.cartId) || createdCartId.value);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let notesTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const checkoutAllowed = computed<boolean>(() => {
    const u = user.value;
    if (!u || !('contactId' in u)) return true;
    if (!companyIdRef.value) return true;
    if (!cart.value) return true;
    // Read tolerantly: the SDK can serialize class instances with leading
    // underscores on private fields. The auth store sanitizes on setUser, but
    // any data path that bypasses the store (or stale localStorage from a
    // previous session) can leave the user in the underscored shape. Use the
    // same defensive pattern as CartIconAndSidebar so cart and sidebar agree.
    const pacData: any = (u as any).purchaseAuthorizationConfigs ?? (u as any)._purchaseAuthorizationConfigs;
    const items: any[] = pacData?.items ?? pacData?._items ?? [];
    const purchaserPac = items.find((pac: any) => {
      const role = pac.purchaseRole ?? pac._purchaseRole;
      const pacCompanyId =
        pac.company?.companyId
        ?? pac.company?._companyId
        ?? pac._company?.companyId
        ?? pac._company?._companyId;
      return role === PurchaseRole.PURCHASER && pacCompanyId === companyIdRef.value;
    });
    if (!purchaserPac) return true;
    const limit = (purchaserPac as any).authorizationLimit ?? (purchaserPac as any)._authorizationLimit ?? 0;
    const totalGross = (cart.value as any)?.total?.totalGross ?? (cart.value as any)?._total?._totalGross ?? 0;
    return totalGross <= limit;
  });

  function getMinQuantity(product: Product | null | undefined): number {
    const min = product?.minimumQuantity;
    return min && min > 0 ? min : 1;
  }

  function getStep(product: Product | null | undefined): number {
    const unit = product?.unit;
    return unit && unit > 0 ? unit : 1;
  }

  async function resolveCart(): Promise<Cart> {
    const config: CartInitConfig = {
      graphqlClient, user: user.value, companyId: companyIdRef.value,
      language: languageRef.value || configuration.language || 'NL',
      imageSearchFilters: configuration.imageSearchFiltersGrid,
      imageVariantFilters: configuration.imageVariantFiltersSmall,
      onCartCreated: (c) => { cart.value = c; createdCartId.value = c.cartId; onCartCreated?.(c); },
    };
    const resolved = await initCart(config);
    cart.value = resolved;
    createdCartId.value = resolved.cartId;
    return resolved;
  }

  async function addItem(
    opts: AddItemOptions,
  ): Promise<Result<{ cart: Cart; item: CartMainItem | null }, string>> {
    loading.value = true; error.value = null;
    try {
      if (opts.enableStockValidation) {
        const available = opts.product.inventory?.totalQuantity ?? 0;
        if (available < opts.quantity) return err('Insufficient stock available');
      }
      const childItemInputs = opts.childItems?.map((id) => ({ productId: id, quantity: opts.quantity }));

      if (opts.onAddToCart) {
        const resultCart = opts.onAddToCart(opts.product, opts.cluster?.clusterId, opts.quantity, childItemInputs, opts.notes, opts.price);
        cart.value = resultCart; createdCartId.value = resultCart.cartId;
        const addedItem = resultCart.items?.find((i: CartMainItem) => i.productId === opts.product.productId) ?? null;
        opts.afterAddToCart?.(resultCart, addedItem);
        return ok({ cart: resultCart, item: addedItem });
      }

      let resolvedCartId = opts.cartId || cartId.value;
      if (!resolvedCartId) {
        if (opts.createCart) { const c = await resolveCart(); resolvedCartId = c.cartId; }
        else return err('No cart ID provided');
      }

      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const resultCart = await service.addItemToCart({
        id: resolvedCartId,
        input: {
          productId: opts.product.productId, quantity: opts.quantity,
          ...(opts.cluster?.clusterId !== undefined && { clusterId: opts.cluster.clusterId }),
          ...(childItemInputs && { childItems: childItemInputs }),
          ...(opts.notes && { notes: opts.notes }),
          ...(opts.price !== undefined && { price: opts.price }),
        },
        language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall,
      });
      cart.value = resultCart; createdCartId.value = resultCart.cartId;
      const addedItem = (resultCart as any).items?.find((i: any) => i.productId === opts.product.productId) ?? null;
      opts.afterAddToCart?.(resultCart, addedItem);
      return ok({ cart: resultCart, item: addedItem });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add item to cart';
      error.value = msg;
      return err(msg);
    } finally { loading.value = false; }
  }

  /**
   * Adds several products in one call, sequentially, threading each add's
   * resolved cart id into the next so the first may create the cart and the
   * rest land in it. Stops at the first failure and returns that error rather
   * than continuing into a half-filled basket.
   *
   * "Add this whole set to the basket" is a normal requirement (kits, re-order,
   * recipe packs) and there was no bulk call, so every consumer wrote the loop.
   */
  async function addItems(
    items: AddItemOptions[],
  ): Promise<Result<{ cart: Cart; items: (CartMainItem | null)[] }, string>> {
    const added: (CartMainItem | null)[] = [];
    let lastCart: Cart | null = null;
    for (const item of items) {
      const result = await addItem({ createCart: true, ...item });
      if (!result.ok) return err(result.error);
      lastCart = result.data.cart;
      added.push(result.data.item);
    }
    if (!lastCart) return err('No items to add');
    return ok({ cart: lastCart, items: added });
  }

  async function updateItemQuantity(cartItemId: string, quantity: number): Promise<Cart | undefined> {
    if (!cartId.value) return undefined; loading.value = true;
    try {
      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.updateCartItem({ id: cartId.value, itemId: cartItemId, input: { quantity }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to update quantity'; }
    finally { loading.value = false; }
  }

  function updateItemNotes(cartItemId: string, notes: string, debounceMs = 500): void {
    if (notesTimers[cartItemId]) clearTimeout(notesTimers[cartItemId]);
    notesTimers[cartItemId] = setTimeout(async () => {
      if (!cartId.value) return;
      try {
        const service = createServices(graphqlClient).cart;
        const language = languageRef.value || configuration.language || 'NL';
        const updated = await service.updateCartItem({ id: cartId.value, itemId: cartItemId, input: { notes }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
        cart.value = updated;
      } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to update notes'; }
    }, debounceMs);
  }

  async function deleteItem(cartItemId: string): Promise<Cart | undefined> {
    if (!cartId.value) return undefined; loading.value = true;
    try {
      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.deleteCartItem({ id: cartId.value, input: { itemId: cartItemId }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to delete item'; }
    finally { loading.value = false; }
  }

  async function addActionCode(code: string): Promise<Cart | undefined> {
    if (!cartId.value) return undefined;
    try {
      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.addActionCodeToCart({ id: cartId.value, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to add action code'; }
  }

  async function removeActionCode(code: string): Promise<Cart | undefined> {
    if (!cartId.value) return undefined;
    try {
      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.removeActionCodeFromCart({ id: cartId.value, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to remove action code'; }
  }

  async function requestAuthorization(): Promise<Result<void, string>> {
    if (!cartId.value) return err('No cart');
    try {
      const service = createServices(graphqlClient).cart;
      await service.requestPurchaseAuthorization({ id: cartId.value });
      return ok(undefined);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : 'Failed to request authorization');
    }
  }

  async function processCart(orderStatus = 'COMPLETE'): Promise<Result<CartProcessResponse, string>> {
    if (!cartId.value) return err('No cart');
    try {
      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const response = await service.processCart({ id: cartId.value, input: { orderStatus, language } });
      return ok(response);
    } catch (e: unknown) {
      return err(e instanceof Error ? e.message : 'Failed to process cart');
    }
  }

  async function fetchActiveCart(): Promise<Cart | null> {
    const u = user.value;
    if (!u) return null;
    try {
      const service = createServices(graphqlClient).cart;
      const language = languageRef.value || configuration.language || 'NL';
      const searchInput: CartSearchInput = {
        offset: 100,
        statuses: [CartStatus.OPEN],
      };
      if (isContact(u)) {
        searchInput.contactIds = [(u as Contact).contactId];
        if (companyIdRef.value) searchInput.companyIds = [companyIdRef.value];
      } else if (isCustomer(u)) {
        searchInput.customerIds = [(u as Customer).customerId];
      }
      const carts = await service.getCarts(searchInput);
      if (carts?.items?.length) {
        const existingCartId = carts.items[carts.items.length - 1].cartId;
        const activeCart = await service.getCart({
          cartId: existingCartId,
          imageSearchFilters: configuration.imageSearchFiltersGrid,
          imageVariantFilters: configuration.imageVariantFiltersSmall,
          language,
        });
        if (activeCart) {
          cart.value = activeCart;
          createdCartId.value = activeCart.cartId;
        }
        return activeCart ?? null;
      }
      return null;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch active cart';
      return null;
    }
  }

  async function getCrossupsells(opts: GetCrossupsellsOptions): Promise<Crossupsell[]> {
    const { productId, clusterId, types, taxZone, imageVariantFilters } = opts;
    if (!productId && !clusterId) return [];
    try {
      const service = createServices(graphqlClient).crossupsell;
      const language = languageRef.value || configuration.language || 'NL';
      const u = user.value;
      const variables: CrossupsellsQueryVariables = {
        input: {
          types: (types ?? [CrossupsellType.ACCESSORIES]) as CrossupsellSearchInput['types'],
          page: 1,
          offset: 50,
          ...(productId && !clusterId && { productIdsFrom: [productId] }),
          ...(clusterId && { clusterIdsFrom: [clusterId] }),
        },
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFilters ?? configuration.imageVariantFiltersSmall,
        priceCalculateProductInput: {
          taxZone: taxZone || 'NL',
          ...(u && 'company' in u && { companyId: (u as Contact)?.company?.companyId }),
          ...(u && 'contactId' in u && { contactId: (u as Contact)?.contactId }),
          ...(u && 'customerId' in u && { customerId: (u as Customer)?.customerId }),
        },
      };
      const result = await service.getCrossupsells(variables);
      return result?.items ?? [];
    } catch { return []; }
  }

  return { cart, cartId, loading, error, checkoutAllowed, resolveCart, fetchActiveCart, addItem, addItems, updateItemQuantity, updateItemNotes, deleteItem, addActionCode, removeActionCode, requestAuthorization, processCart, getCrossupsells, getMinQuantity, getStep };
}
