/**
 * useFavorites (Vue) — Favorite list CRUD with optimistic updates.
 *
 * Covers: FavoriteLists, FavoriteListDetails, AddToFavorite components.
 *
 * Responsibilities:
 * - fetchLists: read favoriteLists from Contact/Customer (no separate SDK call needed)
 * - createList: FavoriteListService.createFavoriteList with contactId/customerId from user
 * - updateList / deleteList: FavoriteListService CRUD
 * - addToList / removeFromList: FavoriteListService item management
 * - isProductInList: check products.items for a given productId
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { FavoriteListService } from '@propeller-commerce/propeller-sdk-v2';
import type { GraphQLClient, FavoriteList, FavoriteListsCreateInput, Product } from '@propeller-commerce/propeller-sdk-v2';
import type { AnyUser } from '@propeller-commerce/propeller-v2-core-ui';
import { isContact, isCustomer } from '@propeller-commerce/propeller-v2-core-ui';
import { createServices } from '@propeller-commerce/propeller-v2-core-ui';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FavoriteListFormData {
  name: string;
  isDefault: boolean;
}

/** What a favorite-list mutation did — see `onListChanged`. */
export interface FavoriteListChange {
  action: 'created' | 'updated' | 'deleted';
  listId?: string | number;
  name?: string;
  isDefault?: boolean;
}

export interface UseFavoritesOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  language?: Ref<string>;
  onCreate?: (data: FavoriteListFormData) => void;
  onEdit?: (id: string, data: FavoriteListFormData) => void;
  onDelete?: (id: string) => void;
  /**
   * Called after a list mutation succeeds.
   *
   * The `change` argument is optional so existing zero-argument callbacks keep
   * working, but without it a host cannot tell a create from a delete — which
   * makes the composable useless for analytics, audit trails or optimistic UI
   * that needs to know WHAT happened rather than merely THAT something did.
   */
  onListChanged?: (change?: FavoriteListChange) => void;
}

