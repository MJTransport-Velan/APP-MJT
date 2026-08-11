<template>
  <div class="app-table-wrap">
    <table class="app-table"><slot /></table>
  </div>
</template>

<style scoped>
.app-table-wrap { width: 100%; overflow-x: auto; }
.app-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.app-table :deep(th) {
  text-align: left;
  padding: 10px 12px;
  font-weight: 500;
  color: var(--color-text-medium);
  border-bottom: 1px solid var(--color-divider);
  white-space: nowrap;
}
.app-table :deep(td) {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-divider);
}
.app-table :deep(tbody tr:hover) { background: var(--color-hover); }
</style>
