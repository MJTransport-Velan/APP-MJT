<template>
  <AppDialog v-model="open" max-width="720" persistent>
    <AppCard>
      <AppCardTitle class="d-flex align-center ga-2">
        <AppBtn v-if="selected" icon="mdi-arrow-left" variant="text" size="small" title="Back to the list" @click="selected = null" />
        <span class="text-h6">{{ selected ? selected.label : 'Record Money' }}</span>
      </AppCardTitle>

      <AppCardText>
        <!-- Step 1 — what happened. Named transactions, not a tuple builder. -->
        <template v-if="!selected">
          <p class="text-body-2 text-medium-emphasis mb-3">What happened?</p>
          <div v-for="group in groups" :key="group.key" class="mb-4">
            <div class="rm-group-label">{{ group.label }}</div>
            <div class="rm-grid">
              <button v-for="kind in group.kinds" :key="kind.key" type="button" class="rm-tile" @click="choose(kind)">
                <AppIcon :icon="kind.icon" />
                <span class="rm-tile__label">{{ kind.label }}</span>
                <span class="rm-tile__hint">{{ kind.description }}</span>
              </button>
            </div>
          </div>
          <p v-if="!kinds.length && !loadingKinds" class="text-caption text-medium-emphasis mb-0">
            No transaction types available.
          </p>
        </template>

        <!-- Step 2 — only this kind's own fields. -->
        <template v-else>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ selected.description }}</p>
          <div class="rm-fields">
            <template v-for="field in visibleFields" :key="field.name">
              <AppSelect
                v-if="field.type === 'party'"
                v-model="values[field.name] as string"
                :items="partyOptions(field.partyType)"
                item-title="name"
                item-value="id"
                :label="field.label"
                :error-messages="errors[field.name]"
                :hint="field.hint"
                :persistent-hint="!!field.hint"
              />
              <AppSelect
                v-else-if="field.type === 'fundAccount'"
                v-model="values[field.name] as string"
                :items="fundAccountOptions"
                item-title="label"
                item-value="key"
                :label="field.label"
                :error-messages="errors[field.name]"
                :hint="field.hint"
                :persistent-hint="!!field.hint"
              />
              <!-- The loan register itself, so a lender is chosen rather than
                   typed and the entry ties back to a real loan. -->
              <AppSelect
                v-else-if="field.type === 'loan'"
                v-model="values[field.name] as string"
                :items="loanOptions"
                item-title="label"
                item-value="id"
                :label="field.label"
                :error-messages="errors[field.name]"
                :hint="field.hint"
                :persistent-hint="!!field.hint"
                @update:model-value="onLoanChanged(field)"
              />
              <!-- That loan's own unpaid EMIs. Picking one fills the amount
                   from the schedule, so the figure is never re-keyed. -->
              <AppSelect
                v-else-if="field.type === 'loanInstallment'"
                v-model="values[field.name] as string"
                :items="installmentOptions"
                item-title="label"
                item-value="id"
                :label="field.label"
                :error-messages="errors[field.name]"
                :hint="installmentHint(field)"
                persistent-hint
                :disabled="!values[field.dependsOn || 'loanId'] || loadingInstallments"
                @update:model-value="onInstallmentChanged"
              />
              <AppSelect
                v-else-if="field.type === 'select' && field.name === 'paymentModeId'"
                v-model="values[field.name] as string"
                :items="paymentModes"
                item-title="name"
                item-value="id"
                :label="field.label"
                clearable
              />
              <AppSelect
                v-else-if="field.type === 'select'"
                v-model="values[field.name] as string"
                :items="field.options || []"
                item-title="label"
                item-value="value"
                :label="field.label"
                :error-messages="errors[field.name]"
              />
              <AppTextarea
                v-else-if="field.type === 'textarea'"
                v-model="values[field.name] as string"
                :label="field.label"
                rows="2"
              />
              <AppTextField
                v-else
                v-model="values[field.name] as never"
                :v-model-number="field.type === 'amount' || field.type === 'number'"
                :type="inputType(field.type)"
                :label="field.label"
                :placeholder="field.placeholder"
                :error-messages="errors[field.name]"
                :hint="field.hint"
                :persistent-hint="!!field.hint"
                @update:model-value="onFieldInput(field, $event)"
              />
            </template>
          </div>
        </template>
      </AppCardText>

      <AppCardActions>
        <div class="spacer"></div>
        <AppBtn variant="text" @click="close">Cancel</AppBtn>
        <AppBtn v-if="selected" color="primary" variant="flat" :loading="submitting" @click="submit">
          Record {{ selected.label }}
        </AppBtn>
      </AppCardActions>
    </AppCard>
  </AppDialog>
