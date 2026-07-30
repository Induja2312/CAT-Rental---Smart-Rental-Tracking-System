require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Site = require('../models/Site');
const Equipment = require('../models/Equipment');
const Rental = require('../models/Rental');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected — wiping collections...');

  await Promise.all([User.deleteMany(), Site.deleteMany(), Equipment.deleteMany(), Rental.deleteMany()]);

  const sites = await Site.insertMany([
    { name: 'Site Alpha',   location: { lat: 37.7749, lng: -122.4194 } },
    { name: 'Site Beta',    location: { lat: 34.0522, lng: -118.2437 } },
    { name: 'Site Gamma',   location: { lat: 41.8781, lng: -87.6298  } },
  ]);

  const passwordHash = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'Admin User',
    email: 'admin@catrental.com',
    passwordHash,
    role: 'admin',
    assignedSites: sites.map(s => s._id),
  });

  const customerHash = await bcrypt.hash('customer123', 10);
  const customer = await User.create({
    name: 'Test Customer',
    email: 'customer@catrental.com',
    passwordHash: customerHash,
    role: 'customer',
  });

  const equipment = await Equipment.insertMany([
    { equipmentId: 'EQX1001', type: 'Excavator',    siteId: sites[0]._id, status: 'active',      currentLocation: { lat: 37.775, lng: -122.419 } },
    { equipmentId: 'EQX1002', type: 'Bulldozer',    siteId: sites[0]._id, status: 'idle',        currentLocation: { lat: 37.776, lng: -122.420 } },
    { equipmentId: 'EQX1003', type: 'Crane',        siteId: sites[1]._id, status: 'active',      currentLocation: { lat: 34.052, lng: -118.243 } },
    { equipmentId: 'EQX1004', type: 'Loader',       siteId: sites[1]._id, status: 'overdue',     currentLocation: { lat: 34.053, lng: -118.244 } },
    { equipmentId: 'EQX1005', type: 'Grader',       siteId: sites[2]._id, status: 'idle',        currentLocation: { lat: 41.878, lng: -87.629  } },
    { equipmentId: 'EQX1006', type: 'Compactor',    siteId: sites[2]._id, status: 'active',      currentLocation: { lat: 41.879, lng: -87.630  } },
    { equipmentId: 'EQX1007', type: 'Dump Truck',   siteId: null,         status: 'unassigned',  currentLocation: { lat: 0,      lng: 0         } },
  ]);

  const now = new Date();
  await Rental.insertMany([
    {
      equipmentId: equipment[0]._id,
      customerId: customer._id,
      checkInDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      checkOutDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      status: 'ongoing'
    },
    {
      equipmentId: equipment[1]._id,
      customerId: customer._id,
      checkInDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      checkOutDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: 'ongoing'
    }
  ]);

  console.log('Seed complete: 1 admin, 1 customer, 3 sites, 7 equipment, 2 rentals');
  console.log('Admin Login: admin@catrental.com / admin123');
  console.log('Customer Login: customer@catrental.com / customer123');
  await mongoose.disconnect();
};

seed().catch(err => { console.error(err); process.exit(1); });
