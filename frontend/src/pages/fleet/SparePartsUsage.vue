<template>
  <div>
    <h2 class="text-h6 mb-4">Spare Parts Usage</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="usage">Issue / Return</AppTab>
      <AppTab value="catalog">Spare Parts Catalog</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="usage">
        <div class="d-flex flex-wrap justify-space-between align-center mb-3 ga-2">
          <AppSelect
            v-model="vehicleFilter"
            :items="vehicleOptions"
            item-title="registrationNumber"
            item-value="id"
            label="Filter by Vehicle"
            clearable
            style="max-width: 280px"
            @update:model-value="fetchData"
          />
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Record Usage</AppBtn>
        </div>

        <MasterDataTable
          :headers="headers"
          :items="store.items"
          :items-length="store.meta?.total || 0"
          :loading="store.loading"
          :page="page"
          :page-size="pageSize"
          @update:page="onPageUpdate"
          @update:page-size="onPageSizeUpdate"
        >
          <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
          <template #item.sparePart="{ item }">{{ (item as any).sparePart.name }}</template>
          <template #item.type="{ item }">
            <AppChip size="small" :color="(item as any).type === 'ISSUE' ? 'warning' : 'success'" variant="flat">
              {{ (item as any).type }}
            </AppChip>
          </template>
          <template #item.usageDate="{ item }">{{ new Date((item as any).usageDate).toLocaleDateString() }}</template>
        </MasterDataTable>
      </AppWindowItem>

      <AppWindowItem value="catalog">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openPartDialog">New Spare Part</AppBtn>
        </div>
        <MasterDataTable
          :headers="partHeaders"
          :items="sparePartStore.items"
          :items-length="sparePartStore.meta?.total || 0"
          :loading="sparePartStore.loading"
          :page="partPage"
          @update:page="(v: number) => { partPage = v; fetchParts(); }"
        >
          <template #item.stockQuantity="{ item }">
            <AppChip size="small" :color="isLowStock(item as any) ? 'error' : 'default'" variant="tonal">
              {{ (item as any).stockQuantity }}
            </AppChip>
          </template>
          <template #item.isActive="{ item }">
            <StatusChip :is-active="(item as any).isActive" />
          </template>
        </MasterDataTable>
      </AppWindowItem>
    </AppWindow>

    <MasterFormDialog v-model="dialog" title="Record Spare Part Usage" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppSelect
        v-model="form.sparePartId"
        :items="sparePartStore.items"
        item-title="name"
        item-value="id"
        label="Spare Part"
        :error-messages="errors.sparePartId"
        class="mb-2"
      />
      <AppSelect v-model="form.type" :items="['ISSUE', 'RETURN']" label="Type" class="mb-2" />
      <AppTextField v-model.number="form.quantity" type="number" label="Quantity" :error-messages="errors.quantity" class="mb-2" />
      <AppTextField v-model="form.usageDate" type="date" label="Date" class="mb-2" />
      <AppTextarea v-model="form.notes" label="Notes" rows="2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="partDialog" title="New Spare Part" :loading="submittingPart" @submit="onSubmitPart">
      <AppTextField v-model="partForm.name" label="Name" :error-messages="partErrors.name" class="mb-2" />
      <AppTextField v-model="partForm.code" label="Code" :error-messages="partErrors.code" class="mb-2" />
      <AppTextField v-model="partForm.unit" label="Unit" class="mb-2" />
      <AppTextField v-model.number="partForm.stockQuantity" type="number" label="Opening Stock" class="mb-2" />
      <AppTextField v-model.number="partForm.reorderLevel" type="number" label="Reorder Level" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useSparePartUsageStore, useSparePartStore } from '@/stores/fleet';
import { useVehicleStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import {
  AppTabs,
  AppTab,
  AppWindow,
  AppWindowItem,
  AppSelect,
  AppBtn,
  AppChip,
  AppTextField,
  AppTextarea,
} from '@/components/ui';

const store = useSparePartUsageStore();
const sparePartStore = useSparePartStore();
const vehicleStore = useVehicleStore();
const { success, error } = useSnackbar();

const activeTab = ref('usage');
const page = ref(1);
const pageSize = ref(10);
const partPage = ref(1);
const vehicleFilter = ref<string | null>(null);

const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);

