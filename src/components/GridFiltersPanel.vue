<template>
  <div
    :class="`propeller-grid-filters-panel w-full lg:w-64 lg:flex-shrink-0 ${wrapperClassName || ''}`"
  >
    <button
      type="button"
      class="propeller-grid-filters-panel__trigger lg:hidden inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-control)] border border-border bg-card text-sm font-medium text-foreground shadow-sm hover:bg-surface-hover transition-colors"
      @click="open = true"
      aria-haspopup="dialog"
      :aria-expanded="open"
    >
      <svg
        class="propeller-grid-filters-panel__trigger-icon w-[1.1em] h-[1.1em] flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path>
      </svg>
      {{ getLabel("filtersButton", "Filters") }}
      <template v-if="activeFilterCount && activeFilterCount > 0">
        <span
          class="propeller-grid-filters-panel__count inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold"
          >{{ activeFilterCount }}</span
        >
      </template>
    </button>

    <div
      :class="`propeller-grid-filters-panel__backdrop lg:hidden fixed inset-0 z-40 bg-foreground/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`"
      @click="open = false"
      aria-hidden="true"
    ></div>

    <div
      :class="`propeller-grid-filters-panel__panel fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-card shadow-xl flex flex-col transition-transform duration-300 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:bg-transparent lg:shadow-none lg:block ${open ? 'translate-x-0' : '-translate-x-full'}`"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="propeller-grid-filters-panel__header lg:hidden flex items-center justify-between gap-3 px-4 h-14 border-b border-border-subtle flex-shrink-0"
      >
        <span
          class="propeller-grid-filters-panel__title text-base font-semibold text-foreground"
          >{{ getLabel("filtersButton", "Filters") }}</span
        >
        <button
          type="button"
          class="propeller-grid-filters-panel__close inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-control)] text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
          @click="open = false"
          :aria-label="getLabel('closeFilters', 'Close')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            :strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            class="w-5 h-5"
          >
            <path d="M18 6 6 18M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div
        class="propeller-grid-filters-panel__body flex-1 overflow-y-auto px-4 py-4 lg:flex-none lg:overflow-visible lg:p-0"
      >
        <GridFilters v-bind="gridFiltersProps" :labels="labels" />
      </div>

      <div
        class="propeller-grid-filters-panel__footer lg:hidden px-4 py-3 border-t border-border-subtle flex-shrink-0"
      >
        <button
          type="button"
          class="propeller-grid-filters-panel__apply w-full inline-flex justify-center items-center h-10 px-6 rounded-[var(--radius-control)] text-sm font-medium text-primary-foreground bg-secondary hover:bg-secondary/90 transition-colors"
          @click="open = false"
        >
          {{ getLabel("applyFilters", "Show results") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { getLabel as _getLabel } from "@propeller-commerce/propeller-v2-core-ui";
import GridFilters, { type GridFiltersProps } from "./GridFilters.vue";

export interface GridFiltersPanelProps extends GridFiltersProps {
  /**
   * Number of active filters, shown as a badge on the mobile trigger button.
   * The host computes this from its active filter state. Omit or 0 to hide
   * the badge.
   */
  activeFilterCount?: number;

  /** Extra CSS class on the outer panel root. */
  wrapperClassName?: string;
}

const props = defineProps<GridFiltersPanelProps>();

const open = ref(false);

const gridFiltersProps = computed(() => {
  const { activeFilterCount, wrapperClassName, labels, ...rest } = props;
  return rest;
});

function getLabel(key: string, fallback: string): string {
  return _getLabel(props.labels, key, fallback);
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") open.value = false;
}

watch(open, (isOpen) => {
  if (typeof document === "undefined") return;
  if (isOpen) {
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
  } else {
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
  }
});

onUnmounted(() => {
  if (typeof document === "undefined") return;
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>
