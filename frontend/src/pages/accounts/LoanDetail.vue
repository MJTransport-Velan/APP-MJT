<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div class="d-flex align-center ga-2">
        <AppBtn
          icon="mdi-arrow-left"
          variant="text"
          size="small"
          title="Back to Loans & EMI"
          @click="goBack"
        />
        <div>
          <h2 class="text-h6 mb-1">{{ loan ? loan.loanName : "Loan" }}</h2>
          <p v-if="loan" class="text-caption text-medium-emphasis mb-0">
            {{ loan.loanNumber }} · {{ loanTypeLabel(loan.loanType) }} ·
            {{ loan.lenderName }}
            <template v-if="loan.vehicle">
              · {{ loan.vehicle.registrationNumber }}</template
            >
            <template v-else-if="loan.capitalPartner">
              · {{ loan.capitalPartner.name }}</template
            >
          </p>
        </div>
      </div>
      <AppChip v-if="loan" :color="loanStatusColor(loan.status)">{{
        loan.status
      }}</AppChip>
    </div>

    <div v-if="store.loading && !loan" class="d-flex justify-center py-8">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="loan">
      <!-- ------------------------------------------------- Loan position -->
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard
            label="Total Loan"
            :value="loan.principalAmount"
            icon="mdi-bank-outline"
            color="primary"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard
            label="Outstanding Principal"
            :value="loan.totals.outstandingPrincipal"
            icon="mdi-hand-coin-outline"
            color="warning"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard
            label="Principal Paid"
            :value="loan.totals.principalPaid"
            icon="mdi-cash-minus"
            color="success"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard
            label="Interest Paid"
            :value="loan.totals.interestPaid"
            icon="mdi-percent-outline"
            color="info"
          />
        </div>
      </div>

      <AppCard class="pa-4 mt-4">
        <div class="row row-dense">
          <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">EMI Amount</div>
          <div class="col-6 col-md-3 text-body-2 font-weight-medium">
            {{ formatCurrency(loan.emiAmount) }}
          </div>
          <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">Interest Rate</div>
          <div class="col-6 col-md-3 text-body-2 font-weight-medium">
            {{ loan.interestRatePercent }}% p.a.
          </div>

          <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">
            Total EMI Paid
          </div>
          <div class="col-6 col-md-3 text-body-2 font-weight-medium">
            {{ formatCurrency(loan.totals.totalEmiPaid) }}
          </div>
          <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">
            Paid / Remaining
          </div>
          <div class="col-6 col-md-3 text-body-2 font-weight-medium">
            {{ loan.totals.paidCount }} / {{ loan.totals.remainingEmis }} of
            {{ loan.tenureMonths }}
          </div>

          <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">Next EMI Date</div>
          <div class="col-6 col-md-3 text-body-2 font-weight-medium">
            {{ loan.totals.nextEmiDate ? formatDate(loan.totals.nextEmiDate) : "—" }}
          </div>
          <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">
            Loan Closing Date
          </div>
          <div class="col-6 col-md-3 text-body-2 font-weight-medium">
            {{
              loan.totals.loanClosingDate ? formatDate(loan.totals.loanClosingDate) : "—"
            }}
          </div>

          <template v-if="loan.totals.overdueCount > 0">
            <div class="col-6 col-md-3 text-body-2 text-medium-emphasis">Overdue EMI</div>
            <div class="col-6 col-md-3 text-body-2 font-weight-medium text-error">
              {{ loan.totals.overdueCount }}
            </div>
          </template>
        </div>
      </AppCard>

      <!-- ---------------------------------------------------- Schedule -->
      <AppCard class="pa-4 mt-4">
        <div class="d-flex flex-wrap align-center justify-space-between mb-3 ga-2">
          <div class="text-subtitle-2">EMI Schedule</div>
          <AppBtn
            v-if="nextPayable"
            color="primary"
            size="small"
            prepend-icon="mdi-cash-check"
            @click="openPayDialog(nextPayable)"
            >Pay Next EMI</AppBtn
          >
        </div>

        <div class="tblwrap">
          <AppTable density="compact">
            <thead>
              <tr>
                <th>EMI No.</th>
                <th>Due Date</th>
                <th class="text-right">EMI</th>
                <th class="text-right">Principal</th>
                <th class="text-right">Interest</th>
                <th>Status</th>
                <th>Paid On</th>
                <th>Reference</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in loan.installments" :key="i.id">
                <td>{{ i.installmentNo }}</td>
                <td>{{ formatDate(i.dueDate) }}</td>
                <td class="text-right">{{ formatCurrency(i.emiAmount) }}</td>
                <td class="text-right">{{ formatCurrency(i.principalComponent) }}</td>
                <td class="text-right">{{ formatCurrency(i.interestComponent) }}</td>
                <td>
                  <AppChip size="x-small" :color="emiStatusColor(i.status)">{{
                    i.status
                  }}</AppChip>
                </td>
                <td>{{ i.paidDate ? formatDate(i.paidDate) : "—" }}</td>
                <td>{{ i.referenceNumber || "—" }}</td>
                <td class="text-right">
                  <AppBtn
                    v-if="i.status !== 'PAID' && i.status !== 'WAIVED'"
                    size="small"
                    variant="tonal"
                    color="primary"
                    @click="openPayDialog(i)"
                    >Pay</AppBtn
                  >
                  <AppBtn
                    v-else-if="i.status === 'PAID'"
                    size="small"
                    variant="text"
                    color="error"
                    @click="onReverse(i)"
                    >Reverse</AppBtn
                  >
                </td>
              </tr>
            </tbody>
          </AppTable>
        </div>
      </AppCard>
    </template>

    <!-- ------------------------------------------------------ Pay EMI -->
    <MasterFormDialog
      v-model="payDialog"
      title="Pay EMI"
      :loading="paying"
      @submit="onPay"
    >
      <template v-if="payTarget && loan">
        <p class="text-caption text-medium-emphasis mb-3">
          Saving this debits the payment account, reduces the loan outstanding and records
          the Financial Entry automatically.
        </p>

        <div class="d-flex ga-2">
          <AppTextField
            :model-value="loan.vehicle?.registrationNumber || '—'"
            label="Vehicle"
            readonly
            density="compact"
            class="mb-2 flex-1-1"
          />
          <AppTextField
            :model-value="loan.loanNumber"
            label="Loan"
            readonly
            density="compact"
            class="mb-2 flex-1-1"
          />
        </div>
        <div class="d-flex ga-2">
          <AppTextField
            v-model="payForm.paidDate"
            type="date"
            label="EMI Date"
            class="mb-2 flex-1-1"
          />
          <AppTextField
            v-model.number="payForm.paidAmount"
            type="number"
            label="EMI Amount"
            :error-messages="payErrors.paidAmount"
            class="mb-2 flex-1-1"
          />
        </div>
        <div class="d-flex ga-2">
          <AppTextField
            v-model.number="payForm.principalComponent"
            type="number"
            label="Principal"
            class="mb-2 flex-1-1"
          />
          <AppTextField
            v-model.number="payForm.interestComponent"
            type="number"
            label="Interest"
            class="mb-2 flex-1-1"
          />
        </div>
        <AppAlert v-if="splitMismatch" type="warning" density="compact" class="mb-2">
          Principal + Interest ({{ formatCurrency(splitTotal) }}) must equal the EMI
          amount ({{ formatCurrency(payForm.paidAmount || 0) }}).
        </AppAlert>

        <AppSelect
          v-model="payForm.fundAccountKey"
          :items="fundAccountOptions"
          item-title="label"
          item-value="key"
          label="Payment From"
          :error-messages="payErrors.fundAccountKey"
          class="mb-2"
        />
        <AppSelect
          v-model="payForm.paymentModeId"
          :items="paymentModeOptions"
          item-title="name"
          item-value="id"
          label="Payment Mode"
          clearable
          class="mb-2"
        />
        <AppTextField
          v-model="payForm.referenceNumber"
          label="Reference Number"
          class="mb-2"
        />
        <AppTextarea v-model="payForm.remarks" label="Remarks" rows="2" class="mb-2" />
      </template>
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLoanStore } from '@/stores/accounts/loans';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { createMasterApi } from '@/services/masterApiFactory';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency, formatDate } from '@/utils/format';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { AppBtn, AppSelect, AppTextField, AppTextarea, AppChip, AppCard, AppTable, AppAlert, AppProgressCircular } from '@/components/ui';
import { LOAN_TYPE_LABELS, type LoanInstallment, type LoanInstallmentStatus, type LoanType } from '@/types/loans.types';

