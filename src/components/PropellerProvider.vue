<script setup lang="ts">
import { computed, provide, reactive } from 'vue';
import type { Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';
import { PropellerScopeKey, type PropellerScope } from '../context/PropellerContext';

/**
 * Provides Tier 2 per-scope state (user / companyId / language / includeTax /
 * portalMode) to package components and composables. Tier 1 deps come from
 * the `propellerVue` plugin installed at app startup.
 *
 * Nestable: deeper providers replace the outer scope for their subtree, which
 * is how multi-cart / impersonation / language-widget patterns work without
 * polluting the rest of the page.
 */
const props = withDefaults(
  defineProps<{
    user?: Contact | Customer | null;
    companyId?: number;
    language?: string;
    includeTax?: boolean;
    portalMode?: string;
  }>(),
  {
    user: null,
    companyId: undefined,
    language: 'EN',
    includeTax: false,
    portalMode: 'open',
  },
);

// `reactive` + getters: props are already reactive, but the injection contract
// is a stable object reference whose fields update in place. Without the
// getters, child components would see a frozen snapshot at provide-time.
const scope = reactive({
  get user() {
    return props.user ?? null;
  },
  get companyId() {
    return props.companyId;
  },
  get language() {
    return props.language;
  },
  get includeTax() {
    return props.includeTax;
  },
  get portalMode() {
    return props.portalMode;
  },
}) as unknown as PropellerScope;

provide(PropellerScopeKey, scope);

// Pacify the "unused" linter on the computed import in some setups — kept
// available for downstream tooling.
void computed;
</script>

<template>
  <slot />
</template>
