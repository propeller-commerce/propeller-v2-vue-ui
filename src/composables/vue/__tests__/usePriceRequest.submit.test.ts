/**
 * usePriceRequest — submit forwards the form extras (honeypot) to the host.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { usePriceRequest, PRICE_REQUEST_STORAGE_KEY } from '../usePriceRequest';

const item = { productId: 1, code: 'SKU-1', name: 'Widget', quantity: 2, minQuantity: 1, unit: 1 };

function stubWindow(): void {
  const store = new Map<string, string>([[PRICE_REQUEST_STORAGE_KEY, JSON.stringify([item])]]);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
  vi.stubGlobal('CustomEvent', class {});
}

afterEach(() => vi.unstubAllGlobals());

describe('usePriceRequest — submit extras', () => {
  it('passes website through to onSubmit', async () => {
    stubWindow();
    const onSubmit = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ok = await usePriceRequest({ onSubmit }).submit('please quote', { website: 'spam.example' });
    expect(ok).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith([item], 'please quote', { website: 'spam.example' });
  });

  it('defaults to empty extras when the caller passes none', async () => {
    stubWindow();
    const onSubmit = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await usePriceRequest({ onSubmit }).submit('hi');
    expect(onSubmit).toHaveBeenCalledWith([item], 'hi', {});
  });
});
