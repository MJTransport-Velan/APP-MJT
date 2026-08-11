<template>
  <div>
    <MasterToolbar title="Cheque Books" :can-create="canCreate" create-label="New Cheque Book" @create="openCreateDialog" />

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.items.length"
      :loading="store.loading"
      :search="search"
      :page="1"
      :page-size="100"
      @update:search="search = $event"
    >
      <template #item.bankAccount="{ item }">{{ (item as any).bankAccount?.accountHolderName }}</template>
      <template #item.range="{ item }">{{ (item as any).startNumber }} – {{ (item as any).endNumber }} ({{ (item as any).totalLeaves }} leaves)</template>
      <template #item.isActive="{ item }">
        <StatusChip :is-active="(item as any).isActive" />
      </template>
      <template #item.actions="{ item }">
        <AppBtn
          :icon="(item as any).isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'"
          variant="text"
          size="small"
          :disabled="!canEdit"
          @click="onToggleStatus(item as any)"
        />
      </template>
    </MasterDataTable>

    <AppDialog v-model="dialog" :max-width="520" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">New Cheque Book</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="form.bankAccountId" :items="bankAccountOptions" item-title="label" item-value="id" label="Bank Account" :error-messages="errors.bankAccountId" class="mb-2" />
          <AppTextField v-model="form.bookNumber" label="Book Number" :error-messages="errors.bookNumber" class="mb-2" />
          <AppTextField v-model="form.startNumber" label="Start Number" :error-messages="errors.startNumber" class="mb-2" />
          <AppTextField v-model="form.endNumber" label="End Number" :error-messages="errors.endNumber" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useChequeBookStore, useBankAccountStore } from '@/stores/banking';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTextField, AppSelect } from '@/components/ui';

const store = useChequeBookStore();
const bankAccountStore = useBankAccountStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('chequeBook.create');
const canEdit = authStore.hasPermission('chequeBook.edit');

const headers = [
  { title: 'Book Number', key: 'bookNumber', sortable: false },
  { title: 'Bank Account', key: 'bankAccount', sortable: false },
  { title: 'Range', key: 'range', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const search = ref('');
const bankAccountOptions = computed(() => bankAccountStore.items.map((b) => ({ id: b.id, label: `${b.accountHolderName} (${b.accountNumber})` })));

const dialog = ref(false);
const submitting = ref(false);

function blankForm() {
  return { bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' };
}
const form = reactive(blankForm());
const errors = reactive({ bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' });

function openCreateDialog() {
  Object.assign(form, blankForm());
  Object.assign(errors, { bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' });
  dialog.value = true;
}

function validateForm(): boolean {
  errors.bankAccountId = form.bankAccountId ? '' : 'Bank Account is required';
  errors.bookNumber = form.bookNumber.trim() ? '' : 'Book number is required';
  errors.startNumber = form.startNumber.trim() ? '' : 'Start number is required';
  errors.endNumber = form.endNumber.trim() ? '' : 'End number is required';
  return !errors.bankAccountId && !errors.bookNumber && !errors.startNumber && !errors.endNumber;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({ ...form });
    success('Cheque Book created successfully');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create Cheque Book'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(book: { id: string }) {
  try {
    await store.toggleStatus(book.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

async function fetchData() {
  await store.fetchList({});
}

onMounted(async () => {
  await bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' });
  fetchData();
});
</script>
