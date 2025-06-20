import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const completedBookings = await Booking.find({
      status: 'completed',
      endTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate('vehicleId');

    // Initialize hourly revenue array
    const hourlyRevenue = Array(24).fill().map((_, hour) => ({
      hour,
      revenue: 0,
      bookings: 0,
      bikes: 0,
      scooters: 0
    }));

    // Aggregate data by hour
    completedBookings.forEach(booking => {
      if (booking.endTime && booking.finalAmount) {
        const hour = new Date(booking.endTime).getHours();
        hourlyRevenue[hour].revenue += booking.finalAmount;
        hourlyRevenue[hour].bookings += 1;
        
        if (booking.vehicleId?.type === 'bike') {
          hourlyRevenue[hour].bikes += 1;
        } else if (booking.vehicleId?.type === 'scooter') {
          hourlyRevenue[hour].scooters += 1;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        date,
        hourlyRevenue,
        totalDayRevenue: hourlyRevenue.reduce((sum, h) => sum + h.revenue, 0),
        totalDayBookings: hourlyRevenue.reduce((sum, h) => sum + h.bookings, 0)
      }
    });

  } catch (error) {
    console.error('Hourly revenue API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}