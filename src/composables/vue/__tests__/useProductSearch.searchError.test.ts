/**
 * useProductSearch — a failed search-bar request is reported as an error, not
 * as "no results".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

const getCategory = vi.hoisted(() => vi.fn());

vi.mock('@propeller-commerce/propeller-v2-core-ui', async (orig) => ({
  ...(await orig<typeof import('@propeller-commerce/propeller-v2-core-ui')>()),
  createServices: () => ({ category: { getCategory } }),
}));

import { useProductSearch } from '../useProductSearch';

const setup = () =>
  useProductSearch({
    graphqlClient: {} as never,
    language: ref('EN'),
    configuration: { baseCategoryId: 1 },
  });

const okResponse = {
  products: { items: [{ productId: 7, names: [{ language: 'EN', value: 'Drill' }] }], itemsFound: 1 },
};

describe('useProductSearch — search-bar errors', () => {
  beforeEach(() => {
    getCategory.mockReset();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sets searchError when the search request fails', async () => {
    getCategory.mockRejectedValueOnce(new Error('network down'));
    const s = setup();
    s.search('drill');
    await vi.advanceTimersByTimeAsync(300);

    expect(s.searchError.value).toBe(true);
    expect(s.searchResults.value).toEqual([]);
    expect(s.searchLoading.value).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('clears searchError when the next search succeeds', async () => {
    getCategory.mockRejectedValueOnce(new Error('network down'));
    const s = setup();
    s.search('drill');
    await vi.advanceTimersByTimeAsync(300);
    expect(s.searchError.value).toBe(true);

    getCategory.mockResolvedValueOnce(okResponse);
    s.search('drills');
    await vi.advanceTimersByTimeAsync(300);
    expect(s.searchError.value).toBe(false);
    expect(s.searchResults.value).toHaveLength(1);
  });

  it('ignores a failure from a search that a newer one superseded', async () => {
    let rejectFirst: (e: Error) => void = () => {};
    getCategory.mockImplementationOnce(() => new Promise((_, rej) => { rejectFirst = rej; }));
    const s = setup();
    s.search('dri');
    await vi.advanceTimersByTimeAsync(300);

    getCategory.mockResolvedValueOnce(okResponse);
    s.search('drill');
    await vi.advanceTimersByTimeAsync(300);
    rejectFirst(new Error('late failure'));
    await vi.advanceTimersByTimeAsync(0);

    expect(s.searchError.value).toBe(false);
    expect(s.searchResults.value).toHaveLength(1);
  });

  it('clears searchError when the term is cleared', async () => {
    getCategory.mockRejectedValueOnce(new Error('network down'));
    const s = setup();
    s.search('drill');
    await vi.advanceTimersByTimeAsync(300);
    s.search('');
    expect(s.searchError.value).toBe(false);
  });
});
