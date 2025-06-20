// src/app/api/admin/recent-bookings/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;

    // Fetch recent bookings with populated customer and vehicle data
    const recentBookings = await Booking.find({})
      .populate('customerId', 'name phone driverLicense')
      .populate('vehicleId', 'type model plateNumber')
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limit)
      .lean();

    // Calculate current amount for active bookings
    const bookingsWithAmount = recentBookings.map(booking => {
      let displayAmount = 0;
      
      if (booking.status === 'completed' && booking.finalAmount) {
        // Use final amount for completed bookings
        displayAmount = booking.finalAmount;
      } else if (booking.status === 'active') {
        // Calculate current amount for active bookings
        const startTime = new Date(booking.startTime);
        const currentTime = new Date();
        const diffMs = currentTime - startTime;
        const hours = Math.ceil(diffMs / (1000 * 60 * 60));
        displayAmount = hours * 80; // ₹80 per hour
      }

      return {
        ...booking,
        displayAmount,
        customerName: booking.customerId?.name || 'Unknown Customer',
        customerPhone: booking.customerId?.phone || 'N/A',
        vehicleInfo: booking.vehicleId ? 
          `${booking.vehicleId.model} (${booking.vehicleId.plateNumber})` : 
          'Unknown Vehicle',
        vehicleModel: booking.vehicleId?.model || 'Unknown',
        vehiclePlate: booking.vehicleId?.plateNumber || 'N/A',
        formattedDate: booking.startTime ? new Date(booking.startTime).toLocaleDateString('en-IN') : 'N/A'
      };
    });

    return NextResponse.json({
      success: true,
      bookings: bookingsWithAmount,
      total: bookingsWithAmount.length
    });

  } catch (error) {
    console.error('Recent bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}