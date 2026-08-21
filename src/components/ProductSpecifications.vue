<template>
  <template
    v-if="
      !loading &&
      (hasPublicAttributes() ||
        packageDescription ||
        !!$slots.beforeSpecs ||
        !!$slots.afterSpecs)
    "
  >
    <div
      :class="`propeller-product-specifications ${className || ''}`"
      :data-layout="layout === 'list' ? 'list' : 'table'"
      :data-grouped="grouping ? 'true' : 'false'"
    >
      <p
        v-if="packageDescription"
        class="propeller-product-specifications__package-description mb-4 text-sm text-muted-foreground"
      >
        {{ packageDescription }}
      </p>
      <template v-if="!grouping">
        <template v-if="layout !== 'list'">
          <div
            class="overflow-hidden rounded-[var(--radius-container)] border border-border"
          >
            <table class="w-full text-sm">
              <tbody class="divide-y divide-border">
                <slot name="beforeSpecs" :layout="layoutMode" />
                <template :key="i" v-for="(attr, i) in getAttributes()">
                  <tr
                    class="propeller-product-specifications__row odd:bg-card even:bg-surface-hover/20"
                  >
                    <td class="px-4 py-2 font-medium text-foreground w-1/2">
                      {{ getAttributeLabel(attr) }}
                    </td>
                    <td class="px-4 py-2 text-muted-foreground">
                      {{ getAttributeValue(attr) }}
                    </td>
                  </tr>
                </template>
                <slot name="afterSpecs" :layout="layoutMode" />
              </tbody>
            </table>
          </div>
        </template>

        <template v-if="layout === 'list'">
          <div class="space-y-3">
            <slot name="beforeSpecs" :layout="layoutMode" />
            <template :key="i" v-for="(attr, i) in getAttributes()">
              <div class="flex flex-col gap-0.5">
                <span
                  class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >{{ getAttributeLabel(attr) }}</span
                ><span class="text-sm text-foreground">{{
                  getAttributeValue(attr)
                }}</span>
              </div>
            </template>
            <slot name="afterSpecs" :layout="layoutMode" />
          </div>
        </template>
      </template>

      <template v-if="!!grouping">
        <template v-if="!!$slots.beforeSpecs">
          <div
            v-if="layoutMode === 'table'"
            class="mb-6 overflow-hidden rounded-[var(--radius-container)] border border-border"
          >
            <table class="w-full text-sm">
              <tbody class="divide-y divide-border">
                <slot name="beforeSpecs" :layout="layoutMode" />
              </tbody>
            </table>
          </div>
          <div v-else class="mb-6 space-y-3">
            <slot name="beforeSpecs" :layout="layoutMode" />
          </div>
        </template>
        <template :key="group" v-for="(group, index) in getGroups()">
          <div class="mb-6">
            <template v-if="!!group">
              <h4
                class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2"
              >
                {{ group }}
              </h4>
            </template>

            <template v-if="layout !== 'list'">
              <div
                class="overflow-hidden rounded-[var(--radius-container)] border border-border"
              >
                <table class="w-full text-sm">
                  <tbody class="divide-y divide-border">
                    <template
                      :key="i"
                      v-for="(attr, i) in getAttributesByGroup(group)"
                    >
                      <tr
                        class="propeller-product-specifications__row odd:bg-card even:bg-surface-hover/20"
                      >
                        <td class="px-4 py-2 font-medium text-foreground w-1/2">
                          {{ getAttributeLabel(attr) }}
                        </td>
                        <td class="px-4 py-2 text-muted-foreground">
                          {{ getAttributeValue(attr) }}
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </template>

            <template v-if="layout === 'list'">
              <div class="space-y-3">
                <template
                  :key="i"
                  v-for="(attr, i) in getAttributesByGroup(group)"
                >
                  <div class="flex flex-col gap-0.5">
                    <span
                      class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                      >{{ getAttributeLabel(attr) }}</span
                    ><span class="text-sm text-foreground">{{
                      getAttributeValue(attr)
                    }}</span>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </template>
        <template v-if="!!$slots.afterSpecs">
          <div
            v-if="layoutMode === 'table'"
            class="mb-6 overflow-hidden rounded-[var(--radius-container)] border border-border"
          >
            <table class="w-full text-sm">
              <tbody class="divide-y divide-border">
                <slot name="afterSpecs" :layout="layoutMode" />
              </tbody>
            </table>
          </div>
          <div v-else class="space-y-3">
            <slot name="afterSpecs" :layout="layoutMode" />
          </div>
        </template>
      </template>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";

