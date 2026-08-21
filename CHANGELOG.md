# Changelog

All notable changes to `propeller-v2-vue-ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once it reaches 1.0. Until then (the `0.x` line) the public API may change
between minor versions; breaking changes are called out below and in
[MIGRATION.md](./MIGRATION.md).

## [0.17.0] - 2026-08-21

### Added

- **After-hooks now say WHAT happened, not just that something did.** Three
  callbacks reported success with no argument, which made them unusable for
  anything that has to distinguish the outcome — analytics, audit trails, or
  optimistic UI. All three arguments are optional, so existing zero-argument
  callbacks keep working unchanged. Brings the package level with
  `propeller-v2-react-ui` 0.18.0, which shipped the same three.
  - `AddToFavorite.onFavoriteChanged(change?)` — `{ action: 'added' | 'removed',
    listId, productId, clusterId }`. It fired identically for an add and a
    removal, so a host could not report "added to wishlist" without inventing
    the direction, and a wishlist metric that also counts removals is worse
    than no metric.
  - `FavoriteLists.onListChanged(change?)` / `useFavorites` — `{ action:
    'created' | 'updated' | 'deleted', listId, name, isDefault }`. Note the
    existing `onCreate` / `onEdit` / `onDelete` props are *overrides* that
    replace the default mutation, so they were never usable as notifications.
  - `QuickOrder.onTemplateDownload()` — the template link was a bare `<a>`, so
    a buyer fetching the spreadsheet left no trace. Navigation is untouched.

### Notes

- The add payload captures the selected list id *before* the ref is cleared.
  The React twin reads the pre-update value out of its closure after
  `setState`; a Vue ref updates in place, so the same code there would report
  an empty `listId`.
- `QuoteActions` deliberately gains no `afterReject`: the component has no
  reject action to hook — only accept. A rejection callback would be dead API.
- `PurchaseAuthorizationRequests` needs no new prop either; the existing
  `afterDeleteRequest` already covers the manager rejecting a request, which is
  what "delete" means in that UI.

## [0.16.0] - 2026-08-20

### Fixed

- **A host `*ClassName` override could not beat the component's own utility
.** Class lists were built by string-appending the override
  after the package's defaults, which decides nothing — the cascade does, not
  attribute order. `iconClassName="text-cocoa"` on `AccountIconAndMenu`
  (baked-in `text-white`) produced an element carrying both and rendered white.
  The four override sites (`iconClassName`, `menuClassName`, `sidebarClassName`)
  now merge through `tailwind-merge`, so a conflicting utility is replaced
  rather than raced. BEM hooks and non-conflicting utilities are untouched.

- **Anonymous catalog listings were scoped differently on the client than on
  the server.** Listing composables derived `userId` only from a
  logged-in user and omitted the key entirely for guests, while a server-side
  seed scopes anonymous queries to the channel's `anonymousUserId`. The two
  asked different questions, so the client refetch quietly replaced a
  correctly-scoped product list with a differently-scoped one — assortment
  rules, negative order lists in particular, are applied per user. All four
  listing composables (`useProductSearch` ×2, `useProductSlider`,
  `useQuickOrder`, `useSpareParts`) now resolve the id through one shared
  helper. Hosts that supply no `anonymousUserId` behave exactly as before.

### Added

- **`configuration.anonymousUserId`** — the channel's guest account, resolved
  server-side and handed to the package so client-side listings scope to it.
  Same route `baseCategoryId` takes; no module guesses it.

## [0.15.0] - 2026-08-12

### Fixed

- **Result and order-item links used default-language slugs.** Vue
  already resolved localized *names* by language everywhere; the *slugs* that
  build URLs did not. `OrderItemCard` (product and cluster link) and
  `SearchBar` (autosuggest result link) read `slugs[0]`, which is the catalog's
  default language, so every non-default locale emitted wrong-language links —
  a link-correctness and SEO problem rather than a cosmetic one. Both now use
  `getLanguageString` with the active language, matching the names beside them.
- **`useCart` never adopted a cart id that arrived after setup.** `ref(unref(options.cartId) || '')` unwrapped the caller's id once,
  so a component created before the cart resolved held `''` permanently — even
  when the host passed a `Ref`. The header's cart sidebar renders on the first
  paint of every page, so its "Request authorization" button rendered enabled,
  fired, and returned `err('No cart')` with nothing sent. `cartId` is now a
  computed over the caller's value, so a `Ref` stays reactive and a plain string
  still works. `processCart` was affected the same way.

### Changed

- The favorites list's add-product button default now reads "Add product to
  favorite list" instead of "Add product directly to this wishlist".
  Hosts that translate `FavoriteListDetails.addProductDirectly` should update
  their own copy — "favorite list" is the agreed term, not "wishlist".

## [0.14.10] - 2026-08-11

### Fixed

- **Checkout step 3 opened with nothing selected on a fresh cart.**
  `CartPaymethods` and `CartCarriers` only ever adopted a value the cart already
  stored, so a cart that had never reached step 3 — every first order, and every
  order after the cart is recreated — rendered both grids blank and refused to
  continue until the user clicked. They now preselect the cart's stored option
  when there is one and otherwise the first option offered. Mirrors React
  0.15.11.
- **"On account" was never hidden from guests.** `CartPaymethods` compared the
  `showOnAccountForGuests` / `isGuest` *computed refs* instead of their
  `.value`, and a ref object is always truthy, so the guest filter never ran.
  It would also have won the new preselection.

### Changed

- The active option is now derived from the cart rather than assigned by a
  watcher, so it is present in the first render instead of appearing after
  mount. The upward notification moved off an `immediate` watch onto
  `onMounted`, so it no longer fires during SSR — where a host that persists the
  choice would have mutated the cart while rendering.

## [0.14.9] - 2026-08-11

### Fixed

- **The cart sidebar's "Bonus items" heading stayed English on a localized
  page.** `CartIconAndSidebar` renders `CartBonusItems` itself but passed it no
  `labels`, so the block always fell back to its English defaults — while the
  same component on the cart and checkout pages, where the host passes `labels`
  directly, translated correctly. Mirrors React 0.15.10.

### Added

- `CartIconAndSidebar` accepts `cartBonusItemsLabels` (keys: `title`, `sku`),
  forwarded to the embedded bonus-items block. Hosts already translating
  `CartBonusItems` on the cart page can pass the same map.

## [0.14.8] - 2026-08-11

### Fixed

- **Quick order could add products from outside the user's catalogue.** Both the
  row typeahead and the XLSX upload resolved codes through the flat `products`
  resolver with no catalog scope and no user context. Orderlist (contract)
  scoping is honoured by `category.products` but **silently ignored** on the flat
  resolver, so quick order surfaced the full catalogue while the grid and the
  search preview stayed scoped. `searchProducts` now queries
  `category.getCategory` over `configuration.baseCategoryId` and passes `userId` /
  `companyId` / `applyOrderlists`, plus `hidden: false`, matching `ProductGrid`,
  the SearchBar and the WordPress plugin's quick-order flow. Codes outside the
  catalogue are reported through `onMissingCodes` instead of being added.
  Mirrors React 0.15.8.

### Changed

- **`QuickOrder` needs `configuration.baseCategoryId`.** Without it the
  typeahead and the upload resolve nothing rather than falling back to an
  unscoped search — failing closed is the point of the fix.

### Added

- `QuickOrder` accepts `taxZone` (defaults to `'NL'`), `orderlistIds` and
  `applyOrderlists`, forwarded to the scoped search.

## [0.14.7] - 2026-08-10

### Fixed

- **`OrderBonusItems` showed the list price of a free item.** The API models a
  bonus as two order lines: the product line at its list price, plus a sibling
  `class: 'incentive'` line carrying the negative delta and pointing back via
  `parentOrderItemId`. The component rendered the product line and ignored the
  sibling, so a bonus that reads € 0,00 in the cart and at checkout reappeared
  at its list price on the thank-you page and in order details. Bonus lines are
  now netted against their incentive siblings via `getNettedBonusItems()`
  (core-ui 0.6.2); partial discounts keep their remainder instead of collapsing
  to zero. Order totals were already correct — this was display-only.

## [0.14.6] - 2026-08-10

### Fixed

- **User-visible strings that could not be translated at all** — they had no
  label key and no prop, so a consumer supplying a full `labels` dictionary
  still shipped English on a Dutch page. Every one now resolves through
  `getLabel` with the previous text as the fallback, so this is additive: a
  consumer supplying none of the new keys renders exactly as before.

  | Component | Was | New key |
  |---|---|---|
  | `CategoryDescription` | Read more / Read less | `readMore`, `readLess` |
  | `ProductDescription` | Read more / Read less | `readMore`, `readLess` |
  | `MachineGrid` | Loading…, No machines found. | `loading`, `noMachines` |
  | `RegisterForm` | Please select an account type. | `selectUserType` |
  | `AccountIconAndMenu` | Hi, {name} | `greeting` |

  `ProductTabs` now forwards its `labels` to `ProductDescription`, without
  which the two new keys could not be reached on a product page.

  The greeting takes a `{name}` placeholder rather than a bare prefix, so a
  translation can put the name first — matching the existing `{link}`
  convention in `LoginForm.noAccount`.

- **The add-contact server error is overridable.**
  `PurchaseAuthorizationConfigurator` rendered the failure verbatim —
  unlocalised upstream text, often cryptic. Supplying `addContactFailed` now
  replaces it outright, the same masking `LoginForm` already does with
  `invalidCredentials`. Omit the key to keep the current pass-through.

- **Both authorization modal close buttons had no accessible name.** The `✕`
  glyph and the SVG icon were the only content, so screen readers announced
  punctuation or nothing. Both take an `aria-label` from the existing
  `closeLabel` key, with the glyph/icon marked `aria-hidden`.

Matches `propeller-v2-react-ui` 0.15.6, except `registrationFailed` — this
package's `RegisterForm` does not render raw server errors.

## [0.14.5] - 2026-08-10

### Fixed

- `useMenu` no longer drops categories that lack a translation in the active
  language. The query filtered server-side — `names(language: $language)` — so a
  category with no entry for that language came back with `names: []` and
  `slugs: []`, and `mapCategory`'s fallback had nothing left to fall back to:
  the row rendered with a blank label and an empty slug, invisible and
  unclickable. Switching a bilingual storefront to a language with partial
  translations collapsed the menu to whichever categories were translated
.

  `names` and `slugs` are now fetched unfiltered and `mapCategory` picks the
  active language, falling back to whichever translation exists.

  Matches `propeller-v2-react-ui` 0.15.5.

## [0.14.4] - 2026-08-10

### Fixed

- `<ItemsOverview>` follows the Incl./Excl. BTW toggle. It printed
  `item.price × quantity` — always excl. VAT — while `<CartItem>` on the cart
  page printed `totalSumNet` (incl.), so the same lines appeared on two
  different tax bases in consecutive checkout steps. It now reads `includeTax`
  from the Propeller provider and takes line totals from `totalSum` /
  `totalSumNet` — the same fields `<CartItem>` reads. Bundle, bundle-item and
  child-option prices switch on the same basis.

  Hosts that already render inside `PropellerProvider` need no change; pass
  `includeTax` explicitly to override.

  Matches `propeller-v2-react-ui` 0.15.4.

## [0.14.3] - 2026-08-10

### Fixed

- `<CartSummary>` renders a **Transaction costs** line when the cart's payment
  method carries a fee. The fee was already inside `total.totalGross`, so the
  panel's own rows never added up to the "Total excl. VAT" it printed — a €7.25
  order with €49.00 shipping showed €56.60. `<OrderTotals>` has always shown
  this row; the cart panel now matches. Label key: `transactionCosts`.

  Matches `propeller-v2-react-ui` 0.15.3.

## [0.14.2] - 2026-08-10

### Fixed

- `<GridFilters>` resolves each facet's label in the active language. The title
  came from `descriptions[0]`, so on a bilingual tenant every filter heading
  rendered in whichever language the API returned first (Dutch), regardless of
  the shopper's selection. It now matches on the `language` prop, falling back
  to the first description and then the raw attribute name.

  Hosts must pass `language` to `<GridFilters>` / `<GridFiltersPanel>` for the
  labels to follow the language switcher; omitting it preserves the previous
  behaviour.

  Matches `propeller-v2-react-ui` 0.15.2.

## [0.14.1] - 2026-08-10

### Fixed

- `<GridFilters>` shows an unticked option its **own** result total instead of
  the intersection with the group's active selection. Once a group held a
  selection the backend's `count` for a sibling became "products carrying both
  values" — a season facet read "(1)" and added 2 products when ticked. The
  count now comes from `countActive` (the option with its own group's filters
  lifted, other groups still applied), which is what the field is documented
  for. With no selection in the group the backend returns `count ===
  countActive`, so unfiltered listings are unchanged. Mirrors react-ui 0.15.1.

## [0.14.0] - 2026-08-07

### Fixed

- **Checkout is operable by keyboard and screen reader.** `<CartPaymethods>`,
  `<CartCarriers>` and `<DeliveryDate>` rendered their options as plain `div`s
  with a click handler: no `input[type=radio]` anywhere, no roles, not
  focusable, and an empty accessibility tree for the checkout body. Because
  choosing a carrier is required to advance, keyboard-only and screen-reader
  users could not complete an order at all.

  The three now implement the ARIA radiogroup pattern — the grid is a
  `role="radiogroup"` with an `aria-label`, each option is a `role="radio"`
  carrying `aria-checked`, and a roving `tabindex` makes the group a single
  tab stop. Enter/Space select; arrow keys move and select with wrap-around.
  Options also gained a `focus-visible` ring, since a keyboard user has to be
  able to see where they are. The markup and styling are otherwise unchanged.

  New optional label keys, each with an English fallback: `methodsLabel`
  (CartPaymethods), `carriersLabel` (CartCarriers), `deliveryDateLabel`
  (DeliveryDate) — they name the group for assistive tech.

- **Product names respect the active language.** Fifteen call sites across
  eight components read `names[0].value` — whichever translation the backend
  happened to return first. On a Dutch storefront that surfaced German product
  names on the checkout review and thank-you screens while the cart showed the
  Dutch one. They now resolve through `getLanguageString(names, language)`,
  which falls back to the first non-empty entry, so behaviour is unchanged
  wherever the active language was already first. Affects `<ItemsOverview>`,
  `<OrderItemCard>`, `<CartIconAndSidebar>`, `<ClusterOptions>`,
  `<FavoriteListDetails>`, `<FavoriteListItem>`, `<ProductBundles>` and
  `<SearchBar>`.

### Added

- `<OrderItemCard>` accepts `language` (resolved from `<PropellerProvider>`
  when omitted). It previously had no language input at all, which is why the
  thank-you page could not localize its item names.

### Changed

- Built against `@propeller-commerce/propeller-v2-core-ui` **0.6.1** (the ENUM
  cluster-configurator fix). The declared range `^0.6.0` is unchanged; only the
  lockfile moved. The package's own `node_modules` had drifted to core-ui 0.4.0,
  which made `typecheck` fail on exports that 0.6.x does provide.

## [0.13.0] - 2026-08-06

### Changed

- **BREAKING — the stock filter is a toggle plus a quantity, not two
  checkboxes.** `<GridFilters>` now takes `activeAvailability` as a single
  `Availability` (`'all' | 'in-stock'`) rather than an array, gains
  `activeMinStock`, and its `onAvailabilityChange` fires with both the
  selection and the quantity. `<GridToolbar>` takes `availability` as a single
  value plus `minStock`, and its `onAvailabilityFilterRemove` takes no
  argument. `<ProductGrid>` takes `availability` plus `minStock`. The
  out-of-stock bucket has no replacement. See [MIGRATION.md](./MIGRATION.md).

  Two checkboxes could express "in stock or out of stock" — every product, and
  so a state that looked active but sent no filter. They also could not answer
  what a shopper asks next: not "is it stocked?" but "do you have enough?".

  The section is now a two-state toggle and, once In stock is chosen, an
  editable quantity with stepper buttons. The value can be typed directly or
  stepped, commits on blur or Enter, and is floored and clamped to a minimum
  of 1 — a lower threshold would match zero-stock products and contradict the
  toggle. Switching back to All products clears it.

  Requires `propeller-v2-core-ui` >= 0.6.0.

- **The toolbar shows one stock chip** instead of one per bucket, carrying the
  quantity when it is above the default.

### Added

- Label keys `allProducts`, `atLeast`, `pcs`, `quantityDecrease` and
  `quantityIncrease`. The `outOfStock` key is no longer read.

  Matches `propeller-v2-react-ui` 0.15.0.

## [0.12.0] - 2026-08-05

### Added

- **`hideHeader` and `flat` on `<OrderList>` and
  `<PurchaseAuthorizationRequests>`** — for embedding a list inside a host's
  own card. `hideHeader` drops the table's column-header row, redundant once
  a card names what it contains and shows three columns. `flat` drops the
  component's own background, border, shadow and rounded corners, which
  otherwise nest a box inside the host's box. On `<OrderList>` the empty
  state honours `flat` too, so a card with no results does not draw a stray
  panel.

- **`limit`, `columns`, `columnConfig`, `showActions` and `hideTitle` on
  `<PurchaseAuthorizationRequests>`** — the component rendered a fixed
  five-column table (date, quantity, total, requested by, actions) and its
  own heading, so it could not be reduced to a summary. `columns` selects
  which of those render and in what order, `columnConfig` overrides their
  header labels, `showActions` hides the accept/delete buttons, `hideTitle`
  suppresses the component's own heading when the host already has one, and
  `limit` caps the list to the most recently modified — mirroring the prop
  `<FavoriteLists>` already carries.

### Notes

Every prop above is additive and defaults to current behaviour: an existing
consumer that passes none of them renders exactly as it did in 0.11.0. In
particular `<PurchaseAuthorizationRequests>` still lists requests in the
order the API returned them; the most-recent-first sort applies only when
`limit` is set, so the rows that survive the slice are the newest.

Matches `propeller-v2-react-ui` 0.14.0.

## [0.11.0] - 2026-08-05

### Added

- **Availability filter on `<GridFilters>`** — an opt-in section below the
  price block with two checkboxes, In stock and Out of stock, wired to the
  server-side stock filter the SDK exposes on `CategoryProductSearchInput`.
  New props: `showAvailabilityFilter` (defaults `false`),
  `activeAvailability` and `onAvailabilityChange`. Nothing selected sends no
  filter, so the default listing is unchanged.

  Selecting both buckets means "in stock or out of stock", which is every
  product. The filter has no OR operator and the union is the unfiltered set
  anyway, so both-selected sends no filter — the same as selecting neither.
  The checkboxes stay ticked; only the request collapses.

  The mapping lives in `propeller-v2-core-ui`'s `buildInventoryFilter`, so
  this package never restates the operator semantics. Requires
  `propeller-v2-core-ui` >= 0.5.0 and `propeller-sdk-v2` >= 0.15.0, where the
  inventory filter was added.

- **`availability` and `onAvailabilityFilterRemove` on `<GridToolbar>`** —
  the active-filter row now renders one removable chip per selected bucket,
  so a stock-filtered listing shows why its results are narrowed and can be
  undone from the results area. One chip per bucket, matching the attribute
  chips rather than the price chip which covers a whole range. The row's
  active check accounts for availability, so it appears when availability is
  the only active filter.

- **`availability` on `<ProductGrid>`** — forwards the selection to
  `useProductSearch`, which applies it to both the grid fetch and the
  typeahead preview. Filtering only the grid would let the preview offer
  products the grid then hides.

### Changed

- The availability section is hidden for anonymous visitors in a semi-closed
  portal, the same rule the price filter already follows. Hosts should pass
  their own "show stock" setting through `showAvailabilityFilter`: filtering
  by stock reads as broken when the cards display no stock to filter on.

  Matches `propeller-v2-react-ui` 0.13.0.

## [0.10.0] - 2026-07-31

### Added

- **`productTrackAttributes` on `<ProductGrid>`, `<SearchBar>` and
  `useProductSearch`.** Pass the attribute names a card renders — e.g.
  `:product-track-attributes="['MPN']"` — and they arrive on
  `product.attributes` for every item in the result, ready to read from a card
  slot. `useProductInfo` has had an option of this name since the PDP work;
  the grid side simply never forwarded one, so hosts that set it in their
  portal config saw it silently ignored on listings and had to fetch
  attributes themselves in a second request.

  Requires `propeller-sdk-v2` >= 0.16.0, where the `category` and `products`
  operations gained `$attributeResultSearchInput` and `ProductGridFields`
  gained the matching `attributes(input:)` selection.

  Naming the attributes you render is not just a payload optimisation — it is
  the correct behaviour. With no input the server returns the *first page* of
  a product's attributes (12 per product), so on a product carrying more than
  12 the ones on later pages are missing with no error. Filtering to the names
  you need also cut a 24-product category response from ~168 KB to ~124 KB in
  our testing.

  Matches the same addition in `propeller-v2-react-ui` 0.12.0.

## [0.9.4] - 2026-07-31

### Fixed

- **The add-to-cart button overflowed its product card in narrow columns.**
  The submit button is `flex-1`, but a flex item defaults to
  `min-width: auto` and so refuses to shrink below its content width — icon
  plus label plus `px-6` of padding. In a slider or a dense grid the button
  ran past the card's edge instead of fitting inside it. Longer non-English
  labels hit this first: Dutch "Toevoegen" is roughly twice the width of the
  "Add" the padding was sized around. The button now carries `min-w-0`, eases
  its padding to `px-3 sm:px-6`, and wraps its label in a `truncate` span, so
  it shrinks to the column and ellipsises rather than overflowing. Same fix
  for `<ClusterCard>`'s "View cluster" link, which had the identical shape.
- **Hovering a card's CTA lit up the whole card.** The card root is a
  `group` with `hover:shadow-md`, so hovering the button — a descendant —
  raised the card shadow, shifted its border and zoomed the product image at
  the same time as the button's own hover state. Three things answering one
  intent read as the card being clickable rather than the button. While the
  pointer is on a CTA the card-level highlight and the image zoom now stand
  down and the button owns the hover; moving anywhere else on the card is
  unchanged. Browsers without `:has()` keep the previous behaviour.

## [0.9.3] - 2026-07-31

### Fixed

- **`<ProductSlider>` hid add-to-cart from signed-in users in a semi-closed
  portal.** It gated the control on `portalMode === 'open'`, so the whole mode
  lost it rather than just anonymous visitors — the same defect `ProductGrid`
  had before 0.6.0. Sliders now gate on the shared
  `isContentHidden(portalMode, user)` like the grid, so a signed-in shopper
  keeps add-to-cart on cross-sells, up-sells and CMS product blocks.

### Added

- **`allowAddToCart` on `<ProductSlider>`** — lets a host hide the control the
  way `ProductGrid` already allows. Defaults to `true`; a semi-closed portal
  still withholds it from anonymous visitors regardless.

## [0.9.2] - 2026-07-31

### Fixed

- **`<ProductGrid>` and `<ProductSlider>` dropped `onLoginClick`, so the log-in
  action did nothing.** In a semi-closed portal `ProductCard` replaces
  add-to-cart with `<LoginToOrderButton>` and calls `onLoginClick` — but both
  listing components forward card props explicitly, and neither passed it. The
  callback was therefore unreachable from any listing: anonymous visitors got a
  button that looked clickable and went nowhere. Missed when the semi-closed
  gating landed in 0.6.0. Both now forward it alongside the other card
  callbacks.

## [0.9.1] - 2026-07-30

### Fixed

- **`menuStyle="accordion"` rendered nothing above `md`.** The accordion is the
  mobile drawer for every style, so its `<nav>` carried `md:hidden` and rendered
  unconditionally — while the desktop branches were gated on `menuStyle`.
  Selecting it therefore matched no desktop branch and hid the mobile one,
  leaving an empty panel. It now renders at every breakpoint when chosen
  explicitly, and stays `md:hidden` as the mobile presentation of the others.
  This is what 0.9.0's depth warning already recommended for deep trees.
- **`menuStyle` values with no renderer failed silently.** An unrecognised
  style matched no branch and produced an empty panel with nothing to indicate
  why. It now falls back to `accordion` — the style that can display any tree —
  and warns in development, pointing at the `menu` slot.
- **The depth cap read the raw prop, not the resolved style.** An unrecognised
  `menuStyle` was capped as a flyout while actually rendering as an accordion.
  It now reads the resolved style, so the cap always matches what draws.
- **The accordion's expand control didn't look clickable.** Tailwind v4 resets
  buttons to `cursor: default`, so the chevron — the only control that expands a
  branch — gave no affordance. Added `cursor-pointer` plus a hover colour shift,
  and the same to the jumbotron tabs, which had it too.
- **A deep flyout could run off the viewport with no way to reach it.** The
  columns row now has `max-w-[100vw] overflow-x-auto`, so a tree wider than the
  screen degrades to a scroll instead of being unreachable.

### Added

- **A `menu` scoped slot — render the menu yourself.** The built-in styles are
  three arrangements of the same tree; this is the escape hatch for a fourth.
  It exposes the categories, the open-path state and the same helpers the
  built-ins use (`getCategoryUrl` honouring `getUrl`/`configuration`,
  `handleItemClick` firing `onMenuItemClick`, `openAt`/`toggleAt`/`isOpenAt`),
  so a custom menu gets working open/close behaviour and URL building without
  reimplementing them and drifting. When the slot is present it owns the
  loading and error states too.

### Changed

- **`dropdown-horizontal` removed.** It was referenced only in the depth-cap
  logic and never had a renderer, so it advertised a style that drew nothing.
  Callers using it now hit the unknown-style fallback (accordion + warning); use
  the `menu` slot for a genuinely custom layout.
- **`dropdown-vertical` caps at 5 levels, up from 4.** Each level is a 256px
  column, so five total 1280px — within a 1440px desktop. Paired with the
  overflow guard above for narrower screens.
- **`menuStyle` is typed `MenuStyle | (string & {})`** rather than `string`: the
  built-ins autocomplete while a custom value still type-checks for use with
  the `menu` slot.

## [0.9.0] - 2026-07-30

### Fixed

- **`<Menu depth>` was inert past three levels.** `depth` was threaded into
  `useMenu`, which correctly built a recursive query to any depth, but every
  style rendered exactly three hand-coded levels. `depth={4}` and beyond fetched
  data that was never displayed — extra payload for nothing, with no warning
  that the prop was only half-honoured. All styles now render to `depth`.
- **The expand chevron promised levels that never rendered.** It keyed off "has
  children" alone, so a category at the deepest rendered level showed an
  affordance that did nothing. It is now also gated on the child being within
  `depth`.

### Changed

- **Recursion extracted into `MenuLevel.vue`.** A template cannot call a local
  render function the way JSX can, so the level renderer is a self-referencing
  component. It is internal — `<Menu>` remains the only export, and its props
  are unchanged.
- **Per-level menu state replaced with a single open path.** The positional
  `hoveredL1Id` / `hoveredL2Id` refs are now one `openPath: number[]`. "Opening
  a shallower item closes the deeper ones" is structural (`slice(0, level)`)
  rather than a hand-written reset per level, which grew quadratically and was
  easy to get wrong when adding a level.
- **`data-level` is emitted to whatever depth renders** instead of a hardcoded
  `1`/`2`/`3`, so consumer CSS can target arbitrary depth.
- **Flyout styles cap the levels they can lay out** — 4 for
  `dropdown-vertical`, 3 for `dropdown-horizontal`/`jumbotron`, since each level
  is another horizontal column and beyond that they run off-screen. The
  accordion nests vertically and is uncapped. Exceeding a cap logs a
  `console.warn` in development (previously the prop silently did nothing).

`depth` still defaults to 3, and all fifteen `propeller-menu__*` class hooks are
unchanged, so a three-level menu keeps its existing structure and styling. Some
Tailwind utility classes internal to the component differ where per-level
values (`pl-8` / `pl-12` indentation) became a computed `padding-left`; styling
that targets the `propeller-menu__*` hooks is unaffected.

## [0.8.1] - 2026-07-30

### Fixed

- **`<SearchBar>` autosuggest ignored orderlist scoping.** The component
  resolves `user` like every other infra prop but never passed it to
  `useProductSearch`, and the backend drives orderlist scoping off the user id —
  so `orderlistIds` alone had no effect on the autosuggest query. The dropdown
  returned the whole catalogue while the grid below it, which does pass `user`,
  showed only the contract's products. Forwarding `user` makes the two agree.

## [0.8.0] - 2026-07-29

### Added

- **Magic-token authentication in `useAuth`.** `magicLogin(token)` exchanges a
  backend-issued magic token for a session (via
  `MagicTokenService.magicTokenLogin`), sets the access token, and loads the
  viewer, mirroring `login()` — the passwordless / punchout deep-link handoff.
  `createMagicToken(input)` issues a magic token for a contact/customer
  (`MagicTokenCreateInput`, authenticated). Both return the standard `Result` and
  are exposed on `UseAuthReturn`. No new runtime dependency — the SDK's
  `MagicTokenService` ships in 0.14.0.

## [0.7.0] - 2026-07-29

### Changed

- **Align with `@propeller-commerce/propeller-sdk-v2` 0.14.0**, which removed the
  entire deprecated schema surface. Category reads move to the plural localized
  arrays — `Breadcrumbs` (`category.names` / `slugs`), `CategoryDescription`
  (`descriptions`), `CategoryShortDescription` (`shortDescriptions`),
  `OrderItemCard` (drops the removed `cluster.slug` fallback) — and the
  hand-written menu query in `useMenu` now selects `names(language:)` /
  `slugs(language:)`. `ClusterConfigurator` / `useClusterConfigurator` /
  `useProductInfo` read `ClusterConfigSetting.attributeName` and `uuid` (were
  `name` / `id`); the public `ConfiguredSetting.id` is now a `string`. Bumped the
  SDK dev dependency to `^0.14.0` and `propeller-v2-core-ui` to `^0.4.0`; the
  runtime peer stays `*`.

## [0.6.1] - 2026-07-28

### Fixed

- **Documentation build failed on CI.** TypeDoc runs a plain `tsc` program, and
  `src/index.ts` re-exports named types out of `.vue` files (`MachineCardProps`,
  `MachineGridProps`, `MachineListingState`, `QuickOrderUploadLine`,
  `QuickOrderProps`). The `*.vue` shim declares only a default export, so those
  five re-exports raised TS2614 and `gen:api` exited non-zero. `vue-tsc`
  resolves `.vue` natively, so `npm run typecheck` and the package build were
  unaffected and the breakage only showed in the docs job.

  `src/index.ts` is now excluded from `tsconfig.typedoc.json`, matching that
  file's stated design — the docs entry points are the pure-TS composables /
  context / shared modules, and component prop tables live in Storybook.
  `index.ts` was never an entry point; it was only pulled in by the
  `src/**/*.ts` include. Introduced in 0.4.0 with the spare-parts machines
  merge.

## [0.6.0] - 2026-07-28

### Added

- **`<LoginToOrderButton>`** — a log-in call to action rendered in place of
  add-to-cart for anonymous visitors of a semi-closed portal. Takes an
  `onLoginClick` callback (the host owns navigation) and a `loginToOrder`
  label. `ProductCard` and `ProductInfo` accept `onLoginClick` and forward it.
- **`showLoginPrompt` on `<ProductPrice>` and `<ProductBundles>`** — set
  `false` to render nothing where the "log in to see prices" text would go.
  Defaults to `true`, so existing behaviour is unchanged.
- **`portalMode` on `<ProductCard>`, `<ProductInfo>` and `<ClusterOptions>`** —
  resolved from the provider like the other infra props; an explicit prop still
  wins. `ProductInfo` had no portal handling at all.

### Fixed

- **Semi-closed portals leaked price and stock in listings.** `ProductCard`
  never received `portalMode`, so the price it renders through `<ProductPrice>`
  and its stock row stayed visible to anonymous visitors even though the toolbar
  and price filter were correctly gated. `ClusterOptions` printed option prices
  in its dropdown labels and selection preview. All now gate on the shared
  `isContentHidden(portalMode, user)`.
- **`ProductGrid` hid add-to-cart from signed-in users of a semi-closed
  portal.** `showAddToCart()` tested `portalMode === 'open'` rather than
  `isContentHidden`, so authenticated shoppers lost the control along with
  anonymous ones. Signed-in users keep add-to-cart.
- **The CTA slot collapsed when content was hidden.** `ProductCard` gated the
  slot on `allowAddToCart`, which `ProductGrid` passes as `false` in that case —
  leaving no room for the log-in action. The slot now renders either control.

## [0.5.1] - 2026-07-28

### Fixed

- **`cartUpdateAddress` rejected a blank email** — optional address fields were
  sent as empty strings when left blank, and the API validates optional fields
  whenever they are present, so a blank email failed with
  `email must be an email` (400). This blocked the address step for a delivery
  address, where the email legitimately lives on the contact / customer record
  rather than the address. `buildAddressInput` now omits optional fields when
  blank, matching how `useAddress` already built its payloads. Affects every
  optional field (`email`, `phone`, `mobile`, `company`, `notes`, …), not just
  email.
- **`<AddressCard>` required an email on every address** — the edit and create
  forms hardcoded `:required="true"` plus a `*` on the email input,
  contradicting the field being optional on the address itself. Email is now
  optional in both forms.
- **`<AddressCard>` accepted undeliverable emails** — `type="email"` alone
  permits dotless domains such as `aa@gg` (valid per the HTML5 spec for
  intranet hosts, but rejected by the API). Both email inputs now carry a
  pattern requiring a dotted top-level domain, so invalid input is caught in
  the form instead of surfacing as a failed mutation. Subdomains
  (`user@sub.co.uk`) and tagged addresses (`user+tag@example.com`) remain
  valid.

## [0.5.0] - 2026-07-27

### Added

- **`<QuickOrder>` component + `useQuickOrder` composable** — ported from
  react-ui 0.7.0. A bulk "quick order" pad for B2B replenishment. Each row has a
  debounced SKU/code typeahead (`ProductSearch`); selecting a match fills the
  row's name, net price and minimum quantity. Quantities are editable, rows can
  be added/removed, and duplicate SKUs are rejected. "Add to cart" resolves the
  user's cart (shared `initCart` flow) and adds every resolved row in a single
  `CartItemBulk` mutation (`CartService.bulkUpdateCartItems`).
  - Optional XLSX upload: pass a `parseSpreadsheet(file)` handler (the app owns
    the parser — the package ships no spreadsheet dependency) plus a
    `templateUrl`; parsed code+quantity lines are resolved against the API and
    unresolved codes reported via `onMissingCodes`.
  - Fully label-driven (`labels` prop) and `configuration`-aware (image filters
    so typeahead results carry thumbnails, same as `SearchBar`). Infra props
    (`graphqlClient`/`user`/`companyId`/`language`) resolve from
    `<PropellerProvider>` via `useInfraProps`.
  - A typed code is only ever a *search term* — a row's product identity and
    price always come from the API, never from the typed/uploaded value.

## [0.4.0] - 2026-07-22

### Added

- **Spare-parts machine browsing** — ported from react-ui 0.6.0. A self-contained
  `MachineGrid` component backed by two composables: `useMachines` (the tree
  ROOT — resolves a company's `MY_INSTALLATIONS` in ONE concatenated
  `machine(source:, sourceId:)` request, exported alongside `buildRootMachinesQuery`)
  and `useSpareParts` (a node's parts + child machines by slug, with the
  storefront/tree language split). `MachineCard` renders a tree node as a
  browse-into card (also exported from `/pure`). `MachineGrid` drives a
  URL-synced, controlled parts listing (`MachineListingState` + `onListingChange`)
  reusing `GridFiltersPanel` / `GridToolbar` / `GridPagination` and a controlled
  `ProductGrid` with a per-card qty `belowNameComponent`. The machine pages are
  client-rendered (the composables fetch client-only). Mirrors react-ui 0.6.0.

### Fixed

- **`MachineGrid` one-column layout** — the machine card grids used a
  `grid-cols-1` base. In a consumer that ships its own Tailwind build *after*
  this package's precompiled CSS (e.g. propeller-vue's `entry-client`), the
  app's unprefixed `.grid-cols-1` wins the same-layer cascade tie and pins the
  grid to one column at every breakpoint. Dropped `grid-cols-1` (a bare `grid`
  is already one implicit column on mobile) so the responsive `sm:grid-cols-2` /
  `lg:grid-cols-4` are uncontested — matching `ProductGrid`'s collision-immune
  `grid-cols-2` base.
- **`useAuth` viewer inputs** — the login viewer no longer 400s when a host sets
  `configuration.contactPAConfigInput` to an empty array. The value is spread into
  the viewer input only when it's a genuine input *object*; an empty `[]` is truthy
  but the backend rejects it ("Expected type
  `ContactPurchaseAuthorizationConfigSearchInput` to be an object"). The login
  viewer now also forwards `configuration.contactCompaniesSearchInput`, so a
  multi-company contact's companies + purchase-auth configs are paginated on the
  same fetch rather than truncated by the server default.

## [0.3.39] - 2026-07-21

### Fixed

- **`SearchBar` autosuggest now filters results by the active language.**
  Follow-up to 0.3.38's category-search routing: the backend search matches
  across all languages, so FR/ES-only products leaked into an EN preview. The
  autosuggest now drops results with no name in the active language (and
  adjusts the "View all (N)" total by the dropped count), and the result row
  displays the name in the active language (falling back to the first
  available) instead of always the first name in the array. Mirrors react-ui
  0.4.29.

## [0.3.38] - 2026-07-21

### Fixed

- **`SearchBar` autosuggest orderlist scoping — real fix.** 0.3.37 set
  `orderlistIds`/`applyOrderlists` on the flat `products` search input, but the
  server's `products` resolver does not honour orderlist scoping (only the
  `category.products` resolver does), so the preview still leaked the full
  catalogue inside a contract. The debounced autosuggest now runs the **same
  category term-search the grid uses** (`getCategory` over the base category)
  instead of the flat `getProducts`, so contract scoping is applied server-side
  and the preview matches the grid exactly. Requires
  `configuration.baseCategoryId` (already provided by all consumers).

## [0.3.37] - 2026-07-21

### Fixed

- **`SearchBar` autosuggest now respects orderlist (contract) scoping.** The
  debounced live-search query built a plain `ProductSearchInput` that never
  passed `orderlistIds`/`applyOrderlists`, so the dropdown previewed the full
  catalogue even inside a B2B contract catalogue (the submitted results were
  already correctly scoped — only the preview leaked). It now threads the same
  orderlist scope as the grid fetch, so previews and results agree and a PDP
  outside the contract is no longer reachable from the preview.

### Added

- **`SearchBar`: `#price` scoped slot + `showPrice` prop.** The scoped
  `#price` slot (receives `{ result }`) replaces the price cell of each result
  with custom content — e.g. a "Price by quotation" label for a contract
  catalogue where prices are quote-only; it fully overrides the default price
  rendering. `showPrice` (default `true`) is a simpler boolean to hide the
  price column outright. Both default to the previous behaviour, so the change
  is backward-compatible.

