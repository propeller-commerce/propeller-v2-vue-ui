<template>
  <!-- Flyout styles lay each level out as a SIBLING column inside one flex row,
       so the recursion emits the column then the next one alongside it. The
       accordion nests its children inside the parent <li> instead. -->
  <template v-if="variant === 'columns'">
    <ul
      class="propeller-menu__list w-64 py-1 flex-shrink-0"
      :class="level + 1 < maxDepth ? 'border-r border-border' : ''"
      :data-level="level + 1"
    >
      <li
        v-for="(cat, idx) in items"
        :key="`l${level}-${cat.categoryId}-${idx}`"
        class="propeller-menu__item"
        :data-level="level + 1"
        :data-active="isOpen(cat) ? 'true' : 'false'"
        @mouseenter="emit('open', level, cat.categoryId)"
      >
        <a
          :href="getUrl(cat)"
          class="propeller-menu__link flex items-center justify-between px-4 py-2.5 text-sm transition-colors"
          :class="isOpen(cat) ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'"
          @click="(e) => onItemClick(cat, e)"
        >
          <span class="propeller-menu__label">{{ getName(cat) }}</span>
          <svg
            v-if="hasRenderableChildren(cat)"
            class="propeller-menu__chevron w-3.5 h-3.5 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </li>
    </ul>
    <MenuLevel
      v-if="openChild"
      variant="columns"
      :items="getChildren(openChild)"
      :level="level + 1"
      :max-depth="maxDepth"
      :open-path="openPath"
      :get-url="getUrl"
      :get-name="getName"
      :get-children="getChildren"
      :on-item-click="onItemClick"
      @open="(l, id) => emit('open', l, id)"
      @toggle="(l, id) => emit('toggle', l, id)"
    />
  </template>

  <ul
    v-else
    class="propeller-menu__list"
    :class="level === 0 ? 'divide-y divide-border' : level === 1 ? 'bg-accent/30' : 'bg-accent/20'"
    :data-level="level + 1"
  >
    <li
      v-for="(cat, idx) in items"
      :key="`l${level}-${cat.categoryId}-${idx}`"
      class="propeller-menu__item"
      :data-level="level + 1"
      :data-expanded="isOpen(cat) ? 'true' : 'false'"
    >
      <div class="flex items-center justify-between">
        <a
          :href="getUrl(cat)"
          class="propeller-menu__link flex-1 py-3 text-sm text-foreground"
          :style="{ paddingLeft: `${1 + level}rem` }"
          @click="(e) => onItemClick(cat, e)"
        >
          {{ getName(cat) }}
        </a>
        <button
          v-if="hasRenderableChildren(cat)"
          type="button"
          class="propeller-menu__toggle cursor-pointer px-4 py-3 text-muted-foreground transition-colors hover:text-foreground"
          :aria-expanded="isOpen(cat)"
          :aria-label="getName(cat)"
          @click="emit('toggle', level, cat.categoryId)"
        >
          <svg
            class="propeller-menu__chevron w-3.5 h-3.5 transition-transform"
            :class="isOpen(cat) ? 'rotate-180' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      <MenuLevel
        v-if="isOpen(cat) && hasRenderableChildren(cat)"
        variant="accordion"
        :items="getChildren(cat)"
        :level="level + 1"
        :max-depth="maxDepth"
        :open-path="openPath"
        :get-url="getUrl"
        :get-name="getName"
        :get-children="getChildren"
        :on-item-click="onItemClick"
        @open="(l, id) => emit('open', l, id)"
        @toggle="(l, id) => emit('toggle', l, id)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MenuCategory } from '../composables/vue/useMenu';

/**
 * One level of the category menu, rendering itself for each deeper level.
 *
 * Recursion lives in its own component because a Vue SFC template cannot call
 * a local render function the way JSX can — a self-referencing component is the
 * idiomatic equivalent. State stays in `Menu.vue`: this receives the open path
 * and emits intent, so there is a single source of truth for what is open.
 */
export interface MenuLevelProps {
  /** Categories to render at this level. */
  items: MenuCategory[];
  /** 0-based depth of this level. */
  level: number;
  /** Deepest level that may render, already resolved against the style's cap. */
  maxDepth: number;
  /** Open branch, root → deepest, as category ids. */
  openPath: number[];
  /** `'columns'` for the flyout styles, `'accordion'` for the nested mobile menu. */
  variant: 'columns' | 'accordion';
  /** Resolves a category's href — owned by `Menu.vue` (honours `getUrl`/config). */
  getUrl: (cat: MenuCategory) => string;
  /** Resolves a category's display name. */
  getName: (cat: MenuCategory) => string;
  /** Resolves a category's visible children. */
  getChildren: (cat: MenuCategory) => MenuCategory[];
  /** Click handler — owned by `Menu.vue` so SPA routing stays in one place. */
  onItemClick: (cat: MenuCategory, e: any) => void;
}

const props = defineProps<MenuLevelProps>();
const emit = defineEmits<{
  (e: 'open', level: number, categoryId: number | null): void;
  (e: 'toggle', level: number, categoryId: number): void;
}>();

function isOpen(cat: MenuCategory): boolean {
  return props.openPath[props.level] === cat.categoryId;
}

/**
 * Whether to show the expand affordance. Gated on the child actually being
 * renderable at this depth — otherwise the chevron promises a level that never
 * appears.
 */
function hasRenderableChildren(cat: MenuCategory): boolean {
  return props.getChildren(cat).length > 0 && props.level + 1 < props.maxDepth;
}

/** The category whose column is open at this level, if any. */
const openChild = computed<MenuCategory | null>(() => {
  if (props.level + 1 >= props.maxDepth) return null;
  const openId = props.openPath[props.level];
  const found = props.items.find((c) => c.categoryId === openId);
  return found && props.getChildren(found).length > 0 ? found : null;
});
</script>
