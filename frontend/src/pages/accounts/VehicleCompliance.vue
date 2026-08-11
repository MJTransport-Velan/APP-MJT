<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Compliance</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Record Renewal</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="typeFilter" :items="complianceTypeOptions" label="Type" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
      <template #item.complianceType="{ item }"><AppChip size="small" variant="outlined">{{ (item as any).complianceType }}</AppChip></template>
      <template #item.expiryDate="{ item }">
        <span :class="isExpiringSoon((item as any).expiryDate) ? 'text-error font-weight-medium' : ''">{{ new Date((item as any).expiryDate).toLocaleDateString() }}</span>
      </template>
      <template #item.premiumOrFeeAmount="{ item }">{{ (item as any).premiumOrFeeAmount ? formatCurrency((item as any).premiumOrFeeAmount) : '-' }}</template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn v-if="(item as any).complianceType === 'INSURANCE' && (item as any).status === 'ACTIVE'" icon="mdi-file-document-alert-outline" variant="text" size="small" @click="openClaimDialog(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" title="Record Compliance Renewal" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppSelect v-model="form.complianceType" :items="complianceTypeOptions" label="Type" class="mb-2" />
      <AppTextField v-model="form.documentNumber" label="Document / Policy Number" :error-messages="errors.documentNumber" class="mb-2" />
      <AppTextField v-model="form.issuerName" label="Issuer" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.issueDate" type="date" label="Issue Date" class="mb-2 flex-1-1" />
        <AppTextField v-model="form.expiryDate" type="date" label="Expiry Date" class="mb-2 flex-1-1" />
      </div>
      <AppTextField v-model.number="form.premiumOrFeeAmount" type="number" label="Premium / Fee Amount" class="mb-2" />
      <AppSelect v-model="form.fundAccountType" :items="['BANK', 'CASH']" label="Paid Via" clearable class="mb-2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="claimDialog" title="File Insurance Claim" :loading="filingClaim" @submit="onFileClaim">
      <AppTextField v-model="claimForm.claimNumber" label="Claim Number" :error-messages="claimErrors.claimNumber" class="mb-2" />
      <AppTextField v-model="claimForm.claimDate" type="date" label="Claim Date" class="mb-2" />
      <AppTextField v-model.number="claimForm.claimAmount" type="number" label="Claim Amount" :error-messages="claimErrors.claimAmount" class="mb-2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVehicleComplianceStore } from '@/stores/accounts/vehicleAssets';
import { useVehicleStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip } from '@/components/ui';
import type { VehicleComplianceRecord } from '@/types/phase6.types';

const store = useVehicleComplianceStore();
const vehicleStore = useVehicleStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const typeFilter = ref<string | null>(null);
const complianceTypeOptions = ['INSURANCE', 'PERMIT', 'FITNESS', 'ROAD_TAX', 'POLLUTION'];
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);

function statusColor(status: string) {
  return ({ ACTIVE: 'success', EXPIRED: 'error', RENEWED: 'default' } as Record<string, string>)[status] || 'info';
}
function isExpiringSoon(expiryDate: string) {
  const days = (new Date(expiryDate).getTime() - Date.now()) / 86400000;
  return days <= 30;
}

const headers = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Type', key: 'complianceType', sortable: false },
  { title: 'Document No.', key: 'documentNumber', sortable: false },
  { title: 'Expiry', key: 'expiryDate', sortable: false },
  { title: 'Premium/Fee', key: 'premiumOrFeeAmount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, complianceType: typeFilter.value || undefined });
}

const dialog = ref(false);
const submitting = ref(false);
const form = reactive({
  vehicleId: '', complianceType: 'INSURANCE', documentNumber: '', issuerName: '',
  issueDate: new Date().toISOString().slice(0, 10), expiryDate: new Date().toISOString().slice(0, 10),
  premiumOrFeeAmount: undefined as number | undefined, fundAccountType: undefined as string | undefined,
});
const errors = reactive({ vehicleId: '', documentNumber: '' });

function openCreateDialog() {
  Object.assign(form, {
    vehicleId: '', complianceType: 'INSURANCE', documentNumber: '', issuerName: '',
    issueDate: new Date().toISOString().slice(0, 10), expiryDate: new Date().toISOString().slice(0, 10),
    premiumOrFeeAmount: undefined, fundAccountType: undefined,
  });
  Object.assign(errors, { vehicleId: '', documentNumber: '' });
  dialog.value = true;
}

async function onSubmit() {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.documentNumber = form.documentNumber ? '' : 'Document number is required';
  if (errors.vehicleId || errors.documentNumber) return;
  submitting.value = true;
  try {
    await store.create({ ...form, issuerName: form.issuerName || undefined });
    success('Compliance record created');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record compliance renewal'));
  } finally {
    submitting.value = false;
  }
}

const claimDialog = ref(false);
const filingClaim = ref(false);
const claimTarget = ref<VehicleComplianceRecord | null>(null);
const claimForm = reactive({ claimNumber: '', claimDate: new Date().toISOString().slice(0, 10), claimAmount: undefined as number | undefined });
const claimErrors = reactive({ claimNumber: '', claimAmount: '' });

function openClaimDialog(record: VehicleComplianceRecord) {
  claimTarget.value = record;
  Object.assign(claimForm, { claimNumber: '', claimDate: new Date().toISOString().slice(0, 10), claimAmount: undefined });
  Object.assign(claimErrors, { claimNumber: '', claimAmount: '' });
  claimDialog.value = true;
}

async function onFileClaim() {
  if (!claimTarget.value) return;
  claimErrors.claimNumber = claimForm.claimNumber ? '' : 'Claim number is required';
  claimErrors.claimAmount = claimForm.claimAmount && claimForm.claimAmount > 0 ? '' : 'Claim amount must be greater than 0';
  if (claimErrors.claimNumber || claimErrors.claimAmount) return;
  filingClaim.value = true;
  try {
    await store.fileClaim(claimTarget.value.id, claimForm);
    success('Insurance claim filed');
    claimDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to file claim'));
  } finally {
    filingClaim.value = false;
  }
}

onMounted(async () => {
  await vehicleStore.fetchList({ pageSize: 200 });
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  fetchData();
});
</script>
