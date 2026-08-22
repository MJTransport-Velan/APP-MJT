import ExcelJS from 'exceljs';
import { ImportEntityType } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { organizationService } from './organization.service';
import { supplierService } from './supplier.service';
import { driverService } from './driver.service';
import { auditService } from './audit.service';
import { fuelEntryService } from './fuel-entry.service';
import { fastTagRepository } from '../repositories/fasttag.repository';
import { tripRepository } from '../repositories/trip.repository';
import { vehicleExpenseInternalService } from './vehicle-expense.service';

interface RowError {
  row: number;
  error: string;
}

/**
 * Loads an uploaded spreadsheet, turning a parse failure into a message the
 * uploader can act on.
 *
 * exceljs throws its own low-level error when handed anything that is not a
 * real .xlsx (a CSV renamed, a PDF picked by mistake, a truncated upload).
 * That error is not an AppError, so it reached the generic handler and the
 * user was told only "Internal Server Error" — which reads as a broken system
 * rather than the wrong file.
 */
async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs's Buffer type and this project's @types/node Buffer type are structurally identical but nominally distinct copies; `any` sidesteps the false-positive mismatch.
    return await workbook.xlsx.load(buffer as any);
  } catch {
    throw new AppError(
      'That file could not be read as an Excel workbook. Save it as .xlsx (Excel 2007 or later) and upload it again — a .csv or a renamed file will not work.',
      422
    );
  }
}

function readRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
  return loadWorkbook(buffer).then((wb) => {
    const sheet = wb.worksheets[0];
    if (!sheet) throw new AppError('The uploaded file has no worksheet', 422);

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? '').trim();
    });

    const rows: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const key = headers[colNumber];
        if (key) record[key] = cell.value;
      });
      if (Object.keys(record).length > 0) rows.push(record);
    });
    return rows;
  });
}

const STATEMENT_MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parses the FASTag provider statement's "10 Aug 26 01:14 PM" datetime format. exceljs hands back a native Date for a true date-typed cell; the regex is the fallback for a plain-text/CSV cell. */
function parseStatementDateTime(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (m) {
      const month = STATEMENT_MONTHS[m[2].toLowerCase()];
      if (month === undefined) return null;
      const day = Number(m[1]);
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      let hour = Number(m[4]) % 12;
      if (/pm/i.test(m[6])) hour += 12;
      const minute = Number(m[5]);
      return new Date(year, month, day, hour, minute);
    }
  }
  return null;
}

/**
 * FASTag provider statements (e.g. LIVQ exports) aren't a plain header-row-1
 * table: rows 1-N hold account metadata (Name/Mobile/Statement Duration),
 * the real column header ("Transaction Time", "Nature (C/D)", "Amount",
 * "Description", "Truck Number", "Transaction ID", "Opening Balance",
 * "Closing Balance", "Vendor") appears further down, and a SUMMARY block
 * (Inflow/Outflow totals) follows the data. This scans for the header row
 * by its known first-column label, then reads rows until "Transaction Time"
 * no longer parses as a date — which naturally stops before the summary
 * block without needing to special-case it.
 */
function readFastTagStatementRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
  return loadWorkbook(buffer).then((wb) => {
    const sheet = wb.worksheets[0];
    if (!sheet) throw new AppError('The uploaded file has no worksheet', 422);

    let headerRowNumber = -1;
    const headers: string[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (headerRowNumber !== -1) return;
      const firstCell = String(row.getCell(1).value ?? '').trim().toLowerCase();
      if (firstCell === 'transaction time') {
        headerRowNumber = rowNumber;
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          headers[colNumber] = String(cell.value ?? '').trim();
        });
      }
    });
    if (headerRowNumber === -1) {
      throw new AppError('Could not find the "Transaction Time" column header in the uploaded statement', 422);
    }

    const rows: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      const record: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const key = headers[colNumber];
        if (key) record[key] = cell.value;
      });
      // Stops at the blank separator row before the SUMMARY block — those
      // rows have no "Transaction Time" value at all.
      if (parseStatementDateTime(record['Transaction Time'])) rows.push(record);
    });
    return rows;
  });
}

async function importSupplierRow(row: Record<string, unknown>, actorId: string) {
  const name = String(row.name ?? '').trim();
  const code = String(row.code ?? '').trim().toUpperCase();
  if (!name || !code) throw new Error('name and code are required');

  await supplierService.create(
    {
      name,
      code,
      gstNumber: row.gstNumber ? String(row.gstNumber).trim() : undefined,
      panNumber: row.panNumber ? String(row.panNumber).trim() : undefined,
      contactPerson: row.contactPerson ? String(row.contactPerson).trim() : undefined,
      phone: row.phone ? String(row.phone).trim() : undefined,
      email: row.email ? String(row.email).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
    },
    actorId
  );
}

