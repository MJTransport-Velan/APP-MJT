<template>
  <div class="app-shell">
    <aside class="mj-sidebar" :class="{ 'mj-sidebar--rail': rail, 'mj-sidebar--closed': !drawer }">
      <div class="sidebar-header">
        <div class="logo-circle-sm">
          <img :src="mjLogo" alt="MJ Transport" class="logo-circle-sm__img" />
        </div>
        <div v-if="!rail" class="sidebar-title-block">
          <span class="sidebar-title">MJ Transport</span>
          <span class="sidebar-subtitle">Transport Management System</span>
        </div>
        <button
          type="button"
          class="sidebar-collapse-btn"
          :title="rail ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="rail = !rail"
        >
          <AppIcon :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-double-left'" size="small" />
        </button>
      </div>

      <div class="mj-sidebar__scroll">
        <AppList nav density="comfortable" class="mj-sidebar__list">
          <AppListItem
            v-for="module in visibleModules"
            :key="module.path"
            :to="module.path"
            :active="route.path === module.path || route.path.startsWith(module.path + '/')"
            :prepend-icon="module.icon"
            :title="rail ? undefined : module.title"
            class="mb-1"
          >
            <template v-if="!rail && module.quickLinks?.length" #append>
              <AppMenu placement="bottom">
                <template #activator>
                  <button type="button" class="mj-chevron" title="Quick links">
                    <AppIcon icon="mdi-chevron-right" size="small" />
                  </button>
                </template>
                <AppList>
                  <AppListItem
                    v-for="link in module.quickLinks"
                    :key="link.to"
                    :to="link.to"
                    :prepend-icon="link.icon"
                    :title="link.title"
                  />
                </AppList>
              </AppMenu>
            </template>
          </AppListItem>
        </AppList>
      </div>

      <div class="sidebar-footer">
        <AppDivider class="sidebar-footer__divider" />
        <AppMenu placement="top">
          <template #activator>
            <button type="button" class="sidebar-user">
              <AppAvatar color="primary" :size="36">
                <span class="text-caption font-weight-bold">{{ initials }}</span>
              </AppAvatar>
              <div v-if="!rail" class="sidebar-user__meta">
                <span class="sidebar-user__name">{{ authStore.user?.fullName || 'User' }}</span>
                <span class="sidebar-user__role">{{ roleLabel }}</span>
              </div>
              <AppIcon v-if="!rail" icon="mdi-chevron-down" size="small" class="sidebar-user__caret" />
            </button>
          </template>
          <AppList>
            <AppListItem :title="authStore.user?.fullName || 'User'" :subtitle="authStore.user?.username" />
            <AppDivider />
            <AppListItem prepend-icon="mdi-account-circle-outline" title="Profile" to="/administration/profile" />
            <AppListItem prepend-icon="mdi-logout" title="Logout" @click="onLogout" />
          </AppList>
        </AppMenu>

        <button v-if="!rail" type="button" class="sidebar-theme-toggle" @click="isDark = !isDark">
          <span class="sidebar-theme-toggle__label">
            <AppIcon :icon="isDark ? 'mdi-weather-night' : 'mdi-white-balance-sunny'" size="small" />
            Dark Mode
          </span>
          <AppSwitch :model-value="isDark" @update:model-value="isDark = $event" @click.stop />
        </button>
      </div>
    </aside>

    <Transition name="app-menu-fade">
      <div v-if="isMobile && drawer" class="mj-backdrop" @click="drawer = false"></div>
    </Transition>

    <header class="mj-app-bar">
      <button type="button" class="mj-nav-icon" @click="drawer = !drawer">
        <AppIcon icon="mdi-menu" color="white" />
      </button>
      <!-- <span class="mj-app-bar__title text-white font-weight-medium">MJ Transport ERP</span> -->

      <!--
        This box filters the module and page list only (see
        globalSearchResults below); it does not search business records. The
        placeholder previously promised trips, vehicles and drivers, so
        searching a real vehicle number returned "No matches found" and read
        as missing data.
      -->
      <div class="mj-app-bar__search">
        <AppIcon icon="mdi-magnify" size="small" class="mj-app-bar__search-icon" />
        <input
          ref="globalSearchInputRef"
          v-model="globalSearch"
          type="text"
          placeholder="Jump to a page or module..."
          class="mj-app-bar__search-input"
          @focus="globalSearchOpen = true"
          @blur="globalSearchOpen = false"
        />
        <span v-if="!globalSearch" class="mj-app-bar__search-kbd">Ctrl+K</span>
        <button v-else type="button" class="mj-app-bar__search-clear" @mousedown.prevent="globalSearch = ''">
          <AppIcon icon="mdi-close" size="x-small" />
        </button>

        <Transition name="app-menu-fade">
          <div v-if="globalSearchOpen" class="mj-app-bar__search-results">
            <button
              v-for="result in filteredGlobalResults"
              :key="result.to"
              type="button"
              class="mj-app-bar__search-result"
              @mousedown.prevent="selectGlobalResult(result)"
            >
              <AppIcon :icon="result.icon" size="small" />
              <span class="mj-app-bar__search-result-title">{{ result.title }}</span>
              <span class="mj-app-bar__search-result-group">{{ result.group }}</span>
            </button>
            <p v-if="!filteredGlobalResults.length" class="mj-app-bar__search-empty">No matches found</p>
          </div>
        </Transition>
      </div>

      <div class="spacer"></div>

      <div class="mj-app-bar__bell-wrap">
        <button type="button" class="mj-nav-icon mj-app-bar__bell" title="Notifications" @click="toggleNotifications">
          <AppBadge v-if="unreadCount > 0" :content="unreadCount > 99 ? '99+' : unreadCount" color="error">
            <AppIcon icon="mdi-bell-outline" color="white" />
          </AppBadge>
          <AppIcon v-else icon="mdi-bell-outline" color="white" />
        </button>

        <Transition name="fade">
          <div v-if="notificationsOpen" class="mj-notif-panel">
            <div class="mj-notif-panel__head">
              <span class="mj-notif-panel__title">Notifications</span>
              <button v-if="unreadCount > 0" type="button" class="mj-notif-panel__link" @click="onMarkAllRead">
                Mark all read
              </button>
            </div>

            <div v-if="dueSoon.length" class="mj-notif-panel__section">
              <p class="mj-notif-panel__section-title">
                Due in the next {{ leadDays }} days
              </p>
              <button
                v-for="due in dueSoon"
                :key="`${due.kind}-${due.entityId}`"
                type="button"
                class="mj-notif-panel__row"
                @click="goToNotifications"
              >
                <span class="mj-notif-panel__dot" :class="`mj-notif-panel__dot--${dueTone(due.daysLeft)}`"></span>
                <span class="mj-notif-panel__row-body">
                  <span class="mj-notif-panel__row-title">{{ due.title }}</span>
                  <span class="mj-notif-panel__row-meta">{{ dueWhen(due.daysLeft) }}</span>
                </span>
              </button>
            </div>

            <div class="mj-notif-panel__section">
              <p class="mj-notif-panel__section-title">Recent</p>
              <button
                v-for="n in recentNotifications"
                :key="n.id"
                type="button"
                class="mj-notif-panel__row"
                :class="{ 'mj-notif-panel__row--unread': !n.isRead }"
                @click="openNotification(n)"
              >
                <span class="mj-notif-panel__dot" :class="`mj-notif-panel__dot--${priorityTone(n.priority)}`"></span>
                <span class="mj-notif-panel__row-body">
                  <span class="mj-notif-panel__row-title">{{ n.title }}</span>
                  <span class="mj-notif-panel__row-meta">{{ n.message }}</span>
                </span>
              </button>
              <p v-if="!recentNotifications.length" class="mj-notif-panel__empty">Nothing to show</p>
            </div>

            <button type="button" class="mj-notif-panel__all" @click="goToNotifications">
              View all notifications
            </button>
          </div>
        </Transition>
      </div>
    </header>

    <main class="mj-main main" :class="{ 'mj-main--rail': rail, 'mj-main--closed': !drawer }">
      <div class="container fluid pa-6">
        <AppBreadcrumbs :items="breadcrumbItems" class="pl-0 mb-2" />
        <router-view />
      </div>

      <footer class="mj-footer">
        <span class="text-caption text-medium-emphasis">&copy; {{ year }} MJ Transport. All rights reserved.</span>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { moduleRegistry, moduleGrantsAccess } from '@/config/moduleRegistry';