## [0.3.36] - 2026-07-21

### Added

- **`SearchBar`: real anchor links for navigation.** New optional
  `getResultHref(result)` and `getViewAllHref(term)` props. When provided, the
  autosuggest result rows and the "View all results" CTA render as real
  `<a href>` elements — middle-clickable, open-in-new-tab, hover-preview,
  crawlable — while the existing `onResultClick`/`onViewAllClick` callbacks
  still fire for SPA navigation (modified clicks fall through to the browser).
  Omit the props to keep the previous behaviour.
- **`OrderList`: URL-persistable filters.** New optional `initialSearchForm`
  (seed the filter form on mount, e.g. rehydrated from the URL) and
  `onSearchApply(form)` (fires when the user applies/clears filters) props, so
  the consuming page can keep the filter state in the URL — bookmarkable,
  shareable, back-button-friendly. `useOrders` gained the matching
  `initialSearchForm` option.

### Changed

- **`AccountIconAndMenu`: account-menu items are now `<a href>` instead of
  `<button>`** (both the sidebar and dropdown variants). They use each link's
  existing `href`, so they are middle-clickable / new-tab-able / crawlable;
  `onMenuItemClick` still handles plain-click SPA navigation.
- **`SearchBar`: the "View all results" fallback is now a `<button>`** (was a
  non-focusable `<div>`), so it is keyboard-accessible even without the new
  `getViewAllHref` prop.

