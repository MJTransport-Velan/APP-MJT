<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Supplier Bills & Payments</h2>
      <AppBtn v-if="mainTab === 'bills'" color="primary" prepend-icon="mdi-plus" @click="openGenerateDialog">Generate Bill</AppBtn>
      <AppBtn v-else-if="mainTab === 'payments'" color="primary" prepend-icon="mdi-plus" @click="paymentDialog = true">Payment Entry</AppBtn>
      <!-- No header action for the Outstanding tab — it's a read-only view. -->
    </div>

    <AppTabs v-model="mainTab" color="primary" class="mb-4">
      <AppTab value="outstanding">Outstanding</AppTab>
      <AppTab value="bills">Bills</AppTab>
      <AppTab value="ungenerated">Ungenerated Bill{{ ungeneratedBillTrips.length ? ` (${ungeneratedBillTrips.length})` : '' }}</AppTab>
      <AppTab value="payments">Payments</AppTab>
    </AppTabs>

    <AppWindow v-model="mainTab">
      <AppWindowItem value="bills" >
        <MasterDataTable
          :headers="billHeaders"
          :items="billStore.items"
          :items-length="billStore.meta?.total || 0"
          :loading="billStore.loading"
          :page="billPage"
          :page-size="billPageSize"
          @update:page="onBillPageUpdate"
          @update:page-size="onBillPageSizeUpdate"
        >
          <template #filters>
            <AppSelect v-model="billStatusFilter" :items="billStatusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchBills" />
            <AppDateRangePicker v-model:from="billDateFrom" v-model:to="billDateTo" @change="onBillDateRangeChange" />
          </template>
          <template #item.supplier="{ item }">{{ (item as any).supplier.name }}</template>
          <template #item.trip="{ item }">{{ (item as any).trip?.tripNumber || '-' }}</template>
          <template #item.totalAmount="{ item }">{{ formatCurrency((item as any).totalAmount) }}</template>
          <template #item.retentionAmount="{ item }">{{ formatCurrency((item as any).retentionAmount) }}</template>
          <template #item.outstandingAmount="{ item }">
            <span :class="(item as any).outstandingAmount > 0 ? 'text-error' : 'text-success'">
              {{ formatCurrency((item as any).outstandingAmount) }}
            </span>
          </template>
          <template #item.status="{ item }">
            <AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip>
          </template>
          <template #item.actions="{ item }">
            <AppBtn icon="mdi-eye-outline" variant="text" size="small" @click="openPreview(item as any)" />
            <AppBtn
              v-if="!['PAID', 'CANCELLED'].includes((item as any).status)"
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              title="Edit due date / notes"
              @click="openBillEdit(item as any)"
            />
            <AppBtn
              v-if="!['PAID', 'CANCELLED'].includes((item as any).status)"
              icon="mdi-close-circle-outline"
              variant="text"
              size="small"
              @click="onBillCancel(item as any)"
            />
            <AppBtn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              title="Delete"
              @click="openBillDeleteConfirm(item as any)"
            />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <AppWindowItem value="ungenerated">
        <p class="text-caption text-medium-emphasis mb-3">
          Completed supplier trips that don't have a bill yet — pick one up to generate its bill.
        </p>
        <div class="tblwrap">
          <AppTable>
            <thead>
              <tr>
                <th>Trip No.</th>
                <th>Supplier</th>
                <th>Route</th>
                <th>Completed On</th>
                <th class="text-right">Supplier Rate</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trip in ungeneratedBillTrips" :key="trip.id">
                <td>{{ trip.tripNumber }}</td>
                <td>{{ trip.supplierName }}</td>
                <td>{{ trip.fromLocation.name }} → {{ trip.toLocation.name }}</td>
                <td>{{ trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString() : '-' }}</td>
                <td class="text-right">{{ formatCurrency(trip.supplierRate || 0) }}</td>
                <td class="text-right">
                  <AppBtn size="small" variant="tonal" @click="generateBillForTrip(trip)">Generate Bill</AppBtn>
                </td>
              </tr>
            </tbody>
          </AppTable>
        </div>
        <p v-if="ungeneratedBillTrips.length === 0" class="text-caption text-medium-emphasis pa-4 text-center">
          No completed supplier trips are waiting to be billed.
        </p>
      </AppWindowItem>

      <AppWindowItem value="payments">
        <MasterDataTable
          :headers="paymentHeaders"
          :items="paymentStore.items"
          :items-length="paymentStore.meta?.total || 0"
          :loading="paymentStore.loading"
          :page="paymentPage"
          :page-size="paymentPageSize"
          @update:page="onPaymentPageUpdate"
          @update:page-size="onPaymentPageSizeUpdate"
        >
          <template #filters>
            <AppSelect v-model="paymentSupplierFilter" :items="supplierOptions" item-title="name" item-value="id" label="Supplier" clearable density="compact" hide-details @update:model-value="fetchPayments" />
            <AppDateRangePicker v-model:from="paymentDateFrom" v-model:to="paymentDateTo" @change="onPaymentDateRangeChange" />
          </template>
          <template #item.supplier="{ item }">{{ (item as any).supplier.name }}</template>
          <template #item.trip="{ item }">{{ (item as any).trip?.tripNumber || '-' }}</template>
          <template #item.bill="{ item }">{{ (item as any).bill?.billNumber || '-' }}</template>
          <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
          <template #item.paymentDate="{ item }">{{ new Date((item as any).paymentDate).toLocaleDateString() }}</template>
          <template #item.type="{ item }">
            <AppChip size="small" :color="(item as any).isAdvance ? 'warning' : 'success'" variant="flat">
              {{ (item as any).isAdvance ? 'Advance' : 'Settlement' }}
            </AppChip>
          </template>
          <template #item.actions="{ item }">
            <AppBtn
              v-if="(item as any).isAdvance"
              icon="mdi-link-variant"
              variant="text"
              size="small"
              @click="openAllocateDialog(item as any)"
            />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item as any)" />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <AppWindowItem value="outstanding">
        <div class="d-flex justify-end mb-3">
          <AppDateRangePicker v-model:from="outstandingDateFrom" v-model:to="outstandingDateTo" @change="onOutstandingDateRangeChange" />
        </div>
        <AppCard>
          <div class="tblwrap">
            <AppTable>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th class="text-right">Opening</th>
                  <th class="text-right">Current</th>
                  <th class="text-right">Total Outstanding</th>
                  <th class="text-right">0-15</th>
                  <th class="text-right">15+</th>
                  <th class="text-right">30+</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in supplierOutstandingSummary" :key="row.partyId">
                  <tr class="outstanding-customer-row" @click="toggleSupplierOutstanding(row.partyId)">
                    <td>
                      <span class="d-flex align-center ga-2">
                        <AppIcon :icon="expandedSupplierId === row.partyId ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="small" />
                        {{ row.partyName }}
                      </span>
                    </td>
                    <td class="text-right">{{ row.opening > 0 ? formatCurrency(row.opening) : '—' }}</td>
                    <td class="text-right">{{ formatCurrency(row.current) }}</td>
                    <td class="text-right font-weight-medium">{{ formatCurrency(row.total) }}</td>
                    <td class="text-right">{{ formatCurrency(row.bucket0To15) }}</td>
                    <td class="text-right" :class="row.bucket15Plus > 0 ? 'text-warning' : ''">{{ formatCurrency(row.bucket15Plus) }}</td>
                    <td class="text-right" :class="row.bucket30Plus > 0 ? 'text-error' : ''">{{ formatCurrency(row.bucket30Plus) }}</td>
                  </tr>
                  <tr v-if="expandedSupplierId === row.partyId">
                    <td colspan="7" class="pa-0">
                      <div class="outstanding-detail">
                        <AppTable>
                          <thead>
                            <tr>
                              <th>Reference</th>
                              <th>Source</th>
                              <th>Date</th>
                              <th>Due Date</th>
                              <th class="text-right">Total</th>
                              <th class="text-right">Outstanding</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="line in expandedSupplierLines" :key="line.id">
                              <td>{{ line.billNumber }}</td>
                              <td>
                                <AppChip v-if="line.isOpening" size="x-small" color="info" variant="tonal">Opening</AppChip>
                                <span v-else class="text-caption text-medium-emphasis">Bill</span>
                              </td>
                              <td>{{ line.billDate ? new Date(line.billDate).toLocaleDateString() : '-' }}</td>
                              <td>{{ line.dueDate ? new Date(line.dueDate).toLocaleDateString() : '-' }}</td>
                              <td class="text-right">{{ formatCurrency(line.totalAmount) }}</td>
                              <td class="text-right text-error">{{ formatCurrency(line.outstandingAmount) }}</td>
                            </tr>
                          </tbody>
                        </AppTable>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </AppTable>
          </div>
          <p v-if="supplierOutstandingSummary.length === 0" class="text-caption text-medium-emphasis pa-4">Nothing outstanding.</p>
          <p v-else-if="supplierOutstandingTotals.opening > 0" class="text-caption text-medium-emphasis pa-4 pt-0">
            Includes {{ formatCurrency(supplierOutstandingTotals.opening) }} of opening balances carried over from the previous system.
          </p>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <!-- Generate Bill -->
    <MasterFormDialog v-model="generateDialog" title="Generate Supplier Bill" :loading="generating" @submit="onGenerate">
      <AppSelect v-model="generateForm.supplierId" :items="supplierOptions" item-title="name" item-value="id" label="Supplier" :error-messages="generateErrors.supplierId" class="mb-2" @update:model-value="onGenerateSupplierChanged" />
      <AppSelect v-model="generateForm.tripId" :items="tripsForSupplier" item-title="tripNumber" item-value="id" label="Trip (optional)" clearable class="mb-2" @update:model-value="onGenerateTripChanged" />
      <AppTextField v-model.number="generateForm.subtotal" type="number" label="Subtotal" :error-messages="generateErrors.subtotal" class="mb-2" />
      <AppTextField v-model.number="generateForm.taxAmount" type="number" label="Tax Amount" class="mb-2" />
      <AppTextField v-model.number="generateForm.retentionAmount" type="number" label="Retention Amount" class="mb-2" />
      <AppTextField v-model="generateForm.dueDate" type="date" label="Due Date" class="mb-2" />
      <AppTextarea v-model="generateForm.notes" label="Notes" rows="2" />
    </MasterFormDialog>

    <!-- Bill Preview -->
    <AppDialog v-model="previewDialog" max-width="600">
      <AppCard v-if="previewTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ previewTarget.billNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="previewDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-3">
            <AppChip size="small" :color="statusColor(previewTarget.status)">{{ previewTarget.status }}</AppChip>
            <span class="text-caption text-medium-emphasis">{{ previewTarget.supplier.name }}</span>
          </div>
          <AppDivider class="mb-3" />
          <div class="row row-dense">
            <div class="col-6 text-body-2">Subtotal</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.subtotal) }}</div>
            <div class="col-6 text-body-2">Tax</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.taxAmount) }}</div>
            <div class="col-6 text-subtitle-2 font-weight-bold">Total</div>
            <div class="col-6 text-subtitle-2 font-weight-bold text-right">{{ formatCurrency(previewTarget.totalAmount) }}</div>
            <div class="col-6 text-body-2">Retention</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.retentionAmount) }}</div>
            <div class="col-6 text-body-2">Paid</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.paidAmount) }}</div>
            <div class="col-6 text-body-2">Outstanding</div>
            <div class="col-6 text-body-2 text-right text-error">{{ formatCurrency(previewTarget.outstandingAmount) }}</div>
          </div>

          <AppDivider class="my-3" />
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2">Payments</div>
          </div>
          <AppTable density="compact" class="mb-3">
            <tbody>
              <tr v-for="p in previewTarget.payments" :key="p.id">
                <td>{{ p.paymentNumber }}</td>
                <td>{{ p.isRetentionRelease ? 'Retention Release' : '' }}</td>
                <td class="text-right">{{ formatCurrency(p.amount) }}</td>
              </tr>
            </tbody>
          </AppTable>

          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2">Credit Notes</div>
            <AppBtn size="small" variant="tonal" @click="openCreditNoteDialog">Add</AppBtn>
          </div>
          <AppTable density="compact" class="mb-3">
            <tbody>
              <tr v-for="cn in previewTarget.creditNotes" :key="cn.id">
                <td>{{ cn.creditNoteNumber }}</td>
                <td>{{ cn.reason }}</td>
                <td class="text-right">{{ formatCurrency(cn.amount) }}</td>
              </tr>
            </tbody>
          </AppTable>

          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2">Debit Notes</div>
            <AppBtn size="small" variant="tonal" @click="openDebitNoteDialog">Add</AppBtn>
          </div>
          <AppTable density="compact">
            <tbody>
              <tr v-for="dn in previewTarget.debitNotes" :key="dn.id">
                <td>{{ dn.debitNoteNumber }}</td>
                <td>{{ dn.reason }}</td>
                <td class="text-right">{{ formatCurrency(dn.amount) }}</td>
              </tr>
            </tbody>
          </AppTable>
        </AppCardText>
      </AppCard>
    </AppDialog>

    <AppDialog v-model="creditNoteDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Add Supplier Credit Note</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="creditNoteForm.category" :items="creditNoteCategoryOptions" label="Category" class="mb-2" />
          <AppTextField v-model.number="creditNoteForm.amount" type="number" label="Amount" class="mb-2" />
          <AppTextarea v-model="creditNoteForm.reason" label="Reason" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="creditNoteDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="addingCreditNote" @click="submitCreditNote">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <AppDialog v-model="debitNoteDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Add Supplier Debit Note</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="debitNoteForm.category" :items="debitNoteCategoryOptions" label="Category" class="mb-2" />
          <AppTextField v-model.number="debitNoteForm.amount" type="number" label="Amount" class="mb-2" />
          <AppTextarea v-model="debitNoteForm.reason" label="Reason" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="debitNoteDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="addingDebitNote" @click="submitDebitNote">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <PaymentDialog
      v-model="paymentDialog"
      :supplier-options="supplierOptions"
      :trip-options="tripOptions"
      :bill-options="billOptions"
      :payment-mode-options="paymentModeOptions"
      :bank-account-options="bankAccountOptions"
      :cash-account-options="cashAccountOptions"
      :loading="submittingPayment"
      @submit="onPaymentSubmit"
    />

    <PaymentDialog
      v-model="allocateDialog"
      is-allocation
      :bill-options="billOptionsForAllocation"
      :loading="allocating"
      @submit="onAllocateSubmit"
    />

    <!-- Only the due date and notes are editable on a posted bill; the amounts
         come from the trip it was generated from. -->
    <AppDialog v-model="billEditDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Edit Supplier Bill</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="billEditForm.dueDate" type="date" label="Due Date" class="mb-3" />
          <AppTextarea v-model="billEditForm.notes" label="Notes" rows="3" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="billEditDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="savingBill" @click="submitBillEdit">Save Changes</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="billDeleteDialog"
      title="Delete Supplier Bill"
      :message="`Delete bill ${billDeleteTarget?.billNumber}? A bill with payments or notes against it cannot be deleted.`"
      confirm-text="Delete"
      :loading="deletingBill"
      @confirm="submitBillDelete"
    />

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Payment"
      message="Delete this supplier payment? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useSupplierBillStore, useSupplierPaymentStore } from '@/stores/accounts';