import { useTheme } from '@/composables/useTheme';
import { useEscapeBack } from '@/composables/useEscapeBack';
import { notificationApi } from '@/services/system/phase8';
import type { AppNotification, DueReminder, NotificationPriority } from '@/types/phase8.types';
import mjLogo from '@/assets/login/MJ Transport Logo.png';
import {
  AppIcon,
  AppAvatar,
  AppBadge,
  AppMenu,
  AppList,
  AppListItem,
  AppDivider,
  AppSwitch,
  AppBreadcrumbs,
} from '@/components/ui';

const mobileQuery = window.matchMedia?.('(max-width: 960px)');
const isMobile = ref(mobileQuery?.matches ?? false);

const drawer = ref(!isMobile.value);
const rail = ref(false);
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const year = new Date().getFullYear();

// Only show modules the current user has permission to view — SUPER_ADMIN
// bypasses via authStore.hasPermission, everyone else sees just their subset.
const visibleModules = computed(() => moduleRegistry.filter((module) => moduleGrantsAccess(module, authStore.hasPermission)));

interface GlobalSearchResult {
  title: string;
  icon: string;
  to: string;
  group: string;
}

const globalSearchResults = computed<GlobalSearchResult[]>(() => {
  const flat: GlobalSearchResult[] = [];
  for (const module of visibleModules.value) {
    flat.push({ title: module.title, icon: module.icon, to: module.path, group: 'Modules' });
    for (const link of module.quickLinks || []) {
      flat.push({ title: link.title, icon: link.icon, to: link.to, group: module.title });
    }
  }
  return flat;
});

