<template>
  <div :class="`propeller-cluster-configurator ${className || ''}`">
    <template v-if="!!config?.settings?.length">
      <div class="propeller-cluster-configurator__content flex flex-col gap-6">
        <template
          :key="setting.id"
          v-for="(setting, index) in getSettingsWithValues()"
        >
          <div
            class="propeller-cluster-configurator__group"
            :data-display-type="setting.displayType"
            :data-disabled="setting.disabled ? 'true' : 'false'"
          >
            <h4
              class="propeller-cluster-configurator__label font-semibold text-sm text-muted-foreground mb-3"
            >
              {{ setting.displayName || setting.name }}
            </h4>
            <template v-if="setting.displayType === 'DROPDOWN'">
              <select
                class="propeller-cluster-configurator__select w-full border border-border rounded-[var(--radius-container)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary disabled:bg-surface-hover disabled:text-foreground-subtle cursor-pointer"
                :value="setting.selectedValue"
                :disabled="setting.disabled"
                @change="
                  async (e) =>
                    handleAttributeSelect(
                      setting.name,
                      (e.target as HTMLSelectElement).value,
                    )
                "
              >
                <option value="">
                  {{ getLabel("selectOption", "— Select —") }}
                </option>
                <template
                  :key="val"
                  v-for="(val, index) in setting.availableValues"
                >
                  <option :value="val">{{ val }}</option>
                </template>
              </select>
            </template>

            <template v-if="setting.displayType === 'RADIO'">
              <div
                class="propeller-cluster-configurator__options flex flex-wrap gap-2"
              >
                <template
                  :key="val"
                  v-for="(val, index) in setting.availableValues"
                >
                  <label
                    :data-selected="
                      setting.selectedValue === val ? 'true' : 'false'
                    "
                    :class="`propeller-cluster-configurator__radio flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-container)] border text-sm font-medium transition-colors select-none ${
                      setting.disabled
                        ? 'opacity-50 cursor-not-allowed border-border text-foreground-subtle'
                        : setting.selectedValue === val
                          ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer'
                          : 'border-border text-muted-foreground hover:border-secondary/30 cursor-pointer'
                    }`"
                    ><input
                      type="radio"
                      class="sr-only"
                      :name="`cluster-${clusterId}-${setting.name}`"
                      :value="val"
                      :checked="setting.selectedValue === val"
                      :disabled="setting.disabled"
                      @change="
                        async (event) =>
                          handleAttributeSelect(setting.name, val)
                      "
                    />{{ val }}</label
                  >
                </template>
              </div>
            </template>

            <!-- Only render colour swatches when the underlying attribute is
                 actually typed COLOR. PIMs sometimes pair `displayType: 'COLOR'`
                 with a TEXT attribute (colour-name strings, free text…) — in
                 that case fall back to labelled chips so the value is readable. -->
            <template v-if="setting.displayType === 'COLOR' && setting.attributeType === 'COLOR'">
              <div
                class="propeller-cluster-configurator__options flex flex-wrap gap-2"
              >
                <template
                  :key="val"
                  v-for="(val, index) in setting.availableValues"
                >
                  <button
                    type="button"
                    :title="val"
                    :disabled="setting.disabled"
                    @click="
                      async (event) => handleAttributeSelect(setting.name, val)
                    "
                    :data-selected="
                      setting.selectedValue === val ? 'true' : 'false'
                    "
                    :style="{
                      backgroundColor: val,
                    }"
                    :class="`propeller-cluster-configurator__color w-8 h-8 rounded-full border-2 transition-all ${
                      setting.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    } ${
                      setting.selectedValue === val
                        ? 'border-secondary ring-2 ring-secondary/30 ring-offset-1 scale-110'
                        : 'border-input hover:scale-105'
                    }`"
                  ></button>
                </template>
              </div>
            </template>

            <template v-if="setting.displayType === 'COLOR' && setting.attributeType !== 'COLOR'">
              <div
                class="propeller-cluster-configurator__options flex flex-wrap gap-2"
              >
                <template
                  :key="val"
                  v-for="(val, index) in setting.availableValues"
                >
                  <button
                    type="button"
                    :disabled="setting.disabled"
                    @click="
                      async (event) => handleAttributeSelect(setting.name, val)
                    "
                    :data-selected="
                      setting.selectedValue === val ? 'true' : 'false'
                    "
                    :class="`propeller-cluster-configurator__chip px-3 py-1.5 rounded-[var(--radius-container)] border text-sm font-medium transition-colors ${
                      setting.disabled
                        ? 'opacity-50 cursor-not-allowed border-border text-foreground-subtle'
                        : setting.selectedValue === val
                          ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer'
                          : 'border-border text-muted-foreground hover:border-secondary/30 cursor-pointer'
                    }`"
                  >
                    {{ val }}
                  </button>
                </template>
              </div>
            </template>

            <template v-if="setting.displayType === 'IMAGE'">
              <div
                class="propeller-cluster-configurator__options flex flex-wrap gap-3"
              >
                <template
                  :key="val"
                  v-for="(val, index) in setting.availableValues"
                >
                  <button
                    type="button"
                    :disabled="setting.disabled"
                    @click="
                      async (event) => handleAttributeSelect(setting.name, val)
                    "
                    :data-selected="
                      setting.selectedValue === val ? 'true' : 'false'
                    "
                    :class="`propeller-cluster-configurator__image-swatch relative w-16 h-16 rounded-[var(--radius-container)] border-2 overflow-hidden transition-all ${
                      setting.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    } ${
                      setting.selectedValue === val
                        ? 'border-secondary ring-2 ring-secondary/30 ring-offset-1'
                        : 'border-border hover:border-secondary/30'
                    }`"
                  >
                    <img
                      class="propeller-cluster-configurator__image w-full h-full object-cover"
                      :src="val"
                      :alt="val"
                    />
                    <template v-if="setting.selectedValue === val">
                      <div
                        class="propeller-cluster-configurator__image-check absolute inset-0 bg-secondary bg-opacity-20 flex items-center justify-center"
                      >
                        <svg
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          class="w-5 h-5 text-secondary"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </div>
                    </template>
                  </button>
                </template>
              </div>
            </template>

            <template
              v-if="
                setting.displayType !== 'DROPDOWN' &&
                setting.displayType !== 'RADIO' &&
                setting.displayType !== 'COLOR' &&
                setting.displayType !== 'IMAGE'
              "
            >
              <div
                class="propeller-cluster-configurator__options flex flex-wrap gap-2"
              >
                <template
                  :key="val"
                  v-for="(val, index) in setting.availableValues"
                >
                  <button
                    type="button"
                    :disabled="setting.disabled"
                    @click="
                      async (event) => handleAttributeSelect(setting.name, val)
                    "
                    :data-selected="
                      setting.selectedValue === val ? 'true' : 'false'
                    "
                    :class="`propeller-cluster-configurator__chip px-3 py-1.5 rounded-[var(--radius-container)] border text-sm font-medium transition-colors ${
                      setting.disabled
                        ? 'opacity-50 cursor-not-allowed border-border text-foreground-subtle'
                        : setting.selectedValue === val
                          ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer'
                          : 'border-border text-muted-foreground hover:border-secondary/30 cursor-pointer'
                    }`"
                  >
                    {{ val }}
                  </button>
                </template>
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getLabel as _getLabel } from '@propeller-commerce/propeller-v2-core-ui';
import { AttributeResult, AttributeType, ClusterConfig, ClusterConfigSetting, Product } from "@propeller-commerce/propeller-sdk-v2";


/**
 * A computed object containing a cluster config setting enriched with
 * its current UI state: available values for drilldown, the currently
 * selected value, and whether the selector should be disabled.
 */
interface ConfiguredSetting {
  id: string;
  name: string;
  /** String representation of ClusterConfigSettingDisplayType */
  displayType: string;
  /**
   * Underlying attribute type from the PIM (e.g. `COLOR`, `TEXT`). Source of
   * truth for swatch rendering — `displayType: 'COLOR'` is sometimes set on
   * settings whose attribute holds plain text.
   */
  attributeType?: string;
  priority: string;
  displayName: string;
  availableValues: string[];
  selectedValue: string;
  disabled: boolean;
}
/**
 * A computed object containing a cluster config setting enriched with
 * its current UI state: available values for drilldown, the currently
 * selected value, and whether the selector should be disabled.
 */

export interface ClusterConfiguratorProps {
  /**
   * The cluster ID this configurator belongs to.
   * @required
   */
  clusterId: number;

  /**
   * All products that belong to the cluster.
   * Used to derive available values per attribute and to match
   * the configured product when all selections are made.
   * @required
   */
  products: Product[];

  /**
   * Cluster configuration object (cluster.config).
   * Provides the ordered list of attribute settings.
   * @required
   */
  config: ClusterConfig;

  /**
   * Fired whenever the user completes a set of attribute selections
   * that uniquely identifies a cluster product.
   * Also fired whenever any selection changes and a matching product
   * can already be determined (e.g. only one setting exists).
   */
  onConfigurationChange?: (product: Product) => void;

  /** Default product to pre-populate the attribute selections on mount. */
  defaultProduct?: Product;

  /** Override any UI string. Available keys: selectOption */
  labels?: Record<string, string>;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
/**
 * A computed object containing a cluster config setting enriched with
 * its current UI state: available values for drilldown, the currently
 * selected value, and whether the selector should be disabled.
 */

interface ClusterConfiguratorState {
  /** Current user selections: { [attributeName]: selectedValue } */
  selectedAttributes: Record<string, string>;
  getLabel: (key: string, fallback: string) => string;

  /**
   * Returns the cluster config settings sorted ascending by priority.
   */
  getSortedSettings: () => ClusterConfigSetting[];

  /**
   * Checks whether an AttributeResult matches a given target name,
   * looking at the SDK name field and all localised descriptions.
   */
  attributeNameMatches: (attr: AttributeResult, targetName: string) => boolean;

  /**
   * Extracts string values from an AttributeResult, supporting both
   * the legacy Propeller SDK format and the current type-based format.
   */
  extractAttributeValues: (attr: AttributeResult) => string[];

  /**
   * Returns the localised display name for an attribute by looking up
   * the matching attribute on the first product in the list.
   */
  getAttributeDisplayName: (attributeName: string) => string;

  /**
   * Returns all unique values for a given attribute name across all products.
   */
  getAttributeValues: (attributeName: string) => string[];

  /**
   * Returns the available values for a given attribute at a specific
   * position in the sorted settings list, filtered by all prior selections
   * (drilldown logic). For the first attribute (index 0) all values are returned.
   */
  getAvailableValuesForIndex: (
    attributeName: string,
    settingIndex: number,
  ) => string[];

  /** Same as getAvailableValuesForIndex but uses explicit selections instead of state. */
  getAvailableValuesForIndexWithSelections: (
    attributeName: string,
    settingIndex: number,
    selections: Record<string, string>,
  ) => string[];

  /**
   * Computes a derived list of ConfiguredSetting objects ready for rendering,
   * including available values, selected value and disabled state for each setting.
   */
  getSettingsWithValues: () => ConfiguredSetting[];

  /**
   * Finds the first product whose attributes match all key/value pairs in
   * the given selections object.
   */
  findMatchingProduct: (selections: Record<string, string>) => Product | null;

  /**
   * Handles a selection change for one attribute:
   * - Updates selectedAttributes (sets the new value, clears all subsequent ones).
   * - If all settings now have a selection, finds the matching product and calls
   *   props.onConfigurationChange with it.
   */
  handleAttributeSelect: (settingName: string, value: string) => void;
}

const props = defineProps<ClusterConfiguratorProps>();
const selectedAttributes = ref<ClusterConfiguratorState["selectedAttributes"]>(
  {},
);

onMounted(() => {
  const defaultProduct = props.defaultProduct as Product;
  if (!defaultProduct) return;
  const sortedSettings = getSortedSettings();
  if (sortedSettings.length === 0) return;
  const initial: Record<string, string> = {};
  sortedSettings.forEach((setting: ClusterConfigSetting) => {
    const attrItems = defaultProduct.attributes?.items;
    if (!Array.isArray(attrItems)) return;
    const matchingAttr = (attrItems as AttributeResult[]).find(
      (attr: AttributeResult) => attributeNameMatches(attr, setting.attributeName),
    );
    if (matchingAttr) {
      const values = extractAttributeValues(matchingAttr);
      if (values.length > 0) {
        initial[setting.attributeName] = values[0];
      }
    }
  });
  if (Object.keys(initial).length === 0) return;
  selectedAttributes.value = initial;
  const allSelected = sortedSettings.every(
    (s: ClusterConfigSetting) => !!initial[s.attributeName],
  );
  if (allSelected && props.onConfigurationChange) {
    const matchingProduct = findMatchingProduct(initial);
    if (matchingProduct) {
      props.onConfigurationChange(matchingProduct);
    }
  }
});

function getLabel(
  key: string,
  fallback: string,
): ReturnType<ClusterConfiguratorState["getLabel"]> {
  return _getLabel(props.labels, key, fallback);
}
function getSortedSettings(): ReturnType<
  ClusterConfiguratorState["getSortedSettings"]
> {
  const settings = (props.config as ClusterConfig)?.settings;
  if (!settings || settings.length === 0) return [];
  return settings
    .slice()
    .sort(
      (a: ClusterConfigSetting, b: ClusterConfigSetting) =>
        parseInt(a.priority) - parseInt(b.priority),
    );
}
function attributeNameMatches(
  attr: AttributeResult,
  targetName: string,
): ReturnType<ClusterConfiguratorState["attributeNameMatches"]> {
  const attrName =
    attr.attributeDescription?.descriptions?.[0]?.value ||
    attr.attributeDescription?.name;
  return (
    attrName === targetName ||
    attr.attributeDescription?.name === targetName ||
    (attr.attributeDescription?.descriptions?.some(
      (desc: any) => desc.value === targetName,
    ) ??
      false)
  );
}
function extractAttributeValues(
  attr: AttributeResult,
): ReturnType<ClusterConfiguratorState["extractAttributeValues"]> {
  let extractedValues: string[] = [];

  // ── Legacy SDK format ────────────────────────────────────────────
  if ((attr.value as any)?.colorValue) {
    extractedValues.push((attr.value as any).colorValue);
  } else if (Array.isArray((attr.value as any)?.textValues)) {
    // `textValues` is a localized array; empty buckets are common (e.g.
    // FR present but unset). Picking `[0]` blindly returned `[]` and
    // silently hid every value for any attribute whose first language
    // slot was empty.
    const buckets = (attr.value as any).textValues as Array<{ values?: any[] }>;
    const firstNonEmpty = buckets.find(
      (entry) => Array.isArray(entry?.values) && entry.values.length > 0,
    );
    extractedValues = (firstNonEmpty?.values as string[] | undefined) ?? [];
  } else if ((attr.value as any)?.textValue) {
    extractedValues.push((attr.value as any).textValue);
  } else if ((attr.value as any)?.numericValue !== undefined) {
    extractedValues.push((attr.value as any).numericValue.toString());
  } else if ((attr.value as any)?.booleanValue !== undefined) {
    extractedValues.push((attr.value as any).booleanValue ? "Yes" : "No");
  }
  // ── Current SDK format (type-based) ──────────────────────────────
  else if (attr.value?.type === AttributeType.COLOR) {
    extractedValues.push(attr.value?.value);
  } else if (attr.value?.type === AttributeType.TEXT) {
    // Same first-non-empty pick as the legacy branch above.
    const buckets = (attr.value?.value?.textValues ?? []) as Array<{ values?: any[] }>;
    const firstNonEmpty = buckets.find(
      (entry) => Array.isArray(entry?.values) && entry.values.length > 0,
    );
    extractedValues = (firstNonEmpty?.values as string[] | undefined) ?? [];
  } else if (attr.value?.type === AttributeType.DECIMAL) {
    extractedValues.push(attr.value?.value?.toString());
  } else if (attr.value?.type === AttributeType.INT) {
    extractedValues.push(attr.value?.value?.toString());
  } else if (attr.value?.type === AttributeType.ENUM) {
    extractedValues.push(attr.value?.value);
  }
  // ── Fallback ─────────────────────────────────────────────────────
  else if (typeof attr.value === "string") {
    extractedValues.push(attr.value);
  } else if (attr.value && typeof attr.value === "object") {
    if (
      (attr.value as any).values &&
      Array.isArray((attr.value as any).values)
    ) {
      extractedValues = (attr.value as any).values.filter(
        (v: any) => typeof v === "string",
      );
    } else {
      const possibleValues = Object.values(attr.value).filter(
        (v: any) => typeof v === "string",
      );
      extractedValues = possibleValues as string[];
    }
  }
  return extractedValues.filter((val: string) => !!val);
}
function getAttributeDisplayName(
  attributeName: string,
): ReturnType<ClusterConfiguratorState["getAttributeDisplayName"]> {
  const products = (props.products as Product[]) || [];
  if (products.length === 0) return attributeName;
  const firstProduct = products[0];
  const attributeItems = firstProduct.attributes?.items;
  if (Array.isArray(attributeItems)) {
    const matchingAttr = (attributeItems as AttributeResult[]).find(
      (attr: AttributeResult) => attributeNameMatches(attr, attributeName),
    );
    if (matchingAttr?.attributeDescription?.descriptions?.[0]?.value) {
      return matchingAttr.attributeDescription.descriptions[0].value;
    }
  }
  return attributeName;
}
function getAttributeValues(
  attributeName: string,
): ReturnType<ClusterConfiguratorState["getAttributeValues"]> {
  const valSet = new Set<string>();
  const products = (props.products as Product[]) || [];
  products.forEach((product: Product) => {
    const attributeItems = product.attributes?.items;
    if (Array.isArray(attributeItems)) {
      (attributeItems as AttributeResult[]).forEach((attr: AttributeResult) => {
        if (attributeNameMatches(attr, attributeName)) {
          const extracted = extractAttributeValues(attr);
          extracted.forEach((val: string) => valSet.add(val));
        }
      });
    }
  });
  return Array.from(valSet);
}
function getAvailableValuesForIndex(
  attributeName: string,
  settingIndex: number,
): ReturnType<ClusterConfiguratorState["getAvailableValuesForIndex"]> {
  return getAvailableValuesForIndexWithSelections(
    attributeName,
    settingIndex,
    selectedAttributes.value as Record<string, string>,
  );
}
function getAvailableValuesForIndexWithSelections(
  attributeName: string,
  settingIndex: number,
  selections: Record<string, string>,
): ReturnType<
  ClusterConfiguratorState["getAvailableValuesForIndexWithSelections"]
> {
  if (settingIndex === 0) {
    return getAttributeValues(attributeName);
  }
  const sortedSettings = getSortedSettings();
  const previousSelections: Record<string, string> = {};
  for (let i = 0; i < settingIndex; i++) {
    const prevSetting = sortedSettings[i];
    if (selections[prevSetting.attributeName]) {
      previousSelections[prevSetting.attributeName] = selections[prevSetting.attributeName];
    }
  }
  const products = (props.products as Product[]) || [];
  const prevEntries = Object.entries(previousSelections);
  const matchingProducts = products.filter((product: Product) => {
    return prevEntries.every(([attrName, attrValue]: [string, string]) => {
      const attributeItems = product.attributes?.items;
      if (!Array.isArray(attributeItems)) return false;
      return (attributeItems as AttributeResult[]).some(
        (attr: AttributeResult) => {
          if (!attributeNameMatches(attr, attrName)) return false;
          return extractAttributeValues(attr).includes(attrValue);
        },
      );
    });
  });
  const availableSet = new Set<string>();
  matchingProducts.forEach((product: Product) => {
    const attributeItems = product.attributes?.items;
    if (Array.isArray(attributeItems)) {
      (attributeItems as AttributeResult[]).forEach((attr: AttributeResult) => {
        if (attributeNameMatches(attr, attributeName)) {
          extractAttributeValues(attr).forEach((val: string) =>
            availableSet.add(val),
          );
        }
      });
    }
  });
  return Array.from(availableSet);
}
function getAttributeType(attributeName: string): string | undefined {
  // Look across all products — variants may omit an attribute, and the first
  // product happens not to carry the type/description we need.
  const products = (props.products as Product[]) || [];
  for (const product of products) {
    const items = product.attributes?.items as AttributeResult[] | undefined;
    if (!Array.isArray(items)) continue;
    const match = items.find((attr) => attributeNameMatches(attr, attributeName));
    if (match) return (match.attributeDescription?.type ?? undefined) as string | undefined;
  }
  return undefined;
}
function getSettingsWithValues(): ReturnType<
  ClusterConfiguratorState["getSettingsWithValues"]
> {
  const sortedSettings = getSortedSettings();
  const sel = selectedAttributes.value as Record<string, string>;
  return sortedSettings.map((setting: ClusterConfigSetting, index: number) => {
    const availableValues = getAvailableValuesForIndex(setting.attributeName, index);
    const selectedValue = sel[setting.attributeName] || "";
    const isPreviousSelectionMissing =
      index > 0 &&
      sortedSettings
        .slice(0, index)
        .some((prev: ClusterConfigSetting) => !sel[prev.attributeName]);
    const isDisabled =
      availableValues.length === 0 || isPreviousSelectionMissing;
    const displayName = getAttributeDisplayName(setting.attributeName);
    const attributeType = getAttributeType(setting.attributeName);
    return {
      id: setting.uuid,
      name: setting.attributeName,
      displayType: setting.displayType as string,
      attributeType,
      priority: setting.priority,
      displayName,
      availableValues,
      selectedValue,
      disabled: isDisabled,
    };
  });
}
function findMatchingProduct(
  selections: Record<string, string>,
): ReturnType<ClusterConfiguratorState["findMatchingProduct"]> {
  const products = (props.products as Product[]) || [];
  const entries = Object.entries(selections);
  if (entries.length === 0) return null;
  const found = products.find((product: Product) => {
    const attrItems = product.attributes?.items;
    if (!Array.isArray(attrItems)) return false;
    return entries.every(([attrName, attrValue]: [string, string]) => {
      return (attrItems as AttributeResult[]).some((attr: AttributeResult) => {
        if (!attributeNameMatches(attr, attrName)) return false;
        const productValues = extractAttributeValues(attr);
        return productValues.includes(attrValue);
      });
    });
  });
  return found || null;
}
function handleAttributeSelect(
  settingName: string,
  value: string,
): ReturnType<ClusterConfiguratorState["handleAttributeSelect"]> {
  const sortedSettings = getSortedSettings();
  const changedIndex = sortedSettings.findIndex(
    (s: ClusterConfigSetting) => s.attributeName === settingName,
  );

  // Build new selections: keep, update changed, remove subsequent
  const newSelections: Record<string, string> = {
    ...(selectedAttributes.value as Record<string, string>),
  };
  newSelections[settingName] = value;
  for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
    delete newSelections[sortedSettings[i].attributeName];
  }

  // Always pre-select the first available value for all subsequent settings
  for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
    const nextSetting = sortedSettings[i];
    const available = getAvailableValuesForIndexWithSelections(
      nextSetting.attributeName,
      i,
      newSelections,
    );
    if (available.length > 0) {
      newSelections[nextSetting.attributeName] = available[0];
    } else {
      break;
    }
  }
  selectedAttributes.value = newSelections;

  // When all settings have a selection, resolve and report the product
  const allSelected = sortedSettings.every(
    (s: ClusterConfigSetting) => !!newSelections[s.attributeName],
  );
  if (allSelected) {
    const matchingProduct = findMatchingProduct(newSelections);
    if (matchingProduct && props.onConfigurationChange) {
      props.onConfigurationChange(matchingProduct);
    }
  }
}
</script>
