<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Capital &amp; Owner Funds</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Owner capital is money that stays in the business (equity); an owner loan is money the business owes back (liability)
        </p>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <AppBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-account-multiple-outline"
          @click="openManagePartners"
          >Manage Partners</AppBtn
        >
        <AppBtn
          color="success"
          size="small"
          prepend-icon="mdi-cash-plus"
          @click="openRecord('CONTRIBUTION')"
          >Record Owner Funds</AppBtn
        >
        <AppBtn
          color="error"
          size="small"
          prepend-icon="mdi-cash-minus"
          @click="openRecord('WITHDRAWAL')"
          >Record Withdrawal / Repayment</AppBtn
        >
      </div>
    </div>

    <div class="row mb-4">
      <div class="col-12 col-sm-3">
        <ProfitCard
          label="Owner Capital (Equity)"
          :value="totals.capitalBalance"
          icon="mdi-wallet-outline"
          color="primary"
        />
      </div>
      <div class="col-12 col-sm-3">
        <ProfitCard
          label="Owner Loan (Liability)"
          :value="totals.ownerLoanBalance"
          icon="mdi-hand-coin-outline"
          color="warning"
        />
      </div>
      <div class="col-12 col-sm-3">
        <ProfitCard
          label="Total Funds In"
          :value="totals.fundsIn"
          icon="mdi-cash-plus"
          color="success"
        />
      </div>
      <div class="col-12 col-sm-3">
        <ProfitCard
          label="Total Funds Out"
          :value="totals.fundsOut"
          icon="mdi-cash-minus"
          color="error"
        />
      </div>
    </div>

    <p class="text-caption text-medium-emphasis mb-4">
      Funds In = capital contributions + owner loans received &nbsp;·&nbsp; Funds Out = capital
      withdrawals + owner loan repayments
    </p>

    <AppCard class="pa-4 mb-4 mt-4">
      <div class="text-subtitle-2 mb-2">Partner-wise Balance</div>
      <div v-if="partnerBalances.length === 0" class="text-caption text-medium-emphasis">
        No partners yet — click "Manage Partners" to add one.
      </div>
      <div
        v-for="p in partnerBalances"
        :key="p.partner.id"
        class="bs-row"
        @click="viewPartner(p.partner.id)"
      >
        <span>{{ p.partner.name }}</span>
        <!-- Capital and owner loan are shown side by side, never as one number. -->
        <span class="d-flex align-center ga-3">
          <span class="text-caption text-medium-emphasis">
            Capital
            <span class="font-weight-medium text-high-emphasis">{{ formatCurrency(p.capitalBalance ?? p.netBalance) }}</span>
          </span>
          <span v-if="(p.ownerLoanBalance ?? 0) !== 0" class="text-caption text-medium-emphasis">
            Owner Loan
            <span class="font-weight-medium text-warning">{{ formatCurrency(p.ownerLoanBalance) }}</span>
          </span>
          <AppIcon icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
        </span>
      </div>
    </AppCard>

    <AppCard>
      <div class="pa-4 pb-0 text-subtitle-2">Transactions</div>
      <div class="tblwrap pa-4">
        <AppTable density="compact">
          <thead>
            <tr>
              <th>Date</th>
              <th>Number</th>
              <th>Partner</th>
              <th>Type</th>
              <th class="text-right">Amount</th>
              <th>Fund Account</th>
              <th>Remarks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transactions" :key="t.id">
              <td>{{ formatDate(t.transactionDate) }}</td>
              <td>{{ t.transactionNumber }}</td>
              <td>{{ t.partner.name }}</td>
              <td>
                <AppChip size="x-small" :color="typeColor(t.type)">{{
                  CAPITAL_TRANSACTION_LABELS[t.type]
                }}</AppChip>
              </td>
              <td class="text-right">{{ formatCurrency(t.amount) }}</td>
              <td>{{ t.fundAccountType }}</td>
              <td>{{ t.remarks || "-" }}</td>
              <td class="text-right">
                <AppBtn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  @click="openEdit(t)"
                />
                <AppBtn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="error"
                  @click="onDelete(t.id)"
                />
              </td>
            </tr>
          </tbody>
        </AppTable>
        <p
          v-if="!loading && transactions.length === 0"
          class="text-caption text-medium-emphasis mt-2"
        >
          No transactions recorded yet.
        </p>
      </div>
    </AppCard>

    <!-- Record owner money in / out -->
    <AppDialog v-model="recordDialog.open" max-width="480">
      <AppCardTitle>{{
        editingId
          ? "Edit Owner Transaction"
          : isMoneyIn
            ? "Record Owner Funds Received"
            : "Record Withdrawal / Repayment"
      }}</AppCardTitle>
      <AppCardText>
        <AppSelect
          v-model="form.partnerId"
          :items="partnerOptions"
          label="Owner / Partner"
          class="mb-3"
          required
        />
        <!-- The classification IS the decision this screen exists to capture. -->
        <AppSelect
          v-model="form.type"
          :items="typeOptions"
          label="Type"
          class="mb-1"
          required
        />
        <p class="text-caption text-medium-emphasis mb-3">{{ typeHint }}</p>
        <AppTextField
          v-model.number="form.amount"
          type="number"
          label="Amount"
          class="mb-3"
          required
        />
        <AppTextField
          v-model="form.transactionDate"
          type="date"
          label="Date"
          class="mb-3"
        />
        <AppSelect
          v-model="form.fundAccountType"
          :items="fundAccountTypeOptions"
          label="Fund Account Type"
          class="mb-3"
          @update:model-value="form.fundAccountId = ''"
        />
        <AppSelect
          v-model="form.fundAccountId"
          :items="fundAccountOptions"
          label="Bank / Cash Account"
          class="mb-3"
          required
        />
        <AppTextarea v-model="form.remarks" label="Remarks" rows="2" />
      </AppCardText>
      <AppCardActions>
        <AppBtn variant="text" @click="recordDialog.open = false">Cancel</AppBtn>
        <AppBtn
          :color="isMoneyIn ? 'success' : 'error'"
          :loading="saving"
          @click="submitRecord"
          >{{ editingId ? "Save Changes" : "Save" }}</AppBtn
        >
      </AppCardActions>
    </AppDialog>

    <!-- Manage Partners -->
    <AppDialog v-model="partnersDialog.open" max-width="440">
      <AppCardTitle class="d-flex justify-space-between align-center">
        Capital Partners
        <AppBtn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="partnersDialog.open = false"
        />
      </AppCardTitle>
      <AppCardText>
        <div class="d-flex ga-2 mb-3">
          <AppTextField
            v-model="newPartnerName"
            label="New partner name"
            hide-details
            density="compact"
          />
          <AppBtn color="primary" :loading="addingPartner" @click="addPartner"
            >Add</AppBtn
          >
        </div>
        <div
          v-for="p in partners"
          :key="p.id"
          class="d-flex justify-space-between text-body-2 mb-1"
        >
          <span>{{ p.name }}</span>
          <AppChip size="x-small" :color="p.isActive ? 'success' : 'default'">{{
            p.isActive ? "Active" : "Inactive"
          }}</AppChip>
        </div>
        <p v-if="partners.length === 0" class="text-caption text-medium-emphasis">
          No partners yet.
        </p>
      </AppCardText>
    </AppDialog>

    <!-- Partner statement -->
    <AppDialog v-model="partnerStateDialog.open" max-width="480">
      <AppCardTitle class="d-flex justify-space-between align-center">
        {{ partnerStateDialog.data?.partner.name }}
        <AppBtn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="partnerStateDialog.open = false"
        />
      </AppCardTitle>
      <AppCardText>
        <div v-if="partnerStateDialog.loading" class="d-flex justify-center pa-4">
          <AppProgressCircular indeterminate color="primary" size="32" />
        </div>
        <template v-else-if="partnerStateDialog.data">
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span class="text-medium-emphasis">Total Contributed</span
            ><span>{{ formatCurrency(partnerStateDialog.data.totalContributed) }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span class="text-medium-emphasis">Total Withdrawn</span
            ><span>{{ formatCurrency(partnerStateDialog.data.totalWithdrawn) }}</span>
          </div>
          <div class="d-flex justify-space-between font-weight-bold mb-3">
            <span>Capital Balance</span
            ><span>{{
              formatCurrency(
                partnerStateDialog.data.capitalBalance ?? partnerStateDialog.data.netBalance
              )
            }}</span>
          </div>
          <template v-if="hasOwnerLoanActivity">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span class="text-medium-emphasis">Owner Loan Received</span
              ><span>{{ formatCurrency(partnerStateDialog.data.ownerLoanReceived) }}</span>
            </div>
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span class="text-medium-emphasis">Owner Loan Repaid</span
              ><span>{{ formatCurrency(partnerStateDialog.data.ownerLoanRepaid) }}</span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold mb-3">
              <span>Owner Loan Balance</span
              ><span class="text-warning">{{
                formatCurrency(partnerStateDialog.data.ownerLoanBalance)
              }}</span>
            </div>
          </template>
          <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
            Transactions ({{ partnerStateDialog.data.transactions.length }})
          </div>
          <div
            v-for="t in partnerStateDialog.data.transactions"
            :key="t.id"
            class="d-flex justify-space-between text-body-2 mb-1"
          >
            <span
              >{{ formatDate(t.transactionDate) }} —
              {{ CAPITAL_TRANSACTION_LABELS[t.type] }}</span
            >
            <span>{{ formatCurrency(t.amount) }}</span>
          </div>
        </template>
      </AppCardText>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { capitalTransactionApi } from "@/services/accounts/capitalTransaction";
import { createMasterApi } from "@/services/masterApiFactory";
import { bankAccountApi, cashAccountApi } from "@/services/banking";
import { formatCurrency, localDateStr } from "@/utils/format";
import { useSnackbar } from "@/composables/useSnackbar";
import ProfitCard from "@/components/accounts/ProfitCard.vue";
import {
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppBtn,
  AppTable,
  AppChip,
  AppDialog,
  AppSelect,
  AppTextField,
  AppTextarea,
  AppProgressCircular,
  AppIcon,
} from "@/components/ui";
import { CAPITAL_TRANSACTION_LABELS } from "@/types/capitalTransaction.types";
import type {
  CapitalTransaction,
  CapitalTransactionType,
  CapitalPartnerState,
} from "@/types/capitalTransaction.types";

interface CapitalPartner {
  id: string;
  name: string;
  isActive: boolean;
}
const capitalPartnerApi = createMasterApi<CapitalPartner>("/masters/capital-partners");

const { success, error: showError } = useSnackbar();

const loading = ref(false);
const saving = ref(false);
const transactions = ref<CapitalTransaction[]>([]);
const partners = ref<CapitalPartner[]>([]);
const bankAccounts = ref<{ id: string; accountHolderName: string }[]>([]);
const cashAccounts = ref<{ id: string; cashAccountType: string }[]>([]);
const partnerBalances = ref<CapitalPartnerState[]>([]);

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Equity and liability are totalled separately and never added together —
// that separation is the whole point of this screen (spec §12).
const totals = computed(() => ({
  capitalBalance: partnerBalances.value.reduce((s, p) => s + (p.capitalBalance ?? p.netBalance), 0),
  ownerLoanBalance: partnerBalances.value.reduce((s, p) => s + (p.ownerLoanBalance ?? 0), 0),
  // Cash movement, not a balance: every rupee the owners put in / took out,
  // across both instruments. Contributions and owner loans are still never
  // merged into a single balance — the two cards above keep those apart.
  fundsIn: partnerBalances.value.reduce(
    (s, p) => s + p.totalContributed + (p.ownerLoanReceived ?? 0),
    0
  ),
  fundsOut: partnerBalances.value.reduce(
    (s, p) => s + p.totalWithdrawn + (p.ownerLoanRepaid ?? 0),
    0
  ),
}));

const partnerOptions = computed(() =>
  partners.value.filter((p) => p.isActive).map((p) => ({ title: p.name, value: p.id }))
);
const fundAccountTypeOptions = [
  { title: "Bank", value: "BANK" },
  { title: "Cash", value: "CASH" },
];
const fundAccountOptions = computed(() =>
  form.value.fundAccountType === "BANK"
    ? bankAccounts.value.map((b) => ({ title: b.accountHolderName, value: b.id }))
    : cashAccounts.value.map((c) => ({ title: c.cashAccountType, value: c.id }))
);

async function loadPartnerBalances() {
  if (partners.value.length === 0) {
    partnerBalances.value = [];
    return;
  }
  const results = await Promise.all(
    partners.value
      .filter((p) => p.isActive)
      .map((p) => capitalTransactionApi.partnerState(p.id))
  );
  partnerBalances.value = results
    .map((r) => r.data.data)
    // A partner who has only ever lent the business money still belongs in
    // this list, so owner-loan activity counts too.
    .filter(
      (d) =>
        d.totalContributed > 0 ||
        d.totalWithdrawn > 0 ||
        (d.ownerLoanReceived ?? 0) > 0 ||
        (d.ownerLoanRepaid ?? 0) > 0
    );
}

async function loadAll() {
  loading.value = true;
  try {
    const [txRes, partnersRes, banksRes, cashRes] = await Promise.all([
      capitalTransactionApi.list({ pageSize: 200 }),
      capitalPartnerApi.list({ pageSize: 200 }),
      bankAccountApi.list({ pageSize: 200 }),
      cashAccountApi.list({ pageSize: 200 }),
    ]);
    transactions.value = txRes.data.data;
    partners.value = partnersRes.data.data;
    bankAccounts.value = (banksRes.data.data as unknown) as {
      id: string;
      accountHolderName: string;
    }[];
    cashAccounts.value = (cashRes.data.data as unknown) as {
      id: string;
      cashAccountType: string;
    }[];
    await loadPartnerBalances();
  } catch (e) {
    showError("Failed to load Capital Account data");
  } finally {
    loading.value = false;
  }
}

// --- Record dialog ---
const recordDialog = ref<{ open: boolean; type: CapitalTransactionType }>({
  open: false,
  type: "CONTRIBUTION",
});
/** Set while the dialog is correcting an existing transaction rather than recording a new one. */
const editingId = ref<string | null>(null);
const form = ref({
  partnerId: "",
  type: "CONTRIBUTION" as CapitalTransactionType,
  amount: 0,
  transactionDate: localDateStr(),
  fundAccountType: "BANK" as "BANK" | "CASH",
  fundAccountId: "",
  remarks: "",
});

const MONEY_IN_TYPES: CapitalTransactionType[] = ["CONTRIBUTION", "OWNER_LOAN_RECEIVED"];
const isMoneyIn = computed(() => MONEY_IN_TYPES.includes(form.value.type));

/** Green for money in, red for money out; owner-loan types are tinted to read as debt. */
function typeColor(type: CapitalTransactionType) {
  return (
    {
      CONTRIBUTION: "success",
      WITHDRAWAL: "error",
      OWNER_LOAN_RECEIVED: "warning",
      OWNER_LOAN_REPAYMENT: "info",
    } as Record<CapitalTransactionType, string>
  )[type];
}

/** The dialog offers only the two types matching its direction, so money-in and money-out never mix. */
const typeOptions = computed(() =>
  (isMoneyIn.value
    ? (["CONTRIBUTION", "OWNER_LOAN_RECEIVED"] as CapitalTransactionType[])
    : (["WITHDRAWAL", "OWNER_LOAN_REPAYMENT"] as CapitalTransactionType[])
  ).map((value) => ({ title: CAPITAL_TRANSACTION_LABELS[value], value }))
);

const TYPE_HINTS: Record<CapitalTransactionType, string> = {
  CONTRIBUTION: "Permanent investment — increases Owner Capital under EQUITY.",
  WITHDRAWAL: "A drawing against capital — reduces Owner Capital under EQUITY.",
  OWNER_LOAN_RECEIVED: "Money the business must repay — increases Owner Loan under LIABILITIES.",
  OWNER_LOAN_REPAYMENT: "Repays an owner loan — reduces Owner Loan under LIABILITIES. This is not a capital withdrawal.",
};
const typeHint = computed(() => TYPE_HINTS[form.value.type]);

function openRecord(type: CapitalTransactionType) {
  form.value = {
    partnerId: "",
    type,
    amount: 0,
    transactionDate: localDateStr(),
    fundAccountType: "BANK",
    fundAccountId: "",
    remarks: "",
  };
  editingId.value = null;
  recordDialog.value = { open: true, type };
}

function openEdit(transaction: CapitalTransaction) {
  form.value = {
    partnerId: transaction.partner.id,
    type: transaction.type,
    amount: Number(transaction.amount),
    transactionDate: transaction.transactionDate?.slice(0, 10) || localDateStr(),
    fundAccountType: transaction.fundAccountType as "BANK" | "CASH",
    fundAccountId: transaction.fundAccountId,
    remarks: transaction.remarks || "",
  };
  editingId.value = transaction.id;
  recordDialog.value = { open: true, type: transaction.type };
}

async function submitRecord() {
  if (!form.value.partnerId || !form.value.amount || !form.value.fundAccountId) {
    showError("Partner, amount and fund account are required");
    return;
  }
  saving.value = true;
  try {
    const payload = {
      partnerId: form.value.partnerId,
      type: form.value.type,
      amount: form.value.amount,
      transactionDate: form.value.transactionDate,
      fundAccountType: form.value.fundAccountType,
      fundAccountId: form.value.fundAccountId,
      remarks: form.value.remarks || undefined,
    };
    if (editingId.value) {
      await capitalTransactionApi.update(editingId.value, payload);
      success(`${CAPITAL_TRANSACTION_LABELS[form.value.type]} updated`);
    } else {
      await capitalTransactionApi.create(payload);
      success(`${CAPITAL_TRANSACTION_LABELS[form.value.type]} recorded`);
    }
    recordDialog.value.open = false;
    await loadAll();
  } catch (e) {
    showError(editingId.value ? "Failed to update transaction" : "Failed to record transaction");
  } finally {
    saving.value = false;
  }
}

async function onDelete(id: string) {
  try {
    await capitalTransactionApi.remove(id);
    success("Transaction deleted");
    await loadAll();
  } catch (e) {
    showError("Failed to delete transaction");
  }
}

// --- Manage Partners dialog ---
const partnersDialog = ref({ open: false });
const newPartnerName = ref("");
const addingPartner = ref(false);

function openManagePartners() {
  partnersDialog.value.open = true;
}

async function addPartner() {
  if (!newPartnerName.value.trim()) return;
  addingPartner.value = true;
  try {
    await capitalPartnerApi.create({ name: newPartnerName.value.trim() });
    newPartnerName.value = "";
    success("Partner added");
    const partnersRes = await capitalPartnerApi.list({ pageSize: 200 });
    partners.value = partnersRes.data.data;
    await loadPartnerBalances();
  } catch (e) {
    showError("Failed to add partner");
  } finally {
    addingPartner.value = false;
  }
}

// --- Partner statement dialog ---
const partnerStateDialog = ref<{
  open: boolean;
  loading: boolean;
  data: CapitalPartnerState | null;
}>({ open: false, loading: false, data: null });

// The loan lines only make sense for a partner who has actually lent money.
const hasOwnerLoanActivity = computed(() => {
  const d = partnerStateDialog.value.data;
  return !!d && ((d.ownerLoanReceived ?? 0) > 0 || (d.ownerLoanRepaid ?? 0) > 0);
});

async function viewPartner(partnerId: string) {
  partnerStateDialog.value = { open: true, loading: true, data: null };
  try {
    partnerStateDialog.value.data = (
      await capitalTransactionApi.partnerState(partnerId)
    ).data.data;
  } catch (e) {
    showError("Failed to load partner statement");
    partnerStateDialog.value.open = false;
  } finally {
    partnerStateDialog.value.loading = false;
  }
}

onMounted(loadAll);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
.bs-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border, #eef0f2);
}
.bs-row:hover {
  background: var(--color-surface-variant, #f5f7fa);
}
</style>
