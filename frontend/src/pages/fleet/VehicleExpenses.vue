<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Expenses</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Record Expense</AppBtn>
    </div>

    <div class="row mb-2">
      <div v-for="card in summaryCards" :key="card.label" class="col-12 col-sm-6 col-md-3">
        <ExpenseSummaryCard :label="card.label" :value="card.value" :icon="card.icon" :color="card.color" />
      </div>
    </div>

    <AppCard class="mb-4 pa-4">
      <div class="row row-dense">
        <div class="col-6 col-sm-3">
          <AppSelect v-model="categoryFilter" :items="categoryOptions" label="Category" clearable @update:model-value="fetchData" />
        </div>
        <div class="col-6 col-sm-3">
          <AppSelect v-model="vehicleFilter" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" clearable @update:model-value="fetchData" />
        </div>
        <div class="col-6 col-sm-3">
          <AppSelect v-model="approvalStatusFilter" :items="approvalStatusOptions" label="Approval Status" clearable @update:model-value="fetchData" />
        </div>
      </div>
    </AppCard>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :page="page"
      :page-size="pageSize"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    >
      <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
      <template #item.category="{ item }">
        <AppChip size="small" variant="outlined">{{ (item as any).category }}</AppChip>
      </template>
      <template #item.amount="{ item }">{{ formatCurrency((item as any).totalAmount ?? (item as any).amount) }}</template>
      <template #item.expenseDate="{ item }">{{ new Date((item as any).expenseDate).toLocaleDateString() }}</template>
      <template #item.approvalStatus="{ item }">
        <AppChip size="small" :color="approvalStatusColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip>
      </template>
      <template #item.actions="{ item }">
        <template v-if="(item as any).approvalStatus === 'PENDING'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="openApproveDialog(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
        </template>
        <AppBtn icon="mdi-file-upload-outline" variant="text" size="small" @click="openBillDialog(item as any)" />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" title="Record Expense" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppSelect v-model="form.category" :items="categoryOptions" label="Category" :error-messages="errors.category" class="mb-2" />
      <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
      <AppTextField v-model="form.expenseDate" type="date" label="Expense Date" class="mb-2" />
      <AppSelect v-model="form.paymentModeId" :items="paymentModeOptions" item-title="name" item-value="id" label="Payment Mode" clearable class="mb-2" />
      <AppTextarea v-model="form.description" label="Description" rows="2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="approveDialog" title="Approve Expense" :loading="approving" @submit="onApprove">
      <AppSelect v-model="approveForm.settleVia" :items="settleViaOptions" label="Settle Via" class="mb-2" />
      <AppSelect
        v-if="approveForm.settleVia === 'FUND_ACCOUNT'"
        v-model="approveForm.fundAccountType"
        :items="['BANK', 'CASH']"
        label="Fund Account Type"
        clearable
        class="mb-2"
      />
    </MasterFormDialog>

    <AppDialog v-model="billDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Upload Bill</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="billFile" label="Bill Document" accept="image/*,application/pdf" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="billDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="uploadingBill" @click="submitBill">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Expense"
      message="Delete this expense record? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useVehicleExpenseStore, useFleetDashboardStore } from '@/stores/fleet';
import { vehicleExpenseApi } from '@/services/fleet';
import { useVehicleStore, usePaymentModeStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ExpenseSummaryCard from '@/components/fleet/ExpenseSummaryCard.vue';
import {
  AppBtn,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppChip,
  AppDialog,
  AppTextField,
  AppTextarea,
  AppSelect,
  AppFileInput,
} from '@/components/ui';

const store = useVehicleExpenseStore();
const dashboardStore = useFleetDashboardStore();
const vehicleStore = useVehicleStore();
const paymentModeStore = usePaymentModeStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const categoryFilter = ref<string | null>(null);
const vehicleFilter = ref<string | null>(null);
const approvalStatusFilter = ref<string | null>(null);

const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const paymentModeOptions = ref<{ id: string; name: string }[]>([]);
// Phase 12 — Vehicle Assets, Loans & Expense Management (docs Phase 6)
// extends the original five categories additively.
const categoryOptions = [
  'FUEL', 'MAINTENANCE', 'REPAIR', 'SERVICE', 'TYRE', 'BATTERY', 'INSURANCE', 'PERMIT', 'FITNESS',
  'ROAD_TAX', 'FASTTAG', 'ADBLUE', 'ACCESSORIES', 'GREASE_LUBRICANTS', 'BREAKDOWN', 'MISCELLANEOUS',
];

const headers = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Date', key: 'expenseDate', sortable: false },
  { title: 'Approval', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const approvalStatusOptions = ['PENDING', 'APPROVED', 'REJECTED'];
const settleViaOptions = ['FUND_ACCOUNT', 'SUPPLIER'];
function approvalStatusColor(status: string) {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' } as Record<string, string>)[status] || 'default';
}

const summaryCards = computed(() => {
  const byCategory = dashboardStore.summary?.costSummary.byCategory || [];
  const total = byCategory.reduce((sum, c) => sum + Number(c.total), 0);
  return [
    { label: 'Monthly Total', value: formatCurrency(total), icon: 'mdi-cash-multiple', color: 'primary' },
    {
      label: 'Fuel',
      value: formatCurrency(dashboardStore.summary?.costSummary.fuelCost || 0),
      icon: 'mdi-gas-station-outline',
      color: 'info',
    },
    {
      label: 'Maintenance',
      value: formatCurrency(dashboardStore.summary?.costSummary.maintenanceCost || 0),
      icon: 'mdi-wrench-outline',
      color: 'warning',
    },
    {
      label: 'Other Categories',
      value: formatCurrency(
        byCategory
          .filter((c) => c.category !== 'FUEL' && c.category !== 'MAINTENANCE')
          .reduce((sum, c) => sum + Number(c.total), 0)
      ),
      icon: 'mdi-receipt-text-outline',
      color: 'secondary',
    },
  ];
});

function onPageUpdate(v: number) {
  page.value = v;
  fetchData();
}
function onPageSizeUpdate(v: number) {
  pageSize.value = v;
  fetchData();
}
async function fetchData() {
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    category: categoryFilter.value || undefined,
    vehicleId: vehicleFilter.value || undefined,
    approvalStatus: approvalStatusFilter.value || undefined,
  });
}

const dialog = ref(false);
const submitting = ref(false);
const form = reactive<{
  vehicleId: string;
  category: string;
  amount: number | undefined;
  expenseDate: string;
  paymentModeId: string;
  description: string;
}>({
  vehicleId: '',
  category: 'MISCELLANEOUS',
  amount: undefined,
  expenseDate: new Date().toISOString().substring(0, 10),
  paymentModeId: '',
  description: '',
});
const errors = reactive({ vehicleId: '', category: '', amount: '' });

function openCreateDialog() {
  Object.assign(form, {
    vehicleId: '',
    category: 'MISCELLANEOUS',
    amount: undefined,
    expenseDate: new Date().toISOString().substring(0, 10),
    paymentModeId: '',
    description: '',
  });
  Object.assign(errors, { vehicleId: '', category: '', amount: '' });
  dialog.value = true;
}

function validateForm(): boolean {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.category = form.category ? '' : 'Category is required';
  errors.amount = !form.amount || form.amount <= 0 ? 'Amount must be greater than 0' : '';
  return !errors.vehicleId && !errors.category && !errors.amount;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({
      vehicleId: form.vehicleId,
      category: form.category,
      amount: form.amount,
      expenseDate: form.expenseDate,
      paymentModeId: form.paymentModeId || undefined,
      description: form.description || undefined,
    });
    success('Expense recorded');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record expense'));
  } finally {
    submitting.value = false;
  }
}

const billDialog = ref(false);
const billTarget = ref<any>(null);
const billFile = ref<File[]>([]);
const uploadingBill = ref(false);

function openBillDialog(expense: any) {
  billTarget.value = expense;
  billFile.value = [];
  billDialog.value = true;
}

async function submitBill() {
  if (!billTarget.value || !billFile.value[0]) {
    error('Please select a file to upload');
    return;
  }
  uploadingBill.value = true;
  try {
    await vehicleExpenseApi.uploadBill(billTarget.value.id, billFile.value[0]);
    success('Bill uploaded');
    billDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload bill'));
  } finally {
    uploadingBill.value = false;
  }
}

const approveDialog = ref(false);
const approving = ref(false);
const approveTarget = ref<any>(null);
// Settles through the bank by default — that is where these payments actually
// go, and defaulting to cash would draw down a balance that never moved.
const approveForm = reactive({ settleVia: 'FUND_ACCOUNT', fundAccountType: 'BANK' as string | undefined });

function openApproveDialog(expense: any) {
  approveTarget.value = expense;
  Object.assign(approveForm, { settleVia: 'FUND_ACCOUNT', fundAccountType: 'BANK' });
  approveDialog.value = true;
}

async function onApprove() {
  if (!approveTarget.value) return;
  approving.value = true;
  try {
    await store.approve(approveTarget.value.id, { settleVia: approveForm.settleVia, fundAccountType: approveForm.fundAccountType || undefined });
    success('Expense approved and posted');
    approveDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve expense'));
  } finally {
    approving.value = false;
  }
}

async function onReject(expense: any) {
  try {
    await store.reject(expense.id);
    success('Expense rejected');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject expense'));
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(expense: any) {
  deleteTarget.value = expense;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Expense deleted');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete expense'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    vehicleStore.fetchList({ pageSize: 200 }),
    paymentModeStore.fetchList({ pageSize: 200 }),
    dashboardStore.fetchSummary(),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  paymentModeOptions.value = paymentModeStore.items.map((p: any) => ({ id: p.id, name: p.name }));
  fetchData();
});
</script>