</template>

<script setup lang="ts">
/**
 * Record Money — the kind-first entry point.
 *
 * The operator picks a named transaction ("Supplier Payment") and then sees
 * only the four or five fields that transaction needs. They never choose an
 * Entry Type, a Source Type or a Destination Type: the backend's kind
 * registry derives all of that, and states what posting should do, so a
 * meaningless combination cannot be expressed here at all.
 *
 * The form is rendered from the catalogue the backend serves, so adding a
 * transaction is a backend-only change — see
 * backend/src/services/financial-entry-kinds/.
 */
import { ref, reactive, computed, watch } from 'vue';
import {
  AppBtn,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppDialog,
  AppIcon,
  AppSelect,
  AppTextField,
  AppTextarea,
} from '@/components/ui';
import { financialEntryApi } from '@/services/accounts/financialEntry';
import { loanApi } from '@/services/accounts/loans';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Loan } from '@/types/loans.types';
import {
  ENTRY_KIND_GROUP_LABELS,
  type EntryKind,
  type EntryKindField,
  type EntryKindGroup,
  type EntryKindPartyType,
} from '@/types/financialEntryKinds';

const props = defineProps<{
  modelValue: boolean;
  /** Option lists the page has already loaded — passed in rather than refetched. */
  options: {
    customers: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
    drivers: { id: string; name: string }[];
    employees: { id: string; name: string }[];
    vehicles: { id: string; name: string }[];
    paymentModes: { id: string; name: string }[];
    fundAccounts: { key: string; label: string }[];
  };
  /** Opens straight onto this kind, skipping the picker. */
  initialKind?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'recorded'): void;
}>();

const { success, error } = useSnackbar();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const kinds = ref<EntryKind[]>([]);
const loadingKinds = ref(false);
const selected = ref<EntryKind | null>(null);
const submitting = ref(false);
const values = reactive<Record<string, unknown>>({});
const errors = reactive<Record<string, string>>({});

const paymentModes = computed(() => props.options.paymentModes);
const fundAccountOptions = computed(() => props.options.fundAccounts);

const GROUP_ORDER: EntryKindGroup[] = ['MONEY_IN', 'MONEY_OUT', 'TRANSFER'];
const groups = computed(() =>
  GROUP_ORDER.map((key) => ({
    key,
    label: ENTRY_KIND_GROUP_LABELS[key],
    kinds: kinds.value.filter((k) => k.group === key),
  })).filter((g) => g.kinds.length > 0)
);

// ------------------------------------------------------------------ loans
// Fetched lazily, only when a kind that needs them is opened.
const loans = ref<Loan[]>([]);
const loadingLoans = ref(false);
const installments = ref<{ id: string; label: string; emiAmount: number }[]>([]);
const loadingInstallments = ref(false);

const loanOptions = computed(() =>
  loans.value.map((l) => ({
    id: l.id,
    label: `${l.loanNumber} — ${l.lenderName} (${l.loanName})`,
  }))
);
const installmentOptions = computed(() => installments.value);

function installmentHint(field: EntryKindField) {
  if (!values[field.dependsOn || 'loanId']) return 'Choose the loan first';
  if (loadingInstallments.value) return 'Loading the schedule…';
  if (!installments.value.length) return 'This loan has no unpaid EMIs left';
  return field.hint ?? '';
}

async function loadLoans() {
  if (loans.value.length || loadingLoans.value) return;
  loadingLoans.value = true;
  try {
    const response = await loanApi.list({ status: 'ACTIVE', pageSize: 200 });
    loans.value = response.data.data;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load the loans'));
  } finally {
    loadingLoans.value = false;
  }
}

/** Changing the loan invalidates whatever EMI was chosen against the old one. */
async function onLoanChanged(field: EntryKindField) {
  const dependents = (selected.value?.fields ?? []).filter((f) => f.dependsOn === field.name);
  for (const dependent of dependents) values[dependent.name] = '';
  installments.value = [];

  const loanId = values[field.name] as string;
  if (!loanId || !dependents.length) return;

  loadingInstallments.value = true;
  try {
    const loan = (await loanApi.getById(loanId)).data.data;
    installments.value = loan.installments
      .filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED')
      .map((i) => ({
        id: i.id,
        label: `#${i.installmentNo} · due ${formatDate(i.dueDate)} · ${formatCurrency(i.emiAmount)}${
          i.status === 'OVERDUE' ? ' · overdue' : ''
        }`,
        emiAmount: i.emiAmount,
      }));
    // Oldest unpaid first is what you almost always want to pay next.
    if (installments.value.length) {
      const first = installments.value[0];
      const target = dependents[0];
      values[target.name] = first.id;
      values.amount = first.emiAmount;
    }
  } catch (err) {
    error(extractErrorMessage(err, "Failed to load the loan's EMI schedule"));
  } finally {
    loadingInstallments.value = false;
  }
}

