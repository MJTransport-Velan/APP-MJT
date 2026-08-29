<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6">Financial Entries</h2>
        <div class="text-body-2 text-medium-emphasis">
          Where did the money come from, where is it now, and what was it for.
        </div>
      </div>
      <div class="d-flex ga-2">
        <AppBtn color="primary" prepend-icon="mdi-cash-fast" @click="openRecordDialog()">Record Money</AppBtn>
      </div>
    </div>

    <!--
      One tile per real transaction, served by the backend's kind registry.
      Picking one opens a form carrying only that transaction's own fields —
      the operator never chooses an Entry Type, a Source Type or a Destination
      Type, and a meaningless combination cannot be expressed.

      The arrow tiles below them instead open the module that owns that kind of
      record. Diesel, AdBlue, FASTag and the two advance screens each capture
      things this dialog does not (mileage, stock valuation, toll plaza,
      advance approval), so for those the module beats a form that quietly
      records less.
    -->
    <AppCard variant="outlined" class="pa-3 mb-4">
      <div class="text-caption text-medium-emphasis mb-2">Record money</div>
      <div class="fe-shortcuts">
        <button
          v-for="kind in kindShortcuts"
          :key="kind.key"
          type="button"
          class="fe-shortcut"
          :title="kind.description"
          @click="openRecordDialog(kind.key)"
        >
          <AppIcon :icon="kind.icon" size="small" />
          <span>{{ kind.label }}</span>
        </button>
      </div>

      <div class="text-caption text-medium-emphasis mb-2 mt-3">Or open the module that owns the record</div>
      <div class="fe-shortcuts">
        <button
          v-for="shortcut in moduleShortcuts"
          :key="shortcut.label"
          type="button"
          class="fe-shortcut fe-shortcut--link"
          :title="shortcut.hint"
          @click="router.push({ name: shortcut.to! })"
        >
          <AppIcon :icon="shortcut.icon" size="small" />
          <span>{{ shortcut.label }}</span>
          <AppIcon icon="mdi-arrow-top-right" size="x-small" class="fe-shortcut__go" />
        </button>
      </div>
    </AppCard>

    <div class="fe-stats-grid mb-4">
      <ProfitCard
        label="Money In"
        :value="dashboard?.moneyIn || 0"
        color="success"
        icon="mdi-arrow-down-bold-circle-outline"
        clickable
        @click="applyMoneyDirectionFilter('Money In', MONEY_IN_TYPES)"
      />
      <ProfitCard
        label="Money Out"
        :value="dashboard?.moneyOut || 0"
        color="error"
        icon="mdi-arrow-up-bold-circle-outline"
        clickable
        @click="applyMoneyDirectionFilter('Money Out', MONEY_OUT_TYPES)"
      />
      <ProfitCard
        label="Cash Available"
        :value="dashboard?.cashAvailable || 0"
        icon="mdi-cash"
        color-by-value
        clickable
        @click="router.push({ name: 'accounting-cash-accounts' })"
      />
      <ProfitCard
        label="Bank Available"
        :value="dashboard?.bankAvailable || 0"
        icon="mdi-bank-outline"
        color-by-value
        clickable
        @click="router.push({ name: 'accounting-bank-accounts' })"
      />
      <ProfitCard
        label="Customer Outstanding"
        :value="dashboard?.customerOutstanding || 0"
        icon="mdi-account-cash-outline"
        clickable
        @click="router.push({ name: 'accounts-invoices' })"
      />
      <ProfitCard
        label="Supplier Outstanding"
        :value="dashboard?.supplierOutstanding || 0"
        icon="mdi-truck-outline"
        clickable
        @click="router.push({ name: 'accounts-supplier-bills' })"
      />
    </div>

    <div v-if="quickFilterLabel" class="mb-3">
      <AppChip color="primary" closable @click:close="clearQuickFilter"
        >Filtered: {{ quickFilterLabel }}</AppChip
      >
    </div>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :page="page"
      :page-size="pageSize"
      @update:page="
        (v) => {
          page = v;
          fetchEntries();
        }
      "
      @update:page-size="
        (v) => {
          pageSize = v;
          fetchEntries();
        }
      "
    >
      <template #filters>
        <AppSelect
          v-model="entryTypeFilter"
          :items="entryTypeOptions"
          item-title="label"
          item-value="value"
          label="Type"
          clearable
          density="compact"
          hide-details
          style="min-width: 200px"
          @update:model-value="onManualFilterChange"
        />
        <AppSelect
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          clearable
          density="compact"
          hide-details
          style="min-width: 160px"
          @update:model-value="onManualFilterChange"
        />
      </template>
      <template
        #item.entryDate="{ item }"
        >{{ formatDate((item as any).entryDate) }}</template
      >
      <template #item.entryType="{ item }"
        ><AppChip
          size="small"
          variant="tonal"
          >{{ entryTypeLabel((item as any).entryType) }}</AppChip
        ></template
      >
      <template #item.flow="{ item }">
        <div class="text-body-2">
          {{ (item as any).source.label }}
          <AppIcon icon="mdi-arrow-right" size="small" />
          {{ (item as any).destination.label }}
        </div>
      </template>
      <template
        #item.amount="{ item }"
        >{{ formatCurrency(Number((item as any).amount)) }}</template
      >
      <template #item.appliedTo="{ item }">
        <AppBtn
          v-if="(item as any).appliedTo?.length > 1"
          variant="text"
          size="small"
          prepend-icon="mdi-format-list-bulleted-square"
          @click="openSplitDialog(item as any)"
          >Split {{ (item as any).appliedTo.length }} ways</AppBtn
        >
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template
        #item.purpose="{ item }"
        >{{ purposeLabel((item as any).purpose) }}</template
      >
      <template #item.status="{ item }"
        ><AppChip
          size="small"
          :color="statusColor((item as any).status)"
          >{{ (item as any).status.replace('_', ' ') }}</AppChip
        ></template
      >
      <template #item.actions="{ item }">
        <AppBtn
          v-if="!['CANCELLED', 'REVERSED'].includes((item as any).status)"
          icon="mdi-close-circle-outline"
          variant="text"
          size="small"
          color="error"
          title="Cancel"
          @click="openCancelDialog(item as any)"
        />
        <AppBtn
          v-if="!['CANCELLED', 'REVERSED'].includes((item as any).status)"
          icon="mdi-pencil-outline"
          variant="text"
          size="small"
          title="Edit"
          @click="openEditDialog(item as any)"
        />
        <AppBtn
          v-if="!['CANCELLED', 'REVERSED'].includes((item as any).status)"
          icon="mdi-undo-variant"
          variant="text"
          size="small"
          title="Reverse"
          @click="onReverse(item as any)"
        />
        <AppBtn
          v-if="['DRAFT', 'CANCELLED', 'REVERSED'].includes((item as any).status)"
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          color="error"
          title="Delete"
          @click="openDeleteConfirm(item as any)"
        />
      </template>
    </MasterDataTable>

    <!-- Record Money — the kind-first path for everything new. -->
    <RecordMoneyDialog
      v-model="recordDialog"
      :initial-kind="recordKind"
      :options="recordOptions"
      @recorded="onRecorded"
    />

    <!--
      The generic Entry Type / Source / Destination form. No longer reachable
      when recording something new — it exists only to CORRECT an entry that
      has already posted, where the stored row really is a generic tuple and
      may predate the kind it would map to.
    -->
    <MasterFormDialog
      v-model="createDialog"
      :title="editingId ? 'Edit Financial Entry' : 'Record Financial Entry'"
      :loading="submitting"
      max-width="760"
      @submit="onSubmit"
    >
      <div class="fe-section">
        <div class="fe-section__title">What happened?</div>
        <AppSelect
          v-model="form.entryType"
          :items="entryTypeOptions"
          item-title="label"
          item-value="value"
          label="Entry Type"
          :error-messages="errors.entryType"
          class="mb-2"
        />
      </div>

      <div class="fe-section">
        <div class="fe-section__title">Where did the money come from?</div>
        <div class="d-flex ga-2 mb-2">
          <AppSelect
            v-model="form.sourceType"
            :items="partyTypeOptions"
            item-title="label"
            item-value="value"
            label="Source Type"
            class="flex-1"
          />
          <template v-if="isEntityBacked(form.sourceType)">
            <AppSelect
              v-model="form.sourceId"
              :items="entityOptions(form.sourceType)"
              item-title="name"
              item-value="id"
              label="Source"
              :error-messages="errors.source"
              class="flex-1"
            />
          </template>
          <template v-else>
            <AppTextField
              v-model="form.sourceLabel"
              label="Source Name"
              :error-messages="errors.source"
              class="flex-1"
            />
          </template>
        </div>
      </div>

      <div class="fe-section">
        <div class="fe-section__title">Where did the money go?</div>
        <div class="d-flex ga-2 mb-2">
          <AppSelect
            v-model="form.destinationType"
            :items="partyTypeOptions"
            item-title="label"
            item-value="value"
            label="Destination Type"
            class="flex-1"
          />
          <template v-if="isEntityBacked(form.destinationType)">
            <AppSelect
              v-model="form.destinationId"
              :items="entityOptions(form.destinationType)"
              item-title="name"
              item-value="id"
              label="Destination"
              :error-messages="errors.destination"
              class="flex-1"
            />
          </template>
          <template v-else>
            <AppTextField
              v-model="form.destinationLabel"
              label="Destination Name"
              :error-messages="errors.destination"
              class="flex-1"
            />
          </template>
        </div>
      </div>

      <div class="fe-section">
        <div class="fe-section__title">Amount</div>
        <div class="d-flex ga-2 mb-2">
          <AppTextField
            v-model.number="form.amount"
            type="number"
            label="Amount"
            :error-messages="errors.amount"
            class="flex-1"
          />
          <AppSelect
            v-model="form.paymentModeId"
            :items="paymentModeOptions"
            item-title="name"
            item-value="id"
            label="Payment Mode"
            clearable
            class="flex-1"
          />
        </div>
        <div class="d-flex ga-2 mb-2">
          <AppTextField
            v-model="form.entryDate"
            type="date"
            label="Transaction Date"
            class="flex-1"
          />
          <AppTextField
            v-model="form.referenceNumber"
            label="Reference Number"
            clearable
            class="flex-1"
          />
        </div>
        <AppTextarea v-model="form.remarks" label="Remarks" rows="2" class="mb-2" />
      </div>

      <div class="fe-section">
        <div class="fe-section__title">What is it for?</div>
        <div class="d-flex ga-2">
          <AppSelect
            v-model="form.purpose"
            :items="purposeOptions"
            item-title="label"
            item-value="value"
            label="Purpose"
            class="flex-1"
          />
          <AppTextField
            v-model="form.purposeNotes"
            label="Notes (optional)"
            class="flex-1"
          />
        </div>
      </div>

      <!-- Fleet linkage — optional. Fuel also logs a real fuel-tank entry; Toll/FastTag also logs real toll usage against the vehicle's FastTag account; AdBlue also logs a direct-purchase AdBlue entry. -->
      <div
        v-if="
          form.purpose === 'FUEL' || form.purpose === 'TOLL' || form.purpose === 'ADBLUE'
        "
        class="fe-section"
      >
        <div class="fe-section__title">Vehicle (optional — keeps Fleet in sync too)</div>
        <div class="d-flex ga-2 mb-2">
          <AppSelect
            v-model="form.vehicleId"
            :items="vehicleOptions"
            item-title="name"
            item-value="id"
            label="Vehicle"
            clearable
            class="flex-1"
          />
          <AppSelect
            v-model="form.tripId"
            :items="tripOptions"
            item-title="tripNumber"
            item-value="id"
            label="Trip (optional)"
            clearable
            class="flex-1"
          />
        </div>
        <template v-if="form.purpose === 'FUEL' && form.vehicleId">
          <div class="d-flex ga-2 mb-2">
            <AppTextField
              v-model.number="form.quantityLiters"
              type="number"
              label="Quantity (Liters)"
              class="flex-1"
            />
            <AppTextField
              v-model.number="form.ratePerLiter"
              type="number"
              label="Rate per Liter"
              class="flex-1"
            />
          </div>
          <div class="d-flex ga-2">
            <AppTextField
              v-model.number="form.odometerReading"
              type="number"
              label="Odometer Reading"
              class="flex-1"
            />
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Fill all three to also log a Fuel Entry for this vehicle — otherwise this just
            posts as a plain fuel expense.
          </div>
        </template>
        <template v-else-if="form.purpose === 'TOLL' && form.vehicleId">
          <div class="text-caption text-medium-emphasis">
            If this vehicle has a FastTag account, the toll amount above will also be
            logged against it.
          </div>
        </template>
        <template v-else-if="form.purpose === 'ADBLUE' && form.vehicleId">
          <div class="d-flex ga-2 mb-2">
            <AppTextField
              v-model.number="form.quantityLiters"
              type="number"
              label="Quantity (Liters) — optional"
              class="flex-1"
            />
            <AppTextField
              v-model.number="form.ratePerLiter"
              type="number"
              label="Rate per Liter — optional"
              class="flex-1"
            />
          </div>
          <!--
            Only the amount is required, unlike Fuel: an AdBlue top-up is
            recorded as a direct purchase against this vehicle either way, and
            the litres are just extra detail off the bill. Yard stock is not
            touched — that is the AdBlue screen's Stock tab, which pays for
            itself and would double-count if recorded here as well.
          -->
          <div class="text-caption text-medium-emphasis">
            Records a direct-purchase AdBlue entry for this vehicle. Buying drums into the
            yard store is done on the AdBlue screen's Stock tab instead — recording that
            here as well would count the money twice.
          </div>
        </template>
      </div>
    </MasterFormDialog>

    <!--
      Salary Payment.

      The one transaction the generic per-kind renderer cannot express, because
      it carries a live quote: picking a person and a month fetches what they
      are owed net of that month's advances, and warns if the month is already
      paid. That is why Salary has a hand-built form while every other
      transaction is rendered from the backend catalogue.

      It still posts as purpose=SALARY through the same store.create(), so
      financial-entry.service.ts's salary delegate marks the month paid and
      settles those advances exactly as it does for any other route in.
    -->
    <MasterFormDialog
      v-model="quickExpenseDialog"
      title="Salary Payment"
      :loading="quickExpenseSubmitting"
      max-width="480"
      @submit="onQuickExpenseSubmit"
    >
      <div class="d-flex ga-2 mb-2">
        <AppSelect
          v-model="quickForm.fundAccountType"
          :items="fundAccountTypeOptions"
          item-title="label"
          item-value="value"
          label="Paid From"
          class="flex-1"
          @update:model-value="quickForm.fundAccountId = ''"
        />
        <AppSelect
          v-model="quickForm.fundAccountId"
          :items="quickForm.fundAccountType === 'BANK' ? bankOptions : cashOptions"
          item-title="name"
          item-value="id"
          label="Account"
          :error-messages="quickErrors.fundAccountId"
          class="flex-1"
        />
      </div>

      <div class="d-flex ga-2 mb-2">
          <AppSelect
            v-model="salaryPartyType"
            :items="[
              { label: 'Employee', value: 'EMPLOYEE' },
              { label: 'Driver', value: 'DRIVER' },
            ]"
            item-title="label"
            item-value="value"
            label="Who"
            class="flex-1"
            @update:model-value="onSalaryPartyChanged"
          />
          <AppTextField
            v-model="salaryPeriod"
            type="month"
            label="Salary Month"
            class="flex-1"
            @update:model-value="fetchSalaryQuote"
          />
        </div>
        <AppSelect
          v-model="salaryPartyId"
          :items="salaryPartyType === 'EMPLOYEE' ? employeeOptions : driverOptions"
          item-title="name"
          item-value="id"
          :label="salaryPartyType === 'EMPLOYEE' ? 'Employee' : 'Driver'"
          :error-messages="quickErrors.vendor"
          class="mb-2"
          @update:model-value="fetchSalaryQuote"
        />

        <AppCard
          v-if="salaryQuoteLoading"
          variant="tonal"
          class="mb-2 pa-3 text-caption text-medium-emphasis"
          >Loading salary details…</AppCard
        >
        <AppCard v-else-if="salaryQuote" variant="tonal" class="mb-2 pa-3">
          <div class="text-subtitle-2 mb-1">
            {{ salaryQuote.party.name }} ({{ salaryQuote.party.code }})<span
              v-if="salaryQuote.party.designation"
            >
              — {{ salaryQuote.party.designation }}</span
            >
          </div>
          <AppChip v-if="salaryQuote.alreadyPaid" color="error" size="small" class="mb-2"
            >Already paid for this month</AppChip
          >
          <div
            v-if="salaryQuote.structureAmount !== null"
            class="d-flex justify-space-between text-body-2"
          >
            <span>Salary Structure Amount</span>
            <span>{{ formatCurrency(salaryQuote.structureAmount) }}</span>
          </div>
          <p v-else class="text-caption text-medium-emphasis mb-1">
            No active salary structure found — enter the amount manually.
          </p>
          <div
            v-if="salaryQuote.advances.length > 0"
            class="d-flex justify-space-between text-body-2 text-error"
          >
            <span>Less: Advances this month ({{ salaryQuote.advances.length }})</span>
            <span>− {{ formatCurrency(salaryQuote.advanceTotal) }}</span>
          </div>
          <div
            v-if="salaryQuote.netAmount !== null"
            class="d-flex justify-space-between text-subtitle-2 font-weight-bold mt-1"
          >
            <span>Suggested Net Amount</span>
            <span>{{ formatCurrency(salaryQuote.netAmount) }}</span>
          </div>
        </AppCard>

      <div class="d-flex ga-2 mb-2">
        <AppTextField
          v-model.number="quickForm.amount"
          type="number"
          label="Amount"
          :error-messages="quickErrors.amount"
          class="flex-1"
        />
        <AppTextField
          v-model="quickForm.entryDate"
          type="date"
          label="Date"
          class="flex-1"
        />
      </div>
      <div class="d-flex ga-2 mb-2">
        <AppSelect
          v-model="quickForm.paymentModeId"
          :items="paymentModeOptions"
          item-title="name"
          item-value="id"
          label="Payment Mode"
          clearable
          class="flex-1"
        />
        <AppTextField
          v-model="quickForm.referenceNumber"
          label="Reference Number"
          clearable
          class="flex-1"
        />
      </div>
      <AppTextarea v-model="quickForm.remarks" label="Remarks (optional)" rows="2" />
    </MasterFormDialog>

    <!-- Cancel -->
    <MasterFormDialog
      v-model="cancelDialog"
      title="Cancel Financial Entry"
      :loading="cancelSubmitting"
      max-width="480"
      @submit="onCancel"
    >
      <AppTextarea
        v-model="cancelReason"
        label="Reason for cancellation"
        rows="2"
        :error-messages="cancelError"
      />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Financial Entry"
      message="Delete this financial entry? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />

    <!-- View Split (FIFO breakdown, read-only) -->
    <AppDialog v-model="splitDialog" max-width="560" persistent>
      <AppCard v-if="splitTarget">
        <AppCardTitle class="text-h6"
          >How {{ splitTarget.entryNumber }} was applied</AppCardTitle
        >
        <AppCardText>
          <AppTable>
            <thead>
              <tr>
                <th>Applied To</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in splitTarget.appliedTo" :key="idx">
                <td>
                  {{ item.targetLabel }}
                  <AppChip size="small" variant="tonal" class="ml-1">{{
                    item.targetType
                  }}</AppChip>
                </td>
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
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useFinancialEntryStore } from "@/stores/accounts/financialEntry";
import { adminCompanyApi } from "@/services/admin-company.service";
import {
  driverApi,
  supplierApi,
  employeeApi,
  vehicleApi,
  paymentModeApi,
} from "@/services/masters";
import { tripApi } from "@/services/operations";
import RecordMoneyDialog from "@/components/accounts/RecordMoneyDialog.vue";
import { financialEntryApi } from "@/services/accounts/financialEntry";
import type { EntryKind } from "@/types/financialEntryKinds";
import { useBankAccountStore, useCashAccountStore } from "@/stores/banking";
import { useSnackbar, extractErrorMessage } from "@/composables/useSnackbar";
import { formatCurrency, localDateStr } from "@/utils/format";
import MasterDataTable from "@/components/masters/MasterDataTable.vue";
import MasterFormDialog from "@/components/masters/MasterFormDialog.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ProfitCard from "@/components/accounts/ProfitCard.vue";
import {
  AppBtn,
  AppSelect,
  AppTextField,
  AppTextarea,
  AppChip,
  AppIcon,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppTable,
} from "@/components/ui";
import { salaryPaymentQuoteApi } from "@/services/accounts/driverPayroll";
import type {
  FinancialEntry,
  FinancialPartyType,
  FinancialEntryType,
  FinancialEntryPurpose,
} from "@/types/financialEntry.types";
import type { SalaryQuote } from "@/types/phase5.types";

