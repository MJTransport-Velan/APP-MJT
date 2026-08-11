/**
 * Demo Data Seed — populates 5-15 sample records across every business
 * table in the system (Masters -> Fleet -> Operations -> Accounts),
 * wired together with real, valid foreign-key relationships so the app
 * looks fully "lived-in" the moment you log in.
 *
 * This is DELIBERATELY SEPARATE from prisma/seed.ts, which owns system
 * setup (roles, permissions, the Super Admin user, the dynamic menu
 * tree). This script assumes that seed has already been run.
 *
 * Idempotency: most master records use upsert() on their natural unique
 * key (code / registrationNumber / licenseNumber / tripNumber / etc.),
 * so re-running is safe for them individually. Transactional/junction
 * tables with no natural unique key (VehicleAssignment, FuelEntry,
 * MaintenanceRecord, SparePartUsage, VehicleExpense, TripStatusHistory,
 * TripDocument, TripExpense, AuditLog, ActivityLog) do NOT have a
 * natural key to upsert against, so the WHOLE script is guarded by a
 * single marker check at the top: if the demo company "CUST-OMSAI"
 * already exists, the script exits immediately rather than risk
 * duplicating those rows. To get a clean re-seed, run
 * `npx prisma migrate reset` first, then re-run this script.
 *
 * Run with: npm run seed:demo
 */

