<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Loans &amp; EMI</h2>
        <p class="text-caption text-medium-emphasis mb-0">Vehicle, bank, business and owner loans — their EMI schedules and payments</p>
      </div>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Add Loan</AppBtn>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="dashboard">Dashboard</AppTab>
      <AppTab value="loans">All Loans</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <!-- ------------------------------------------------ Dashboard -->
      <AppWindowItem value="dashboard">
        <div v-if="store.loading && !dashboard" class="d-flex justify-center py-8">
          <AppProgressCircular indeterminate color="primary" size="48" />
        </div>

        <template v-else-if="dashboard">
          <div class="row">
            <div class="col-12 col-sm-6 col-md-3">
              <AppCard class="pa-4">
                <div class="text-caption text-medium-emphasis">Active Loans</div>
                <div class="text-h6 font-weight-bold">{{ dashboard.stats.totalActiveLoans }}</div>
              </AppCard>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Loan Outstanding" :value="dashboard.stats.totalLoanOutstanding" icon="mdi-hand-coin-outline" color="warning" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="This Month EMI" :value="dashboard.stats.thisMonthEmi" icon="mdi-calendar-clock" color="primary" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Overdue EMI" :value="dashboard.stats.overdueEmiAmount" icon="mdi-alert-circle-outline" color="error" />
            </div>
          </div>

          <div class="row mt-1">
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="This Month Principal" :value="dashboard.stats.thisMonthPrincipal" icon="mdi-cash-minus" color="info" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="This Month Interest" :value="dashboard.stats.thisMonthInterest" icon="mdi-percent-outline" color="info" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <AppCard class="pa-4">
                <div class="text-caption text-medium-emphasis">Paid / Pending EMI</div>
                <div class="text-h6 font-weight-bold">{{ dashboard.stats.paidEmiCount }} / {{ dashboard.stats.pendingEmiCount }}</div>
              </AppCard>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Monthly EMI Commitment" :value="dashboard.stats.monthlyEmiCommitment" icon="mdi-calendar-sync-outline" color="primary" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Original Loan Amount" :value="dashboard.stats.totalOriginalLoanAmount" icon="mdi-file-document-outline" color="info" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Principal Paid" :value="dashboard.stats.totalPrincipalPaid" icon="mdi-cash-check" color="success" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Interest Paid" :value="dashboard.stats.totalInterestPaid" icon="mdi-percent-outline" color="warning" />
            </div>
            <!-- What the loans were carrying when they came across from the old system. -->
            <div v-if="dashboard.stats.totalOpeningOutstanding > 0" class="col-12 col-sm-6 col-md-3">
              <ProfitCard label="Opening Outstanding" :value="dashboard.stats.totalOpeningOutstanding" icon="mdi-database-import-outline" color="info" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <AppCard class="pa-4">
                <div class="text-caption text-medium-emphasis">Next EMI</div>
                <div class="text-h6 font-weight-bold">
                  {{ dashboard.stats.nextEmiDate ? formatDate(dashboard.stats.nextEmiDate) : '—' }}
                </div>
                <div v-if="dashboard.stats.nextEmiAmount" class="text-caption">{{ formatCurrency(dashboard.stats.nextEmiAmount) }}</div>
              </AppCard>
            </div>
          </div>

          <AppCard class="pa-4 mt-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-3 ga-2">
              <div class="text-subtitle-2">Upcoming &amp; Overdue EMI</div>
              <div class="d-flex ga-2 flex-wrap">
                <AppSelect v-model="filters.loanType" :items="loanTypeOptions" item-title="label" item-value="value" label="Loan Type" clearable density="compact" hide-details style="min-width: 160px" @update:model-value="loadDashboard" />
                <AppSelect v-model="filters.status" :items="emiStatusOptions" label="Status" clearable density="compact" hide-details style="min-width: 140px" @update:model-value="loadDashboard" />
                <AppTextField v-model="filters.dateFrom" type="date" label="From" density="compact" hide-details style="max-width: 160px" @update:model-value="loadDashboard" />
                <AppTextField v-model="filters.dateTo" type="date" label="To" density="compact" hide-details style="max-width: 160px" @update:model-value="loadDashboard" />
              </div>
            </div>

            <div v-if="dashboard.upcomingEmis.length === 0" class="text-caption text-medium-emphasis">No EMI due for the selected filters.</div>
            <div v-else class="tblwrap">
              <AppTable density="compact">
                <thead>
                  <tr>
                    <th>Due Date</th><th>Vehicle</th><th>Loan</th><th>Lender</th>
                    <th class="text-right">EMI</th><th class="text-right">Principal</th><th class="text-right">Interest</th>
                    <th>Status</th><th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in dashboard.upcomingEmis" :key="e.id">
                    <td>{{ formatDate(e.dueDate) }}</td>
                    <td>{{ e.vehicle || '—' }}</td>
                    <td>
                      <RouterLink :to="`/accounts/loans/${e.loanId}`" class="text-primary">{{ e.loanNumber }}</RouterLink>
                      <div class="text-caption text-medium-emphasis">{{ e.loanName }}</div>
                    </td>
                    <td>{{ e.lenderName }}</td>
                    <td class="text-right">{{ formatCurrency(e.emiAmount) }}</td>
                    <td class="text-right">{{ formatCurrency(e.principalComponent) }}</td>
                    <td class="text-right">{{ formatCurrency(e.interestComponent) }}</td>
                    <td><AppChip size="x-small" :color="emiStatusColor(e.status)">{{ e.status }}</AppChip></td>
                    <td class="text-right">
                      <AppBtn size="small" variant="tonal" color="primary" @click="goPayEmi(e.loanId)">Pay EMI</AppBtn>
                    </td>
                  </tr>
                </tbody>
              </AppTable>
            </div>
          </AppCard>
        </template>
      </AppWindowItem>

      <!-- ------------------------------------------------ Loan Master -->
      <AppWindowItem value="loans">
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
          <template #filters>
            <AppSelect v-model="listFilters.loanType" :items="loanTypeOptions" item-title="label" item-value="value" label="Loan Type" clearable density="compact" hide-details @update:model-value="fetchList" />
            <AppSelect v-model="listFilters.status" :items="loanStatusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchList" />
            <AppSelect v-model="listFilters.origin" :items="originOptions" item-title="label" item-value="value" label="Origin" clearable density="compact" hide-details @update:model-value="fetchList" />
          </template>
          <template #item.loanNumber="{ item }">
            <RouterLink :to="`/accounts/loans/${(item as any).id}`" class="text-primary">{{ (item as any).loanNumber }}</RouterLink>
          </template>
          <template #item.loanType="{ item }">
            <AppChip size="x-small" variant="outlined">{{ loanTypeLabel((item as any).loanType) }}</AppChip>
          </template>
          <template #item.linkedTo="{ item }">
            {{ (item as any).vehicle?.registrationNumber || (item as any).capitalPartner?.name || '—' }}
          </template>
          <template #item.origin="{ item }">
            <AppChip size="x-small" variant="outlined" :color="(item as any).origin === 'OPENING' ? 'info' : 'default'">
              {{ (item as any).origin === 'OPENING' ? 'Opening' : 'New' }}
            </AppChip>
          </template>
          <template #item.principalAmount="{ item }">
            {{ formatCurrency((item as any).originalPrincipal ?? (item as any).principalAmount) }}
          </template>
          <template #item.emiAmount="{ item }">{{ formatCurrency((item as any).emiAmount) }}</template>
          <template #item.outstanding="{ item }">{{ formatCurrency((item as any).totals.outstandingPrincipal) }}</template>
          <template #item.status="{ item }">
            <AppChip size="small" :color="loanStatusColor((item as any).status)">{{ (item as any).status }}</AppChip>
          </template>
          <template #item.actions="{ item }">
            <AppBtn icon="mdi-format-list-bulleted" variant="text" size="small" title="EMI Schedule" @click="goDetail((item as any).id)" />
            <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item as any)" />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="onDelete(item as any)" />
          </template>
        </MasterDataTable>
      </AppWindowItem>
    </AppWindow>

    <!-- ------------------------------------------------ Create / Edit -->
    <MasterFormDialog v-model="formDialog" :title="editTarget ? 'Edit Loan' : 'Add Loan'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-model="form.loanName" label="Loan Name" :error-messages="errors.loanName" class="mb-2" />
      <AppTextField v-model="form.lenderName" label="Lender / Bank" :error-messages="errors.lenderName" class="mb-2" />
      <AppSelect
        v-model="form.loanType"
        :items="loanTypeOptions"
        item-title="label"
        item-value="value"
        label="Loan Type"
        :disabled="!!editTarget"
        :hint="editTarget ? 'Loan type cannot be changed after the schedule is generated' : undefined"
        persistent-hint
        class="mb-2"
      />
      <AppSelect
        v-if="form.loanType === 'VEHICLE_LOAN'"
        v-model="form.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle"
        :error-messages="errors.vehicleId"
        class="mb-2"
      />
      <AppSelect
        v-if="form.loanType === 'OWNER_LOAN'"
        v-model="form.capitalPartnerId"
        :items="partnerOptions"
        item-title="name"
        item-value="id"
        label="Owner / Partner"
        :error-messages="errors.capitalPartnerId"
        class="mb-2"
      />

      <!-- Money terms define the generated schedule, so they are set once. -->
      <template v-if="!editTarget">
        <AppSelect v-model="form.origin" :items="originOptions" item-title="label" item-value="value" label="Loan Origin" class="mb-2" />
        <!--
          An existing loan is not re-entered EMI by EMI: it comes in at what
          is still owed, over the EMIs that are left, and the schedule picks
          up from the next due date.
        -->
        <AppAlert v-if="isOpeningLoan" type="info" variant="tonal" density="compact" class="mb-3">
          Enter what is still owed today and how many EMIs are left — old EMIs already paid in the previous system are not recreated.
        </AppAlert>
        <div class="d-flex ga-2">
          <AppTextField v-model="form.loanStartDate" type="date" :label="isOpeningLoan ? 'Original Loan Start Date' : 'Loan Start Date'" class="mb-2 flex-1-1" />
          <AppTextField
            v-if="isOpeningLoan"
            v-model.number="form.originalPrincipal"
            type="number"
            label="Original Loan Amount"
            class="mb-2 flex-1-1"
          />
        </div>
        <div class="d-flex ga-2">
          <AppTextField
            v-model.number="form.principalAmount"
            type="number"
            :label="isOpeningLoan ? 'Outstanding on Migration Date' : 'Loan Amount'"
            :error-messages="errors.principalAmount"
            class="mb-2 flex-1-1"
          />
          <AppTextField v-if="isOpeningLoan" v-model="form.openingAsOfDate" type="date" label="Opening Date" class="mb-2 flex-1-1" />
        </div>
        <div class="d-flex ga-2">
          <AppTextField v-model.number="form.interestRatePercent" type="number" label="Interest Rate (% p.a.)" class="mb-2 flex-1-1" />
          <AppTextField
            v-model.number="form.tenureMonths"
            type="number"
            :label="isOpeningLoan ? 'Remaining EMIs' : 'Tenure (months)'"
            :error-messages="errors.tenureMonths"
            class="mb-2 flex-1-1"
          />
        </div>
        <div class="d-flex ga-2">
          <AppTextField
            v-model.number="form.emiAmount"
            type="number"
            label="EMI Amount"
            :hint="computedEmi ? `Leave blank to use the calculated EMI of ${formatCurrency(computedEmi)}` : 'Leave blank to calculate automatically'"
            persistent-hint
            class="mb-2 flex-1-1"
          />
          <AppTextField v-model="form.firstEmiDate" type="date" :label="isOpeningLoan ? 'Next EMI Date' : 'First EMI Date'" class="mb-2 flex-1-1" />
        </div>
      </template>

      <AppSelect v-model="form.fundAccountKey" :items="fundAccountOptions" item-title="label" item-value="key" label="Payment Bank / Cash Account" :error-messages="errors.fundAccountKey" class="mb-2" />
      <AppTextField v-model="form.loanAccountRef" label="Loan Account / Reference" class="mb-2" />
      <AppSelect v-if="editTarget" v-model="form.status" :items="loanStatusOptions" label="Status" class="mb-2" />
      <AppTextarea v-model="form.remarks" label="Remarks" rows="2" class="mb-2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLoanStore } from '@/stores/accounts/loans';
