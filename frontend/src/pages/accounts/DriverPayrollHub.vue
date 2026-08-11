<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Driver Accounts & Payroll</h2>
        <p class="text-caption text-medium-emphasis mb-0">Driver advances, loans and settlements; employee salary and payroll runs</p>
      </div>
      <HubSearch v-model="search" placeholder="Search driver & payroll pages..." />
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
  { icon: 'mdi-truck-fast-outline', title: 'Driver Advances & Allowances', description: 'Advances, expense reimbursements, bata/incentives and penalties — each posts its own Voucher', to: '/accounts/driver-transactions' },
  { icon: 'mdi-hand-coin-outline', title: 'Driver Loans', description: 'Personal, emergency, vehicle, festival and medical loans to drivers with EMI schedules', to: '/accounts/driver-loans' },
  { icon: 'mdi-file-document-check-outline', title: 'Driver Settlements', description: 'Net a period of advances, earnings, penalties and loan EMIs into one payment or recovery', to: '/accounts/driver-settlements' },
  { icon: 'mdi-book-open-variant-outline', title: 'Driver Statement', description: 'Running-balance ledger statement for any driver', to: '/accounts/driver-statement' },
  { icon: 'mdi-cash-sync', title: 'Salary Structures', description: 'Configure Basic/HRA/DA/PF/ESI/TDS and other components per employee', to: '/accounts/salary-structures' },
  { icon: 'mdi-account-cash-outline', title: 'Employee Advances & Loans', description: 'Salary advances and employee loans, recovered automatically at the next payroll run', to: '/accounts/employee-advances-loans' },
  { icon: 'mdi-cash-multiple', title: 'Payroll Processing', description: 'Draft → Calculated → Verified → Approved → Processed → Paid, one Journal + Payment per run', to: '/accounts/payroll-runs' },
  { icon: 'mdi-view-dashboard-outline', title: 'Payroll Dashboard', description: 'Pending payroll, advances, settlements and loans at a glance', to: '/accounts/payroll-dashboard' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