const router = useRouter();
const store = useFinancialEntryStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const entryTypeOptions: { label: string; value: FinancialEntryType }[] = [
  { label: "Money Received", value: "MONEY_RECEIVED" },
  { label: "Money Paid", value: "MONEY_PAID" },
  { label: "Money Transfer", value: "MONEY_TRANSFER" },
  { label: "Expense", value: "EXPENSE" },
  { label: "Advance Received", value: "ADVANCE_RECEIVED" },
  { label: "Advance Given", value: "ADVANCE_GIVEN" },
  { label: "Refund Received", value: "REFUND_RECEIVED" },
  { label: "Refund Paid", value: "REFUND_PAID" },
  { label: "Loan Received", value: "LOAN_RECEIVED" },
  { label: "Loan Repayment", value: "LOAN_REPAYMENT" },
  { label: "Salary / Settlement", value: "SALARY_SETTLEMENT" },
  { label: "Adjustment", value: "ADJUSTMENT" },
];
function entryTypeLabel(v: string) {
  return entryTypeOptions.find((o) => o.value === v)?.label || v;
}

const partyTypeOptions: { label: string; value: FinancialPartyType }[] = [
  { label: "Customer", value: "CUSTOMER" },
  { label: "Supplier", value: "SUPPLIER" },
  { label: "Driver", value: "DRIVER" },
  { label: "Employee", value: "EMPLOYEE" },
  { label: "Bank", value: "BANK" },
  { label: "Cash", value: "CASH" },
  { label: "Loan Provider", value: "LOAN_PROVIDER" },
  { label: "Vehicle", value: "VEHICLE" },
  { label: "Trip", value: "TRIP" },
  { label: "Expense", value: "EXPENSE" },
  { label: "Other", value: "OTHER" },
];

