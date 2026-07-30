const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Site = require('../models/Site');
const Equipment = require('../models/Equipment');

const seedData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already populated.');
      return;
    }

    console.log('Seeding initial database data...');
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

    await Equipment.insertMany([
      { equipmentId: 'EQX1001', type: 'Excavator',    siteId: sites[0]._id, status: 'active',      currentLocation: { lat: 37.775, lng: -122.419 } },
      { equipmentId: 'EQX1002', type: 'Bulldozer',    siteId: sites[0]._id, status: 'idle',        currentLocation: { lat: 37.776, lng: -122.420 } },
      { equipmentId: 'EQX1003', type: 'Crane',        siteId: sites[1]._id, status: 'active',      currentLocation: { lat: 34.052, lng: -118.243 } },
      { equipmentId: 'EQX1004', type: 'Loader',       siteId: sites[1]._id, status: 'overdue',     currentLocation: { lat: 34.053, lng: -118.244 } },
      { equipmentId: 'EQX1005', type: 'Grader',       siteId: sites[2]._id, status: 'idle',        currentLocation: { lat: 41.878, lng: -87.629  } },
      { equipmentId: 'EQX1006', type: 'Compactor',    siteId: sites[2]._id, status: 'active',      currentLocation: { lat: 41.879, lng: -87.630  } },
      { equipmentId: 'EQX1007', type: 'Dump Truck',   siteId: null,         status: 'unassigned',  currentLocation: { lat: 0,      lng: 0         } },
    ]);

    console.log('Seed complete: Admin created (admin@catrental.com / admin123)');
  } catch (err) {
    console.error('Error seeding initial data:', err.message);
  }
};

module.exports = seedData;