async function importEmployeeRow(row: Record<string, unknown>, actorId: string) {
  const employeeCode = String(row.employeeCode ?? '').trim().toUpperCase();
  const name = String(row.name ?? '').trim();
  if (!employeeCode || !name) throw new Error('employeeCode and name are required');

  const existing = await prisma.employee.findUnique({ where: { employeeCode } });
  if (existing) throw new Error(`Employee code "${employeeCode}" already exists`);

  await prisma.employee.create({
    data: {
      employeeCode,
      name,
      employmentType: row.employmentType ? (String(row.employmentType).toUpperCase() as never) : undefined,
      phone: row.phone ? String(row.phone).trim() : undefined,
      panNumber: row.panNumber ? String(row.panNumber).trim() : undefined,
      bankAccountNumber: row.bankAccountNumber ? String(row.bankAccountNumber).trim() : undefined,
      bankIfsc: row.bankIfsc ? String(row.bankIfsc).trim() : undefined,
      createdById: actorId,
      updatedById: actorId,
    },
  });
}

async function importDriverRow(row: Record<string, unknown>, actorId: string) {
  const name = String(row.name ?? '').trim();
  const code = String(row.code ?? '').trim().toUpperCase();
  const licenseNumber = String(row.licenseNumber ?? '').trim().toUpperCase();
  if (!name || !code || !licenseNumber) throw new Error('name, code and licenseNumber are required');

  await driverService.create(
    {
      name,
      code,
      licenseNumber,
      phone: row.phone ? String(row.phone).trim() : undefined,
    },
    actorId
  );
}

async function importFuelEntryRow(row: Record<string, unknown>, actorId: string) {
  const registrationNumber = String(row.vehicleRegistrationNumber ?? row.registrationNumber ?? '').trim();
  // Litres, rate and amount are each optional on their own -- a statement
  // row may carry only what was paid. The service derives whichever of the
  // three it can from the others.
  const quantityLiters = Number(row.quantityLiters ?? row.litres ?? row.liters) || undefined;
  const ratePerLiter = Number(row.ratePerLiter ?? row.rate) || undefined;
  const totalAmount = Number(row.totalAmount ?? row.amount) || undefined;
  const odometerReading = Number(row.odometerReading ?? row.odometer);
  if (!registrationNumber || !odometerReading || (!quantityLiters && !totalAmount)) {
    throw new Error('vehicleRegistrationNumber, odometerReading and either quantityLiters or totalAmount are required');
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { registrationNumber, deletedAt: null } });
  if (!vehicle) throw new Error(`Vehicle "${registrationNumber}" not found`);

  let tripId: string | undefined;
  if (row.tripNumber) {
    const trip = await prisma.trip.findFirst({ where: { tripNumber: String(row.tripNumber).trim(), deletedAt: null } });
    if (!trip) throw new Error(`Trip "${row.tripNumber}" not found`);
    tripId = trip.id;
  } else {
    // No trip named in the statement — same "current or last trip for this
    // vehicle" fallback the FASTag import (and FASTag's manual usage
    // logging) uses, rather than the day-range match fuelEntryService.create()
    // would otherwise fall back to on its own; a bulk statement import has
    // no reliable "this row's exact trip" signal beyond the vehicle itself.
    // Trip stays optional here (unlike FASTag USAGE) — left undefined if the
    // vehicle has genuinely never had a trip.
    const trip = await tripRepository.findCurrentOrLastTripForVehicle(vehicle.id);
    tripId = trip?.id;
  }

  // Driver is never taken from the statement — fuelEntryService.create()
  // always derives it from the resolved trip's assigned driver.
  await fuelEntryService.create(
    {
      vehicleId: vehicle.id,
      quantityLiters,
      ratePerLiter,
      totalAmount,
      odometerReading,
      tripId,
      fuelType: row.fuelType ? (String(row.fuelType).toUpperCase() as never) : undefined,
      billingMethod: row.billingMethod ? (String(row.billingMethod).toUpperCase() as never) : undefined,
      invoiceNumber: row.invoiceNumber ? String(row.invoiceNumber).trim() : undefined,
      referenceNumber: row.referenceNumber ? String(row.referenceNumber).trim() : undefined,
      remarks: row.remarks ? String(row.remarks).trim() : undefined,
      entryDate: row.entryDate ? String(row.entryDate) : undefined,
    },
    actorId
  );
}

