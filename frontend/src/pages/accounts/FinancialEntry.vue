<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6">Financial Entries</h2>
        <div class="text-body-2 text-medium-emphasis">Where did the money come from, where is it now, and what was it for.</div>
      </div>
      <AppBtn color="primary" prepend-icon="mdi-cash-fast" @click="openCreateDialog">Record Financial Entry</AppBtn>
    </div>

    <div class="fe-stats-grid mb-4">
      <ProfitCard label="Money In" :value="dashboard?.moneyIn || 0" color="success" icon="mdi-arrow-down-bold-circle-outline" />
      <ProfitCard label="Money Out" :value="dashboard?.moneyOut || 0" color="error" icon="mdi-arrow-up-bold-circle-outline" />
      <ProfitCard label="Cash Available" :value="dashboard?.cashAvailable || 0" icon="mdi-cash" color-by-value />
      <ProfitCard label="Bank Available" :value="dashboard?.bankAvailable || 0" icon="mdi-bank-outline" color-by-value />
      <ProfitCard label="Customer Outstanding" :value="dashboard?.customerOutstanding || 0" icon="mdi-account-cash-outline" />
      <ProfitCard label="Supplier Outstanding" :value="dashboard?.supplierOutstanding || 0" icon="mdi-truck-outline" />
    </div>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :page="page"
      :page-size="pageSize"
      @update:page="(v) => { page = v; fetchEntries(); }"
      @update:page-size="(v) => { pageSize = v; fetchEntries(); }"
    >
      <template #filters>
        <AppSelect v-model="entryTypeFilter" :items="entryTypeOptions" item-title="label" item-value="value" label="Type" clearable density="compact" hide-details style="min-width: 200px" @update:model-value="fetchEntries" />
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details style="min-width: 160px" @update:model-value="fetchEntries" />
      </template>
      <template #item.entryDate="{ item }">{{ formatDate((item as any).entryDate) }}</template>
      <template #item.entryType="{ item }"><AppChip size="small" variant="tonal">{{ entryTypeLabel((item as any).entryType) }}</AppChip></template>
      <template #item.flow="{ item }">
        <div class="text-body-2">{{ (item as any).source.label }} <AppIcon icon="mdi-arrow-right" size="small" /> {{ (item as any).destination.label }}</div>
      </template>
      <template #item.amount="{ item }">{{ formatCurrency(Number((item as any).amount)) }}</template>
      <template #item.appliedTo="{ item }">
        <AppBtn
          v-if="(item as any).appliedTo?.length > 1"
          variant="text"
          size="small"
          prepend-icon="mdi-format-list-bulleted-square"
          @click="openSplitDialog(item as any)"
        >Split {{ (item as any).appliedTo.length }} ways</AppBtn>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #item.purpose="{ item }">{{ purposeLabel((item as any).purpose) }}</template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status.replace('_', ' ') }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn v-if="!['CANCELLED', 'REVERSED'].includes((item as any).status)" icon="mdi-close-circle-outline" variant="text" size="small" color="error" title="Cancel" @click="openCancelDialog(item as any)" />
        <AppBtn v-if="!['CANCELLED', 'REVERSED'].includes((item as any).status)" icon="mdi-undo-variant" variant="text" size="small" title="Reverse" @click="onReverse(item as any)" />
      </template>
    </MasterDataTable>

    <!-- Record Financial Entry -->
    <MasterFormDialog v-model="createDialog" title="Record Financial Entry" :loading="submitting" max-width="760" @submit="onSubmit">
      <div class="fe-section">
        <div class="fe-section__title">What happened?</div>
        <AppSelect v-model="form.entryType" :items="entryTypeOptions" item-title="label" item-value="value" label="Entry Type" :error-messages="errors.entryType" class="mb-2" />
      </div>

      <div class="fe-section">
        <div class="fe-section__title">Where did the money come from?</div>
        <div class="d-flex ga-2 mb-2">
          <AppSelect v-model="form.sourceType" :items="partyTypeOptions" item-title="label" item-value="value" label="Source Type" class="flex-1" />
          <template v-if="isEntityBacked(form.sourceType)">
            <AppSelect v-model="form.sourceId" :items="entityOptions(form.sourceType)" item-title="name" item-value="id" label="Source" :error-messages="errors.source" class="flex-1" />
          </template>
          <template v-else>
            <AppTextField v-model="form.sourceLabel" label="Source Name" :error-messages="errors.source" class="flex-1" />
          </template>
        </div>
      </div>

      <div class="fe-section">
        <div class="fe-section__title">Where did the money go?</div>
        <div class="d-flex ga-2 mb-2">
          <AppSelect v-model="form.destinationType" :items="partyTypeOptions" item-title="label" item-value="value" label="Destination Type" class="flex-1" />
          <template v-if="isEntityBacked(form.destinationType)">
            <AppSelect v-model="form.destinationId" :items="entityOptions(form.destinationType)" item-title="name" item-value="id" label="Destination" :error-messages="errors.destination" class="flex-1" />
          </template>
          <template v-else>
            <AppTextField v-model="form.destinationLabel" label="Destination Name" :error-messages="errors.destination" class="flex-1" />
          </template>
        </div>
      </div>

      <div class="fe-section">
        <div class="fe-section__title">Amount</div>
        <div class="d-flex ga-2 mb-2">
          <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="flex-1" />
          <AppSelect v-model="form.paymentModeId" :items="paymentModeOptions" item-title="name" item-value="id" label="Payment Mode" clearable class="flex-1" />
        </div>
        <div class="d-flex ga-2 mb-2">
          <AppTextField v-model="form.entryDate" type="date" label="Transaction Date" class="flex-1" />
          <AppTextField v-model="form.referenceNumber" label="Reference Number" clearable class="flex-1" />
        </div>
        <AppTextarea v-model="form.remarks" label="Remarks" rows="2" class="mb-2" />
      </div>

      <div class="fe-section">
        <div class="fe-section__title">What is it for?</div>
        <div class="d-flex ga-2">
          <AppSelect v-model="form.purpose" :items="purposeOptions" item-title="label" item-value="value" label="Purpose" class="flex-1" />
          <AppTextField v-model="form.purposeNotes" label="Notes (optional)" class="flex-1" />
        </div>
      </div>

      <!-- Fleet linkage — optional. Fuel also logs a real fuel-tank entry; Toll/FastTag also logs real toll usage against the vehicle's FastTag account. -->
      <div v-if="form.purpose === 'FUEL' || form.purpose === 'TOLL'" class="fe-section">
        <div class="fe-section__title">Vehicle (optional — keeps Fleet in sync too)</div>
        <div class="d-flex ga-2 mb-2">
          <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="name" item-value="id" label="Vehicle" clearable class="flex-1" />
          <AppSelect v-model="form.tripId" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip (optional)" clearable class="flex-1" />
        </div>
        <template v-if="form.purpose === 'FUEL' && form.vehicleId">
          <div class="d-flex ga-2 mb-2">
            <AppSelect v-model="form.fuelStationId" :items="fuelStationOptions" item-title="name" item-value="id" label="Fuel Station" clearable class="flex-1" />
            <AppTextField v-model.number="form.quantityLiters" type="number" label="Quantity (Liters)" class="flex-1" />
          </div>
          <div class="d-flex ga-2">
            <AppTextField v-model.number="form.ratePerLiter" type="number" label="Rate per Liter" class="flex-1" />
            <AppTextField v-model.number="form.odometerReading" type="number" label="Odometer Reading" class="flex-1" />
          </div>
          <div class="text-caption text-medium-emphasis mt-1">Fill all four to also log a Fuel Entry for this vehicle — otherwise this just posts as a plain fuel expense.</div>
        </template>
        <template v-else-if="form.purpose === 'TOLL' && form.vehicleId">
          <div class="text-caption text-medium-emphasis">If this vehicle has a FastTag account, the toll amount above will also be logged against it.</div>
        </template>
      </div>
    </MasterFormDialog>

    <!-- Cancel -->
    <MasterFormDialog v-model="cancelDialog" title="Cancel Financial Entry" :loading="cancelSubmitting" max-width="480" @submit="onCancel">
      <AppTextarea v-model="cancelReason" label="Reason for cancellation" rows="2" :error-messages="cancelError" />
    </MasterFormDialog>

    <!-- View Split (FIFO breakdown, read-only) -->
    <AppDialog v-model="splitDialog" max-width="560" persistent>
      <AppCard v-if="splitTarget">
        <AppCardTitle class="text-h6">How {{ splitTarget.entryNumber }} was applied</AppCardTitle>
        <AppCardText>
          <AppTable>
            <thead>
              <tr><th>Applied To</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in splitTarget.appliedTo" :key="idx">
                <td>{{ item.targetLabel }} <AppChip size="small" variant="tonal" class="ml-1">{{ item.targetType }}</AppChip></td>
                <td>{{ formatCurrency(Number(item.amount)) }}</td>
              </tr>
            </tbody>
          </AppTable>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="splitDialog = false">Close</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useFinancialEntryStore } from '@/stores/accounts/financialEntry';
