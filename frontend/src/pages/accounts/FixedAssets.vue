<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Asset Register</h2>
      <div class="d-flex ga-2">
        <AppBtn variant="outlined" prepend-icon="mdi-swap-horizontal" to="/accounts/asset-transfers">Transfers</AppBtn>
        <AppBtn variant="outlined" prepend-icon="mdi-trash-can-outline" to="/accounts/asset-disposals">Disposals</AppBtn>
        <AppBtn color="primary" prepend-icon="mdi-plus" @click="openRegisterDialog">Register Asset</AppBtn>
      </div>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="approvalStatusFilter" :items="approvalStatusOptions" label="Approval" clearable density="compact" hide-details @update:model-value="fetchData" />
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.category="{ item }">{{ (item as any).category.name }}</template>
      <template #item.vehicle="{ item }">{{ (item as any).vehicle?.registrationNumber || '-' }}</template>
      <template #item.purchaseValue="{ item }">{{ formatCurrency((item as any).purchaseValue) }}</template>
      <template #item.currentValue="{ item }">{{ formatCurrency((item as any).currentValue) }}</template>
      <template #item.approvalStatus="{ item }"><AppChip size="small" :color="approvalColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
      <template #item.status="{ item }"><AppChip size="small" variant="outlined">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-chart-box-outline" variant="text" size="small" @click="openCostSummary(item as any)" />
        <template v-if="(item as any).approvalStatus === 'PENDING'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="openApproveDialog(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
          <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="onDelete(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="registerDialog" title="Register Fixed Asset" :loading="submitting" @submit="onRegister">
      <AppTextField v-model="form.assetName" label="Asset Name" :error-messages="errors.assetName" class="mb-2" />
      <AppSelect v-model="form.categoryId" :items="categoryOptions" item-title="name" item-value="id" label="Asset Category" :error-messages="errors.categoryId" class="mb-2" />
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle (if a vehicle asset)" clearable class="mb-2" />
      <AppSelect v-model="form.supplierId" :items="supplierOptions" item-title="name" item-value="id" label="Vendor / Supplier" clearable class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.purchaseDate" type="date" label="Purchase Date" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="form.purchaseValue" type="number" label="Purchase Value" :error-messages="errors.purchaseValue" class="mb-2 flex-1-1" />
      </div>
      <AppTextField v-model="form.locationText" label="Location" class="mb-2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="approveDialog" title="Approve Asset Purchase" :loading="approving" @submit="onApprove">
      <p class="text-caption text-medium-emphasis mb-3">Funding lines must total {{ formatCurrency(approveTarget?.purchaseValue || 0) }}</p>
      <div v-for="(line, idx) in fundingLines" :key="idx" class="d-flex ga-2 align-center mb-2">
        <AppSelect v-model="line.type" :items="fundingTypeOptions" label="Funding Type" density="compact" hide-details style="flex: 1" />
        <AppSelect
          v-if="line.type === 'LOAN'"
          v-model="line.vehicleLoanId"
          :items="activeLoanOptions"
          item-title="loanNumber"
          item-value="id"
          label="Loan"
          density="compact"
          hide-details
          style="flex: 1"
        />
        <AppSelect
          v-if="line.type === 'BANK' || line.type === 'CASH'"
          v-model="line.fundAccountKey"
          :items="fundAccountOptions"
          item-title="label"
          item-value="key"
          label="Fund Account"
          density="compact"
          hide-details
          style="flex: 1"
        />
        <AppTextField v-model.number="line.amount" type="number" label="Amount" density="compact" hide-details style="flex: 1" />
        <AppBtn icon="mdi-close" variant="text" size="small" @click="fundingLines.splice(idx, 1)" />
      </div>
      <AppBtn variant="text" prepend-icon="mdi-plus" size="small" @click="fundingLines.push({ type: 'BANK', amount: 0 })">Add Funding Line</AppBtn>
    </MasterFormDialog>

    <AppDialog v-model="costDialog" max-width="600">
      <AppCard v-if="costSummary">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">Vehicle Cost Summary</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="costDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="row row-dense">
            <div class="col-6 text-body-2">Purchase Cost</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(costSummary.purchaseCost) }}</div>
            <div class="col-6 text-body-2">Loan Principal Repaid</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(costSummary.loanPrincipalRepaid) }}</div>
            <div class="col-6 text-body-2">Loan Interest Paid</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(costSummary.loanInterestPaid) }}</div>
            <div class="col-6 text-body-2">Depreciation to Date</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(costSummary.depreciationToDate) }}</div>
            <div class="col-6 text-body-2">Vehicle Expenses</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(costSummary.totalExpenses) }}</div>
            <div class="col-6 text-body-2">Driver Cost</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(costSummary.driverCost) }}</div>
            <div class="col-6 text-subtitle-2 font-weight-bold">Total Cost</div>
            <div class="col-6 text-subtitle-2 font-weight-bold text-right">{{ formatCurrency(costSummary.totalCost) }}</div>
            <div class="col-6 text-body-2 text-success">Trip Revenue</div>
            <div class="col-6 text-body-2 text-right text-success">{{ formatCurrency(costSummary.tripRevenue) }}</div>
          </div>
        </AppCardText>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useFixedAssetStore, useAssetCategoryStore, useVehicleLoanStore } from '@/stores/accounts/vehicleAssets';
import { fixedAssetApi } from '@/services/accounts/vehicleAssets';
import { useVehicleStore, useSupplierStore } from '@/stores/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText } from '@/components/ui';
import type { FixedAsset, VehicleCostSummary, FundingLine } from '@/types/phase6.types';

