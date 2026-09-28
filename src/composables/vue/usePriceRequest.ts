/**
 * usePriceRequest — the price-request list plus its submission.
 *
 * Products whose price is quoted (`priceData.display === 'ON_REQUEST'`) cannot
 * be ordered, so they collect here instead of in the cart and are sent as one
 * request.
 *
 * There is no SDK mutation behind this: delivery is the host's, supplied as
 * `onSubmit` (an email endpoint, a ticket, a CRM call). Without it the list
 * still works and `submit` reports the omission rather than silently
 * succeeding.
 */
import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
import {
  addItem,
  containsItem,
  parseStoredList,
  removeItem,
  setItemQuantity,
  type PriceRequestItem,
} from '../shared/utils/priceRequestList';

export const PRICE_REQUEST_STORAGE_KEY = 'propeller_price_request';

/** Broadcast so every mounted consumer in this tab follows one list. */
const PRICE_REQUEST_EVENT = 'priceRequestChanged';

export interface UsePriceRequestOptions {
  /**
   * Sends the finished request. Receives the list and the shopper's comment;
   * resolve to report success. Supplied by the host — the API has no mutation
   * for this.
   */
  onSubmit?: (items: PriceRequestItem[], comment: string) => Promise<void> | void;
  /** Overrides the localStorage key, for hosts running several shops per origin. */
  storageKey?: string;
}

export interface UsePriceRequestReturn {
  items: Ref<PriceRequestItem[]>;
  /** False until mounted, so callers can hold their label through hydration. */
  ready: Ref<boolean>;
  count: ComputedRef<number>;
  /** Adds a product unless its code is already listed. Returns false when it was. */
  add: (item: PriceRequestItem) => boolean;
  remove: (code: string) => void;
  setQuantity: (code: string, quantity: number) => void;
  clear: () => void;
  has: (code: string) => boolean;
  /** Sends the list via `onSubmit`, clearing it only on success. */
  submit: (comment: string) => Promise<boolean>;
  submitting: Ref<boolean>;
  error: Ref<string | null>;
}

function read(key: string): PriceRequestItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseStoredList(window.localStorage.getItem(key));
  } catch {
    return [];
  }
}

function write(key: string, items: PriceRequestItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // A full or blocked store must not break the list in memory.
  }
  window.dispatchEvent(new CustomEvent(PRICE_REQUEST_EVENT));
}

export function usePriceRequest(options: UsePriceRequestOptions = {}): UsePriceRequestReturn {
  const storageKey = options.storageKey ?? PRICE_REQUEST_STORAGE_KEY;
  // Starts empty so the server and the first client render agree; the stored
  // list arrives on mount.
  const items = ref<PriceRequestItem[]>([]) as Ref<PriceRequestItem[]>;
  const ready = ref(false);
  const count = computed<number>(() => items.value.length);
  const submitting = ref(false);
  const error = ref<string | null>(null);

  const sync = () => {
    items.value = read(storageKey);
  };

  onMounted(() => {
    sync();
    ready.value = true;
    window.addEventListener(PRICE_REQUEST_EVENT, sync);
    // `storage` fires in OTHER tabs only — this is what keeps them in step.
    window.addEventListener('storage', sync);
  });

  onUnmounted(() => {
    if (typeof window === 'undefined') return;
    window.removeEventListener(PRICE_REQUEST_EVENT, sync);
    window.removeEventListener('storage', sync);
  });

  function commit(next: PriceRequestItem[]): void {
    items.value = next;
    write(storageKey, next);
  }

  function add(item: PriceRequestItem): boolean {
    const current = read(storageKey);
    if (containsItem(current, item.code)) return false;
    commit(addItem(current, item));
    return true;
  }

  function remove(code: string): void {
    commit(removeItem(read(storageKey), code));
  }

  function setQuantity(code: string, quantity: number): void {
    commit(setItemQuantity(read(storageKey), code, quantity));
  }

  function clear(): void {
    commit([]);
  }

  function has(code: string): boolean {
    return containsItem(items.value, code);
  }

  async function submit(comment: string): Promise<boolean> {
    const current = read(storageKey);
    if (!current.length) {
      error.value = 'empty';
      return false;
    }
    if (!options.onSubmit) {
      error.value = 'unsupported';
      return false;
    }
    submitting.value = true;
    error.value = null;
    try {
      await options.onSubmit(current, comment);
      commit([]);
      return true;
    } catch (e) {
      error.value = (e as Error)?.message || 'failed';
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return { items, ready, count, add, remove, setQuantity, clear, has, submit, submitting, error };
}
