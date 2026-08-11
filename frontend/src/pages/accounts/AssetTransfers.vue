<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Asset Transfers</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openRequestDialog">Request Transfer</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="approvalStatusFilter" :items="approvalStatusOptions" label="Approval" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.asset="{ item }">{{ (item as any).asset.assetCode }} — {{ (item as any).asset.assetName }}</template>
      <template #item.fromDepartment="{ item }">{{ (item as any).fromDepartment?.name || '-' }}</template>
      <template #item.toDepartment="{ item }">{{ (item as any).toDepartment?.name || '-' }}</template>
      <template #item.transferDate="{ item }">{{ new Date((item as any).transferDate).toLocaleDateString() }}</template>
      <template #item.approvalStatus="{ item }"><AppChip size="small" :color="approvalColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
      <template #item.actions="{ item }">
        <template v-if="(item as any).approvalStatus === 'PENDING'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="requestDialog" title="Request Asset Transfer" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.assetId" :items="assetOptions" item-title="assetCode" item-value="id" label="Asset" :error-messages="errors.assetId" class="mb-2" />
      <AppSelect v-model="form.transferType" :items="transferTypeOptions" label="Transfer Type" class="mb-2" />
      <AppSelect v-model="form.toDepartmentId" :items="departmentOptions" item-title="name" item-value="id" label="To Department" clearable class="mb-2" />
      <AppTextField v-model="form.transferDate" type="date" label="Transfer Date" class="mb-2" />
      <AppTextarea v-model="form.reason" label="Reason" rows="2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAssetTransferStore, useFixedAssetStore } from '@/stores/accounts/vehicleAssets';
import { useAdminDepartmentStore } from '@/stores/admin-department.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppTextarea, AppChip } from '@/components/ui';
import type { AssetTransfer } from '@/types/phase6.types';

const store = useAssetTransferStore();
const assetStore = useFixedAssetStore();
const departmentStore = useAdminDepartmentStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const approvalStatusFilter = ref<string | null>(null);
const approvalStatusOptions = ['PENDING', 'APPROVED', 'REJECTED'];
const transferTypeOptions = ['DEPARTMENT', 'CUSTODY', 'LOCATION'];
const assetOptions = ref<{ id: string; assetCode: string }[]>([]);
const departmentOptions = ref<{ id: string; name: string }[]>([]);

function approvalColor(status: string) {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' } as Record<string, string>)[status] || 'default';
}

const headers = [
  { title: 'Asset', key: 'asset', sortable: false },
  { title: 'Type', key: 'transferType', sortable: false },
  { title: 'From Dept', key: 'fromDepartment', sortable: false },
  { title: 'To Dept', key: 'toDepartment', sortable: false },
  { title: 'Date', key: 'transferDate', sortable: false },
  { title: 'Approval', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, approvalStatus: approvalStatusFilter.value || undefined });
}

const requestDialog = ref(false);
const submitting = ref(false);
const form = reactive({ assetId: '', transferType: 'DEPARTMENT', toDepartmentId: '', transferDate: new Date().toISOString().slice(0, 10), reason: '' });
const errors = reactive({ assetId: '' });

function openRequestDialog() {
  Object.assign(form, { assetId: '', transferType: 'DEPARTMENT', toDepartmentId: '', transferDate: new Date().toISOString().slice(0, 10), reason: '' });
  errors.assetId = '';
  requestDialog.value = true;
}

async function onSubmit() {
  errors.assetId = form.assetId ? '' : 'Asset is required';
  if (errors.assetId) return;
  submitting.value = true;
  try {
    await store.request({ ...form, toDepartmentId: form.toDepartmentId || undefined, reason: form.reason || undefined });
    success('Asset transfer requested');
    requestDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to request transfer'));
  } finally {
    submitting.value = false;
  }
}

async function onApprove(transfer: AssetTransfer) {
  try {
    await store.approve(transfer.id);
    success('Transfer approved');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve transfer'));
  }
}
async function onReject(transfer: AssetTransfer) {
  try {
    await store.reject(transfer.id);
    success('Transfer rejected');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject transfer'));
  }
}

onMounted(async () => {
  await Promise.all([assetStore.fetchList({ pageSize: 200, status: 'ACTIVE' }), departmentStore.fetchList({ pageSize: 200 })]);
  assetOptions.value = assetStore.items.map((a) => ({ id: a.id, assetCode: `${a.assetCode} — ${a.assetName}` }));
  departmentOptions.value = departmentStore.items.map((d: any) => ({ id: d.id, name: d.name }));
  fetchData();
});
</script>
