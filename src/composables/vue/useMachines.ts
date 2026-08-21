/**
 * useMachines (Vue) — the machine-tree ROOT: a company's installations.
 *
 * The sibling of `useSpareParts` for the root level. Where `useSpareParts`
 * fetches one node by slug, this resolves a *list* of installation ids
 * (`MY_INSTALLATIONS`) in ONE request, by concatenating an aliased
 * `machine(source:, sourceId:)` selection per id — mirroring the WordPress
 * reference's `installations()` mega-query. One shared `$source`/`$language`,
 * one `$sourceId_N` per id, all resolved in a single round-trip.
 *
 * It calls `graphqlClient.execute()` with a hand-built document rather than an
 * SDK operation because the alias count is dynamic (N ids → N aliases) — there
 * is no static operation for that. The selection is the minimal set a
 * `MachineCard` needs (`id`/`name`/`description`/`slug`/first image url).
 *
 * Mirrors `propeller-v2-react-ui`'s `useMachines`. The machine pages are CSR,
 * so the fetch is client-only (`typeof window` guard) — no SSR self-fetch.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import type { GraphQLClient, SparePartsMachine } from '@propeller-commerce/propeller-sdk-v2';

/**
 * The minimal fields a root `MachineCard` needs. Inlined (not the SDK's
 * `SparePartsMachineMinimalFields` fragment) because that fragment drags in
 * image-transform variables we don't want on the lightweight root list, and the
 * concat query hand-writes its own variable block. `imageVariants[0].url` is the
 * exact field `MachineCard`'s image walk reads.
 */
const ROOT_MACHINE_FIELDS = `
  id
  name(language: $language) { language value }
  description(language: $language) { language value }
  slug(language: $language) { language value }
  media {
    images {
      items { imageVariants(input: $imageVariantFilters) { url } }
    }
  }
`;

/**
 * Build ONE aliased query resolving every installation in a single request:
 * `machine_0: machine(source: $source, sourceId: $sourceId_0, language: $language) { … }`
 * per id. One shared `$source`/`$language`/`$imageVariantFilters`, one
 * `$sourceId_N` per id. `imageVariants(input:)` is NON_NULL — the same
 * `TransformationsInput!` the SDK `machine`/`category` queries require.
 */
export function buildRootMachinesQuery(count: number): string {
  const vars = [
    '$source: String',
    '$language: String',
    '$imageVariantFilters: TransformationsInput!',
    ...Array.from({ length: count }, (_, i) => `$sourceId_${i}: String`),
  ].join('\n    ');

  const aliases = Array.from({ length: count }, (_, i) => `
    machine_${i}: machine(source: $source, sourceId: $sourceId_${i}, language: $language) {
      ${ROOT_MACHINE_FIELDS}
    }`).join('\n');

  return `query RootMachines(\n    ${vars}\n  ) {${aliases}\n  }`;
}

export interface UseMachinesOptions {
  /** SDK client. Without it the composable stays idle. */
  graphqlClient?: GraphQLClient;
  /** External system the machine ids belong to (pairs with each id). */
  source?: Ref<string | undefined>;
  /** Installation ids (from the `MY_INSTALLATIONS` company track attribute). */
  sourceIds?: Ref<string[] | undefined>;
  /** Language the machine TREE is authored in (usually EN). */
  language?: Ref<string | undefined>;
  /**
   * Image transformation for the card thumbnail — the `TransformationsInput!`
   * the schema requires on `imageVariants(input:)`. Without it the query fails
   * validation. Pass `config.imageVariantFiltersMedium` (same value the node
   * query uses).
   */
  imageVariantFilters?: unknown;
}

export interface UseMachinesReturn {
  /** Resolved installations, in `sourceIds` order, nulls dropped. */
  machines: ComputedRef<SparePartsMachine[]>;
  /** `true` while the concat request is in flight. */
  isLoading: Ref<boolean>;
  /** Re-run the fetch. */
  fetchMachines: () => Promise<void>;
}

/**
 * useMachines — resolve a company's installations in one concatenated request.
 */
export function useMachines(options: UseMachinesOptions): UseMachinesReturn {
  const { graphqlClient, imageVariantFilters } = options;
  const sourceRef = options.source ?? ref<string | undefined>(undefined);
  const languageRef = options.language ?? ref<string | undefined>(undefined);
  const sourceIdsRef = options.sourceIds ?? ref<string[]>([]);

  const internalMachines = ref<SparePartsMachine[]>([]) as Ref<SparePartsMachine[]>;
  const isLoading = ref(false);

  /** Per-instance guard: only the newest fetch commits. Mirrors `useSpareParts`. */
  let fetchId = 0;

  async function fetchMachines(): Promise<void> {
    const source = sourceRef.value;
    const sourceIds = sourceIdsRef.value ?? [];
    // Idle: no client / source / ids → don't fetch (the gated return below hides
    // any stale list until the next successful fetch).
    if (!graphqlClient || !source || sourceIds.length === 0) return;

    const thisId = ++fetchId;
    isLoading.value = true;

    try {
      const variables: Record<string, unknown> = {
        source,
        language: languageRef.value ?? '',
        imageVariantFilters,
      };
      sourceIds.forEach((id, i) => {
        variables[`sourceId_${i}`] = id;
      });

      const result = await graphqlClient.execute<Record<string, SparePartsMachine | null>>({
        query: buildRootMachinesQuery(sourceIds.length),
        variables,
        operationName: 'RootMachines',
      });

      if (thisId !== fetchId) return;

      const data = result.data ?? {};
      internalMachines.value = sourceIds
        .map((_, i) => data[`machine_${i}`])
        .filter((m): m is SparePartsMachine => m != null);
    } catch (e) {
      console.error('[useMachines] fetchMachines error:', e);
      if (thisId === fetchId) internalMachines.value = [];
    } finally {
      if (thisId === fetchId) isLoading.value = false;
    }
  }

  // Gate the output on `sourceIds` so a switch to an empty installation set
  // shows nothing immediately, even before a stale fetch result clears.
  const machines = computed<SparePartsMachine[]>(() =>
    (sourceIdsRef.value?.length ?? 0) > 0 ? internalMachines.value : []
  );

  // Key the fetch on its INPUTS (content). The ids are content-keyed via their
  // joined string so a new-but-equal array does not retrigger. Client-only: the
  // machine pages are CSR, so never self-fetch during SSR.
  watch(
    [sourceRef, languageRef, () => (sourceIdsRef.value ?? []).join(',')],
    () => {
      if (typeof window !== 'undefined') void fetchMachines();
    },
    { immediate: true }
  );

  return { machines, isLoading, fetchMachines };
}
