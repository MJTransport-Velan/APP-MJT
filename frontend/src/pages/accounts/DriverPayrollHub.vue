<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Driver &amp; Employee Accounts</h2>
        <p class="text-caption text-medium-emphasis mb-0">Driver advances and settlements; employee salary structures and payments</p>
      </div>
      <HubSearch v-model="search" placeholder="Search driver & payroll pages..." />
    </div>

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" :background-images="ACCOUNTS_CARD_BACKGROUNDS" />
      </template>
    </HubCardGrid>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { HubCard, HubCardGrid, HubSearch, HubFavoritesRecents } from '@/components/hub';
import { ACCOUNTS_CARD_BACKGROUNDS } from '@/assets/acc-card-background';

const search = ref('');

const cards = [
  { icon: 'mdi-truck-fast-outline', title: 'Driver Advances & Allowances', description: 'Advances, bata/incentives and penalties — each posts its own Voucher', to: '/accounts/driver-transactions' },
  { icon: 'mdi-file-document-check-outline', title: 'Driver Settlements', description: 'Net a period of advances, earnings and penalties into one payment or recovery', to: '/accounts/driver-settlements' },
  { icon: 'mdi-book-open-variant-outline', title: 'Driver Statement', description: 'Running-balance ledger statement for any driver', to: '/accounts/driver-statement' },
  { icon: 'mdi-account-cash-outline', title: 'Driver Salary Structures', description: 'Fixed or % of Freight per driver, and see which months are paid', to: '/accounts/driver-salary-structures' },
  { icon: 'mdi-cash-sync', title: 'Salary Structures', description: 'Configure Basic/HRA/DA/PF/ESI/TDS per employee, and see which months are paid', to: '/accounts/salary-structures' },
  { icon: 'mdi-account-cash-outline', title: 'Employee Advances', description: 'Salary advances, recovered automatically from the employee\'s next salary payment', to: '/accounts/employee-advances' },
  { icon: 'mdi-view-dashboard-outline', title: 'Payroll Dashboard', description: 'Pending advances and settlements at a glance', to: '/accounts/payroll-dashboard' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
