<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Customer Invoices & Receipts</h2>
      <AppBtn v-if="mainTab === 'invoices' && !showGeneratePanel" color="primary" prepend-icon="mdi-plus" @click="openGeneratePanel">Generate Invoice</AppBtn>
      <AppBtn v-else-if="mainTab === 'receipts'" color="primary" prepend-icon="mdi-plus" @click="openReceiptDialog">Receipt Entry</AppBtn>
      <!-- No header action for the Outstanding tab — it's a read-only view. -->
    </div>

    <AppTabs v-model="mainTab" color="primary" class="mb-4">
      <AppTab value="outstanding">Outstanding</AppTab>
      <AppTab value="invoices">Invoices</AppTab>
      <AppTab value="unbilled">Unbilled Trips{{ unbilledCompletedTrips.length ? ` (${unbilledCompletedTrips.length})` : '' }}</AppTab>
      <AppTab value="receipts">Receipts</AppTab>
    </AppTabs>

    <AppWindow v-model="mainTab">
      <AppWindowItem value="invoices">
        <!-- Generate Invoice: company + trip selection happens inline on the
             page (no popup) — only Charges & Notes is a separate dialog. -->
        <div v-if="showGeneratePanel" class="generate-invoice-panel">
          <div class="d-flex justify-space-between align-center mb-3">
            <h3 class="text-subtitle-1 font-weight-medium">Generate Invoice</h3>
            <AppBtn variant="text" @click="closeGeneratePanel">Cancel</AppBtn>
          </div>

          <AppSelect
            v-model="generateForm.companyId"
            :items="companyOptions"
            item-title="name"
            item-value="id"
            label="Company"
            :error-messages="generateErrors.companyId"
            style="max-width: 360px"
            class="mb-4"
            @update:model-value="onGenerateCompanyChanged"
          />

          <template v-if="generateForm.companyId">
            <p class="text-caption text-medium-emphasis mb-2">Completed trips for {{ selectedCompanyName }}</p>
            <p v-if="completedTripsForCompany.length === 0" class="text-caption text-medium-emphasis pa-4 text-center">
              No completed trips found for this company.
            </p>
            <AppTable v-else>
              <thead>
                <tr>
                  <th>Trip No.</th>
                  <th>Route</th>
                  <th class="text-right">Freight</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="trip in completedTripsForCompany" :key="trip.id">
                  <td>{{ trip.tripNumber }}</td>
                  <td>{{ trip.fromLocation.name }} → {{ trip.toLocation.name }}</td>
                  <td class="text-right">{{ formatCurrency(trip.freightAmount || 0) }}</td>
                  <td class="text-right">
                    <AppCheckbox
                      v-if="!trip.invoiceId"
                      :model-value="generateForm.tripIds.includes(trip.id)"
                      @update:model-value="(checked: boolean) => toggleTrip(trip.id, checked)"
                    />
                    <div v-else class="d-flex align-center justify-end ga-2">
                      <AppChip size="small" color="success" variant="flat">Invoiced</AppChip>
                      <AppBtn size="small" variant="text" @click="viewTripInvoice(trip)">View Invoice</AppBtn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </AppTable>
            <div v-if="generateErrors.tripIds" class="text-caption text-error mt-2">{{ generateErrors.tripIds }}</div>

            <div class="d-flex justify-end mt-4">
              <AppBtn color="primary" variant="flat" @click="openChargesDialog">Next: Charges & Notes</AppBtn>
            </div>
          </template>
        </div>

        <MasterDataTable
          v-else
          :headers="invoiceHeaders"
          :items="invoiceStore.items"
          :items-length="invoiceStore.meta?.total || 0"
          :loading="invoiceStore.loading"
          :search="invoiceSearch"
          :page="invoicePage"
          :page-size="invoicePageSize"
          @update:search="onInvoiceSearchUpdate"
          @update:page="onInvoicePageUpdate"
          @update:page-size="onInvoicePageSizeUpdate"
        >
          <template #filters>
            <AppSelect
              v-model="invoiceCompanyFilter"
              :items="companyOptions"
              item-title="name"
              item-value="id"
              label="Company"
              clearable
              density="compact"
              hide-details
              style="min-width: 220px"
              @update:model-value="onInvoiceCompanyFilterUpdate"
            />
            <AppSelect v-model="invoiceStatusFilter" :items="invoiceStatusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchInvoices" />
            <AppDateRangePicker v-model:from="invoiceDateFrom" v-model:to="invoiceDateTo" @change="onInvoiceDateRangeChange" />
          </template>

          <template #item.company="{ item }">{{ (item as any).company.name }}</template>
          <template #item.status="{ item }">
            <InvoiceStatusChip :status="(item as any).status" />
          </template>
          <template #item.totalAmount="{ item }">{{ formatCurrency((item as any).totalAmount) }}</template>
          <template #item.outstandingAmount="{ item }">
            <span :class="(item as any).outstandingAmount > 0 ? 'text-error' : 'text-success'">
              {{ formatCurrency((item as any).outstandingAmount) }}
            </span>
          </template>
          <template #item.actions="{ item }">
            <AppBtn icon="mdi-eye-outline" variant="text" size="small" title="Quick preview" @click="openPreview(item as any)" />
            <AppBtn
              icon="mdi-file-pdf-box"
              variant="text"
              size="small"
              title="View invoice PDF"
              :loading="pdfBusyId === (item as any).id + ':view'"
              @click="onViewPdf(item as any)"
            />
            <AppBtn
              icon="mdi-download-outline"
              variant="text"
              size="small"
              title="Download invoice PDF"
              :loading="pdfBusyId === (item as any).id + ':download'"
              @click="onDownloadPdf(item as any)"
            />
            <AppBtn
              v-if="(item as any).status === 'GENERATED'"
              icon="mdi-send-outline"
              variant="text"
              size="small"
              @click="onSend(item as any)"
            />
            <AppBtn
              v-if="!['PAID', 'CANCELLED'].includes((item as any).status)"
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              title="Edit due date / notes"
              @click="openInvoiceEdit(item as any)"
            />
            <AppBtn
              v-if="!['PAID', 'CANCELLED'].includes((item as any).status)"
              icon="mdi-close-circle-outline"
              variant="text"
              size="small"
              @click="onCancel(item as any)"
            />
            <AppBtn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              title="Delete"
              @click="openInvoiceDeleteConfirm(item as any)"
            />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <AppWindowItem value="unbilled">
        <p class="text-caption text-medium-emphasis mb-3">
          Completed trips that don't have an invoice yet — pick one up to generate its invoice.
        </p>
        <div class="tblwrap">
          <AppTable>
            <thead>
              <tr>
                <th>Trip No.</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Completed On</th>
                <th class="text-right">Freight</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trip in unbilledCompletedTrips" :key="trip.id">
                <td>{{ trip.tripNumber }}</td>
                <td>{{ trip.intent.company.name }}</td>
                <td>{{ trip.fromLocation.name }} → {{ trip.toLocation.name }}</td>
                <td>{{ trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString() : '-' }}</td>
                <td class="text-right">{{ formatCurrency(trip.freightAmount || 0) }}</td>
                <td class="text-right">
                  <AppBtn size="small" variant="tonal" @click="generateInvoiceForTrip(trip)">Generate Invoice</AppBtn>
                </td>
              </tr>
            </tbody>
          </AppTable>
        </div>
        <p v-if="unbilledCompletedTrips.length === 0" class="text-caption text-medium-emphasis pa-4 text-center">
          No completed trips are waiting to be invoiced.
        </p>
      </AppWindowItem>

      <AppWindowItem value="receipts">
        <MasterDataTable
          :headers="receiptHeaders"
          :items="receiptStore.items"
          :items-length="receiptStore.meta?.total || 0"
          :loading="receiptStore.loading"
          :page="receiptPage"
          :page-size="receiptPageSize"
          @update:page="onReceiptPageUpdate"
          @update:page-size="onReceiptPageSizeUpdate"
        >
          <template #filters>
            <AppSelect v-model="advanceFilter" :items="advanceOptions" label="Type" clearable density="compact" hide-details @update:model-value="fetchReceipts" />
            <AppDateRangePicker v-model:from="receiptDateFrom" v-model:to="receiptDateTo" @change="onReceiptDateRangeChange" />
          </template>
          <template #item.company="{ item }">{{ (item as any).company.name }}</template>
          <template #item.invoice="{ item }">{{ (item as any).invoice?.invoiceNumber || '-' }}</template>
          <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
          <template #item.receiptDate="{ item }">{{ new Date((item as any).receiptDate).toLocaleDateString() }}</template>
          <template #item.type="{ item }">
            <AppChip size="small" :color="(item as any).isAdvance ? 'warning' : 'success'" variant="flat">
              {{ (item as any).isAdvance ? 'Advance' : 'Allocated' }}
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
                  <th>Customer</th>
                  <th class="text-right">Opening</th>
                  <th class="text-right">Current</th>
                  <th class="text-right">Total Outstanding</th>
                  <th class="text-right">0-15</th>
                  <th class="text-right">15+</th>
                  <th class="text-right">30+</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in customerOutstandingSummary" :key="row.partyId">
                  <tr class="outstanding-customer-row" @click="toggleCustomerOutstanding(row.partyId)">
                    <td>
                      <span class="d-flex align-center ga-2">
                        <AppIcon :icon="expandedCompanyId === row.partyId ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="small" />
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
                  <tr v-if="expandedCompanyId === row.partyId">
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
                            <tr v-for="line in expandedCompanyLines" :key="line.id">
                              <td>{{ line.invoiceNumber }}</td>
                              <td>
                                <AppChip v-if="line.isOpening" size="x-small" color="info" variant="tonal">Opening</AppChip>
                                <span v-else class="text-caption text-medium-emphasis">Invoice</span>
                              </td>
                              <td>{{ line.invoiceDate ? new Date(line.invoiceDate).toLocaleDateString() : '-' }}</td>
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
          <p v-if="customerOutstandingSummary.length === 0" class="text-caption text-medium-emphasis pa-4">Nothing outstanding.</p>
          <p v-else-if="customerOutstandingTotals.opening > 0" class="text-caption text-medium-emphasis pa-4 pt-0">
            Includes {{ formatCurrency(customerOutstandingTotals.opening) }} of opening balances carried over from the previous system.
          </p>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <!-- Charges & Notes: the only masked step — company + trip selection
         happens inline on the page above, not in a popup. -->
    <AppDialog v-model="chargesDialog" max-width="560" persistent>
      <AppCard>
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">Charges & Notes</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="chargesDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-3">
            {{ selectedCompanyName }} — {{ generateForm.tripIds.length }} trip(s) selected
          </p>

          <AppSelect v-model="generateForm.gstMasterId" :items="gstOptions" item-title="name" item-value="id" label="GST (optional)" clearable class="mb-2" />
          <AppTextField v-model="generateForm.dueDate" type="date" label="Due Date" class="mb-2" />

          <div class="d-flex justify-space-between align-center mt-2 mb-1">
            <span class="text-caption font-weight-medium">Additional Charges</span>
            <AppBtn size="small" variant="text" prepend-icon="mdi-plus" @click="addChargeRow">Add Charge</AppBtn>
          </div>
          <div v-for="(charge, idx) in generateForm.charges" :key="idx" class="d-flex ga-2 mb-2">
            <AppSelect v-model="charge.chargeType" :items="chargeTypeOptions" label="Type" style="max-width: 160px" hide-details />
            <AppTextField v-model="charge.description" label="Description" hide-details />
            <AppTextField v-model.number="charge.amount" type="number" label="Amount" style="max-width: 130px" hide-details />
            <AppBtn icon="mdi-close" variant="text" size="small" @click="generateForm.charges.splice(idx, 1)" />
          </div>

          <AppTextarea v-model="generateForm.notes" label="Notes" rows="2" class="mt-2" />
          <div class="text-caption text-medium-emphasis mt-2">
            Subtotal preview: {{ formatCurrency(selectedTripsSubtotal + chargesTotal) }}
          </div>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="chargesDialog = false">Back</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="generating" @click="onGenerate">Generate Invoice</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Invoice Preview -->
    <AppDialog v-model="previewDialog" max-width="600">
      <AppCard v-if="previewTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ previewTarget.invoiceNumber }}</span>
          <div class="d-flex align-center ga-1">
            <AppBtn
              size="small"
              variant="tonal"
              prepend-icon="mdi-file-pdf-box"
              :loading="pdfBusyId === previewTarget.id + ':view'"
              @click="onViewPdf(previewTarget)"
            >
              View PDF
            </AppBtn>
            <AppBtn
              size="small"
              variant="tonal"
              prepend-icon="mdi-download-outline"
              :loading="pdfBusyId === previewTarget.id + ':download'"
              @click="onDownloadPdf(previewTarget)"
            >
              Download
            </AppBtn>
            <AppBtn icon="mdi-close" variant="text" size="small" @click="previewDialog = false" />
          </div>
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-3">
            <InvoiceStatusChip :status="previewTarget.status" />
            <span class="text-caption text-medium-emphasis">{{ previewTarget.company.name }}</span>
          </div>
          <AppDivider class="mb-3" />
          <div class="text-subtitle-2 mb-2">Trips Included</div>
          <AppTable density="compact" class="mb-3">
            <thead>
              <tr><th>Trip No.</th><th class="text-right">Freight</th></tr>
            </thead>
            <tbody>
              <tr v-for="trip in previewTarget.trips" :key="trip.id">
                <td>{{ trip.tripNumber }}</td>
                <td class="text-right">{{ trip.freightAmount ? formatCurrency(trip.freightAmount) : '-' }}</td>
              </tr>
            </tbody>
          </AppTable>
          <div class="row row-dense">
            <div class="col-6 text-body-2">Subtotal</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.subtotal) }}</div>
            <div class="col-6 text-body-2">Tax</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.taxAmount) }}</div>
            <div class="col-6 text-subtitle-2 font-weight-bold">Total</div>
            <div class="col-6 text-subtitle-2 font-weight-bold text-right">{{ formatCurrency(previewTarget.totalAmount) }}</div>
            <div class="col-6 text-body-2">Paid</div>
            <div class="col-6 text-body-2 text-right">{{ formatCurrency(previewTarget.paidAmount) }}</div>
            <div class="col-6 text-body-2">Outstanding</div>
            <div class="col-6 text-body-2 text-right text-error">{{ formatCurrency(previewTarget.outstandingAmount) }}</div>
          </div>

          <AppDivider class="my-3" />
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2">Credit Notes</div>
            <AppBtn size="small" variant="tonal" @click="openCreditNoteDialog">Add Credit Note</AppBtn>
          </div>
          <AppTable density="compact">
            <tbody>
              <tr v-for="cn in previewTarget.creditNotes" :key="cn.id">
                <td>{{ cn.creditNoteNumber }}</td>
                <td>{{ cn.reason }}</td>
                <td class="text-right">{{ formatCurrency(cn.amount) }}</td>
              </tr>
            </tbody>
          </AppTable>

          <AppDivider class="my-3" />
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2">Debit Notes</div>
            <AppBtn size="small" variant="tonal" @click="openDebitNoteDialog">Add Debit Note</AppBtn>
          </div>
          <AppTable density="compact">
            <tbody>
              <tr v-for="dn in previewTarget.customerDebitNotes || []" :key="dn.id">
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
        <AppCardTitle class="text-h6">Add Credit Note</AppCardTitle>
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
        <AppCardTitle class="text-h6">Add Debit Note</AppCardTitle>
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

    <ReceiptDialog
      v-model="receiptDialog"
      :company-options="companyOptions"
      :invoice-options="invoiceOptions"
      :payment-mode-options="paymentModeOptions"
      :bank-account-options="bankAccountOptions"
      :cash-account-options="cashAccountOptions"
      :loading="submittingReceipt"
      @submit="onReceiptSubmit"
    />

    <ReceiptDialog
      v-model="allocateDialog"
      is-allocation
      :invoice-options="invoiceOptionsForAllocation"
      :loading="allocating"
      @submit="onAllocateSubmit"
    />

    <!-- Only the due date and notes are editable on a posted invoice; the
         amounts come from the trip it was generated from. -->
    <AppDialog v-model="invoiceEditDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Edit Invoice</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="invoiceEditForm.dueDate" type="date" label="Due Date" class="mb-3" />
          <AppTextarea v-model="invoiceEditForm.notes" label="Notes" rows="3" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="invoiceEditDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="savingInvoice" @click="submitInvoiceEdit">Save Changes</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="invoiceDeleteDialog"
      title="Delete Invoice"
      :message="`Delete invoice ${invoiceDeleteTarget?.invoiceNumber}? An invoice with receipts against it cannot be deleted.`"
      confirm-text="Delete"
      :loading="deletingInvoice"
      @confirm="submitInvoiceDelete"
    />

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Receipt"
      message="Delete this receipt? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useInvoiceStore, useReceiptStore } from '@/stores/accounts';