const paymentModeApi = createMasterApi<{ id: string; name: string }>('/masters/payment-modes');

const route = useRoute();
const router = useRouter();
const store = useLoanStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const loan = computed(() => store.current);
const loanId = computed(() => String(route.params.id));
const paymentModeOptions = ref<{ id: string; name: string }[]>([]);

function loanTypeLabel(t: LoanType) {
  return LOAN_TYPE_LABELS[t] ?? t;
}
function loanStatusColor(s: string) {
  return ({ ACTIVE: 'success', CLOSED: 'default', FORECLOSED: 'warning' } as Record<string, string>)[s] || 'default';
}
function emiStatusColor(s: LoanInstallmentStatus) {
  return ({ PAID: 'success', PENDING: 'warning', OVERDUE: 'error', WAIVED: 'info' } as Record<string, string>)[s] || 'default';
}

function goBack() {
  router.push('/accounts/loans');
}

/** The oldest still-unpaid installment — what "Pay Next EMI" targets. */
const nextPayable = computed(() => loan.value?.installments.find((i) => i.status === 'PENDING' || i.status === 'OVERDUE') ?? null);

const fundAccountOptions = computed(() => [
  ...bankAccountStore.items.map((b: any) => ({ key: `BANK:${b.id}`, label: `Bank — ${b.accountHolderName} (${b.accountNumber})` })),
  ...cashAccountStore.items.map((c: any) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.ledger?.name || c.cashAccountType}` })),
]);

const payDialog = ref(false);
const paying = ref(false);
const payTarget = ref<LoanInstallment | null>(null);
const payForm = reactive({
  paidDate: new Date().toISOString().slice(0, 10),
  paidAmount: 0,
  principalComponent: 0,
  interestComponent: 0,
  fundAccountKey: '',
  paymentModeId: '',
  referenceNumber: '',
  remarks: '',
});
const payErrors = reactive({ paidAmount: '', fundAccountKey: '' });

const splitTotal = computed(() => Number(payForm.principalComponent || 0) + Number(payForm.interestComponent || 0));
const splitMismatch = computed(() => Math.abs(splitTotal.value - Number(payForm.paidAmount || 0)) > 0.01);

function openPayDialog(installment: LoanInstallment) {
  payTarget.value = installment;
  Object.assign(payErrors, { paidAmount: '', fundAccountKey: '' });
  Object.assign(payForm, {
    paidDate: new Date().toISOString().slice(0, 10),
    paidAmount: installment.emiAmount,
    principalComponent: installment.principalComponent,
    interestComponent: installment.interestComponent,
    // Defaults to the account the loan itself is paid from.
    fundAccountKey: loan.value ? `${loan.value.fundAccountType}:${loan.value.fundAccountId}` : '',
    paymentModeId: '',
    referenceNumber: '',
    remarks: '',
  });
  payDialog.value = true;
}

async function onPay() {
  if (!payTarget.value) return;
  payErrors.paidAmount = payForm.paidAmount > 0 ? '' : 'EMI amount must be greater than 0';
  payErrors.fundAccountKey = payForm.fundAccountKey ? '' : 'A payment account must be selected';
  if (payErrors.paidAmount || payErrors.fundAccountKey || splitMismatch.value) return;

  const [fundAccountType, fundAccountId] = payForm.fundAccountKey.split(':');
  paying.value = true;
  try {
    await store.payEmi(loanId.value, payTarget.value.id, {
      paidDate: payForm.paidDate,
      paidAmount: payForm.paidAmount,
      principalComponent: payForm.principalComponent,
      interestComponent: payForm.interestComponent,
      fundAccountType,
      fundAccountId,
      paymentModeId: payForm.paymentModeId || undefined,
      referenceNumber: payForm.referenceNumber || undefined,
      remarks: payForm.remarks || undefined,
    });
    success('EMI paid — bank balance, loan outstanding and Financial Entry updated');
    payDialog.value = false;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to pay EMI'));
  } finally {
    paying.value = false;
  }
}

async function onReverse(installment: LoanInstallment) {
  try {
    await store.reverseEmi(loanId.value, installment.id);
    success(`EMI ${installment.installmentNo} reversed`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reverse EMI'));
  }
}

async function load() {
  await store.fetchById(loanId.value);
  // ?pay=1 arrives from the dashboard's Pay EMI button — open straight onto
  // the next due installment instead of making the user find it.
  if (route.query.pay && nextPayable.value) {
    openPayDialog(nextPayable.value);
    router.replace({ path: route.path });
  }
}

watch(() => route.params.id, load);

onMounted(async () => {
  await Promise.all([
    bankAccountStore.fetchList({ pageSize: 200 }),
    cashAccountStore.fetchList({ pageSize: 200 }),
    paymentModeApi.list({ pageSize: 100 }).then((r: any) => { paymentModeOptions.value = r.data.data; }).catch(() => { paymentModeOptions.value = []; }),
  ]);
  await load();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
