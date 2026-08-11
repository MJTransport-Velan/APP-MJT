<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Driver Loans</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openLoanDialog">Request Loan</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.driver="{ item }">{{ (item as any).driver.name }}</template>
      <template #item.principalAmount="{ item }">{{ formatCurrency((item as any).principalAmount) }}</template>
      <template #item.emiAmount="{ item }">{{ formatCurrency((item as any).emiAmount) }}</template>
      <template #item.outstandingPrincipal="{ item }">
        <span :class="(item as any).outstandingPrincipal > 0 ? 'text-error' : 'text-success'">{{ formatCurrency((item as any).outstandingPrincipal) }}</span>
      </template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" @click="openPreview(item as any)" />
        <template v-if="(item as any).status === 'PENDING_APPROVAL'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="loanDialog" title="Request Driver Loan" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" :error-messages="errors.driverId" class="mb-2" />
      <AppSelect v-model="form.loanType" :items="loanTypeOptions" label="Loan Type" class="mb-2" />
      <AppTextField v-model.number="form.principalAmount" type="number" label="Principal Amount" :error-messages="errors.principalAmount" class="mb-2" />
      <AppTextField v-model.number="form.tenureMonths" type="number" label="Tenure (months)" :error-messages="errors.tenureMonths" class="mb-2" />
    </MasterFormDialog>

    <AppDialog v-model="previewDialog" max-width="520">
      <AppCard v-if="previewTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ previewTarget.loanNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="previewDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-3">
            <AppChip size="small" :color="statusColor(previewTarget.status)">{{ previewTarget.status }}</AppChip>
            <span class="text-caption text-medium-emphasis">{{ previewTarget.driver.name }}</span>
          </div>
          <div class="row row-dense mb-3">
            <div class="col-6 text-body-2">Principal</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.principalAmount) }}</div>
            <div class="col-6 text-body-2">EMI</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.emiAmount) }} x {{ previewTarget.tenureMonths }}</div>
            <div class="col-6 text-subtitle-2 font-weight-bold">Outstanding</div>
            <div class="col-6 text-subtitle-2 font-weight-bold text-right text-error">{{ formatCurrency(previewTarget.outstandingPrincipal) }}</div>
          </div>
          <AppDivider class="mb-3" />
          <div class="text-subtitle-2 mb-2">Installment Schedule</div>
          <AppTable density="compact">
            <thead><tr><th>#</th><th>Due Date</th><th class="text-right">EMI</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="i in previewTarget.installments" :key="i.id">
                <td>{{ i.installmentNo }}</td>
                <td>{{ new Date(i.dueDate).toLocaleDateString() }}</td>
                <td class="text-right">{{ formatCurrency(i.emiAmount) }}</td>
                <td><AppChip size="x-small" :color="i.status === 'RECOVERED' ? 'success' : i.status === 'WAIVED' ? 'default' : 'warning'">{{ i.status }}</AppChip></td>
              </tr>
            </tbody>
          </AppTable>
        </AppCardText>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useDriverLoanStore } from '@/stores/accounts/driverPayroll';
import { driverApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText, AppDivider, AppTable } from '@/components/ui';
import type { DriverLoan } from '@/types/phase5.types';

const store = useDriverLoanStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const statusOptions = ['PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'REJECTED', 'WRITTEN_OFF'];
const loanTypeOptions = ['PERSONAL', 'EMERGENCY', 'VEHICLE', 'FESTIVAL', 'MEDICAL'];
const driverOptions = ref<{ id: string; name: string }[]>([]);

function statusColor(status: string) {
  return ({ ACTIVE: 'info', CLOSED: 'success', REJECTED: 'default', WRITTEN_OFF: 'default', PENDING_APPROVAL: 'warning' } as Record<string, string>)[status] || 'info';
}

const headers = [
  { title: 'Loan No.', key: 'loanNumber', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Type', key: 'loanType', sortable: false },
  { title: 'Principal', key: 'principalAmount', sortable: false },
  { title: 'EMI', key: 'emiAmount', sortable: false },
  { title: 'Outstanding', key: 'outstandingPrincipal', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, status: statusFilter.value || undefined });
}

const loanDialog = ref(false);
const submitting = ref(false);
const form = reactive({ driverId: '', loanType: 'PERSONAL', principalAmount: undefined as number | undefined, tenureMonths: 12 });
const errors = reactive({ driverId: '', principalAmount: '', tenureMonths: '' });
function openLoanDialog() {
  Object.assign(form, { driverId: '', loanType: 'PERSONAL', principalAmount: undefined, tenureMonths: 12 });
  Object.assign(errors, { driverId: '', principalAmount: '', tenureMonths: '' });
  loanDialog.value = true;
}
async function onSubmit() {
  errors.driverId = form.driverId ? '' : 'Driver is required';
  errors.principalAmount = form.principalAmount && form.principalAmount > 0 ? '' : 'Principal must be greater than 0';
  errors.tenureMonths = form.tenureMonths && form.tenureMonths > 0 ? '' : 'Tenure must be at least 1 month';
  if (errors.driverId || errors.principalAmount || errors.tenureMonths) return;
  submitting.value = true;
  try {
    await store.request({ driverId: form.driverId, loanType: form.loanType, principalAmount: form.principalAmount, tenureMonths: form.tenureMonths });
    success('Driver loan requested');
    loanDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to request loan'));
  } finally {
    submitting.value = false;
  }
}

const previewDialog = ref(false);
const previewTarget = ref<DriverLoan | null>(null);
function openPreview(loan: DriverLoan) {
  previewTarget.value = loan;
  previewDialog.value = true;
}

async function onApprove(loan: DriverLoan) {
  try {
    await store.approve(loan.id);
    success('Loan approved and disbursed');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve loan'));
  }
}
async function onReject(loan: DriverLoan) {
  try {
    await store.reject(loan.id);
    success('Loan rejected');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject loan'));
  }
}

onMounted(async () => {
  const driversRes = await driverApi.list({ pageSize: 200 });
  driverOptions.value = driversRes.data.data.map((d: any) => ({ id: d.id, name: `${d.name} (${d.code})` }));
  fetchData();
});
</script>
