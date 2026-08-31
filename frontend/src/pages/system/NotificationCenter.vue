<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Notification Center</h2>
      <div class="d-flex ga-2 align-center">
        <AppSelect v-model="unreadOnly" :items="[{ title: 'All', value: false }, { title: 'Unread only', value: true }]" item-title="title" item-value="value" density="compact" hide-details style="min-width: 160px" @update:model-value="fetchData" />
        <AppBtn variant="outlined" @click="onMarkAllRead">Mark All Read</AppBtn>
      </div>
    </div>

    <AppCard class="mb-4">
      <div class="d-flex flex-wrap align-center justify-space-between ga-2 pa-4 pb-2">
        <div>
          <h3 class="text-subtitle-1 font-weight-bold mb-0">Due in the next {{ leadDays }} days</h3>
          <p class="text-caption text-medium-emphasis mb-0">
            EMIs, document expiries, cheques and invoice payments falling due — read live, and
            reminded automatically every day.
          </p>
        </div>
        <AppBtn v-if="canRunScan" variant="outlined" :loading="scanning" @click="onRunScan">Run Reminder Scan</AppBtn>
      </div>

      <AppList>
        <AppListItem v-for="due in dueReminders" :key="`${due.kind}-${due.entityId}`">
          <div class="d-flex justify-space-between align-start ga-2">
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <AppChip size="x-small" :color="dueColor(due.daysLeft)">{{ dueWhen(due.daysLeft) }}</AppChip>
                <AppChip size="x-small" variant="outlined">{{ kindLabel(due.kind) }}</AppChip>
                <span class="font-weight-medium">{{ due.title }}</span>
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">{{ due.message }}</div>
            </div>
            <div v-if="due.amount !== null" class="text-body-2 font-weight-bold text-no-wrap">
              {{ formatAmount(due.amount) }}
            </div>
          </div>
        </AppListItem>
        <AppListItem v-if="!dueReminders.length">
          <div class="text-center text-medium-emphasis py-6">Nothing falls due in this window</div>
        </AppListItem>
      </AppList>
    </AppCard>

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
import { ref, computed, onMounted } from 'vue';
import { notificationApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { useAuthStore } from '@/stores/auth.store';
import { AppCard, AppList, AppListItem, AppChip, AppBtn, AppSelect } from '@/components/ui';
import type { AppNotification, DueReminder, DueReminderKind, NotificationPriority } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const authStore = useAuthStore();
const notifications = ref<AppNotification[]>([]);
const dueReminders = ref<DueReminder[]>([]);
const leadDays = ref(5);
const unreadOnly = ref(false);
const scanning = ref(false);

// The scan writes notifications for everyone, so it is gated on the same
// permission as the automation rules that run every other scheduled job.
const canRunScan = computed(() => authStore.hasPermission('automation_rule.manage'));

const KIND_LABELS: Record<DueReminderKind, string> = {
  LOAN_EMI: 'Loan EMI',
  LOAN_EMI_OVERDUE: 'Overdue EMI',
  LOAN_GIVEN_RETURN: 'Loan Given',
  VEHICLE_INSURANCE: 'Insurance',
  VEHICLE_PERMIT: 'Permit',
  VEHICLE_FITNESS: 'Fitness',
  VEHICLE_PUC: 'PUC',
  VEHICLE_RC: 'RC',
  VEHICLE_SERVICE: 'Service',
  DRIVER_LICENCE: 'Driver Licence',
  CHEQUE: 'Cheque',
  INVOICE: 'Invoice',
};

function kindLabel(kind: DueReminderKind) {
  return KIND_LABELS[kind] ?? kind;
}

function priorityColor(priority: NotificationPriority) {
  return ({ LOW: 'default', NORMAL: 'info', HIGH: 'warning', URGENT: 'error' } as Record<string, string>)[priority] || 'default';
}

function dueColor(daysLeft: number) {
  if (daysLeft < 0) return 'error';
  if (daysLeft <= 2) return 'warning';
  return 'info';
}

function dueWhen(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  return `Due in ${daysLeft} days`;
}

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchData() {
  try {
    const params = unreadOnly.value ? { isRead: 'false', pageSize: 100 } : { pageSize: 100 };
    notifications.value = (await notificationApi.list(params)).data.data;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load notifications'));
  }
}

async function fetchDueReminders() {
  try {
    const result = (await notificationApi.dueReminders()).data.data;
    leadDays.value = result.leadDays;
    dueReminders.value = result.items;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load upcoming dues'));
  }
}

async function onRunScan() {
  scanning.value = true;
  try {
    const result = (await notificationApi.runDueScan()).data.data;
    success(`Scan complete — ${result.scanned} due item(s), ${result.created} new notification(s)`);
    await Promise.all([fetchData(), fetchDueReminders()]);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to run reminder scan'));
  } finally {
    scanning.value = false;
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

onMounted(() => {
  fetchData();
  fetchDueReminders();
});
</script>

<style scoped>
.unread-item {
  background: rgba(30, 58, 138, 0.05);
}
</style>
