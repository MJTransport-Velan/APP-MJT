import { createMasterStore } from '../masterStoreFactory';

// Companies is intentionally excluded — it continues to use the existing
// Phase 2 useAdminCompanyStore (@/stores/admin-company.store).

export const useBranchStore = createMasterStore('mastersBranch', '/masters/branches');
export const useLocationStore = createMasterStore('mastersLocation', '/masters/locations');
export const useRouteStore = createMasterStore('mastersRoute', '/masters/routes');
export const useVehicleTypeStore = createMasterStore('mastersVehicleType', '/masters/vehicle-types');
export const useVehicleStore = createMasterStore('mastersVehicle', '/masters/vehicles');
export const useDriverStore = createMasterStore('mastersDriver', '/masters/drivers');
export const useSupplierStore = createMasterStore('mastersSupplier', '/masters/suppliers');
export const useMaterialStore = createMasterStore('mastersMaterial', '/masters/materials');
export const useExpenseCategoryStore = createMasterStore('mastersExpenseCategory', '/masters/expense-categories');
export const useFuelStationStore = createMasterStore('mastersFuelStation', '/masters/fuel-stations');
export const useBankStore = createMasterStore('mastersBank', '/masters/banks');
export const usePaymentModeStore = createMasterStore('mastersPaymentMode', '/masters/payment-modes');
export const useTyreStore = createMasterStore('mastersTyre', '/masters/tyres');
export const useServiceCategoryStore = createMasterStore('mastersServiceCategory', '/masters/service-categories');
export const useTrailerTypeStore = createMasterStore('mastersTrailerType', '/masters/trailer-types');
export const useDesignationStore = createMasterStore('mastersDesignation', '/masters/designations');
export const useGstMasterStore = createMasterStore('mastersGstMaster', '/masters/gst-masters');
export const useCurrencyStore = createMasterStore('mastersCurrency', '/masters/currencies');
export const useCostCategoryStore = createMasterStore('mastersCostCategory', '/masters/cost-categories');
export const useEmployeeStore = createMasterStore('mastersEmployee', '/masters/employees');
export const useTdsSectionStore = createMasterStore('mastersTdsSection', '/masters/tds-sections');

/**
 * Maps a SimpleMasterPage route key to its store hook, for the generic page.
 * Each value here (useVehicleTypeStore etc.) IS a Pinia StoreDefinition —
 * itself callable to produce the Store instance — so the map's value type
 * is that StoreDefinition directly, not a function that returns one; the
 * extra `() =>` wrapper previously here mistyped every entry by one level
 * of indirection and broke `vue-tsc --noEmit` for every page using it.
 */
export const simpleMasterStoreMap: Record<string, ReturnType<typeof createMasterStore>> = {
  'vehicle-types': useVehicleTypeStore,
  'trailer-types': useTrailerTypeStore,
  materials: useMaterialStore,
  'expense-categories': useExpenseCategoryStore,
  'fuel-stations': useFuelStationStore,
  banks: useBankStore,
  'payment-modes': usePaymentModeStore,
  tyres: useTyreStore,
  'service-categories': useServiceCategoryStore,
  designations: useDesignationStore,
  'gst-masters': useGstMasterStore,
  locations: useLocationStore,
  currencies: useCurrencyStore,
  'cost-categories': useCostCategoryStore,
  employees: useEmployeeStore,
  'tds-sections': useTdsSectionStore,
};