// Matches the real provider statement format (LIVQ FASTag exports): columns
// "Transaction Time", "Nature (C/D)", "Amount", "Description" (e.g. "FasTag
// Toll Payment at PONGALUR"), "Truck Number", "Transaction ID". Each row
// posts directly as a real FastTagTransaction against the truck's own
// FastTagAccount — Debit rows debit the wallet (and mirror into
// VehicleExpense as a toll cost, auto-attached to whichever trip was
// running for that vehicle at the time); Credit rows credit the wallet as a
// recharge. There is no separate staging/reconciliation step — a row either
// posts cleanly or is rejected as a duplicate right here.
async function importFastTagProviderRow(row: Record<string, unknown>, actorId: string) {
  const transactionDate = parseStatementDateTime(row['Transaction Time']);
  const amount = Number(row['Amount']);
  if (!transactionDate) throw new Error('Invalid or missing Transaction Time');
  if (!amount || Number.isNaN(amount)) throw new Error('Invalid or missing Amount');

  const natureRaw = String(row['Nature (C/D)'] ?? '').trim().toLowerCase();
  if (natureRaw !== 'debit' && natureRaw !== 'credit') {
    throw new Error(`Unrecognised Nature (C/D) value: "${row['Nature (C/D)'] ?? 'blank'}"`);
  }
  const isCredit = natureRaw === 'credit';

  const description = String(row['Description'] ?? '').trim();
  const plazaMatch = description.match(/toll payment at (.+)/i);
  const tollPlaza = plazaMatch ? plazaMatch[1].trim() : description || undefined;

  const vehicleRegistrationNumber = row['Truck Number'] ? String(row['Truck Number']).trim() : undefined;
  const transactionReference = row['Transaction ID'] ? String(row['Transaction ID']).trim() : undefined;

  if (!vehicleRegistrationNumber) throw new Error('Truck Number is required');
  const vehicle = await prisma.vehicle.findFirst({ where: { registrationNumber: vehicleRegistrationNumber, deletedAt: null } });
  if (!vehicle) throw new Error(`Vehicle "${vehicleRegistrationNumber}" not found in the fleet`);

  const account = await fastTagRepository.getOrCreateWallet(actorId);

  // Duplicates are rejected here, at import — a re-uploaded statement (or
  // overlapping date ranges across two exports) should not create a second
  // transaction. Reference number is the precise check when the statement
  // provides one; vehicle + date/time + amount is the fallback (scoped by
  // vehicle now that the wallet itself is shared across the whole fleet).
  if (transactionReference) {
    const existingByReference = await prisma.fastTagTransaction.findFirst({ where: { transactionReference } });
    if (existingByReference) throw new Error(`Duplicate: transaction reference "${transactionReference}" was already imported`);
  }
  const existingByDateTime = await prisma.fastTagTransaction.findFirst({
    where: { vehicleId: vehicle.id, transactionDate, amount },
  });
  if (existingByDateTime) throw new Error('Duplicate: a transaction for this vehicle at the same date/time and amount already exists');

  let tripId: string | undefined;
  if (!isCredit) {
    // Same "current or last trip for this vehicle" guarantee as FASTag's
    // manual usage logging (fasttag.service.ts logUsage()) — a toll charge
    // always belongs to a trip, so imported rows shouldn't silently end up
    // untagged just because the transaction timestamp didn't land exactly
    // inside a trip's start/end window.
    const trip = await tripRepository.findCurrentOrLastTripForVehicle(vehicle.id);
    if (!trip) throw new Error(`${vehicleRegistrationNumber} has no trips yet — a trip is required to import toll usage`);
    tripId = trip.id;
  }

  const transaction = await prisma.fastTagTransaction.create({
    data: {
      accountId: account.id,
      vehicleId: vehicle.id,
      type: isCredit ? 'RECHARGE' : 'USAGE',
      status: 'IMPORTED',
      amount,
      tripId,
      transactionDate,
      tollPlaza: isCredit ? undefined : tollPlaza,
      transactionReference,
      remarks: 'Imported from FASTag provider statement',
      createdById: actorId,
      updatedById: actorId,
    },
  });

  await prisma.fastTagAccount.update({
    where: { id: account.id },
    data: { currentBalance: { increment: isCredit ? amount : -amount } },
  });

  if (!isCredit) {
    await vehicleExpenseInternalService.logFromSource({
      vehicleId: vehicle.id,
      tripId,
      category: 'FASTTAG',
      amount,
      expenseDate: transactionDate,
      description: tollPlaza ? `FastTag toll usage at ${tollPlaza}` : 'FastTag toll usage',
      referenceType: 'FastTagTransaction',
      referenceId: transaction.id,
      actorId,
    });
  }
}