import {
  PrismaClient,
  VehicleOwnership,
  IntentStatus,
  TripStatus,
  MaintenanceType,
  TripExpenseCategory,
  VehicleExpenseCategory,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------- small helpers ----------

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function ensureUser(username: string, fullName: string, email: string, roleName: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role "${roleName}" not found — run "npm run seed" (the main seed) first.`);
  }
  const hashedPassword = await bcrypt.hash('Demo@123', 10);
  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, fullName, email, password: hashedPassword, isActive: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  return user;
}

async function main() {
  // ---------- idempotency guard ----------
  const marker = await prisma.company.findUnique({ where: { code: 'CUST-OMSAI' } });
  if (marker) {
    console.log('Demo data already present (found company CUST-OMSAI). Skipping to avoid duplicates.');
    console.log('To get a fresh re-seed: npx prisma migrate reset, then npm run seed && npm run seed:demo');
    return;
  }

  const adminUser = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  // =========================================================
  // 0. Extra staff users (needed to own the demo assignments)
  // =========================================================
  console.log('Creating demo staff users...');
  const intentCreator = await ensureUser('rahul.intent', 'Rahul Sharma', 'rahul.intent@mjtransport.example', 'INTENT_CREATOR');
  const opsManager = await ensureUser('suresh.ops', 'Suresh Kumar', 'suresh.ops@mjtransport.example', 'OPERATION_MANAGER');
  const ownFleetOp = await ensureUser('vijay.fleet', 'Vijay Anand', 'vijay.fleet@mjtransport.example', 'OWN_FLEET_OPERATOR');
  const marketFleetOp = await ensureUser('arjun.market', 'Arjun Reddy', 'arjun.market@mjtransport.example', 'MARKET_FLEET_OPERATOR');
  const accountsExec = await ensureUser('priya.accounts', 'Priya Menon', 'priya.accounts@mjtransport.example', 'ACCOUNTS_EXECUTIVE');
  const accountsManager = await ensureUser('lakshmi.finance', 'Lakshmi Iyer', 'lakshmi.finance@mjtransport.example', 'ACCOUNTING_MANAGER');
  const fleetManagerUser = await ensureUser('karthik.fleetmgr', 'Karthik Raja', 'karthik.fleetmgr@mjtransport.example', 'FLEET_MANAGER');

  // =========================================================
  // 0b. Pad Departments / Teams to at least 5 each
  // =========================================================
  await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources', description: 'HR Department' },
  });
  const opsDept = await prisma.department.findUniqueOrThrow({ where: { name: 'Operations' } });
  await prisma.team.upsert({
    where: { name: 'Dispatch Team' },
    update: {},
    create: { name: 'Dispatch Team', description: 'Trip Dispatch Coordination', departmentId: opsDept.id },
  });

  // =========================================================
  // 1. MASTERS
  // =========================================================
  console.log('Seeding demo Group...');
  const demoGroup = await prisma.group.upsert({
    where: { name: 'Demo Group' },
    update: {},
    create: { name: 'Demo Group', description: 'Default group for demo data' },
  });
  for (const member of [intentCreator, ownFleetOp, marketFleetOp, accountsExec]) {
    await prisma.groupMembership.upsert({
      where: { userId: member.id },
      update: { groupId: demoGroup.id },
      create: { groupId: demoGroup.id, userId: member.id },
    });
  }

  console.log('Seeding demo Companies (customers)...');
  const companyData = [
    { name: 'Om Sai Steel Industries', code: 'CUST-OMSAI', contactPerson: 'Ramesh Gupta', phone: '9840012345', email: 'accounts@omsaisteel.example', gstNumber: '33AAAAA0000A1Z5' },
    { name: 'Ganga Textiles Ltd', code: 'CUST-GANGA', contactPerson: 'Sunita Rao', phone: '9840012346', email: 'billing@gangatextiles.example', gstNumber: '33BBBBB0000B1Z5' },
    { name: 'Krishna Cement Works', code: 'CUST-KRISHNA', contactPerson: 'Manoj Pillai', phone: '9840012347', email: 'ap@krishnacement.example' },
    { name: 'Vinayaga Agro Foods', code: 'CUST-VINAYAGA', contactPerson: 'Deepa Krishnan', phone: '9840012348', email: 'finance@vinayagaagro.example' },
    { name: 'Sri Balaji Electronics', code: 'CUST-BALAJI', contactPerson: 'Anand Vel', phone: '9840012349', email: 'accounts@sribalajielec.example' },
    { name: 'Amman Paper Mills', code: 'CUST-AMMAN', contactPerson: 'Kavitha Selvam', phone: '9840012350', email: 'ap@ammanpaper.example' },
    { name: 'Murugan Timber Traders', code: 'CUST-MURUGAN', contactPerson: 'Senthil Kumar', phone: '9840012351', email: 'billing@murugantimber.example' },
    { name: 'Lakshmi Machinery Pvt Ltd', code: 'CUST-LAKSHMI', contactPerson: 'Divya Narayan', phone: '9840012352', email: 'accounts@lakshmimachinery.example' },
  ];
  const companies = [];
  for (const c of companyData) {
    companies.push(
      await prisma.company.upsert({
        where: { code: c.code },
        update: {},
        create: { ...c, groupId: demoGroup.id, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Branches...');
  const branchData = [
    { companyId: companies[0].id, name: 'Chennai HQ', code: 'BR-OMSAI-CHN' },
    { companyId: companies[0].id, name: 'Coimbatore Branch', code: 'BR-OMSAI-CBE' },
    { companyId: companies[1].id, name: 'Tirupur Branch', code: 'BR-GANGA-TUP' },
    { companyId: companies[2].id, name: 'Madurai Branch', code: 'BR-KRISHNA-MDU' },
    { companyId: companies[3].id, name: 'Salem Branch', code: 'BR-VINAYAGA-SLM' },
    { companyId: companies[4].id, name: 'Bangalore Branch', code: 'BR-BALAJI-BLR' },
    { companyId: companies[5].id, name: 'Trichy Branch', code: 'BR-AMMAN-TRZ' },
    { companyId: companies[6].id, name: 'Erode Branch', code: 'BR-MURUGAN-ERD' },
  ];
  for (const b of branchData) {
    await prisma.branch.upsert({
      where: { code: b.code },
      update: {},
      create: { ...b, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
    });
  }

  console.log('Seeding demo Locations...');
  const locationData = [
    { name: 'Chennai', code: 'LOC-CHN', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    { name: 'Coimbatore', code: 'LOC-CBE', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001' },
    { name: 'Bangalore', code: 'LOC-BLR', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
    { name: 'Hyderabad', code: 'LOC-HYD', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    { name: 'Mumbai', code: 'LOC-MUM', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    { name: 'Pune', code: 'LOC-PUN', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    { name: 'Delhi', code: 'LOC-DEL', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    { name: 'Kolkata', code: 'LOC-KOL', city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
    { name: 'Ahmedabad', code: 'LOC-AMD', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
    { name: 'Madurai', code: 'LOC-MDU', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
  ];
  const locations = [];
  for (const l of locationData) {
    locations.push(
      await prisma.location.upsert({
        where: { code: l.code },
        update: {},
        create: { ...l, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Transport Routes...');
  const routePairs: [number, number][] = [[0, 1], [0, 2], [1, 2], [2, 3], [4, 5], [6, 7], [0, 4], [2, 4], [8, 0], [9, 1]];
  const routes = [];
  for (let i = 0; i < routePairs.length; i++) {
    const [fromIdx, toIdx] = routePairs[i];
    const from = locations[fromIdx];
    const to = locations[toIdx];
    const code = `RT-${String(i + 1).padStart(3, '0')}`;
    routes.push(
      await prisma.transportRoute.upsert({
        where: { code },
        update: {},
        create: {
          name: `${from.name} - ${to.name}`,
          code,
          fromLocationId: from.id,
          toLocationId: to.id,
          distanceKm: randomInt(80, 1400),
          isActive: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      })
    );
  }

  console.log('Seeding demo Vehicle Types...');
  const vehicleTypeData = [
    { name: 'Flat-bed Tata Ace', code: 'VT-FB-TATA-ACE' },
    { name: 'Flat-bed Dost', code: 'VT-FB-DOST' },
    { name: 'Flat-bed Bada Dost', code: 'VT-FB-BADA-DOST' },
    { name: 'Container 12 Ft', code: 'VT-CONT-12FT' },
    { name: 'Container 14 Ft', code: 'VT-CONT-14FT' },
    { name: 'Container 17 Ft', code: 'VT-CONT-17FT' },
    { name: 'Container 19 Ft', code: 'VT-CONT-19FT' },
    { name: 'Container 20 Ft', code: 'VT-CONT-20FT' },
    { name: 'Container 22 Ft', code: 'VT-CONT-22FT' },
    { name: 'Container 24 Ft', code: 'VT-CONT-24FT' },
    { name: 'Container 32 SXL', code: 'VT-CONT-32SXL' },
    { name: 'Container 32 MXL', code: 'VT-CONT-32MXL' },
    { name: 'Reefer 20 Ft', code: 'VT-REEFER-20FT' },
    { name: 'Reefer 22 Ft', code: 'VT-REEFER-22FT' },
    { name: 'Reefer 24 Ft', code: 'VT-REEFER-24FT' },
  ];
  const vehicleTypes = [];
  for (const v of vehicleTypeData) {
    vehicleTypes.push(
      await prisma.vehicleType.upsert({
        where: { code: v.code },
        update: {},
        create: { ...v, description: v.name, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Trailer Types...');
  const trailerTypeNames = ['Flatbed', 'Lowbed', 'Container Trailer', 'Tanker Trailer', 'Curtain Side', 'Skeletal Trailer'];
  for (let i = 0; i < trailerTypeNames.length; i++) {
    const code = `TT-${String(i + 1).padStart(2, '0')}`;
    await prisma.trailerType.upsert({
      where: { code },
      update: {},
      create: { name: trailerTypeNames[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
    });
  }

  console.log('Seeding demo Materials...');
  const materialData = [
    { name: 'Cement', unit: 'Bags' },
    { name: 'Steel Coils', unit: 'Tons' },
    { name: 'Textile Bales', unit: 'Bales' },
    { name: 'Industrial Chemicals', unit: 'Drums' },
    { name: 'FMCG Goods', unit: 'Cartons' },
    { name: 'Agricultural Produce', unit: 'Tons' },
    { name: 'Electronics', unit: 'Cartons' },
    { name: 'Machinery Parts', unit: 'Crates' },
    { name: 'Paper Rolls', unit: 'Rolls' },
    { name: 'Timber Logs', unit: 'Tons' },
  ];
  const materials = [];
  for (let i = 0; i < materialData.length; i++) {
    const code = `MAT-${String(i + 1).padStart(3, '0')}`;
    materials.push(
      await prisma.material.upsert({
        where: { code },
        update: {},
        create: { ...materialData[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Expense Categories...');
  const expenseCategoryNames = ['Toll Charges', 'Parking Fees', 'Loading Labour', 'Unloading Labour', 'Documentation Charges', 'Miscellaneous'];
  for (let i = 0; i < expenseCategoryNames.length; i++) {
    const code = `EXP-${String(i + 1).padStart(2, '0')}`;
    await prisma.expenseCategory.upsert({
      where: { code },
      update: {},
      create: { name: expenseCategoryNames[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
    });
  }

  console.log('Seeding demo Fuel Stations...');
  const fuelStationData = [
    { name: 'Highway Fuels - Chennai Bypass', location: 'Chennai' },
    { name: 'National Petroleum - Coimbatore', location: 'Coimbatore' },
    { name: 'Speed Fuels - Bangalore Outer Ring', location: 'Bangalore' },
    { name: 'Trans Highway Fuel Point - Hyderabad', location: 'Hyderabad' },
    { name: 'Metro Fuels - Mumbai Expressway', location: 'Mumbai' },
    { name: 'Deccan Petroleum - Pune', location: 'Pune' },
    { name: 'Capital Fuels - Delhi NH8', location: 'Delhi' },
    { name: 'Eastern Fuel Point - Kolkata', location: 'Kolkata' },
  ];
  const fuelStations = [];
  for (let i = 0; i < fuelStationData.length; i++) {
    const code = `FS-${String(i + 1).padStart(3, '0')}`;
    fuelStations.push(
      await prisma.fuelStation.upsert({
        where: { code },
        update: {},
        create: { ...fuelStationData[i], code, contactPerson: 'Station Manager', phone: `9600${String(100000 + i)}`, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Banks...');
  const bankData = [
    { name: 'State Bank of India', branch: 'Anna Nagar', ifscCode: 'SBIN0001234' },
    { name: 'HDFC Bank', branch: 'T Nagar', ifscCode: 'HDFC0001234' },
    { name: 'ICICI Bank', branch: 'Adyar', ifscCode: 'ICIC0001234' },
    { name: 'Axis Bank', branch: 'Velachery', ifscCode: 'UTIB0001234' },
    { name: 'Canara Bank', branch: 'Guindy', ifscCode: 'CNRB0001234' },
    { name: 'Indian Bank', branch: 'Mylapore', ifscCode: 'IDIB0001234' },
    { name: 'Punjab National Bank', branch: 'Egmore', ifscCode: 'PUNB0001234' },
    { name: 'Bank of Baroda', branch: 'Nungambakkam', ifscCode: 'BARB0001234' },
  ];
  for (let i = 0; i < bankData.length; i++) {
    const code = `BANK-${String(i + 1).padStart(2, '0')}`;
    await prisma.bank.upsert({
      where: { code },
      update: {},
      create: { ...bankData[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
    });
  }

  console.log('Seeding demo Tyres...');
  const tyreData = [
    { brand: 'Brand A Tyres', size: '295/95 R22.5' },
    { brand: 'Brand B Radials', size: '295/95 R22.5' },
    { brand: 'Brand C Tyre Co', size: '10.00 R20' },
    { brand: 'Brand D Rubber', size: '11.00 R20' },
    { brand: 'Brand E Tyres', size: '9.00 R20' },
    { brand: 'Brand F Radials', size: '295/80 R22.5' },
    { brand: 'Brand G Tyre Works', size: '295/80 R22.5' },
    { brand: 'Brand H Rubber Co', size: '315/80 R22.5' },
  ];
  for (let i = 0; i < tyreData.length; i++) {
    const code = `TYR-${String(i + 1).padStart(3, '0')}`;
    await prisma.tyre.upsert({
      where: { code },
      update: {},
      create: { ...tyreData[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
    });
  }

  console.log('Seeding demo Service Categories...');
  const serviceCategoryNames = ['Engine Service', 'Brake Service', 'Tyre Replacement', 'Oil Change', 'AC Service', 'Electrical Repair', 'Body Repair', 'General Checkup'];
  const serviceCategories = [];
  for (let i = 0; i < serviceCategoryNames.length; i++) {
    const code = `SVC-${String(i + 1).padStart(2, '0')}`;
    serviceCategories.push(
      await prisma.serviceCategory.upsert({
        where: { code },
        update: {},
        create: { name: serviceCategoryNames[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Designations...');
  const designationNames = ['Driver', 'Cleaner', 'Operations Executive', 'Fleet Supervisor', 'Accounts Executive', 'Branch Manager', 'Dispatch Officer', 'Security Guard'];
  for (let i = 0; i < designationNames.length; i++) {
    const code = `DESG-${String(i + 1).padStart(2, '0')}`;
    await prisma.designation.upsert({
      where: { code },
      update: {},
      create: { name: designationNames[i], code, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
    });
  }

  console.log('Seeding demo Suppliers...');
  const supplierData = [
    { name: 'Speedway Fleet Services', code: 'SUP-SPEEDWAY', gstNumber: '33CCCCC0000C1Z5', contactPerson: 'Mohan Das', phone: '9843011111' },
    { name: 'Highway Carriers', code: 'SUP-HIGHWAY', contactPerson: 'Ilango Raja', phone: '9843011112' },
    { name: 'Trans India Logistics', code: 'SUP-TRANSINDIA', contactPerson: 'Sathish Babu', phone: '9843011113' },
    { name: 'Southern Fleet Owners Assoc', code: 'SUP-SOUTHERN', contactPerson: 'Ganesh Iyer', phone: '9843011114' },
    { name: 'Rapid Road Transport', code: 'SUP-RAPID', contactPerson: 'Naveen Kumar', phone: '9843011115' },
    { name: 'Coastal Carriers Pvt Ltd', code: 'SUP-COASTAL', contactPerson: 'Vikram Singh', phone: '9843011116' },
    { name: 'Deccan Truck Owners', code: 'SUP-DECCAN', contactPerson: 'Ramu Naidu', phone: '9843011117' },
    { name: 'National Freight Carriers', code: 'SUP-NATIONAL', contactPerson: 'Ashok Verma', phone: '9843011118' },
  ];
  const suppliers = [];
  for (const s of supplierData) {
    suppliers.push(
      await prisma.supplier.upsert({
        where: { code: s.code },
        update: {},
        create: { ...s, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Drivers...');
  const driverData = [
    { name: 'Ramesh Babu', licenseNumber: 'TNDL0001' },
    { name: 'Suresh Kannan', licenseNumber: 'TNDL0002' },
    { name: 'Manickam R', licenseNumber: 'TNDL0003' },
    { name: 'Velmurugan S', licenseNumber: 'TNDL0004' },
    { name: 'Balaji K', licenseNumber: 'TNDL0005' },
    { name: 'Chandrasekar M', licenseNumber: 'TNDL0006' },
    { name: 'Gopinath V', licenseNumber: 'TNDL0007' },
    { name: 'Jayakumar P', licenseNumber: 'TNDL0008' },
    { name: 'Karthikeyan D', licenseNumber: 'TNDL0009' },
    { name: 'Loganathan T', licenseNumber: 'TNDL0010' },
  ];
  const drivers = [];
  for (let i = 0; i < driverData.length; i++) {
    const code = `DRV-${String(i + 1).padStart(3, '0')}`;
    drivers.push(
      await prisma.driver.upsert({
        where: { licenseNumber: driverData[i].licenseNumber },
        update: {},
        create: {
          ...driverData[i],
          code,
          phone: `98410${String(30000 + i)}`,
          licenseExpiryDate: daysFromNow(randomInt(90, 700)),
          isActive: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      })
    );
  }

  console.log('Seeding demo Vehicles...');
  const vehicleRegs = ['TN38AZ1001', 'TN38AZ1002', 'TN09BX2003', 'KA05CY3004', 'KA05CY3005', 'AP16DZ4006', 'MH12EA5007', 'MH12EA5008', 'TN66FB6009', 'TN66FB6010', 'GJ01GC7011', 'DL07HD8012'];
  const manufacturers = ['Tata Motors', 'Ashok Leyland', 'Eicher', 'Mahindra', 'BharatBenz'];
  const vehicles = [];
  for (let i = 0; i < vehicleRegs.length; i++) {
    const ownership: VehicleOwnership = i % 3 === 0 ? 'MARKET' : 'OWN';
    const supplier = ownership === 'MARKET' ? randomFrom(suppliers) : null;
    vehicles.push(
      await prisma.vehicle.upsert({
        where: { registrationNumber: vehicleRegs[i] },
        update: {},
        create: {
          registrationNumber: vehicleRegs[i],
          vehicleTypeId: randomFrom(vehicleTypes).id,
          ownership,
          supplierId: supplier?.id,
          manufacturer: manufacturers[i % manufacturers.length],
          model: `Model-${2018 + (i % 6)}`,
          capacityTon: randomInt(5, 25),
          status: 'AVAILABLE',
          insuranceExpiryDate: daysFromNow(randomInt(30, 400)),
          permitExpiryDate: daysFromNow(randomInt(30, 400)),
          fitnessExpiryDate: daysFromNow(randomInt(30, 400)),
          pucExpiryDate: daysFromNow(randomInt(-10, 200)),
          fastagNumber: `FASTAG${1000 + i}`,
          gpsDeviceNumber: `GPS${2000 + i}`,
          isActive: true,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      })
    );
  }

  // =========================================================
  // 3. FLEET
  // =========================================================
  console.log('Seeding demo Vehicle Assignments...');
  for (let i = 0; i < 8; i++) {
    await prisma.vehicleAssignment.create({
      data: {
        vehicleId: vehicles[i].id,
        driverId: drivers[i].id,
        status: i < 6 ? 'ACTIVE' : 'COMPLETED',
        assignedAt: daysAgo(randomInt(5, 60)),
        unassignedAt: i >= 6 ? daysAgo(randomInt(1, 4)) : undefined,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
  }

  console.log('Seeding demo Fuel Cards...');
  const fuelCards = [];
  for (let i = 0; i < 6; i++) {
    const cardNumber = `FC-DEMO-${String(i + 1).padStart(4, '0')}`;
    fuelCards.push(
      await prisma.fuelCard.upsert({
        where: { cardNumber },
        update: {},
        create: { cardNumber, issuedTo: vehicles[i].registrationNumber, vehicleId: vehicles[i].id, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Fuel Entries...');
  for (let i = 0; i < 12; i++) {
    const vehicle = vehicles[i % vehicles.length];
    const quantity = randomInt(80, 300);
    const rate = randomInt(90, 102);
    await prisma.fuelEntry.create({
      data: {
        vehicleId: vehicle.id,
        fuelCardId: fuelCards[i % fuelCards.length]?.id,
        fuelStationId: randomFrom(fuelStations).id,
        quantityLiters: quantity,
        ratePerLiter: rate,
        totalAmount: quantity * rate,
        odometerReading: 50000 + i * 1200,
        distanceCovered: i === 0 ? undefined : 1200,
        mileageKmpl: i === 0 ? undefined : Number((1200 / quantity).toFixed(2)),
        entryDate: daysAgo(randomInt(1, 40)),
        createdById: ownFleetOp.id,
        updatedById: ownFleetOp.id,
      },
    });
  }

  console.log('Seeding demo Maintenance Records...');
  const maintenanceTypes: MaintenanceType[] = ['SERVICE', 'REPAIR', 'BREAKDOWN', 'ACCIDENT'];
  const maintenanceRecords = [];
  for (let i = 0; i < 10; i++) {
    maintenanceRecords.push(
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: vehicles[i % vehicles.length].id,
          type: maintenanceTypes[i % maintenanceTypes.length],
          serviceCategoryId: randomFrom(serviceCategories).id,
          description: 'Routine demo maintenance entry',
          serviceDate: daysAgo(randomInt(2, 60)),
          cost: randomInt(1000, 15000),
          odometerReading: 40000 + i * 1000,
          nextServiceDueDate: daysFromNow(randomInt(30, 90)),
          status: i % 4 === 0 ? 'OPEN' : 'COMPLETED',
          createdById: ownFleetOp.id,
          updatedById: ownFleetOp.id,
        },
      })
    );
  }

  console.log('Seeding demo Spare Parts (catalog)...');
  const sparePartNames = ['Brake Pads', 'Clutch Plate', 'Engine Oil Filter', 'Air Filter', 'Tyre Tube', 'Battery', 'Headlight Assembly', 'Wiper Blade', 'Fan Belt', 'Radiator Hose'];
  const spareParts = [];
  for (let i = 0; i < sparePartNames.length; i++) {
    const code = `SP-${String(i + 1).padStart(3, '0')}`;
    spareParts.push(
      await prisma.sparePart.upsert({
        where: { code },
        update: {},
        create: { name: sparePartNames[i], code, unit: 'Piece', stockQuantity: randomInt(10, 50), reorderLevel: 5, isActive: true, createdById: adminUser.id, updatedById: adminUser.id },
      })
    );
  }

  console.log('Seeding demo Spare Part Usage...');
  for (let i = 0; i < 8; i++) {
    await prisma.sparePartUsage.create({
      data: {
        vehicleId: vehicles[i % vehicles.length].id,
        sparePartId: spareParts[i % spareParts.length].id,
        maintenanceRecordId: maintenanceRecords[i % maintenanceRecords.length].id,
        type: i % 5 === 0 ? 'RETURN' : 'ISSUE',
        quantity: randomInt(1, 4),
        usageDate: daysAgo(randomInt(1, 50)),
        createdById: ownFleetOp.id,
        updatedById: ownFleetOp.id,
      },
    });
  }

  const paymentModes = await prisma.paymentMode.findMany();

  console.log('Seeding demo Vehicle Expenses...');
  const vehicleExpenseCategories: VehicleExpenseCategory[] = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'PERMIT', 'MISCELLANEOUS'];
  for (let i = 0; i < 10; i++) {
    await prisma.vehicleExpense.create({
      data: {
        vehicleId: vehicles[i % vehicles.length].id,
        category: vehicleExpenseCategories[i % vehicleExpenseCategories.length],
        amount: randomInt(1000, 20000),
        expenseDate: daysAgo(randomInt(1, 60)),
        description: 'Demo vehicle expense',
        paymentModeId: randomFrom(paymentModes).id,
        createdById: fleetManagerUser.id,
        updatedById: fleetManagerUser.id,
      },
    });
  }

  // =========================================================
  // 4. OPERATIONS
  // =========================================================
  console.log('Seeding demo Intents...');
  const intentStatuses: IntentStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED', 'SUBMITTED', 'APPROVED'];
  const intents = [];
  for (let i = 0; i < 12; i++) {
    const company = companies[i % companies.length];
    const from = randomFrom(locations);
    let to = randomFrom(locations);
    while (to.id === from.id) to = randomFrom(locations);
    const status = intentStatuses[i];
    const intentNumber = `INT-DEMO-${String(i + 1).padStart(4, '0')}`;
    intents.push(
      await prisma.intent.upsert({
        where: { intentNumber },
        update: {},
        create: {
          intentNumber,
          companyId: company.id,
          fromLocationId: from.id,
          toLocationId: to.id,
          materialId: randomFrom(materials).id,
          vehicleTypeId: randomFrom(vehicleTypes).id,
          quantityTon: randomInt(5, 25),
          expectedPickupDate: daysAgo(randomInt(1, 20)),
          expectedDeliveryDate: daysAgo(randomInt(-10, 15)),
          freightAmount: randomInt(15000, 85000),
          status,
          rejectionReason: status === 'REJECTED' ? 'Rate not acceptable to customer' : undefined,
          approvedById: status === 'APPROVED' ? opsManager.id : undefined,
          approvedAt: status === 'APPROVED' ? daysAgo(randomInt(1, 18)) : undefined,
          createdById: intentCreator.id,
          updatedById: intentCreator.id,
        },
      })
    );
  }

  console.log('Seeding demo Trips...');
  const approvedIntents = intents.filter((i) => i.status === 'APPROVED');
  // 6 of every 8 demo trips land as COMPLETED so Accounts has enough
  // completed-trip data to bill against.
  const tripStatusCycle: TripStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'ASSIGNED', 'CANCELLED', 'COMPLETED'];
  const trips = [];
  let tIdx = 0;
  for (let i = 0; i < approvedIntents.length; i++) {
    const intent = approvedIntents[i];
    const numTripsForThisIntent = i === 0 ? 2 : 1; // demo a split-load intent
    for (let n = 0; n < numTripsForThisIntent; n++) {
      const status = tripStatusCycle[tIdx % tripStatusCycle.length];
      const vehicle = vehicles[tIdx % vehicles.length];
      const driver = drivers[tIdx % drivers.length];
      const isMarket = vehicle.ownership === 'MARKET';
      const tripNumber = `TRP-DEMO-${String(tIdx + 1).padStart(4, '0')}`;
      const scheduledStart = daysAgo(randomInt(3, 25));
      const trip = await prisma.trip.upsert({
        where: { tripNumber },
        update: {},
        create: {
          tripNumber,
          intentId: intent.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          supplierId: isMarket ? vehicle.supplierId ?? undefined : undefined,
          routeId: randomFrom(routes).id,
          fromLocationId: intent.fromLocationId,
          toLocationId: intent.toLocationId,
          freightAmount: intent.freightAmount ?? randomInt(15000, 85000),
          supplierRate: isMarket ? randomInt(10000, 70000) : undefined,
          loadWeight: intent.quantityTon ?? undefined,
          loadDescription: 'General cargo as per intent',
          status,
          scheduledStartDate: scheduledStart,
          actualStartDate: status === 'COMPLETED' ? scheduledStart : undefined,
          expectedDeliveryDate: intent.expectedDeliveryDate ?? daysFromNow(2),
          actualEndDate: status === 'COMPLETED' ? daysAgo(randomInt(0, 10)) : undefined,
          podRequired: true,
          podStatus: status === 'COMPLETED' ? 'VERIFIED' : 'PENDING',
          cancelReason: status === 'CANCELLED' ? 'Customer postponed shipment' : undefined,
          createdById: opsManager.id,
          updatedById: opsManager.id,
        },
      });
      trips.push(trip);

      await prisma.tripStatusHistory.create({
        data: { tripId: trip.id, status: 'DRAFT', notes: 'Trip created', changedAt: scheduledStart, createdById: opsManager.id },
      });
      await prisma.tripStatusHistory.create({
        data: { tripId: trip.id, status: 'ASSIGNED', notes: 'Vehicle & driver assigned', changedAt: scheduledStart, createdById: ownFleetOp.id },
      });
      if (status === 'COMPLETED') {
        await prisma.tripStatusHistory.create({
          data: { tripId: trip.id, status: 'STARTED', changedAt: scheduledStart, createdById: ownFleetOp.id },
        });
        await prisma.tripStatusHistory.create({
          data: { tripId: trip.id, status: 'COMPLETED', changedAt: trip.actualEndDate ?? new Date(), createdById: ownFleetOp.id },
        });
      }
      if (status === 'CANCELLED') {
        await prisma.tripStatusHistory.create({
          data: { tripId: trip.id, status: 'CANCELLED', notes: trip.cancelReason ?? undefined, changedAt: new Date(), createdById: opsManager.id },
        });
      }
      tIdx++;
    }
  }

  const completedTrips = trips.filter((t) => t.status === 'COMPLETED');

  console.log('Seeding demo Trip Documents (POD / LR Copy)...');
  for (const trip of completedTrips) {
    await prisma.attachment.create({
      data: {
        entityType: 'TRIP',
        entityId: trip.id,
        category: 'POD',
        filePath: '/uploads/documents/demo-pod-placeholder.pdf',
        status: 'VERIFIED',
        verifiedById: opsManager.id,
        verifiedAt: trip.actualEndDate ?? new Date(),
        uploadedById: ownFleetOp.id,
      },
    });
    await prisma.attachment.create({
      data: {
        entityType: 'TRIP',
        entityId: trip.id,
        category: 'LR_COPY',
        filePath: '/uploads/documents/demo-lr-placeholder.pdf',
        status: 'VERIFIED',
        uploadedById: ownFleetOp.id,
      },
    });
  }

  console.log('Seeding demo Trip Expenses...');
  const tripExpenseCategories: TripExpenseCategory[] = ['FUEL', 'DRIVER_BATA', 'TOLL', 'LOADING', 'UNLOADING', 'MISCELLANEOUS'];
  for (let i = 0; i < 10; i++) {
    const trip = trips[i % trips.length];
    await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        category: tripExpenseCategories[i % tripExpenseCategories.length],
        amount: randomInt(500, 8000),
        expenseDate: trip.scheduledStartDate ?? daysAgo(5),
        description: 'Demo trip expense entry',
        createdById: ownFleetOp.id,
        updatedById: ownFleetOp.id,
      },
    });
  }

  // =========================================================
  // 5. ACCOUNTS
  // =========================================================
  console.log('Seeding demo Invoices (one per completed trip)...');
  const gstMasters = await prisma.gstMaster.findMany();
  const invoices = [];
  let invIdx = 1;
  for (const trip of completedTrips) {
    const intent = intents.find((i) => i.id === trip.intentId)!;
    const subtotal = Number(trip.freightAmount ?? 0);
    const gst = randomFrom(gstMasters);
    const taxAmount = Number(((subtotal * Number(gst.ratePercent)) / 100).toFixed(2));
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = `INV-DEMO-${String(invIdx).padStart(4, '0')}`;
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber },
      update: {},
      create: {
        invoiceNumber,
        companyId: intent.companyId,
        gstMasterId: gst.id,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        outstandingAmount: totalAmount,
        status: 'GENERATED',
        dueDate: daysFromNow(21),
        createdById: accountsExec.id,
        updatedById: accountsExec.id,
      },
    });
    await prisma.trip.update({ where: { id: trip.id }, data: { invoiceId: invoice.id } });
    invoices.push(invoice);
    invIdx++;
  }

  console.log('Seeding demo Credit Notes...');
  for (let i = 0; i < Math.min(5, invoices.length); i++) {
    const inv = invoices[i];
    const cnNumber = `CN-DEMO-${String(i + 1).padStart(3, '0')}`;
    await prisma.creditNote.upsert({
      where: { creditNoteNumber: cnNumber },
      update: {},
      create: {
        creditNoteNumber: cnNumber,
        invoiceId: inv.id,
        amount: randomInt(500, 3000),
        reason: 'Rate adjustment as per customer negotiation',
        createdById: accountsManager.id,
        updatedById: accountsManager.id,
      },
    });
  }

  console.log('Seeding demo Receipts (partial payments + advances)...');
  let recIdx = 1;
  for (const inv of invoices) {
    const amount = Math.round(Number(inv.totalAmount) * 0.6);
    const receiptNumber = `RCT-DEMO-${String(recIdx).padStart(4, '0')}`;
    await prisma.receipt.upsert({
      where: { receiptNumber },
      update: {},
      create: {
        receiptNumber,
        companyId: inv.companyId,
        invoiceId: inv.id,
        amount,
        receiptDate: daysAgo(randomInt(1, 15)),
        paymentModeId: randomFrom(paymentModes).id,
        isAdvance: false,
        createdById: accountsExec.id,
        updatedById: accountsExec.id,
      },
    });
    const newOutstanding = Number(inv.totalAmount) - amount;
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { paidAmount: amount, outstandingAmount: newOutstanding, status: newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID' },
    });
    recIdx++;
  }
  for (let i = 0; i < 2; i++) {
    const receiptNumber = `RCT-DEMO-ADV-${String(i + 1).padStart(2, '0')}`;
    await prisma.receipt.upsert({
      where: { receiptNumber },
      update: {},
      create: {
        receiptNumber,
        companyId: companies[i].id,
        amount: randomInt(10000, 30000),
        receiptDate: daysAgo(randomInt(1, 10)),
        paymentModeId: randomFrom(paymentModes).id,
        isAdvance: true,
        createdById: accountsExec.id,
        updatedById: accountsExec.id,
      },
    });
  }

  console.log('Seeding demo Supplier Payments...');
  const marketCompletedTrips = completedTrips.filter((t) => t.supplierId);
  let payIdx = 1;
  for (const trip of marketCompletedTrips) {
    const paymentNumber = `SPY-DEMO-${String(payIdx).padStart(4, '0')}`;
    await prisma.supplierPayment.upsert({
      where: { paymentNumber },
      update: {},
      create: {
        paymentNumber,
        supplierId: trip.supplierId!,
        tripId: trip.id,
        amount: Number(trip.supplierRate ?? 0),
        paymentDate: daysAgo(randomInt(1, 12)),
        paymentModeId: randomFrom(paymentModes).id,
        isAdvance: false,
        createdById: accountsExec.id,
        updatedById: accountsExec.id,
      },
    });
    payIdx++;
  }
  for (let i = 0; i < Math.max(0, 6 - marketCompletedTrips.length); i++) {
    const paymentNumber = `SPY-DEMO-ADV-${String(i + 1).padStart(2, '0')}`;
    await prisma.supplierPayment.upsert({
      where: { paymentNumber },
      update: {},
      create: {
        paymentNumber,
        supplierId: suppliers[i % suppliers.length].id,
        amount: randomInt(5000, 20000),
        paymentDate: daysAgo(randomInt(1, 20)),
        paymentModeId: randomFrom(paymentModes).id,
        isAdvance: true,
        createdById: accountsExec.id,
        updatedById: accountsExec.id,
      },
    });
  }

  // =========================================================
  // 6. Audit / Activity logs
  // =========================================================
  console.log('Seeding demo Audit Logs and Activity Logs...');
  const auditActors = [adminUser, opsManager, accountsExec, ownFleetOp];
  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ROLE_CHANGE'];
  const auditEntities = ['Trip', 'Invoice', 'Vehicle', 'User'];
  for (let i = 0; i < 8; i++) {
    await prisma.auditLog.create({
      data: {
        userId: auditActors[i % auditActors.length].id,
        action: auditActions[i % auditActions.length],
        entityType: auditEntities[i % auditEntities.length],
        description: 'Demo audit log entry for sample data',
        createdAt: daysAgo(randomInt(1, 30)),
      },
    });
  }
  // ActivityLog removed in the Phase 14 architecture optimization pass —
  // AuditLog above already covers "recent activity" (see
  // audit.service.ts's recentActivity() helper).

  console.log('');
  console.log('Demo data seeding complete.');
  console.log(`  Companies: ${companies.length}, Vehicles: ${vehicles.length}, Drivers: ${drivers.length}`);
  console.log(`  Intents: ${intents.length}, Trips: ${trips.length} (${completedTrips.length} completed)`);
  console.log(`  Invoices: ${invoices.length}`);
  console.log('Demo login credentials (password for all: Demo@123):');
  console.log('  rahul.intent (Intent Creator), suresh.ops (Operation Manager)');
  console.log('  vijay.fleet (Own Fleet Operator), arjun.market (Market Fleet Operator)');
  console.log('  priya.accounts (Accounts Executive), lakshmi.finance (Accounting Manager)');
  console.log('  karthik.fleetmgr (Fleet Manager)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