### Fixed

- **`OrderList`: clickable rows now show `cursor: pointer`.** When
  `rowsClickable` is set, the row cursor matches its behaviour (was `auto`,
  inconsistent with the favourites cards).

## [0.3.35] - 2026-07-20

### Fixed

- **Raw enums no longer leak to the UI.** `OrderList` + `OrderSummary` gained a
  `statusLabels` prop (raw status → localized, e.g. `NEW`→"Nieuw"), and
  `OrderSummary` a `paymethodLabels` prop (raw method → localized, mapping both
  the order-path `REKENING` and quote-path `ACCOUNT` variants to one label).
  Unknown keys fall back to the raw value.
- `AddressCard`: new `showTypeBadge` prop (@default true) — set `false` to hide
  the invoice/delivery chip where a heading already names the type.
- **Concatenated sentences → placeholder interpolation** (fixes broken Dutch
  word order + missing spaces):
  - `FavoriteLists` delete confirm: full-sentence `deleteConfirm` with a
    `{name}` placeholder.
  - `CartOverview` / `QuoteActions` terms consent: `termsConsent` with a `{link}`
    placeholder (was "de<a>…", no space).
  - `LoginForm` account-header prompt: `noAccount` with a `{link}` placeholder
    (was "account?Create an Account", no space).
