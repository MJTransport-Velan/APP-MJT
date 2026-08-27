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
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" :disabled="!canEdit" @click="openEditDialog(item as any)" />
        <AppBtn
          :icon="(item as any).isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'"
          variant="text"
          size="small"
          :disabled="!canEdit"
          @click="onToggleStatus(item as any)"
        />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" :disabled="!canDelete" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <AppDialog v-model="dialog" :max-width="520" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Cheque Book' : 'New Cheque Book' }}</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="form.bankAccountId" :items="bankAccountOptions" item-title="label" item-value="id" label="Bank Account" :error-messages="errors.bankAccountId" :disabled="isEditing" class="mb-2" />
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

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Cheque Book"
      :message="`Delete cheque book ${deleteTarget?.bookNumber}? Only a book with no cheques recorded against it can be removed.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
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
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import type { ChequeBook } from '@/types/banking.types';

const store = useChequeBookStore();
const bankAccountStore = useBankAccountStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('chequeBook.create');
const canEdit = authStore.hasPermission('chequeBook.edit');
const canDelete = authStore.hasPermission('chequeBook.delete');

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
const isEditing = ref(false);
const editingId = ref<string | null>(null);

function blankForm() {
  return { bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' };
}
const form = reactive(blankForm());
const errors = reactive({ bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' });

function openCreateDialog() {
  Object.assign(form, blankForm());
  Object.assign(errors, { bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' });
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(book: ChequeBook) {
  Object.assign(form, {
    bankAccountId: book.bankAccountId,
    bookNumber: book.bookNumber,
    startNumber: book.startNumber,
    endNumber: book.endNumber,
  });
  Object.assign(errors, { bankAccountId: '', bookNumber: '', startNumber: '', endNumber: '' });
  isEditing.value = true;
  editingId.value = book.id;
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
    if (isEditing.value && editingId.value) {
      // bankAccountId is fixed once the book exists — the range belongs to that account.
      const { bankAccountId: _ignored, ...editable } = form;
      await store.update(editingId.value, { ...editable });
      success('Cheque Book updated successfully');
    } else {
      await store.create({ ...form });
      success('Cheque Book created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save Cheque Book'));
  } finally {
    submitting.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<ChequeBook | null>(null);
const deleting = ref(false);

function openDeleteConfirm(book: ChequeBook) {
  deleteTarget.value = book;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Cheque Book deleted successfully');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete Cheque Book'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
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
