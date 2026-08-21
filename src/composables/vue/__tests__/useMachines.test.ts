/**
 * useMachines — the root concat-query builder + fetch gate.
 *
 * Runs in vitest's Node env. `buildRootMachinesQuery` is a pure function; the
 * `fetchMachines` gate is exercised directly (the composable's auto-`watch` is
 * client-only, so it never fires in Node).
 */
import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { buildRootMachinesQuery, useMachines } from '../useMachines';

describe('buildRootMachinesQuery', () => {
  it('N=0 → one operation, shared vars, no aliases', () => {
    const q = buildRootMachinesQuery(0);
    expect(q).toContain('query RootMachines(');
    expect(q).toContain('$source: String');
    expect(q).toContain('$language: String');
    expect(q).toContain('$imageVariantFilters: TransformationsInput!');
    expect(q).not.toContain('machine_0:');
    expect(q).not.toContain('$sourceId_0');
  });

  it('N=3 → one $sourceId_N var + machine_N alias per id, shared vars once', () => {
    const q = buildRootMachinesQuery(3);
    for (const i of [0, 1, 2]) {
      expect(q).toContain(`$sourceId_${i}: String`);
      expect(q).toContain(
        `machine_${i}: machine(source: $source, sourceId: $sourceId_${i}, language: $language)`
      );
    }
    expect(q).not.toContain('$sourceId_3');
    expect(q).not.toContain('machine_3:');
    expect(q.match(/\$source: String/g)?.length).toBe(1);
    expect(q.match(/\$language: String/g)?.length).toBe(1);
  });
});

describe('useMachines fetch gate', () => {
  it('does not call execute when sourceIds is empty', async () => {
    let called = false;
    const client = { execute: async () => ((called = true), { data: {} }) } as never;
    const { fetchMachines, machines } = useMachines({
      graphqlClient: client,
      source: ref('OTTEVANGER'),
      sourceIds: ref([]),
      language: ref('EN'),
    });
    await fetchMachines();
    expect(called).toBe(false);
    expect(machines.value).toEqual([]);
  });

  it('calls execute once with N aliased ids and drops null results', async () => {
    const calls: { operationName?: string; variables: Record<string, unknown> }[] = [];
    const client = {
      execute: async (arg: { operationName?: string; variables: Record<string, unknown> }) => {
        calls.push(arg);
        return { data: { machine_0: { id: '1' }, machine_1: null } };
      },
    } as never;
    const { fetchMachines, machines } = useMachines({
      graphqlClient: client,
      source: ref('OTTEVANGER'),
      sourceIds: ref(['a', 'b']),
      language: ref('EN'),
      imageVariantFilters: {},
    });
    await fetchMachines();
    expect(calls.length).toBe(1);
    expect(calls[0].operationName).toBe('RootMachines');
    expect(calls[0].variables.sourceId_0).toBe('a');
    expect(calls[0].variables.sourceId_1).toBe('b');
    // null machine_1 dropped, only machine_0 survives
    expect(machines.value).toEqual([{ id: '1' }]);
  });
});