- **Pluralization**: `FavoriteLists` item count uses `itemSingular`/`itemPlural`
  by count; `GridToolbar` product count uses `productSingular`/`productPlural`.

## [0.3.34] - 2026-07-20

### Fixed

- **Date formatting**: `OrderList`, `OrderSummary`, `CartOverview`,
  `OrderShipments`, `PurchaseAuthorizationRequests`, `FavoriteLists` rendered
  dates via locale-less/`'en-US'` `toLocaleDateString` (US M/D/YYYY) or an
  inconsistent `D.M.YYYY` — Dutch readers misparse M/D by months. All now use a
  consistent numeric `DD-MM-YYYY` fallback (still overridable via
  `props.formatDate`).
- `CartIconAndSidebar`: new `cartItemLabels` prop, forwarded to the mini-cart's
  inner `CartItem` rows so the line labels (e.g. the `qtyPrefix` "Aantal:")
  localize; previously they fell back to English ("Qty:").
- `CartPaymethods`: new `paymethodLabels` prop — a code→localized-name map so
  the host can override un-localized backend method names (e.g. "On pickup"→
  "Bij afhalen"). Lookup: `paymethodLabels[code]` → `method.name` → `method.code`.

### Added

- `PriceToggle`: controlled `value` prop (parity with React). When supplied the
  toggle reflects THIS value's label + `aria-checked` and tracks its changes,
  instead of reading `initialState` once. Fixes the toggle showing a stale
  default ("Incl. BTW") while the persisted cookie said excl. — use `value`
  when the host persists the state.

