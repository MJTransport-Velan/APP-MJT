<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Notification Center</h2>
      <div class="d-flex ga-2 align-center">
        <AppSelect v-model="unreadOnly" :items="[{ title: 'All', value: false }, { title: 'Unread only', value: true }]" item-title="title" item-value="value" density="compact" hide-details style="min-width: 160px" @update:model-value="fetchData" />
        <AppBtn variant="outlined" @click="onMarkAllRead">Mark All Read</AppBtn>
      </div>
    </div>

    <AppCard>
      <AppList>
        <AppListItem v-for="n in notifications" :key="n.id" :class="{ 'unread-item': !n.isRead }" @click="onOpen(n)">
          <div class="d-flex justify-space-between align-start ga-2">
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2">
                <AppChip size="x-small" :color="priorityColor(n.priority)">{{ n.priority }}</AppChip>
                <AppChip size="x-small" variant="outlined">{{ n.category }}</AppChip>
                <span class="font-weight-medium">{{ n.title }}</span>
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">{{ n.message }}</div>
            </div>
            <div class="text-caption text-medium-emphasis text-no-wrap">{{ new Date(n.createdAt).toLocaleString() }}</div>
          </div>
        </AppListItem>
        <AppListItem v-if="!notifications.length">
          <div class="text-center text-medium-emphasis py-8">No notifications</div>
        </AppListItem>
      </AppList>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { notificationApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { AppCard, AppList, AppListItem, AppChip, AppBtn, AppSelect } from '@/components/ui';
import type { AppNotification, NotificationPriority } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const notifications = ref<AppNotification[]>([]);
const unreadOnly = ref(false);

function priorityColor(priority: NotificationPriority) {
  return ({ LOW: 'default', NORMAL: 'info', HIGH: 'warning', URGENT: 'error' } as Record<string, string>)[priority] || 'default';
}

async function fetchData() {
  try {
    const params = unreadOnly.value ? { isRead: 'false', pageSize: 100 } : { pageSize: 100 };
    notifications.value = (await notificationApi.list(params)).data.data;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load notifications'));
  }
}

async function onOpen(n: AppNotification) {
  if (n.isRead) return;
  try {
    await notificationApi.markRead(n.id);
    n.isRead = true;
  } catch {
    /* non-critical */
  }
}

async function onMarkAllRead() {
  try {
    await notificationApi.markAllRead();
    success('All notifications marked read');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to mark all read'));
  }
}

onMounted(fetchData);
</script>

<style scoped>
.unread-item {
  background: rgba(30, 58, 138, 0.05);
}
</style>
