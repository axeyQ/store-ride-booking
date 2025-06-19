import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';
    
    let startDate, endDate, groupBy, dateFormat;
    const now = new Date();
    
    // Set date range and grouping based on selected range
    switch (range) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        dateFormat = { $dayOfWeek: '$createdAt' };
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        groupBy = 'day';
        dateFormat = { $dayOfMonth: '$createdAt' };
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12);
        groupBy = 'month';
        dateFormat = { $month: '$createdAt' };
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
    }
    
    // For simplicity, let's get daily data for the last 7 days
    const chartData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (range === 'week') {
      // Generate data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        
        // Get bookings for this day
        const dayBookings = await Booking.find({
          createdAt: { $gte: date, $lt: nextDay },
          status: { $in: ['completed', 'active'] }
        });
        
        const dayRevenue = dayBookings.reduce((sum, booking) => {
          return sum + (booking.finalAmount || 0);
        }, 0);
        
        chartData.push({
          date: dayNames[date.getDay()],
          revenue: dayRevenue,
          bookings: dayBookings.length,
          fullDate: date.toISOString().split('T')[0]
        });
      }
    } else if (range === 'month') {
      // Generate data for last 30 days (grouped by week)
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weekBookings = await Booking.find({
          createdAt: { $gte: weekStart, $lt: weekEnd },
          status: { $in: ['completed', 'active'] }
        });
        
        const weekRevenue = weekBookings.reduce((sum, booking) => {
          return sum + (booking.finalAmount || 0);
        }, 0);
        
        chartData.push({
          date: `Week ${5-i}`,
          revenue: weekRevenue,
          bookings: weekBookings.length,
          fullDate: weekStart.toISOString().split('T')[0]
        });
      }
    } else if (range === 'year') {
      // Generate data for last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthStart.getMonth() + 1);
        
        const monthBookings = await Booking.find({
          createdAt: { $gte: monthStart, $lt: monthEnd },
          status: { $in: ['completed', 'active'] }
        });
        
        const monthRevenue = monthBookings.reduce((sum, booking) => {
          return sum + (booking.finalAmount || 0);
        }, 0);
        
        chartData.push({
          date: monthNames[monthStart.getMonth()],
          revenue: monthRevenue,
          bookings: monthBookings.length,
          fullDate: monthStart.toISOString().split('T')[0]
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      chartData,
      range,
      totalDataPoints: chartData.length
    });
  } catch (error) {
    console.error('Revenue chart API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}