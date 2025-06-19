import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    // Get last 10 bookings (both active and completed)
    const recentBookings = await Booking.find({})
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Format the data for the dashboard
    const formattedBookings = recentBookings.map(booking => {
      // Calculate current amount for active bookings
      let currentAmount = booking.finalAmount;
      if (booking.status === 'active' && !currentAmount) {
        const duration = Math.ceil((new Date() - new Date(booking.startTime)) / (1000 * 60 * 60));
        currentAmount = duration * 80;
      }
      
      return {
        id: booking._id,
        bookingId: booking.bookingId,
        customer: booking.customerId?.name || 'Unknown',
        phone: booking.customerId?.phone || '',
        vehicle: `${booking.vehicleId?.model || 'Unknown'} (${booking.vehicleId?.plateNumber || 'N/A'})`,
        vehicleType: booking.vehicleId?.type || 'unknown',
        status: booking.status,
        amount: currentAmount || 0,
        startTime: booking.startTime,
        endTime: booking.endTime,
        createdAt: booking.createdAt
      };
    });
    
    return NextResponse.json({
      success: true,
      bookings: formattedBookings
    });
  } catch (error) {
    console.error('Recent bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}