/** Downloadable .xlsx template matching the real provider-statement format readFastTagStatementRows() parses — header row + example Debit/Credit rows. */
async function generateFastTagSampleTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('FASTag Statement');
  const columns = ['Transaction Time', 'Nature (C/D)', 'Amount', 'Description', 'Truck Number', 'Transaction ID', 'Opening Balance', 'Closing Balance', 'Vendor'];
  sheet.addRow(columns);
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(['10 Aug 26 10:24 PM', 'Debit', 135, 'FasTag Toll Payment at PONGALUR', 'TN38AZ1001', 'REF1001', 2072.2, 1937.2, 'LIVQ']);
  sheet.addRow(['10 Aug 26 08:10 PM', 'Credit', 500, 'FasTag Wallet Recharge', 'TN38AZ1001', 'REF1002', 1937.2, 2437.2, 'LIVQ']);
  sheet.columns.forEach((col) => { col.width = 22; });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const importService = {
  async runImport(entityType: ImportEntityType, fileName: string, buffer: Buffer, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const rows = entityType === 'FASTTAG_TRANSACTION' ? await readFastTagStatementRows(buffer) : await readRows(buffer);

    const batch = await prisma.importBatch.create({
      data: { organizationId, entityType, fileName, status: 'PROCESSING', totalRows: rows.length, importedById: actorId },
    });

    const errors: RowError[] = [];
    let successRows = 0;

    for (let i = 0; i < rows.length; i++) {
      // FASTag statements have a variable-position header (see
      // readFastTagStatementRows), so "row" there is relative to the parsed
      // transaction rows rather than the literal Excel row number.
      const rowNumber = entityType === 'FASTTAG_TRANSACTION' ? i + 1 : i + 2;
      try {
        switch (entityType) {
          case 'SUPPLIER':
            await importSupplierRow(rows[i], actorId);
            break;
          case 'EMPLOYEE':
            await importEmployeeRow(rows[i], actorId);
            break;
          case 'DRIVER':
            await importDriverRow(rows[i], actorId);
            break;
          case 'FUEL_ENTRY':
            await importFuelEntryRow(rows[i], actorId);
            break;
          case 'FASTTAG_TRANSACTION':
            await importFastTagProviderRow(rows[i], actorId);
            break;
        }
        successRows++;
      } catch (err) {
        errors.push({ row: rowNumber, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const status = errors.length === 0 ? 'COMPLETED' : successRows === 0 ? 'FAILED' : 'COMPLETED_WITH_ERRORS';
    const updated = await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status, successRows, failedRows: errors.length, errorReportJson: errors.length ? JSON.stringify(errors) : null, completedAt: new Date() },
    });

    await auditService.record({
      userId: actorId,
      action: 'IMPORT',
      entityType: 'ImportBatch',
      entityId: batch.id,
      description: `Imported ${entityType}: ${successRows}/${rows.length} rows succeeded`,
    });

    return { ...updated, errors };
  },

  async list(query: { page?: string; pageSize?: string; entityType?: string }) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Number(query.pageSize) || 20);
    const where = { organizationId, ...(query.entityType ? { entityType: query.entityType as ImportEntityType } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.importBatch.findMany({ where, orderBy: { startedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.importBatch.count({ where }),
    ]);
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  async getById(id: string) {
    const batch = await prisma.importBatch.findUnique({ where: { id } });
    if (!batch) throw new AppError('Import batch not found', 404);
    return { ...batch, errors: batch.errorReportJson ? JSON.parse(batch.errorReportJson) : [] };
  },

  /** Sample .xlsx template for the given entity type. */
  async generateSample(entityType: ImportEntityType): Promise<{ buffer: Buffer; fileName: string }> {
    if (entityType === 'FASTTAG_TRANSACTION') {
      return { buffer: await generateFastTagSampleTemplate(), fileName: 'fasttag-import-sample.xlsx' };
    }
    if (entityType === 'FUEL_ENTRY') {
      return { buffer: await fuelEntryService.generateSampleTemplate(), fileName: 'fuel-entry-import-sample.xlsx' };
    }
    throw new AppError(`No sample template available for ${entityType}`, 404);
  },
};