const globalSearch = ref('');
const globalSearchOpen = ref(false);
const globalSearchInputRef = ref<HTMLInputElement | null>(null);

const filteredGlobalResults = computed(() => {
  const q = globalSearch.value.trim().toLowerCase();
  if (!q) return globalSearchResults.value.slice(0, 8);
  return globalSearchResults.value.filter((r) => r.title.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)).slice(0, 12);
});

function selectGlobalResult(result: GlobalSearchResult) {
  globalSearch.value = '';
  globalSearchOpen.value = false;
  router.push(result.to);
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    globalSearchOpen.value = true;
    nextTick(() => globalSearchInputRef.value?.focus());
  } else if (event.key === 'Escape' && globalSearchOpen.value) {
    // Dismiss the search first; useEscapeBack() ignores Escape while a field
    // has focus, so the next press is the one that navigates back.
    globalSearchOpen.value = false;
    globalSearchInputRef.value?.blur();
  }
}

// Escape = back, app-wide. Every module renders inside this layout, so one
// call here covers all of them.
useEscapeBack();

// --- Dark mode: toggles the app-wide data-theme attribute already
// wired up in styles/main.css (:root[data-theme='dark']). The sidebar
// itself stays a fixed dark navy regardless of this toggle. Shared via
// useTheme() so other components (e.g. Dashboard's charts) can react to it.
const { isDark } = useTheme();

// --- Notification bell. The unread count is polled (no websocket in this
// app); the "Due soon" block is the live due-date list the backend computes
// from EMIs, document expiries, cheques and invoices, so it shows what is
// coming even before the daily scan has raised a notification for it.
const NOTIFICATION_POLL_MS = 60_000;

