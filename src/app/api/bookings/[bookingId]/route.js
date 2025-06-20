import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    // FIX: Await params in Next.js 15
    const { bookingId } = await params;
    
    console.log('Fetching booking with ID:', bookingId);
    
    // Validate bookingId
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // FIX: Ensure all required fields are present
    const bookingData = {
      ...booking.toObject(),
      // Ensure customer data exists
      customerId: booking.customerId || {
        name: 'Unknown Customer',
        phone: 'N/A',
        driverLicense: 'N/A'
      },
      // Ensure vehicle data exists
      vehicleId: booking.vehicleId || {
        type: 'Unknown',
        model: 'Unknown Vehicle',
        plateNumber: 'N/A'
      }
    };
    
    console.log('Booking found:', booking.bookingId);
    return NextResponse.json({ 
      success: true, 
      booking: bookingData 
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}