const purposeOptions: { label: string; value: FinancialEntryPurpose }[] = [
  { label: "Trip Advance", value: "TRIP_ADVANCE" },
  { label: "Trip Payment", value: "TRIP_PAYMENT" },
  { label: "Supplier Payment", value: "SUPPLIER_PAYMENT" },
  { label: "Client Payment", value: "CLIENT_PAYMENT" },
  { label: "Driver Advance", value: "DRIVER_ADVANCE" },
  { label: "Salary", value: "SALARY" },
  { label: "Fuel", value: "FUEL" },
  { label: "Repair", value: "REPAIR" },
  { label: "Insurance", value: "INSURANCE" },
  { label: "Loan EMI", value: "LOAN_EMI" },
  { label: "Customer Refund", value: "CUSTOMER_REFUND" },
  { label: "Supplier Refund", value: "SUPPLIER_REFUND" },
  { label: "Office Expense", value: "OFFICE_EXPENSE" },
  { label: "Toll / FastTag", value: "TOLL" },
  { label: "AdBlue", value: "ADBLUE" },
  { label: "Other", value: "OTHER" },
];
function purposeLabel(v: string) {
  return purposeOptions.find((o) => o.value === v)?.label || v;
}

const statusOptions = [
  "DRAFT",
  "COMPLETED",
  "PARTIALLY_ALLOCATED",
  "FULLY_ALLOCATED",
  "CANCELLED",
  "REVERSED",
];
function statusColor(status: string) {
  return (
    ({
      COMPLETED: "success",
      FULLY_ALLOCATED: "success",
      PARTIALLY_ALLOCATED: "warning",
      DRAFT: "default",
      CANCELLED: "error",
      REVERSED: "default",
    } as Record<string, string>)[status] || "info"
  );
}

