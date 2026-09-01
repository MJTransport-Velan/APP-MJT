import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { ReportFilters, dateRangeWhere, toDateRange } from '../utils/reportFilters';
import { ReportDefinition } from '../reports/report.types';

const vehicleStatusReport: ReportDefinition = {
  key: 'vehicleStatusReport',
  label: 'Vehicle Status Report',
  columns: [
    { key: 'registrationNumber', label: 'Registration No.' },
    { key: 'vehicleType', label: 'Type' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'status', label: 'Status' },
    { key: 'isActive', label: 'Active' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      AND: [
        filters.search ? { registrationNumber: { contains: filters.search, mode: 'insensitive' } } : {},
        filters.vehicleTypeId ? { vehicleTypeId: filters.vehicleTypeId } : {},
        filters.supplierId ? { supplierId: filters.supplierId } : {},
      ],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where,
        include: { vehicleType: true, supplier: true },
        orderBy: { registrationNumber: 'asc' },
        skip,
        take,
      }),
      prisma.vehicle.count({ where }),
    ]);
    return {
      rows: rows.map((v) => ({
        registrationNumber: v.registrationNumber,
        vehicleType: v.vehicleType.name,
        ownership: v.ownership,
        supplier: v.supplier?.name || '-',
        status: v.status,
        isActive: v.isActive,
      })),
      total,
    };
  },
};

const vehicleDocumentExpiryReport: ReportDefinition = {
  key: 'vehicleDocumentExpiryReport',
  label: 'Vehicle Document Expiry Report',
  columns: [
    { key: 'registrationNumber', label: 'Vehicle' },
    { key: 'insuranceExpiryDate', label: 'Insurance Expiry' },
    { key: 'permitExpiryDate', label: 'Permit Expiry' },
    { key: 'fitnessExpiryDate', label: 'Fitness Expiry' },
    { key: 'pucExpiryDate', label: 'PUC Expiry' },
  ],
  run: async (filters, skip, take) => {
    // On this report the From/To window reads as "documents expiring
    // between these dates" — the only date on a vehicle row is an expiry,
    // so From bounds it below and To above. Previously only To was honoured,
    // which made the From box on the toolbar silently do nothing here.
    const window = toDateRange(filters);
    const expiryWindow = {
      ...(window.from ? { gte: window.from } : {}),
      ...(window.to ? { lte: window.to } : {}),
    };
    const hasWindow = Object.keys(expiryWindow).length > 0;
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      AND: [
        filters.vehicleTypeId ? { vehicleTypeId: filters.vehicleTypeId } : {},
        hasWindow
          ? {
              OR: [
                { insuranceExpiryDate: expiryWindow },
                { permitExpiryDate: expiryWindow },
                { fitnessExpiryDate: expiryWindow },
                { pucExpiryDate: expiryWindow },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.vehicle.findMany({ where, orderBy: { registrationNumber: 'asc' }, skip, take }),
      prisma.vehicle.count({ where }),
    ]);
    return {
      rows: rows.map((v) => ({
        registrationNumber: v.registrationNumber,
        insuranceExpiryDate: v.insuranceExpiryDate,
        permitExpiryDate: v.permitExpiryDate,
        fitnessExpiryDate: v.fitnessExpiryDate,
        pucExpiryDate: v.pucExpiryDate,
      })),
      total,
    };
  },
};

const fuelConsumptionReport: ReportDefinition = {
  key: 'fuelConsumptionReport',
  label: 'Fuel Consumption Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'quantityLiters', label: 'Quantity (L)' },
    { key: 'totalAmount', label: 'Amount' },
    { key: 'mileageKmpl', label: 'Mileage (km/l)' },
    { key: 'entryDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.FuelEntryWhereInput = {
      deletedAt: null,
      AND: [filters.vehicleId ? { vehicleId: filters.vehicleId } : {}, dateRangeWhere('entryDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.fuelEntry.findMany({
        where,
        include: { vehicle: true },
        orderBy: { entryDate: 'desc' },
        skip,
        take,
      }),
      prisma.fuelEntry.count({ where }),
    ]);
    return {
      rows: rows.map((f) => ({
        vehicle: f.vehicle.registrationNumber,
        quantityLiters: f.quantityLiters,
        totalAmount: f.totalAmount,
        mileageKmpl: f.mileageKmpl,
        entryDate: f.entryDate,
      })),
      total,
    };
  },
};