## [0.3.33] - 2026-07-17

### Fixed

- `SearchBar`: the autosuggest dropdown hardcoded `price.gross` (excl. VAT) and
  ignored the Incl./Excl. toggle, under-quoting every product, and showed no
  tax label. It now carries both net/gross, picks the leading price from
  `includeTax` (resolved from `<PropellerProvider>`), and renders an
  `incl./excl.` label — consistent with `ProductPrice`/PLP/PDP. New optional
  props: `includeTax`, `priceLabels` (keys `inclTax`/`exclTax`).
- `CartIconAndSidebar`: the header mini-cart rendered line items excl. VAT
  (`includeTax=false`) while the total used `totalNet` (incl. VAT) and bonus
  items were pinned incl. — the lines never reconciled with the total and none
  followed the toggle. All three now share one `useTax` basis (from
  `includeTax`), so lines, total, and bonus items agree and respect the toggle.

### Changed

- `DeliveryDate`: weekday/month names in the quick-pick tiles now resolve via
  `labels` (keys `day_0`…`day_6`, `month_0`…`month_11`; English fallback) so
  they localize with the active locale instead of hardcoded English. New
  optional `language` prop (resolved from `<PropellerProvider>`) sets the
  native date-input's `lang`, localizing the browser calendar chrome
  (month name, weekday headers, Today/Clear).

## [0.3.32] - 2026-07-17

### Fixed

- `DeliveryDate`: when `skipWeekends` is on and the cart's `initialDate`
  (`postageData.requestDate`) is a weekend, it was adopted verbatim — landing
  the selected date in the "Other date" tile (rendered LAST, out of sequence)
  and replacing the "Other date…" entry point with that date's label. Now a
  weekend `initialDate` snaps to the first valid weekday tile, so the selection
  lands on the leading quick-pick and the "Other date…" tile is restored. A
  weekday `initialDate` is still adopted as-is.

## [0.3.31] - 2026-07-16

### Fixed

- `ActionCode`: the panel title now resolves through the `labels` map
  (`labels.title`) instead of only the `title` prop, so the "Action code"
  heading is translatable like every other label. Falls back to `props.title`,
  then `labels.title`, then `'Action code'`. Same fix as `CartSummary` in 0.3.30.

## [0.3.30] - 2026-07-16

### Fixed

- `CartSummary`: the panel title now resolves through the `labels` map
  (`labels.title`) instead of only the `title` prop, so the "Order summary"
  heading is translatable like every other label. Falls back to `props.title`,
  then `labels.title`, then `'Order summary'`.

## [0.3.29] - 2026-07-15

### Fixed

- Infrastructure props resolved from `<PropellerProvider>` (`graphqlClient`,
  `user`, `language`, `companyId`) are now typed **optional** on every
  component that injects them via `useInfraProps` — `ActionCode`, `AddToCart`,
  `AddToFavorite`, `AddressSelector`, `CartItem`, `CartOverview`,
  `CartPaymethods`, `CategoryDescription`, `CategoryShortDescription`,
  `ClusterInfo`, `FavoriteListDetails`, `FavoriteLists`, `ForgotPassword`,
  `GridTitle`, `Menu`, `OrderActions`, `OrderList`, `ProductBundles`,
  `ProductCard`, `ProductDownloads`, `ProductInfo`, `ProductVideos`,
  `PurchaseAuthorizationConfigurator`, `PurchaseAuthorizationRequests`,
  `RegisterForm`, `SearchBar`. Previously they were declared `required`, so
  consumers that rely on provider injection (the intended pattern) hit
  spurious `vue-tsc` "Property 'graphqlClient'/'user' is missing" errors at
  every call site. Brings the Vue package in line with the React package,
  which already types these as optional ("Resolved from PropellerProvider when
  omitted"). No runtime change — resolution already happened at runtime.

## [0.3.28] - 2026-07-10

### Fixed

- `CartItem` / `AddToCart`: product, bundle, cluster-option, and crossupsell
  names now resolve for the active `language` (via `getLanguageString`) instead
  of always taking `names[0]`. Cart lines, the add-to-cart modal, and the
  "added to cart" toast previously showed the first localised name regardless of
  the cart/page language. Mirrors the React fix.

## [0.3.27] - 2026-07-10

### Added

- `ProductSpecifications`: new `#beforeSpecs` / `#afterSpecs` scoped slots. Each
  receives `{ layout: 'table' | 'list' }` and renders arbitrary content at the
  start / end of the specifications — inside `<tbody>` for the table layout
  (return a `<tr>`, e.g. a labelled "Unit of measure" row) or in the list stack
  for the list layout (return a block). In grouped mode they render once, above
  the first group / below the last. General replacement for hardcoding extra
  rows; the existing `packageDescription` prop is unchanged. Mirrors the React
  `beforeSpecs` / `afterSpecs` render props.
- `ProductTabs`: `#specificationsBefore` / `#specificationsAfter` scoped slots
  that forward to the specifications section's new slots.

## [0.3.26] - 2026-07-09

### Added

- `ProductCard` / `ProductGrid`: new `belowNameComponent?: Component` prop plus a
  `#belowName` scoped slot on `ProductCard`. Renders arbitrary host-supplied
  content directly below the product name (and above the short description /
  price) in both the grid and row layouts, without forking the card — e.g.
  package descriptions or custom badges. On `ProductGrid` the component cascades
  to every card via `ProductGridConfig`; on `ProductCard` it can also be set
  per-card (explicit prop wins over grid context) or overridden via the
  `#belowName` slot. Mirrors the React `belowName` render prop.

## [0.3.25] - 2026-07-09

### Added

- `ProductGrid`, `SearchBar`, `ProductInfo`: new `orderlistIds?: number[]` and
  `applyOrderlists?: boolean` props to scope the product/search fetch to
  specific orderlists (e.g. a chosen B2B contract). When `orderlistIds` is
  non-empty, orderlists are applied (unless `applyOrderlists` is `false`);
  otherwise `applyOrderlists: false` is sent so an authenticated user without a
  contract still sees the full catalogue. Threaded through `useProductSearch`
  and `useProductInfo` (explicit ids override the composable's default
  all-company-orderlists resolution).
- `Menu`: new `getUrl?: (category: Category) => string` prop — a custom URL
  builder that overrides `menuLinkFormat` / `configuration.urls.getCategoryUrl`,
  letting hosts inject dynamic query strings (e.g. `?contract=…`). Mirrors the
  existing `Breadcrumbs.getUrl`.
- `GridToolbar`: new `hidePriceSort?: boolean` prop to hide the price sort
  option entirely (closed B2B portals where prices are "by quotation").
- `ProductTabs` / `ProductSpecifications`: new
  `specificationsPackageDescription?` (ProductTabs) → `packageDescription?`
  (ProductSpecifications) passthrough, rendering an extra package-description
  string above the specifications table.

  Mirrors React UI 0.4.16. All additions are additive and backward-compatible.

## [0.3.24] - 2026-07-08

### Changed

- Bumped the `@propeller-commerce/propeller-sdk-v2` dev dependency to `^0.12.0`
  to build and test against the SDK's 0.12.0 release. The runtime peer stays
  `*` — consumers pin the SDK version. No API change.

## [0.3.23] - 2026-06-26

### Added

- **`useCheckout().placeOrder` now supports PSP (deferred-payment) orders.**
  - New `orderStatus?` option — defaults to `'REQUEST'` in quote mode / `'NEW'`
    otherwise; pass `'UNFINISHED'` (or any backend status string) for an order
    awaiting an external payment whose final status the PSP webhook sets later.
  - New `finalizeOrder?: boolean` option (default `true`). Pass `false` to defer
    the order-confirmation email, confirm event, PDF attachment, **and cart
    deletion** to payment time — so a shopper handed off to a PSP isn't emailed
    and their cart isn't cleared before they've paid.

  Backward compatible: existing callers behave exactly as before. Mirrors React
  UI 0.4.14.

## [0.3.22] - 2026-06-25

### Added

- **Payment-method logos in `CartPaymethods`.** The component now renders each
  method's `logo` (SDK `CartPaymethod.logo`, available in
  `@propeller-commerce/propeller-sdk-v2` `^0.11.3`) as a square tile — logo on
  top, name below — matching the carrier tiles. Falls back to the method name
  when a method has no logo. New `showPaymethodLogo?: boolean` prop (default
  `true`) mirrors `CartCarriers`' `showCarrierLogo`. Mirrors React UI 0.4.13.

### Changed

- **`CartPaymethods` and `CartCarriers` now lay out as a square logo grid**
  (`grid-cols-2 sm:3 lg:4`, `aspect-square` tiles, centered logo + name, price
  badge in the corner) instead of the previous single-column name rows. Same
  selection behaviour, BEM classes, and `data-selected` hooks.
- **Bumped `@propeller-commerce/propeller-sdk-v2` to `^0.11.3`** — adds the
  `logo` field to `CartPaymethod`.

## [0.3.21] - 2026-06-24

### Changed

- **Bumped the `@propeller-commerce/propeller-v2-core-ui` dependency from
  `^0.2.4` to `^0.3.1`.** core-ui 0.3.0 promoted the rich `CmsProvider`
  contract and the typed CMS block catalog from the Next boilerplate into the
  shared core; 0.3.1 added a docs-site link. Both releases are purely additive
  ("nothing removed or renamed"), so this is a no-runtime-change dependency
  refresh that brings the Vue package onto the current core. No component
  source changed.

## [0.3.20] - 2026-06-24

### Documentation