/** The schedule holds the figure — never make the operator retype it. */
function onInstallmentChanged(id: unknown) {
  const match = installments.value.find((i) => i.id === id);
  if (match) values.amount = match.emiAmount;
}

function partyOptions(partyType?: EntryKindPartyType) {
  switch (partyType) {
    case 'CUSTOMER':
      return props.options.customers;
    case 'SUPPLIER':
      return props.options.suppliers;
    case 'DRIVER':
      return props.options.drivers;
    case 'EMPLOYEE':
      return props.options.employees;
    case 'VEHICLE':
      return props.options.vehicles;
    default:
      return [];
  }
}

/** A field with `showWhen` only appears once its controlling field agrees. */
const visibleFields = computed(() => {
  if (!selected.value) return [];
  return selected.value.fields.filter((f) => {
    if (!f.showWhen) return true;
    return f.showWhen.equals.includes(String(values[f.showWhen.field] ?? ''));
  });
});

function inputType(type: EntryKindField['type']) {
  if (type === 'amount' || type === 'number') return 'number';
  if (type === 'date') return 'date';
  if (type === 'month') return 'month';
  return 'text';
}

/** AppTextField hands back a string; numeric fields must not post one. */
function onFieldInput(field: EntryKindField, value: unknown) {
  if (field.type === 'amount' || field.type === 'number') {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value));
    values[field.name] = Number.isFinite(parsed) ? parsed : undefined;
    return;
  }
  values[field.name] = value;
}

function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function choose(kind: EntryKind) {
  selected.value = kind;
  for (const key of Object.keys(values)) delete values[key];
  for (const key of Object.keys(errors)) delete errors[key];
  installments.value = [];

  // Only the loan-backed kinds pay the cost of fetching the register.
  if (kind.fields.some((f) => f.type === 'loan')) void loadLoans();

  // Sensible starting values so the common case is "type the amount".
  for (const field of kind.fields) {
    if (field.type === 'date') values[field.name] = localToday();
    else if (field.type === 'month') values[field.name] = localToday().slice(0, 7);
    else if (field.type === 'select' && field.required && field.options?.length) {
      values[field.name] = field.options[0].value;
    }
  }
}

function close() {
  open.value = false;
}

async function submit() {
  if (!selected.value) return;
  for (const key of Object.keys(errors)) delete errors[key];

  // A light client-side pass so the obvious omissions do not need a round
  // trip; the kind's own schema on the server remains the real gate.
  let valid = true;
  for (const field of visibleFields.value) {
    if (!field.required) continue;
    const value = values[field.name];
    if (value === undefined || value === null || value === '') {
      errors[field.name] = `${field.label} is required`;
      valid = false;
    }
  }
  if (!valid) return;

  const payload: Record<string, unknown> = {};
  for (const field of visibleFields.value) {
    const value = values[field.name];
    if (value !== undefined && value !== null && value !== '') payload[field.name] = value;
  }

  submitting.value = true;
  try {
    await financialEntryApi.createFromKind(selected.value.key, payload);
    success(`${selected.value.label} recorded`);
    open.value = false;
    emit('recorded');
  } catch (err) {
    error(extractErrorMessage(err, `Failed to record the ${selected.value.label.toLowerCase()}`));
  } finally {
    submitting.value = false;
  }
}

async function loadKinds() {
  if (kinds.value.length || loadingKinds.value) return;
  loadingKinds.value = true;
  try {
    const response = await financialEntryApi.kinds();
    kinds.value = response.data.data;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load the transaction types'));
  } finally {
    loadingKinds.value = false;
  }
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) {
      selected.value = null;
      return;
    }
    await loadKinds();
    // Opened from a tile on the page: go straight to that kind's form.
    const preset = props.initialKind ? kinds.value.find((k) => k.key === props.initialKind) : null;
    if (preset) choose(preset);
    else selected.value = null;
  },
  { immediate: true }
);
</script>

<style scoped>
.rm-group-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-medium);
  margin-bottom: 8px;
}
.rm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.rm-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--color-text);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.rm-tile:hover {
  border-color: var(--color-primary);
  background: var(--color-hover);
}
.rm-tile__label {
  font-weight: 600;
  font-size: 0.875rem;
}
.rm-tile__hint {
  font-size: 0.6875rem;
  color: var(--color-text-medium);
  line-height: 1.35;
}
.rm-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
</style>
