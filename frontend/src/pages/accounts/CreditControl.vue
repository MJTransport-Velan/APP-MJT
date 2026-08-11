<template>
  <div>
    <h2 class="text-h6 mb-4">Customer Credit Control</h2>

    <AppCard>
      <AppCardText>
        <AppTextField v-model="search" label="Search customers" prepend-inner-icon="mdi-magnify" hide-details clearable class="mb-3" style="max-width: 320px" />
        <div class="tblwrap">
          <AppTable>
            <thead>
              <tr>
                <th>Customer</th>
                <th class="text-right">Credit Limit</th>
                <th class="text-right">Credit Days</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredCompanies" :key="c.id">
                <td>{{ c.name }}</td>
                <td class="text-right">{{ c.creditLimit !== null && c.creditLimit !== undefined ? formatCurrency(c.creditLimit) : '—' }}</td>
                <td class="text-right">{{ c.creditDays ?? '—' }}</td>
                <td><AppChip size="small" :color="c.isBlocked ? 'error' : 'success'">{{ c.isBlocked ? 'Blocked' : 'Active' }}</AppChip></td>
                <td class="text-right"><AppBtn size="small" variant="text" @click="openDialog(c.id)">Manage</AppBtn></td>
              </tr>
            </tbody>
          </AppTable>
        </div>
      </AppCardText>
    </AppCard>

    <AppDialog v-model="dialog" max-width="480" persistent>
      <AppCard v-if="current">
        <AppCardTitle class="text-h6">{{ current.name }} — Credit Control</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-2">Live outstanding: {{ formatCurrency(current.liveOutstanding) }}</p>
          <AppTextField v-model.number="form.creditLimit" type="number" label="Credit Limit" class="mb-2" />
          <AppTextField v-model.number="form.creditDays" type="number" label="Credit Days" class="mb-2" />
          <AppCheckbox v-model="form.isBlocked" label="Block this customer" class="mb-2" />
          <AppTextarea v-if="form.isBlocked" v-model="form.blockedReason" label="Block Reason" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="saving" @click="onSave">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useCreditControlStore } from '@/stores/accounts';
import { adminCompanyApi } from '@/services/admin-company.service';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import { AppCard, AppCardText, AppCardTitle, AppCardActions, AppTextField, AppTextarea, AppCheckbox, AppTable, AppChip, AppBtn, AppDialog } from '@/components/ui';

const store = useCreditControlStore();
const { success, error } = useSnackbar();

const search = ref('');
const companies = ref<{ id: string; name: string; creditLimit: number | null; creditDays: number | null; isBlocked: boolean }[]>([]);
const filteredCompanies = computed(() => {
  if (!search.value.trim()) return companies.value;
  const q = search.value.trim().toLowerCase();
  return companies.value.filter((c) => c.name.toLowerCase().includes(q));
});

const dialog = ref(false);
const saving = ref(false);
const current = computed(() => store.current);
const form = reactive<{ creditLimit: number | null; creditDays: number | null; isBlocked: boolean; blockedReason: string }>({
  creditLimit: null,
  creditDays: null,
  isBlocked: false,
  blockedReason: '',
});

async function openDialog(companyId: string) {
  const data = await store.fetch(companyId);
  form.creditLimit = data.creditLimit;
  form.creditDays = data.creditDays;
  form.isBlocked = data.isBlocked;
  form.blockedReason = data.blockedReason || '';
  dialog.value = true;
}

async function onSave() {
  if (!current.value) return;
  saving.value = true;
  try {
    await store.set(current.value.id, {
      creditLimit: form.creditLimit,
      creditDays: form.creditDays,
      isBlocked: form.isBlocked,
      blockedReason: form.isBlocked ? form.blockedReason : undefined,
    });
    success('Credit control updated');
    dialog.value = false;
    loadCompanies();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update credit control — you may need the override permission'));
  } finally {
    saving.value = false;
  }
}

async function loadCompanies() {
  const res = await adminCompanyApi.list({ pageSize: 200 });
  companies.value = await Promise.all(
    res.data.data.map(async (c: any) => {
      try {
        const cc = await store.fetch(c.id);
        return { id: c.id, name: c.name, creditLimit: cc.creditLimit, creditDays: cc.creditDays, isBlocked: cc.isBlocked };
      } catch {
        return { id: c.id, name: c.name, creditLimit: null, creditDays: null, isBlocked: false };
      }
    })
  );
}

onMounted(loadCompanies);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