import { adminCompanyApi } from '@/services/admin-company.service';
import { driverApi, supplierApi, employeeApi, vehicleApi, paymentModeApi, fuelStationApi } from '@/services/masters';
import { tripApi } from '@/services/operations';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import {
  AppBtn, AppSelect, AppTextField, AppTextarea, AppChip, AppIcon, AppDialog, AppCard,
  AppCardTitle, AppCardText, AppCardActions, AppTable,
} from '@/components/ui';
import type { FinancialEntry, FinancialPartyType, FinancialEntryType, FinancialEntryPurpose } from '@/types/financialEntry.types';

const store = useFinancialEntryStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const entryTypeOptions: { label: string; value: FinancialEntryType }[] = [
  { label: 'Money Received', value: 'MONEY_RECEIVED' },
  { label: 'Money Paid', value: 'MONEY_PAID' },
  { label: 'Money Transfer', value: 'MONEY_TRANSFER' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Advance Received', value: 'ADVANCE_RECEIVED' },
  { label: 'Advance Given', value: 'ADVANCE_GIVEN' },
  { label: 'Refund Received', value: 'REFUND_RECEIVED' },
  { label: 'Refund Paid', value: 'REFUND_PAID' },
  { label: 'Loan Received', value: 'LOAN_RECEIVED' },
  { label: 'Loan Repayment', value: 'LOAN_REPAYMENT' },
  { label: 'Salary / Settlement', value: 'SALARY_SETTLEMENT' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
];
function entryTypeLabel(v: string) {
  return entryTypeOptions.find((o) => o.value === v)?.label || v;
}

const partyTypeOptions: { label: string; value: FinancialPartyType }[] = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Supplier', value: 'SUPPLIER' },
  { label: 'Driver', value: 'DRIVER' },
  { label: 'Employee', value: 'EMPLOYEE' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Loan Provider', value: 'LOAN_PROVIDER' },
  { label: 'Vehicle', value: 'VEHICLE' },
  { label: 'Trip', value: 'TRIP' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Other', value: 'OTHER' },
];

const purposeOptions: { label: string; value: FinancialEntryPurpose }[] = [
  { label: 'Trip Advance', value: 'TRIP_ADVANCE' },
  { label: 'Trip Payment', value: 'TRIP_PAYMENT' },
  { label: 'Supplier Payment', value: 'SUPPLIER_PAYMENT' },
  { label: 'Driver Advance', value: 'DRIVER_ADVANCE' },
  { label: 'Salary', value: 'SALARY' },
  { label: 'Fuel', value: 'FUEL' },
  { label: 'Repair', value: 'REPAIR' },
  { label: 'Insurance', value: 'INSURANCE' },
  { label: 'Loan EMI', value: 'LOAN_EMI' },
  { label: 'Customer Refund', value: 'CUSTOMER_REFUND' },
  { label: 'Supplier Refund', value: 'SUPPLIER_REFUND' },
  { label: 'Office Expense', value: 'OFFICE_EXPENSE' },
  { label: 'Toll / FastTag', value: 'TOLL' },
  { label: 'Other', value: 'OTHER' },
];
function purposeLabel(v: string) {
  return purposeOptions.find((o) => o.value === v)?.label || v;
}

const statusOptions = ['DRAFT', 'COMPLETED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'CANCELLED', 'REVERSED'];
function statusColor(status: string) {
  return (
    ({
      COMPLETED: 'success',
      FULLY_ALLOCATED: 'success',
      PARTIALLY_ALLOCATED: 'warning',
      DRAFT: 'default',
      CANCELLED: 'error',
      REVERSED: 'default',
    }) as Record<string, string>
  )[status] || 'info';
}

const ENTITY_BACKED: FinancialPartyType[] = ['CUSTOMER', 'SUPPLIER', 'DRIVER', 'EMPLOYEE', 'BANK', 'CASH', 'VEHICLE'];
function isEntityBacked(type: FinancialPartyType) {
  return ENTITY_BACKED.includes(type);
}

const companyOptions = ref<{ id: string; name: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);
const driverOptions = ref<{ id: string; name: string }[]>([]);
const employeeOptions = ref<{ id: string; name: string }[]>([]);
const vehicleOptions = ref<{ id: string; name: string }[]>([]);
const paymentModeOptions = ref<{ id: string; name: string }[]>([]);
const tripOptions = ref<{ id: string; tripNumber: string }[]>([]);
const fuelStationOptions = ref<{ id: string; name: string }[]>([]);

const bankOptions = computed(() => bankAccountStore.items.map((b: any) => ({ id: b.id, name: `${b.accountHolderName} (${b.accountNumber})` })));
const cashOptions = computed(() => cashAccountStore.items.map((c: any) => ({ id: c.id, name: c.ledger?.name || c.cashAccountType })));

function entityOptions(type: FinancialPartyType) {
  switch (type) {
    case 'CUSTOMER': return companyOptions.value;
    case 'SUPPLIER': return supplierOptions.value;
    case 'DRIVER': return driverOptions.value;
    case 'EMPLOYEE': return employeeOptions.value;
    case 'BANK': return bankOptions.value;
    case 'CASH': return cashOptions.value;
    case 'VEHICLE': return vehicleOptions.value;
    default: return [];
  }
}

const page = ref(1);
const pageSize = ref(10);
const entryTypeFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

const headers = [
  { title: 'Entry No.', key: 'entryNumber', sortable: false },
  { title: 'Date', key: 'entryDate', sortable: false },
  { title: 'Type', key: 'entryType', sortable: false },
  { title: 'From → To', key: 'flow', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Applied To', key: 'appliedTo', sortable: false },
  { title: 'Purpose', key: 'purpose', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

async function fetchEntries() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, entryType: entryTypeFilter.value || undefined, status: statusFilter.value || undefined });
}

const dashboard = computed(() => store.dashboard);

const createDialog = ref(false);
const submitting = ref(false);
const form = reactive({
  entryType: 'MONEY_RECEIVED' as FinancialEntryType,
  sourceType: 'CUSTOMER' as FinancialPartyType,
  sourceId: '',
  sourceLabel: '',
  destinationType: 'CASH' as FinancialPartyType,
  destinationId: '',
  destinationLabel: '',
  amount: undefined as number | undefined,
  paymentModeId: '',
  entryDate: new Date().toISOString().slice(0, 10),
  referenceNumber: '',
  remarks: '',
  purpose: 'OTHER' as FinancialEntryPurpose,
  purposeNotes: '',
  vehicleId: '',
  tripId: '',
  fuelStationId: '',
  quantityLiters: undefined as number | undefined,
  ratePerLiter: undefined as number | undefined,
  odometerReading: undefined as number | undefined,
});
const errors = reactive({ entryType: '', source: '', destination: '', amount: '' });
function clearErrors() {
  errors.entryType = '';
  errors.source = '';
  errors.destination = '';
  errors.amount = '';
}

function openCreateDialog() {
  Object.assign(form, {
    entryType: 'MONEY_RECEIVED',
    sourceType: 'CUSTOMER',
    sourceId: '',
    sourceLabel: '',
    destinationType: 'CASH',
    destinationId: '',
    destinationLabel: '',
    amount: undefined,
    paymentModeId: '',
    entryDate: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    remarks: '',
    purpose: 'OTHER',
    purposeNotes: '',
    vehicleId: '',
    tripId: '',
    fuelStationId: '',
    quantityLiters: undefined,
    ratePerLiter: undefined,
    odometerReading: undefined,
  });
  clearErrors();
  createDialog.value = true;
}

async function onSubmit() {
  clearErrors();
  errors.amount = form.amount && form.amount > 0 ? '' : 'Amount must be greater than 0';
  errors.source = isEntityBacked(form.sourceType) ? (form.sourceId ? '' : 'A source must be selected') : (form.sourceLabel.trim() ? '' : 'A source name is required');
  errors.destination = isEntityBacked(form.destinationType) ? (form.destinationId ? '' : 'A destination must be selected') : (form.destinationLabel.trim() ? '' : 'A destination name is required');
  if (errors.amount || errors.source || errors.destination) return;

  submitting.value = true;
  try {
    await store.create({
      entryType: form.entryType,
      entryDate: form.entryDate,
      sourceType: form.sourceType,
      sourceId: isEntityBacked(form.sourceType) ? form.sourceId || undefined : undefined,
      sourceLabel: isEntityBacked(form.sourceType) ? undefined : form.sourceLabel,
      destinationType: form.destinationType,
      destinationId: isEntityBacked(form.destinationType) ? form.destinationId || undefined : undefined,
      destinationLabel: isEntityBacked(form.destinationType) ? undefined : form.destinationLabel,
      amount: form.amount!,
      paymentModeId: form.paymentModeId || undefined,
      referenceNumber: form.referenceNumber || undefined,
      remarks: form.remarks || undefined,
      purpose: form.purpose,
      purposeNotes: form.purposeNotes || undefined,
      vehicleId: form.vehicleId || undefined,
      tripId: form.tripId || undefined,
      fuelStationId: form.fuelStationId || undefined,
      quantityLiters: form.quantityLiters || undefined,
      ratePerLiter: form.ratePerLiter || undefined,
      odometerReading: form.odometerReading || undefined,
    });
    success('Financial entry recorded');
    createDialog.value = false;
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record financial entry'));
  } finally {
    submitting.value = false;
  }
}

// --- Cancel / Reverse ---
const cancelDialog = ref(false);
const cancelSubmitting = ref(false);
const cancelReason = ref('');
const cancelError = ref('');
const cancelTarget = ref<FinancialEntry | null>(null);

function openCancelDialog(item: FinancialEntry) {
  cancelTarget.value = item;
  cancelReason.value = '';
  cancelError.value = '';
  cancelDialog.value = true;
}

async function onCancel() {
  if (!cancelTarget.value) return;
  cancelError.value = cancelReason.value.trim() ? '' : 'A reason is required';
  if (cancelError.value) return;
  cancelSubmitting.value = true;
  try {
    await store.cancel(cancelTarget.value.id, cancelReason.value);
    success('Financial entry cancelled');
    cancelDialog.value = false;
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to cancel'));
  } finally {
    cancelSubmitting.value = false;
  }
}

async function onReverse(item: FinancialEntry) {
  try {
    await store.reverse(item.id);
    success('Financial entry reversed');
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reverse — it may not be posted yet'));
  }
}

// --- View Split (read-only FIFO breakdown) ---
const splitDialog = ref(false);
const splitTarget = ref<FinancialEntry | null>(null);
function openSplitDialog(item: FinancialEntry) {
  splitTarget.value = item;
  splitDialog.value = true;
}

onMounted(async () => {
  const [companiesRes, suppliersRes, driversRes, employeesRes, vehiclesRes, paymentModesRes, tripsRes, fuelStationsRes] = await Promise.all([
    adminCompanyApi.list({ pageSize: 200 }),
    supplierApi.list({ pageSize: 200 }),
    driverApi.list({ pageSize: 200 }),
    employeeApi.list({ pageSize: 200 }),
    vehicleApi.list({ pageSize: 200 }),
    paymentModeApi.list({ pageSize: 50 }),
    tripApi.list({ pageSize: 200 }),
    fuelStationApi.list({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
  ]);
  companyOptions.value = (companiesRes.data.data as any[]).map((c) => ({ id: c.id, name: c.name }));
  supplierOptions.value = (suppliersRes.data.data as any[]).map((s) => ({ id: s.id, name: s.name }));
  driverOptions.value = (driversRes.data.data as any[]).map((d) => ({ id: d.id, name: `${d.name} (${d.code})` }));
  employeeOptions.value = (employeesRes.data.data as any[]).map((e) => ({ id: e.id, name: e.name }));
  vehicleOptions.value = (vehiclesRes.data.data as any[]).map((v) => ({ id: v.id, name: v.registrationNumber }));
  paymentModeOptions.value = (paymentModesRes.data.data as any[]).map((p) => ({ id: p.id, name: p.name }));
  tripOptions.value = (tripsRes.data.data as any[]).map((t) => ({ id: t.id, tripNumber: t.tripNumber }));
  fuelStationOptions.value = (fuelStationsRes.data.data as any[]).map((f) => ({ id: f.id, name: f.name }));
  fetchEntries();
  store.fetchDashboard();
});
</script>

<style scoped>
.fe-section {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);
}
.fe-section:last-child {
  border-bottom: none;
}
.fe-section__title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.65;
  margin-bottom: 8px;
}
.flex-1 {
  flex: 1;
}
.fe-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
</style>