const store = useFixedAssetStore();
const categoryStore = useAssetCategoryStore();
const loanStore = useVehicleLoanStore();
const vehicleStore = useVehicleStore();
const supplierStore = useSupplierStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const approvalStatusFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const approvalStatusOptions = ['PENDING', 'APPROVED', 'REJECTED'];
const statusOptions = ['ACTIVE', 'UNDER_TRANSFER', 'DISPOSED', 'WRITTEN_OFF'];
const fundingTypeOptions = ['BANK', 'CASH', 'LOAN', 'SUPPLIER'];

const categoryOptions = computed(() => categoryStore.items);
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);
const activeLoanOptions = computed(() => loanStore.items.filter((l) => l.status === 'ACTIVE'));

function approvalColor(status: string) {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' } as Record<string, string>)[status] || 'default';
}

const headers = [
  { title: 'Asset Code', key: 'assetCode', sortable: false },
  { title: 'Name', key: 'assetName', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Purchase Value', key: 'purchaseValue', sortable: false },
  { title: 'Current Value', key: 'currentValue', sortable: false },
  { title: 'Approval', key: 'approvalStatus', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, approvalStatus: approvalStatusFilter.value || undefined, status: statusFilter.value || undefined });
}

const registerDialog = ref(false);
const submitting = ref(false);
const form = reactive({
  assetName: '',
  categoryId: '',
  vehicleId: '',
  supplierId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseValue: undefined as number | undefined,
  locationText: '',
});
const errors = reactive({ assetName: '', categoryId: '', purchaseValue: '' });

function openRegisterDialog() {
  Object.assign(form, { assetName: '', categoryId: '', vehicleId: '', supplierId: '', purchaseDate: new Date().toISOString().slice(0, 10), purchaseValue: undefined, locationText: '' });
  Object.assign(errors, { assetName: '', categoryId: '', purchaseValue: '' });
  registerDialog.value = true;
}

async function onRegister() {
  errors.assetName = form.assetName ? '' : 'Asset name is required';
  errors.categoryId = form.categoryId ? '' : 'Category is required';
  errors.purchaseValue = form.purchaseValue && form.purchaseValue > 0 ? '' : 'Purchase value must be greater than 0';
  if (errors.assetName || errors.categoryId || errors.purchaseValue) return;

  submitting.value = true;
  try {
    await store.register({
      assetName: form.assetName,
      categoryId: form.categoryId,
      vehicleId: form.vehicleId || undefined,
      supplierId: form.supplierId || undefined,
      purchaseDate: form.purchaseDate,
      purchaseValue: form.purchaseValue,
      locationText: form.locationText || undefined,
    });
    success('Fixed asset registered');
    registerDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to register asset'));
  } finally {
    submitting.value = false;
  }
}

interface FundingLineRow {
  type: 'BANK' | 'CASH' | 'LOAN' | 'SUPPLIER';
  amount: number;
  fundAccountKey?: string;
  vehicleLoanId?: string;
}

const approveDialog = ref(false);
const approving = ref(false);
const approveTarget = ref<FixedAsset | null>(null);
const fundingLines = ref<FundingLineRow[]>([]);

const bankAccountOptions = computed(() => bankAccountStore.items.map((b: any) => ({ id: b.id, label: `${b.accountHolderName} (${b.accountNumber})` })));
const cashAccountOptions = computed(() => cashAccountStore.items.map((c: any) => ({ id: c.id, label: c.ledger?.name || c.cashAccountType })));
const fundAccountOptions = computed(() => [
  ...bankAccountOptions.value.map((b) => ({ key: `BANK:${b.id}`, label: `Bank — ${b.label}` })),
  ...cashAccountOptions.value.map((c) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.label}` })),
]);

function openApproveDialog(asset: FixedAsset) {
  approveTarget.value = asset;
  fundingLines.value = [{ type: 'BANK', amount: Number(asset.purchaseValue) }];
  approveDialog.value = true;
}

async function onApprove() {
  if (!approveTarget.value) return;
  approving.value = true;
  try {
    const payload: FundingLine[] = fundingLines.value.map((line) => {
      if (line.type === 'BANK' || line.type === 'CASH') {
        const [, fundAccountId] = line.fundAccountKey ? line.fundAccountKey.split(':') : [undefined, undefined];
        return { type: line.type, amount: line.amount, fundAccountId };
      }
      if (line.type === 'LOAN') return { type: 'LOAN', amount: line.amount, vehicleLoanId: line.vehicleLoanId };
      return { type: 'SUPPLIER', amount: line.amount };
    });
    await store.approve(approveTarget.value.id, payload as unknown as Record<string, unknown>[]);
    success('Asset purchase approved and posted');
    approveDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve asset purchase'));
  } finally {
    approving.value = false;
  }
}

async function onReject(asset: FixedAsset) {
  try {
    await store.reject(asset.id);
    success('Asset rejected');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject asset'));
  }
}

async function onDelete(asset: FixedAsset) {
  try {
    await store.remove(asset.id);
    success('Asset deleted');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete asset'));
  }
}

const costDialog = ref(false);
const costSummary = ref<VehicleCostSummary | null>(null);
async function openCostSummary(asset: FixedAsset) {
  try {
    const response = await fixedAssetApi.costSummary(asset.id);
    costSummary.value = response.data.data;
    costDialog.value = true;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load cost summary'));
  }
}

onMounted(async () => {
  await Promise.all([
    categoryStore.fetchList(),
    loanStore.fetchList({ pageSize: 200 }),
    vehicleStore.fetchList({ pageSize: 200 }),
    supplierStore.fetchList({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200 }),
    cashAccountStore.fetchList({ pageSize: 200 }),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  supplierOptions.value = supplierStore.items.map((s: any) => ({ id: s.id, name: s.name }));
  fetchData();
});
</script>
