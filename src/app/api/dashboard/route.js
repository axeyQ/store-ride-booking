// src/app/api/dashboard/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request) {
  try {
    await connectDB();
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    // Get various statistics
    const [
      totalBookings,
      activeBookings,
      todayBookings,
      totalVehicles,
      availableVehicles,
      todayRevenue
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ 'booking.status': 'active' }),
      Booking.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'available' }),
      Booking.aggregate([
        {
          $match: {
            'booking.status': 'completed',
            'booking.paymentStatus': 'paid',
            updatedAt: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$booking.totalAmount' }
          }
        }
      ])
    ]);
    
    // Get recent bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerDetails vehicleDetails booking createdAt');
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalBookings,
          activeBookings,
          todayBookings,
          totalVehicles,
          availableVehicles,
          todayRevenue: todayRevenue[0]?.total || 0
        },
        recentBookings
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}