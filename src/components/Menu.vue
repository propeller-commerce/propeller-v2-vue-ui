<template>
  <div
    :class="`propeller-menu ${className || ''}`"
    :data-variant="$slots.menu ? (menuStyle || 'custom') : getMenuStyle()"
    :data-loading="isLoading ? 'true' : 'false'"
  >
    <!--
      Custom renderer. The built-in styles are three arrangements of the same
      tree; this is the escape hatch for a fourth, since an unrecognised
      `menuStyle` string could never match a branch on its own. Exposes the
      state and helpers the built-ins use, so a custom menu gets working
      open/close, URL building and click handling rather than reimplementing
      them and drifting. When present it owns the loading/error states too.
    -->
    <template v-if="$slots.menu">
      <slot
        name="menu"
        :categories="menuCategories"
        :is-loading="isLoading"
        :has-error="hasError"
        :max-depth="maxDepth"
        :get-sub-categories="getSubCategories"
        :get-category-name="getCategoryName"
        :get-category-url="getCategoryUrl"
        :handle-item-click="handleItemClick"
        :open-path="openPath"
        :is-open-at="isOpenAt"
        :open-at="openAt"
        :toggle-at="toggleAt"
      />
    </template>

    <template v-if="!$slots.menu && isLoading">
      <div class="propeller-menu__loading flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <div
          class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        ></div>
        <span>{{ getLabel('loading', 'Loading menu...') }}</span>
      </div>
    </template>

    <template v-if="!$slots.menu && !isLoading && hasError">
      <div class="propeller-menu__error px-4 py-3 text-sm text-destructive">
        {{ getLabel('error', 'Failed to load menu') }}
      </div>
    </template>

    <template
      v-if="
        !$slots.menu &&
        !isLoading &&
        !hasError &&
        menuCategories.length === 0
      "
    >
      <div class="propeller-menu__empty px-4 py-3 text-sm text-muted-foreground">
        {{ getLabel('empty', 'No categories found') }}
      </div>
    </template>

    <template
      v-if="
        !$slots.menu &&
        !isLoading &&
        !hasError &&
        menuCategories.length > 0 &&
        getMenuStyle() === 'dropdown-vertical'
      "
    >
      <nav :class="`propeller-menu__nav propeller-menu-dropdown hidden md:block ${menuClass || ''}`">
        <!--
          `max-w-[100vw] overflow-x-auto` so a deep tree degrades to a scroll
          rather than running off the viewport: at 5 levels the columns total
          1280px, which clears a 1440px desktop but not a smaller laptop or a
          trigger positioned mid-page.
        -->
        <div class="flex max-w-[100vw] overflow-x-auto bg-popover border border-border shadow-lg">
          <MenuLevel
            variant="columns"
            :items="menuCategories"
            :level="0"
            :max-depth="maxDepth"
            :open-path="openPath"
            :get-url="getCategoryUrl"
            :get-name="getCategoryName"
            :get-children="getSubCategories"
            :on-item-click="handleItemClick"
            @open="openAt"
            @toggle="toggleAt"
          />
        </div>
      </nav>
    </template>

    <template
      v-if="
        !$slots.menu &&
        !isLoading &&
        !hasError &&

        menuCategories.length > 0 &&
        getMenuStyle() === 'jumbotron'
      "
    >
      <nav :class="`propeller-menu__nav propeller-menu-jumbotron hidden md:block ${menuClass || ''}`">
        <div class="propeller-menu__tabs flex items-center border-b border-border">
          <template :key="`l1-${l1.categoryId}-${idx}`" v-for="(l1, idx) in menuCategories">
            <button
              data-level="1"
              :data-active="isOpenAt(0, l1.categoryId) ? 'true' : 'false'"
              @mouseenter="async (event) => openAt(0, l1.categoryId)"
              @click="async (e) => handleItemClick(l1, e)"
              :class="`propeller-menu__tab cursor-pointer px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                isOpenAt(0, l1.categoryId)
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground hover:text-primary hover:border-primary/50'
              }`"
            >
              <span class="propeller-menu__label">{{ getCategoryName(l1) }}</span>
            </button>
          </template>
        </div>
        <template :key="idx" v-for="(l1, idx) in menuCategories">
          <template v-if="isOpenAt(0, l1.categoryId) && getSubCategories(l1).length > 0">
            <div
              class="propeller-menu__panel bg-popover border border-border border-t-0 shadow-lg p-6"
              @mouseenter="async (event) => openAt(0, l1.categoryId)"
              @mouseleave="async (event) => openAt(0, null)"
            >
              <div class="propeller-menu__panel-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <template :key="`l2-${l2.categoryId}-${idx2}`" v-for="(l2, idx2) in getSubCategories(l1)">
                  <div class="propeller-menu__group" data-level="2">
                    <a
                      class="propeller-menu__link text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      :href="getCategoryUrl(l2)"
                      @click="async (e) => handleItemClick(l2, e)"
                      ><span class="propeller-menu__label">{{ getCategoryName(l2) }}</span></a
                    >
                    <template v-if="getSubCategories(l2).length > 0">
                      <ul class="propeller-menu__list mt-2 space-y-1" data-level="3">
                        <template
                          :key="`l3-${l3.categoryId}-${idx3}`"
                          v-for="(l3, idx3) in getSubCategories(l2)"
                        >
                          <li class="propeller-menu__item" data-level="3">
                            <a
                              class="propeller-menu__link text-sm text-muted-foreground hover:text-primary transition-colors"
                              :href="getCategoryUrl(l3)"
                              @click="async (e) => handleItemClick(l3, e)"
                              ><span class="propeller-menu__label">{{ getCategoryName(l3) }}</span></a
                            >
                          </li>
                        </template>
                      </ul>
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </template>
      </nav>
    </template>

    <template
      v-if="
        !$slots.menu &&
        !isLoading &&
        !hasError &&

        menuCategories.length > 0
      "
    >
      <!--
        Accordion. Two roles:
          • the mobile drawer for EVERY style (the flyout columns can't lay out
            on a narrow screen), hence it renders regardless of `menuStyle`
          • the desktop menu when `menuStyle="accordion"` is chosen explicitly —
            the only style with no layout ceiling, so the one to pick for trees
            deeper than a flyout can show

        Without the second role `menuStyle="accordion"` matched no desktop
        branch and rendered an empty panel above `md`, while the depth warning
        recommended exactly that style for deep trees.
      -->
      <nav
        :class="`propeller-menu__nav propeller-menu-mobile ${getMenuStyle() === 'accordion' ? 'block' : 'md:hidden'} ${menuClass || ''}`"
      >
        <MenuLevel
          variant="accordion"
          :items="menuCategories"
          :level="0"
          :max-depth="maxDepth"
          :open-path="openPath"
          :get-url="getCategoryUrl"
          :get-name="getCategoryName"
          :get-children="getSubCategories"
          :on-item-click="handleItemClick"
          @open="openAt"
          @toggle="toggleAt"
        />
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Category, Contact, Customer, GraphQLClient } from '@propeller-commerce/propeller-sdk-v2';
import { useMenu, type MenuCategory } from '../composables/vue/useMenu';
import MenuLevel from './MenuLevel.vue';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

/** Every style with a built-in renderer — the source of truth for the union. */
const RENDERED_STYLES = ['dropdown-vertical', 'jumbotron', 'accordion'] as const;

export type MenuStyle = (typeof RENDERED_STYLES)[number];

export interface MenuProps {
  /**
   * Initialised Propeller SDK GraphQL client.
   * Used internally to fetch the category hierarchy.
   * Resolved from PropellerProvider when omitted.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Base category ID for fetching all categories.
   * This is the root of the menu tree.
   */
  categoryId: number;

  /**
   * Language code for fetching localised category names and slugs.
   * Resolved from PropellerProvider when omitted.
   */
  language?: string;

  /**
   * Maximum nesting depth of the menu hierarchy.
   * Defaults to 3.
   */
  depth?: number;

  /**
   * CSS class applied to the menu container element.
   */
  menuClass?: string;

  /**
   * Main menu display type.
   * - 'dropdown-vertical': nested flyout panels on hover (default). Lays each
   *   level out as another 256px column, so it caps at 5 levels.
   * - 'jumbotron': full-width mega-menu panel showing all subcategories.
   * - 'accordion': inline vertical nesting at every breakpoint. The only style
   *   with no depth ceiling — use it for trees deeper than a flyout can show.
   *   (Also the mobile presentation of the other styles.)
   *
   * Typed as `MenuStyle | (string & {})` so the built-ins autocomplete while
   * any other value still type-checks — pair a custom value with the `menu`
   * slot to render it. Without that slot, an unrecognised value falls back to
   * 'accordion' and warns in development.
   */
  menuStyle?: MenuStyle | (string & {});

  /**
   * URL pattern for category links.
   * Use `{categoryId}` and `{slug}` as placeholders.
   * Defaults to 'category/{categoryId}/{slug}'.
   */
  menuLinkFormat?: string;

  /**
   * Custom URL builder for category links. Overrides `menuLinkFormat` /
   * `configuration.urls.getCategoryUrl`. Lets hosts inject dynamic query strings
   * (e.g. `?contract=…`) that a static format string cannot express.
   * Mirrors the `getUrl` prop on Breadcrumbs.
   */
  getUrl?: (category: Category) => string;

  /**
   * Called when a menu item is clicked.
   * Use for SPA-style routing instead of full-page navigation.
   */
  onMenuItemClick: (category: Category) => void;

  /**
   * Override any UI string.
   * Available keys: loading, error, empty
   */
  labels?: Record<string, string>;

  /**
   * Authenticated user object. When user changes (login/logout),
   * the menu cache is cleared and the menu is re-fetched.
   */
  user?: Contact | Customer | null;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Configuration object passed to the component */
  configuration?: any;

  /**
   * Pre-fetched menu tree. When provided, the component skips its internal
   * `useMenu` fetch entirely and renders the tree directly — following the
   * same opt-in pattern as `ProductGrid.products`. Lets host apps fetch the
   * category tree server-side (e.g. in `entry-server.ts`'s always-on prefetch)
   * and have
   * the menu HTML land in the initial response, with no client-side
   * roundtrip after hydration.
   *
   * Omitting the prop preserves the legacy client-side fetch behaviour —
   * no breaking change for consumers that haven't migrated.
   */
  tree?: MenuCategory[];
}
const props = defineProps<MenuProps>();
const infra = useInfraProps(props);

// An empty array IS NOT a successful pre-fetch — `lib/server.ts`'s
// `fetchMenu` returns `[]` on failure (swallowed error) by design, so an
// empty `:tree` from the consumer should fall back to the internal
// client-side fetch rather than locking the component into the empty
// state. A legitimately-empty backend still renders the empty state
// because the client fetch returns `[]` too.
const hasPrefetchedTree = computed(
  () => Array.isArray(props.tree) && (props.tree as MenuCategory[]).length > 0,
);

const languageRef = computed(() => infra.language || 'NL');
const { categories: fetchedCategories, loading: fetchedLoading, error: menuError, fetchMenu } = useMenu({
  graphqlClient: infra.graphqlClient!,
  language: languageRef,
  depth: props.depth,
});

// Source-of-truth for what the template renders. When the host pre-fetched
// the tree, use it directly; otherwise fall back to the internal fetch
// result.
const menuCategories = computed<MenuCategory[]>(() =>
  hasPrefetchedTree.value ? (props.tree as MenuCategory[]) : fetchedCategories.value,
);
const isLoading = computed(() => (hasPrefetchedTree.value ? false : fetchedLoading.value));
const hasError = computed(() => !hasPrefetchedTree.value && menuError.value !== null);

// UI interaction state
// Which branch is open, root → deepest, as category ids. One value instead of
// a ref per level: "opening a shallower item closes the deeper ones" falls out
// of `slice(0, level)` rather than a hand-written reset per level, which grows
// quadratically and is easy to get wrong.
const openPath = ref<number[]>([]);
const expandedL1 = ref<number | null>(null);
const expandedL2 = ref<number | null>(null);

function getUserKey(): string {
  if (!infra.user) return '';
  if ('contactId' in (infra.user as any)) return `c${(infra.user as Contact).contactId}`;
  return `u${(infra.user as Customer).customerId}`;
}

watch(
  () => [hasPrefetchedTree.value, infra.graphqlClient, props.categoryId, infra.language, getUserKey()],
  () => {
    // When the host pre-fetched the tree, skip the internal fetch entirely
    // — re-fetching would defeat the server-side cache and cause an
    // avoidable client-side request after hydration.
    if (hasPrefetchedTree.value) return;
    if (infra.graphqlClient && props.categoryId) {
      fetchMenu(props.categoryId, getUserKey());
    }
  },
  { immediate: true }
);
function getCategoryName(cat: MenuCategory): string {
  return cat.name;
}
function getCategoryUrl(cat: MenuCategory): string {
  const lang = infra.language || 'NL';
  const category = {
    categoryId: cat.categoryId,
    slugs: [{ value: cat.slug, language: lang }],
  } as Category;
  // Consumer-provided URL builder takes precedence (mirrors Breadcrumbs.getUrl).
  if (props.getUrl) return props.getUrl(category);
  return infra.configuration?.urls?.getCategoryUrl(category, lang) ?? '#';
}
function getSubCategories(cat: MenuCategory): MenuCategory[] {
  return (cat.children || []).filter(sub => sub.name && sub.slug);
}
function handleItemClick(cat: MenuCategory, e: any): void {
  if (props.onMenuItemClick) {
    e.preventDefault();
    const lang = infra.language || 'NL';
    props.onMenuItemClick({
      categoryId: cat.categoryId,
      names: [{ value: cat.name, language: lang }],
      slugs: [{ value: cat.slug, language: lang }],
    } as Category);
  }
}
/** Open `categoryId` at `level` (0-based), discarding any deeper open branch. */
function openAt(level: number, categoryId: number | null): void {
  const next = openPath.value.slice(0, level);
  if (categoryId !== null) next.push(categoryId);
  openPath.value = next;
}

/** Accordion variant — re-selecting the open item collapses it. */
function toggleAt(level: number, categoryId: number): void {
  openPath.value =
    openPath.value[level] === categoryId
      ? openPath.value.slice(0, level)
      : [...openPath.value.slice(0, level), categoryId];
}

/** True when `categoryId` is the open branch at `level`. */
function isOpenAt(level: number, categoryId: number): boolean {
  return openPath.value[level] === categoryId;
}
function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}
/**
 * Levels the current style can actually display. The flyout style lays every
 * level out as another 256px column, so the ceiling is how many fit on screen:
 * 5 columns = 1280px, which clears a 1440px desktop. Past that they run off the
 * viewport. The accordion nests vertically and has no layout ceiling.
 *
 * Reads `getMenuStyle()`, not the raw prop, so an unrecognised style is capped
 * as the accordion it actually falls back to.
 */
const maxDepth = computed<number>(() => {
  const requested = Math.max(1, props.depth ?? 3);
  const style = getMenuStyle();
  const cap = style === 'accordion' ? Number.POSITIVE_INFINITY : 5;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && requested > cap) {
    console.warn(
      `[Menu] depth={${requested}} exceeds what menuStyle="${style}" can lay out (${cap}); rendering ${cap} levels. Use menuStyle="accordion" for deeper trees.`
    );
  }
  return Math.min(requested, cap);
});

function getMenuStyle(): MenuStyle {
  const requested = (props.menuStyle as string | undefined) || 'dropdown-vertical';
  if (!(RENDERED_STYLES as readonly string[]).includes(requested)) {
    // A custom value is legitimate when paired with the `menu` slot — but we
    // only reach here if that slot wasn't used, so the style genuinely has
    // nothing to draw it. Fall back to the accordion (which can display any
    // tree) rather than matching no branch and rendering an empty panel with
    // no clue why.
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.warn(
        `[Menu] menuStyle="${requested}" has no built-in renderer (available: ${RENDERED_STYLES.join(', ')}); falling back to "accordion". Use the \`menu\` slot to draw a custom style.`
      );
    }
    return 'accordion';
  }
  return requested as MenuStyle;
}
</script>
