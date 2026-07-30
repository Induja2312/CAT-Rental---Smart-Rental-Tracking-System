const mongoose = require('mongoose');
const seedData = require('../seed/seedRunner');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await seedData();
  } catch (err) {
    console.log(`Local MongoDB not found (${err.message}). Starting MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`InMemory MongoDB connected: ${conn.connection.host}`);
      await seedData();
    } catch (memErr) {
      console.error(`Failed to start memory database: ${memErr.message}`);
    }
  }
};

module.exports = connectDB;


