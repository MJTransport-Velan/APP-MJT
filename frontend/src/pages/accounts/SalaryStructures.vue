<template>
  <div>
    <h2 class="text-h6 mb-4">Salary Structures</h2>

    <AppCard class="mb-4">
      <AppCardText class="d-flex flex-wrap ga-2 align-center">
        <AppSelect v-model="employeeId" :items="employeeOptions" item-title="name" item-value="id" label="Employee" style="min-width: 260px" @update:model-value="fetchForEmployee" />
        <div class="spacer"></div>
        <AppBtn v-if="employeeId" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Salary Structure</AppBtn>
      </AppCardText>
    </AppCard>

    <template v-if="employeeId">
      <AppCard v-for="structure in store.items" :key="structure.id" class="mb-3">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span>Effective {{ new Date(structure.effectiveFrom).toLocaleDateString() }}<span v-if="structure.effectiveTo"> to {{ new Date(structure.effectiveTo).toLocaleDateString() }}</span></span>
          <div class="d-flex align-center ga-1">
            <AppChip size="small" :color="structure.isActive ? 'success' : 'default'">{{ structure.isActive ? 'Active' : 'Superseded' }}</AppChip>
            <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(structure)" />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="openDeleteConfirm(structure)" />
          </div>
        </AppCardTitle>
        <AppCardText>
          <AppTable density="compact">
            <thead><tr><th>Component</th><th>Type</th><th class="text-right">Value</th></tr></thead>
            <tbody>
              <tr v-for="c in structure.components" :key="c.id">
                <td>{{ c.name || c.componentType }}</td>
                <td><AppChip size="x-small" :color="c.isEarning ? 'success' : 'error'">{{ c.isEarning ? 'Earning' : 'Deduction' }}</AppChip></td>
                <td class="text-right">{{ formatCurrency(c.value) }}</td>
              </tr>
            </tbody>
          </AppTable>
          <div class="d-flex justify-space-between mt-2 text-subtitle-2">
            <span>Gross Earnings</span>
            <span>{{ formatCurrency(grossOf(structure)) }}</span>
          </div>
          <div class="d-flex justify-space-between text-subtitle-2">
            <span>Deductions</span>
            <span>{{ formatCurrency(deductionsOf(structure)) }}</span>
          </div>
          <div class="d-flex justify-space-between font-weight-bold">
            <span>Net</span>
            <span>{{ formatCurrency(grossOf(structure) - deductionsOf(structure)) }}</span>
          </div>
        </AppCardText>
      </AppCard>
      <p v-if="store.items.length === 0" class="text-caption text-medium-emphasis">No salary structure has been set up for this employee yet.</p>

      <AppCard class="mt-4">
        <AppCardTitle class="text-subtitle-1">Salary Payment History</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-3">
            Marked paid automatically from Financial Entry — pick this employee as the destination with purpose "Salary".
          </p>
          <AppTable density="compact">
            <thead><tr><th>Month</th><th class="text-right">Amount</th><th>Paid On</th></tr></thead>
            <tbody>
              <tr v-for="p in paymentStore.items" :key="p.id">
                <td>{{ monthLabel(p.year, p.month) }}</td>
                <td class="text-right">{{ formatCurrency(p.amount) }}</td>
                <td>{{ new Date(p.paidDate).toLocaleDateString() }}</td>
              </tr>
            </tbody>
          </AppTable>
          <p v-if="paymentStore.items.length === 0" class="text-caption text-medium-emphasis pa-2">No salary payments recorded for this employee yet.</p>
        </AppCardText>
      </AppCard>
    </template>

    <AppDialog v-model="createDialog" max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ editingId ? 'Edit Salary Structure' : 'New Salary Structure' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.effectiveFrom" type="date" label="Effective From" class="mb-3" />

          <div v-for="(c, idx) in form.components" :key="idx" class="d-flex ga-2 align-center mb-2">
            <AppSelect v-model="c.componentType" :items="componentTypeOptions" label="Component" density="compact" style="min-width: 180px" />
            <AppTextField v-model.number="c.value" type="number" label="Value" density="compact" style="max-width: 130px" />
            <AppCheckbox v-model="c.isEarning" label="Earning" density="compact" />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="removeComponent(idx)" />
          </div>
          <AppBtn variant="tonal" size="small" prepend-icon="mdi-plus" @click="addComponent">Add Component</AppBtn>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="createDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="creating" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Salary Structure"
      message="Delete this salary structure? Payments already made against it are not changed."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useSalaryStructureStore, useEmployeeSalaryPaymentStore } from '@/stores/accounts/driverPayroll';
import { employeeApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import { AppCard, AppCardTitle, AppCardText, AppCardActions, AppSelect, AppTextField, AppCheckbox, AppBtn, AppChip, AppTable, AppDialog } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import type { SalaryStructure } from '@/types/phase5.types';

const store = useSalaryStructureStore();
const paymentStore = useEmployeeSalaryPaymentStore();
const { success, error } = useSnackbar();

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

const employeeId = ref('');
const employeeOptions = ref<{ id: string; name: string }[]>([]);
const componentTypeOptions = [
  'BASIC', 'HRA', 'DA', 'SPECIAL_ALLOWANCE', 'TRAVEL_ALLOWANCE', 'MEDICAL_ALLOWANCE',
  'PF', 'ESI', 'PROFESSIONAL_TAX', 'TDS', 'OTHER_DEDUCTION', 'BONUS', 'CUSTOM',
];

function grossOf(s: SalaryStructure) { return s.components.filter((c) => c.isEarning).reduce((sum, c) => sum + Number(c.value), 0); }
function deductionsOf(s: SalaryStructure) { return s.components.filter((c) => !c.isEarning).reduce((sum, c) => sum + Number(c.value), 0); }

async function fetchForEmployee() {
  if (!employeeId.value) return;
  await Promise.all([store.fetchForEmployee(employeeId.value), paymentStore.fetchForEmployee(employeeId.value)]);
}

const createDialog = ref(false);
const creating = ref(false);
/** Set while the dialog is correcting an existing structure instead of adding one. */
const editingId = ref<string | null>(null);
const form = reactive<{ effectiveFrom: string; components: { componentType: string; value: number; isEarning: boolean }[] }>({
  effectiveFrom: new Date().toISOString().slice(0, 10),
  components: [
    { componentType: 'BASIC', value: 0, isEarning: true },
    { componentType: 'HRA', value: 0, isEarning: true },
    { componentType: 'PF', value: 0, isEarning: false },
  ],
});

function openCreateDialog() {
  Object.assign(form, {
    effectiveFrom: new Date().toISOString().slice(0, 10),
    components: [
      { componentType: 'BASIC', value: 0, isEarning: true },
      { componentType: 'HRA', value: 0, isEarning: true },
      { componentType: 'PF', value: 0, isEarning: false },
    ],
  });
  editingId.value = null;
  createDialog.value = true;
}

function openEditDialog(structure: SalaryStructure) {
  Object.assign(form, {
    effectiveFrom: String(structure.effectiveFrom).slice(0, 10),
    components: structure.components.map((c) => ({
      componentType: c.componentType,
      value: Number(c.value),
      isEarning: c.isEarning,
    })),
  });
  editingId.value = structure.id;
  createDialog.value = true;
}

function addComponent() {
  form.components.push({ componentType: 'CUSTOM', value: 0, isEarning: true });
}
function removeComponent(idx: number) {
  form.components.splice(idx, 1);
}
async function onSubmit() {
  if (!employeeId.value) return;
  if (form.components.length === 0) {
    error('Add at least one component');
    return;
  }
  creating.value = true;
  try {
    if (editingId.value) {
      await store.update(editingId.value, { effectiveFrom: form.effectiveFrom, components: form.components });
      success('Salary structure updated');
    } else {
      await store.create({ employeeId: employeeId.value, effectiveFrom: form.effectiveFrom, components: form.components });
      success('Salary structure created');
    }
    createDialog.value = false;
    fetchForEmployee();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save salary structure'));
  } finally {
    creating.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<SalaryStructure | null>(null);
const deleting = ref(false);

function openDeleteConfirm(structure: SalaryStructure) {
  deleteTarget.value = structure;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Salary structure deleted');
    deleteDialog.value = false;
    fetchForEmployee();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete salary structure'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const employeesRes = await employeeApi.list({ pageSize: 200 });
  employeeOptions.value = employeesRes.data.data.map((e: any) => ({ id: e.id, name: `${e.name} (${e.employeeCode})` }));
});
</script>
