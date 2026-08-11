export interface SimpleFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'date';
  required?: boolean;
  /** Only for type: 'select' */
  options?: { title: string; value: string }[];
}

export interface SimpleMasterConfig {
  /** URL segment used for both the route and the API path suffix */
  routeKey: string;
  label: string;
  singularLabel: string;
  apiPath: string;
  permissionPrefix: string;
  nameFieldKey: string;
  nameFieldLabel: string;
  fields: SimpleFieldConfig[];
  /** Physical unique-code column, when it isn't literally named `code` (e.g. Employee's `employeeCode`). Defaults to 'code'. */
  codeFieldKey?: string;
}

export const simpleMasterModules: SimpleMasterConfig[] = [
  {
    routeKey: 'vehicle-types',
    label: 'Vehicle Types',
    singularLabel: 'Vehicle Type',
    apiPath: '/masters/vehicle-types',
    permissionPrefix: 'vehicle_type',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [{ key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    routeKey: 'trailer-types',
    label: 'Trailer Types',
    singularLabel: 'Trailer Type',
    apiPath: '/masters/trailer-types',
    permissionPrefix: 'trailer_type',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [{ key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    routeKey: 'materials',
    label: 'Materials',
    singularLabel: 'Material',
    apiPath: '/masters/materials',
    permissionPrefix: 'material',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    routeKey: 'expense-categories',
    label: 'Expense Categories',
    singularLabel: 'Expense Category',
    apiPath: '/masters/expense-categories',
    permissionPrefix: 'expense_category',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [{ key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    routeKey: 'fuel-stations',
    label: 'Fuel Stations',
    singularLabel: 'Fuel Station',
    apiPath: '/masters/fuel-stations',
    permissionPrefix: 'fuel_station',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'contactPerson', label: 'Contact Person', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
    ],
  },
  {
    routeKey: 'banks',
    label: 'Banks',
    singularLabel: 'Bank',
    apiPath: '/masters/banks',
    permissionPrefix: 'bank',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'ifscCode', label: 'IFSC Code', type: 'text' },
    ],
  },
  {
    routeKey: 'payment-modes',
    label: 'Payment Modes',
    singularLabel: 'Payment Mode',
    apiPath: '/masters/payment-modes',
    permissionPrefix: 'payment_mode',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    // type/requiresBankAccount/requiresChequeDetails/chargeApplicable were
    // added in Phase 9 (Banking & Cash Management) — same table Fleet/
    // Accounts already reference, configured right here rather than a
    // second Payment Mode screen.
    fields: [
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'type',
        label: 'Mode Type',
        type: 'select',
        options: [
          { title: 'Cash', value: 'CASH' },
          { title: 'Cheque', value: 'CHEQUE' },
          { title: 'UPI', value: 'UPI' },
          { title: 'RTGS', value: 'RTGS' },
          { title: 'NEFT', value: 'NEFT' },
          { title: 'IMPS', value: 'IMPS' },
          { title: 'Bank Transfer', value: 'BANK_TRANSFER' },
          { title: 'Demand Draft', value: 'DD' },
          { title: 'Card', value: 'CARD' },
          { title: 'Wallet', value: 'WALLET' },
          { title: 'QR Payment', value: 'QR' },
          { title: 'Custom', value: 'CUSTOM' },
        ],
      },
      { key: 'requiresBankAccount', label: 'Requires Bank Account', type: 'boolean' },
      { key: 'requiresChequeDetails', label: 'Requires Cheque Details', type: 'boolean' },
      { key: 'chargeApplicable', label: 'Charges Applicable', type: 'boolean' },
    ],
  },
  {
    routeKey: 'tyres',
    label: 'Tyres',
    singularLabel: 'Tyre',
    apiPath: '/masters/tyres',
    permissionPrefix: 'tyre',
    nameFieldKey: 'brand',
    nameFieldLabel: 'Brand',
    fields: [
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    routeKey: 'service-categories',
    label: 'Service Categories',
    singularLabel: 'Service Category',
    apiPath: '/masters/service-categories',
    permissionPrefix: 'service_category',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [{ key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    routeKey: 'designations',
    label: 'Designations',
    singularLabel: 'Designation',
    apiPath: '/masters/designations',
    permissionPrefix: 'designation',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [{ key: 'description', label: 'Description', type: 'textarea' }],
  },
  {
    routeKey: 'gst-masters',
    label: 'GST Masters',
    singularLabel: 'GST Master',
    apiPath: '/masters/gst-masters',
    permissionPrefix: 'gst_master',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [
      { key: 'ratePercent', label: 'Rate %', type: 'number', required: true },
      // Phase 13 — GST, Taxation, Financial Reporting & Financial Closing
      // (docs Phase 7). Additive — every existing GstMaster row still
      // works with these left blank.
      { key: 'hsnSacCode', label: 'HSN/SAC Code', type: 'text' },
      { key: 'cgstRatePercent', label: 'CGST Rate %', type: 'number' },
      { key: 'sgstRatePercent', label: 'SGST Rate %', type: 'number' },
      { key: 'igstRatePercent', label: 'IGST Rate %', type: 'number' },
      { key: 'cessRatePercent', label: 'CESS Rate %', type: 'number' },
      {
        key: 'taxCategory',
        label: 'Tax Category',
        type: 'select',
        options: [
          { title: 'Taxable', value: 'TAXABLE' },
          { title: 'Exempt', value: 'EXEMPT' },
          { title: 'Zero Rated', value: 'ZERO_RATED' },
          { title: 'Nil Rated', value: 'NIL_RATED' },
        ],
      },
      { key: 'isReverseCharge', label: 'Reverse Charge Applicable', type: 'boolean' },
    ],
  },
  {
    routeKey: 'tds-sections',
    label: 'TDS Sections',
    singularLabel: 'TDS Section',
    apiPath: '/masters/tds-sections',
    permissionPrefix: 'tds_section',
    nameFieldKey: 'description',
    nameFieldLabel: 'Description',
    codeFieldKey: 'sectionCode',
    fields: [
      { key: 'ratePercent', label: 'Rate %', type: 'number', required: true },
      { key: 'thresholdAmount', label: 'Threshold Amount', type: 'number' },
      {
        key: 'applicableTo',
        label: 'Applicable To',
        type: 'select',
        options: [
          { title: 'Contractor', value: 'CONTRACTOR' },
          { title: 'Professional', value: 'PROFESSIONAL' },
          { title: 'Rent', value: 'RENT' },
          { title: 'Commission', value: 'COMMISSION' },
          { title: 'Transport', value: 'TRANSPORT' },
          { title: 'Salary', value: 'SALARY' },
          { title: 'Other', value: 'OTHER' },
        ],
        required: true,
      },
    ],
  },
  {
    routeKey: 'locations',
    label: 'Locations',
    singularLabel: 'Location',
    apiPath: '/masters/locations',
    permissionPrefix: 'location',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'pincode', label: 'Pincode', type: 'text' },
    ],
  },
  // Phase 7 — Accounting Foundation. Global lookups, same generic shape as
  // everything else above — mounted under /accounting/* routes instead of
  // /masters/* since that's where an Accounts user actually looks for them.
  {
    routeKey: 'currencies',
    label: 'Currencies',
    singularLabel: 'Currency',
    apiPath: '/masters/currencies',
    permissionPrefix: 'currency',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [
      { key: 'symbol', label: 'Symbol', type: 'text' },
      { key: 'decimalPrecision', label: 'Decimal Precision', type: 'number' },
    ],
  },
  {
    routeKey: 'cost-categories',
    label: 'Cost Categories',
    singularLabel: 'Cost Category',
    apiPath: '/masters/cost-categories',
    permissionPrefix: 'cost_category',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    fields: [{ key: 'description', label: 'Description', type: 'textarea' }],
  },
  // Phase 11 — Driver Accounts, Employee Payroll & Settlements (docs Phase
  // 5). Employee did not exist anywhere before this phase — fits the same
  // generic { name, code, ...extras, isActive } shape as every module
  // above, so it gets no bespoke page of its own. designationId/userId
  // link to other dynamic masters (not a fixed enum), so they aren't
  // exposed on this quick form — settable directly via the API/a future
  // dedicated Employee detail view.
  {
    routeKey: 'employees',
    label: 'Employees',
    singularLabel: 'Employee',
    apiPath: '/masters/employees',
    permissionPrefix: 'employee',
    nameFieldKey: 'name',
    nameFieldLabel: 'Name',
    codeFieldKey: 'employeeCode',
    fields: [
      {
        key: 'employmentType',
        label: 'Employment Type',
        type: 'select',
        options: [
          { title: 'Permanent', value: 'PERMANENT' },
          { title: 'Contract', value: 'CONTRACT' },
          { title: 'Temporary', value: 'TEMPORARY' },
          { title: 'Daily Wage', value: 'DAILY_WAGE' },
        ],
      },
      { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
      { key: 'dateOfExit', label: 'Date of Exit', type: 'date' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'panNumber', label: 'PAN Number', type: 'text' },
      { key: 'bankAccountNumber', label: 'Bank Account Number', type: 'text' },
      { key: 'bankIfsc', label: 'Bank IFSC', type: 'text' },
    ],
  },
];

export function getSimpleMasterConfig(routeKey: string): SimpleMasterConfig | undefined {
  return simpleMasterModules.find((m) => m.routeKey === routeKey);
}
