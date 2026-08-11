<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Driver Advances, Reimbursements, Allowances &amp; Penalties</h2>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="advances">Advances</AppTab>
      <AppTab value="reimbursements">Reimbursements</AppTab>
      <AppTab value="earnings">Allowances / Incentives</AppTab>
      <AppTab value="penalties">Penalties &amp; Recoveries</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <!-- ADVANCES -->
      <AppWindowItem value="advances">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openAdvanceDialog">Request Advance</AppBtn>
        </div>
        <MasterDataTable :headers="advanceHeaders" :items="advanceStore.items" :items-length="advanceStore.meta?.total || 0" :loading="advanceStore.loading" :page="advPage" :page-size="advPageSize" @update:page="(v) => { advPage = v; fetchAdvances(); }" @update:page-size="(v) => { advPageSize = v; fetchAdvances(); }">
          <template #filters>
            <AppSelect v-model="advStatusFilter" :items="approvalStatusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchAdvances" />
          </template>
          <template #item.driver="{ item }">{{ (item as any).driver.name }}</template>
          <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
          <template #item.approvalStatus="{ item }"><AppChip size="small" :color="statusColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
          <template #item.actions="{ item }">
            <template v-if="(item as any).approvalStatus === 'PENDING'">
              <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove('advance', item as any)" />
              <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject('advance', item as any)" />
            </template>
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- REIMBURSEMENTS -->
      <AppWindowItem value="reimbursements">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openReimbursementDialog">Claim Reimbursement</AppBtn>
        </div>
        <MasterDataTable :headers="reimbursementHeaders" :items="reimbursementStore.items" :items-length="reimbursementStore.meta?.total || 0" :loading="reimbursementStore.loading" :page="reimPage" :page-size="reimPageSize" @update:page="(v) => { reimPage = v; fetchReimbursements(); }" @update:page-size="(v) => { reimPageSize = v; fetchReimbursements(); }">
          <template #item.driver="{ item }">{{ (item as any).driver.name }}</template>
          <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
          <template #item.approvalStatus="{ item }"><AppChip size="small" :color="statusColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
          <template #item.actions="{ item }">
            <template v-if="(item as any).approvalStatus === 'PENDING'">
              <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove('reimbursement', item as any)" />
              <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject('reimbursement', item as any)" />
            </template>
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- EARNINGS -->
      <AppWindowItem value="earnings">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openEarningDialog">Record Allowance / Incentive</AppBtn>
        </div>
        <MasterDataTable :headers="earningHeaders" :items="earningStore.items" :items-length="earningStore.meta?.total || 0" :loading="earningStore.loading" :page="earnPage" :page-size="earnPageSize" @update:page="(v) => { earnPage = v; fetchEarnings(); }" @update:page-size="(v) => { earnPageSize = v; fetchEarnings(); }">
          <template #item.driver="{ item }">{{ (item as any).driver.name }}</template>
          <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
          <template #item.category="{ item }"><AppChip size="small" variant="tonal">{{ (item as any).earningCategory }}</AppChip></template>
          <template #item.approvalStatus="{ item }"><AppChip size="small" :color="statusColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
          <template #item.actions="{ item }">
            <template v-if="(item as any).approvalStatus === 'PENDING'">
              <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove('earning', item as any)" />
              <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject('earning', item as any)" />
            </template>
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- PENALTIES -->
      <AppWindowItem value="penalties">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openPenaltyDialog">Record Penalty / Recovery</AppBtn>
        </div>
        <MasterDataTable :headers="penaltyHeaders" :items="penaltyStore.items" :items-length="penaltyStore.meta?.total || 0" :loading="penaltyStore.loading" :page="penPage" :page-size="penPageSize" @update:page="(v) => { penPage = v; fetchPenalties(); }" @update:page-size="(v) => { penPageSize = v; fetchPenalties(); }">
          <template #item.driver="{ item }">{{ (item as any).driver.name }}</template>
          <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
          <template #item.approvalStatus="{ item }"><AppChip size="small" :color="statusColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
          <template #item.actions="{ item }">
            <template v-if="(item as any).approvalStatus === 'PENDING'">
              <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApprove('penalty', item as any)" />
              <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onReject('penalty', item as any)" />
            </template>
          </template>
        </MasterDataTable>
      </AppWindowItem>
    </AppWindow>

    <!-- Advance dialog -->
    <MasterFormDialog v-model="advanceDialog" title="Request Driver Advance" :loading="submitting" @submit="onSubmitAdvance">
      <AppSelect v-model="advanceForm.driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" :error-messages="formErrors.driverId" class="mb-2" />
      <AppSelect v-model="advanceForm.tripId" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip (optional)" clearable class="mb-2" />
      <AppSelect v-model="advanceForm.advanceType" :items="driverAdvanceTypeOptions" label="Advance Type" class="mb-2" />
      <AppTextField v-model.number="advanceForm.amount" type="number" label="Amount" :error-messages="formErrors.amount" class="mb-2" />
      <AppSelect v-model="fundAccountKey" :items="fundAccountOptions" item-title="label" item-value="key" label="Pay From (Bank/Cash)" class="mb-2" />
      <AppTextarea v-model="advanceForm.purpose" label="Purpose" rows="2" />
    </MasterFormDialog>

    <!-- Reimbursement dialog -->
    <MasterFormDialog v-model="reimbursementDialog" title="Claim Driver Expense Reimbursement" :loading="submitting" @submit="onSubmitReimbursement">
      <AppSelect v-model="reimbursementForm.driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" :error-messages="formErrors.driverId" class="mb-2" />
      <AppSelect v-model="reimbursementForm.tripId" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip (optional)" clearable class="mb-2" />
      <AppSelect v-model="reimbursementForm.category" :items="expenseCategoryOptions" label="Category" class="mb-2" />
      <AppTextField v-model.number="reimbursementForm.amount" type="number" label="Amount" :error-messages="formErrors.amount" class="mb-2" />
      <AppTextField v-model="reimbursementForm.expenseDate" type="date" label="Expense Date" class="mb-2" />
      <AppTextarea v-model="reimbursementForm.description" label="Description" rows="2" />
    </MasterFormDialog>

    <!-- Earning dialog -->
    <MasterFormDialog v-model="earningDialog" title="Record Driver Allowance / Incentive" :loading="submitting" @submit="onSubmitEarning">
      <AppSelect v-model="earningForm.driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" :error-messages="formErrors.driverId" class="mb-2" />
      <AppSelect v-model="earningForm.tripId" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip (optional)" clearable class="mb-2" />
      <AppSelect v-model="earningForm.earningCategory" :items="['ALLOWANCE', 'INCENTIVE']" label="Category" class="mb-2" />
      <AppSelect v-model="earningForm.earningType" :items="earningTypeOptions" label="Type" class="mb-2" />
      <AppTextField v-model.number="earningForm.amount" type="number" label="Amount" :error-messages="formErrors.amount" class="mb-2" />
      <AppCheckbox v-model="earningForm.requiresApproval" label="Requires approval before posting (else posts immediately)" />
    </MasterFormDialog>

    <!-- Penalty dialog -->
    <MasterFormDialog v-model="penaltyDialog" title="Record Driver Penalty / Recovery" :loading="submitting" @submit="onSubmitPenalty">
      <AppSelect v-model="penaltyForm.driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" :error-messages="formErrors.driverId" class="mb-2" />
      <AppSelect v-model="penaltyForm.tripId" :items="tripOptions" item-title="tripNumber" item-value="id" label="Trip (optional)" clearable class="mb-2" />
      <AppSelect v-model="penaltyForm.penaltyType" :items="penaltyTypeOptions" label="Type" class="mb-2" />
      <AppTextField v-model.number="penaltyForm.amount" type="number" label="Amount" :error-messages="formErrors.amount" class="mb-2" />
      <AppTextarea v-model="penaltyForm.reason" label="Reason" rows="2" :error-messages="formErrors.reason" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  useDriverAdvanceStore,
  useDriverReimbursementStore,
  useDriverEarningStore,
  useDriverPenaltyStore,
} from '@/stores/accounts/driverPayroll';
import { driverApi } from '@/services/masters';
import { tripApi } from '@/services/operations';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppTabs, AppTab, AppWindow, AppWindowItem, AppSelect, AppTextField, AppTextarea, AppCheckbox, AppChip } from '@/components/ui';

