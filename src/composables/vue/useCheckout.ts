/**
 * useCheckout (Vue) — Checkout flow: address updates, cart settings, order placement.
 *
 * Covers: CheckoutView.
 *
 * Responsibilities:
 * - updateCartAddress: save invoice or delivery address to cart
 * - updateCartSettings: save payment method, carrier, delivery date, reference, notes
 * - placeOrder: processCart → setOrderStatus → optional triggerQuoteSendRequest
 * - getUserDefaultAddress: resolve pre-fill address from user profile
 * - buildAddressInput: normalize address data to CartUpdateAddressInput
 */

import { ref, type Ref } from 'vue';
import { CartAddressType, PaymentStatuses } from '@propeller-commerce/propeller-sdk-v2';
import type {
  GraphQLClient,
  Cart,
  CartUpdateAddressInput,
  MediaImageProductSearchInput,
  TransformationsInput,
  Address,
} from '@propeller-commerce/propeller-sdk-v2';
import {
  getDefaultInvoiceAddress,
  getDefaultDeliveryAddress,
  createServices,
  ok,
  err,
  type AnyUser,
  type Result,
} from '@propeller-commerce/propeller-v2-core-ui';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseCheckoutOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  companyId?: Ref<number | undefined>;
  language?: Ref<string>;
  configuration: {
    imageSearchFiltersGrid: MediaImageProductSearchInput;
    imageVariantFiltersSmall: TransformationsInput;
  };
}

export interface CartSettingsInput {
  paymentMethod?: string;
  carrier?: string;
  requestDate?: string;
  reference?: string;
  notes?: string;
}

export interface PlaceOrderOptions {
  isQuoteMode?: boolean;
  reference?: string;
  notes?: string;
  /**
   * Order status to set. When omitted it defaults to `'REQUEST'` in quote mode
   * and `'NEW'` otherwise. Pass `'UNFINISHED'` for an order awaiting an external
   * payment (PSP) whose final status the payment webhook sets later. Any backend
   * status string is accepted.
   */
  orderStatus?: 'NEW' | 'REQUEST' | 'UNFINISHED' | (string & {});
  /**
   * Whether this placement *finalizes* the order — i.e. sends the order
   * confirmation email, fires the confirm event, attaches the order PDF, and
   * clears the cart. Defaults to `true`.
   *
   * Set this to `false` for an order awaiting an external payment (e.g.
   * `'UNFINISHED'` orders handed off to a PSP). The confirmation/cart deletion
   * should then happen when the payment is confirmed (the PSP webhook), not at
   * placement — otherwise the shopper is emailed and the cart cleared before
   * they've paid.
   */
  finalizeOrder?: boolean;
}

/** Backwards-friendly alias kept for the public `UseCheckout*` type re-exports. */
export type PlaceOrderResult = Result<{ orderId: number }, string>;