- Added a link to the canonical docs site
  (https://propeller-commerce.github.io/propeller-v2-vue-ui/) at the top of the
  README, as the source of truth for props and usage.

## [0.3.19] - 2026-06-23

### Fixed

- **`GridFiltersPanel` rendered full-width on desktop, pushing the product
  grid off-screen.** The panel root carries `w-full lg:w-64 lg:flex-shrink-0`
  in the markup, but a consumer's Tailwind sheet re-emits `.w-full`
  (`width: 100%`) and — loading after this package's CSS — won the cascade on
  equal specificity, leaving the panel at full width and causing horizontal
  overflow on category/search pages. The desktop sidebar width is now restated
  on the `.propeller-grid-filters-panel` BEM hook inside the `@media
  (min-width: 64rem)` block (`width: 16rem; flex-shrink: 0`), so the package
  stays authoritative for its own width regardless of sheet order. Same
  cross-Tailwind cascade hardening already applied to the card row layouts in
  0.3.17 — the panel root was the one element it missed. Mirrors the
  `propeller-v2-react-ui` 0.4.10 fix.

## [0.3.18] - 2026-06-19

### Added

- **`GridFiltersPanel`** — a responsive wrapper around `GridFilters`. At `lg`
  (1024px) and up it renders the filters as the inline sidebar; below `lg` it
  collapses them behind a "Filters" button that opens a left slide-in drawer
  (dimmed backdrop, close button, "Show results" to dismiss). A single
  `GridFilters` instance backs both layouts — no duplicate fetch or state.
  Replaces the host's `<aside><GridFilters/></aside>`. New label keys:
  `filtersButton`, `applyFilters`, `closeFilters`. Optional `activeFilterCount`
  shows a badge on the button.

## [0.3.17] - 2026-06-19

### Fixed

- **Product card list view broke on desktop after the 0.3.16 mobile
  redesign.** The mobile-first footer (`flex-col`, full-width `AddToCart`
  controls) leaked into the desktop row layout because the `md:` overrides
  lost the cross-Tailwind cascade. The desktop (≥768px) row intent is now
  restated on the BEM hook classes in `styles.css` — footer back to a row,
  `__footer-meta` to `display: contents`, and the `AddToCart` controls back to
  a single nowrap row with a fixed-width quantity input.
- **Price clipped in the mobile grid card.** The stock + price meta row could
  overflow a narrow (~190px) grid card. The row now wraps and the price is
  allowed to shrink (`min-w-0`, right-aligned) instead of being cut off.

### Changed

- **`ClusterCard` gets the same responsive footer as `ProductCard`.** Below
  768px the list view uses a 2-row footer (stock/price, then full-width "View
  cluster" button) and the grid view pairs stock/price in a wrapping meta row;
  desktop (≥768px) is unchanged.

## [0.3.16] - 2026-06-19

### Changed

- **Mobile product card layout (below 768px).** On narrow viewports the
  `ProductCard` action area no longer overflows the card edge — the quantity
  stepper and "Add to cart" button were clipped. Below `md` (768px):
  - **List view** (`columns === 1`): the footer becomes two rows — stock and
    price share the first row (`justify-between`), and the full-width
    `AddToCart` (stepper + button) sits on the second row.
  - **Grid view** (`columns > 1`): the footer becomes three rows — stock ↔
    price, then a full-width stepper, then a full-width button.

  At `md` and up the previous desktop layout is unchanged. This flows through
  every surface that renders `ProductCard` / `ProductGrid` (catalog, search,
  product slider). Implemented purely with responsive Tailwind classes — no
  JavaScript width detection.

### Added

- **Cart icon in the `AddToCart` button.** The submit button now renders a
  built-in cart glyph (`.propeller-add-to-cart__icon`) before its label, drawn
  with `currentColor` and `em` sizing so consumers can restyle its size,
  colour and stroke via CSS.

### Fixed

- **`CartItem` lost its card border and delete button.** Vue coerces an
  unpassed `Boolean` prop to `false`, so the on-by-default `cardFrame` and
  `showDelete` props evaluated to `false` and hid the card frame and the
  delete (trash) button. Both now default to `true` explicitly via
  `withDefaults`.

## [0.3.15] - 2026-06-11

### Fixed

- **VAT toggle (incl./excl. tax) had no effect on catalog cards.** `ProductGrid`,
  `ProductCard` and `ClusterCard` ignored the `<PropellerProvider>` `includeTax`
  flag, so prices stayed gross (excl. VAT) regardless of the toggle. Two stacked
  causes:
  - **Vue Boolean-prop coercion** — an absent `includeTax?: boolean` prop is cast
    to `false` (never `undefined`), so `useInfraProps`' "explicit prop wins"
    precedence treated the coerced `false` as an override and never consulted the
    provider. The grid now resolves `includeTax` from the provider context
    directly (`usePropellerContext()`), treating only an explicit `true` as a host
    opt-in, and passes the resolved value down to every card.
  - **`inject()` inside a `computed`** — `ProductCard` / `ClusterCard` resolved
    props via `computed(() => useResolvedProps(...))`, where `inject()` returns a
    null context (it is setup-only). Infra is now resolved once at setup via
    `useInfraProps(props)`, so the reactive provider value (the VAT toggle) is
    honoured. Same class of bug as the 0.3.1 provider fix.

  Brings the Vue cards to parity with `propeller-v2-react-ui`, whose `ProductCard`
  already resolves `includeTax` from infra. Standalone `ProductPrice` /
  `ProductBulkPrices` / `ProductInfo` keep the React contract (the consumer passes
  `includeTax`); the propeller-vue PDP / cluster views were updated accordingly.

## [0.3.14] - 2026-06-09

### Fixed

- **`FavoriteListDetails` stuck on "Loading..." forever** when the consumer
  doesn't pass `:graphqlClient` / `:user` / `:configuration` explicitly. Routed
  every infra read through `useInfraProps`.
- **`PurchaseAuthorizationRequests` rendered no rows** for the same reason.
  Routed every infra read through `useInfraProps`.

## [0.3.13] - 2026-06-09

### Fixed

Three more components silently ignored the documented "resolve from
`<PropellerProvider>`" contract because they read infrastructure off
`props.*` directly instead of through `useInfraProps`. Consumers that follow
the contract and DON'T pass these props (e.g. propeller-vue) got broken
features with no error. This is the same class of bug as 0.3.8 / 0.3.9 and
brings the Vue package to parity with `propeller-v2-react-ui`, whose
`ProductSlider` / `ProductGrid` already resolve these via `useInfraProps`:

- **`ProductGrid` never fetched on the client.** It passed `props.graphqlClient`
  to `useProductSearch`; with no client the fetch short-circuits, so the grid
  only ever showed SSR-seeded items and went empty on every client-side
  category/search navigation (products "only appeared after a hard refresh").
  Now resolves `graphqlClient`, `configuration`, `user`, `companyId`,
  `language`, `includeTax`, `portalMode` via `useInfraProps`; nested
  ProductCard/ClusterCard pass-throughs read the resolved values too.
  (Complements the 0.3.12 `useProductSearch` watcher-timing fix — that made
  the fetch *fire* on SPA nav; this gives it a *client* to fire with.)

- **`ProductSlider` rendered nothing on PDP / cluster pages.** Same root cause:
  `props.graphqlClient` was undefined, so the crossupsell fetch threw, was
  swallowed, and the cross/up-sell sliders never appeared. Now resolves infra
  via `useInfraProps`. `graphqlClient` and `language` props relaxed to optional.

- **`AccountIconAndMenu` stayed in its signed-out state forever.** It called
  `useInfraProps` but the template/helpers still read `props.user`, which is
  `undefined` for provider-driven consumers — so the header dropdown kept
  showing the login form after login, and the account-page sidebar variant
  rendered empty. Template + `getUserName()` + the menu-close watch now read a
  script-level `const user = computed(() => infra.user ?? null)`. Also removed
  a stray debug `console.log` from `handleIconClick`.

## [0.3.12] - 2026-06-09

### Fixed

- **`useProductSearch` stayed stuck on the previous category's data after
  an SPA navigation between catalog pages.** The composable's input watcher
  fired when `categoryId` changed, but early-returned via
  `if (!isControlled.value) fetchProducts()` because `isControlled` was still
  `true` at that tick — the parent boilerplate's flip from controlled mode
  (SSR-seeded items) to uncontrolled mode (`:products="undefined"`) was queued
  in a separate, later-flushing watcher. Once controlled mode flipped off,
  no input the composable tracked had changed again, so the fetch that
  should have run for the new category never started. The visible symptom
  was an empty "No products found" grid on the destination category until
  the user pressed F5 (which re-ran SSR and re-seeded the new category).
  Added `isControlled` to the watcher's tracked sources so a parent that
  flips controlled mode off re-fires the watcher with the now-uncontrolled
  flag and the deferred fetch runs.
- **`UserDetails` template tripped vue-tsc in CI** with `TS18048:
  '__VLS_ctx.user' is possibly 'undefined'`. The 0.3.11 fix switched the
  `user` prop to optional and added a script-level `const user = computed(...)`
  resolved via `useInfraProps`, but the template binding for the email field
  still read `{{ user.email }}` unconditionally. Switched to `{{ user?.email }}`,
  matching the optional-chaining pattern the rest of the template
  (`getActiveCompany()?.name`, etc.) already uses.

## [0.3.11] - 2026-06-09

### Fixed

- **`UserDetails` crash on the account dashboard** (`TypeError: Cannot read
  properties of undefined (reading 'email')`). Mirror of the 0.3.9
  `CompanySwitcher` fix: the template binds to `user.email` via Vue's
  auto-exposed `props.user`; consumers that follow the documented "resolve
  from `<PropellerProvider>`" contract and don't pass `:user` blew up the
  render. Wired `useInfraProps(props)` + a script-level `const user = computed(...)`
  that overrides the auto-exposure with the provider fallback. Switched
  the `user` prop to optional.

## [0.3.10] - 2026-06-09

### Fixed

- **`ProductInfo` rendered an empty image/badges column on every legacy call
  site.** The `useNewShell` heuristic — which decides whether to render the
  composable PDP shell or the legacy SKU+title block — included the nine
  Boolean `show*` props in its presence check (`props[k] !== undefined`).
  Vue 3 runtime-normalizes any declared Boolean prop the parent doesn't pass
  to `false`, not `undefined`, so every consumer doing
  `<ProductInfo :product="…" />` flipped the heuristic to the new shell.
  Inside the new shell the per-slot `v-if="show* !== false"` then evaluated
  `false !== false` → `false`, so the image, badges, favourite, price, stock,
  add-to-cart, bundles, bulk-prices and surcharges sections silently
  skipped their default content — the visible symptom was an empty
  `propeller-product-info__media` column on the PDP. Removed the Boolean
  `show*` keys from `NEW_SHELL_KEYS`; only `*Component` injection props now
  opt the consumer into the new shell. The per-section `show*` flags still
  work inside the new shell once it is opted into.

## [0.3.9] - 2026-06-09

### Fixed

- **`CompanySwitcher` crash on first render after login** (`TypeError: Cannot
  read properties of undefined (reading 'companies')`). The component read
  `props.user.companies` directly without falling back to the propellerVue
  plugin scope or guarding against `user === undefined`, so any consumer that
  relied on the documented "resolved from `<PropellerProvider>`" contract
  blew up Vue's render. Wired `useInfraProps(props)`, switched the `user`
  prop to optional, and added a `(infra.user ?? props.user)` guard.
- **`CartIconAndSidebar` silent no-op + reactivity gaps.** Same provider
  gap: `useCart` received `props.graphqlClient!` (undefined → SDK crash on
  any drawer mutation), and `showCheckoutButton` / `showRequestAuthorizationButton`
  + currency formatting all read `props.user` / `props.companyId` /
  `props.currency` directly. Routed every infra read through `useInfraProps`
  so AppHeader can mount the drawer with just `:cart="..."` and have
  everything else resolve.

## [0.3.8] - 2026-06-09

### Fixed

- **`LoginForm`, `AccountIconAndMenu`, `AddToCart`, `CartItem` silently no-op
  when the consumer doesn't pass `:graphqlClient` explicitly.** These four
  components were reading `props.graphqlClient` directly instead of resolving
  it through `useInfraProps` / `useResolvedProps`, so the value never fell
  back from the `propellerVue` plugin scope. The login button submitted
  nothing, PDP "Add to cart" did nothing, and the cart row +/- / delete
  buttons did nothing — every handler hit a `if (!props.graphqlClient) return;`
  guard.
  - `LoginForm.vue`: added `useInfraProps(props)` and routed `useAuth` +
    the submit guard through it.
  - `AccountIconAndMenu.vue`: added `useInfraProps(props)` and passes
    `infra.graphqlClient` to the embedded `<LoginForm>`.
  - `AddToCart.vue`: added `useInfraProps(props)` and routes `useCart`
    + the submit guard through it.
  - `CartItem.vue`: extended `RESOLVE_SPEC` with the Tier 1 infra keys
    (`graphqlClient`, `user`, `companyId`, `configuration`, `language`,
    `currency`, `includeTax`) so the spec matches `ProductCard` /
    `ClusterCard`. Direct-prop precedence preserved.

## [0.3.7] - 2026-06-08

### Fixed

- **SSR crash on catalog pages when consumer omits `:configuration` prop.**
  `ProductCard.getProductUrl()`, `ClusterCard.getClusterUrl()`, and
  `Breadcrumbs.getCategoryUrl()` dereferenced `props.configuration.urls`
  without optional chaining, throwing `Cannot read properties of undefined
  (reading 'urls')` at SSR time. Guarded all three with `?.urls?.` and a
  `?? '#'` fallback so the components render harmlessly when the consumer
  hasn't wired `:configuration` through (e.g. on `<ProductGrid>` cards
  inside SearchView / CategoryView). Matches the guard `CartItem` already
  had. No API change.

## [0.3.6] - 2026-06-04

### Changed

- **SDK dependency switched from GitHub tarball to npm.** Both the
  `peerDependencies` entry and the `devDependencies` test pin now point
  at `@propeller-commerce/propeller-sdk-v2@^0.11.1` instead of
  `github:propeller-commerce/propeller-sdk-v2#master`. All 121 source +
  test files (incl. `.vue` SFCs) renamed accordingly
  (`from 'propeller-sdk-v2'` →
  `from '@propeller-commerce/propeller-sdk-v2'`).

### Dependencies

- Bumps `propeller-v2-core-ui` to 0.2.4 (its own SDK switch to npm).

### Why

The SDK is now published on npm as a properly scoped package. Pinning
via npm removes the GitLab→GitHub mirror dependency from the install
chain and gives consumers semver ranges instead of a moving master tip.
Behaviour is unchanged.

## [0.3.5] - 2026-06-04

### Fixed

- **`CartItem` now resolves product / bundle / crossupsell / cluster
  option names via `getLanguageString`** (from
  `propeller-v2-core-ui@0.2.3`), matching the active language and
  walking the localised entries for the first non-empty value before
  falling back to `'Product'` / `'Option'`. Previously each template
  binding and helper hard-coded `names?.[0]?.value || 'Product'`, which
  always picked the first SDK entry regardless of language and rendered
  blank when that first entry's `value` was empty. Cart pages now show
  the correct localised name and never collapse to invisible rows on
  datasets with sparse localisation.

### Dependencies

- Bumps `propeller-v2-core-ui` to 0.2.3 (the resolver fix that powers
  the above).

## [0.3.4] - 2026-06-03

**Menu pre-fetch fix.** `<Menu :tree="...">` previously treated *any*
array (including `[]`) as a successful host pre-fetch and locked itself
into the empty state — no client-side fallback fetch, no recovery.

This bit SSR setups whose `lib/server.ts` `fetchMenu` swallows errors
and returns `[]` by design (so a transient backend hiccup doesn't break
the whole render). The consumer stored the empty result in its menu
store, AppHeader passed `:tree="[]"`, and `<Menu>` showed
"No categories found" with no way out, even after the backend recovered.

### Changed

- `hasPrefetchedTree` now requires `props.tree` to be a NON-empty array.
  `[]` is no longer treated as a pre-fetch; the component falls back to
  its internal `useMenu` fetch, which can succeed where the SSR
  pre-fetch failed. A legitimately-empty backend still renders the
  empty state because the client fetch also returns `[]`.

## [0.3.2] - 2026-06-03

**Reactivity fix** for the provider snapshot. After 0.3.1 fixed the
`inject()`-inside-`computed` bug, components that read infra props via
`useInfraProps()` still went stale on provider updates. Symptom:
`AccountIconAndMenu` rendered the anonymous state until the page was
refreshed after login — `auth.user` updated on the store and propagated
into `<PropellerProvider :user>`, but the package-side `AccountIconAndMenu`
kept reading the old value.

Root cause: `usePropellerContext()` returned `{ ...deps, ...scope, userMode }`
— spreading the reactive `scope` snapshotted its current values into a
plain object. `useInfraProps()` (correctly) caches that object at setup,
so every subsequent infra read was reading a frozen copy and missed all
provider updates.

### Changed

- **`usePropellerContext()` / `useRequiredPropellerContext()`** now build
  the composite via getters that pierce through to the live reactive
  scope (user, companyId, language, includeTax, portalMode, userMode).
  Consumers that capture the returned object at setup keep getting live
  reads — login / language switch / VAT toggle propagate without a
  refresh. No call-site changes required.

### Verification

- `vue-tsc --noEmit` clean.
- `npm run test` — 183 tests pass unchanged (none asserted on the
  snapshot semantics, so no test churn).
- Manual smoke: scaffolded `vue-shop` from the accelerator + logged in
  via AccountIconAndMenu's embedded form → menu re-renders to the
  authenticated layout on the same page tick, no refresh required.

## [0.3.1] - 2026-06-02

**Critical fix** for the 0.3.0 retrofit. The previous release wrapped
`useInfraProps(props)` in `computed(() => useInfraProps(props))` in
every component. The composable internally calls Vue's `inject()`, which
only works inside `setup()`. When the computed re-ran later (during a
click handler, an effect, or any reactive recalc), `inject()` returned
the default value (`null`) and the component silently lost its provider
context — graphqlClient, user, language, configuration all undefined.

Symptom in 0.3.0: **anonymous "Add to cart" did nothing**. The
`handleAddToCart` early-returns when `infra.value.graphqlClient` is
falsy. Logged-in flows that happened to capture the resolved infra on
the very first synchronous read during setup looked fine until any
reactive dependency invalidated the computed.

### Changed

- **`useInfraProps()`** now resolves the `PropellerContext` exactly once
  at setup time (where `inject()` is legal) and returns a `reactive`
  object whose infra-key reads forward to either the live prop or the
  ctx snapshot. Reactivity is preserved (the provider scope is itself
  reactive) without a wrapping computed.
- **All 51 retrofitted components** change from
  `const infra = computed(() => useInfraProps(props))` →
  `const infra = useInfraProps(props)`, and every `infra.value.X` →
  `infra.X`. No behaviour change on the happy path; the previously
  broken late-read path now works.

### Verification

- `vue-tsc --noEmit` clean.
- 22 / 22 vitest pass.
- `npm run build` emits identical dts shape.
- Browser repro of anonymous AddToCart on the cluster page in
  propeller-vue now logs `infra.graphqlClient` truthy and reaches
  `addItem` → `initCart` → cart creation.

## [0.3.0] - 2026-06-02

Wires every component into the existing `<PropellerProvider>` via the
`useInfraProps()` composable. Consumers can now omit Tier 1 / Tier 2
infra props (`graphqlClient`, `services`, `user`, `companyId`,
`language`, `includeTax`, `currency`, `configuration`, `portalMode`) and
the component resolves them from the provider — bringing the Vue
package in line with what React UI already did in 30 of its 66
components.

Before 0.3.0, only `CartBonusItems` and `OrderBonusItems` honoured the
provider; the other 50 components required every infra prop to be
passed by the consumer at every render site. After 0.3.0, all 52
components resolve from the provider as a fallback. Explicit props still
win — call sites that pass values keep their previous behaviour
unchanged.

### Changed

- **52 components** now wrap their `props` through
  `useInfraProps(props)` in a `computed`, matching the canonical
  `CartBonusItems.vue` pattern. The full list:
  `AccountIconAndMenu`, `ActionCode`, `AddToCart`, `AddToFavorite`,
  `AddressSelector`, `Breadcrumbs`, `CartCarriers`, `CartIconAndSidebar`,
  `CartItem`, `CartPaymethods`, `CartSummary`, `CategoryDescription`,
  `CategoryShortDescription`, `ClusterCard`, `ClusterInfo`,
  `ClusterOptions`, `CompanySwitcher`, `FavoriteListDetails`,
  `FavoriteListItem`, `FavoriteLists`, `ForgotPassword`, `GridFilters`,
  `GridToolbar`, `ItemsOverview`, `LoginForm`, `Menu`, `OrderActions`,
  `OrderItemCard`, `OrderList`, `OrderSummary`, `OrderTotals`,
  `ProductBulkPrices`, `ProductBundles`, `ProductCard`,
  `ProductDescription`, `ProductDownloads`, `ProductGrid`, `ProductInfo`,
  `ProductPrice`, `ProductShortDescription`, `ProductSlider`,
  `ProductSpecifications`, `ProductTabs`, `ProductVideos`, `QuoteActions`,
  `PurchaseAuthorizationConfigurator`, `PurchaseAuthorizationRequests`,
  `RegisterForm`, `SearchBar`, `UserDetails`.
- Template forwards inside `ProductCard.vue` and `ProductGrid.vue` that
  passed `:foo="props.X"` to child components now pass `:foo="infra.X"`
  so the explicit-or-provider value flows uniformly down the tree.
- Three components grew a shadow `const X = computed(() => infra.value.X)`
  binding (`AccountIconAndMenu`, `AddToFavorite`, `UserDetails`)
  because their templates reference the infra value bare
  (`v-if="user"`, `{{ user.email }}`) and Vue's setup-binding lookup
  needs a setup-scope ref to read from.

### Migration

Existing consumers that pass all infra props keep working unchanged —
the resolver's contract is "explicit wins, otherwise provider, otherwise
undefined." Consumers should now feel free to drop redundant prop passes
where `<PropellerProvider>` wraps the subtree.

A follow-up cleanup PR in `propeller-vue` will prune the ~245 redundant
prop-lines its views currently pass, starting with `ProductDetailView`,
`CategoryView`, and `CartView`.

### Verification

- `vue-tsc --noEmit` clean.
- 22 / 22 vitest tests pass unchanged.
- `npm run build` emits identical dts shape (infra prop types were
  already optional in 0.2.0; the change is purely internal wiring).

## 0.2.3

### Fixed

- `AccountIconAndMenu` no longer forwards its own `labels` (which contains menu-UI slugs like `accountLabel`, `logoutLabel`) to the embedded `<LoginForm>` — that previously caused LoginForm's `email`, `password`, `forgotPassword` strings to fail translation. Use the new `loginFormLabels?` prop instead.

### Added

- `AccountIconAndMenu`: new `loginFormLabels?: Record<string, string>` prop, forwarded to the embedded `<LoginForm>`. Lets consumers pass the LoginForm namespace's translations through to the dropdown sign-in form.

## 0.2.2

### Added

- `ProductCard` / `ProductGrid` / `ProductSlider`: new `priceLabels?: Record<string, string>` prop, forwarded through to the embedded `<ProductPrice>` display inside each card. Lets consumers translate `inclTax` / `exclTax` / `loginToSeePrices` strings on grid/slider pages without per-card wiring. `ClusterCard` is intentionally unchanged — it builds its own price span and doesn't render `<ProductPrice>`.

## 0.2.1

### Added

- `ProductGrid` / `ProductSlider`: new props `productCardLabels?`, `clusterCardLabels?`, `addToCartLabels?` for forwarding translations to embedded `<ProductCard>` / `<ClusterCard>` / inner `<AddToCart>`. Mirrors the existing `stockLabels?` pattern.
- `PriceToggle`: new `labels?: Record<string, string>` prop with slugs `pricesLabel`, `inclVat`, `exclVat`. Previously these strings were hardcoded.
- `OrderList`: filter column field labels and sort-field dropdown options now route through the `labels` prop. Column labels use slug `col<Capitalized>` (e.g. `colTerm`, `colCreatedAt`); sort options use the enum value as the slug. All fallbacks preserve existing English behavior, so the change is non-breaking.

### Fixed

- `ProductSlider` no longer forwards its own `labels` (slider-UI slugs) to embedded `ClusterCard` / `ProductCard` — that previously caused card-level strings to fail translation. Use the new `clusterCardLabels?` / `productCardLabels?` props instead.

## [0.2.0] - 2026-06-01

Adds shop-mode-aware user gating. Mirrors the React UI change. Existing
public API is unchanged; new fields are optional and default to
backward-compatible behaviour.

### Added

- **`shopMode?: ShopMode`** on `PropellerScope`. Declares whether the shop
  is `'b2b'`, `'b2c'`, or `'hybrid'`. Defaults to `'hybrid'` when omitted
  so existing call sites keep their current branching semantics (any
  logged-in Contact treated as B2B).
- **Derived `userMode: UserMode`** on `PropellerInfra`. Computed via
  `deriveUserMode(user, shopMode)` from `propeller-v2-core-ui`. Values:
  `'anonymous' | 'b2b' | 'b2c'`. B2B-gated UI (company switcher, B2B
  side-nav items, quote/authorization affordances) should read this
  instead of re-deriving from `isContact(user)` ad hoc.
- **`useUserMode()` composable**. Direct read of `userMode` for components
  that only need that one signal.

### Why this matters

Hybrid shops need a single, consistent gate that says "is the current
viewer behaving as B2B or B2C?" Previously every B2B-gated component
re-derived this from `isContact(user)` ad hoc, which was correct but
duplicated and ignored the shop's `mode` (a B2C shop that somehow had a
Contact session would still light up the B2B surface). Centralising the
derivation eliminates the duplication and makes the shop mode authoritative.

