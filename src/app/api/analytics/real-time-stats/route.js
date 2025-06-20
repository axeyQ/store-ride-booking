import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    // Parallel data fetching for maximum performance
    const [
      todayBookings,
      yesterdayBookings,
      activeBookings,
      allVehicles,
      todayCompletedBookings,
      yesterdayCompletedBookings
    ] = await Promise.all([
      Booking.find({
        createdAt: { $gte: todayStart, $lt: todayEnd }
      }).populate('customerId vehicleId'),
      
      Booking.find({
        createdAt: { $gte: yesterdayStart, $lt: todayStart }
      }),
      
      Booking.find({ status: 'active' })
        .populate('customerId vehicleId'),
      
      Vehicle.find({}),
      
      Booking.find({
        status: 'completed',
        createdAt: { $gte: todayStart, $lt: todayEnd }
      }),
      
      Booking.find({
        status: 'completed',
        createdAt: { $gte: yesterdayStart, $lt: todayStart }
      })
    ]);

    // Calculate revenues
    const todayRevenue = todayCompletedBookings.reduce((sum, booking) => {
      return sum + (booking.finalAmount || 0);
    }, 0);

    const yesterdayRevenue = yesterdayCompletedBookings.reduce((sum, booking) => {
      return sum + (booking.finalAmount || 0);
    }, 0);

    // Calculate fleet stats
    const totalVehicles = allVehicles.length;
    const rentedVehicles = allVehicles.filter(v => v.status === 'rented').length;
    const availableVehicles = allVehicles.filter(v => v.status === 'available').length;
    const maintenanceVehicles = allVehicles.filter(v => v.status === 'maintenance').length;

    // Generate recent activity feed
    const recentActivity = todayBookings
      .slice(-5)
      .map(booking => ({
        id: booking._id,
        type: 'booking',
        message: `${booking.customerId?.name || 'Customer'} rented ${booking.vehicleId?.model || 'vehicle'}`,
        time: booking.createdAt,
        status: booking.status
      }));

    return NextResponse.json({
      success: true,
      data: {
        // Main KPIs
        todayRevenue,
        yesterdayRevenue,
        todayBookings: todayBookings.length,
        yesterdayBookings: yesterdayBookings.length,
        activeBookings: activeBookings.length,
        
        // Fleet metrics
        totalVehicles,
        availableVehicles,
        rentedVehicles,
        maintenanceVehicles,
        
        // Activity feed
        recentActivity,
        
        // Timestamp
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Real-time stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}