const ENTITY_BACKED: FinancialPartyType[] = [
  "CUSTOMER",
  "SUPPLIER",
  "DRIVER",
  "EMPLOYEE",
  "BANK",
  "CASH",
  "VEHICLE",
];
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

const bankOptions = computed(() =>
  bankAccountStore.items.map((b: any) => ({
    id: b.id,
    name: `${b.accountHolderName} (${b.accountNumber})`,
  }))
);
const cashOptions = computed(() =>
  cashAccountStore.items.map((c: any) => ({
    id: c.id,
    name: c.ledger?.name || c.cashAccountType,
  }))
);

function entityOptions(type: FinancialPartyType) {
  switch (type) {
    case "CUSTOMER":
      return companyOptions.value;
    case "SUPPLIER":
      return supplierOptions.value;
    case "DRIVER":
      return driverOptions.value;
    case "EMPLOYEE":
      return employeeOptions.value;
    case "BANK":
      return bankOptions.value;
    case "CASH":
      return cashOptions.value;
    case "VEHICLE":
      return vehicleOptions.value;
    default:
      return [];
  }
}

const page = ref(1);
const pageSize = ref(10);
const entryTypeFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

// Same entryType groupings the "Money In"/"Money Out" numbers on this page
// are summed from (financial-state.service.ts dashboard()) — clicking
// either stat card filters the list to exactly that group.
const MONEY_IN_TYPES = [
  "MONEY_RECEIVED",
  "ADVANCE_RECEIVED",
  "REFUND_RECEIVED",
  "LOAN_RECEIVED",
];
const MONEY_OUT_TYPES = [
  "MONEY_PAID",
  "ADVANCE_GIVEN",
  "REFUND_PAID",
  "LOAN_REPAYMENT",
  "EXPENSE",
  "SALARY_SETTLEMENT",
];
const quickFilterLabel = ref("");
const quickFilterTypes = ref<string[] | null>(null);

