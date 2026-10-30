/**
 * useSpareParts — loading state on the first render.
 */

import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useSpareParts } from '../useSpareParts';

const CLIENT = { execute: () => new Promise(() => {}) } as never;

describe('useSpareParts — first render', () => {
  it('reports loading before the first fetch when it has a client and a slug', () => {
    const { isLoading } = useSpareParts({ graphqlClient: CLIENT, slug: ref('mixer'), language: ref('EN') } as never);
    expect(isLoading.value).toBe(true);
  });

  it('is not loading without a slug', () => {
    const { isLoading } = useSpareParts({ graphqlClient: CLIENT, slug: ref(undefined), language: ref('EN') } as never);
    expect(isLoading.value).toBe(false);
  });

  it('is not loading when controlled', () => {
    const { isLoading } = useSpareParts({
      graphqlClient: CLIENT,
      slug: ref('mixer'),
      parts: ref([]),
      language: ref('EN'),
    } as never);
    expect(isLoading.value).toBe(false);
  });
});
