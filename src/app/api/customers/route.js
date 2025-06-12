// src/app/api/customers/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';

// GET /api/customers - Get all unique customers from bookings
export async function GET(request) {
  try {
    await connectDB();
    
    const bookings = await Booking.find().select('customerDetails').lean();
    
    // Create unique customers map
    const customersMap = new Map();
    
    bookings.forEach(booking => {
      const mobile = booking.customerDetails.mobile;
      if (!customersMap.has(mobile)) {
        customersMap.set(mobile, {
          _id: booking._id, // Use booking ID as customer ID for now
          name: booking.customerDetails.name,
          mobile: booking.customerDetails.mobile,
          dlNumber: booking.customerDetails.dlNumber,
          aadhaarNumber: booking.customerDetails.aadhaarNumber
        });
      }
    });
    
    const customers = Array.from(customersMap.values());
    
    return NextResponse.json({
      success: true,
      data: customers
    });
    
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}