import {
  supplierBillApi,
  partyOutstandingApi,
  type PartyOutstandingRow,
  type PartyOutstandingTotals,
  type PartyOutstandingLine,
} from '@/services/accounts';
import { supplierApi } from '@/services/masters';
import { tripApi } from '@/services/operations';
import { usePaymentModeStore } from '@/stores/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import PaymentDialog from '@/components/accounts/PaymentDialog.vue';
import {
  AppBtn,
  AppTabs,
  AppTab,
  AppWindow,
  AppWindowItem,
  AppSelect,
  AppTextField,
  AppTextarea,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppDivider,
  AppTable,
  AppChip,
  AppIcon,
  AppDateRangePicker,
} from '@/components/ui';
import type { SupplierBill, SupplierPayment } from '@/types/accounts.types';

const billStore = useSupplierBillStore();
const paymentStore = useSupplierPaymentStore();
const paymentModeStore = usePaymentModeStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const mainTab = ref<'outstanding' | 'bills' | 'ungenerated' | 'payments'>('bills');

const supplierOptions = ref<{ id: string; name: string }[]>([]);
const paymentModeOptions = ref<{ id: string; name: string }[]>([]);
const bankAccountOptions = computed(() => bankAccountStore.items.map((b) => ({ id: b.id, accountHolderName: b.accountHolderName, accountNumber: b.accountNumber })));
const cashAccountOptions = computed(() => cashAccountStore.items.map((c) => ({ id: c.id, label: c.cashAccountType })));

