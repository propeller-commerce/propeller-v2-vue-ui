/**
 * fetchActiveCart — fetches the user's existing OPEN cart filtered by user/company.
 *
 * Framework-agnostic helper extracted from the Vue/React login flows so
 * login/register pages can call it directly with the freshly-authenticated
 * user, without going through a reactive composable whose internal user ref
 * may still be stale at the moment of invocation.
 */

import { CartService, CartStatus } from '@propeller-commerce/propeller-sdk-v2';
import type {
  Cart,
  CartSearchInput,
  Contact,
  Customer,
  GraphQLClient,
  MediaImageProductSearchInput,
  TransformationsInput,
} from '@propeller-commerce/propeller-sdk-v2';

export interface FetchActiveCartConfig {
  graphqlClient: GraphQLClient;
  user: Contact | Customer;
  companyId?: number;
  language: string;
  imageSearchFilters: MediaImageProductSearchInput;
  imageVariantFilters: TransformationsInput;
}

export async function fetchActiveCart(
  cfg: FetchActiveCartConfig,
): Promise<Cart | null> {
  const cartService = new CartService(cfg.graphqlClient);
  try {
    const searchInput: CartSearchInput = {
      offset: 100,
      statuses: [CartStatus.OPEN],
    };
    let scopedByCompany = false;
    if ('contactId' in cfg.user && cfg.user.contactId) {
      searchInput.contactIds = [cfg.user.contactId];
      if (cfg.companyId) {
        searchInput.companyIds = [cfg.companyId];
        scopedByCompany = true;
      }
    } else if ('customerId' in cfg.user && cfg.user.customerId) {
      searchInput.customerIds = [cfg.user.customerId];
    }

    // The backend authorizes the `companyIds` cart filter against the contact's
    // memberships; a `companyId` the contact doesn't belong to (e.g. a stale
    // selection left from a previous session) makes the whole query fail with
    // "Unauthorized use of companyIds". Drop the company narrowing and retry on
    // the contact alone — that returns the same cart and never 403s. The caller
    // is expected to reconcile the bad selection separately.
    let carts;
    try {
      carts = await cartService.getCarts(searchInput);
    } catch (companyScopedErr) {
      if (!scopedByCompany) throw companyScopedErr;
      console.warn(
        '[fetchActiveCart] company-scoped cart lookup failed; retrying without companyIds:',
        companyScopedErr,
      );
      delete searchInput.companyIds;
      carts = await cartService.getCarts(searchInput);
    }

    if (carts?.items?.length) {
      const existingCartId = carts.items[carts.items.length - 1].cartId;
      return (
        (await cartService.getCart({
          cartId: existingCartId,
          imageSearchFilters: cfg.imageSearchFilters,
          imageVariantFilters: cfg.imageVariantFilters,
          language: cfg.language,
        })) ?? null
      );
    }
    return null;
  } catch (e) {
    console.error('[fetchActiveCart] Failed to fetch active cart:', e);
    return null;
  }
}
