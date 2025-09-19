// Create this file: src/app/api/admin/create-indexes/route.js
// Then visit: http://localhost:3000/api/admin/create-indexes

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    console.log('🔧 Creating database indexes...');
    
    // Bookings collection indexes
    const bookingIndexes = await db.collection('bookings').createIndexes([
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
    const customerIndexes = await db.collection('customers').createIndexes([
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
    const vehicleIndexes = await db.collection('vehicles').createIndexes([
      { key: { status: 1 }, background: true },
      { key: { plateNumber: 1 }, unique: true, background: true },
      { key: { type: 1, status: 1 }, background: true }
    ]);
    
    console.log('✅ Database indexes created successfully');
    
    // Get existing indexes to verify
    const existingBookingIndexes = await db.collection('bookings').indexes();
    const existingCustomerIndexes = await db.collection('customers').indexes();
    const existingVehicleIndexes = await db.collection('vehicles').indexes();
    
    return NextResponse.json({
      success: true,
      message: 'Database indexes created successfully',
      details: {
        bookings: {
          created: bookingIndexes,
          existing: existingBookingIndexes.map(idx => idx.key)
        },
        customers: {
          created: customerIndexes,
          existing: existingCustomerIndexes.map(idx => idx.key)
        },
        vehicles: {
          created: vehicleIndexes,
          existing: existingVehicleIndexes.map(idx => idx.key)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create indexes',
        details: error.message
      },
      { status: 500 }
    );
  }
}