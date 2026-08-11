<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Vehicle Assets & Compliance</h2>
        <p class="text-caption text-medium-emphasis mb-0">Fixed assets, vehicle loans, depreciation, tyres, batteries and compliance renewals</p>
      </div>
      <HubSearch v-model="search" placeholder="Search vehicle asset pages..." />
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
  { icon: 'mdi-shape-outline', title: 'Asset Categories', description: 'Depreciation method, useful life and residual % per asset category', to: '/accounts/asset-categories' },
  { icon: 'mdi-truck-outline', title: 'Vehicle Asset Register', description: 'Register, approve and track vehicles and other fixed assets — each purchase posts an Asset Purchase Voucher', to: '/accounts/assets' },
  { icon: 'mdi-swap-horizontal', title: 'Asset Transfers', description: 'Department / custody / location moves, business-approval gated', to: '/accounts/asset-transfers' },
  { icon: 'mdi-trash-can-outline', title: 'Asset Disposals', description: 'Sale, scrap, write-off, theft, accident or donation — with gain/loss computed automatically', to: '/accounts/asset-disposals' },
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Asset Dashboard', description: 'Fleet value, loan outstanding, compliance due soon and top expense vehicles', to: '/accounts/asset-dashboard' },
  { icon: 'mdi-bank-outline', title: 'Vehicle Loans', description: 'Bank/NBFC vehicle loans with reducing-balance EMI schedules, payment and foreclosure', to: '/accounts/vehicle-loans' },
  { icon: 'mdi-chart-donut', title: 'Depreciation Processing', description: 'Calculate → review → approve one consolidated Depreciation Voucher per run', to: '/accounts/depreciation-runs' },
  { icon: 'mdi-tire', title: 'Vehicle Tyres', description: 'Install, rotate, remove and scrap tyres per vehicle with full movement history', to: '/accounts/vehicle-tyres' },
  { icon: 'mdi-car-battery', title: 'Vehicle Batteries', description: 'Install and dispose vehicle batteries with warranty tracking', to: '/accounts/vehicle-batteries' },
  { icon: 'mdi-file-document-check-outline', title: 'Vehicle Compliance', description: 'Insurance, permit, fitness, road tax and pollution renewals, with insurance claims', to: '/accounts/vehicle-compliance' },
  { icon: 'mdi-credit-card-wireless-outline', title: 'FastTag', description: 'Prepaid FastTag accounts — recharge and toll usage tracking', to: '/accounts/fasttag' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