const notificationsOpen = ref(false);
const unreadCount = ref(0);
const recentNotifications = ref<AppNotification[]>([]);
const dueSoon = ref<DueReminder[]>([]);
const leadDays = ref(5);
let notificationPollId: ReturnType<typeof setInterval> | undefined;

function priorityTone(priority: NotificationPriority) {
  return ({ LOW: 'muted', NORMAL: 'info', HIGH: 'warning', URGENT: 'error' } as Record<string, string>)[priority] || 'info';
}

function dueTone(daysLeft: number) {
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

async function refreshUnreadCount() {
  try {
    unreadCount.value = (await notificationApi.unreadCount()).data.data.count;
  } catch {
    /* the bell must never break the layout */
  }
}

async function loadNotificationPanel() {
  try {
    const [list, due] = await Promise.all([
      notificationApi.list({ pageSize: 6 }),
      notificationApi.dueReminders(),
    ]);
    recentNotifications.value = list.data.data;
    leadDays.value = due.data.data.leadDays;
    dueSoon.value = due.data.data.items.slice(0, 6);
  } catch {
    /* leave whatever was already loaded on screen */
  }
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value;
  if (notificationsOpen.value) loadNotificationPanel();
}

async function openNotification(n: AppNotification) {
  if (!n.isRead) {
    try {
      await notificationApi.markRead(n.id);
      n.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch {
      /* non-critical */
    }
  }
  goToNotifications();
}

async function onMarkAllRead() {
  try {
    await notificationApi.markAllRead();
    unreadCount.value = 0;
    recentNotifications.value.forEach((n) => (n.isRead = true));
  } catch {
    /* non-critical */
  }
}

function goToNotifications() {
  notificationsOpen.value = false;
  router.push('/system/notifications');
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!notificationsOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (!target?.closest('.mj-app-bar__bell-wrap')) notificationsOpen.value = false;
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  mobileQuery?.addEventListener('change', onMobileQueryChange);
  document.addEventListener('mousedown', onDocumentPointerDown);
  refreshUnreadCount();
  notificationPollId = setInterval(refreshUnreadCount, NOTIFICATION_POLL_MS);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  mobileQuery?.removeEventListener('change', onMobileQueryChange);
  document.removeEventListener('mousedown', onDocumentPointerDown);
  if (notificationPollId) clearInterval(notificationPollId);
});

function onMobileQueryChange(event: MediaQueryListEvent) {
  isMobile.value = event.matches;
  drawer.value = !event.matches;
  if (event.matches) rail.value = false;
}

// On phones/tablets the sidebar overlays the page rather than pushing it,
// so it should get out of the way once the user has picked a destination.
watch(
  () => route.path,
  () => {
    if (isMobile.value) drawer.value = false;
  }
);

const initials = computed(() => {
  const name = authStore.user?.fullName || authStore.user?.username || 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

const roleLabel = computed(() => {
  const role = authStore.user?.roles?.[0];
  if (!role) return 'User';
  return role
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
});

const breadcrumbItems = computed(() => {
  const matchedCrumbs = route.matched
    .flatMap((record) => {
      // Detail routes like /trips/:id are declared as siblings of their list
      // route rather than children, so their real parent never appears in
      // route.matched and the trail read "Home > Trip Follow-up". Such a
      // route names its parent explicitly via meta.parentBreadcrumb.
      const parent = record.meta?.parentBreadcrumb as { title: string; to: string } | undefined;
      const self = { title: record.meta?.breadcrumb as string | undefined, to: record.path };
      return parent ? [parent, self] : [self];
    })
    .filter((crumb): crumb is { title: string; to: string } => !!crumb.title);

  // Adjacent hub/leaf pairs share the same meta.breadcrumb (e.g. the
  // Operations parent record and its '' hub child are both titled
  // "Operations") — collapse those into a single crumb, keeping the more
  // specific resolved path.
  const deduped: { title: string; to: string }[] = [];
  for (const crumb of matchedCrumbs) {
    if (deduped.length && deduped[deduped.length - 1].title === crumb.title) {
      deduped[deduped.length - 1] = crumb;
    } else {
      deduped.push(crumb);
    }
  }

  if (deduped.length <= 1 && deduped[0]?.title === 'Dashboard') {
    return [{ title: 'Home', to: '/dashboard' }];
  }

  return [
    { title: 'Home', to: '/dashboard' },
    ...deduped.map((crumb, i) => (i === deduped.length - 1 ? { title: crumb.title, disabled: true } : crumb)),
  ];
});

async function onLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.mj-sidebar {
  --color-primary: #3b5fc0;
  --color-primary-rgb: 59, 95, 192;
  --color-background: #0b1220;
  --color-surface: #0b1220;
  --color-text: #f1f5f9;
  --color-text-medium: #94a3b8;
  --color-text-disabled: #64748b;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-divider: rgba(255, 255, 255, 0.08);
  --color-hover: rgba(255, 255, 255, 0.06);
  --sb-panel: #141d33;
  --sb-panel-strong: #1b2540;

  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 272px;
  background: var(--color-background);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  transition: width 0.15s ease, transform 0.15s ease;
  z-index: 50;
}
.mj-sidebar--rail {
  width: 85px;
}
.mj-sidebar--closed {
  transform: translateX(-100%);
}

.mj-sidebar__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.mj-sidebar__list {
  padding: 4px 12px;
}

.sidebar-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px 16px;
}

.logo-circle-sm {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  flex-shrink: 0;
  overflow: hidden;
}
.logo-circle-sm__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.sidebar-title-block {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}
.sidebar-title {
  font-weight: 700;
  font-size: 15px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-subtitle {
  font-size: 11px;
  color: var(--color-text-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-collapse-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: var(--sb-panel);
  color: var(--color-text-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.sidebar-collapse-btn:hover {
  background: var(--sb-panel-strong);
  color: var(--color-text);
}

.mj-chevron {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 8px;
  flex-shrink: 0;
}
.mj-chevron:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

/* Menu item look: icon-in-box, bold active pill with gradient */
.mj-sidebar :deep(.app-list-item) {
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13.5px;
  font-weight: 500;
  gap: 12px;
}
.mj-sidebar :deep(.app-list-item--active) {
  background: linear-gradient(135deg, var(--color-primary),   #0a1c4c);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(59, 95, 192, 0.35);
}
.mj-sidebar :deep(.app-list-item__prepend) {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--sb-panel);
  justify-content: center;
  flex-shrink: 0;
}
.mj-sidebar :deep(.app-list-item--active .app-list-item__prepend) {
  background: rgba(255, 255, 255, 0.18);
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 12px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sidebar-footer__divider {
  margin-bottom: 4px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px;
  border-radius: 12px;
  color: inherit;
}
.sidebar-user:hover {
  background: var(--sb-panel);
}
.sidebar-user__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
  text-align: left;
}
.sidebar-user__name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-user__role {
  font-size: 11.5px;
  color: var(--color-text-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-user__caret {
  color: var(--color-text-medium);
  flex-shrink: 0;
}

.sidebar-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: none;
  background: var(--sb-panel);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  color: var(--color-text);
}
.sidebar-theme-toggle__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
}

.mj-app-bar {
  position: fixed;
  top: 0;
  left: 272px;
  right: 0;
  height: 64px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #16255c 100%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  z-index: 40;
  transition: left 0.15s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.06) inset;
}
.mj-sidebar--rail + .mj-app-bar {
  left: 76px;
}
.mj-sidebar--closed + .mj-app-bar {
  left: 0;
}

.mj-nav-icon {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  display: flex;
  padding: 9px;
  border-radius: var(--radius-md);
  transition: background 0.15s ease, transform 0.15s ease;
}
.mj-nav-icon:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.mj-app-bar__title {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.mj-app-bar__search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-pill);
  padding: 0 14px;
  height: 40px;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 420px;
  margin-left: 24px;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.mj-app-bar__search:focus-within {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08);
}
.mj-app-bar__search-icon {
  color: rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
}
.mj-app-bar__search-input {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 13.5px;
  height: 100%;
  font-family: inherit;
}
.mj-app-bar__search-input::placeholder {
  color: rgba(255, 255, 255, 0.65);
}
.mj-app-bar__search-kbd {
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-pill);
  padding: 2px 7px;
  flex-shrink: 0;
}
.mj-app-bar__search-clear {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  padding: 2px;
  flex-shrink: 0;
}
.mj-app-bar__search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-3);
  padding: 6px;
  max-height: 360px;
  overflow-y: auto;
  z-index: 100;
}
.mj-app-bar__search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  padding: 9px 10px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  text-align: left;
}
.mj-app-bar__search-result:hover {
  background: var(--color-hover);
}
.mj-app-bar__search-result-title {
  flex: 1 1 auto;
}
.mj-app-bar__search-result-group {
  font-size: 11.5px;
  color: var(--color-text-medium);
}
.mj-app-bar__search-empty {
  padding: 12px 10px;
  font-size: 12.5px;
  color: var(--color-text-medium);
  text-align: center;
  margin: 0;
}

