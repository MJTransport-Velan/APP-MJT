export interface MasterCategoryItem {
  title: string;
  icon: string;
  to: string;
  description: string;
}

export interface MasterCategory {
  key: string;
  title: string;
  icon: string;
  items: MasterCategoryItem[];
}

export const masterCategories: MasterCategory[] = [
  {
    key: 'organization',
    title: 'Organization',
    icon: 'mdi-domain',
    items: [
      { title: 'Companies', icon: 'mdi-domain', to: '/masters/companies', description: 'Manage company profiles and their group' },
      { title: 'Groups', icon: 'mdi-account-multiple-outline', to: '/masters/groups', description: 'Manage groups of companies and their assigned team' },
    ],
  },
  {
    key: 'geography',
    title: 'Geography',
    icon: 'mdi-map-marker-outline',
    items: [
      { title: 'Locations', icon: 'mdi-map-marker-outline', to: '/masters/locations', description: 'Manage cities, states and pincodes' },
    ],
  },
  {
    key: 'fleet',
    title: 'Fleet',
    icon: 'mdi-truck-outline',
    items: [
      { title: 'Vehicles', icon: 'mdi-truck', to: '/masters/vehicles', description: 'Vehicle master records' },
      { title: 'Vehicle Types', icon: 'mdi-truck-outline', to: '/masters/vehicle-types', description: 'Categorize vehicles by type' },
    ],
  },
  {
    key: 'fleet-operations',
    title: 'Fleet Operations',
    icon: 'mdi-account-group-outline',
    items: [
      { title: 'Drivers', icon: 'mdi-card-account-details-outline', to: '/masters/drivers', description: 'Driver master records' },
    ],
  },
  {
    key: 'finance',
    title: 'Finance',
    icon: 'mdi-bank-outline',
    items: [
      { title: 'GST Masters', icon: 'mdi-receipt-text-outline', to: '/masters/gst-masters', description: 'GST rate configurations' },
      { title: 'Expense Categories', icon: 'mdi-cash-minus', to: '/masters/expense-categories', description: 'Categorize business expenses' },
      { title: 'Payment Modes', icon: 'mdi-credit-card-outline', to: '/masters/payment-modes', description: 'Manage accepted payment modes' },
    ],
  },
  {
    key: 'vendors',
    title: 'Vendors & Partners',
    icon: 'mdi-account-tie-outline',
    items: [{ title: 'Suppliers', icon: 'mdi-account-tie-outline', to: '/masters/suppliers', description: 'Supplier master records' }],
  },
  {
    key: 'inventory',
    title: 'Inventory & Resources',
    icon: 'mdi-package-variant-closed',
    items: [
      { title: 'Materials', icon: 'mdi-package-variant-closed', to: '/masters/materials', description: 'Manage goods/material types' },
    ],
  },
  {
    key: 'assets-maintenance',
    title: 'Assets & Maintenance',
    icon: 'mdi-wrench-outline',
    items: [
      { title: 'Tyres', icon: 'mdi-tire', to: '/masters/tyres', description: 'Tyre brand and size master' },
      { title: 'Service Categories', icon: 'mdi-wrench-outline', to: '/masters/service-categories', description: 'Categorize maintenance services' },
    ],
  },
  {
    key: 'hr',
    title: 'HR & Administration',
    icon: 'mdi-badge-account-outline',
    items: [
      { title: 'Designations', icon: 'mdi-badge-account-outline', to: '/masters/designations', description: 'Employee designation master' },
      { title: 'Employees', icon: 'mdi-account-tie-outline', to: '/masters/employees', description: 'Employee master for payroll' },
    ],
  },
];
