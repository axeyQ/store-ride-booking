import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    
    // Get all bookings for this customer
    const bookings = await Booking.find({ customerId })
      .populate('vehicleId', 'type model plateNumber')
      .sort({ createdAt: -1 }); // Most recent first
    
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Customer bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}