const headers = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Spare Part', key: 'sparePart', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Quantity', key: 'quantity', sortable: false },
  { title: 'Date', key: 'usageDate', sortable: false },
];

const partHeaders = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Code', key: 'code', sortable: false },
  { title: 'Unit', key: 'unit', sortable: false },
  { title: 'Stock', key: 'stockQuantity', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
];

function isLowStock(part: any) {
  return part.reorderLevel !== null && part.reorderLevel !== undefined && part.stockQuantity <= part.reorderLevel;
}

function onPageUpdate(v: number) {
  page.value = v;
  fetchData();
}
function onPageSizeUpdate(v: number) {
  pageSize.value = v;
  fetchData();
}
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, vehicleId: vehicleFilter.value || undefined });
}
async function fetchParts() {
  await sparePartStore.fetchList({ page: partPage.value, pageSize: 10 });
}

const dialog = ref(false);
const submitting = ref(false);
const form = reactive<{
  vehicleId: string;
  sparePartId: string;
  type: string;
  quantity: number | undefined;
  usageDate: string;
  notes: string;
}>({
  vehicleId: '',
  sparePartId: '',
  type: 'ISSUE',
  quantity: undefined,
  usageDate: new Date().toISOString().substring(0, 10),
  notes: '',
});
const errors = reactive({ vehicleId: '', sparePartId: '', quantity: '' });

function openCreateDialog() {
  Object.assign(form, {
    vehicleId: '',
    sparePartId: '',
    type: 'ISSUE',
    quantity: undefined,
    usageDate: new Date().toISOString().substring(0, 10),
    notes: '',
  });
  Object.assign(errors, { vehicleId: '', sparePartId: '', quantity: '' });
  dialog.value = true;
}

function validateForm(): boolean {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.sparePartId = form.sparePartId ? '' : 'Spare part is required';
  errors.quantity = !form.quantity || form.quantity <= 0 ? 'Quantity must be greater than 0' : '';
  return !errors.vehicleId && !errors.sparePartId && !errors.quantity;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({
      vehicleId: form.vehicleId,
      sparePartId: form.sparePartId,
      type: form.type,
      quantity: form.quantity,
      usageDate: form.usageDate,
      notes: form.notes || undefined,
    });
    success('Spare part usage recorded');
    dialog.value = false;
    fetchData();
    fetchParts();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record usage'));
  } finally {
    submitting.value = false;
  }
}

const partDialog = ref(false);
const submittingPart = ref(false);
const partForm = reactive<{ name: string; code: string; unit: string; stockQuantity: number | undefined; reorderLevel: number | undefined }>({
  name: '',
  code: '',
  unit: '',
  stockQuantity: 0,
  reorderLevel: undefined,
});
const partErrors = reactive({ name: '', code: '' });

function openPartDialog() {
  Object.assign(partForm, { name: '', code: '', unit: '', stockQuantity: 0, reorderLevel: undefined });
  Object.assign(partErrors, { name: '', code: '' });
  partDialog.value = true;
}

async function onSubmitPart() {
  partErrors.name = partForm.name.trim() ? '' : 'Name is required';
  partErrors.code = partForm.code.trim() ? '' : 'Code is required';
  if (partErrors.name || partErrors.code) return;
  submittingPart.value = true;
  try {
    await sparePartStore.create({
      name: partForm.name,
      code: partForm.code,
      unit: partForm.unit || undefined,
      stockQuantity: partForm.stockQuantity,
      reorderLevel: partForm.reorderLevel,
    });
    success('Spare part created');
    partDialog.value = false;
    fetchParts();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create spare part'));
  } finally {
    submittingPart.value = false;
  }
}

onMounted(async () => {
  await Promise.all([vehicleStore.fetchList({ pageSize: 200 }), fetchParts()]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  fetchData();
});
</script>
