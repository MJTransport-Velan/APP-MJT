<template>
  <AppCard class="pa-4 mb-4">
    <div class="d-flex flex-wrap align-center justify-space-between mb-2 ga-2">
      <div>
        <div class="text-subtitle-2">{{ title }}</div>
        <p v-if="description" class="text-caption text-medium-emphasis mb-0">{{ description }}</p>
      </div>
      <div class="d-flex align-center ga-2">
        <span class="text-caption text-medium-emphasis">Total</span>
        <span class="text-subtitle-2 font-weight-bold">{{ formatCurrency(total) }}</span>
        <AppBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" :disabled="locked" @click="emit('add')">
          {{ addLabel }}
        </AppBtn>
      </div>
    </div>

    <p v-if="entries.length === 0" class="text-caption text-medium-emphasis mb-0">{{ emptyText }}</p>

    <div v-else class="tblwrap">
      <AppTable density="compact">
        <thead>
          <tr>
            <th>{{ nameHeader }}</th>
            <th v-if="showReference">Reference</th>
            <th v-if="showClassification">Treated As</th>
            <th class="text-right">Opening Balance</th>
            <th>Status</th>
            <th>Source</th>
            <th>Remarks</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td>{{ entry.name }}</td>
            <td v-if="showReference">
              <span v-if="entry.referenceNumber">{{ entry.referenceNumber }}</span>
              <span v-else class="text-medium-emphasis">—</span>
              <div v-if="entry.referenceDate" class="text-caption text-medium-emphasis">
                {{ formatDate(entry.referenceDate) }}
              </div>
            </td>
            <td v-if="showClassification">
              <AppChip size="x-small" :color="classificationColor(entry.classification)">
                {{ classificationLabel(entry.classification) }}
              </AppChip>
            </td>
            <td class="text-right">{{ formatCurrency(entry.amount) }}</td>
            <td>
              <AppChip size="x-small" :color="statusColor(entry.status)">
                {{ MIGRATION_STATUS_LABELS[entry.status] }}
              </AppChip>
            </td>
            <td class="text-caption">{{ entry.source }}</td>
            <td class="text-caption">{{ entry.remarks || '—' }}</td>
            <td class="text-right text-no-wrap">
              <AppBtn
                v-if="showClassification"
                icon="mdi-swap-horizontal"
                variant="text"
                size="small"
                title="Reclassify between capital and owner loan"
                @click="emit('reclassify', entry)"
              />
              <AppBtn
                icon="mdi-check-decagram-outline"
                variant="text"
                size="small"
                :color="entry.status === 'CONFIRMED' ? 'success' : undefined"
                title="Mark confirmed"
                @click="emit('confirm', entry)"
              />
              <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="emit('edit', entry)" />
              <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" :disabled="locked" @click="emit('remove', entry)" />
            </td>
          </tr>
        </tbody>
      </AppTable>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
/**
 * One section of the Opening Balance & Migration screen — bank, cash,
 * receivables, payables, owner funds or a free-form adjustment. They differ
 * only in what the first column is called and whether a row carries a
 * classification, so they share this table rather than repeating it.
 */
import { computed } from 'vue';
import { formatCurrency, formatDate } from '@/utils/format';
import { AppCard, AppTable, AppChip, AppBtn } from '@/components/ui';
import {
  CLASSIFICATION_LABELS,
  MIGRATION_STATUS_LABELS,
  type OpeningBalanceEntry,
  type OpeningFundClassification,
  type MigrationRecordStatus,
} from '@/types/openingBalance.types';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    entries: OpeningBalanceEntry[];
    addLabel?: string;
    nameHeader?: string;
    emptyText?: string;
    locked?: boolean;
    showClassification?: boolean;
    showReference?: boolean;
  }>(),
  {
    description: '',
    addLabel: 'Add',
    nameHeader: 'Account',
    emptyText: 'Nothing recorded yet.',
    locked: false,
    showClassification: false,
    showReference: false,
  }
);

const emit = defineEmits<{
  add: [];
  edit: [entry: OpeningBalanceEntry];
  remove: [entry: OpeningBalanceEntry];
  reclassify: [entry: OpeningBalanceEntry];
  confirm: [entry: OpeningBalanceEntry];
}>();

const total = computed(() => props.entries.reduce((sum, e) => sum + e.amount, 0));

function statusColor(status: MigrationRecordStatus) {
  return ({ CONFIRMED: 'success', NEEDS_REVIEW: 'warning', UNVERIFIED: 'default', RECLASSIFIED: 'info' } as Record<string, string>)[status] || 'default';
}

function classificationLabel(classification: OpeningFundClassification | null) {
  return classification ? CLASSIFICATION_LABELS[classification] : CLASSIFICATION_LABELS.UNCLASSIFIED;
}

/** Undecided owner money is called out in warning colour — it is the one thing that stops the opening position reconciling. */
function classificationColor(classification: OpeningFundClassification | null) {
  return ({ CAPITAL: 'primary', OWNER_LOAN: 'warning', OTHER_LIABILITY: 'info', UNCLASSIFIED: 'error' } as Record<string, string>)[
    classification || 'UNCLASSIFIED'
  ];
}
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