function applyMoneyDirectionFilter(label: string, types: string[]) {
  entryTypeFilter.value = null;
  statusFilter.value = null;
  quickFilterLabel.value = label;
  quickFilterTypes.value = types;
  page.value = 1;
  fetchEntries();
}
function clearQuickFilter() {
  quickFilterLabel.value = "";
  quickFilterTypes.value = null;
  fetchEntries();
}
function onManualFilterChange() {
  quickFilterLabel.value = "";
  quickFilterTypes.value = null;
  fetchEntries();
}

const headers = [
  { title: "Entry No.", key: "entryNumber", sortable: false },
  { title: "Date", key: "entryDate", sortable: false },
  { title: "Type", key: "entryType", sortable: false },
  { title: "From → To", key: "flow", sortable: false },
  { title: "Amount", key: "amount", sortable: false },
  { title: "Applied To", key: "appliedTo", sortable: false },
  { title: "Purpose", key: "purpose", sortable: false },
  { title: "Status", key: "status", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const },
];

async function fetchEntries() {
  const entryType = quickFilterTypes.value
    ? quickFilterTypes.value.join(",")
    : entryTypeFilter.value || undefined;
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    entryType,
    status: statusFilter.value || undefined,
  });
}

const dashboard = computed(() => store.dashboard);

