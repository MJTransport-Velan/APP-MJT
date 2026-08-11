import { reactive } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

export interface RecentEntry {
  path: string;
  title: string;
  visitedAt: number;
}

const MAX_ENTRIES = 8;
const state = reactive<{ items: RecentEntry[] }>({ items: [] });
let loadedKey: string | null = null;

function storageKey(): string {
  const authStore = useAuthStore();
  return `mj_recent_pages_${authStore.user?.id || 'guest'}`;
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

// Called once from the router's afterEach hook on every leaf-page navigation.
export function recordVisit(entry: { path: string; title: string }) {
  load();
  const filtered = state.items.filter((i) => i.path !== entry.path);
  filtered.unshift({ ...entry, visitedAt: Date.now() });
  state.items = filtered.slice(0, MAX_ENTRIES);
  localStorage.setItem(storageKey(), JSON.stringify(state.items));
}

export function useRecentlyVisited() {
  load();
  return { recent: state.items };
}
