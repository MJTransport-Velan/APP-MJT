<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Trip Expenses</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Record Expense</AppBtn>
    </div>

    <ExpenseSummary :expenses="store.items" class="mb-4" />

    <AppCard class="mb-4 pa-4">
      <div class="row row-dense">
        <div class="col-6 col-sm-3">
          <AppSelect v-model="categoryFilter" :items="categoryOptions" label="Category" clearable @update:model-value="fetchData" />
        </div>
        <div class="col-6 col-sm-3">
          <AppSelect v-model="tripFilter" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip" clearable @update:model-value="fetchData" />
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
      <template #item.trip="{ item }">{{ (item as any).trip.tripNumber }}</template>
      <template #item.category="{ item }">
        <AppChip size="small" variant="outlined">{{ (item as any).category }}</AppChip>
      </template>
      <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
      <template #item.expenseDate="{ item }">{{ new Date((item as any).expenseDate).toLocaleDateString() }}</template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-file-upload-outline" variant="text" size="small" @click="openBillDialog(item as any)" />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" title="Record Trip Expense" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.tripId" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip" :error-messages="errors.tripId" class="mb-2" />
      <AppSelect v-model="form.category" :items="categoryOptions" label="Category" :error-messages="errors.category" class="mb-2" />
      <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
      <AppTextField v-model="form.expenseDate" type="date" label="Expense Date" class="mb-2" />
      <AppTextarea v-model="form.description" label="Description" rows="2" />
    </MasterFormDialog>

    <AppDialog v-model="billDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Upload Bill</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="billFile" label="Bill Document" accept="image/*,application/pdf" multiple />
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
      message="Delete this trip expense? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useTripExpenseStore } from '@/stores/operations';
import { tripApi, tripExpenseApi } from '@/services/operations';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ExpenseSummary from '@/components/operations/ExpenseSummary.vue';
import {
  AppBtn,
  AppCard,
  AppSelect,
  AppChip,
  AppTextField,
  AppTextarea,
  AppDialog,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppFileInput,
} from '@/components/ui';
import type { Trip } from '@/types/operations.types';

const store = useTripExpenseStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const categoryFilter = ref<string | null>(null);
const tripFilter = ref<string | null>(null);
const tripOptions = ref<Trip[]>([]);

const categoryOptions = ['FUEL', 'DRIVER_BATA', 'TOLL', 'LOADING', 'UNLOADING', 'MISCELLANEOUS'];

const headers = [
  { title: 'Trip', key: 'trip', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Date', key: 'expenseDate', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

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
    tripId: tripFilter.value || undefined,
  });
}

const dialog = ref(false);
const submitting = ref(false);
const form = reactive<{ tripId: string; category: string; amount: number | undefined; expenseDate: string; description: string }>({
  tripId: '',
  category: 'MISCELLANEOUS',
  amount: undefined,
  expenseDate: new Date().toISOString().substring(0, 10),
  description: '',
});
const errors = reactive({ tripId: '', category: '', amount: '' });

function openCreateDialog() {
  Object.assign(form, {
    tripId: '',
    category: 'MISCELLANEOUS',
    amount: undefined,
    expenseDate: new Date().toISOString().substring(0, 10),
    description: '',
  });
  Object.assign(errors, { tripId: '', category: '', amount: '' });
  dialog.value = true;
}

function validateForm(): boolean {
  errors.tripId = form.tripId ? '' : 'Trip is required';
  errors.category = form.category ? '' : 'Category is required';
  errors.amount = !form.amount || form.amount <= 0 ? 'Amount must be greater than 0' : '';
  return !errors.tripId && !errors.category && !errors.amount;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({
      tripId: form.tripId,
      category: form.category,
      amount: form.amount,
      expenseDate: form.expenseDate,
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
    await tripExpenseApi.uploadBill(billTarget.value.id, billFile.value[0]);
    success('Bill uploaded');
    billDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload bill'));
  } finally {
    uploadingBill.value = false;
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
  const tripsRes = await tripApi.list({ pageSize: 200 });
  tripOptions.value = tripsRes.data.data;
  fetchData();
});
</script>
