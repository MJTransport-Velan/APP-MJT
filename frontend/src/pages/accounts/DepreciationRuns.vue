<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Depreciation Processing</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Depreciation Run</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.period="{ item }">{{ formatDate((item as any).periodStart) }} - {{ formatDate((item as any).periodEnd) }}</template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" @click="openDetail(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="createDialog" title="New Depreciation Run" :loading="creating" @submit="onCreate">
      <AppSelect v-model="form.periodType" :items="periodTypeOptions" label="Period Type" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.periodStart" type="date" label="Period Start" class="mb-2 flex-1-1" />
        <AppTextField v-model="form.periodEnd" type="date" label="Period End" class="mb-2 flex-1-1" />
      </div>
    </MasterFormDialog>

    <AppDialog v-model="detailDialog" max-width="800">
      <AppCard v-if="detailTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ detailTarget.runNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="detailDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-3">
            <AppChip size="small" :color="statusColor(detailTarget.status)">{{ detailTarget.status }}</AppChip>
            <span class="text-caption text-medium-emphasis">{{ formatDate(detailTarget.periodStart) }} - {{ formatDate(detailTarget.periodEnd) }}</span>
          </div>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Asset</th><th>Category</th><th class="text-right">Opening</th><th class="text-right">Depreciation</th><th class="text-right">Closing</th></tr></thead>
              <tbody>
                <tr v-for="line in detailTarget.lines" :key="line.id">
                  <td>{{ line.asset.assetCode }} — {{ line.asset.assetName }}</td>
                  <td>{{ line.asset.category }}</td>
                  <td class="text-right">{{ formatCurrency(line.openingValue) }}</td>
                  <td class="text-right">{{ formatCurrency(line.depreciationAmount) }}</td>
                  <td class="text-right font-weight-medium">{{ formatCurrency(line.closingValue) }}</td>
                </tr>
              </tbody>
            </AppTable>
          </div>
          <p v-if="detailTarget.lines.length === 0" class="text-caption text-medium-emphasis pa-4">Not yet calculated.</p>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn v-if="detailTarget.status === 'DRAFT'" color="primary" variant="flat" :loading="acting" @click="onCalculate">Calculate</AppBtn>
          <AppBtn v-if="detailTarget.status === 'CALCULATED'" color="primary" variant="flat" :loading="acting" @click="onCalculate">Recalculate</AppBtn>
          <AppBtn v-if="detailTarget.status === 'CALCULATED'" color="success" variant="flat" :loading="acting" @click="onApprove">Approve & Post</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useDepreciationRunStore } from '@/stores/accounts/vehicleAssets';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTable } from '@/components/ui';
import type { DepreciationRun } from '@/types/phase6.types';

const store = useDepreciationRunStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const statusOptions = ['DRAFT', 'CALCULATED', 'APPROVED'];
const periodTypeOptions = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

function statusColor(status: string) {
  return ({ APPROVED: 'success', CALCULATED: 'warning', DRAFT: 'default' } as Record<string, string>)[status] || 'info';
}
function formatDate(d: string) { return new Date(d).toLocaleDateString(); }

const headers = [
  { title: 'Run No.', key: 'runNumber', sortable: false },
  { title: 'Period Type', key: 'periodType', sortable: false },
  { title: 'Period', key: 'period', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, status: statusFilter.value || undefined });
}

const createDialog = ref(false);
const creating = ref(false);
const form = reactive({
  periodType: 'MONTHLY',
  periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
});
function openCreateDialog() {
  Object.assign(form, {
    periodType: 'MONTHLY',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
  });
  createDialog.value = true;
}
async function onCreate() {
  creating.value = true;
  try {
    await store.create(form);
    success('Depreciation run created');
    createDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create depreciation run'));
  } finally {
    creating.value = false;
  }
}

const detailDialog = ref(false);
const detailTarget = ref<DepreciationRun | null>(null);
const acting = ref(false);

async function openDetail(run: DepreciationRun) {
  detailTarget.value = await store.getById(run.id);
  detailDialog.value = true;
}
async function onCalculate() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.calculate(detailTarget.value.id);
    success('Depreciation run calculated');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to calculate'));
  } finally {
    acting.value = false;
  }
}
async function onApprove() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.approve(detailTarget.value.id);
    success('Depreciation run approved — Depreciation Voucher posted');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve'));
  } finally {
    acting.value = false;
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
