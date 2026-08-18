<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h6">Employee Advances</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openAdvanceDialog">Request Advance</AppBtn>
    </div>

    <MasterDataTable :headers="advanceHeaders" :items="advanceStore.items" :items-length="advanceStore.meta?.total || 0" :loading="advanceStore.loading" :page="advPage" :page-size="advPageSize" @update:page="(v) => { advPage = v; fetchAdvances(); }" @update:page-size="(v) => { advPageSize = v; fetchAdvances(); }">
      <template #item.employee="{ item }">{{ (item as any).employee.name }}</template>
      <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
      <template #item.approvalStatus="{ item }"><AppChip size="small" :color="statusColor((item as any).approvalStatus)">{{ (item as any).approvalStatus }}</AppChip></template>
      <template #item.actions="{ item }">
        <template v-if="(item as any).approvalStatus === 'PENDING'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" color="success" @click="onApproveAdvance(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onRejectAdvance(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="advanceDialog" title="Request Employee Advance" :loading="submitting" @submit="onSubmitAdvance">
      <AppSelect v-model="advanceForm.employeeId" :items="employeeOptions" item-title="name" item-value="id" label="Employee" :error-messages="errors.employeeId" class="mb-2" />
      <AppSelect v-model="advanceForm.advanceType" :items="employeeAdvanceTypeOptions" label="Advance Type" class="mb-2" />
      <AppTextField v-model.number="advanceForm.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
      <AppSelect v-model="fundAccountKey" :items="fundAccountOptions" item-title="label" item-value="key" label="Pay From (Bank/Cash)" class="mb-2" />
      <AppTextarea v-model="advanceForm.purpose" label="Purpose" rows="2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useEmployeeAdvanceStore } from '@/stores/accounts/driverPayroll';
import { employeeApi } from '@/services/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppTextarea, AppChip } from '@/components/ui';

const advanceStore = useEmployeeAdvanceStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const employeeOptions = ref<{ id: string; name: string }[]>([]);
const employeeAdvanceTypeOptions = ['SALARY_ADVANCE', 'EMERGENCY_ADVANCE', 'MEDICAL_ADVANCE', 'ADVANCE_AGAINST_SALARY', 'OTHER'];

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

const errors = reactive({ employeeId: '', amount: '' });

const advPage = ref(1);
const advPageSize = ref(10);
const advanceHeaders = [
  { title: 'Advance No.', key: 'advanceNumber', sortable: false },
  { title: 'Employee', key: 'employee', sortable: false },
  { title: 'Type', key: 'advanceType', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'approvalStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchAdvances() { await advanceStore.fetchList({ page: advPage.value, pageSize: advPageSize.value }); }

const advanceDialog = ref(false);
const submitting = ref(false);
const advanceForm = reactive({ employeeId: '', advanceType: 'SALARY_ADVANCE', amount: undefined as number | undefined, purpose: '' });
function openAdvanceDialog() {
  Object.assign(advanceForm, { employeeId: '', advanceType: 'SALARY_ADVANCE', amount: undefined, purpose: '' });
  fundAccountKey.value = '';
  errors.employeeId = ''; errors.amount = '';
  advanceDialog.value = true;
}
async function onSubmitAdvance() {
  errors.employeeId = advanceForm.employeeId ? '' : 'Employee is required';
  errors.amount = advanceForm.amount && advanceForm.amount > 0 ? '' : 'Amount must be greater than 0';
  if (errors.employeeId || errors.amount) return;
  submitting.value = true;
  try {
    const [fundAccountType, fundAccountId] = fundAccountKey.value ? fundAccountKey.value.split(':') : [undefined, undefined];
    await advanceStore.request({ employeeId: advanceForm.employeeId, advanceType: advanceForm.advanceType, amount: advanceForm.amount, purpose: advanceForm.purpose || undefined, fundAccountType, fundAccountId });
    success('Employee advance requested');
    advanceDialog.value = false;
    fetchAdvances();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to request advance'));
  } finally {
    submitting.value = false;
  }
}
async function onApproveAdvance(item: { id: string }) {
  try {
    await advanceStore.approve(item.id);
    success('Advance approved and paid');
    fetchAdvances();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve'));
  }
}
async function onRejectAdvance(item: { id: string }) {
  try {
    await advanceStore.reject(item.id);
    success('Advance rejected');
    fetchAdvances();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject'));
  }
}

onMounted(async () => {
  const [employeesRes] = await Promise.all([
    employeeApi.list({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
  ]);
  employeeOptions.value = employeesRes.data.data.map((e: any) => ({ id: e.id, name: `${e.name} (${e.employeeCode})` }));
  fetchAdvances();
});
</script>