const maintenanceReport: ReportDefinition = {
  key: 'maintenanceReport',
  label: 'Maintenance Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'cost', label: 'Cost' },
    { key: 'status', label: 'Status' },
    { key: 'serviceDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.MaintenanceRecordWhereInput = {
      deletedAt: null,
      AND: [filters.vehicleId ? { vehicleId: filters.vehicleId } : {}, dateRangeWhere('serviceDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.maintenanceRecord.findMany({
        where,
        include: { vehicle: true },
        orderBy: { serviceDate: 'desc' },
        skip,
        take,
      }),
      prisma.maintenanceRecord.count({ where }),
    ]);
    return {
      rows: rows.map((m) => ({
        vehicle: m.vehicle.registrationNumber,
        type: m.type,
        description: m.description,
        cost: m.cost,
        status: m.status,
        serviceDate: m.serviceDate,
      })),
      total,
    };
  },
};

const vehicleExpenseReport: ReportDefinition = {
  key: 'vehicleExpenseReport',
  label: 'Vehicle Expense Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'expenseDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.VehicleExpenseWhereInput = {
      deletedAt: null,
      AND: [filters.vehicleId ? { vehicleId: filters.vehicleId } : {}, dateRangeWhere('expenseDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.vehicleExpense.findMany({
        where,
        include: { vehicle: true },
        orderBy: { expenseDate: 'desc' },
        skip,
        take,
      }),
      prisma.vehicleExpense.count({ where }),
    ]);
    return {
      rows: rows.map((e) => ({
        vehicle: e.vehicle.registrationNumber,
        category: e.category,
        amount: e.amount,
        expenseDate: e.expenseDate,
      })),
      total,
    };
  },
};

const sparePartsUsageReport: ReportDefinition = {
  key: 'sparePartsUsageReport',
  label: 'Spare Parts Usage Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'sparePart', label: 'Spare Part' },
    { key: 'type', label: 'Type' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'usageDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.SparePartUsageWhereInput = {
      AND: [filters.vehicleId ? { vehicleId: filters.vehicleId } : {}, dateRangeWhere('usageDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.sparePartUsage.findMany({
        where,
        include: { vehicle: true, sparePart: true },
        orderBy: { usageDate: 'desc' },
        skip,
        take,
      }),
      prisma.sparePartUsage.count({ where }),
    ]);
    return {
      rows: rows.map((s) => ({
        vehicle: s.vehicle.registrationNumber,
        sparePart: s.sparePart.name,
        type: s.type,
        quantity: s.quantity,
        usageDate: s.usageDate,
      })),
      total,
    };
  },
};

// -----------------------------------------------------------------------
// Diesel/Fuel — dedicated reports (design brief: FASTag and Diesel must be
// separate dedicated modules with their own reports, not lumped under a
// generic vehicle-expense report). Quantity/Cost/Rate/Mileage/Cost-per-KM
// are exposed as columns within these grouped reports rather than as
// separate report screens each — fuelConsumptionReport above already
// covers the raw per-entry list.
// -----------------------------------------------------------------------

const fuelVehicleWiseReport: ReportDefinition = {
  key: 'fuelVehicleWiseReport',
  label: 'Vehicle-wise Fuel Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'totalLiters', label: 'Total Litres' },
    { key: 'totalCost', label: 'Total Cost' },
    { key: 'avgRate', label: 'Avg Rate' },
    { key: 'totalKM', label: 'Total KM' },
    { key: 'avgMileageKmpl', label: 'Avg Mileage (km/l)' },
  ],
  run: async (filters) => {
    const where: Prisma.FuelEntryWhereInput = { deletedAt: null, AND: [dateRangeWhere('entryDate', filters)] };
    const entries = await prisma.fuelEntry.findMany({ where, include: { vehicle: true } });
    const byVehicle = new Map<string, { registrationNumber: string; liters: number; cost: number; rateSum: number; rateCount: number; km: number; mileageSum: number; mileageCount: number }>();
    for (const e of entries) {
      const existing = byVehicle.get(e.vehicleId) || { registrationNumber: e.vehicle.registrationNumber, liters: 0, cost: 0, rateSum: 0, rateCount: 0, km: 0, mileageSum: 0, mileageCount: 0 };
      existing.liters += Number(e.quantityLiters ?? 0);
      existing.cost += Number(e.totalAmount ?? 0);
      // Entries booked as a plain amount carry no rate, and averaging them
      // in as zero would drag every vehicle's average rate down.
      if (e.ratePerLiter != null) { existing.rateSum += Number(e.ratePerLiter); existing.rateCount += 1; }
      existing.km += Number(e.distanceCovered || 0);
      if (e.mileageKmpl != null) { existing.mileageSum += Number(e.mileageKmpl); existing.mileageCount += 1; }
      byVehicle.set(e.vehicleId, existing);
    }
    const rows = Array.from(byVehicle.values()).map((v) => ({
      vehicle: v.registrationNumber,
      totalLiters: Number(v.liters.toFixed(2)),
      totalCost: Number(v.cost.toFixed(2)),
      avgRate: v.rateCount ? Number((v.rateSum / v.rateCount).toFixed(2)) : null,
      totalKM: v.km,
      avgMileageKmpl: v.mileageCount ? Number((v.mileageSum / v.mileageCount).toFixed(2)) : null,
    }));
    return { rows, total: rows.length };
  },
};

