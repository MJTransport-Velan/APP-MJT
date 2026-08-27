<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Asset Register</h2>
      <div class="d-flex ga-2">
        <AppBtn color="primary" prepend-icon="mdi-plus" @click="openRegisterDialog">Register Asset</AppBtn>
      </div>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="originFilter" :items="originOptions" item-title="label" item-value="value" label="Origin" clearable density="compact" hide-details @update:model-value="fetchData" />
        <AppSelect v-model="assetTypeFilter" :items="assetTypeOptions" item-title="label" item-value="value" label="Asset Type" clearable density="compact" hide-details @update:model-value="fetchData" />
        <AppSelect v-model="approvalStatusFilter" :items="approvalStatusOptions" label="Approval" clearable density="compact" hide-details @update:model-value="fetchData" />
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.category="{ item }">{{ (item as any).category.name }}</template>
      <template #item.assetOrigin="{ item }">
        <AppChip size="x-small" variant="outlined" :color="(item as any).assetOrigin === 'OPENING' ? 'info' : 'default'">
          {{ (item as any).assetOrigin === 'OPENING' ? 'Opening' : 'New' }}
        </AppChip>
      </template>
      <template #item.vehicle="{ item }">{{ (item as any).vehicle?.registrationNumber || '-' }}</template>
      <template #item.purchaseValue="{ item }">{{ formatCurrency((item as any).purchaseValue) }}</template>
      <template #item.accumulatedDepreciation="{ item }">{{ formatCurrency((item as any).accumulatedDepreciation ?? 0) }}</template>
      <template #item.currentValue="{ item }">{{ formatCurrency((item as any).currentValue) }}</template>
      <template #item.approvalStatus="{ item }"><AppChip size="small" :color="approvalColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
      <template #item.status="{ item }"><AppChip size="small" variant="outlined">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-chart-box-outline" variant="text" size="small" @click="openCostSummary(item as any)" />
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item as any)" />
        <template v-if="(item as any).approvalStatus === 'PENDING'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="openApproveDialog(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject(item as any)" />
        </template>
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="onDelete(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="formDialog" :title="editTarget ? 'Edit Fixed Asset' : 'Register Fixed Asset'" :loading="submitting" @submit="onSubmit">
      <AppSelect
        v-if="!editTarget"
        v-model="form.assetOrigin"
        :items="originOptions"
        item-title="label"
        item-value="value"
        label="Asset Origin"
        class="mb-2"
      />
      <!--
        An opening asset was bought long before this system existed, often
        paid for in a way nobody can now reconstruct — so it is registered at
        its book value with no payment recorded at all, and no bank or cash
        balance moves.
      -->
      <AppAlert v-if="isOpeningForm" type="info" variant="tonal" density="compact" class="mb-3">
        Carried over from the old system. Nothing is paid for it here — no bank or cash balance changes.
      </AppAlert>
      <AppTextField v-model="form.assetName" label="Asset Name" :error-messages="errors.assetName" class="mb-2" />
      <AppSelect v-model="form.categoryId" :items="categoryOptions" item-title="name" item-value="id" label="Asset Category" :error-messages="errors.categoryId" class="mb-2" />
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle (if a vehicle asset)" clearable class="mb-2" />
      <AppSelect v-model="form.supplierId" :items="supplierOptions" item-title="name" item-value="id" label="Vendor / Supplier" clearable class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.purchaseDate" type="date" :label="isOpeningForm ? 'Original Purchase Date' : 'Purchase Date'" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="form.purchaseValue" type="number" :label="isOpeningForm ? 'Original Cost' : 'Purchase Value'" :error-messages="errors.purchaseValue" :disabled="purchaseValueLocked" :hint="purchaseValueLocked ? 'Locked — the purchase was already approved and funded' : undefined" persistent-hint class="mb-2 flex-1-1" />
      </div>
      <template v-if="isOpeningForm">
        <div class="d-flex ga-2">
          <AppTextField v-model.number="form.accumulatedDepreciation" type="number" label="Accumulated Depreciation" class="mb-2 flex-1-1" />
          <AppTextField :model-value="openingBookValue" type="number" label="Opening Book Value" readonly hint="Original cost − accumulated depreciation" persistent-hint class="mb-2 flex-1-1" />
        </div>
        <div class="d-flex ga-2">
          <AppTextField v-model="form.openingDate" type="date" label="Opening Date" class="mb-2 flex-1-1" />
          <AppTextField v-model="form.migrationSource" label="Source" class="mb-2 flex-1-1" />
        </div>
        <AppSelect v-model="form.migrationStatus" :items="migrationStatusOptions" item-title="label" item-value="value" label="Migration Status" class="mb-2" />
      </template>
      <div v-if="editTarget" class="d-flex ga-2">
        <AppTextField v-model.number="form.currentValue" type="number" label="Current Value" class="mb-2 flex-1-1" />
        <AppSelect v-model="form.status" :items="statusOptions" label="Status" class="mb-2 flex-1-1" />
      </div>
      <AppTextField v-model="form.locationText" label="Location" class="mb-2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="approveDialog" title="Approve Asset Purchase" :loading="approving" @submit="onApprove">
      <p class="text-caption text-medium-emphasis mb-3">Funding lines must total {{ formatCurrency(approveTarget?.purchaseValue || 0) }}</p>
      <div v-for="(line, idx) in fundingLines" :key="idx" class="d-flex ga-2 align-center mb-2">
        <AppSelect v-model="line.type" :items="fundingTypeOptions" label="Funding Type" density="compact" hide-details style="flex: 1" />
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
import { useFixedAssetStore, useAssetCategoryStore } from '@/stores/accounts/vehicleAssets';
import { fixedAssetApi } from '@/services/accounts/vehicleAssets';
import { useVehicleStore, useSupplierStore } from '@/stores/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText, AppAlert } from '@/components/ui';
import type { FixedAsset, VehicleCostSummary, FundingLine } from '@/types/phase6.types';

const store = useFixedAssetStore();
const categoryStore = useAssetCategoryStore();
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
const statusOptions = ['ACTIVE', 'WRITTEN_OFF'];
// Assets carried over from the old system and assets bought since are both
// real assets — the register keeps them apart without hiding either.
const originFilter = ref<string | null>(null);
const assetTypeFilter = ref<string | null>(null);
const originOptions = [
  { value: 'NEW_PURCHASE', label: 'New Purchase' },
  { value: 'OPENING', label: 'Opening / Existing' },
];
const assetTypeOptions = [
  { value: 'VEHICLE', label: 'Vehicles' },
  { value: 'OTHER', label: 'Other Assets' },
];
const migrationStatusOptions = [
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'CONFIRMED', label: 'Confirmed' },
];
const fundingTypeOptions = ['BANK', 'CASH', 'SUPPLIER'];