export interface UseFavoritesReturn {
  lists: Ref<FavoriteList[]>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  error: Ref<string | null>;
  editingListId: Ref<string | null>;
  editListName: Ref<string>;
  editSetAsDefault: Ref<boolean>;
  newListName: Ref<string>;
  newSetAsDefault: Ref<boolean>;
  listToDelete: Ref<FavoriteList | null>;
  fetchLists: () => void;
  startEdit: (list: FavoriteList) => void;
  cancelEdit: () => void;
  updateList: (listId: string) => Promise<void>;
  confirmDelete: (list: FavoriteList) => void;
  deleteList: () => Promise<void>;
  createList: (name: string, isDefault: boolean) => Promise<void>;
  addToList: (listId: string, productId?: number, clusterId?: number) => Promise<void>;
  removeFromList: (
    listId: string,
    productId?: number | number[],
    clusterId?: number | number[],
  ) => Promise<void>;
  isProductInList: (listId: string, productId: number) => ComputedRef<boolean>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useFavorites(options: UseFavoritesOptions): UseFavoritesReturn {
  const { graphqlClient, user, onCreate, onEdit, onDelete, onListChanged } = options;

  const lists = ref<FavoriteList[]>([]) as Ref<FavoriteList[]>;
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const editingListId = ref<string | null>(null);
  const editListName = ref('');
  const editSetAsDefault = ref(false);
  const newListName = ref('');
  const newSetAsDefault = ref(false);
  const listToDelete = ref<FavoriteList | null>(null) as Ref<FavoriteList | null>;

  // ── Fetch lists ───────────────────────────────────────────────────────────
  // Reads favoriteLists from the user object directly.

  function fetchLists(): void {
    const u = user.value;
    if (!u) { lists.value = []; return; }
    lists.value = u.favoriteLists?.items ?? [];
  }

  // Auto-sync lists whenever user (or their favoriteLists) changes.
  watch(
    () => user.value?.favoriteLists?.items,
    () => fetchLists(),
    { immediate: true }
  );

  // ── Edit state helpers ────────────────────────────────────────────────────

  function startEdit(list: FavoriteList): void {
    editingListId.value = String(list.id);
    editListName.value = list.name;
    editSetAsDefault.value = list.isDefault || false;
  }

  function cancelEdit(): void {
    editingListId.value = null;
    editListName.value = '';
    editSetAsDefault.value = false;
  }

  // ── Update list ───────────────────────────────────────────────────────────

  async function updateList(listId: string): Promise<void> {
    const data: FavoriteListFormData = { name: editListName.value, isDefault: editSetAsDefault.value };
    if (onEdit) { onEdit(listId, data); cancelEdit(); onListChanged?.({ action: 'updated', listId, name: data.name, isDefault: data.isDefault }); return; }
    saving.value = true;
    try {
      const service = createServices(graphqlClient).favoriteList;
      if (data.isDefault) {
        const currentDefault = lists.value.find((l: FavoriteList) => l.isDefault && String(l.id) !== listId);
        if (currentDefault) {
          await service.updateFavoriteList(String(currentDefault.id), { name: currentDefault.name, isDefault: false });
        }
      }
      const updated = await service.updateFavoriteList(listId, { name: data.name, isDefault: data.isDefault });
      lists.value = lists.value.map((l: FavoriteList) => String(l.id) === listId ? updated : l);
      cancelEdit();
      onListChanged?.({ action: 'updated', listId, name: data.name, isDefault: data.isDefault });
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update list';
    } finally {
      saving.value = false;
    }
  }

  // ── Delete list ───────────────────────────────────────────────────────────

  function confirmDelete(list: FavoriteList): void { listToDelete.value = list; }

  async function deleteList(): Promise<void> {
    if (!listToDelete.value) return;
    const list = listToDelete.value;
    const listId = String(list.id);
    if (onDelete) { onDelete(listId); listToDelete.value = null; onListChanged?.({ action: 'deleted', listId, name: list.name }); return; }
    saving.value = true;
    lists.value = lists.value.filter((l: FavoriteList) => String(l.id) !== listId);
    listToDelete.value = null;
    try {
      const service = createServices(graphqlClient).favoriteList;
      await service.deleteFavoriteList(listId);
      onListChanged?.({ action: 'deleted', listId, name: list.name });
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to delete list';
      if (list) lists.value = [...lists.value, list];
    } finally {
      saving.value = false;
    }
  }

  // ── Create list ───────────────────────────────────────────────────────────
  // Passes contactId/customerId from the user.

  async function createList(name: string, isDefault: boolean): Promise<void> {
    const data: FavoriteListFormData = { name, isDefault };
    if (onCreate) { onCreate(data); onListChanged?.({ action: 'created', name, isDefault }); return; }
    saving.value = true;
    try {
      const service = createServices(graphqlClient).favoriteList;
      if (isDefault) {
        const currentDefault = lists.value.find((l: FavoriteList) => l.isDefault);
        if (currentDefault) {
          await service.updateFavoriteList(String(currentDefault.id), { name: currentDefault.name, isDefault: false });
        }
      }
      const u = user.value;
      const createInput: FavoriteListsCreateInput = { name, isDefault };
      if (isContact(u)) createInput.contactId = u.contactId;
      if (isCustomer(u)) createInput.customerId = u.customerId;
      const created = await service.createFavoriteList(createInput);
      lists.value = [...lists.value, created];
      onListChanged?.({ action: 'created', listId: created?.id, name, isDefault });
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create list';
    } finally {
      saving.value = false;
    }
  }

  // ── Add / remove items ────────────────────────────────────────────────────

  async function addToList(listId: string, productId?: number, clusterId?: number): Promise<void> {
    try {
      const service = createServices(graphqlClient).favoriteList;
      const updated = await service.addFavoriteListItems(listId, {
        ...(productId && { productIds: [productId] }),
        ...(clusterId && { clusterIds: [clusterId] }),
      });
      lists.value = lists.value.map((l: FavoriteList) => String(l.id) === listId ? updated : l);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to add to list';
    }
  }

  async function removeFromList(
    listId: string,
    productId?: number | number[],
    clusterId?: number | number[],
  ): Promise<void> {
    const productIds = productId === undefined ? [] : Array.isArray(productId) ? productId : [productId];
    const clusterIds = clusterId === undefined ? [] : Array.isArray(clusterId) ? clusterId : [clusterId];
    if (productIds.length === 0 && clusterIds.length === 0) return;
    try {
      const service = createServices(graphqlClient).favoriteList;
      const updated = await service.removeFavoriteListItems(listId, {
        ...(productIds.length && { productIds }),
        ...(clusterIds.length && { clusterIds }),
      });
      lists.value = lists.value.map((l: FavoriteList) => String(l.id) === listId ? updated : l);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to remove from list';
    }
  }

  // ── Check product in list ─────────────────────────────────────────────────
  // list.products is ProductsResponse; items are IBaseProduct but runtime Product.

  function isProductInList(listId: string, productId: number): ComputedRef<boolean> {
    return computed(() => {
      const list = lists.value.find((l: FavoriteList) => String(l.id) === listId);
      if (!list) return false;
      return (list.products?.items ?? []).some((p) => (p as Product).productId === productId);
    });
  }

  return {
    lists, loading, saving, error,
    editingListId, editListName, editSetAsDefault,
    newListName, newSetAsDefault, listToDelete,
    fetchLists, startEdit, cancelEdit,
    updateList, confirmDelete, deleteList, createList,
    addToList, removeFromList, isProductInList,
  };
}