const advanceStore = useDriverAdvanceStore();
const reimbursementStore = useDriverReimbursementStore();
const earningStore = useDriverEarningStore();
const penaltyStore = useDriverPenaltyStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const activeTab = ref('advances');
const driverOptions = ref<{ id: string; name: string }[]>([]);
const tripOptions = ref<{ id: string; tripNumber: string }[]>([]);

const approvalStatusOptions = ['PENDING', 'APPROVED', 'REJECTED'];
const driverAdvanceTypeOptions = [
  'SALARY_ADVANCE', 'TRIP_ADVANCE', 'EMERGENCY_ADVANCE', 'FUEL_ADVANCE', 'TOLL_ADVANCE',
  'REPAIR_ADVANCE', 'MEDICAL_ADVANCE', 'ADVANCE_AGAINST_SALARY', 'ADVANCE_AGAINST_TRIP', 'OTHER',
];
const expenseCategoryOptions = ['FUEL', 'REPAIR', 'TYRE', 'BATTERY', 'PARKING', 'TOLL', 'FOOD', 'ACCOMMODATION', 'MEDICAL', 'PHONE', 'MISCELLANEOUS'];
const earningTypeOptions = [
  'TRIP_BATA', 'DAILY_BATA', 'NIGHT_BATA', 'LOADING_ALLOWANCE', 'UNLOADING_ALLOWANCE', 'WAITING_CHARGES',
  'OUTSTATION_ALLOWANCE', 'FOOD_ALLOWANCE', 'SPECIAL_ALLOWANCE', 'TRIP_INCENTIVE', 'MONTHLY_INCENTIVE',
  'FUEL_SAVING_INCENTIVE', 'ON_TIME_DELIVERY_INCENTIVE', 'PERFORMANCE_BONUS', 'TARGET_INCENTIVE',
  'FESTIVAL_BONUS', 'REFERRAL_BONUS', 'CUSTOM',
];
const penaltyTypeOptions = [
  'FUEL_RECOVERY', 'DAMAGE_RECOVERY', 'ACCIDENT_RECOVERY', 'LATE_DELIVERY_PENALTY', 'TRAFFIC_FINE',
  'ADVANCE_RECOVERY', 'LOAN_RECOVERY', 'UNIFORM_RECOVERY', 'OTHER',
];