const categoryOptions = computed(() => categoryStore.items);
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);

function approvalColor(status: string) {
  return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' } as Record<string, string>)[status] || 'default';
}

const headers = [
  { title: 'Asset Code', key: 'assetCode', sortable: false },
  { title: 'Name', key: 'assetName', sortable: false },
  { title: 'Origin', key: 'assetOrigin', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Cost', key: 'purchaseValue', sortable: false },
  { title: 'Depreciation', key: 'accumulatedDepreciation', sortable: false },
  { title: 'Book Value', key: 'currentValue', sortable: false },
  { title: 'Approval', key: 'approvalStatus', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    approvalStatus: approvalStatusFilter.value || undefined,
    status: statusFilter.value || undefined,
    assetOrigin: originFilter.value || undefined,
    assetType: assetTypeFilter.value || undefined,
  });
}

const formDialog = ref(false);
const submitting = ref(false);
const editTarget = ref<FixedAsset | null>(null);
const form = reactive({
  assetName: '',
  categoryId: '',
  vehicleId: '',
  supplierId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseValue: undefined as number | undefined,
  currentValue: undefined as number | undefined,
  status: 'ACTIVE',
  locationText: '',
  assetOrigin: 'NEW_PURCHASE',
  accumulatedDepreciation: undefined as number | undefined,
  openingDate: new Date().toISOString().slice(0, 10),
  migrationSource: 'Tally Migration',
  migrationStatus: 'UNVERIFIED',
});
const errors = reactive({ assetName: '', categoryId: '', purchaseValue: '' });

// The backend refuses a purchase-value change once the purchase has been
// approved — the Bank/Cash balances were already adjusted for it.
// An opening asset was never funded through this system, so its figures
// stay correctable even though it is registered already-approved.
const purchaseValueLocked = computed(
  () => editTarget.value?.approvalStatus === 'APPROVED' && (editTarget.value as any)?.assetOrigin !== 'OPENING'
);
const isOpeningForm = computed(() => form.assetOrigin === 'OPENING' || (editTarget.value as any)?.assetOrigin === 'OPENING');
const openingBookValue = computed(() =>
  Math.max(Math.round(((form.purchaseValue || 0) - (form.accumulatedDepreciation || 0)) * 100) / 100, 0)
);

