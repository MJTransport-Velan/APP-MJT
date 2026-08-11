import { createReportStore } from '../reportStoreFactory';

export const useOperationsReportsStore = createReportStore('reportsOperations', 'operations');
export const useFleetReportsStore = createReportStore('reportsFleet', 'fleet');
export const useAccountsReportsStore = createReportStore('reportsAccounts', 'accounts');
export const useManagementReportsStore = createReportStore('reportsManagement', 'management');