import {
  invoiceApi,
  partyOutstandingApi,
  type PartyOutstandingRow,
  type PartyOutstandingTotals,
  type PartyOutstandingLine,
} from '@/services/accounts';
import { adminCompanyApi } from '@/services/admin-company.service';
import { tripApi } from '@/services/operations';
import { gstMasterApi } from '@/services/masters';
import { usePaymentModeStore } from '@/stores/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import InvoiceStatusChip from '@/components/accounts/InvoiceStatusChip.vue';
import ReceiptDialog from '@/components/accounts/ReceiptDialog.vue';
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
  AppCheckbox,
  AppIcon,
  AppDateRangePicker,
} from '@/components/ui';
import type { Invoice, Receipt } from '@/types/accounts.types';
import type { Trip } from '@/types/operations.types';

const invoiceStore = useInvoiceStore();
const receiptStore = useReceiptStore();
const paymentModeStore = usePaymentModeStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const mainTab = ref<'outstanding' | 'invoices' | 'unbilled' | 'receipts'>('invoices');

const companyOptions = ref<{ id: string; name: string }[]>([]);

// --- Invoices tab ---
const invoiceSearch = ref('');
const invoicePage = ref(1);
const invoicePageSize = ref(10);
const invoiceStatusFilter = ref<string | null>(null);
const invoiceStatusOptions = ['DRAFT', 'GENERATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
const invoiceCompanyFilter = ref<string | null>(null);
function onInvoiceCompanyFilterUpdate() {
  invoicePage.value = 1;
  fetchInvoices();
}
const invoiceDateFrom = ref<string | null>(null);
const invoiceDateTo = ref<string | null>(null);
function onInvoiceDateRangeChange() {
  invoicePage.value = 1;
  fetchInvoices();
}

const gstOptions = ref<{ id: string; name: string }[]>([]);
const companyCompletedTrips = ref<Trip[]>([]);

const invoiceHeaders = [
  { title: 'Invoice No.', key: 'invoiceNumber', sortable: false },
  { title: 'Company', key: 'company', sortable: false },
  { title: 'Total', key: 'totalAmount', sortable: false },
  { title: 'Outstanding', key: 'outstandingAmount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let invoiceDebounceTimer: ReturnType<typeof setTimeout>;
function onInvoiceSearchUpdate(value: string) {
  invoiceSearch.value = value;
  clearTimeout(invoiceDebounceTimer);
  invoiceDebounceTimer = setTimeout(() => {
    invoicePage.value = 1;
    fetchInvoices();
  }, 350);
}
function onInvoicePageUpdate(v: number) {
  invoicePage.value = v;
  fetchInvoices();
}
function onInvoicePageSizeUpdate(v: number) {
  invoicePageSize.value = v;
  fetchInvoices();
}
async function fetchInvoices() {
  await invoiceStore.fetchList({
    page: invoicePage.value,
    pageSize: invoicePageSize.value,
    search: invoiceSearch.value || undefined,
    status: invoiceStatusFilter.value || undefined,
    companyId: invoiceCompanyFilter.value || undefined,
    dateFrom: invoiceDateFrom.value || undefined,
    dateTo: invoiceDateTo.value || undefined,
  });
}

// --- Generate Invoice: company + trip selection is inline on the page;
// only Charges & Notes is a separate (masked) dialog.
const showGeneratePanel = ref(false);
const chargesDialog = ref(false);
const generating = ref(false);
interface ChargeRow { chargeType: string; description: string; amount: number | undefined }
const generateForm = reactive<{ companyId: string; tripIds: string[]; gstMasterId: string; dueDate: string; notes: string; charges: ChargeRow[] }>({
  companyId: '',
  tripIds: [],
  gstMasterId: '',
  dueDate: '',
  notes: '',
  charges: [],
});
const generateErrors = reactive({ companyId: '', tripIds: '' });
const chargeTypeOptions = ['FUEL_RECOVERY', 'DETENTION', 'LOADING', 'UNLOADING', 'DISCOUNT', 'ROUND_OFF', 'OTHER'];

const selectedCompanyName = computed(() => companyOptions.value.find((c) => c.id === generateForm.companyId)?.name || '');
// All COMPLETED trips for the chosen company — both already-invoiced (shown
// with a "View Invoice" link) and not-yet-invoiced (selectable via checkbox).
const completedTripsForCompany = computed(() =>
  companyCompletedTrips.value.filter((t) => t.intent.company.id === generateForm.companyId)
);
// Unbilled Trips tab — every COMPLETED trip across all companies that has no
// invoice yet, newest completion first.
const unbilledCompletedTrips = computed(() =>
  companyCompletedTrips.value
    .filter((t) => !t.invoiceId)
    .sort((a, b) => new Date(b.actualEndDate || 0).getTime() - new Date(a.actualEndDate || 0).getTime())
);
const selectedTripsSubtotal = computed(() =>
  completedTripsForCompany.value
    .filter((t) => generateForm.tripIds.includes(t.id))
    .reduce((sum, t) => sum + Number(t.freightAmount || 0), 0)
);
const chargesTotal = computed(() => generateForm.charges.reduce((sum, c) => sum + Number(c.amount || 0), 0));

function addChargeRow() {
  generateForm.charges.push({ chargeType: 'OTHER', description: '', amount: undefined });
}

function toggleTrip(tripId: string, checked: boolean) {
  generateForm.tripIds = checked ? [...generateForm.tripIds, tripId] : generateForm.tripIds.filter((id) => id !== tripId);
}

async function viewTripInvoice(trip: Trip) {
  if (!trip.invoiceId) return;
  previewTarget.value = await invoiceStore.getById(trip.invoiceId);
  previewDialog.value = true;
}

function openGeneratePanel() {
  Object.assign(generateForm, { companyId: '', tripIds: [], gstMasterId: '', dueDate: '', notes: '', charges: [] });
  Object.assign(generateErrors, { companyId: '', tripIds: '' });
  showGeneratePanel.value = true;
}

// Jumped to from the Unbilled Trips tab — opens the same inline Generate
// Invoice panel used from the Invoices tab, pre-filled to that trip's
// company with the trip itself already checked off.
function generateInvoiceForTrip(trip: Trip) {
  Object.assign(generateForm, { companyId: trip.intent.company.id, tripIds: [trip.id], gstMasterId: '', dueDate: '', notes: '', charges: [] });
  Object.assign(generateErrors, { companyId: '', tripIds: '' });
  mainTab.value = 'invoices';
  showGeneratePanel.value = true;
}

function closeGeneratePanel() {
  showGeneratePanel.value = false;
}

function onGenerateCompanyChanged() {
  generateForm.tripIds = [];
  generateErrors.companyId = '';
}

function openChargesDialog() {
  generateErrors.companyId = generateForm.companyId ? '' : 'Company is required';
  generateErrors.tripIds = generateForm.tripIds.length === 0 ? 'Select at least one trip to invoice' : '';
  if (generateErrors.companyId || generateErrors.tripIds) return;
  chargesDialog.value = true;
}

async function onGenerate() {
  generateErrors.companyId = generateForm.companyId ? '' : 'Company is required';
  generateErrors.tripIds = generateForm.tripIds.length === 0 ? 'Select at least one completed trip' : '';
  if (generateErrors.companyId || generateErrors.tripIds) return;

  generating.value = true;
  try {
    await invoiceStore.generate({
      companyId: generateForm.companyId,
      tripIds: generateForm.tripIds,
      gstMasterId: generateForm.gstMasterId || undefined,
      dueDate: generateForm.dueDate || undefined,
      notes: generateForm.notes || undefined,
      charges: generateForm.charges
        .filter((c) => c.amount !== undefined && c.amount !== null)
        .map((c) => ({ chargeType: c.chargeType, description: c.description || undefined, amount: c.amount })),
    });
    success('Invoice generated successfully');
    chargesDialog.value = false;
    showGeneratePanel.value = false;
    fetchInvoices();
    loadCompletedTrips();
    loadOutstandingInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to generate invoice'));
  } finally {
    generating.value = false;
  }
}

// --- Preview ---
const previewDialog = ref(false);
const previewTarget = ref<Invoice | null>(null);
async function openPreview(invoice: Invoice) {
  previewTarget.value = await invoiceStore.getById(invoice.id);
  previewDialog.value = true;
}

async function onSend(invoice: Invoice) {
  try {
    await invoiceStore.send(invoice.id);
    success('Invoice marked as sent');
    fetchInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to send invoice'));
  }
}

async function onCancel(invoice: Invoice) {
  try {
    await invoiceStore.cancel(invoice.id);
    success('Invoice cancelled');
    fetchInvoices();
    loadOutstandingInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to cancel invoice'));
  }
}

// --- Credit Note ---
const creditNoteDialog = ref(false);
const creditNoteForm = reactive<{ amount: number | undefined; reason: string; category: string }>({ amount: undefined, reason: '', category: 'OTHER' });
const addingCreditNote = ref(false);
const creditNoteCategoryOptions = ['RATE_DIFFERENCE', 'SERVICE_CANCELLATION', 'DAMAGE', 'SHORT_DELIVERY', 'DISCOUNT', 'BILLING_CORRECTION', 'OTHER'];

function openCreditNoteDialog() {
  creditNoteForm.amount = undefined;
  creditNoteForm.reason = '';
  creditNoteForm.category = 'OTHER';
  creditNoteDialog.value = true;
}

async function submitCreditNote() {
  if (!previewTarget.value || !creditNoteForm.amount || !creditNoteForm.reason.trim()) {
    error('Please provide an amount and reason');
    return;
  }
  addingCreditNote.value = true;
  try {
    const updated = await invoiceStore.addCreditNote(previewTarget.value.id, {
      amount: creditNoteForm.amount,
      reason: creditNoteForm.reason,
      category: creditNoteForm.category,
    });
    previewTarget.value = updated;
    success('Credit note added');
    creditNoteDialog.value = false;
    fetchInvoices();
    loadOutstandingInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to add credit note'));
  } finally {
    addingCreditNote.value = false;
  }
}

// --- Debit Note ---
const debitNoteDialog = ref(false);
const debitNoteForm = reactive<{ amount: number | undefined; reason: string; category: string }>({ amount: undefined, reason: '', category: 'OTHER' });
const addingDebitNote = ref(false);
const debitNoteCategoryOptions = ['ADDITIONAL_CHARGES', 'PENALTY', 'INTEREST', 'FUEL_DIFFERENCE', 'SHORT_COLLECTION', 'OTHER'];

function openDebitNoteDialog() {
  debitNoteForm.amount = undefined;
  debitNoteForm.reason = '';
  debitNoteForm.category = 'OTHER';
  debitNoteDialog.value = true;
}

async function submitDebitNote() {
  if (!previewTarget.value || !debitNoteForm.amount || !debitNoteForm.reason.trim()) {
    error('Please provide an amount and reason');
    return;
  }
  addingDebitNote.value = true;
  try {
    const updated = await invoiceStore.addDebitNote(previewTarget.value.id, {
      amount: debitNoteForm.amount,
      reason: debitNoteForm.reason,
      category: debitNoteForm.category,
    });
    previewTarget.value = updated;
    success('Debit note added');
    debitNoteDialog.value = false;
    fetchInvoices();
    loadOutstandingInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to add debit note'));
  } finally {
    addingDebitNote.value = false;
  }
}

async function loadCompletedTrips() {
  // Loads every COMPLETED trip (not just uninvoiced ones) so the trip-picker
  // step can show already-invoiced trips too, with a "View Invoice" link
  // instead of a checkbox — see Trip.invoiceId/invoice below.
  const response = await tripApi.list({ status: 'COMPLETED', pageSize: 200 });
  companyCompletedTrips.value = response.data.data;
}

// --- Receipts tab ---
const receiptPage = ref(1);
const receiptPageSize = ref(10);
const advanceFilter = ref<string | null>(null);
const advanceOptions = [
  { title: 'Advance', value: 'true' },
  { title: 'Allocated', value: 'false' },
];
const receiptDateFrom = ref<string | null>(null);
const receiptDateTo = ref<string | null>(null);
function onReceiptDateRangeChange() {
  receiptPage.value = 1;
  fetchReceipts();
}

const paymentModeOptions = ref<{ id: string; name: string }[]>([]);
// Fetched via the raw invoiceApi (not invoiceStore) so it never overwrites
// the paginated invoiceStore.items/meta the Invoices tab's table depends on.
const outstandingInvoices = ref<Invoice[]>([]);

// --- Outstanding tab: customer-grouped summary with a 3-tier aging split,
// each customer row expands (accordion — only one open at a time) into its
// own outstanding lines.
//
// Grouped server-side rather than over the invoice list: an opening balance
// carried over from the previous system is not an Invoice, so no amount of
// client-side grouping could ever surface it, and a customer whose whole
// debt was migrated did not appear here at all.
const customerOutstandingSummary = ref<PartyOutstandingRow[]>([]);
const customerOutstandingTotals = ref<PartyOutstandingTotals>({ opening: 0, current: 0, total: 0 });

async function fetchCustomerOutstandingSummary() {
  const response = await partyOutstandingApi.customers({
    ...(outstandingDateFrom.value ? { dateFrom: outstandingDateFrom.value } : {}),
    ...(outstandingDateTo.value ? { dateTo: outstandingDateTo.value } : {}),
  });
  customerOutstandingSummary.value = response.data.data;
  customerOutstandingTotals.value = response.data.meta.totals;
}

/*
 * Invoice PDF. `pdfBusyId` is keyed by "<id>:<action>" rather than a plain
 * boolean so only the button actually clicked shows a spinner — the same
 * invoice appears in the table and in the preview dialog at once.
 */
const pdfBusyId = ref<string | null>(null);

async function onViewPdf(invoice: { id: string; invoiceNumber: string }) {
  pdfBusyId.value = `${invoice.id}:view`;
  try {
    await invoiceApi.viewPdf(invoice.id);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to open the invoice PDF'));
  } finally {
    pdfBusyId.value = null;
  }
}

async function onDownloadPdf(invoice: { id: string; invoiceNumber: string }) {
  pdfBusyId.value = `${invoice.id}:download`;
  try {
    // Invoice numbers can carry slashes, which a browser would read as a path
    // in the download attribute — same sanitisation as the server's.
    const base = invoice.invoiceNumber.replace(/[\\/:*?"<>|]+/g, '-');
    await invoiceApi.downloadPdf(invoice.id, `${base}.pdf`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to download the invoice PDF'));
  } finally {
    pdfBusyId.value = null;
  }
}

const expandedCompanyId = ref<string | null>(null);
const expandedCompanyLines = ref<PartyOutstandingLine[]>([]);

async function toggleCustomerOutstanding(companyId: string) {
  if (expandedCompanyId.value === companyId) {
    expandedCompanyId.value = null;
    expandedCompanyLines.value = [];
    return;
  }
  expandedCompanyId.value = companyId;
  // Fetched rather than filtered from the invoice list so the opening
  // balance rows come down with the invoices they sit beside.
  expandedCompanyLines.value = (await partyOutstandingApi.customerLines(companyId)).data.data;
}

const bankAccountOptions = computed(() => bankAccountStore.items.map((b) => ({ id: b.id, accountHolderName: b.accountHolderName, accountNumber: b.accountNumber })));
const cashAccountOptions = computed(() => cashAccountStore.items.map((c) => ({ id: c.id, label: c.cashAccountType })));

const invoiceOptions = computed(() =>
  outstandingInvoices.value.map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber }))
);
const invoiceOptionsForAllocation = computed(() =>
  outstandingInvoices.value
    .filter((i) => !allocateTarget.value || i.company.id === allocateTarget.value.company.id)
    .map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber }))
);

