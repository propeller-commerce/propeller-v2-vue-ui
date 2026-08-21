<template>
  <div
    :class="`propeller-price-toggle flex items-center gap-2 ${className || ''}`"
    :data-state="isOn ? 'on' : 'off'"
  >
    <span class="propeller-price-toggle__label hidden sm:inline text-xs">{{ getLabel() }}</span
    ><button
      type="button"
      role="switch"
      class="propeller-price-toggle__switch hover:opacity-80 transition-opacity text-xs font-medium"
      :aria-checked="isOn"
      @click="async (event) => handleToggle()"
    >
      {{ getStatusText() }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';

export interface PriceToggleProps {
  /**
   * Label text shown beside the toggle.
   * Defaults to 'Prices:'.
   */
  label?: string;

  /** Translated labels keyed by the slugs used inside the component
   * (`pricesLabel`, `inclVat`, `exclVat`). Missing keys fall back to English. */
  labels?: Record<string, string>;

  /**
   * Controlled mode: current on/off state (true = incl. VAT). When supplied,
   * the toggle reflects THIS value (label + aria-checked) and tracks its
   * changes, instead of owning local state. Pair with `inclExclVatSwitched`.
   * Prefer this over `initialState` when the host persists the state (e.g. a
   * cookie): `initialState` is read once and can't reflect the persisted mode
   * on load, so the control would lie about the current mode.
   */
  value?: boolean;

  /**
   * Uncontrolled mode: initial state of the toggle. Ignored when `value` is
   * supplied. Defaults to true (incl. VAT).
   */
  initialState?: boolean;

  /**
   * Required callback fired when the toggle is switched.
   * Receives the new state: true = incl. VAT, false = excl. VAT.
   */
  inclExclVatSwitched: (on: boolean) => void;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface PriceToggleState {
  isOn: boolean;
  getLabel: () => string;
  getStatusText: () => string;
  handleToggle: () => void;
}

const props = defineProps<PriceToggleProps>();
const isControlled = computed(() => props.value !== undefined);
// Local state for uncontrolled mode only.
const internal = ref<PriceToggleState['isOn']>(props.initialState ?? true);
// In controlled mode `isOn` follows `props.value` (reactively — a getter, so a
// later store change is reflected without a watch); otherwise it's the local
// ref. This is what fixes the "control lies about the mode on load" bug: a
// cookie-backed `value` now drives the label + aria-checked from the first
// render, and stays in sync afterwards.
const isOn = computed(() => (isControlled.value ? !!props.value : internal.value));

onMounted(() => {
  // Uncontrolled + SSR: re-sync the local ref to `initialState` after hydration.
  if (!isControlled.value && typeof window !== 'undefined') {
    internal.value = props.initialState ?? true;
  }
});

function getLabel(): ReturnType<PriceToggleState['getLabel']> {
  return (props.label as string) || _getLabel(props.labels, 'pricesLabel', 'Prices:');
}
function getStatusText(): ReturnType<PriceToggleState['getStatusText']> {
  return isOn.value
    ? _getLabel(props.labels, 'inclVat', 'Incl. VAT')
    : _getLabel(props.labels, 'exclVat', 'Excl. VAT');
}
function handleToggle(): ReturnType<PriceToggleState['handleToggle']> {
  const newValue = !isOn.value;
  // Only mutate local state in uncontrolled mode; in controlled mode the parent
  // owns the value and re-renders us via `props.value`.
  if (!isControlled.value) {
    internal.value = newValue;
  }
  if (props.inclExclVatSwitched) {
    props.inclExclVatSwitched(newValue);
  }
  window.dispatchEvent(
    new CustomEvent('priceToggleChanged', {
      detail: newValue,
    })
  );
}
</script>
