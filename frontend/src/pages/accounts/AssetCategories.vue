<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Asset Categories</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Category</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.items.length" :loading="store.loading" :page-size="100">
      <template #item.usefulLifeMonths="{ item }">{{ (item as any).usefulLifeMonths }} mo</template>
      <template #item.depreciationMethod="{ item }"><AppChip size="small" variant="outlined">{{ (item as any).depreciationMethod }}</AppChip></template>
      <template #item.residualValuePercent="{ item }">{{ (item as any).residualValuePercent }}%</template>
      <template #item.isActive="{ item }">
        <AppChip size="small" :color="(item as any).isActive ? 'success' : 'default'">{{ (item as any).isActive ? 'Active' : 'Inactive' }}</AppChip>
      </template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item as any)" />
        <AppBtn v-if="!(item as any).isSystemCategory" icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" :title="editTarget ? 'Edit Asset Category' : 'New Asset Category'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-if="!editTarget" v-model="form.code" label="Code" :error-messages="errors.code" class="mb-2" />
      <AppTextField v-model="form.name" label="Name" :error-messages="errors.name" class="mb-2" />
      <AppSelect v-if="!editTarget" v-model="form.assetType" :items="assetTypeOptions" label="Asset Type" class="mb-2" />
      <AppTextField v-model.number="form.usefulLifeMonths" type="number" label="Useful Life (months)" :error-messages="errors.usefulLifeMonths" class="mb-2" />
      <AppSelect v-model="form.depreciationMethod" :items="depreciationMethodOptions" label="Depreciation Method" class="mb-2" />
      <AppTextField
        v-if="form.depreciationMethod === 'WRITTEN_DOWN_VALUE'"
        v-model.number="form.depreciationRatePercent"
        type="number"
        label="Depreciation Rate % (annual, WDV)"
        class="mb-2"
      />
      <AppTextField v-model.number="form.residualValuePercent" type="number" label="Residual Value %" class="mb-2" />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Asset Category"
      message="Delete this asset category? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAssetCategoryStore } from '@/stores/accounts/vehicleAssets';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip } from '@/components/ui';
import type { AssetCategory } from '@/types/phase6.types';

const store = useAssetCategoryStore();
const { success, error } = useSnackbar();

const assetTypeOptions = ['VEHICLE', 'LAND', 'BUILDING', 'FURNITURE', 'COMPUTER', 'MACHINERY', 'OFFICE_EQUIPMENT', 'WAREHOUSE_EQUIPMENT', 'OTHER'];
const depreciationMethodOptions = ['STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE', 'CUSTOM'];

const headers = [
  { title: 'Code', key: 'code', sortable: false },
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Useful Life', key: 'usefulLifeMonths', sortable: false },
  { title: 'Method', key: 'depreciationMethod', sortable: false },
  { title: 'Residual %', key: 'residualValuePercent', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

async function fetchData() {
  await store.fetchList();
}

const dialog = ref(false);
const submitting = ref(false);
const editTarget = ref<AssetCategory | null>(null);
const form = reactive({
  code: '',
  name: '',
  assetType: 'VEHICLE',
  usefulLifeMonths: 96,
  depreciationMethod: 'STRAIGHT_LINE',
  depreciationRatePercent: undefined as number | undefined,
  residualValuePercent: 5,
});
const errors = reactive({ code: '', name: '', usefulLifeMonths: '' });

function openCreateDialog() {
  editTarget.value = null;
  Object.assign(form, { code: '', name: '', assetType: 'VEHICLE', usefulLifeMonths: 96, depreciationMethod: 'STRAIGHT_LINE', depreciationRatePercent: undefined, residualValuePercent: 5 });
  Object.assign(errors, { code: '', name: '', usefulLifeMonths: '' });
  dialog.value = true;
}

function openEditDialog(category: AssetCategory) {
  editTarget.value = category;
  Object.assign(form, {
    code: category.code,
    name: category.name,
    assetType: category.assetType,
    usefulLifeMonths: category.usefulLifeMonths,
    depreciationMethod: category.depreciationMethod,
    depreciationRatePercent: category.depreciationRatePercent ?? undefined,
    residualValuePercent: category.residualValuePercent,
  });
  Object.assign(errors, { code: '', name: '', usefulLifeMonths: '' });
  dialog.value = true;
}

async function onSubmit() {
  errors.code = !editTarget.value && !form.code ? 'Code is required' : '';
  errors.name = form.name ? '' : 'Name is required';
  errors.usefulLifeMonths = form.usefulLifeMonths > 0 ? '' : 'Useful life must be greater than 0';
  if (errors.code || errors.name || errors.usefulLifeMonths) return;

  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.update(editTarget.value.id, {
        name: form.name,
        usefulLifeMonths: form.usefulLifeMonths,
        depreciationMethod: form.depreciationMethod,
        depreciationRatePercent: form.depreciationRatePercent,
        residualValuePercent: form.residualValuePercent,
      });
      success('Asset category updated');
    } else {
      await store.create({
        code: form.code,
        name: form.name,
        assetType: form.assetType,
        usefulLifeMonths: form.usefulLifeMonths,
        depreciationMethod: form.depreciationMethod,
        depreciationRatePercent: form.depreciationRatePercent,
        residualValuePercent: form.residualValuePercent,
      });
      success('Asset category created');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save asset category'));
  } finally {
    submitting.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<AssetCategory | null>(null);
const deleting = ref(false);
function openDeleteConfirm(category: AssetCategory) {
  deleteTarget.value = category;
  deleteDialog.value = true;
}
async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Asset category deleted');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete asset category'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(fetchData);
</script>
