/**
 * Client surface for `propeller-v2-vue-ui`.
 *
 * Components, composables, the provider and the SDK seam. Vue components are
 * client-rendered by default — there is no `"use client"` equivalent to deal
 * with. For the runtime-agnostic subset (pure utilities + `createServices` +
 * `toPlain`, safe to import from a Nuxt server context), use
 * `'propeller-v2-vue-ui/shared'`.
 */

// ── SDK seam + pure utilities + domain types (re-exported from core) ──────
// The package ships no `graphqlClient` singleton and no hardcoded endpoint.
// Consumers construct their own `GraphQLClient`, call `createServices(client)`
// once at startup, and install both via `providePropeller({ graphqlClient,
// services, ... })`. Composables read services via `useServices()` or accept
// an explicit `graphqlClient` option from which they derive a bundle.
//
// All pure-TS utilities (formatPrice, getCountryName, etc.), domain types,
// and the SDK seam (createServices, toPlain) now live in propeller-v2-core-ui
// and are re-exported here so the public surface of this package is unchanged.
export * from '@propeller-commerce/propeller-v2-core-ui';

// ── Plugin (Tier 1: app-wide deps) ──────────────────────────────────────────
// Install once at startup via `app.use(propellerVue, { graphqlClient,
// services, currency, configuration })`. Per-scope state (user, companyId,
// language, includeTax, portalMode) goes through <PropellerProvider> below.
export {
  propellerVue,
  PropellerDepsKey,
  usePropellerDeps,
  tryUsePropellerDeps,
  type PropellerDeps,
  type PropellerVuePluginOptions,
} from './plugin';

// ── Context (provide / inject) ──────────────────────────────────────────────
export {
  usePropellerContext,
  useRequiredPropellerContext,
  useUserMode,
  PropellerScopeKey,
  type PropellerScope,
  type PropellerInfra,
} from './context/PropellerContext';
export {
  provideProductGridConfig,
  useProductGridConfig,
  ProductGridInjectionKey,
  type ProductGridConfig,
} from './context/ProductGridContext';

// ── Composables (Vue) ───────────────────────────────────────────────────────
export {
  useAddress,
  type AddressInput,
  type UseAddressOptions,
  type UseAddressReturn,
} from './composables/vue/useAddress';
export {
  useAuth,
  type LoginResult as UseAuthLoginResult,
  type RegisterContactInput as UseAuthRegisterContactInput,
  type RegisterCustomerInput as UseAuthRegisterCustomerInput,
  type UseAuthOptions,
  type UseAuthReturn,
} from './composables/vue/useAuth';
export {
  useCart,
  type UseCartOptions,
  type UseCartReturn,
  type AddItemOptions,
  type GetCrossupsellsOptions,
} from './composables/vue/useCart';
export {
  useCheckout,
  type UseCheckoutOptions,
  type UseCheckoutReturn,
  type CartSettingsInput,
  type PlaceOrderOptions,
  type PlaceOrderResult,
} from './composables/vue/useCheckout';
export {
  useClusterConfigurator,
  type ConfiguredSetting,
  type UseClusterConfiguratorOptions,
  type UseClusterConfiguratorReturn,
} from './composables/vue/useClusterConfigurator';
export {
  useCompany,
  type UseCompanyOptions,
  type UseCompanyReturn,
} from './composables/vue/useCompany';
export {
  useFavorites,
  type FavoriteListFormData,
  type UseFavoritesOptions,
  type UseFavoritesReturn,
} from './composables/vue/useFavorites';
export { useInfraProps } from './composables/vue/useInfraProps';
export {
  useMenu,
  type MenuCategory,
  type UseMenuOptions,
  type UseMenuReturn,
} from './composables/vue/useMenu';
export {
  useOrders,
  type OrderSearchForm,
  type UseOrdersOptions,
  type UseOrdersReturn,
} from './composables/vue/useOrders';
export {
  useProductBundles,
  type BundleItem as UseProductBundlesBundleItem,
  type UseProductBundlesOptions,
  type UseProductBundlesReturn,
} from './composables/vue/useProductBundles';
export {
  useProductInfo,
  type UseProductInfoOptions,
  type UseProductInfoReturn,
} from './composables/vue/useProductInfo';
export {
  useProductSearch,
  type UseProductSearchOptions,
  type UseProductSearchReturn,
} from './composables/vue/useProductSearch';
export {
  useQuickOrder,
  type QuickOrderMatch,
  type QuickOrderLine,
  type QuickOrderSubmitResult,
  type UseQuickOrderOptions,
  type UseQuickOrderReturn,
} from './composables/vue/useQuickOrder';
export {
  useMachines,
  buildRootMachinesQuery,
  type UseMachinesOptions,
  type UseMachinesReturn,
} from './composables/vue/useMachines';
export {
  useSpareParts,
  type UseSparePartsOptions,
  type UseSparePartsReturn,
} from './composables/vue/useSpareParts';
export {
  useProductSlider,
  type FetchCrossupsellsInput,
  type UseProductSliderOptions,
  type UseProductSliderReturn,
} from './composables/vue/useProductSlider';
export {
  useProductSpecs,
  type AttributeGroup,
  type AttributeDisplayItem,
  type UseProductSpecsOptions,
  type UseProductSpecsReturn,
} from './composables/vue/useProductSpecs';
export {
  usePurchaseAuthorizationConfigurator,
  usePurchaseAuthorizationRequests,
  type RowEdit,
  type AddContactFormState,
  type UsePurchaseAuthorizationConfiguratorOptions,
  type UsePurchaseAuthorizationConfiguratorReturn,
  type UsePurchaseAuthorizationRequestsOptions,
  type UsePurchaseAuthorizationRequestsReturn,
} from './composables/vue/usePurchaseAuthorization';
export { useResolvedProps, type ResolveSpec } from './composables/vue/useResolvedProps';
export { useServices } from './composables/vue/useServices';

