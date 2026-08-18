<template>
  <div>
    <h2 class="text-h6 mb-4">Driver Salary Structures</h2>

    <AppCard class="mb-4">
      <AppCardText class="d-flex flex-wrap ga-2 align-center">
        <AppSelect
          v-model="driverId"
          :items="driverOptions"
          item-title="name"
          item-value="id"
          label="Driver"
          style="min-width: 260px"
          @update:model-value="fetchForDriver"
        />
        <div class="spacer"></div>
        <AppBtn v-if="driverId" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Salary Structure</AppBtn>
      </AppCardText>
    </AppCard>

    <template v-if="driverId">
      <AppCard v-for="structure in store.items" :key="structure.id" class="mb-3">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span>Effective {{ new Date(structure.effectiveFrom).toLocaleDateString() }}</span>
          <AppChip size="small" :color="structure.isActive ? 'success' : 'default'">{{ structure.isActive ? 'Active' : 'Superseded' }}</AppChip>
        </AppCardTitle>
        <AppCardText>
          <div v-if="structure.salaryType === 'FIXED'" class="d-flex justify-space-between text-subtitle-2">
            <span>Fixed Monthly Salary</span>
            <span class="font-weight-bold">{{ formatCurrency(structure.fixedAmount || 0) }}</span>
          </div>
          <div v-else class="d-flex justify-space-between text-subtitle-2">
            <span>% of Freight Charges (per month's completed trips)</span>
            <span class="font-weight-bold">{{ structure.percentValue }}%</span>
          </div>
        </AppCardText>
      </AppCard>
      <p v-if="!store.loading && store.items.length === 0" class="text-caption text-medium-emphasis">
        No salary structure has been set up for this driver yet.
      </p>

      <AppCard class="mt-4">
        <AppCardTitle class="text-subtitle-1">Salary Payment History</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-3">
            Marked paid automatically from Financial Entry's Salary Entry toggle, against this driver.
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
          <p v-if="paymentStore.items.length === 0" class="text-caption text-medium-emphasis pa-2">No salary payments recorded for this driver yet.</p>
        </AppCardText>
      </AppCard>
    </template>

    <AppDialog v-model="createDialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">New Salary Structure</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.effectiveFrom" type="date" label="Effective From" class="mb-3" />

          <AppBtnToggle class="mb-3">
            <AppBtn :variant="form.salaryType === 'FIXED' ? 'flat' : 'text'" :color="form.salaryType === 'FIXED' ? 'primary' : undefined" @click="form.salaryType = 'FIXED'">
              Fixed
            </AppBtn>
            <AppBtn :variant="form.salaryType === 'PERCENT_OF_FREIGHT' ? 'flat' : 'text'" :color="form.salaryType === 'PERCENT_OF_FREIGHT' ? 'primary' : undefined" @click="form.salaryType = 'PERCENT_OF_FREIGHT'">
              % of Freight
            </AppBtn>
          </AppBtnToggle>

          <AppTextField
            v-if="form.salaryType === 'FIXED'"
            v-model.number="form.fixedAmount"
            type="number"
            label="Monthly Salary Amount"
            :error-messages="errors.fixedAmount"
          />
          <AppTextField
            v-else
            v-model.number="form.percentValue"
            type="number"
            label="Percentage of Freight Charges"
            suffix="%"
            :error-messages="errors.percentValue"
          />
          <p class="text-caption text-medium-emphasis mt-1">
            Applied to the freight amount of this driver's COMPLETED trips in each settlement period.
          </p>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="createDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="creating" @click="onCreate">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useDriverSalaryStructureStore, useDriverSalaryPaymentStore } from '@/stores/accounts/driverPayroll';
import { driverApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import { AppCard, AppCardTitle, AppCardText, AppCardActions, AppSelect, AppTextField, AppBtn, AppBtnToggle, AppChip, AppDialog, AppTable } from '@/components/ui';
import type { DriverSalaryType } from '@/types/phase5.types';

const store = useDriverSalaryStructureStore();
const paymentStore = useDriverSalaryPaymentStore();
const { success, error } = useSnackbar();

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

const driverId = ref('');
const driverOptions = ref<{ id: string; name: string }[]>([]);

async function fetchForDriver() {
  if (!driverId.value) return;
  await Promise.all([store.fetchForDriver(driverId.value), paymentStore.fetchForDriver(driverId.value)]);
}

const createDialog = ref(false);
const creating = ref(false);
const form = reactive<{ salaryType: DriverSalaryType; fixedAmount: number | undefined; percentValue: number | undefined; effectiveFrom: string }>({
  salaryType: 'FIXED',
  fixedAmount: undefined,
  percentValue: undefined,
  effectiveFrom: new Date().toISOString().slice(0, 10),
});
const errors = reactive({ fixedAmount: '', percentValue: '' });

function openCreateDialog() {
  Object.assign(form, { salaryType: 'FIXED', fixedAmount: undefined, percentValue: undefined, effectiveFrom: new Date().toISOString().slice(0, 10) });
  Object.assign(errors, { fixedAmount: '', percentValue: '' });
  createDialog.value = true;
}

function validateForm(): boolean {
  errors.fixedAmount = form.salaryType === 'FIXED' && !(form.fixedAmount && form.fixedAmount > 0) ? 'Enter a valid monthly salary amount' : '';
  errors.percentValue =
    form.salaryType === 'PERCENT_OF_FREIGHT' && !(form.percentValue && form.percentValue > 0 && form.percentValue <= 100)
      ? 'Enter a percentage between 0 and 100'
      : '';
  return !errors.fixedAmount && !errors.percentValue;
}

async function onCreate() {
  if (!driverId.value || !validateForm()) return;
  creating.value = true;
  try {
    await store.create({
      driverId: driverId.value,
      salaryType: form.salaryType,
      fixedAmount: form.salaryType === 'FIXED' ? form.fixedAmount : undefined,
      percentValue: form.salaryType === 'PERCENT_OF_FREIGHT' ? form.percentValue : undefined,
      effectiveFrom: form.effectiveFrom,
    });
    success('Salary structure created');
    createDialog.value = false;
    fetchForDriver();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create salary structure'));
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  const driversRes = await driverApi.list({ pageSize: 200 });
  driverOptions.value = driversRes.data.data.map((d: any) => ({ id: d.id, name: `${d.name} (${d.code})` }));
});
</script>
