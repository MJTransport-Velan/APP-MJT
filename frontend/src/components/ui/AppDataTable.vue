<template>
  <div class="app-data-table">
    <div class="app-data-table__scroll">
      <table class="app-data-table__table">
        <thead>
          <tr>
              <th
              v-for="col in normalizedHeaders"
              :key="col.key"
              :class="[col.align ? `text-${col.align}` : '', { 'app-data-table__sortable': col.sortable !== false }]"
              @click="col.sortable !== false && toggleSort(col.key)"
            >
              <span class="app-data-table__th">
                {{ col.title }}
                <AppIcon
                  v-if="col.sortable !== false"
                  icon="mdi-arrow-up"
                  size="small"
                  class="app-data-table__sort-icon"
                  :class="{
                    'app-data-table__sort-icon--active': sortBy[0]?.key === col.key,
                    'app-data-table__sort-icon--desc': sortBy[0]?.key === col.key && sortBy[0]?.order === 'desc',
                  }"
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="normalizedHeaders.length" class="app-data-table__state">Loading…</td>
          </tr>
          <!-- A failed load must never look like an empty result: show what
               went wrong and offer a retry instead of "No data available". -->
          <tr v-else-if="error">
            <td :colspan="normalizedHeaders.length" class="app-data-table__state app-data-table__state--error">
              <span class="app-data-table__error-title">This list could not be loaded</span>
              <span class="app-data-table__error-detail">{{ error }}</span>
              <button type="button" class="app-data-table__retry" @click="emit('retry')">Try again</button>
            </td>
          </tr>
          <tr v-else-if="!items.length">
            <td :colspan="normalizedHeaders.length" class="app-data-table__state">No data available</td>
          </tr>
          <tr v-for="(item, rowIndex) in items" :key="resolveKey(item, rowIndex)">
            <td
              v-for="(col, colIndex) in normalizedHeaders"
              :key="col.key"
              :class="col.align ? `text-${col.align}` : ''"
              :style="colIndex === 0 && rowAccent(item, rowIndex) ? { borderLeft: `4px solid ${rowAccent(item, rowIndex)}` } : undefined"
            >
              <slot :name="`item.${col.key}`" :item="item" :value="(item as Record<string, unknown>)[col.key]" :index="rowIndex">
                {{ formatValue((item as Record<string, unknown>)[col.key]) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="app-data-table__footer">
      <div class="app-data-table__range">{{ rangeLabel }}</div>
      <div class="app-data-table__pager">
        <button type="button" class="app-data-table__nav-btn" :disabled="page <= 1" @click="goToPage(page - 1)">
          <AppIcon icon="mdi-chevron-left" />
        </button>
        <template v-for="(p, i) in pageNumbers" :key="i">
          <span v-if="p === '...'" class="app-data-table__ellipsis">…</span>
          <button
            v-else
            type="button"
            class="app-data-table__page-btn"
            :class="{ 'app-data-table__page-btn--active': p === page }"
            @click="selectPage(p)"
          >
            {{ p }}
          </button>
        </template>
        <button type="button" class="app-data-table__nav-btn" :disabled="page >= totalPages" @click="goToPage(page + 1)">
          <AppIcon icon="mdi-chevron-right" />
        </button>
      </div>
      <div class="app-data-table__per-page">
        <AppSelect
          :model-value="String(itemsPerPage)"
          :items="perPageOptions"
          @update:model-value="onItemsPerPageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">
import { computed, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import AppSelect from './AppSelect.vue';

interface Header {
  title: string;
  key: string;
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;
}
interface SortItem {
  key: string;
  order: 'asc' | 'desc';
}

const props = withDefaults(
  defineProps<{
    headers: Record<string, unknown>[];
    items: T[];
    itemsLength: number;
    loading?: boolean;
    itemValue?: string;
    page?: number;
    itemsPerPage?: number;
    itemLabel?: string;
    rowBorderColor?: (item: T, index: number) => string | undefined;
    /** Message from a failed load — renders an error state with a retry in place of the empty state. */
    error?: string | null;
  }>(),
  { loading: false, itemValue: 'id', page: 1, itemsPerPage: 10, itemLabel: 'results', error: null }
);

const normalizedHeaders = computed(() => props.headers as unknown as Header[]);

const emit = defineEmits<{
  'update:page': [value: number];
  'update:itemsPerPage': [value: number];
  'update:options': [options: { page: number; itemsPerPage: number; sortBy: SortItem[] }];
  retry: [];
}>();

const sortBy = ref<SortItem[]>([]);
const perPageOptions = ['5', '10', '15', '25', '50', '100'].map((n) => ({ title: `${n} per page`, value: n }));

const totalPages = computed(() => Math.max(1, Math.ceil(props.itemsLength / props.itemsPerPage)));

const rangeLabel = computed(() => {
  if (!props.itemsLength) return `Showing 0 ${props.itemLabel}`;
  const start = (props.page - 1) * props.itemsPerPage + 1;
  const end = Math.min(props.page * props.itemsPerPage, props.itemsLength);
  return `Showing ${start} to ${end} of ${props.itemsLength} ${props.itemLabel}`;
});

function rowAccent(item: T, index: number) {
  return props.rowBorderColor?.(item, index);
}

const pageNumbers = computed<(number | '...')[]>(() => {
  const total = totalPages.value;
  const current = props.page;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push('...');
    result.push(p);
  });
  return result;
});

function resolveKey(item: T, index: number) {
  const key = item[props.itemValue];
  return key !== undefined && key !== null ? String(key) : index;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function emitOptions() {
  emit('update:options', { page: props.page, itemsPerPage: props.itemsPerPage, sortBy: sortBy.value });
}

function goToPage(next: number) {
  if (next < 1 || next > totalPages.value) return;
  emit('update:page', next);
}

function selectPage(p: number | '...') {
  if (typeof p === 'number') goToPage(p);
}

function onItemsPerPageChange(value: unknown) {
  emit('update:itemsPerPage', Number(value));
  emit('update:page', 1);
}

function toggleSort(key: string) {
  const current = sortBy.value[0];
  if (!current || current.key !== key) {
    sortBy.value = [{ key, order: 'asc' }];
  } else if (current.order === 'asc') {
    sortBy.value = [{ key, order: 'desc' }];
  } else {
    sortBy.value = [];
  }
}

watch([() => props.page, () => props.itemsPerPage, sortBy], emitOptions, { deep: true, immediate: true });
</script>

<style scoped>
.app-data-table__scroll { width: 100%; overflow-x: auto; }
.app-data-table__table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.app-data-table__table th {
  text-align: left;
  padding: 12px;
  font-weight: 500;
  color: var(--color-text-medium);
  border-bottom: 1px solid var(--color-divider);
  white-space: nowrap;
  user-select: none;
}
.app-data-table__table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--color-divider);
}
.app-data-table__table tbody tr:hover { background: var(--color-hover); }
.app-data-table__table tbody tr:last-child td { border-bottom: none; }
.app-data-table__sortable { cursor: pointer; }
.app-data-table__th { display: inline-flex; align-items: center; gap: 4px; }
.app-data-table__sort-icon { opacity: 0; transition: transform 0.15s ease, opacity 0.15s ease; }
.app-data-table__sortable:hover .app-data-table__sort-icon { opacity: 0.4; }
.app-data-table__sort-icon--active { opacity: 1 !important; }
.app-data-table__sort-icon--desc { transform: rotate(180deg); }
.app-data-table__state { text-align: center; padding: 32px; color: var(--color-text-medium); }
.app-data-table__state--error { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.app-data-table__error-title { font-weight: 600; color: var(--color-error, #b3261e); }
.app-data-table__error-detail { font-size: 0.875rem; color: var(--color-text-medium); }
.app-data-table__retry {
  margin-top: 6px;
  padding: 6px 16px;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--color-primary, #1f5fa8);
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
}
.app-data-table__retry:hover { background: rgba(31, 95, 168, 0.08); }
.text-start { text-align: left; }
.text-center { text-align: center; }
.text-end { text-align: right; }

.app-data-table__footer {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 12px;
  font-size: 0.8125rem;
  color: var(--color-text-medium);
  flex-wrap: wrap;
}
.app-data-table__per-page { display: flex; align-items: center; gap: 8px; width: 140px; margin-left: auto; }
.app-data-table__per-page :deep(.app-field) { margin-bottom: 0; }
.app-data-table__per-page :deep(.app-field__control) { height: 32px; }
.app-data-table__range { white-space: nowrap; }
.app-data-table__pager { display: flex; align-items: center; gap: 4px; }
.app-data-table__nav-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  padding: 6px;
  border-radius: 50%;
  color: var(--color-text);
}
.app-data-table__nav-btn:hover:not(:disabled) { background: var(--color-hover); }
.app-data-table__nav-btn:disabled { opacity: 0.35; cursor: default; }
.app-data-table__page-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  font-size: 0.8125rem;
  cursor: pointer;
}
.app-data-table__page-btn:hover { background: var(--color-hover); }
.app-data-table__page-btn--active {
  background: var(--color-primary);
  color: #fff;
}
.app-data-table__ellipsis { padding: 0 4px; color: var(--color-text-medium); }
</style>
