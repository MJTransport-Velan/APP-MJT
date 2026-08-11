<template>
  <AppCard class="pa-4">
    <h3 class="section-title">{{ title }}</h3>
    <AppList density="compact">
      <AppListItem v-for="row in rows" :key="row.label">
        <AppListItemTitle class="text-body-2">{{ row.label }}</AppListItemTitle>
        <template #append>
          <span class="text-body-2 font-weight-medium text-error">{{ formatCurrency(row.amount) }}</span>
        </template>
      </AppListItem>
    </AppList>
    <p v-if="rows.length === 0" class="text-caption text-medium-emphasis">Nothing outstanding.</p>
  </AppCard>
</template>

<script setup lang="ts">
import { formatCurrency } from '@/utils/format';
import { AppCard, AppList, AppListItem, AppListItemTitle } from '@/components/ui';

defineProps<{ title: string; rows: { label: string; amount: number }[] }>();
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}
</style>
