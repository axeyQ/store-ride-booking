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
    
    // Yesterday boundaries
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Current month boundaries
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Get all bookings for analysis
    const [todayBookings, yesterdayBookings, monthlyBookings, activeBookings] = await Promise.all([
      Booking.find({
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Booking.find({
        createdAt: { $gte: yesterday, $lt: today }
      }),
      Booking.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        status: { $in: ['completed', 'active'] }
      }).populate('vehicleId', 'model type plateNumber'),
      Booking.countDocuments({ status: 'active' })
    ]);
    
    // Calculate today's revenue with booking type breakdown
    let todayRevenue = 0;
    let todayAdvancedRevenue = 0;
    let todayCustomRevenue = 0;
    let todayAdvancedCount = 0;
    let todayCustomCount = 0;
    
    todayBookings.forEach(booking => {
      const amount = booking.finalAmount || 0;
      todayRevenue += amount;
      
      if (booking.isCustomBooking) {
        todayCustomRevenue += amount;
        todayCustomCount++;
      } else {
        todayAdvancedRevenue += amount;
        todayAdvancedCount++;
      }
    });
    
    // Calculate yesterday's revenue with booking type breakdown
    let yesterdayRevenue = 0;
    let yesterdayAdvancedRevenue = 0;
    let yesterdayCustomRevenue = 0;
    let yesterdayAdvancedCount = 0;
    let yesterdayCustomCount = 0;
    
    yesterdayBookings.forEach(booking => {
      const amount = booking.finalAmount || 0;
      yesterdayRevenue += amount;
      
      if (booking.isCustomBooking) {
        yesterdayCustomRevenue += amount;
        yesterdayCustomCount++;
      } else {
        yesterdayAdvancedRevenue += amount;
        yesterdayAdvancedCount++;
      }
    });
    
    // Vehicle utilization (this month)
    const vehicleStats = {};
    let monthlyRevenue = 0;
    let monthlyAdvancedRevenue = 0;
    let monthlyCustomRevenue = 0;
    let topVehicle = '';
    let maxBookings = 0;
    
    monthlyBookings.forEach(booking => {
      const amount = booking.finalAmount || 0;
      monthlyRevenue += amount;
      
      if (booking.isCustomBooking) {
        monthlyCustomRevenue += amount;
      } else {
        monthlyAdvancedRevenue += amount;
      }
      
      if (booking.vehicleId) {
        const vehicleKey = `${booking.vehicleId.model}`;
        if (!vehicleStats[vehicleKey]) {
          vehicleStats[vehicleKey] = {
            name: vehicleKey,
            hours: 0,
            revenue: 0,
            bookings: 0,
            type: booking.vehicleId.type
          };
        }
        
        const hours = booking.actualDuration || 
          (booking.status === 'active' ? 
            Math.ceil((new Date() - new Date(booking.startTime)) / (1000 * 60 * 60)) : 
            2);
        
        vehicleStats[vehicleKey].hours += hours;
        vehicleStats[vehicleKey].revenue += amount;
        vehicleStats[vehicleKey].bookings++;
        
        if (vehicleStats[vehicleKey].bookings > maxBookings) {
          maxBookings = vehicleStats[vehicleKey].bookings;
          topVehicle = vehicleKey;
        }
      }
    });
    
    const vehicleUtilization = Object.values(vehicleStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Calculate monthly averages
    const avgPerBooking = monthlyBookings.length > 0 ? Math.round(monthlyRevenue / monthlyBookings.length) : 0;
    
    // Custom booking package breakdown for the month
    const customPackageStats = {
      half_day: monthlyBookings.filter(b => b.customBookingType === 'half_day').length,
      full_day: monthlyBookings.filter(b => b.customBookingType === 'full_day').length,
      night: monthlyBookings.filter(b => b.customBookingType === 'night').length
    };
    
    const response = {
      success: true,
      todayStats: {
        revenue: Math.round(todayRevenue),
        bookings: todayBookings.length,
        activeRentals: activeBookings,
        vehiclesOut: activeBookings,
        // Enhanced breakdown
        advancedRevenue: Math.round(todayAdvancedRevenue),
        customRevenue: Math.round(todayCustomRevenue),
        advancedBookings: todayAdvancedCount,
        customBookings: todayCustomCount
      },
      yesterdayStats: {
        revenue: Math.round(yesterdayRevenue),
        bookings: yesterdayBookings.length,
        // Enhanced breakdown
        advancedRevenue: Math.round(yesterdayAdvancedRevenue),
        customRevenue: Math.round(yesterdayCustomRevenue),
        advancedBookings: yesterdayAdvancedCount,
        customBookings: yesterdayCustomCount
      },
      monthlyStats: {
        totalRevenue: Math.round(monthlyRevenue),
        totalBookings: monthlyBookings.length,
        avgPerBooking,
        topVehicle,
        // Enhanced breakdown
        advancedRevenue: Math.round(monthlyAdvancedRevenue),
        customRevenue: Math.round(monthlyCustomRevenue),
        advancedBookings: monthlyBookings.filter(b => !b.isCustomBooking).length,
        customBookings: monthlyBookings.filter(b => b.isCustomBooking).length,
        customPackageStats
      },
      vehicleUtilization,
      // Enhanced analytics
      bookingTypeDistribution: {
        today: {
          advanced: { count: todayAdvancedCount, revenue: todayAdvancedRevenue, percentage: todayBookings.length > 0 ? Math.round((todayAdvancedCount / todayBookings.length) * 100) : 0 },
          custom: { count: todayCustomCount, revenue: todayCustomRevenue, percentage: todayBookings.length > 0 ? Math.round((todayCustomCount / todayBookings.length) * 100) : 0 }
        },
        month: {
          advanced: { count: monthlyBookings.filter(b => !b.isCustomBooking).length, revenue: monthlyAdvancedRevenue },
          custom: { count: monthlyBookings.filter(b => b.isCustomBooking).length, revenue: monthlyCustomRevenue },
          packageBreakdown: customPackageStats
        }
      }
    };
    
    console.log('📊 Enhanced stats generated:', {
      todayRevenue: response.todayStats.revenue,
      todayBookings: response.todayStats.bookings,
      todayAdvanced: response.todayStats.advancedBookings,
      todayCustom: response.todayStats.customBookings
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}