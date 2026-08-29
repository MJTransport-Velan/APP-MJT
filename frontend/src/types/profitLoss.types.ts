export interface ProfitLossResult {
  period: { from: string; to: string };
  income: {
    tripRevenue: number;
    otherIncome: number;
    total: number;
  };
  expenses: {
    tripRelatedCost: { supplierCost: number; manualTripExpenses: number; total: number };
    vehicleOperatingCost: {
      fastTag: number;
      diesel: number;
      adBlue: number;
      repairs: number;
      insurance: number;
      tyres: number;
      battery: number;
      driverSalary: number;
      other: number;
      total: number;
    };
    officeExpenses: number;
    interestAndFinanceCharges: number;
    staffSalary: number;
    total: number;
  };
  netProfit: number;
  profitMarginPercent: number;
  limitations: string[];
}