const createDialog = ref(false);
const submitting = ref(false);
/**
 * Set while the dialog is correcting a posted entry. Saving then goes through
 * the correct endpoint, which reverses what the original entry did to the
 * balances and re-posts the new figures — an entry is never silently rewritten
 * underneath the money it already moved.
 */
const editingId = ref<string | null>(null);

// ------------------------------------------------ Record Money (kind-first)
// The catalogue is fetched, not hard-coded, so adding a transaction is a
// backend-only change — see backend/src/services/financial-entry-kinds/.
const recordDialog = ref(false);
const recordKind = ref<string | null>(null);
const entryKinds = ref<EntryKind[]>([]);

const kindShortcuts = computed(() => entryKinds.value);

const recordOptions = computed(() => ({
  customers: companyOptions.value,
  suppliers: supplierOptions.value,
  drivers: driverOptions.value,
  employees: employeeOptions.value,
  vehicles: vehicleOptions.value,
  paymentModes: paymentModeOptions.value,
  // One list of both, keyed "TYPE:id" — a single dropdown beats a type picker
  // plus a dependent account picker.
  fundAccounts: [
    ...bankOptions.value.map((b) => ({ key: `BANK:${b.id}`, label: `${b.name} — Bank` })),
    ...cashOptions.value.map((c) => ({ key: `CASH:${c.id}`, label: `${c.name} — Cash` })),
  ],
}));

function openRecordDialog(kind?: string) {
  // Salary keeps its own form for the advance quote — see openSalaryDialog.
  if (kind === "SALARY") return openSalaryDialog();
  recordKind.value = kind ?? null;
  recordDialog.value = true;
}

function onRecorded() {
  fetchEntries();
  store.fetchDashboard();
}
// Money defaults to moving through the bank, not the cash box: that is where
// the overwhelming majority of payments and receipts actually go, and a form
// that opens on Cash quietly books transactions against a balance that never
// physically changed. Cash stays one click away in the dropdown.
const form = reactive({
  entryType: "MONEY_RECEIVED" as FinancialEntryType,
  sourceType: "CUSTOMER" as FinancialPartyType,
  sourceId: "",
  sourceLabel: "",
  destinationType: "BANK" as FinancialPartyType,
  destinationId: "",
  destinationLabel: "",
  amount: undefined as number | undefined,
  paymentModeId: "",
  entryDate: new Date().toISOString().slice(0, 10),
  referenceNumber: "",
  remarks: "",
  purpose: "OTHER" as FinancialEntryPurpose,
  purposeNotes: "",
  vehicleId: "",
  tripId: "",
  quantityLiters: undefined as number | undefined,
  ratePerLiter: undefined as number | undefined,
  odometerReading: undefined as number | undefined,
});
const errors = reactive({ entryType: "", source: "", destination: "", amount: "" });
function clearErrors() {
  errors.entryType = "";
  errors.source = "";
  errors.destination = "";
  errors.amount = "";
}

/**
 * The modules that own a record outright.
 *
 * Diesel, AdBlue, FASTag and the two advance screens each capture things no
 * generic money form carries — mileage, stock valuation, toll plaza, advance
 * approval and settlement — so for those, sending the operator to the module
 * beats a form that quietly records less. The transaction tiles above cover
 * everything this screen legitimately owns.
 */
type ModuleShortcut = { label: string; icon: string; hint: string; to: string };

const moduleShortcuts: ModuleShortcut[] = [
  {
    label: "Diesel",
    icon: "mdi-gas-station-outline",
    hint: "Opens Diesel / Fuel — fill-ups, mileage and the shared card account",
    to: "operations-fuel",
  },
  {
    label: "AdBlue",
    icon: "mdi-water-outline",
    hint: "Opens AdBlue — top-ups from yard stock or bought on the road",
    to: "operations-adblue",
  },
  {
    label: "FASTag / Toll",
    icon: "mdi-credit-card-wireless-outline",
    hint: "Opens FASTag — toll usage and wallet recharge",
    to: "operations-fasttag",
  },
  {
    label: "Driver Advance",
    icon: "mdi-account-cash-outline",
    hint: "Opens Driver Advances & Allowances",
    to: "accounts-driver-transactions",
  },
  {
    label: "Employee Advance",
    icon: "mdi-account-tie-outline",
    hint: "Opens Employee Advances",
    to: "accounts-employee-advances",
  },
];

function openEditDialog(entry: FinancialEntry) {
  Object.assign(form, {
    entryType: entry.entryType,
    sourceType: entry.source.type,
    sourceId: entry.source.id || "",
    sourceLabel: entry.source.label || "",
    destinationType: entry.destination.type,
    destinationId: entry.destination.id || "",
    destinationLabel: entry.destination.label || "",
    amount: Number(entry.amount),
    paymentModeId: entry.paymentMode?.id || "",
    entryDate: String(entry.entryDate).slice(0, 10),
    referenceNumber: entry.referenceNumber || "",
    remarks: entry.remarks || "",
    purpose: entry.purpose,
    purposeNotes: entry.purposeNotes || "",
    vehicleId: entry.fleet?.vehicleId || "",
    tripId: entry.fleet?.tripId || "",
    quantityLiters: entry.fleet?.quantityLiters ?? undefined,
    ratePerLiter: entry.fleet?.ratePerLiter ?? undefined,
    odometerReading: entry.fleet?.odometerReading ?? undefined,
  });
  clearErrors();
  editingId.value = entry.id;
  createDialog.value = true;
}

