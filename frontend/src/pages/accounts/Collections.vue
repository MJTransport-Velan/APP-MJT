<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Collection Management</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openLogDialog">Log Activity</AppBtn>
    </div>

    <AppCard class="mb-4" v-if="upcoming.length">
      <AppCardTitle class="text-subtitle-1">Upcoming Follow-ups</AppCardTitle>
      <AppCardText>
        <div v-for="a in upcoming" :key="a.id" class="d-flex justify-space-between py-1">
          <span>{{ a.company?.name }} — {{ a.activityType }}{{ a.invoice ? ` (${a.invoice.invoiceNumber})` : '' }}</span>
          <span class="text-caption text-medium-emphasis">{{ a.followUpDate ? new Date(a.followUpDate).toLocaleDateString() : '' }}</span>
        </div>
      </AppCardText>
    </AppCard>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #item.company="{ item }">{{ (item as any).company?.name }}</template>
      <template #item.invoice="{ item }">{{ (item as any).invoice?.invoiceNumber || '-' }}</template>
      <template #item.activityType="{ item }"><AppChip size="small">{{ (item as any).activityType }}</AppChip></template>
      <template #item.followUpDate="{ item }">{{ (item as any).followUpDate ? new Date((item as any).followUpDate).toLocaleDateString() : '-' }}</template>
    </MasterDataTable>

    <AppDialog v-model="logDialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Log Collection Activity</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="form.companyId" :items="companyOptions" item-title="name" item-value="id" label="Customer" :error-messages="errors.companyId" class="mb-2" />
          <AppSelect v-model="form.invoiceId" :items="invoiceOptionsForCompany" item-title="invoiceNumber" item-value="id" label="Invoice (optional)" clearable class="mb-2" />
          <AppSelect v-model="form.activityType" :items="activityTypeOptions" label="Activity Type" class="mb-2" />
          <AppTextField v-if="form.activityType === 'PROMISE_TO_PAY'" v-model.number="form.promisedAmount" type="number" label="Promised Amount" class="mb-2" />
          <AppTextField v-if="form.activityType === 'PROMISE_TO_PAY'" v-model="form.promisedDate" type="date" label="Promised Date" class="mb-2" />
          <AppTextField v-model="form.followUpDate" type="date" label="Next Follow-up Date" class="mb-2" />
          <AppTextarea v-model="form.notes" label="Notes" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="logDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useCollectionActivityStore, useInvoiceStore } from '@/stores/accounts';
import { adminCompanyApi } from '@/services/admin-company.service';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppSelect, AppTextField, AppTextarea, AppChip } from '@/components/ui';

const store = useCollectionActivityStore();
const invoiceStore = useInvoiceStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const companyOptions = ref<{ id: string; name: string }[]>([]);
const upcoming = computed(() => store.upcoming);

const invoiceOptionsForCompany = computed(() =>
  invoiceStore.items.filter((i) => i.company.id === form.companyId && i.outstandingAmount > 0).map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber }))
);

const activityTypeOptions = ['CALL', 'EMAIL', 'REMINDER', 'PROMISE_TO_PAY', 'NOTE'];

const headers = [
  { title: 'Customer', key: 'company', sortable: false },
  { title: 'Invoice', key: 'invoice', sortable: false },
  { title: 'Type', key: 'activityType', sortable: false },
  { title: 'Follow-up', key: 'followUpDate', sortable: false },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value });
}

const logDialog = ref(false);
const submitting = ref(false);
const form = reactive({ companyId: '', invoiceId: '', activityType: 'CALL', notes: '', promisedAmount: undefined as number | undefined, promisedDate: '', followUpDate: '' });
const errors = reactive({ companyId: '' });

function openLogDialog() {
  Object.assign(form, { companyId: '', invoiceId: '', activityType: 'CALL', notes: '', promisedAmount: undefined, promisedDate: '', followUpDate: '' });
  errors.companyId = '';
  logDialog.value = true;
}

async function onSubmit() {
  errors.companyId = form.companyId ? '' : 'Customer is required';
  if (errors.companyId) return;
  submitting.value = true;
  try {
    await store.create({
      companyId: form.companyId,
      invoiceId: form.invoiceId || undefined,
      activityType: form.activityType,
      notes: form.notes || undefined,
      promisedAmount: form.promisedAmount || undefined,
      promisedDate: form.promisedDate || undefined,
      followUpDate: form.followUpDate || undefined,
    });
    success('Activity logged');
    logDialog.value = false;
    fetchData();
    store.fetchUpcoming(7);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to log activity'));
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  const [companiesRes] = await Promise.all([adminCompanyApi.list({ pageSize: 200 }), invoiceStore.fetchList({ pageSize: 200 }), store.fetchUpcoming(7)]);
  companyOptions.value = companiesRes.data.data.map((c: any) => ({ id: c.id, name: c.name }));
  fetchData();
});
</script>