function statusColor(status: string) {
  return ({ APPROVED: 'success', REJECTED: 'default', PENDING: 'warning' } as Record<string, string>)[status] || 'info';
}

const bankAccountOptions = computed(() => bankAccountStore.items.map((b) => ({ id: b.id, accountHolderName: b.accountHolderName, accountNumber: b.accountNumber })));
const cashAccountOptions = computed(() => cashAccountStore.items.map((c) => ({ id: c.id, label: c.cashAccountType })));
const fundAccountKey = ref('');
const fundAccountOptions = computed(() => [
  ...bankAccountOptions.value.map((b) => ({ key: `BANK:${b.id}`, label: `Bank — ${b.accountHolderName} (${b.accountNumber})` })),
  ...cashAccountOptions.value.map((c) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.label}` })),
]);

const formErrors = reactive({ driverId: '', amount: '', reason: '' });
function clearErrors() { formErrors.driverId = ''; formErrors.amount = ''; formErrors.reason = ''; }

// --- Advances ---
const advPage = ref(1);
const advPageSize = ref(10);
const advStatusFilter = ref<string | null>(null);
const advanceHeaders = [
  { title: 'Advance No.', key: 'advanceNumber', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Type', key: 'advanceType', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchAdvances() {
  await advanceStore.fetchList({ page: advPage.value, pageSize: advPageSize.value, approvalStatus: advStatusFilter.value || undefined });
}
const advanceDialog = ref(false);
const submitting = ref(false);
const advanceForm = reactive({ driverId: '', tripId: '', advanceType: 'TRIP_ADVANCE', amount: undefined as number | undefined, purpose: '' });
function openAdvanceDialog() {
  Object.assign(advanceForm, { driverId: '', tripId: '', advanceType: 'TRIP_ADVANCE', amount: undefined, purpose: '' });
  fundAccountKey.value = '';
  clearErrors();
  advanceDialog.value = true;
}
async function onSubmitAdvance() {
  formErrors.driverId = advanceForm.driverId ? '' : 'Driver is required';
  formErrors.amount = advanceForm.amount && advanceForm.amount > 0 ? '' : 'Amount must be greater than 0';
  if (formErrors.driverId || formErrors.amount) return;
  submitting.value = true;
  try {
    const [fundAccountType, fundAccountId] = fundAccountKey.value ? fundAccountKey.value.split(':') : [undefined, undefined];
    await advanceStore.request({
      driverId: advanceForm.driverId,
      tripId: advanceForm.tripId || undefined,
      advanceType: advanceForm.advanceType,
      amount: advanceForm.amount,
      purpose: advanceForm.purpose || undefined,
      fundAccountType,
      fundAccountId,
    });
    success('Driver advance requested');
    advanceDialog.value = false;
    fetchAdvances();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to request advance'));
  } finally {
    submitting.value = false;
  }
}

// --- Reimbursements ---
const reimPage = ref(1);
const reimPageSize = ref(10);
const reimbursementHeaders = [
  { title: 'Reimbursement No.', key: 'reimbursementNumber', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchReimbursements() {
  await reimbursementStore.fetchList({ page: reimPage.value, pageSize: reimPageSize.value });
}
const reimbursementDialog = ref(false);
const reimbursementForm = reactive({ driverId: '', tripId: '', category: 'FUEL', amount: undefined as number | undefined, expenseDate: new Date().toISOString().slice(0, 10), description: '' });
function openReimbursementDialog() {
  Object.assign(reimbursementForm, { driverId: '', tripId: '', category: 'FUEL', amount: undefined, expenseDate: new Date().toISOString().slice(0, 10), description: '' });
  clearErrors();
  reimbursementDialog.value = true;
}
async function onSubmitReimbursement() {
  formErrors.driverId = reimbursementForm.driverId ? '' : 'Driver is required';
  formErrors.amount = reimbursementForm.amount && reimbursementForm.amount > 0 ? '' : 'Amount must be greater than 0';
  if (formErrors.driverId || formErrors.amount) return;
  submitting.value = true;
  try {
    await reimbursementStore.request({
      driverId: reimbursementForm.driverId,
      tripId: reimbursementForm.tripId || undefined,
      category: reimbursementForm.category,
      amount: reimbursementForm.amount,
      expenseDate: reimbursementForm.expenseDate,
      description: reimbursementForm.description || undefined,
    });
    success('Reimbursement claimed');
    reimbursementDialog.value = false;
    fetchReimbursements();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to claim reimbursement'));
  } finally {
    submitting.value = false;
  }
}

// --- Earnings ---
const earnPage = ref(1);
const earnPageSize = ref(10);
const earningHeaders = [
  { title: 'Earning No.', key: 'earningNumber', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Type', key: 'earningType', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchEarnings() {
  await earningStore.fetchList({ page: earnPage.value, pageSize: earnPageSize.value });
}
const earningDialog = ref(false);
const earningForm = reactive({ driverId: '', tripId: '', earningCategory: 'ALLOWANCE', earningType: 'TRIP_BATA', amount: undefined as number | undefined, requiresApproval: false });
function openEarningDialog() {
  Object.assign(earningForm, { driverId: '', tripId: '', earningCategory: 'ALLOWANCE', earningType: 'TRIP_BATA', amount: undefined, requiresApproval: false });
  clearErrors();
  earningDialog.value = true;
}
async function onSubmitEarning() {
  formErrors.driverId = earningForm.driverId ? '' : 'Driver is required';
  formErrors.amount = earningForm.amount && earningForm.amount > 0 ? '' : 'Amount must be greater than 0';
  if (formErrors.driverId || formErrors.amount) return;
  submitting.value = true;
  try {
    await earningStore.create({
      driverId: earningForm.driverId,
      tripId: earningForm.tripId || undefined,
      earningCategory: earningForm.earningCategory,
      earningType: earningForm.earningType,
      amount: earningForm.amount,
      requiresApproval: earningForm.requiresApproval,
    });
    success(earningForm.requiresApproval ? 'Earning recorded, pending approval' : 'Earning recorded and posted');
    earningDialog.value = false;
    fetchEarnings();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record earning'));
  } finally {
    submitting.value = false;
  }
}

// --- Penalties ---
const penPage = ref(1);
const penPageSize = ref(10);
const penaltyHeaders = [
  { title: 'Penalty No.', key: 'penaltyNumber', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Type', key: 'penaltyType', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchPenalties() {
  await penaltyStore.fetchList({ page: penPage.value, pageSize: penPageSize.value });
}
const penaltyDialog = ref(false);
const penaltyForm = reactive({ driverId: '', tripId: '', penaltyType: 'FUEL_RECOVERY', amount: undefined as number | undefined, reason: '' });
function openPenaltyDialog() {
  Object.assign(penaltyForm, { driverId: '', tripId: '', penaltyType: 'FUEL_RECOVERY', amount: undefined, reason: '' });
  clearErrors();
  penaltyDialog.value = true;
}
async function onSubmitPenalty() {
  formErrors.driverId = penaltyForm.driverId ? '' : 'Driver is required';
  formErrors.amount = penaltyForm.amount && penaltyForm.amount > 0 ? '' : 'Amount must be greater than 0';
  formErrors.reason = penaltyForm.reason.trim() ? '' : 'A reason is required';
  if (formErrors.driverId || formErrors.amount || formErrors.reason) return;
  submitting.value = true;
  try {
    await penaltyStore.request({
      driverId: penaltyForm.driverId,
      tripId: penaltyForm.tripId || undefined,
      penaltyType: penaltyForm.penaltyType,
      amount: penaltyForm.amount,
      reason: penaltyForm.reason,
    });
    success('Penalty recorded');
    penaltyDialog.value = false;
    fetchPenalties();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record penalty'));
  } finally {
    submitting.value = false;
  }
}

// --- Shared approve/reject ---
async function onApprove(kind: 'advance' | 'reimbursement' | 'earning' | 'penalty', item: { id: string }) {
  try {
    if (kind === 'advance') await advanceStore.approve(item.id);
    else if (kind === 'reimbursement') await reimbursementStore.approve(item.id);
    else if (kind === 'earning') await earningStore.approve(item.id);
    else await penaltyStore.approve(item.id);
    success('Approved and posted to the ledger');
    if (kind === 'advance') fetchAdvances();
    else if (kind === 'reimbursement') fetchReimbursements();
    else if (kind === 'earning') fetchEarnings();
    else fetchPenalties();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve'));
  }
}
async function onReject(kind: 'advance' | 'reimbursement' | 'earning' | 'penalty', item: { id: string }) {
  try {
    if (kind === 'advance') await advanceStore.reject(item.id);
    else if (kind === 'reimbursement') await reimbursementStore.reject(item.id);
    else if (kind === 'earning') await earningStore.reject(item.id);
    else await penaltyStore.reject(item.id);
    success('Rejected');
    if (kind === 'advance') fetchAdvances();
    else if (kind === 'reimbursement') fetchReimbursements();
    else if (kind === 'earning') fetchEarnings();
    else fetchPenalties();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject'));
  }
}

onMounted(async () => {
  const [driversRes, tripsRes] = await Promise.all([
    driverApi.list({ pageSize: 200 }),
    tripApi.list({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
  ]);
  driverOptions.value = driversRes.data.data.map((d: any) => ({ id: d.id, name: `${d.name} (${d.code})` }));
  tripOptions.value = tripsRes.data.data.map((t: any) => ({ id: t.id, tripNumber: t.tripNumber }));
  fetchAdvances();
  fetchReimbursements();
  fetchEarnings();
  fetchPenalties();
});
</script>