### Requires

- `propeller-v2-core-ui` ≥ 0.2.0 (for `deriveUserMode`, `ShopMode`,
  `UserMode`).

---

## [0.1.0] — Unreleased

First version of the package. Extracted from the `propeller-vue`
storefront so the Propeller Commerce Vue surface can be consumed as a
standalone library. The Vue mirror of `propeller-v2-react-ui`. Not yet
published to a registry — consumed via a `file:` link or `github:` URL
during stabilization.

### Added

- **Initial extraction.** 60 components, the 15 Vue composables, the
  runtime-agnostic `composables/shared/` layer (utilities and domain
  types), and the three reactive shared wrappers (`usePagination`,
  `useServiceFetch`, `useUserIdentity`) moved into this package from
  `propeller-vue`.
- **Build pipeline.** Vite library mode (`@vitejs/plugin-vue` +
  `vite-plugin-dts`) produces dual ESM + CJS bundles with `.d.ts`
  declarations. Unlike the React package there is no `"use client"`
  banner — Vue has no such directive.
- **Three entry points.** `propeller-v2-vue-ui` (components, composables,
  the provider, `createServices`, `toPlain`); `propeller-v2-vue-ui/shared`
  (pure TS — `createServices`, `toPlain`, formatters, helpers, all domain
  types — safe to import from a Nuxt server context or a build script);
  and `propeller-v2-vue-ui/pure` (SSR-safe presentational components —
  `ProductPrice`, `ItemStock`, `GridTitle`, `OrderTotals`, … — with no
  composables and no browser APIs, cheap to render into an SSR shell).
  Mirrors `propeller-v2-react-ui`'s `/pure` entry component-for-component.
