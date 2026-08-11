<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Companies</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Company</AppBtn>
    </div>

    <AppCard>
      <AppCardText>
        <AppTextField
          v-model="search"
          label="Search company name or code"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          @update:model-value="debouncedFetch"
        />
      </AppCardText>

      <AppDataTable
        v-model:items-per-page="pageSize"
        v-model:page="page"
        :headers="headers"
        :items="companyStore.items"
        :items-length="companyStore.meta?.total || 0"
        :loading="companyStore.loading"
        item-value="id"
        @update:options="fetchCompanies"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.code }}</div>
        </template>

        <template #item.group="{ item }">
          <AppChip size="small" color="info" variant="tonal">{{ item.group.name }}</AppChip>
        </template>

        <template #item.actions="{ item }">
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)" />
          <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item)" />
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Create / Edit Company -->
    <AppDialog v-model="dialog" max-width="560" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Company' : 'New Company' }}</AppCardTitle>
        <AppCardText>
          <div class="row">
            <div class="col-12 col-sm-6">
              <AppTextField v-model="form.name" label="Company Name" :error-messages="formErrors.name" />
            </div>
            <div class="col-12 col-sm-6">
              <AppTextField
                v-model="form.code"
                label="Company Code"
                :disabled="isEditing"
                :error-messages="formErrors.code"
              />
            </div>
            <div class="col-12 col-sm-6">
              <AppSelect
                v-model="form.groupId"
                :items="groupOptions"
                item-title="name"
                item-value="id"
                label="Group"
                :error-messages="formErrors.groupId"
              />
            </div>
            <div class="col-12 col-sm-6">
              <AppTextField v-model="form.contactPerson" label="Contact Person" />
            </div>
            <div class="col-12 col-sm-6">
              <AppTextField v-model="form.phone" label="Phone" />
            </div>
            <div class="col-12 col-sm-6">
              <AppTextField v-model="form.email" label="Email" />
            </div>
            <div class="col-12 col-sm-6" v-if="isEditing">
              <AppSwitch v-model="form.isActive" label="Active" color="primary" hide-details />
            </div>
            <div class="col-12">
              <AppTextarea v-model="form.address" label="Address" rows="2" />
            </div>
          </div>
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
      title="Delete Company"
      :message="`Delete company '${deleteTarget?.name}'?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAdminCompanyStore } from '@/stores/admin-company.store';
import { adminGroupApi } from '@/services/admin-group.service';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  AppBtn,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppChip,
  AppDialog,
  AppTextField,
  AppTextarea,
  AppSelect,
  AppSwitch,
  AppDataTable,
} from '@/components/ui';
import type { AdminCompany } from '@/types/admin.types';

const companyStore = useAdminCompanyStore();
const { success, error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const groupOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'Company', key: 'name', sortable: false },
  { title: 'Group', key: 'group', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchCompanies, 350);
}

async function fetchCompanies() {
  await companyStore.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

// --- Create / Edit ---
const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  name: '',
  code: '',
  groupId: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
});
const formErrors = reactive({ name: '', code: '', groupId: '' });

function openCreateDialog() {
  Object.assign(form, { name: '', code: '', groupId: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });
  formErrors.name = '';
  formErrors.code = '';
  formErrors.groupId = '';
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(company: AdminCompany) {
  Object.assign(form, {
    name: company.name,
    code: company.code,
    groupId: company.group.id,
    contactPerson: company.contactPerson || '',
    phone: company.phone || '',
    email: company.email || '',
    address: company.address || '',
    isActive: company.isActive,
  });
  formErrors.name = '';
  formErrors.code = '';
  formErrors.groupId = '';
  isEditing.value = true;
  editingId.value = company.id;
  dialog.value = true;
}

async function onSubmit() {
  formErrors.name = form.name.trim().length < 2 ? 'Company name must be at least 2 characters' : '';
  formErrors.code = !isEditing.value && form.code.trim().length < 2 ? 'Company code must be at least 2 characters' : '';
  formErrors.groupId = form.groupId ? '' : 'Group is required';
  if (formErrors.name || formErrors.code || formErrors.groupId) return;

  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await companyStore.update(editingId.value, {
        name: form.name,
        groupId: form.groupId,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        address: form.address,
        isActive: form.isActive,
      });
      success('Company updated successfully');
    } else {
      await companyStore.create({
        name: form.name,
        code: form.code,
        groupId: form.groupId,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        address: form.address,
      });
      success('Company created successfully');
    }
    dialog.value = false;
    fetchCompanies();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save company'));
  } finally {
    submitting.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<AdminCompany | null>(null);
const deleting = ref(false);

function openDeleteConfirm(company: AdminCompany) {
  deleteTarget.value = company;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await companyStore.remove(deleteTarget.value.id);
    success('Company deleted successfully');
    deleteDialog.value = false;
    fetchCompanies();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete company'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const groupsRes = await adminGroupApi.list({ pageSize: 200 });
  groupOptions.value = groupsRes.data.data.map((g) => ({ id: g.id, name: g.name }));
  fetchCompanies();
});
</script>
