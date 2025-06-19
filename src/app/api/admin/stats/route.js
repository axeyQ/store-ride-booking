import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Current month boundaries
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Today's stats
    const todayBookings = await Booking.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const todayRevenue = todayBookings.reduce((sum, booking) => {
      return sum + (booking.finalAmount || 0);
    }, 0);
    
    const activeBookings = await Booking.countDocuments({ status: 'active' });
    
    // Vehicle utilization (this month)
    const monthlyBookings = await Booking.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['completed', 'active'] }
    }).populate('vehicleId', 'model type plateNumber');
    
    // Group by vehicle and calculate total hours
    const vehicleStats = {};
    monthlyBookings.forEach(booking => {
      if (booking.vehicleId) {
        const vehicleKey = `${booking.vehicleId.model}`;
        if (!vehicleStats[vehicleKey]) {
          vehicleStats[vehicleKey] = {
            name: vehicleKey,
            hours: 0,
            revenue: 0,
            type: booking.vehicleId.type
          };
        }
        
        const hours = booking.actualDuration || 
          (booking.status === 'active' ? 
            Math.ceil((new Date() - new Date(booking.startTime)) / (1000 * 60 * 60)) : 0);
        const revenue = booking.finalAmount || (hours * 80);
        
        vehicleStats[vehicleKey].hours += hours;
        vehicleStats[vehicleKey].revenue += revenue;
      }
    });
    
    const vehicleUtilization = Object.values(vehicleStats)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8); // Top 8 vehicles
    
    // Monthly stats
    const monthlyCompletedBookings = await Booking.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: 'completed'
    });
    
    const totalMonthlyRevenue = monthlyCompletedBookings.reduce((sum, booking) => {
      return sum + (booking.finalAmount || 0);
    }, 0);
    
    const avgPerBooking = monthlyCompletedBookings.length > 0 ? 
      Math.round(totalMonthlyRevenue / monthlyCompletedBookings.length) : 0;
    
    // Find top vehicle this month
    const topVehicle = vehicleUtilization.length > 0 ? vehicleUtilization[0].name : 'N/A';
    
    return NextResponse.json({
      success: true,
      todayStats: {
        revenue: todayRevenue,
        bookings: todayBookings.length,
        activeRentals: activeBookings,
        vehiclesOut: activeBookings
      },
      vehicleUtilization,
      monthlyStats: {
        totalRevenue: totalMonthlyRevenue,
        totalBookings: monthlyCompletedBookings.length,
        avgPerBooking,
        topVehicle
      }
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}