.mj-app-bar__bell-wrap {
  position: relative;
  display: flex;
}
.mj-notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: 460px;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-3);
  padding: 6px;
  z-index: 100;
}
.mj-notif-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 6px;
}
.mj-notif-panel__title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text);
}
.mj-notif-panel__link {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.mj-notif-panel__section + .mj-notif-panel__section {
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
  padding-top: 4px;
}
.mj-notif-panel__section-title {
  margin: 0;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-medium);
}
.mj-notif-panel__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  text-align: left;
}
.mj-notif-panel__row:hover {
  background: var(--color-hover);
}
.mj-notif-panel__row--unread {
  background: rgba(30, 58, 138, 0.05);
}
.mj-notif-panel__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--color-info);
}
.mj-notif-panel__dot--warning {
  background: var(--color-warning);
}
.mj-notif-panel__dot--error {
  background: var(--color-error);
}
.mj-notif-panel__dot--muted {
  background: var(--color-text-medium);
}
.mj-notif-panel__row-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mj-notif-panel__row-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}
.mj-notif-panel__row-meta {
  font-size: 11.5px;
  color: var(--color-text-medium);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mj-notif-panel__empty {
  padding: 12px 10px;
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-medium);
  text-align: center;
}
.mj-notif-panel__all {
  width: 100%;
  border: none;
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
  background: transparent;
  color: var(--color-primary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 10px;
}
.mj-notif-panel__all:hover {
  background: var(--color-hover);
}

.mj-main {
  margin-left: 272px;
  padding-top: 64px;
  background: var(--color-background);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.15s ease;
}
.mj-main--rail {
  margin-left: 76px;
}
.mj-main--closed {
  margin-left: 0;
}

.mj-footer {
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding: 16px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-divider);
}

.mj-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 45;
}

/* ---------------------------------------------------------------------- */
/* Mobile / tablet: sidebar becomes an off-canvas overlay instead of       */
/* pushing the content, and the app bar always spans the full width.      */
/* ---------------------------------------------------------------------- */
@media (max-width: 960px) {
  .mj-sidebar {
    z-index: 50;
    box-shadow: var(--shadow-3);
  }
  .mj-sidebar--rail:not(.mj-sidebar--closed) {
    width: 272px;
  }
  .sidebar-collapse-btn {
    display: none;
  }

  .mj-app-bar,
  .mj-sidebar--rail + .mj-app-bar,
  .mj-sidebar--closed + .mj-app-bar {
    left: 0;
  }

  .mj-main,
  .mj-main--rail,
  .mj-main--closed {
    margin-left: 0;
  }

  .mj-app-bar__search {
    max-width: none;
    margin-left: 12px;
  }
  .mj-app-bar__search-kbd {
    display: none;
  }
}

@media (max-width: 600px) {
  .mj-app-bar__title {
    display: none;
  }
  .mj-main .container.fluid.pa-6 {
    padding: 12px;
  }
}
</style>
