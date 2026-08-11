/**
 * Mounts every "simple lookup" master module through the generic
 * createMasterCrudRouter factory. Each entry below is the entire
 * backend definition for that module — see utils/masterCrudFactory.ts
 * for the shared CRUD/validation/audit logic.
 */
import { Router } from 'express';
import { z } from 'zod';
import { createMasterCrudRouter, MasterModuleConfig } from '../utils/masterCrudFactory';

const configs: MasterModuleConfig[] = [
  {
    modelName: 'vehicleType',
    entityLabel: 'Vehicle Type',
    permissionPrefix: 'vehicle_type',
    fields: [{ key: 'description', zod: z.string() }],
  },
  {
    modelName: 'trailerType',
    entityLabel: 'Trailer Type',
    permissionPrefix: 'trailer_type',
    fields: [{ key: 'description', zod: z.string() }],
  },
  {
    modelName: 'material',
    entityLabel: 'Material',
    permissionPrefix: 'material',
    fields: [
      { key: 'unit', zod: z.string() },
      { key: 'description', zod: z.string() },
    ],
  },
  {
    modelName: 'expenseCategory',
    entityLabel: 'Expense Category',
    permissionPrefix: 'expense_category',
    fields: [{ key: 'description', zod: z.string() }],
  },
  {
    modelName: 'fuelStation',
    entityLabel: 'Fuel Station',
    permissionPrefix: 'fuel_station',
    searchFields: ['name', 'code', 'location'],
    fields: [
      { key: 'location', zod: z.string() },
      { key: 'contactPerson', zod: z.string() },
      { key: 'phone', zod: z.string() },
    ],
  },
  {
    modelName: 'bank',
    entityLabel: 'Bank',
    permissionPrefix: 'bank',
    searchFields: ['name', 'code', 'ifscCode'],
    fields: [
      { key: 'branch', zod: z.string() },
      {
        key: 'ifscCode',
        zod: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
      },
    ],
  },
  {
    modelName: 'paymentMode',
    entityLabel: 'Payment Mode',
    permissionPrefix: 'payment_mode',
    // Extended additively in Phase 9 (Banking & Cash Management) with the
    // richer banking-config fields — this is the same table Fleet/Accounts
    // already reference via FK, so Banking does not stand up a second
    // PaymentMode endpoint; it configures modes right here.
    fields: [
      { key: 'description', zod: z.string() },
      {
        key: 'type',
        zod: z.enum(['CASH', 'CHEQUE', 'UPI', 'RTGS', 'NEFT', 'IMPS', 'BANK_TRANSFER', 'DD', 'CARD', 'WALLET', 'QR', 'CUSTOM']),
      },
      { key: 'requiresBankAccount', zod: z.boolean() },
      { key: 'requiresChequeDetails', zod: z.boolean() },
      { key: 'chargeApplicable', zod: z.boolean() },
      { key: 'defaultChargeLedgerId', zod: z.string().uuid() },
    ],
    systemFlagField: 'isSystemMode',
  },
  {
    modelName: 'tyre',
    entityLabel: 'Tyre',
    permissionPrefix: 'tyre',
    nameFieldKey: 'brand',
    searchFields: ['brand', 'code', 'size'],
    fields: [
      { key: 'size', zod: z.string() },
      { key: 'description', zod: z.string() },
    ],
  },
  {
    modelName: 'serviceCategory',
    entityLabel: 'Service Category',
    permissionPrefix: 'service_category',
    fields: [{ key: 'description', zod: z.string() }],
  },
  {
    modelName: 'designation',
    entityLabel: 'Designation',
    permissionPrefix: 'designation',
    fields: [{ key: 'description', zod: z.string() }],
  },
  {
    modelName: 'gstMaster',
    entityLabel: 'GST Master',
    permissionPrefix: 'gst_master',
    fields: [
      {
        key: 'ratePercent',
        zod: z.number().min(0, 'GST rate cannot be negative').max(100, 'GST rate cannot exceed 100'),
        requiredOnCreate: true,
      },
      // Phase 13 — GST, Taxation, Financial Reporting & Financial Closing
      // (docs Phase 7). Additive — every existing GstMaster row already
      // works unmodified since these are all optional.
      { key: 'hsnSacCode', zod: z.string() },
      { key: 'cgstRatePercent', zod: z.number().min(0).max(100) },
      { key: 'sgstRatePercent', zod: z.number().min(0).max(100) },
      { key: 'igstRatePercent', zod: z.number().min(0).max(100) },
      { key: 'cessRatePercent', zod: z.number().min(0).max(100) },
      { key: 'taxCategory', zod: z.enum(['TAXABLE', 'EXEMPT', 'ZERO_RATED', 'NIL_RATED']) },
      { key: 'isReverseCharge', zod: z.boolean() },
    ],
  },
  // Phase 13 — GST, Taxation, Financial Reporting & Financial Closing
  // (docs Phase 7). Fits the same generic { name/description, code, isActive } shape.
  {
    modelName: 'tdsSection',
    entityLabel: 'TDS Section',
    permissionPrefix: 'tds_section',
    nameFieldKey: 'description',
    codeFieldKey: 'sectionCode',
    fields: [
      { key: 'ratePercent', zod: z.number().min(0, 'TDS rate cannot be negative').max(100, 'TDS rate cannot exceed 100'), requiredOnCreate: true },
      { key: 'thresholdAmount', zod: z.number().min(0) },
      { key: 'applicableTo', zod: z.enum(['CONTRACTOR', 'PROFESSIONAL', 'RENT', 'COMMISSION', 'TRANSPORT', 'SALARY', 'OTHER']), requiredOnCreate: true },
    ],
  },
  // Phase 11 — Driver Accounts, Employee Payroll & Settlements (docs Phase
  // 5). Employee did not exist anywhere in the schema before this phase —
  // fits the same { name, code, ...extras, isActive } shape as every
  // other simple master here, so it gets no bespoke files of its own.
  {
    modelName: 'employee',
    entityLabel: 'Employee',
    permissionPrefix: 'employee',
    codeFieldKey: 'employeeCode',
    searchFields: ['name', 'employeeCode', 'phone'],
    fields: [
      { key: 'designationId', zod: z.string().uuid() },
      { key: 'userId', zod: z.string().uuid() },
      { key: 'employmentType', zod: z.enum(['PERMANENT', 'CONTRACT', 'TEMPORARY', 'DAILY_WAGE']) },
      { key: 'dateOfJoining', zod: z.coerce.date() },
      { key: 'dateOfExit', zod: z.coerce.date() },
      { key: 'panNumber', zod: z.string() },
      { key: 'bankAccountNumber', zod: z.string() },
      { key: 'bankIfsc', zod: z.string() },
      { key: 'phone', zod: z.string() },
    ],
  },
  // Phase 7 — Accounting Foundation. Global reference data (no
  // organizationId) — same reasoning as every other module above.
  {
    modelName: 'currency',
    entityLabel: 'Currency',
    permissionPrefix: 'currency',
    fields: [
      { key: 'symbol', zod: z.string() },
      { key: 'decimalPrecision', zod: z.number().int().min(0).max(6) },
      { key: 'isBaseCurrency', zod: z.boolean() },
    ],
  },
  {
    modelName: 'costCategory',
    entityLabel: 'Cost Category',
    permissionPrefix: 'cost_category',
    fields: [{ key: 'description', zod: z.string() }],
    // Seeded categories (Vehicle/Branch/Department/Project/Trip/Driver) are
    // protected — deleting one would silently orphan every Cost Center
    // already tagged under it.
    systemFlagField: 'isSystemCategory',
  },
];

// URL segment for each module, keyed by permissionPrefix (kept explicit
// rather than derived, since a couple of prefixes use underscores that
// read better as hyphens in a URL — e.g. /masters/vehicle-types).
const routePaths: Record<string, string> = {
  vehicle_type: 'vehicle-types',
  trailer_type: 'trailer-types',
  material: 'materials',
  expense_category: 'expense-categories',
  fuel_station: 'fuel-stations',
  bank: 'banks',
  payment_mode: 'payment-modes',
  tyre: 'tyres',
  service_category: 'service-categories',
  designation: 'designations',
  gst_master: 'gst-masters',
  currency: 'currencies',
  cost_category: 'cost-categories',
  employee: 'employees',
  tds_section: 'tds-sections',
};

const router = Router();

for (const config of configs) {
  const path = routePaths[config.permissionPrefix];
  router.use(`/${path}`, createMasterCrudRouter(config));
}

export default router;