- **Precompiled stylesheet** (`dist/styles.css`). The package's Tailwind
  v4 classes are compiled to vanilla CSS at build time and shipped.
  Consumers import it once and do **not** need Tailwind in their own
  project. Token names and BEM hook class names are kept identical to
  `propeller-v2-react-ui`.
- **Three styling override surfaces** — theme tokens (CSS variables), BEM
  hooks, and per-instance `class`. Documented in [STYLING.md](./STYLING.md).
- **`providePropeller` / `usePropellerContext`** — the single integration
  point, a `provide`/`inject` provider. `providePropeller(value)` installs
  the `PropellerInfra` (carrying `graphqlClient`, `services`, `user`,
  `companyId`, `language`, `includeTax`, `currency`, `configuration`,
  `portalMode`). Imports zero host code.
- **`provideProductGridConfig` / `useProductGridConfig`** — Tier-2 grid
  config provider used by `ProductGrid` to collapse ~20 cascaded props on
  `ProductCard` / `ClusterCard`.
- **`createServices(client)`** — factory that builds the typed `Services`
  bundle (`product`, `cart`, `user`, `order`, …) keyed to a
  consumer-built `GraphQLClient`. Memoized per client via `WeakMap`.
  Copied verbatim from `propeller-v2-react-ui` — pure, framework-agnostic.
- **`toPlain(value)`** — recursively strips the SDK's underscore-prefixed
  backing fields from class instances.
- **`useServices()`** — reads the `Services` bundle from the provider;
  throws a clear error when used outside `providePropeller()`.
- **`useInfraProps()` / `useResolvedProps()`** — resolve component props
  against the provider (and the grid config) with explicit-prop-wins
  precedence. New to the Vue surface (the React package had them; the Vue
  composables did not).
- Public-grade documentation: [README.md](./README.md),
  [STYLING.md](./STYLING.md), [TECH.md](./TECH.md),
  [CONTRIBUTING.md](./CONTRIBUTING.md), [MIGRATION.md](./MIGRATION.md),
  [SECURITY.md](./SECURITY.md), and an MIT `LICENSE`.
- **Unit tests.** Vitest suite covering the pure-logic surface — `src/lib/`
  (`createServices`, `toPlain`) and the framework-free shared utilities.
  13 test files, 183 tests, ported from `propeller-v2-react-ui`.
- **CI pipeline** (`.gitlab-ci.yml`). A `verify` stage (typecheck, unit
  tests + coverage, build), a `downstream` stage that builds the package
  and runs `propeller-vue`'s Playwright e2e suite against it (the
  component regression gate), and a `mirror` stage that mirrors to the
  public GitHub repo.
- **Storybook** (`.storybook/`, Storybook 9 + `@storybook/vue3-vite`). A
  story per component (60 total), rendering each in isolation against
  fixture data and a mock provider. Mock foundation in `src/__mocks__/`
  (`fixtures.ts`, `mockServices.ts`, `decorators.ts`).
- **Documentation site** (`docs/`). A self-contained Docusaurus 3 app —
  hand-written MDX guides, a six-page **API integration** section
  (`guides/api/`) explaining how the composables reach the GraphQL
  backend domain by domain, and a **generated TypeDoc API reference**
  (`content/api/`, rebuilt by `npm run gen:api` from the package's
  pure-TS headless surface — composables, provider, SDK seam, utilities
  and types). The `.vue` components' prop tables stay in Storybook, since
  TypeDoc cannot parse Single-File Components. Not published, not in the
  package build.

- **`Menu`: optional pre-fetched `tree` prop.** When the host supplies
  `tree: MenuCategory[]`, `Menu` skips its internal `useMenu` fetch
  entirely and renders the tree directly — mirroring the
  `ProductGrid.products` opt-in. Lets host apps fetch the category tree
  server-side (e.g. in `entry-server.ts`'s always-on prefetch) and have
  the menu HTML land in the initial response. Omitting the prop preserves
  the legacy client-side fetch behaviour — no breaking change.
- **`MenuCategory` type exported from `/shared`.** Type-only re-export so
  server modules (e.g. a host's `lib/server.ts`) can build the tree without
  pulling the Vue composable's runtime into the server bundle.

### Changed

- **Decoupled the SDK seam from the host (vs the in-app original).** Every
  composable previously did `new XxxService(graphqlClient)` inline (57
  call sites). They now resolve services through the memoized
  `createServices(graphqlClient)` factory. The package ships no
  `graphqlClient` singleton, no hardcoded endpoint, and reads no
  `import.meta.env`. The consumer constructs its own `GraphQLClient`,
  calls `createServices(client)`, and installs both via
  `providePropeller`.
- **Removed host coupling from components.** `ProductCard` no longer
  imports `vue-router` (navigation via the `onProductClick` callback prop,
  with a native location fallback). `SearchBar` and `CartIconAndSidebar`
  no longer import `localizeHref` from the host config — URLs come from
  the `configuration` prop's url builders. `AddToCart` and
  `CartIconAndSidebar` use a plain `<a>` instead of `<router-link>`.

### Fixed

- **~186 pre-existing type errors.** The original `propeller-vue` excluded
  `components/propeller/` from its `vue-tsc` run, so the 60 components were
  never type-checked. This package type-checks the whole surface;
  `vue-tsc --noEmit` is clean. The bulk were inline event handlers using
  `e.target.value` on the bare `EventTarget` type (fixed with an
  `HTMLInputElement` cast) plus assorted SDK type-name and narrowing
  corrections.
