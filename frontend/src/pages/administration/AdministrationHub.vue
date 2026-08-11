<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Administration</h2>
        <p class="text-caption text-medium-emphasis mb-0">Manage users, roles, permissions and system configuration</p>
      </div>
      <HubSearch v-model="search" placeholder="Search administration pages..." />
    </div>

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" />
      </template>
    </HubCardGrid>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { HubCard, HubCardGrid, HubSearch, HubFavoritesRecents } from '@/components/hub';

const search = ref('');

const cards = [
  { icon: 'mdi-account-multiple-outline', title: 'Users', description: 'Create and manage system users and their details', to: '/administration/users' },
  { icon: 'mdi-account-key-outline', title: 'Roles', description: 'Create and manage user roles and role hierarchy', to: '/administration/roles' },
  { icon: 'mdi-lock-check-outline', title: 'Permissions', description: 'Manage permissions and access control across the system', to: '/administration/permissions' },
  { icon: 'mdi-office-building-outline', title: 'Departments', description: 'Create and manage departments and their structure', to: '/administration/departments' },
  { icon: 'mdi-account-group-outline', title: 'Teams', description: 'Organize users into teams for better collaboration', to: '/administration/teams' },
  { icon: 'mdi-domain', title: 'Companies', description: 'Manage company profiles and their group', to: '/administration/companies' },
  { icon: 'mdi-account-multiple-outline', title: 'Groups', description: 'Manage groups of companies and their assigned team', to: '/administration/groups' },
  { icon: 'mdi-history', title: 'Audit Logs', description: 'View system activities and audit trail logs', to: '/administration/audit-logs' },
  { icon: 'mdi-account-circle-outline', title: 'Profile', description: 'View and update your own account details', to: '/administration/profile' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