const fuelTripWiseReport: ReportDefinition = {
  key: 'fuelTripWiseReport',
  label: 'Trip-wise Fuel Report',
  columns: [
    { key: 'trip', label: 'Trip' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'totalLiters', label: 'Total Litres' },
    { key: 'totalCost', label: 'Total Cost' },
  ],
  run: async (filters) => {
    const where: Prisma.FuelEntryWhereInput = { deletedAt: null, tripId: { not: null }, AND: [dateRangeWhere('entryDate', filters)] };
    const entries = await prisma.fuelEntry.findMany({ where, include: { vehicle: true, trip: true } });
    const byTrip = new Map<string, { tripNumber: string; vehicle: string; liters: number; cost: number }>();
    for (const e of entries) {
      if (!e.tripId || !e.trip) continue;
      const existing = byTrip.get(e.tripId) || { tripNumber: e.trip.tripNumber, vehicle: e.vehicle.registrationNumber, liters: 0, cost: 0 };
      existing.liters += Number(e.quantityLiters ?? 0);
      existing.cost += Number(e.totalAmount ?? 0);
      byTrip.set(e.tripId, existing);
    }
    const rows = Array.from(byTrip.values()).map((v) => ({ trip: v.tripNumber, vehicle: v.vehicle, totalLiters: Number(v.liters.toFixed(2)), totalCost: Number(v.cost.toFixed(2)) }));
    return { rows, total: rows.length };
  },
};

const fuelDriverWiseReport: ReportDefinition = {
  key: 'fuelDriverWiseReport',
  label: 'Driver-wise Fuel Report',
  columns: [
    { key: 'driver', label: 'Driver' },
    { key: 'totalLiters', label: 'Total Litres' },
    { key: 'totalCost', label: 'Total Cost' },
    { key: 'totalKM', label: 'Total KM' },
    { key: 'avgMileageKmpl', label: 'Mileage (km/l)' },
    { key: 'costPerKm', label: 'Cost / KM' },
  ],
  run: async (filters) => {
    const where: Prisma.FuelEntryWhereInput = { deletedAt: null, driverId: { not: null }, AND: [dateRangeWhere('entryDate', filters)] };
    const entries = await prisma.fuelEntry.findMany({ where, include: { driver: true } });
    const byDriver = new Map<string, { name: string; liters: number; cost: number; km: number; mileageSum: number; mileageCount: number }>();
    for (const e of entries) {
      if (!e.driverId || !e.driver) continue;
      const existing = byDriver.get(e.driverId) || { name: e.driver.name, liters: 0, cost: 0, km: 0, mileageSum: 0, mileageCount: 0 };
      existing.liters += Number(e.quantityLiters ?? 0);
      existing.cost += Number(e.totalAmount ?? 0);
      existing.km += Number(e.distanceCovered ?? 0);
      // Only fills that recorded their litres produce a km/l figure.
      if (e.mileageKmpl != null) { existing.mileageSum += Number(e.mileageKmpl); existing.mileageCount += 1; }
      byDriver.set(e.driverId, existing);
    }
    const rows = Array.from(byDriver.values()).map((v) => ({
      driver: v.name,
      totalLiters: Number(v.liters.toFixed(2)),
      totalCost: Number(v.cost.toFixed(2)),
      totalKM: v.km,
      avgMileageKmpl: v.mileageCount ? Number((v.mileageSum / v.mileageCount).toFixed(2)) : null,
      costPerKm: v.km > 0 ? Number((v.cost / v.km).toFixed(2)) : null,
    }));
    return { rows, total: rows.length };
  },
};