const receiptHeaders = [
  { title: 'Receipt No.', key: 'receiptNumber', sortable: false },
  { title: 'Company', key: 'company', sortable: false },
  { title: 'Invoice', key: 'invoice', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Date', key: 'receiptDate', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onReceiptPageUpdate(v: number) {
  receiptPage.value = v;
  fetchReceipts();
}
function onReceiptPageSizeUpdate(v: number) {
  receiptPageSize.value = v;
  fetchReceipts();
}
async function fetchReceipts() {
  await receiptStore.fetchList({
    page: receiptPage.value,
    pageSize: receiptPageSize.value,
    isAdvance: advanceFilter.value || undefined,
    dateFrom: receiptDateFrom.value || undefined,
    dateTo: receiptDateTo.value || undefined,
  });
}

async function loadOutstandingInvoices() {
  const response = await invoiceApi.list({ pageSize: 200 });
  // Cancelling an invoice only flips its status — outstandingAmount is left
  // as-is (see invoice.service.ts's cancel()) — so status must be checked
  // here too, not just the amount, or a cancelled invoice with a stale
  // nonzero balance still shows up as allocatable and 400s on submit.
  outstandingInvoices.value = response.data.data.filter((i) => i.outstandingAmount > 0 && i.status !== 'CANCELLED');
}

// Separate from outstandingInvoices above: that list feeds the Receipt-entry
// invoice pickers and must stay unfiltered. This one is scoped to the
// Outstanding tab's own date-range filter.
const outstandingDateFrom = ref<string | null>(null);
const outstandingDateTo = ref<string | null>(null);
const outstandingTabInvoices = ref<Invoice[]>([]);
async function fetchOutstandingTabInvoices() {
  const response = await invoiceApi.list({
    pageSize: 200,
    dateFrom: outstandingDateFrom.value || undefined,
    dateTo: outstandingDateTo.value || undefined,
  });
  // Same stale-balance issue as loadOutstandingInvoices() above — cancel()
  // never zeroes outstandingAmount, so status must be checked too.
  outstandingTabInvoices.value = response.data.data.filter((i) => i.outstandingAmount > 0 && i.status !== 'CANCELLED');
}
function onOutstandingDateRangeChange() {
  fetchOutstandingTabInvoices();
  fetchCustomerOutstandingSummary();
}

const receiptDialog = ref(false);
const submittingReceipt = ref(false);
function openReceiptDialog() {
  receiptDialog.value = true;
}
async function onReceiptSubmit(payload: Record<string, unknown>) {
  submittingReceipt.value = true;
  try {
    await receiptStore.create(payload);
    success('Receipt recorded successfully');
    receiptDialog.value = false;
    fetchReceipts();
    loadOutstandingInvoices();
    fetchInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record receipt'));
  } finally {
    submittingReceipt.value = false;
  }
}

const allocateDialog = ref(false);
const allocateTarget = ref<Receipt | null>(null);
const allocating = ref(false);
function openAllocateDialog(receipt: Receipt) {
  allocateTarget.value = receipt;
  allocateDialog.value = true;
}
async function onAllocateSubmit(payload: Record<string, unknown>) {
  if (!allocateTarget.value) return;
  allocating.value = true;
  try {
    await receiptStore.allocate(allocateTarget.value.id, payload.invoiceId as string);
    success('Receipt allocated to invoice');
    allocateDialog.value = false;
    fetchReceipts();
    loadOutstandingInvoices();
    fetchInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to allocate receipt'));
  } finally {
    allocating.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<Receipt | null>(null);
const deleting = ref(false);
function openDeleteConfirm(receipt: Receipt) {
  deleteTarget.value = receipt;
  deleteDialog.value = true;
}
async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await receiptStore.remove(deleteTarget.value.id);
    success('Receipt deleted');
    deleteDialog.value = false;
    fetchReceipts();
    loadOutstandingInvoices();
    fetchInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete receipt'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const [companiesRes, gstRes] = await Promise.all([
    adminCompanyApi.list({ pageSize: 200 }),
    gstMasterApi.list({ pageSize: 50 }),
    paymentModeStore.fetchList({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    loadCompletedTrips(),
    loadOutstandingInvoices(),
    fetchOutstandingTabInvoices(),
    fetchCustomerOutstandingSummary(),
  ]);
  companyOptions.value = companiesRes.data.data.map((c) => ({ id: c.id, name: c.name }));
  gstOptions.value = gstRes.data.data.map((g: any) => ({ id: g.id, name: g.name }));
  paymentModeOptions.value = paymentModeStore.items.map((p: any) => ({ id: p.id, name: p.name }));
  fetchInvoices();
  fetchReceipts();
});
// --- Invoice edit (due date / notes) and delete ---
const invoiceEditDialog = ref(false);
const invoiceEditingId = ref<string | null>(null);
const invoiceEditForm = reactive({ dueDate: '', notes: '' });
const savingInvoice = ref(false);

function openInvoiceEdit(invoice: Invoice) {
  invoiceEditForm.dueDate = invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '';
  invoiceEditForm.notes = invoice.notes || '';
  invoiceEditingId.value = invoice.id;
  invoiceEditDialog.value = true;
}

async function submitInvoiceEdit() {
  if (!invoiceEditingId.value) return;
  savingInvoice.value = true;
  try {
    await invoiceStore.update(invoiceEditingId.value, {
      dueDate: invoiceEditForm.dueDate || undefined,
      notes: invoiceEditForm.notes || undefined,
    });
    success('Invoice updated');
    invoiceEditDialog.value = false;
    fetchInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update invoice'));
  } finally {
    savingInvoice.value = false;
  }
}

const invoiceDeleteDialog = ref(false);
const invoiceDeleteTarget = ref<Invoice | null>(null);
const deletingInvoice = ref(false);

function openInvoiceDeleteConfirm(invoice: Invoice) {
  invoiceDeleteTarget.value = invoice;
  invoiceDeleteDialog.value = true;
}

async function submitInvoiceDelete() {
  if (!invoiceDeleteTarget.value) return;
  deletingInvoice.value = true;
  try {
    await invoiceStore.remove(invoiceDeleteTarget.value.id);
    success('Invoice deleted');
    invoiceDeleteDialog.value = false;
    fetchInvoices();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete invoice'));
    invoiceDeleteDialog.value = false;
  } finally {
    deletingInvoice.value = false;
  }
}

</script>

<style scoped>
.generate-invoice-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-lg);
  padding: 20px;
}

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
