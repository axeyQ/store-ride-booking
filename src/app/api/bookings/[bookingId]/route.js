// src/app/api/bookings/[bookingId]/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { bookingId } = params;
    
    console.log('Fetching booking with ID:', bookingId);
    
    const booking = await Booking.findOne({ bookingId })
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone driverLicense');
    
    if (!booking) {
      console.log('Booking not found:', bookingId);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    console.log('Booking found:', booking.bookingId);
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}