<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Payroll Processing</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Payroll Run</AppBtn>
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

    <MasterFormDialog v-model="createDialog" title="New Payroll Run" :loading="creating" @submit="onCreate">
      <AppSelect v-model="form.periodType" :items="periodTypeOptions" label="Period Type" class="mb-2" />
      <AppSelect v-model="form.runType" :items="runTypeOptions" label="Run Type" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.periodStart" type="date" label="Period Start" class="mb-2 flex-1-1" />
        <AppTextField v-model="form.periodEnd" type="date" label="Period End" class="mb-2 flex-1-1" />
      </div>
    </MasterFormDialog>

    <AppDialog v-model="detailDialog" max-width="760">
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
              <thead><tr><th>Employee</th><th class="text-right">Gross</th><th class="text-right">Deductions</th><th class="text-right">Net Pay</th></tr></thead>
              <tbody>
                <tr v-for="line in detailTarget.lines" :key="line.id">
                  <td>{{ line.employee.name }}</td>
                  <td class="text-right">{{ formatCurrency(line.grossEarnings) }}</td>
                  <td class="text-right">{{ formatCurrency(line.totalDeductions) }}</td>
                  <td class="text-right font-weight-medium">{{ formatCurrency(line.netPay) }}</td>
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
          <AppBtn v-if="detailTarget.status === 'CALCULATED'" color="success" variant="flat" :loading="acting" @click="onVerify">Verify</AppBtn>
          <AppBtn v-if="detailTarget.status === 'VERIFIED'" color="success" variant="flat" :loading="acting" @click="onApprove">Approve</AppBtn>
          <AppBtn v-if="detailTarget.status === 'APPROVED'" color="success" variant="flat" :loading="acting" @click="onProcess">Mark Processed</AppBtn>
          <AppBtn v-if="detailTarget.status === 'PROCESSED'" color="success" variant="flat" :loading="acting" @click="onPay">Pay</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { usePayrollRunStore } from '@/stores/accounts/driverPayroll';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTable } from '@/components/ui';
import type { PayrollRun } from '@/types/phase5.types';

const store = usePayrollRunStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const statusOptions = ['DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED'];
const periodTypeOptions = ['MONTHLY', 'WEEKLY', 'DAILY_WAGE', 'CONTRACT'];
const runTypeOptions = ['REGULAR', 'FINAL_SETTLEMENT', 'EXIT'];

function statusColor(status: string) {
  return ({ PAID: 'success', PROCESSED: 'info', APPROVED: 'info', VERIFIED: 'warning', CALCULATED: 'warning', DRAFT: 'default', CANCELLED: 'default' } as Record<string, string>)[status] || 'info';
}
function formatDate(d: string) { return new Date(d).toLocaleDateString(); }

const headers = [
  { title: 'Run No.', key: 'runNumber', sortable: false },
  { title: 'Period Type', key: 'periodType', sortable: false },
  { title: 'Period', key: 'period', sortable: false },
  { title: 'Run Type', key: 'runType', sortable: false },
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
  runType: 'REGULAR',
  periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
});
function openCreateDialog() {
  Object.assign(form, {
    periodType: 'MONTHLY',
    runType: 'REGULAR',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
  });
  createDialog.value = true;
}
async function onCreate() {
  creating.value = true;
  try {
    await store.create({ periodType: form.periodType, runType: form.runType, periodStart: form.periodStart, periodEnd: form.periodEnd });
    success('Payroll run created');
    createDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create payroll run'));
  } finally {
    creating.value = false;
  }
}

const detailDialog = ref(false);
const detailTarget = ref<PayrollRun | null>(null);
const acting = ref(false);

async function openDetail(run: PayrollRun) {
  detailTarget.value = await store.getById(run.id);
  detailDialog.value = true;
}
async function onCalculate() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.calculate(detailTarget.value.id);
    success('Payroll run calculated');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to calculate'));
  } finally {
    acting.value = false;
  }
}
async function onVerify() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.verify(detailTarget.value.id);
    success('Payroll run verified');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to verify'));
  } finally {
    acting.value = false;
  }
}
async function onApprove() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.approve(detailTarget.value.id);
    success('Payroll run approved — salary Journal Voucher posted');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve'));
  } finally {
    acting.value = false;
  }
}
async function onProcess() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.process(detailTarget.value.id);
    success('Payroll run marked processed');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to process'));
  } finally {
    acting.value = false;
  }
}
async function onPay() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.pay(detailTarget.value.id);
    success('Payroll run paid — salary Payment Vouchers posted');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to pay'));
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
