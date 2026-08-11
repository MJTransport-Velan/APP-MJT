<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Loans</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openRequestDialog">Request Loan</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
      <template #item.principalAmount="{ item }">{{ formatCurrency((item as any).principalAmount) }}</template>
      <template #item.emiAmount="{ item }">{{ formatCurrency((item as any).emiAmount) }}</template>
      <template #item.outstandingPrincipal="{ item }">
        <span :class="(item as any).outstandingPrincipal > 0 ? 'text-error' : 'text-success'">{{ formatCurrency((item as any).outstandingPrincipal) }}</span>
      </template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" @click="openDetail(item as any)" />
        <template v-if="(item as any).status === 'PENDING_APPROVAL'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="requestDialog" title="Request Vehicle Loan" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppSelect v-model="form.lenderType" :items="lenderTypeOptions" label="Lender Type" class="mb-2" />
      <AppTextField v-model="form.lenderName" label="Lender Name" :error-messages="errors.lenderName" class="mb-2" />
      <AppTextField v-model="form.loanAccountNumber" label="Loan Account Number" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model.number="form.principalAmount" type="number" label="Principal Amount" :error-messages="errors.principalAmount" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="form.interestRatePercent" type="number" label="Interest Rate %" class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model="form.disbursementDate" type="date" label="Disbursement Date" class="mb-2 flex-1-1" />
        <AppTextField v-model="form.emiStartDate" type="date" label="EMI Start Date" class="mb-2 flex-1-1" />
      </div>
      <AppTextField v-model.number="form.tenureMonths" type="number" label="Tenure (months)" :error-messages="errors.tenureMonths" class="mb-2" />
    </MasterFormDialog>

    <AppDialog v-model="detailDialog" max-width="720">
      <AppCard v-if="detailTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ detailTarget.loanNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="detailDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-3">
            <AppChip size="small" :color="statusColor(detailTarget.status)">{{ detailTarget.status }}</AppChip>
            <span class="text-caption text-medium-emphasis">{{ detailTarget.vehicle.registrationNumber }} — {{ detailTarget.lenderName }}</span>
          </div>
          <div class="row row-dense mb-3">
            <div class="col-6 text-body-2">Principal</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(detailTarget.principalAmount) }}</div>
            <div class="col-6 text-body-2">EMI</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(detailTarget.emiAmount) }} x {{ detailTarget.tenureMonths }}</div>
            <div class="col-6 text-subtitle-2 font-weight-bold">Outstanding</div>
            <div class="col-6 text-subtitle-2 font-weight-bold text-right text-error">{{ formatCurrency(detailTarget.outstandingPrincipal) }}</div>
          </div>
          <AppDivider class="mb-3" />
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-subtitle-2">EMI Schedule</span>
            <AppBtn v-if="detailTarget.status === 'ACTIVE'" size="small" variant="outlined" color="error" :loading="acting" @click="onForeclose">Foreclose</AppBtn>
          </div>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>#</th><th>Due Date</th><th class="text-right">Principal</th><th class="text-right">Interest</th><th class="text-right">EMI</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="i in detailTarget.installments" :key="i.id">
                  <td>{{ i.installmentNo }}</td>
                  <td>{{ new Date(i.dueDate).toLocaleDateString() }}</td>
                  <td class="text-right">{{ formatCurrency(i.principalComponent) }}</td>
                  <td class="text-right">{{ formatCurrency(i.interestComponent) }}</td>
                  <td class="text-right">{{ formatCurrency(i.emiAmount) }}</td>
                  <td><AppChip size="x-small" :color="i.status === 'PAID' ? 'success' : i.status === 'WAIVED' ? 'default' : 'warning'">{{ i.status }}</AppChip></td>
                  <td>
                    <AppBtn v-if="i.status === 'PENDING' || i.status === 'OVERDUE'" size="small" variant="text" color="primary" :loading="acting" @click="onPayInstallment(i.id)">Pay</AppBtn>
                  </td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </AppCardText>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVehicleLoanStore } from '@/stores/accounts/vehicleAssets';
import { useVehicleStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText, AppDivider, AppTable } from '@/components/ui';
import type { VehicleLoan } from '@/types/phase6.types';

const store = useVehicleLoanStore();
const vehicleStore = useVehicleStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const statusOptions = ['PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'FORECLOSED', 'REJECTED'];
const lenderTypeOptions = ['BANK', 'NBFC', 'PRIVATE_FINANCE', 'INTERNAL'];
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);

function statusColor(status: string) {
  return ({ ACTIVE: 'info', CLOSED: 'success', FORECLOSED: 'success', REJECTED: 'default', PENDING_APPROVAL: 'warning' } as Record<string, string>)[status] || 'info';
}

const headers = [
  { title: 'Loan No.', key: 'loanNumber', sortable: false },
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Lender', key: 'lenderName', sortable: false },
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

const requestDialog = ref(false);
const submitting = ref(false);
const form = reactive({
  vehicleId: '',
  lenderType: 'BANK',
  lenderName: '',
  loanAccountNumber: '',
  principalAmount: undefined as number | undefined,
  interestRatePercent: 10,
  disbursementDate: new Date().toISOString().slice(0, 10),
  emiStartDate: new Date().toISOString().slice(0, 10),
  tenureMonths: 36,
});
const errors = reactive({ vehicleId: '', lenderName: '', principalAmount: '', tenureMonths: '' });

function openRequestDialog() {
  Object.assign(form, {
    vehicleId: '', lenderType: 'BANK', lenderName: '', loanAccountNumber: '', principalAmount: undefined,
    interestRatePercent: 10, disbursementDate: new Date().toISOString().slice(0, 10), emiStartDate: new Date().toISOString().slice(0, 10), tenureMonths: 36,
  });
  Object.assign(errors, { vehicleId: '', lenderName: '', principalAmount: '', tenureMonths: '' });
  requestDialog.value = true;
}

async function onSubmit() {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.lenderName = form.lenderName ? '' : 'Lender name is required';
  errors.principalAmount = form.principalAmount && form.principalAmount > 0 ? '' : 'Principal must be greater than 0';
  errors.tenureMonths = form.tenureMonths && form.tenureMonths > 0 ? '' : 'Tenure must be at least 1 month';
  if (errors.vehicleId || errors.lenderName || errors.principalAmount || errors.tenureMonths) return;

  submitting.value = true;
  try {
    await store.request({ ...form, loanAccountNumber: form.loanAccountNumber || undefined });
    success('Vehicle loan requested');
    requestDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to request loan'));
  } finally {
    submitting.value = false;
  }
}

async function onApprove(loan: VehicleLoan) {
  try {
    await store.approve(loan.id);
    success('Loan approved — EMI schedule generated');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve loan'));
  }
}
async function onReject(loan: VehicleLoan) {
  try {
    await store.reject(loan.id);
    success('Loan rejected');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject loan'));
  }
}

const detailDialog = ref(false);
const detailTarget = ref<VehicleLoan | null>(null);
const acting = ref(false);

async function openDetail(loan: VehicleLoan) {
  detailTarget.value = await store.getById(loan.id);
  detailDialog.value = true;
}

async function onPayInstallment(installmentId: string) {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.payInstallment(detailTarget.value.id, installmentId);
    success('EMI paid');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to pay EMI'));
  } finally {
    acting.value = false;
  }
}

async function onForeclose() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.foreclose(detailTarget.value.id);
    success('Loan foreclosed');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to foreclose loan'));
  } finally {
    acting.value = false;
  }
}

onMounted(async () => {
  await vehicleStore.fetchList({ pageSize: 200 });
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  fetchData();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