// ── Vue-package-local cart helpers (Vue-only, not in core) ──────────────────
// These three use SDK services and are framework-agnostic but live here while
// they have callers in this package. They could move to core in a later pass.
export { initCart, type CartInitConfig } from './composables/shared/utils/cartInit';
export {
  fetchActiveCart,
  type FetchActiveCartConfig,
} from './composables/shared/utils/fetchActiveCart';
export { mergeAnonymousCart } from './composables/shared/utils/mergeAnonymousCart';

// ── Components ──────────────────────────────────────────────────────────────
export { default as PropellerProvider } from './components/PropellerProvider.vue';
export { default as AccountIconAndMenu } from './components/AccountIconAndMenu.vue';
export { default as ActionCode } from './components/ActionCode.vue';
export { default as AddToCart } from './components/AddToCart.vue';
export { default as AddToFavorite } from './components/AddToFavorite.vue';
export { default as AddressCard } from './components/AddressCard.vue';
export { default as AddressSelector } from './components/AddressSelector.vue';
export { default as Breadcrumbs } from './components/Breadcrumbs.vue';
export { default as CartBonusItems } from './components/CartBonusItems.vue';
export { default as CartCarriers } from './components/CartCarriers.vue';
export { default as CartIconAndSidebar } from './components/CartIconAndSidebar.vue';
export { default as CartItem } from './components/CartItem.vue';
export { default as CartOverview } from './components/CartOverview.vue';
export { default as CartPaymethods } from './components/CartPaymethods.vue';
export { default as CartSummary } from './components/CartSummary.vue';
export { default as CategoryDescription } from './components/CategoryDescription.vue';
export { default as CategoryShortDescription } from './components/CategoryShortDescription.vue';
export { default as ClusterCard } from './components/ClusterCard.vue';
export { default as ClusterConfigurator } from './components/ClusterConfigurator.vue';
export { default as ClusterInfo } from './components/ClusterInfo.vue';
export { default as ClusterJsonLd } from './components/ClusterJsonLd.vue';
export { default as ClusterOptions } from './components/ClusterOptions.vue';
export { default as CompanySwitcher } from './components/CompanySwitcher.vue';
export { default as DeliveryDate } from './components/DeliveryDate.vue';
export { default as FavoriteListDetails } from './components/FavoriteListDetails.vue';
export { default as FavoriteListItem } from './components/FavoriteListItem.vue';
export { default as FavoriteLists } from './components/FavoriteLists.vue';
export { default as ForgotPassword } from './components/ForgotPassword.vue';
export { default as GridFilters } from './components/GridFilters.vue';
export { default as GridFiltersPanel } from './components/GridFiltersPanel.vue';
export { default as GridPagination } from './components/GridPagination.vue';
export { default as GridTitle } from './components/GridTitle.vue';
export { default as GridToolbar } from './components/GridToolbar.vue';
export { default as ItemListJsonLd } from './components/ItemListJsonLd.vue';
export { default as ItemStock } from './components/ItemStock.vue';
export { default as LoginToOrderButton } from './components/LoginToOrderButton.vue';
export { default as ItemsOverview } from './components/ItemsOverview.vue';
export { default as LoginForm } from './components/LoginForm.vue';
export { default as MachineCard } from './components/MachineCard.vue';
export { default as MachineGrid } from './components/MachineGrid.vue';
export type { MachineCardProps } from './components/MachineCard.vue';
export type { MachineGridProps, MachineListingState } from './components/MachineGrid.vue';
export { default as Menu } from './components/Menu.vue';
export { default as OrderActions } from './components/OrderActions.vue';
export { default as OrderBonusItems } from './components/OrderBonusItems.vue';
export { default as OrderItemCard } from './components/OrderItemCard.vue';
export { default as OrderList } from './components/OrderList.vue';
export { default as QuickOrder } from './components/QuickOrder.vue';
export type { QuickOrderUploadLine, QuickOrderProps } from './components/QuickOrder.vue';
export { default as OrderShipments } from './components/OrderShipments.vue';
export { default as OrderSummary } from './components/OrderSummary.vue';
export { default as OrderTotals } from './components/OrderTotals.vue';
export { default as PriceToggle } from './components/PriceToggle.vue';
export { default as ProductBulkPrices } from './components/ProductBulkPrices.vue';
export { default as ProductBundles } from './components/ProductBundles.vue';
export { default as ProductCard } from './components/ProductCard.vue';
export { default as ProductDescription } from './components/ProductDescription.vue';
export { default as ProductDownloads } from './components/ProductDownloads.vue';
export { default as ProductGallery } from './components/ProductGallery.vue';
export { default as ProductGrid } from './components/ProductGrid.vue';
export { default as ProductInfo } from './components/ProductInfo.vue';
export { default as ProductJsonLd } from './components/ProductJsonLd.vue';
export { default as ProductPrice } from './components/ProductPrice.vue';
export { default as ProductShortDescription } from './components/ProductShortDescription.vue';
export { default as ProductSlider } from './components/ProductSlider.vue';
export { default as ProductSpecifications } from './components/ProductSpecifications.vue';
export { default as ProductTabs } from './components/ProductTabs.vue';
export { default as ProductVideos } from './components/ProductVideos.vue';
export { default as PurchaseAuthorizationConfigurator } from './components/PurchaseAuthorizationConfigurator.vue';
export { default as PurchaseAuthorizationRequests } from './components/PurchaseAuthorizationRequests.vue';
export { default as QuoteActions } from './components/QuoteActions.vue';
export { default as RegisterForm } from './components/RegisterForm.vue';
export { default as SearchBar } from './components/SearchBar.vue';
export { default as UserDetails } from './components/UserDetails.vue';

// ───── Default sub-components for the extension API ─────────────────────────
// Consumers can wrap-and-call these inside their own custom *Component to
// decorate the default markup instead of rebuilding sub-components from
// scratch. Six are aliases of existing standalone SFCs; three are new
// extractions (Image / Badges / Surcharges).
export { default as DefaultProductPrice } from './components/ProductPrice.vue';
export { default as DefaultItemStock } from './components/ItemStock.vue';
export { default as DefaultAddToCart } from './components/AddToCart.vue';
export { default as DefaultAddToFavorite } from './components/AddToFavorite.vue';
export { default as DefaultProductBundles } from './components/ProductBundles.vue';
export { default as DefaultProductBulkPrices } from './components/ProductBulkPrices.vue';
export { default as DefaultProductImage } from './components/defaults/DefaultProductImage.vue';
export { default as DefaultProductBadges } from './components/defaults/DefaultProductBadges.vue';
export { default as DefaultProductSurcharges } from './components/defaults/DefaultProductSurcharges.vue';
