<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Asset Disposals</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openRaiseDialog">Raise Disposal</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="approvalStatusFilter" :items="approvalStatusOptions" label="Approval" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.asset="{ item }">{{ (item as any).asset.assetCode }} — {{ (item as any).asset.assetName }}</template>
      <template #item.disposalType="{ item }"><AppChip size="small" variant="outlined">{{ (item as any).disposalType }}</AppChip></template>
      <template #item.saleValue="{ item }">{{ (item as any).saleValue ? formatCurrency((item as any).saleValue) : '-' }}</template>
      <template #item.gainLossAmount="{ item }">
        <span :class="(item as any).gainLossAmount >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency((item as any).gainLossAmount) }}</span>
      </template>
      <template #item.approvalStatus="{ item }"><AppChip size="small" :color="approvalColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
      <template #item.actions="{ item }">
        <template v-if="(item as any).approvalStatus === 'PENDING'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="openApproveDialog(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="raiseDialog" title="Raise Asset Disposal" :loading="submitting" @submit="onRaise">
      <AppSelect v-model="form.assetId" :items="assetOptions" item-title="assetCode" item-value="id" label="Asset" :error-messages="errors.assetId" class="mb-2" />
      <AppSelect v-model="form.disposalType" :items="disposalTypeOptions" label="Disposal Type" class="mb-2" />
      <AppTextField v-model="form.disposalDate" type="date" label="Disposal Date" class="mb-2" />
      <AppTextField v-model.number="form.saleValue" type="number" label="Sale Value / Amount Recovered" class="mb-2" />
      <AppTextField v-model="form.buyerDetails" label="Buyer Details" class="mb-2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="approveDialog" title="Approve Disposal" :loading="approving" @submit="onApprove">
      <p class="text-caption text-medium-emphasis mb-3">Posts the disposal Voucher (Sale → Asset Sale Voucher; others → Journal).</p>
      <AppSelect v-if="approveTarget?.saleValue" v-model="approveForm.fundAccountType" :items="['BANK', 'CASH']" label="Fund Account Type" clearable class="mb-2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAssetDisposalStore, useFixedAssetStore } from '@/stores/accounts/vehicleAssets';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip } from '@/components/ui';
import type { AssetDisposal } from '@/types/phase6.types';

const store = useAssetDisposalStore();
const assetStore = useFixedAssetStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const approvalStatusFilter = ref<string | null>(null);
const approvalStatusOptions = ['PENDING', 'APPROVED', 'REJECTED'];
const disposalTypeOptions = ['SALE', 'SCRAP', 'WRITE_OFF', 'THEFT', 'ACCIDENT_TOTAL_LOSS', 'DONATION'];
const assetOptions = ref<{ id: string; assetCode: string }[]>([]);

function approvalColor(status: string) {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' } as Record<string, string>)[status] || 'default';
}

const headers = [
  { title: 'Asset', key: 'asset', sortable: false },
  { title: 'Type', key: 'disposalType', sortable: false },
  { title: 'Sale Value', key: 'saleValue', sortable: false },
  { title: 'Gain/Loss', key: 'gainLossAmount', sortable: false },
  { title: 'Approval', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, approvalStatus: approvalStatusFilter.value || undefined });
}

const raiseDialog = ref(false);
const submitting = ref(false);
const form = reactive({ assetId: '', disposalType: 'SALE', disposalDate: new Date().toISOString().slice(0, 10), saleValue: undefined as number | undefined, buyerDetails: '' });
const errors = reactive({ assetId: '' });

function openRaiseDialog() {
  Object.assign(form, { assetId: '', disposalType: 'SALE', disposalDate: new Date().toISOString().slice(0, 10), saleValue: undefined, buyerDetails: '' });
  errors.assetId = '';
  raiseDialog.value = true;
}

async function onRaise() {
  errors.assetId = form.assetId ? '' : 'Asset is required';
  if (errors.assetId) return;
  submitting.value = true;
  try {
    await store.raise({ ...form, buyerDetails: form.buyerDetails || undefined });
    success('Asset disposal raised');
    raiseDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to raise disposal'));
  } finally {
    submitting.value = false;
  }
}

const approveDialog = ref(false);
const approving = ref(false);
const approveTarget = ref<AssetDisposal | null>(null);
const approveForm = reactive({ fundAccountType: undefined as string | undefined });
function openApproveDialog(disposal: AssetDisposal) {
  approveTarget.value = disposal;
  approveForm.fundAccountType = undefined;
  approveDialog.value = true;
}
async function onApprove() {
  if (!approveTarget.value) return;
  approving.value = true;
  try {
    await store.approve(approveTarget.value.id, { fundAccountType: approveForm.fundAccountType });
    success('Disposal approved and posted');
    approveDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve disposal'));
  } finally {
    approving.value = false;
  }
}

async function onReject(disposal: AssetDisposal) {
  try {
    await store.reject(disposal.id);
    success('Disposal rejected');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject disposal'));
  }
}

onMounted(async () => {
  await assetStore.fetchList({ pageSize: 200, status: 'ACTIVE' });
  assetOptions.value = assetStore.items.map((a) => ({ id: a.id, assetCode: `${a.assetCode} — ${a.assetName}` }));
  fetchData();
});
</script>