function resetForm() {
  Object.assign(form, {
    assetName: '',
    categoryId: '',
    vehicleId: '',
    supplierId: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseValue: undefined,
    currentValue: undefined,
    status: 'ACTIVE',
    locationText: '',
    assetOrigin: 'NEW_PURCHASE',
    accumulatedDepreciation: undefined,
    openingDate: new Date().toISOString().slice(0, 10),
    migrationSource: 'Tally Migration',
    migrationStatus: 'UNVERIFIED',
  });
  Object.assign(errors, { assetName: '', categoryId: '', purchaseValue: '' });
}

function openRegisterDialog() {
  editTarget.value = null;
  resetForm();
  formDialog.value = true;
}

function openEditDialog(asset: FixedAsset) {
  editTarget.value = asset;
  Object.assign(errors, { assetName: '', categoryId: '', purchaseValue: '' });
  Object.assign(form, {
    assetName: asset.assetName,
    categoryId: asset.category.id,
    vehicleId: asset.vehicle?.id || '',
    supplierId: asset.supplier?.id || '',
    purchaseDate: String(asset.purchaseDate).slice(0, 10),
    purchaseValue: Number(asset.purchaseValue),
    currentValue: Number(asset.currentValue),
    status: asset.status,
    locationText: asset.locationText || '',
    assetOrigin: (asset as any).assetOrigin || 'NEW_PURCHASE',
    accumulatedDepreciation: Number(asset.purchaseValue) - Number(asset.currentValue),
    openingDate: String((asset as any).openingDate || asset.purchaseDate).slice(0, 10),
    migrationSource: (asset as any).migrationSource || 'Tally Migration',
    migrationStatus: (asset as any).migrationStatus || 'UNVERIFIED',
  });
  formDialog.value = true;
}

async function onSubmit() {
  errors.assetName = form.assetName ? '' : 'Asset name is required';
  errors.categoryId = form.categoryId ? '' : 'Category is required';
  errors.purchaseValue = form.purchaseValue && form.purchaseValue > 0 ? '' : 'Purchase value must be greater than 0';
  if (errors.assetName || errors.categoryId || errors.purchaseValue) return;

  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.update(editTarget.value.id, {
        assetName: form.assetName,
        categoryId: form.categoryId,
        vehicleId: form.vehicleId || null,
        supplierId: form.supplierId || null,
        purchaseDate: form.purchaseDate,
        // Omitted when locked so the request never trips the server-side guard.
        purchaseValue: purchaseValueLocked.value ? undefined : form.purchaseValue,
        // For an opening asset the book value follows from the depreciation
        // the user typed, so the two can never disagree.
        currentValue: isOpeningForm.value ? openingBookValue.value : form.currentValue,
        status: form.status,
        locationText: form.locationText || null,
        openingDate: isOpeningForm.value ? form.openingDate : undefined,
        migrationSource: isOpeningForm.value ? form.migrationSource || null : undefined,
        migrationStatus: isOpeningForm.value ? form.migrationStatus : undefined,
      });
      success('Fixed asset updated');
    } else {
      await store.register({
        assetName: form.assetName,
        categoryId: form.categoryId,
        vehicleId: form.vehicleId || undefined,
        supplierId: form.supplierId || undefined,
        purchaseDate: form.purchaseDate,
        purchaseValue: form.purchaseValue,
        locationText: form.locationText || undefined,
        assetOrigin: form.assetOrigin,
        accumulatedDepreciation: isOpeningForm.value ? form.accumulatedDepreciation || 0 : undefined,
        openingDate: isOpeningForm.value ? form.openingDate : undefined,
        migrationSource: isOpeningForm.value ? form.migrationSource || undefined : undefined,
        migrationStatus: isOpeningForm.value ? form.migrationStatus : undefined,
      });
      success(isOpeningForm.value ? 'Opening asset registered — no payment was recorded' : 'Fixed asset registered');
    }
    formDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, editTarget.value ? 'Failed to update asset' : 'Failed to register asset'));
  } finally {
    submitting.value = false;
  }
}

interface FundingLineRow {
  type: 'BANK' | 'CASH' | 'SUPPLIER';
  amount: number;
  fundAccountKey?: string;
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
      return { type: 'SUPPLIER', amount: line.amount };
    });
    await store.approve(approveTarget.value.id, payload as unknown as Record<string, unknown>[]);
    success('Asset purchase approved');
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