import { AttributeResult, AttributeType, GraphQLClient, LocalizedString } from "@propeller-commerce/propeller-sdk-v2";
import { useProductSpecs } from "../composables/vue/useProductSpecs";
import {
  getLanguageString,
  getLanguageUri,
} from '@propeller-commerce/propeller-v2-core-ui';
import { useInfraProps } from '../composables/vue/useInfraProps';

export interface ProductSpecificationsProps {
  /**
   * Initialised Propeller SDK GraphQL client.
   * Required when `productId` is set — used to fetch public attributes.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Product ID to fetch attributes for.
   */
  productId?: number;

  /**
   * Pre-fetched attribute result items used as fallback when `productId` is not provided.
   * When `productId` is provided the component fetches its own data and this prop is ignored.
   */
  attributes?: AttributeResult[];

  /**
   * Language code used to resolve localised attribute labels.
   * Defaults to 'NL'.
   */
  language?: string;

  /**
   * Display layout for the specifications.
   * 'table' — two-column table (name | value). Default.
   * 'list'  — vertical label + value stacked rows.
   */
  layout?: string;

  /**
   * When true, groups attributes by their group field with a heading per section.
   * When false or omitted, displays a flat ungrouped table/list. Default: false.
   */
  grouping?: boolean;

  /**
   * Optional package-description string (e.g. contents / packaging notes),
   * rendered above the attribute table. Omitted when empty.
   */
  packageDescription?: string;

  /** Extra CSS class applied to the root element. */
  className?: string;
}

const props = defineProps<ProductSpecificationsProps>();
const infra = useInfraProps(props);

const langRef = computed(() => infra.language || "NL");

// Active layout, passed to the beforeSpecs/afterSpecs scoped slots so a consumer
// can return a <tr> (table) or a block element (list).
const layoutMode = computed<'table' | 'list'>(() =>
  props.layout === 'list' ? 'list' : 'table',
);

const { attributes, loading, fetchSpecs } = useProductSpecs({
  graphqlClient: infra.graphqlClient as GraphQLClient,
  language: langRef,
});

onMounted(() => {
  if (props.productId) fetchSpecs(props.productId);
});

watch(
  () => props.productId,
  (id) => {
    if (id) fetchSpecs(id);
  },
);

function getAttributes(): AttributeResult[] {
  // Prefer fetched attributes; fall back to props.attributes
  const attrs = attributes.value.length
    ? attributes.value
    : (props.attributes as AttributeResult[]) || [];
  return attrs.filter(
    (a: AttributeResult) =>
      a.attributeDescription?.isPublic === true &&
      getAttributeValue(a) !== "" &&
      getAttributeValue(a) !== null &&
      getAttributeValue(a) !== "0",
  );
}
function getGroups(): string[] {
  const attrs = getAttributes();
  const seen: string[] = [];
  attrs.forEach((a: AttributeResult) => {
    const group = a.attributeDescription?.group || "";
    if (!seen.includes(group)) seen.push(group);
  });
  return seen;
}
function getAttributesByGroup(group: string): AttributeResult[] {
  return getAttributes().filter(
    (a: AttributeResult) => (a.attributeDescription?.group || "") === group,
  );
}
function getAttributeLabel(attr: AttributeResult): string {
  const descs = attr.attributeDescription?.descriptions || [];
  return getLanguageString(
    descs,
    infra.language || "NL",
    attr.attributeDescription?.name || "",
  );
}
function getAttributeValue(attr: AttributeResult): string {
  const v = attr.value;
  if (!v) return "";
  const lang = (infra.language as string) || "NL";
  if (v.type === AttributeType.TEXT) {
    const entry = (v as any).textValues?.find(
      (tv: any) => tv.language === lang,
    );
    const vals = (entry?.values || []).filter(Boolean);
    return vals.join(", ");
  }
  if (v.type === AttributeType.ENUM) {
    const vals = ((v as any).enumValues || []).filter(Boolean);
    return vals.join(", ");
  }
  if (v.type === AttributeType.INT) {
    const val = (v as any).intValue;
    return val !== null && val !== undefined ? String(val) : "";
  }
  if (v.type === AttributeType.DECIMAL) {
    const val = (v as any).decimalValue;
    return val !== null && val !== undefined ? String(val) : "";
  }
  if (v.type === AttributeType.DATETIME) {
    return (v as any).dateTimeValue || "";
  }
  if (v.type === AttributeType.COLOR) {
    return (v as any).colorValue || "";
  }
  const fallback = v.value;
  if (fallback === null || fallback === undefined) return "";
  if (typeof fallback === "boolean") return fallback ? "Yes" : "No";
  return String(fallback);
}
function hasPublicAttributes(): boolean {
  return getAttributes().length > 0;
}
</script>