const fuelDateWiseReport: ReportDefinition = {
  key: 'fuelDateWiseReport',
  label: 'Date-wise Fuel Report',
  columns: [
    { key: 'date', label: 'Date' },
    { key: 'totalLiters', label: 'Total Litres' },
    { key: 'totalCost', label: 'Total Cost' },
  ],
  run: async (filters) => {
    const where: Prisma.FuelEntryWhereInput = { deletedAt: null, AND: [dateRangeWhere('entryDate', filters)] };
    const entries = await prisma.fuelEntry.findMany({ where });
    const byDate = new Map<string, { liters: number; cost: number }>();
    for (const e of entries) {
      const key = e.entryDate.toISOString().slice(0, 10);
      const existing = byDate.get(key) || { liters: 0, cost: 0 };
      existing.liters += Number(e.quantityLiters ?? 0);
      existing.cost += Number(e.totalAmount ?? 0);
      byDate.set(key, existing);
    }
    const rows = Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, v]) => ({ date, totalLiters: Number(v.liters.toFixed(2)), totalCost: Number(v.cost.toFixed(2)) }));
    return { rows, total: rows.length };
  },
};

const fuelMonthlySummaryReport: ReportDefinition = {
  key: 'fuelMonthlySummaryReport',
  label: 'Monthly Fuel Summary',
  columns: [
    { key: 'month', label: 'Month' },
    { key: 'totalLiters', label: 'Total Litres' },
    { key: 'totalCost', label: 'Total Cost' },
    { key: 'avgRate', label: 'Avg Rate' },
  ],
  run: async (filters) => {
    const where: Prisma.FuelEntryWhereInput = { deletedAt: null, AND: [dateRangeWhere('entryDate', filters)] };
    const entries = await prisma.fuelEntry.findMany({ where });
    const byMonth = new Map<string, { liters: number; cost: number; rateSum: number; rateCount: number }>();
    for (const e of entries) {
      const key = e.entryDate.toISOString().slice(0, 7);
      const existing = byMonth.get(key) || { liters: 0, cost: 0, rateSum: 0, rateCount: 0 };
      existing.liters += Number(e.quantityLiters ?? 0);
      existing.cost += Number(e.totalAmount ?? 0);
      // Only entries that actually carry a rate feed the average.
      if (e.ratePerLiter != null) { existing.rateSum += Number(e.ratePerLiter); existing.rateCount += 1; }
      byMonth.set(key, existing);
    }
    const rows = Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, v]) => ({
        month,
        totalLiters: Number(v.liters.toFixed(2)),
        totalCost: Number(v.cost.toFixed(2)),
        avgRate: v.rateCount ? Number((v.rateSum / v.rateCount).toFixed(2)) : null,
      }));
    return { rows, total: rows.length };
  },
};

// -----------------------------------------------------------------------
// FASTag — dedicated reports.
// -----------------------------------------------------------------------

const fastTagUsageReport: ReportDefinition = {
  key: 'fastTagUsageReport',
  label: 'FASTag Usage Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'tollPlaza', label: 'Toll Plaza' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'transactionDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.FastTagTransactionWhereInput = {
      type: 'USAGE',
      AND: [filters.vehicleId ? { vehicleId: filters.vehicleId } : {}, dateRangeWhere('transactionDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.fastTagTransaction.findMany({ where, include: { vehicle: true }, orderBy: { transactionDate: 'desc' }, skip, take }),
      prisma.fastTagTransaction.count({ where }),
    ]);
    return {
      rows: rows.map((t) => ({ vehicle: t.vehicle?.registrationNumber ?? '-', tollPlaza: t.tollPlaza, amount: t.amount, status: t.status, transactionDate: t.transactionDate })),
      total,
    };
  },
};