async function onSubmit() {
  clearErrors();
  errors.amount = form.amount && form.amount > 0 ? "" : "Amount must be greater than 0";
  errors.source = isEntityBacked(form.sourceType)
    ? form.sourceId
      ? ""
      : "A source must be selected"
    : form.sourceLabel.trim()
    ? ""
    : "A source name is required";
  errors.destination = isEntityBacked(form.destinationType)
    ? form.destinationId
      ? ""
      : "A destination must be selected"
    : form.destinationLabel.trim()
    ? ""
    : "A destination name is required";
  if (errors.amount || errors.source || errors.destination) return;

  submitting.value = true;
  try {
    const payload = {
      entryType: form.entryType,
      entryDate: form.entryDate,
      sourceType: form.sourceType,
      sourceId: isEntityBacked(form.sourceType) ? form.sourceId || undefined : undefined,
      sourceLabel: isEntityBacked(form.sourceType) ? undefined : form.sourceLabel,
      destinationType: form.destinationType,
      destinationId: isEntityBacked(form.destinationType)
        ? form.destinationId || undefined
        : undefined,
      destinationLabel: isEntityBacked(form.destinationType)
        ? undefined
        : form.destinationLabel,
      amount: form.amount!,
      paymentModeId: form.paymentModeId || undefined,
      referenceNumber: form.referenceNumber || undefined,
      remarks: form.remarks || undefined,
      purpose: form.purpose,
      purposeNotes: form.purposeNotes || undefined,
      vehicleId: form.vehicleId || undefined,
      tripId: form.tripId || undefined,
      quantityLiters: form.quantityLiters || undefined,
      ratePerLiter: form.ratePerLiter || undefined,
      odometerReading: form.odometerReading || undefined,
    };
    if (editingId.value) {
      await store.correct(editingId.value, payload);
      success("Financial entry corrected");
    } else {
      await store.create(payload);
      success("Financial entry recorded");
    }
    createDialog.value = false;
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(
      extractErrorMessage(
        err,
        editingId.value
          ? "Failed to correct financial entry"
          : "Failed to record financial entry"
      )
    );
  } finally {
    submitting.value = false;
  }
}

// --- Record Office Expense (quick entry) — always EXPENSE / Other / Office
// Expense under the hood, posted through the same store.create() as the
// full dialog above. Just a faster form for the single most common case.
// Bank first, matching the default and the way most payments actually go.
const fundAccountTypeOptions = [
  { label: "Bank", value: "BANK" },
  { label: "Cash", value: "CASH" },
];
const quickExpenseDialog = ref(false);
const quickExpenseSubmitting = ref(false);
const quickForm = reactive({
  fundAccountType: "BANK" as "BANK" | "CASH",
  fundAccountId: "",
  vendor: "",
  amount: undefined as number | undefined,
  entryDate: localDateStr(),
  paymentModeId: "",
  referenceNumber: "",
  remarks: "",
});
const quickErrors = reactive({ fundAccountId: "", vendor: "", amount: "" });
function clearQuickErrors() {
  quickErrors.fundAccountId = "";
  quickErrors.vendor = "";
  quickErrors.amount = "";
}

// --- Salary Entry toggle (within Record Office Expense) — replaces the
// free-text "Paid To" vendor field with Who/Month/Person, shows a live
// net-of-this-month's-advances suggestion (salary-payment-quote.service.ts),
// and posts as purpose=SALARY (not OFFICE_EXPENSE) so
// financial-entry.service.ts's delegateToEmployee/DriverSalaryPayment marks
// that month paid and settles those same advances — see financial-entry.service.ts.
const isSalaryEntry = ref(false);
const salaryPartyType = ref<"EMPLOYEE" | "DRIVER">("EMPLOYEE");
const salaryPartyId = ref("");
const salaryPeriod = ref(localDateStr().slice(0, 7));
const salaryQuote = ref<SalaryQuote | null>(null);
const salaryQuoteLoading = ref(false);

function onSalaryEntryToggle() {
  salaryPartyType.value = "EMPLOYEE";
  salaryPartyId.value = "";
  salaryPeriod.value = localDateStr().slice(0, 7);
  salaryQuote.value = null;
  quickForm.amount = undefined;
}
function onSalaryPartyChanged() {
  salaryPartyId.value = "";
  salaryQuote.value = null;
  quickForm.amount = undefined;
}
async function fetchSalaryQuote() {
  if (!salaryPartyId.value || !salaryPeriod.value) {
    salaryQuote.value = null;
    return;
  }
  salaryQuoteLoading.value = true;
  try {
    const response =
      salaryPartyType.value === "EMPLOYEE"
        ? await salaryPaymentQuoteApi.employeeQuote(
            salaryPartyId.value,
            salaryPeriod.value
          )
        : await salaryPaymentQuoteApi.driverQuote(
            salaryPartyId.value,
            salaryPeriod.value
          );
    salaryQuote.value = response.data.data;
    quickForm.amount = salaryQuote.value.netAmount ?? undefined;
  } catch (err) {
    salaryQuote.value = null;
    error(extractErrorMessage(err, "Failed to fetch salary details"));
  } finally {
    salaryQuoteLoading.value = false;
  }
}

/**
 * Salary is the one transaction kept on a hand-built form: it carries a live
 * quote (what this person is owed net of this month's advances, and whether
 * the month is already paid) that the catalogue-driven renderer has no way to
 * express. Every other transaction goes through RecordMoneyDialog.
 */
function openSalaryDialog() {
  Object.assign(quickForm, {
    fundAccountType: "BANK",
    fundAccountId: "",
    vendor: "",
    amount: undefined,
    entryDate: localDateStr(),
    paymentModeId: "",
    referenceNumber: "",
    remarks: "",
  });
  clearQuickErrors();
  isSalaryEntry.value = true;
  onSalaryEntryToggle();
  quickExpenseDialog.value = true;
}