function statusColor(status: string): string {
  return ({ PAID: 'success', CANCELLED: 'default', PARTIALLY_PAID: 'warning' } as Record<string, string>)[status] || 'info';
}

// --- Bills tab ---
const billPage = ref(1);
const billPageSize = ref(10);
const billStatusFilter = ref<string | null>(null);
const billStatusOptions = ['DRAFT', 'GENERATED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
const billDateFrom = ref<string | null>(null);
const billDateTo = ref<string | null>(null);
function onBillDateRangeChange() {
  billPage.value = 1;
  fetchBills();
}

interface CompletedSupplierTrip {
  id: string;
  tripNumber: string;
  supplierId: string | null;
  supplierName: string;
  supplierRate: number | null;
  fromLocation: { id: string; name: string };
  toLocation: { id: string; name: string };
  actualEndDate: string | null;
}
const completedTrips = ref<CompletedSupplierTrip[]>([]);
const tripsForSupplier = computed(() => completedTrips.value.filter((t) => t.supplierId === generateForm.supplierId));

// Ungenerated Bill tab — every COMPLETED trip with a supplier assigned that
// has no SupplierBill yet (checked against payablesBills, which already
// loads every bill regardless of status), newest completion first.
const ungeneratedBillTrips = computed(() =>
  completedTrips.value
    .filter((t) => t.supplierId && !payablesBills.value.some((b) => b.trip?.id === t.id))
    .sort((a, b) => new Date(b.actualEndDate || 0).getTime() - new Date(a.actualEndDate || 0).getTime())
);

// Jumped to from the Ungenerated Bill tab — opens the same Generate Bill
// dialog used from the Bills tab, pre-filled to that trip's supplier with
// the trip itself already selected.
function generateBillForTrip(trip: CompletedSupplierTrip) {
  Object.assign(generateForm, {
    supplierId: trip.supplierId || '',
    tripId: trip.id,
    subtotal: trip.supplierRate ? Number(trip.supplierRate) : undefined,
    taxAmount: 0,
    retentionAmount: 0,
    dueDate: '',
    notes: '',
  });
  Object.assign(generateErrors, { supplierId: '', subtotal: '' });
  generateDialog.value = true;
}

const billHeaders = [
  { title: 'Bill No.', key: 'billNumber', sortable: false },
  { title: 'Supplier', key: 'supplier', sortable: false },
  { title: 'Trip', key: 'trip', sortable: false },
  { title: 'Total', key: 'totalAmount', sortable: false },
  { title: 'Retention', key: 'retentionAmount', sortable: false },
  { title: 'Outstanding', key: 'outstandingAmount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onBillPageUpdate(v: number) { billPage.value = v; fetchBills(); }
function onBillPageSizeUpdate(v: number) { billPageSize.value = v; fetchBills(); }
async function fetchBills() {
  await billStore.fetchList({
    page: billPage.value,
    pageSize: billPageSize.value,
    status: billStatusFilter.value || undefined,
    // Bills tab is scoped to generated-and-unpaid bills by default — once a
    // bill is fully PAID it's tracked via its SupplierPayment(s) on the
    // Payments tab instead. Explicitly picking a status (including PAID)
    // from the filter overrides this and shows exactly that status.
    unpaidOnly: billStatusFilter.value ? undefined : true,
    dateFrom: billDateFrom.value || undefined,
    dateTo: billDateTo.value || undefined,
  });
}

// --- Generate Bill ---
const generateDialog = ref(false);
const generating = ref(false);
const generateForm = reactive({ supplierId: '', tripId: '', subtotal: undefined as number | undefined, taxAmount: 0, retentionAmount: 0, dueDate: '', notes: '' });
const generateErrors = reactive({ supplierId: '', subtotal: '' });

function openGenerateDialog() {
  Object.assign(generateForm, { supplierId: '', tripId: '', subtotal: undefined, taxAmount: 0, retentionAmount: 0, dueDate: '', notes: '' });
  Object.assign(generateErrors, { supplierId: '', subtotal: '' });
  generateDialog.value = true;
}
function onGenerateSupplierChanged() {
  generateForm.tripId = '';
}
function onGenerateTripChanged() {
  const trip = completedTrips.value.find((t) => t.id === generateForm.tripId);
  if (trip?.supplierRate) generateForm.subtotal = Number(trip.supplierRate);
}

async function onGenerate() {
  generateErrors.supplierId = generateForm.supplierId ? '' : 'Supplier is required';
  generateErrors.subtotal = generateForm.subtotal && generateForm.subtotal > 0 ? '' : 'Subtotal is required';
  if (generateErrors.supplierId || generateErrors.subtotal) return;

  generating.value = true;
  try {
    await billStore.generate({
      supplierId: generateForm.supplierId,
      tripId: generateForm.tripId || undefined,
      subtotal: generateForm.subtotal,
      taxAmount: generateForm.taxAmount || undefined,
      retentionAmount: generateForm.retentionAmount || undefined,
      dueDate: generateForm.dueDate || undefined,
      notes: generateForm.notes || undefined,
    });
    success('Supplier bill generated');
    generateDialog.value = false;
    fetchBills();
    loadPayablesBills();
    fetchOutstandingTabBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to generate supplier bill'));
  } finally {
    generating.value = false;
  }
}

// --- Bill Preview ---
const previewDialog = ref(false);
const previewTarget = ref<SupplierBill | null>(null);
async function openPreview(bill: SupplierBill) {
  previewTarget.value = await billStore.getById(bill.id);
  previewDialog.value = true;
}
async function onBillCancel(bill: SupplierBill) {
  try {
    await billStore.cancel(bill.id);
    success('Supplier bill cancelled');
    fetchBills();
    loadPayablesBills();
    fetchOutstandingTabBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to cancel bill'));
  }
}

// --- Credit Note ---
const creditNoteDialog = ref(false);
const creditNoteForm = reactive({ amount: undefined as number | undefined, reason: '', category: 'OTHER' });
const addingCreditNote = ref(false);
const creditNoteCategoryOptions = ['BILL_CORRECTION', 'RATE_REVISION', 'DISCOUNT', 'ADJUSTMENT', 'REFUND', 'OTHER'];
function openCreditNoteDialog() {
  Object.assign(creditNoteForm, { amount: undefined, reason: '', category: 'OTHER' });
  creditNoteDialog.value = true;
}
async function submitCreditNote() {
  if (!previewTarget.value || !creditNoteForm.amount || !creditNoteForm.reason.trim()) {
    error('Please provide an amount and reason');
    return;
  }
  addingCreditNote.value = true;
  try {
    const updated = await billStore.addCreditNote(previewTarget.value.id, { ...creditNoteForm });
    previewTarget.value = updated;
    success('Credit note added');
    creditNoteDialog.value = false;
    fetchBills();
    loadPayablesBills();
    fetchOutstandingTabBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to add credit note'));
  } finally {
    addingCreditNote.value = false;
  }
}

// --- Debit Note ---
const debitNoteDialog = ref(false);
const debitNoteForm = reactive({ amount: undefined as number | undefined, reason: '', category: 'OTHER' });
const addingDebitNote = ref(false);
const debitNoteCategoryOptions = ['DAMAGE_RECOVERY', 'PENALTY', 'SHORT_DELIVERY', 'QUALITY_ISSUE', 'FUEL_RECOVERY', 'COMMISSION_RECOVERY', 'OTHER'];
function openDebitNoteDialog() {
  Object.assign(debitNoteForm, { amount: undefined, reason: '', category: 'OTHER' });
  debitNoteDialog.value = true;
}
async function submitDebitNote() {
  if (!previewTarget.value || !debitNoteForm.amount || !debitNoteForm.reason.trim()) {
    error('Please provide an amount and reason');
    return;
  }
  addingDebitNote.value = true;
  try {
    const updated = await billStore.addDebitNote(previewTarget.value.id, { ...debitNoteForm });
    previewTarget.value = updated;
    success('Debit note added');
    debitNoteDialog.value = false;
    fetchBills();
    loadPayablesBills();
    fetchOutstandingTabBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to add debit note'));
  } finally {
    addingDebitNote.value = false;
  }
}

// --- Payments tab ---
const paymentPage = ref(1);
const paymentPageSize = ref(10);
const paymentSupplierFilter = ref<string | null>(null);
const paymentDateFrom = ref<string | null>(null);
const paymentDateTo = ref<string | null>(null);
function onPaymentDateRangeChange() {
  paymentPage.value = 1;
  fetchPayments();
}

const tripOptions = ref<{ id: string; tripNumber: string }[]>([]);

const paymentHeaders = [
  { title: 'Payment No.', key: 'paymentNumber', sortable: false },
  { title: 'Supplier', key: 'supplier', sortable: false },
  { title: 'Trip', key: 'trip', sortable: false },
  { title: 'Bill No.', key: 'bill', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Date', key: 'paymentDate', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPaymentPageUpdate(v: number) { paymentPage.value = v; fetchPayments(); }
function onPaymentPageSizeUpdate(v: number) { paymentPageSize.value = v; fetchPayments(); }
async function fetchPayments() {
  await paymentStore.fetchList({
    page: paymentPage.value,
    pageSize: paymentPageSize.value,
    supplierId: paymentSupplierFilter.value || undefined,
    dateFrom: paymentDateFrom.value || undefined,
    dateTo: paymentDateTo.value || undefined,
  });
}

// Fetched via the raw supplierBillApi (not billStore) so it never overwrites
// the paginated billStore.items/meta the Bills tab's table depends on.
const payablesBills = ref<SupplierBill[]>([]);
async function loadPayablesBills() {
  const response = await supplierBillApi.list({ pageSize: 200 });
  payablesBills.value = response.data.data;
}
const billOptions = computed(() =>
  payablesBills.value.filter((b) => b.outstandingAmount > 0).map((b) => ({ id: b.id, billNumber: b.billNumber, supplierId: b.supplier.id }))
);

const paymentDialog = ref(false);
const submittingPayment = ref(false);
async function onPaymentSubmit(payload: Record<string, unknown>) {
  submittingPayment.value = true;
  try {
    await paymentStore.create(payload);
    success('Supplier payment recorded');
    paymentDialog.value = false;
    fetchPayments();
    loadPayablesBills();
    fetchOutstandingTabBills();
    fetchBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record payment'));
  } finally {
    submittingPayment.value = false;
  }
}

// --- Allocate: links a previously unlinked "Advance" payment to a specific
// bill after the fact — mirrors the customer side's Receipt allocation flow.
const allocateDialog = ref(false);
const allocateTarget = ref<SupplierPayment | null>(null);
const allocating = ref(false);
const billOptionsForAllocation = computed(() =>
  billOptions.value.filter((b) => !allocateTarget.value || b.supplierId === allocateTarget.value.supplier.id)
);
function openAllocateDialog(payment: SupplierPayment) {
  allocateTarget.value = payment;
  allocateDialog.value = true;
}
async function onAllocateSubmit(payload: Record<string, unknown>) {
  if (!allocateTarget.value) return;
  allocating.value = true;
  try {
    await paymentStore.allocate(allocateTarget.value.id, payload.billId as string);
    success('Payment allocated to bill');
    allocateDialog.value = false;
    fetchPayments();
    loadPayablesBills();
    fetchOutstandingTabBills();
    fetchBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to allocate payment'));
  } finally {
    allocating.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<SupplierPayment | null>(null);
const deleting = ref(false);
function openDeleteConfirm(payment: SupplierPayment) {
  deleteTarget.value = payment;
  deleteDialog.value = true;
}
async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await paymentStore.remove(deleteTarget.value.id);
    success('Payment deleted');
    deleteDialog.value = false;
    fetchPayments();
    loadPayablesBills();
    fetchOutstandingTabBills();
    fetchBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete payment'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

// --- Outstanding tab: supplier-grouped summary with a 3-tier aging split,
// each supplier row expands (accordion — only one open at a time) into its
// own outstanding bills. Sourced from its own date-filtered fetch so it
// never disturbs payablesBills above (which the Payment dialog depends on).
function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
}

const outstandingDateFrom = ref<string | null>(null);
const outstandingDateTo = ref<string | null>(null);
const outstandingTabBills = ref<SupplierBill[]>([]);
async function fetchOutstandingTabBills() {
  const response = await supplierBillApi.list({
    pageSize: 200,
    dateFrom: outstandingDateFrom.value || undefined,
    dateTo: outstandingDateTo.value || undefined,
  });
  outstandingTabBills.value = response.data.data.filter((b) => b.outstandingAmount > 0);
}
function onOutstandingDateRangeChange() {
  fetchOutstandingTabBills();
  fetchSupplierOutstandingSummary();
}

// Grouped server-side rather than over the bill list: an opening balance
// carried over from the previous system is not a SupplierBill, so no amount
// of client-side grouping could surface it, and a supplier whose whole debt
// was migrated did not appear here at all.
const supplierOutstandingSummary = ref<PartyOutstandingRow[]>([]);
const supplierOutstandingTotals = ref<PartyOutstandingTotals>({ opening: 0, current: 0, total: 0 });

async function fetchSupplierOutstandingSummary() {
  const response = await partyOutstandingApi.suppliers({
    ...(outstandingDateFrom.value ? { dateFrom: outstandingDateFrom.value } : {}),
    ...(outstandingDateTo.value ? { dateTo: outstandingDateTo.value } : {}),
  });
  supplierOutstandingSummary.value = response.data.data;
  supplierOutstandingTotals.value = response.data.meta.totals;
}

const expandedSupplierId = ref<string | null>(null);
const expandedSupplierLines = ref<PartyOutstandingLine[]>([]);

async function toggleSupplierOutstanding(supplierId: string) {
  if (expandedSupplierId.value === supplierId) {
    expandedSupplierId.value = null;
    expandedSupplierLines.value = [];
    return;
  }
  expandedSupplierId.value = supplierId;
  // Fetched rather than filtered from the bill list so opening balance rows
  // come down with the bills they sit beside.
  expandedSupplierLines.value = (await partyOutstandingApi.supplierLines(supplierId)).data.data;
}

onMounted(async () => {
  const [suppliersRes, tripsRes] = await Promise.all([
    supplierApi.list({ pageSize: 200 }),
    tripApi.list({ status: 'COMPLETED', pageSize: 200 }),
    paymentModeStore.fetchList({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    loadPayablesBills(),
    fetchOutstandingTabBills(),
    fetchSupplierOutstandingSummary(),
  ]);
  supplierOptions.value = suppliersRes.data.data.map((s: any) => ({ id: s.id, name: s.name }));
  completedTrips.value = tripsRes.data.data.map((t: any) => ({
    id: t.id,
    tripNumber: t.tripNumber,
    supplierId: t.supplierId ?? t.supplier?.id ?? null,
    supplierName: t.supplier?.name || '-',
    supplierRate: t.supplierRate,
    fromLocation: t.fromLocation,
    toLocation: t.toLocation,
    actualEndDate: t.actualEndDate,
  }));
  tripOptions.value = tripsRes.data.data.map((t: any) => ({ id: t.id, tripNumber: t.tripNumber }));
  paymentModeOptions.value = paymentModeStore.items.map((p: any) => ({ id: p.id, name: p.name }));
  fetchBills();
  fetchPayments();
});
// --- Supplier bill edit (due date / notes) and delete ---
const billEditDialog = ref(false);
const billEditingId = ref<string | null>(null);
const billEditForm = reactive({ dueDate: '', notes: '' });
const savingBill = ref(false);

function openBillEdit(bill: SupplierBill) {
  billEditForm.dueDate = bill.dueDate ? String(bill.dueDate).slice(0, 10) : '';
  billEditForm.notes = bill.notes || '';
  billEditingId.value = bill.id;
  billEditDialog.value = true;
}

async function submitBillEdit() {
  if (!billEditingId.value) return;
  savingBill.value = true;
  try {
    await billStore.update(billEditingId.value, {
      dueDate: billEditForm.dueDate || undefined,
      notes: billEditForm.notes || undefined,
    });
    success('Supplier bill updated');
    billEditDialog.value = false;
    fetchBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update supplier bill'));
  } finally {
    savingBill.value = false;
  }
}

const billDeleteDialog = ref(false);
const billDeleteTarget = ref<SupplierBill | null>(null);
const deletingBill = ref(false);

function openBillDeleteConfirm(bill: SupplierBill) {
  billDeleteTarget.value = bill;
  billDeleteDialog.value = true;
}

async function submitBillDelete() {
  if (!billDeleteTarget.value) return;
  deletingBill.value = true;
  try {
    await billStore.remove(billDeleteTarget.value.id);
    success('Supplier bill deleted');
    billDeleteDialog.value = false;
    fetchBills();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete supplier bill'));
    billDeleteDialog.value = false;
  } finally {
    deletingBill.value = false;
  }
}

</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
.outstanding-customer-row {
  cursor: pointer;
}
.outstanding-customer-row:hover {
  background: var(--color-hover);
}
.outstanding-detail {
  background: var(--color-hover);
  padding: 4px 12px;
}
</style>