const fastTagRechargeReport: ReportDefinition = {
  key: 'fastTagRechargeReport',
  label: 'FASTag Recharge Report',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'amount', label: 'Amount' },
    { key: 'transactionReference', label: 'Reference' },
    { key: 'transactionDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.FastTagTransactionWhereInput = {
      type: 'RECHARGE',
      AND: [filters.vehicleId ? { vehicleId: filters.vehicleId } : {}, dateRangeWhere('transactionDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.fastTagTransaction.findMany({ where, include: { vehicle: true }, orderBy: { transactionDate: 'desc' }, skip, take }),
      prisma.fastTagTransaction.count({ where }),
    ]);
    return {
      rows: rows.map((t) => ({ vehicle: t.vehicle?.registrationNumber ?? '-', amount: t.amount, transactionReference: t.transactionReference, transactionDate: t.transactionDate })),
      total,
    };
  },
};

// The wallet balance itself is fleet-wide (shared across every vehicle), so
// this report only breaks down each vehicle's own usage/recharge activity
// against that one wallet — it no longer has a per-vehicle balance to show.
const fastTagVehicleWiseReport: ReportDefinition = {
  key: 'fastTagVehicleWiseReport',
  label: 'Vehicle-wise FASTag Expense',
  columns: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'totalUsage', label: 'Total Toll Usage' },
    { key: 'totalRecharge', label: 'Total Recharge' },
  ],
  run: async (filters) => {
    const where: Prisma.FastTagTransactionWhereInput = {
      AND: [{ vehicleId: filters.vehicleId ? filters.vehicleId : { not: null } }, dateRangeWhere('transactionDate', filters)],
    };
    const txns = await prisma.fastTagTransaction.findMany({ where, include: { vehicle: true } });
    const byVehicle = new Map<string, { vehicle: string; usage: number; recharge: number }>();
    for (const t of txns) {
      if (!t.vehicleId || !t.vehicle) continue;
      const existing = byVehicle.get(t.vehicleId) || { vehicle: t.vehicle.registrationNumber, usage: 0, recharge: 0 };
      if (t.type === 'USAGE') existing.usage += Number(t.amount);
      if (t.type === 'RECHARGE') existing.recharge += Number(t.amount);
      byVehicle.set(t.vehicleId, existing);
    }
    const rows = Array.from(byVehicle.values()).map((v) => ({
      vehicle: v.vehicle,
      totalUsage: Number(v.usage.toFixed(2)),
      totalRecharge: Number(v.recharge.toFixed(2)),
    }));
    return { rows, total: rows.length };
  },
};

const fastTagTripWiseReport: ReportDefinition = {
  key: 'fastTagTripWiseReport',
  label: 'Trip-wise FASTag Expense',
  columns: [
    { key: 'trip', label: 'Trip' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'totalUsage', label: 'Total Toll Usage' },
  ],
  run: async (filters) => {
    const where: Prisma.FastTagTransactionWhereInput = { type: 'USAGE', tripId: { not: null }, AND: [dateRangeWhere('transactionDate', filters)] };
    const rows_ = await prisma.fastTagTransaction.findMany({ where, include: { trip: true, vehicle: true } });
    const byTrip = new Map<string, { tripNumber: string; vehicle: string; amount: number }>();
    for (const t of rows_) {
      if (!t.tripId || !t.trip) continue;
      const existing = byTrip.get(t.tripId) || { tripNumber: t.trip.tripNumber, vehicle: t.vehicle?.registrationNumber ?? '-', amount: 0 };
      existing.amount += Number(t.amount);
      byTrip.set(t.tripId, existing);
    }
    const rows = Array.from(byTrip.values()).map((v) => ({ trip: v.tripNumber, vehicle: v.vehicle, totalUsage: Number(v.amount.toFixed(2)) }));
    return { rows, total: rows.length };
  },
};

const fastTagDateWiseReport: ReportDefinition = {
  key: 'fastTagDateWiseReport',
  label: 'Date-wise FASTag Expense',
  columns: [
    { key: 'date', label: 'Date' },
    { key: 'totalUsage', label: 'Total Toll Usage' },
  ],
  run: async (filters) => {
    const where: Prisma.FastTagTransactionWhereInput = { type: 'USAGE', AND: [dateRangeWhere('transactionDate', filters)] };
    const rows_ = await prisma.fastTagTransaction.findMany({ where });
    const byDate = new Map<string, number>();
    for (const t of rows_) {
      const key = t.transactionDate.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) || 0) + Number(t.amount));
    }
    const rows = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([date, amount]) => ({ date, totalUsage: Number(amount.toFixed(2)) }));
    return { rows, total: rows.length };
  },
};

