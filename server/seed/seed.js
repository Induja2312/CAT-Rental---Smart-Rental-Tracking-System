require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Site = require('../models/Site');
const Equipment = require('../models/Equipment');
const Rental = require('../models/Rental');
const Telemetry = require('../models/Telemetry');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected — wiping collections...');

  await Promise.all([User.deleteMany(), Site.deleteMany(), Equipment.deleteMany(), Rental.deleteMany(), Telemetry.deleteMany()]);

  // Tamil Nadu Sites
  const sites = await Site.insertMany([
    { name: 'Chennai Port Hub (S001)',   location: { lat: 13.0827, lng: 80.2707 } },
    { name: 'Coimbatore Mining (S002)', location: { lat: 11.0168, lng: 76.9558 } },
    { name: 'Madurai Infra (S003)',    location: { lat: 9.9252,  lng: 78.1198 } },
    { name: 'Trichy Industrial (S004)', location: { lat: 10.7905, lng: 78.7047 } },
    { name: 'Salem Steel Zone (S006)',  location: { lat: 11.6643, lng: 78.1460 } },
  ]);

  const passwordHash = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'Tamil Nadu Fleet Operations Admin',
    email: 'admin@catrentals.com',
    passwordHash,
    role: 'admin',
    assignedSites: sites.map((s) => s._id),
  });

  const managerHash = await bcrypt.hash('manager123', 10);
  await User.create({
    name: 'Tamil Nadu Site Fleet Manager',
    email: 'manager@catrentals.com',
    passwordHash: managerHash,
    role: 'manager',
    assignedSites: [sites[0]._id, sites[1]._id, sites[2]._id],
  });

  await User.create({
    name: 'Rajeswari (North Zone Manager)',
    email: 'rajeswari@catrentals.com',
    passwordHash: managerHash,
    role: 'manager',
    assignedSites: [sites[0]._id, sites[1]._id],
  });

  await User.create({
    name: 'Karthik (South & Central Manager)',
    email: 'karthik@catrentals.com',
    passwordHash: managerHash,
    role: 'manager',
    assignedSites: [sites[2]._id, sites[3]._id, sites[4]._id],
  });

  // Batch 1: Site-Assigned Fleet (EQX1001 – EQX1007)
  const equipmentBatch1 = await Equipment.insertMany([
    { equipmentId: 'EQX1001', type: 'Excavator',  siteId: sites[2]._id, status: 'active',     currentLocation: { lat: 9.9280,  lng: 78.1220 } },
    { equipmentId: 'EQX1002', type: 'Crane',      siteId: null,         status: 'idle',       currentLocation: { lat: 13.0850, lng: 80.2730 } },
    { equipmentId: 'EQX1003', type: 'Bulldozer',  siteId: sites[1]._id, status: 'active',     currentLocation: { lat: 11.0190, lng: 76.9580 } },
    { equipmentId: 'EQX1004', type: 'Excavator',  siteId: sites[3]._id, status: 'overdue',    currentLocation: { lat: 10.7930, lng: 78.7070 } },
    { equipmentId: 'EQX1005', type: 'Bulldozer',  siteId: sites[4]._id, status: 'active',     currentLocation: { lat: 11.6670, lng: 78.1490 } },
    { equipmentId: 'EQX1006', type: 'Grader',     siteId: sites[0]._id, status: 'idle',       currentLocation: { lat: 13.0800, lng: 80.2680 } },
    { equipmentId: 'EQX1007', type: 'Excavator',  siteId: null,         status: 'unassigned', currentLocation: { lat: 10.7900, lng: 78.7010 } },
  ]);

  // Batch 2: Customer-Rented Fleet (EQX2001 – EQX2007)
  const equipmentBatch2 = await Equipment.insertMany([
    { equipmentId: 'EQX2001', type: 'Excavator',  siteId: sites[0]._id, status: 'active',     currentLocation: { lat: 13.0840, lng: 80.2720 } },
    { equipmentId: 'EQX2002', type: 'Bulldozer',  siteId: sites[0]._id, status: 'idle',       currentLocation: { lat: 13.0810, lng: 80.2690 } },
    { equipmentId: 'EQX2003', type: 'Crane',      siteId: sites[1]._id, status: 'active',     currentLocation: { lat: 11.0180, lng: 76.9570 } },
    { equipmentId: 'EQX2004', type: 'Loader',     siteId: sites[1]._id, status: 'overdue',    currentLocation: { lat: 11.0200, lng: 76.9600 } },
    { equipmentId: 'EQX2005', type: 'Grader',     siteId: sites[2]._id, status: 'idle',       currentLocation: { lat: 9.9260,  lng: 78.1210 } },
    { equipmentId: 'EQX2006', type: 'Compactor',  siteId: sites[2]._id, status: 'active',     currentLocation: { lat: 9.9240,  lng: 78.1180 } },
    { equipmentId: 'EQX2007', type: 'Dump Truck', siteId: null,         status: 'unassigned', currentLocation: { lat: 10.7910, lng: 78.7030 } },
  ]);

  const allEquipment = [...equipmentBatch1, ...equipmentBatch2];

  const customerHash = await bcrypt.hash('customer123', 10);
  const customerInduja = await User.create({
    name: 'Induja',
    email: 'indujaee@gmail.com',
    passwordHash: customerHash,
    role: 'customer',
  });
  const customerTest = await User.create({
    name: 'Test Customer',
    email: 'customer@catrentals.com',
    passwordHash: customerHash,
    role: 'customer',
  });

  const operatorHash = await bcrypt.hash('operator123', 10);
  await User.create({
    name: 'John Heavy Operator',
    email: 'operator1@catrentals.com',
    passwordHash: operatorHash,
    role: 'operator',
  });

  const now = new Date();
  await Rental.insertMany([
    {
      equipmentId: equipmentBatch2[0]._id, // EQX2001 (customer fleet)
      customerId: customerInduja._id,
      checkInDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      checkOutDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'ongoing'
    },
    {
      equipmentId: equipmentBatch2[1]._id, // EQX2002 (customer fleet)
      customerId: customerInduja._id,
      checkInDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      checkOutDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'ongoing'
    },
    {
      equipmentId: equipmentBatch1[0]._id, // EQX1001 (site fleet)
      customerId: customerInduja._id,
      checkInDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      checkOutDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      status: 'ongoing'
    },
    {
      equipmentId: equipmentBatch2[0]._id, // EQX2001 for customerTest
      customerId: customerTest._id,
      checkInDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      checkOutDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: 'ongoing'
    },
  ]);

  // Bulk-insert 7 days of backdated historical Telemetry for ALL 14 equipment items
  const backdatedTelemetry = [];
  const msPerDay = 86_400_000;

  allEquipment.forEach((eq, index) => {
    for (let day = 7; day >= 1; day--) {
      for (const hourOffset of [9, 17]) {
        const timestamp = new Date(now.getTime() - day * msPerDay + hourOffset * 3600 * 1000);
        const baseEngine = (7 - day) * 1.1 + (index % 3) * 0.8 + 1.5;
        const idleHours = 0.5 + (index % 2) * 0.5;

        backdatedTelemetry.push({
          equipmentId: eq._id,
          location: eq.currentLocation || { lat: 10.79, lng: 78.70 },
          engineHoursToday: +baseEngine.toFixed(2),
          idleHoursToday: +idleHours.toFixed(2),
          fuelLevel: Math.max(15, 95 - day * 4),
          engineTemperature: 72 + (index % 3) * 4,
          timestamp,
        });
      }
    }
  });

  await Telemetry.insertMany(backdatedTelemetry);

  console.log(`Seed complete: Admin, Managers, Customers, Sites, 14 Equipment assets & ${backdatedTelemetry.length} backdated telemetry records.`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
