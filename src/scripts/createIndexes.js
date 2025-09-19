// Create this file: src/scripts/createIndexes.js
// Run: node src/scripts/createIndexes.js

const connectDB = require('../lib/db').default;
const mongoose = require('mongoose');

async function createIndexes() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    console.log('🔧 Creating database indexes...');
    
    // Bookings collection indexes
    await db.collection('bookings').createIndexes([
      // Most important - for sorting by creation date
      { key: { createdAt: -1 }, background: true },
      { key: { startTime: -1 }, background: true },
      { key: { endTime: -1 }, background: true },
      
      // For status queries
      { key: { status: 1, createdAt: -1 }, background: true },
      
      // For customer queries
      { key: { customerId: 1, createdAt: -1 }, background: true },
      
      // For vehicle queries  
      { key: { vehicleId: 1, createdAt: -1 }, background: true },
      
      // For booking ID lookups
      { key: { bookingId: 1 }, unique: true, background: true }
    ]);
    
    // Customers collection indexes
    await db.collection('customers').createIndexes([
      // For search functionality
      { key: { name: 'text', phone: 'text' }, background: true },
      
      // For license lookups
      { key: { driverLicense: 1 }, unique: true, background: true },
      
      // For phone lookups
      { key: { phone: 1 }, background: true },
      
      // For sorting by visits
      { key: { lastVisit: -1 }, background: true },
      { key: { totalBookings: -1 }, background: true }
    ]);
    
    // Vehicles collection indexes
    await db.collection('vehicles').createIndexes([
      { key: { status: 1 }, background: true },
      { key: { plateNumber: 1 }, unique: true, background: true },
      { key: { type: 1, status: 1 }, background: true }
    ]);
    
    console.log('✅ Database indexes created successfully');
    
    // Show existing indexes
    const bookingIndexes = await db.collection('bookings').indexes();
    console.log('📋 Booking indexes:', bookingIndexes.map(idx => idx.key));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();