const fastTagTollPlazaWiseReport: ReportDefinition = {
  key: 'fastTagTollPlazaWiseReport',
  label: 'Toll Plaza-wise FASTag Expense',
  columns: [
    { key: 'tollPlaza', label: 'Toll Plaza' },
    { key: 'totalUsage', label: 'Total Toll Usage' },
    { key: 'transactionCount', label: 'Transactions' },
  ],
  run: async (filters) => {
    const where: Prisma.FastTagTransactionWhereInput = { type: 'USAGE', tollPlaza: { not: null }, AND: [dateRangeWhere('transactionDate', filters)] };
    const rows_ = await prisma.fastTagTransaction.findMany({ where });
    const byPlaza = new Map<string, { amount: number; count: number }>();
    for (const t of rows_) {
      if (!t.tollPlaza) continue;
      const existing = byPlaza.get(t.tollPlaza) || { amount: 0, count: 0 };
      existing.amount += Number(t.amount);
      existing.count += 1;
      byPlaza.set(t.tollPlaza, existing);
    }
    const rows = Array.from(byPlaza.entries()).map(([tollPlaza, v]) => ({ tollPlaza, totalUsage: Number(v.amount.toFixed(2)), transactionCount: v.count }));
    return { rows, total: rows.length };
  },
};

// One shared wallet for the whole fleet — this report is just that single
// row's current state (vehicle-wise usage lives in fastTagVehicleWiseReport
// instead).
const fastTagWalletBalanceReport: ReportDefinition = {
  key: 'fastTagWalletBalanceReport',
  label: 'FASTag Wallet Balance',
  columns: [
    { key: 'fastagNumber', label: 'Wallet Reference' },
    { key: 'currentBalance', label: 'Balance' },
    { key: 'isActive', label: 'Active' },
  ],
  run: async () => {
    const account = await prisma.fastTagAccount.findFirst({ where: { deletedAt: null } });
    if (!account) return { rows: [], total: 0 };
    return { rows: [{ fastagNumber: account.fastagNumber, currentBalance: account.currentBalance, isActive: account.isActive }], total: 1 };
  },
};


const fastTagMonthlyExpenseReport: ReportDefinition = {
  key: 'fastTagMonthlyExpenseReport',
  label: 'Monthly FASTag Expense',
  columns: [
    { key: 'month', label: 'Month' },
    { key: 'totalUsage', label: 'Total Toll Usage' },
    { key: 'totalRecharge', label: 'Total Recharge' },
  ],
  run: async (filters) => {
    const where: Prisma.FastTagTransactionWhereInput = { AND: [dateRangeWhere('transactionDate', filters)] };
    const rows_ = await prisma.fastTagTransaction.findMany({ where });
    const byMonth = new Map<string, { usage: number; recharge: number }>();
    for (const t of rows_) {
      const key = t.transactionDate.toISOString().slice(0, 7);
      const existing = byMonth.get(key) || { usage: 0, recharge: 0 };
      if (t.type === 'USAGE') existing.usage += Number(t.amount);
      if (t.type === 'RECHARGE') existing.recharge += Number(t.amount);
      byMonth.set(key, existing);
    }
    const rows = Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, v]) => ({ month, totalUsage: Number(v.usage.toFixed(2)), totalRecharge: Number(v.recharge.toFixed(2)) }));
    return { rows, total: rows.length };
  },
};

export const fleetReportRepository: Record<string, ReportDefinition> = {
  vehicleStatusReport,
  vehicleDocumentExpiryReport,
  fuelConsumptionReport,
  maintenanceReport,
  vehicleExpenseReport,
  sparePartsUsageReport,
  fuelVehicleWiseReport,
  fuelTripWiseReport,
  fuelDriverWiseReport,
  fuelDateWiseReport,
  fuelMonthlySummaryReport,
  fastTagUsageReport,
  fastTagRechargeReport,
  fastTagVehicleWiseReport,
  fastTagTripWiseReport,
  fastTagDateWiseReport,
  fastTagTollPlazaWiseReport,
  fastTagWalletBalanceReport,
  fastTagMonthlyExpenseReport,
};
