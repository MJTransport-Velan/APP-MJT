<template>
  <div>
    <h2 class="text-h6 mb-4">Outstanding &amp; Expense Reports</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="driverOutstanding">Driver Outstanding</AppTab>
      <AppTab value="employeeOutstanding">Employee Outstanding</AppTab>
      <AppTab value="expense">Expense Analysis</AppTab>
    </AppTabs>

    <div v-if="activeTab === 'expense'" class="d-flex ga-2 mb-4">
      <AppTextField v-model="from" type="date" label="From" density="compact" hide-details style="max-width: 160px" @update:model-value="fetchActive" />
      <AppTextField v-model="to" type="date" label="To" density="compact" hide-details style="max-width: 160px" @update:model-value="fetchActive" />
    </div>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="driverOutstanding">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Driver</th><th>Code</th><th class="text-right">Outstanding</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in driverOutstanding?.rows || []" :key="i">
                  <td>{{ r.driverName }}</td><td>{{ r.driverCode }}</td><td class="text-right">{{ formatCurrency(r.outstanding) }}</td>
                </tr>
              </tbody>
              <tfoot v-if="driverOutstanding"><tr class="font-weight-bold"><td colspan="2">Total</td><td class="text-right">{{ formatCurrency(driverOutstanding.total) }}</td></tr></tfoot>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="employeeOutstanding">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Employee</th><th>Code</th><th class="text-right">Outstanding</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in employeeOutstanding?.rows || []" :key="i">
                  <td>{{ r.employeeName }}</td><td>{{ r.employeeCode }}</td><td class="text-right">{{ formatCurrency(r.outstanding) }}</td>
                </tr>
              </tbody>
              <tfoot v-if="employeeOutstanding"><tr class="font-weight-bold"><td colspan="2">Total</td><td class="text-right">{{ formatCurrency(employeeOutstanding.total) }}</td></tr></tfoot>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="expense">
        <FinancialSummary v-if="expenseAnalysis" :cards="[{ label: 'Vehicle Cost', value: expenseAnalysis.totalVehicleExpense }, { label: 'Driver Cost', value: expenseAnalysis.driverCost }, { label: 'Grand Total', value: expenseAnalysis.grandTotal }]" class="mb-3" />
        <div class="row">
          <div class="col-12 col-md-6">
            <AppCard class="pa-4">
              <div class="text-subtitle-2 mb-2">Vehicle Expense by Category</div>
              <div v-for="c in expenseAnalysis?.vehicleExpenseByCategory || []" :key="c.category" class="d-flex justify-space-between text-body-2 mb-1"><span>{{ c.category }}</span><span>{{ formatCurrency(c.amount) }}</span></div>
            </AppCard>
          </div>
        </div>
      </AppWindowItem>
    </AppWindow>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { outstandingReportApi, expenseAnalysisApi } from '@/services/accounts/financialReporting';
import { formatCurrency } from '@/utils/format';
import FinancialSummary from '@/components/accounts/FinancialSummary.vue';
import { AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppTable, AppTextField } from '@/components/ui';
import type { OutstandingResult, ExpenseAnalysisResult } from '@/types/phase7.types';

const activeTab = ref('driverOutstanding');
const now = new Date();
const from = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
const to = ref(now.toISOString().slice(0, 10));

const driverOutstanding = ref<OutstandingResult | null>(null);
const employeeOutstanding = ref<OutstandingResult | null>(null);
const expenseAnalysis = ref<ExpenseAnalysisResult | null>(null);

async function fetchActive() {
  if (activeTab.value === 'driverOutstanding') driverOutstanding.value = (await outstandingReportApi.driver()).data.data;
  else if (activeTab.value === 'employeeOutstanding') employeeOutstanding.value = (await outstandingReportApi.employee()).data.data;
  else if (activeTab.value === 'expense') expenseAnalysis.value = (await expenseAnalysisApi.analyze({ from: from.value, to: to.value })).data.data;
}

watch(activeTab, fetchActive);
onMounted(fetchActive);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
