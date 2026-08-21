import { provide, inject, type InjectionKey, type Component } from 'vue';
import type { Cart, CartMainItem, Product, Cluster } from '@propeller-commerce/propeller-sdk-v2';

/**
 * Tier 2 grid config context. Collapses the feature-flag / display and
 * callback props that `ProductGrid` otherwise cascades through
 * `ProductCard` / `ClusterCard` down to `AddToCart` / `ItemStock`.
 * `ProductGrid` is the provider; the card subtree consumes via
 * `useProductGridConfig()` instead of receiving ~20 threaded props.
 */
export interface ProductGridConfig {
  // Feature / display
  columns: number;
  showPrice?: boolean;
  showStock?: boolean;
  showAvailability?: boolean;
  enableAddFavorite?: boolean;
  allowAddToCart?: boolean;
  createCart?: boolean;
  showModal?: boolean;
  allowIncrDecr?: boolean;
  enableStockValidation?: boolean;
  cartId?: string;
  childItems?: number[];
  notes?: string;
  price?: number;
  stockLabels?: Record<string, string>;
  priceLabels?: Record<string, string>;
  addToCartLabels?: Record<string, string>;

  // Callbacks
  onCartCreated?: (cart: Cart) => void;
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;
  onProceedToCheckout?: () => void;
  onRequestQuoteClick?: (cart: Cart) => void;
  onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;
  onProductClick?: (product: Product) => void;
  onClusterClick?: (cluster: Cluster) => void;

  // ───── Component-slot injection (extension API) ─────
  // Mirror of React's ProductGridConfig slot keys. Vue uses `Component`
  // (runtime component type) since prop-shape typing through `<component :is>`
  // is weaker than React's `ComponentType<P>`.
  priceComponent?: Component;
  stockComponent?: Component;
  addToCartComponent?: Component;
  imageComponent?: Component;
  badgesComponent?: Component;
  favoriteComponent?: Component;
  bundlesComponent?: Component;
  bulkPricesComponent?: Component;
  surchargesComponent?: Component;

  productCardComponent?: Component;
  clusterCardComponent?: Component;

  /**
   * Render arbitrary content directly below each card's product name. Receives
   * the product as a prop; cascades to every ProductCard. Lets hosts surface
   * extra per-product info (e.g. package descriptions) across the whole grid
   * without swapping the entire card.
   */
  belowNameComponent?: Component;
}

/** Injection key for the Tier 2 grid config. Symbol-keyed, collision-free. */
export const ProductGridInjectionKey: InjectionKey<ProductGridConfig> =
  Symbol('propeller-product-grid');

/**
 * Install the grid config for the card subtree. `ProductGrid` calls this in
 * its `setup()`; `ProductCard` / `ClusterCard` and their children read it.
 */
export function provideProductGridConfig(value: ProductGridConfig): void {
  provide(ProductGridInjectionKey, value);
}

/**
 * Non-throwing: `ProductCard` / `ClusterCard` used outside a grid
 * (`ProductSlider`, standalone, tests) get `null` and fall back to explicit
 * props / defaults.
 */
export function useProductGridConfig(): ProductGridConfig | null {
  return inject(ProductGridInjectionKey, null);
}