export interface UseCheckoutReturn {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  updateCartAddress: (cartId: string, type: 'INVOICE' | 'DELIVERY', address: any) => Promise<Cart | null>;
  updateCartSettings: (cartId: string, input: CartSettingsInput) => Promise<Cart | null>;
  placeOrder: (
    cartId: string,
    options?: PlaceOrderOptions,
  ) => Promise<Result<{ orderId: number }, string>>;
  getUserDefaultAddress: (type: 'invoice' | 'delivery') => Address | undefined;
  buildAddressInput: (type: 'INVOICE' | 'DELIVERY', addr: any) => CartUpdateAddressInput;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useCheckout(options: UseCheckoutOptions): UseCheckoutReturn {
  const { graphqlClient, user, configuration } = options;
  const languageRef = options.language ?? ref('NL');

  const loading = ref(false);
  const error = ref<string | null>(null);

  function buildAddressInput(type: 'INVOICE' | 'DELIVERY', addr: any): CartUpdateAddressInput {
    // Optional fields are omitted when blank: the API validates them whenever
    // they are present and rejects an empty string (e.g. `email must be an
    // email`), which a delivery address legitimately leaves empty.
    return {
      type: type === 'INVOICE' ? CartAddressType.INVOICE : CartAddressType.DELIVERY,
      firstName: addr.firstName || '',
      lastName: addr.lastName || '',
      street: addr.street || '',
      postalCode: addr.postalCode || '',
      city: addr.city || '',
      ...(addr.company && { company: addr.company }),
      ...(addr.gender && { gender: addr.gender }),
      ...(addr.middleName && { middleName: addr.middleName }),
      ...(addr.number && { number: addr.number }),
      ...(addr.numberExtension && { numberExtension: addr.numberExtension }),
      ...(addr.country && { country: addr.country }),
      ...(addr.email && { email: addr.email }),
      ...(addr.mobile && { mobile: addr.mobile }),
      ...(addr.phone && { phone: addr.phone }),
      ...(addr.notes && { notes: addr.notes }),
      ...(addr.icp && { icp: addr.icp }),
    };
  }

  function getUserDefaultAddress(type: 'invoice' | 'delivery'): Address | undefined {
    const u = user.value;
    if (!u) return undefined;
    return type === 'invoice'
      ? getDefaultInvoiceAddress(u)
      : getDefaultDeliveryAddress(u);
  }

  async function updateCartAddress(cartId: string, type: 'INVOICE' | 'DELIVERY', address: any): Promise<Cart | null> {
    loading.value = true;
    error.value = null;
    try {
      const service = createServices(graphqlClient).cart;
      const input = buildAddressInput(type, address);
      const updated = await service.updateCartAddress({
        id: cartId,
        input,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
        language: languageRef.value || 'NL',
      });
      return updated;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to save address';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateCartSettings(cartId: string, input: CartSettingsInput): Promise<Cart | null> {
    loading.value = true;
    error.value = null;
    try {
      const service = createServices(graphqlClient).cart;
      const cartInput: Record<string, any> = {};
      if (input.paymentMethod) cartInput.paymentData = { method: input.paymentMethod };
      if (input.carrier || input.requestDate) {
        cartInput.postageData = {};
        if (input.carrier) cartInput.postageData.carrier = input.carrier;
        if (input.requestDate) cartInput.postageData.requestDate = input.requestDate;
      }
      if (input.reference !== undefined) cartInput.reference = input.reference || undefined;
      if (input.notes !== undefined) cartInput.notes = input.notes || undefined;

      const updated = await service.updateCart({
        id: cartId,
        input: cartInput,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
        language: languageRef.value || 'NL',
      });
      return updated;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update cart';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function placeOrder(
    cartId: string,
    opts: PlaceOrderOptions = {},
  ): Promise<Result<{ orderId: number }, string>> {
    loading.value = true;
    error.value = null;
    try {
      const cartService = createServices(graphqlClient).cart;
      const orderService = createServices(graphqlClient).order;
      const language = languageRef.value || 'NL';

      // Update reference/notes if provided
      if (opts.reference || opts.notes) {
        await cartService.updateCart({
          id: cartId,
          input: {
            reference: opts.reference || undefined,
            notes: opts.notes || undefined,
          },
          imageSearchFilters: configuration.imageSearchFiltersGrid,
          imageVariantFilters: configuration.imageVariantFiltersSmall,
          language,
        });
      }

      const orderStatus = opts.orderStatus ?? (opts.isQuoteMode ? 'REQUEST' : 'NEW');
      // Whether this placement finalizes the order. Default `true`; pass
      // `finalizeOrder: false` for a PSP order awaiting payment so the
      // confirmation email/event/PDF and cart deletion fire later (from the
      // payment webhook) instead of at placement.
      const finalizeOrder = opts.finalizeOrder ?? true;
      // Quotes never send the order-confirmation email/PDF; a PSP-pending order
      // also suppresses them until paid.
      const sendConfirmation = finalizeOrder && !opts.isQuoteMode;

      const response = await cartService.processCart({
        id: cartId,
        input: { orderStatus, language },
      });

      if (!response?.cartOrderId) throw new Error('No Order ID returned');

      const orderId = response.cartOrderId;

      await orderService.setOrderStatus({
        orderId,
        status: orderStatus,
        payStatus: PaymentStatuses.OPEN,
        sendOrderConfirmationEmail: sendConfirmation,
        addPDFAttachment: sendConfirmation,
        triggerOrderSendConfirmEvent: sendConfirmation,
        deleteCart: finalizeOrder,
      });

      if (opts.isQuoteMode) {
        await (orderService as any).triggerQuoteSendRequest?.({ orderId, language });
      }

      return ok({ orderId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to place order';
      error.value = msg;
      return err(msg);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    updateCartAddress,
    updateCartSettings,
    placeOrder,
    getUserDefaultAddress,
    buildAddressInput,
  };
}
