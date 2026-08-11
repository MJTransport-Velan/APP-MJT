<template>
  <AppCard>
    <AppCardText>
      <div class="master-filter-row">
        <div class="master-filter-row__search">
          <AppTextField
            :model-value="search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            @update:model-value="(v: string) => $emit('update:search', v)"
          />
        </div>
        <div v-if="$slots.filters" class="master-filter-row__filters">
          <slot name="filters" />
        </div>
      </div>
    </AppCardText>

    <AppDataTable
      v-model:items-per-page="pageSizeModel"
      v-model:page="pageModel"
      :headers="headers"
      :items="items"
      :items-length="itemsLength"
      :loading="loading"
      :item-label="itemLabel"
      :row-border-color="rowBorderColor"
      item-value="id"
      @update:options="$emit('update:options', $event)"
    >
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps ?? {}" />
      </template>
    </AppDataTable>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppCard, AppCardText, AppTextField, AppDataTable } from '@/components/ui';

const props = withDefaults(
  defineProps<{
    headers: Record<string, unknown>[];
    items: Record<string, unknown>[];
    itemsLength: number;
    loading?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
    itemLabel?: string;
    rowBorderColor?: (item: Record<string, unknown>, index: number) => string | undefined;
  }>(),
  {
    loading: false,
    search: '',
    page: 1,
    pageSize: 10,
  }
);

const emit = defineEmits<{
  'update:options': [options: unknown];
  'update:search': [value: string];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const pageModel = computed({
  get: () => props.page,
  set: (v: number) => emit('update:page', v),
});

const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (v: number) => emit('update:pageSize', v),
});
</script>

<style scoped>
.master-filter-row {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  row-gap: 12px;
  gap: 12px;
}
.master-filter-row__search {
  flex: 0 0 240px;
  min-width: 200px;
}
.master-filter-row__filters {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}
.master-filter-row__filters > :deep(*) {
  flex: 0 0 auto;
  width: auto !important;
  min-width: 140px;
}
</style>