async function onQuickExpenseSubmit() {
  clearQuickErrors();
  quickErrors.fundAccountId = quickForm.fundAccountId
    ? ""
    : "Select which account paid this";
  quickErrors.vendor = isSalaryEntry.value
    ? salaryPartyId.value
      ? ""
      : `Select which ${salaryPartyType.value === "EMPLOYEE" ? "employee" : "driver"}`
    : quickForm.vendor.trim()
    ? ""
    : "Who was this paid to?";
  quickErrors.amount =
    quickForm.amount && quickForm.amount > 0 ? "" : "Amount must be greater than 0";
  if (quickErrors.fundAccountId || quickErrors.vendor || quickErrors.amount) return;
  if (isSalaryEntry.value && salaryQuote.value?.alreadyPaid) {
    error("Salary for this month has already been marked paid");
    return;
  }

  quickExpenseSubmitting.value = true;
  try {
    await store.create({
      entryType: "EXPENSE",
      entryDate: quickForm.entryDate,
      sourceType: quickForm.fundAccountType,
      sourceId: quickForm.fundAccountId,
      ...(isSalaryEntry.value
        ? {
            destinationType: salaryPartyType.value,
            destinationId: salaryPartyId.value,
            salaryPeriod: salaryPeriod.value,
          }
        : { destinationType: "OTHER", destinationLabel: quickForm.vendor }),
      amount: quickForm.amount!,
      paymentModeId: quickForm.paymentModeId || undefined,
      referenceNumber: quickForm.referenceNumber || undefined,
      remarks: quickForm.remarks || undefined,
      purpose: isSalaryEntry.value ? "SALARY" : "OFFICE_EXPENSE",
    });
    success(isSalaryEntry.value ? "Salary payment recorded" : "Office expense recorded");
    quickExpenseDialog.value = false;
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(
      extractErrorMessage(
        err,
        isSalaryEntry.value
          ? "Failed to record salary payment"
          : "Failed to record office expense"
      )
    );
  } finally {
    quickExpenseSubmitting.value = false;
  }
}

// --- Cancel / Reverse ---
const cancelDialog = ref(false);
const cancelSubmitting = ref(false);
const cancelReason = ref("");
const cancelError = ref("");
const cancelTarget = ref<FinancialEntry | null>(null);

function openCancelDialog(item: FinancialEntry) {
  cancelTarget.value = item;
  cancelReason.value = "";
  cancelError.value = "";
  cancelDialog.value = true;
}

async function onCancel() {
  if (!cancelTarget.value) return;
  cancelError.value = cancelReason.value.trim() ? "" : "A reason is required";
  if (cancelError.value) return;
  cancelSubmitting.value = true;
  try {
    await store.cancel(cancelTarget.value.id, cancelReason.value);
    success("Financial entry cancelled");
    cancelDialog.value = false;
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(extractErrorMessage(err, "Failed to cancel"));
  } finally {
    cancelSubmitting.value = false;
  }
}

async function onReverse(item: FinancialEntry) {
  try {
    await store.reverse(item.id);
    success("Financial entry reversed");
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(extractErrorMessage(err, "Failed to reverse — it may not be posted yet"));
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<FinancialEntry | null>(null);
const deleting = ref(false);
function openDeleteConfirm(item: FinancialEntry) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}
async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success("Financial entry deleted");
    deleteDialog.value = false;
    fetchEntries();
    store.fetchDashboard();
  } catch (err) {
    error(extractErrorMessage(err, "Failed to delete"));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
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
  const [
    companiesRes,
    suppliersRes,
    driversRes,
    employeesRes,
    vehiclesRes,
    paymentModesRes,
    tripsRes,
  ] = await Promise.all([
    adminCompanyApi.list({ pageSize: 200 }),
    supplierApi.list({ pageSize: 200 }),
    driverApi.list({ pageSize: 200 }),
    employeeApi.list({ pageSize: 200 }),
    vehicleApi.list({ pageSize: 200 }),
    paymentModeApi.list({ pageSize: 50 }),
    tripApi.list({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: "true" }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: "true" }),
  ]);
  // The transaction tiles come from the backend registry, so this screen never
  // holds its own copy of what transactions exist.
  try {
    entryKinds.value = (await financialEntryApi.kinds()).data.data;
  } catch {
    // A failed catalogue leaves the tiles empty rather than breaking the page;
    // the list, the stats and the correction path all still work.
  }
  companyOptions.value = (companiesRes.data.data as any[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  supplierOptions.value = (suppliersRes.data.data as any[]).map((s) => ({
    id: s.id,
    name: s.name,
  }));
  driverOptions.value = (driversRes.data.data as any[]).map((d) => ({
    id: d.id,
    name: `${d.name} (${d.code})`,
  }));
  employeeOptions.value = (employeesRes.data.data as any[]).map((e) => ({
    id: e.id,
    name: e.name,
  }));
  vehicleOptions.value = (vehiclesRes.data.data as any[]).map((v) => ({
    id: v.id,
    name: v.registrationNumber,
  }));
  paymentModeOptions.value = (paymentModesRes.data.data as any[]).map((p) => ({
    id: p.id,
    name: p.name,
  }));
  tripOptions.value = (tripsRes.data.data as any[]).map((t) => ({
    id: t.id,
    tripNumber: t.tripNumber,
  }));
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

/* Wraps rather than scrolls: on a narrow screen these become two or three
   rows, which stays usable, where a horizontal scroller hides the ones a
   user is most likely hunting for. */
.fe-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fe-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.fe-shortcut:hover {
  border-color: var(--color-primary);
  background: var(--color-hover);
}
.fe-shortcut:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
</style>
