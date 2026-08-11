<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Banking &amp; Cash Management</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Bank accounts, cash, transfers and cheques — balances update directly, no ledger involved
        </p>
      </div>
      <HubSearch v-model="search" placeholder="Search banking pages..." />
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
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Bank Dashboard', description: 'Balances, pending cheques, today\'s receipts/payments — all computed live', to: '/accounting/banking/dashboard' },
  { icon: 'mdi-bank-outline', title: 'Bank Accounts', description: 'Every bank account and its current balance', to: '/accounting/banking/bank-accounts' },
  { icon: 'mdi-cash-multiple', title: 'Cash Accounts', description: 'Cash in hand, petty cash, branch cash', to: '/accounting/banking/cash-accounts' },
  { icon: 'mdi-bank-transfer', title: 'Bank Transfers', description: 'Bank⇄Bank, Bank⇄Cash, Cash⇄Cash transfers', to: '/accounting/banking/transfers' },
  { icon: 'mdi-checkbook', title: 'Cheque Register', description: 'Issue, receive, deposit, clear, bounce, cancel — full lifecycle', to: '/accounting/banking/cheques' },
  { icon: 'mdi-book-open-outline', title: 'Cheque Books', description: 'Leaf ranges allocated per bank account', to: '/accounting/banking/cheque-books' },
  { icon: 'mdi-cash-fast', title: 'Petty Cash', description: 'Request → approve/reject → disburse → settle', to: '/accounting/banking/petty-cash' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
