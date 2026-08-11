import { reactive } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

export interface FavoriteEntry {
  path: string;
  title: string;
  icon: string;
}

const state = reactive<{ items: FavoriteEntry[] }>({ items: [] });
let loadedKey: string | null = null;

function storageKey(): string {
  const authStore = useAuthStore();
  return `mj_favorites_${authStore.user?.id || 'guest'}`;
}

function load() {
  const key = storageKey();
  if (loadedKey === key) return;
  loadedKey = key;
  try {
    state.items = JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    state.items = [];
  }
}

function persist() {
  localStorage.setItem(storageKey(), JSON.stringify(state.items));
}

export function useFavorites() {
  load();

  function isFavorite(path: string) {
    return state.items.some((f) => f.path === path);
  }

  function toggleFavorite(entry: FavoriteEntry) {
    const idx = state.items.findIndex((f) => f.path === entry.path);
    if (idx >= 0) state.items.splice(idx, 1);
    else state.items.unshift(entry);
    persist();
  }

  return { favorites: state.items, isFavorite, toggleFavorite };
}