import { useVehicleStore } from '@/stores/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency, formatDate } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { AppBtn, AppSelect, AppTextField, AppTextarea, AppChip, AppCard, AppTable, AppTabs, AppTab, AppWindow, AppWindowItem, AppProgressCircular, AppAlert } from '@/components/ui';
import { LOAN_TYPE_LABELS, type Loan, type LoanType, type LoanInstallmentStatus } from '@/types/loans.types';
import { createMasterApi } from '@/services/masterApiFactory';

const capitalPartnerApi = createMasterApi<{ id: string; name: string }>('/masters/capital-partners');

const router = useRouter();
const store = useLoanStore();
const vehicleStore = useVehicleStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const activeTab = ref('dashboard');
const dashboard = computed(() => store.dashboard);

const loanTypeOptions = (Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((value) => ({ value, label: LOAN_TYPE_LABELS[value] }));
const loanStatusOptions = ['ACTIVE', 'CLOSED', 'FORECLOSED'];
const emiStatusOptions = ['PENDING', 'PAID', 'OVERDUE', 'WAIVED'];

function loanTypeLabel(t: LoanType) {
  return LOAN_TYPE_LABELS[t] ?? t;
}
function loanStatusColor(s: string) {
  return ({ ACTIVE: 'success', CLOSED: 'default', FORECLOSED: 'warning' } as Record<string, string>)[s] || 'default';
}
function emiStatusColor(s: LoanInstallmentStatus) {
  return ({ PAID: 'success', PENDING: 'warning', OVERDUE: 'error', WAIVED: 'info' } as Record<string, string>)[s] || 'default';
}

// ---------------------------------------------------------------- dashboard
const filters = reactive({ loanType: null as string | null, status: null as string | null, dateFrom: '', dateTo: '' });
async function loadDashboard() {
  await store.fetchDashboard({
    loanType: filters.loanType || undefined,
    status: filters.status || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });
}

// ------------------------------------------------------------------- list
const page = ref(1);
const pageSize = ref(10);
const listFilters = reactive({ loanType: null as string | null, status: null as string | null, origin: null as string | null });
const originOptions = [
  { value: 'NEW', label: 'New Loan' },
  { value: 'OPENING', label: 'Opening / Existing' },
];

const headers = [
  { title: 'Loan No.', key: 'loanNumber', sortable: false },
  { title: 'Loan Name', key: 'loanName', sortable: false },
  { title: 'Type', key: 'loanType', sortable: false },
  { title: 'Origin', key: 'origin', sortable: false },
  { title: 'Vehicle / Owner', key: 'linkedTo', sortable: false },
  { title: 'Lender', key: 'lenderName', sortable: false },
  { title: 'Loan Amount', key: 'principalAmount', sortable: false },
  { title: 'EMI', key: 'emiAmount', sortable: false },
  { title: 'Outstanding', key: 'outstanding', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchList(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchList(); }
async function fetchList() {
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    loanType: listFilters.loanType || undefined,
    status: listFilters.status || undefined,
    origin: listFilters.origin || undefined,
  });
}

function goDetail(id: string) {
  router.push(`/accounts/loans/${id}`);
}
function goPayEmi(loanId: string) {
  router.push({ path: `/accounts/loans/${loanId}`, query: { pay: '1' } });
}

// ------------------------------------------------------------ create/edit
const formDialog = ref(false);
const submitting = ref(false);
const editTarget = ref<Loan | null>(null);
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const partnerOptions = ref<{ id: string; name: string }[]>([]);

const form = reactive({
  loanName: '',
  lenderName: '',
  loanType: 'VEHICLE_LOAN' as LoanType,
  vehicleId: '',
  capitalPartnerId: '',
  loanStartDate: new Date().toISOString().slice(0, 10),
  principalAmount: undefined as number | undefined,
  interestRatePercent: undefined as number | undefined,
  tenureMonths: undefined as number | undefined,
  emiAmount: undefined as number | undefined,
  firstEmiDate: '',
  fundAccountKey: '',
  loanAccountRef: '',
  status: 'ACTIVE',
  remarks: '',
  origin: 'NEW',
  originalPrincipal: undefined as number | undefined,
  openingAsOfDate: new Date().toISOString().slice(0, 10),
});
const errors = reactive({ loanName: '', lenderName: '', vehicleId: '', capitalPartnerId: '', principalAmount: '', tenureMonths: '', fundAccountKey: '' });

const isOpeningLoan = computed(() => form.origin === 'OPENING');

const bankAccountOptions = computed(() => bankAccountStore.items.map((b: any) => ({ key: `BANK:${b.id}`, label: `Bank — ${b.accountHolderName} (${b.accountNumber})` })));
const cashAccountOptions = computed(() => cashAccountStore.items.map((c: any) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.ledger?.name || c.cashAccountType}` })));
const fundAccountOptions = computed(() => [...bankAccountOptions.value, ...cashAccountOptions.value]);

/** Mirrors the server's reducing-balance formula so the user sees the EMI before saving. */
const computedEmi = computed(() => {
  const p = Number(form.principalAmount);
  const n = Number(form.tenureMonths);
  const rate = Number(form.interestRatePercent || 0);
  if (!p || !n || n <= 0) return null;
  const r = rate / 12 / 100;
  if (r === 0) return Math.round((p / n) * 100) / 100;
  const factor = Math.pow(1 + r, n);
  return Math.round(((p * r * factor) / (factor - 1)) * 100) / 100;
});

function resetForm() {
  Object.assign(form, {
    loanName: '', lenderName: '', loanType: 'VEHICLE_LOAN', vehicleId: '', capitalPartnerId: '',
    loanStartDate: new Date().toISOString().slice(0, 10),
    principalAmount: undefined, interestRatePercent: undefined, tenureMonths: undefined,
    emiAmount: undefined, firstEmiDate: '', fundAccountKey: '', loanAccountRef: '', status: 'ACTIVE', remarks: '',
    origin: 'NEW', originalPrincipal: undefined, openingAsOfDate: new Date().toISOString().slice(0, 10),
  });
  Object.assign(errors, { loanName: '', lenderName: '', vehicleId: '', capitalPartnerId: '', principalAmount: '', tenureMonths: '', fundAccountKey: '' });
}

function openCreateDialog() {
  editTarget.value = null;
  resetForm();
  formDialog.value = true;
}

function openEditDialog(loan: Loan) {
  editTarget.value = loan;
  Object.assign(errors, { loanName: '', lenderName: '', vehicleId: '', capitalPartnerId: '', principalAmount: '', tenureMonths: '', fundAccountKey: '' });
  Object.assign(form, {
    loanName: loan.loanName,
    lenderName: loan.lenderName,
    loanType: loan.loanType,
    vehicleId: loan.vehicle?.id || '',
    capitalPartnerId: loan.capitalPartner?.id || '',
    fundAccountKey: `${loan.fundAccountType}:${loan.fundAccountId}`,
    loanAccountRef: loan.loanAccountRef || '',
    status: loan.status,
    remarks: loan.remarks || '',
  });
  formDialog.value = true;
}

function validate() {
  errors.loanName = form.loanName ? '' : 'Loan name is required';
  errors.lenderName = form.lenderName ? '' : 'Lender / Bank is required';
  errors.vehicleId = form.loanType === 'VEHICLE_LOAN' && !form.vehicleId ? 'A Vehicle Loan must be linked to a vehicle' : '';
  errors.capitalPartnerId = form.loanType === 'OWNER_LOAN' && !form.capitalPartnerId ? 'An Owner Loan must be linked to an owner / partner' : '';
  errors.fundAccountKey = form.fundAccountKey ? '' : 'A payment account must be selected';
  errors.principalAmount = editTarget.value || (form.principalAmount && form.principalAmount > 0) ? '' : 'Loan amount must be greater than 0';
  errors.tenureMonths = editTarget.value || (form.tenureMonths && form.tenureMonths > 0) ? '' : 'Tenure must be at least 1 month';
  return !Object.values(errors).some(Boolean);
}

async function onSubmit() {
  if (!validate()) return;
  const [fundAccountType, fundAccountId] = form.fundAccountKey.split(':');

  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.update(editTarget.value.id, {
        loanName: form.loanName,
        lenderName: form.lenderName,
        vehicleId: form.loanType === 'VEHICLE_LOAN' ? form.vehicleId || null : null,
        capitalPartnerId: form.loanType === 'OWNER_LOAN' ? form.capitalPartnerId || null : null,
        fundAccountType,
        fundAccountId,
        loanAccountRef: form.loanAccountRef || null,
        status: form.status,
        remarks: form.remarks || null,
      });
      success('Loan updated');
    } else {
      await store.create({
        loanName: form.loanName,
        lenderName: form.lenderName,
        loanType: form.loanType,
        vehicleId: form.loanType === 'VEHICLE_LOAN' ? form.vehicleId : undefined,
        capitalPartnerId: form.loanType === 'OWNER_LOAN' ? form.capitalPartnerId : undefined,
        loanStartDate: form.loanStartDate,
        principalAmount: form.principalAmount,
        interestRatePercent: form.interestRatePercent ?? 0,
        tenureMonths: form.tenureMonths,
        emiAmount: form.emiAmount || undefined,
        firstEmiDate: form.firstEmiDate || form.loanStartDate,
        fundAccountType,
        fundAccountId,
        loanAccountRef: form.loanAccountRef || undefined,
        remarks: form.remarks || undefined,
        origin: form.origin,
        originalPrincipal: isOpeningLoan.value ? form.originalPrincipal || undefined : undefined,
        openingAsOfDate: isOpeningLoan.value ? form.openingAsOfDate : undefined,
      });
      success(
        isOpeningLoan.value
          ? 'Opening loan registered — its remaining EMI schedule was generated'
          : 'Loan created and its EMI schedule generated'
      );
    }
    formDialog.value = false;
    await Promise.all([fetchList(), loadDashboard()]);
  } catch (err) {
    error(extractErrorMessage(err, editTarget.value ? 'Failed to update loan' : 'Failed to create loan'));
  } finally {
    submitting.value = false;
  }
}

async function onDelete(loan: Loan) {
  try {
    await store.remove(loan.id);
    success('Loan deleted');
    await Promise.all([fetchList(), loadDashboard()]);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete loan'));
  }
}

// Loading the list lazily keeps the initial dashboard render fast.
watch(activeTab, (tab) => {
  if (tab === 'loans' && store.items.length === 0) fetchList();
});

onMounted(async () => {
  await loadDashboard();
  const [, , partners] = await Promise.all([
    vehicleStore.fetchList({ pageSize: 200 }),
    Promise.all([bankAccountStore.fetchList({ pageSize: 200 }), cashAccountStore.fetchList({ pageSize: 200 })]),
    capitalPartnerApi.list().catch(() => null),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  partnerOptions.value = partners ? (partners.data.data as any[]).map((p) => ({ id: p.id, name: p.name })) : [];
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
