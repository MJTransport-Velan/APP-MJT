<template>
  <div>
    <h2 class="text-h6 mb-4">Permissions</h2>

    <AppCard class="mb-4">
      <AppCardText>
        <AppTextField
          v-model="search"
          label="Search permissions"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          @update:model-value="fetchPermissions"
        />
      </AppCardText>
    </AppCard>

    <AppCard v-if="permissionStore.loading">
      <AppSkeletonLoader type="table" />
    </AppCard>

    <AppCard v-else v-for="group in groupedResults" :key="group.module" class="mb-3">
      <AppCardTitle class="text-subtitle-1 text-capitalize">{{ group.module }}</AppCardTitle>
      <AppTable density="comfortable">
        <thead>
          <tr>
            <th>Permission</th>
            <th>Action</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="perm in group.permissions" :key="perm.id">
            <td><code>{{ perm.name }}</code></td>
            <td>{{ perm.action }}</td>
            <td>{{ perm.description }}</td>
          </tr>
        </tbody>
      </AppTable>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAdminPermissionStore } from '@/stores/admin-permission.store';
import { AppCard, AppCardText, AppCardTitle, AppTextField, AppSkeletonLoader, AppTable } from '@/components/ui';

const permissionStore = useAdminPermissionStore();
const search = ref('');

async function fetchPermissions() {
  await permissionStore.fetchList({ search: search.value || undefined });
}

const groupedResults = computed(() => {
  const groups = new Map<string, typeof permissionStore.items>();
  for (const perm of permissionStore.items) {
    if (!groups.has(perm.module)) groups.set(perm.module, []);
    groups.get(perm.module)!.push(perm);
  }
  return Array.from(groups.entries()).map(([module, permissions]) => ({ module, permissions }));
});

onMounted(fetchPermissions);
</script>
