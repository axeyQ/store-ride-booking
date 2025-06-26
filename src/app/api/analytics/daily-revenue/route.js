// src/app/api/analytics/daily-revenue/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeBusinessHours = searchParams.get('businessHours') === 'true';
    
    let queryStartDate, queryEndDate, groupFormat;
    const now = new Date();
    
    // Handle custom date range
    if (startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryStartDate.setHours(0, 0, 0, 0);
      queryEndDate = new Date(endDate);
      queryEndDate.setHours(23, 59, 59, 999);
    } else {
      // Set date range based on selection
      switch (range) {
        case 'today':
          queryStartDate = new Date(now);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          queryStartDate = new Date(now);
          queryStartDate.setDate(now.getDate() - 1);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setDate(now.getDate() - 1);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          queryStartDate = new Date(now);
          queryStartDate.setDate(now.getDate() - 6);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          queryStartDate = new Date(now);
          queryStartDate.setDate(now.getDate() - 29);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'quarter':
          queryStartDate = new Date(now);
          queryStartDate.setDate(now.getDate() - 89);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        case 'year':
          queryStartDate = new Date(now);
          queryStartDate.setFullYear(now.getFullYear() - 1);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setHours(23, 59, 59, 999);
          break;
        default:
          queryStartDate = new Date(now);
          queryStartDate.setDate(now.getDate() - 6);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate = new Date(now);
          queryEndDate.setHours(23, 59, 59, 999);
      }
    }
    
    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
          status: { $in: ['completed', 'active'] }
        }
      },
      {
        $addFields: {
          dateOnly: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          dayOfWeek: { $dayOfWeek: "$createdAt" },
          hour: { $hour: "$createdAt" }
        }
      },
      {
        $group: {
          _id: "$dateOnly",
          totalRevenue: { 
            $sum: { 
              $ifNull: ["$finalAmount", 0] 
            } 
          },
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          activeBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0]
            }
          },
          avgBookingValue: {
            $avg: { $ifNull: ["$finalAmount", 0] }
          },
          peakHour: {
            $first: "$hour"
          },
          dayOfWeek: { $first: "$dayOfWeek" },
          bookings: {
            $push: {
              bookingId: "$bookingId",
              amount: "$finalAmount",
              status: "$status",
              hour: "$hour"
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];
    
    // If business hours only, filter by daily operations
    if (includeBusinessHours) {
      const dailyOps = await DailyOperations.find({
        date: { $gte: queryStartDate, $lte: queryEndDate },
        dayStarted: true
      });
      
      // Add business hours filtering to pipeline
      pipeline.unshift({
        $match: {
          $or: dailyOps.map(op => ({
            createdAt: {
              $gte: op.startTime,
              $lte: op.endTime || new Date()
            }
          }))
        }
      });
    }
    
    const results = await Booking.aggregate(pipeline);
    
    // Format data for frontend
    const chartData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create date range array
    const dateRange = [];
    const currentDate = new Date(queryStartDate);
    while (currentDate <= queryEndDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Map results to chart data
    dateRange.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = results.find(r => r._id === dateStr);
      
      let displayDate;
      if (range === 'week' || (queryEndDate - queryStartDate) <= 7 * 24 * 60 * 60 * 1000) {
        displayDate = dayNames[date.getDay()];
      } else if (range === 'year' || (queryEndDate - queryStartDate) > 90 * 24 * 60 * 60 * 1000) {
        displayDate = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      } else {
        displayDate = `${date.getDate()}/${date.getMonth() + 1}`;
      }
      
      chartData.push({
        date: displayDate,
        fullDate: dateStr,
        revenue: dayData?.totalRevenue || 0,
        bookings: dayData?.totalBookings || 0,
        completedBookings: dayData?.completedBookings || 0,
        activeBookings: dayData?.activeBookings || 0,
        avgBookingValue: Math.round(dayData?.avgBookingValue || 0),
        dayOfWeek: dayNames[date.getDay()],
        isBusinessDay: dayData ? true : false,
        peakHour: dayData?.peakHour,
        details: dayData?.bookings || []
      });
    });
    
    // Calculate summary statistics
    const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0);
    const totalBookings = chartData.reduce((sum, day) => sum + day.bookings, 0);
    const activeDays = chartData.filter(day => day.revenue > 0).length;
    const avgDailyRevenue = activeDays > 0 ? totalRevenue / activeDays : 0;
    const avgDailyBookings = activeDays > 0 ? totalBookings / activeDays : 0;
    
    // Growth calculation (first half vs second half)
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.revenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.revenue, 0) / secondHalf.length;
    const growthPercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100) : 0;
    
    // Find peak day
    const peakDay = chartData.reduce((max, current) => 
      current.revenue > max.revenue ? current : max, chartData[0] || {});
    
    // Day of week analysis
    const dayOfWeekStats = {};
    dayNames.forEach(day => {
      const dayData = chartData.filter(d => d.dayOfWeek === day);
      dayOfWeekStats[day] = {
        avgRevenue: dayData.reduce((sum, d) => sum + d.revenue, 0) / dayData.length || 0,
        avgBookings: dayData.reduce((sum, d) => sum + d.bookings, 0) / dayData.length || 0,
        totalDays: dayData.length
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        chartData,
        summary: {
          totalRevenue,
          totalBookings,
          activeDays,
          avgDailyRevenue,
          avgDailyBookings,
          growthPercent,
          peakDay,
          avgBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0
        },
        insights: {
          dayOfWeekStats,
          bestDay: Object.keys(dayOfWeekStats).reduce((a, b) => 
            dayOfWeekStats[a].avgRevenue > dayOfWeekStats[b].avgRevenue ? a : b),
          peakRevenueDay: peakDay,
          consistency: activeDays / chartData.length * 100, // Percentage of days with revenue
          trendDirection: growthPercent > 5 ? 'up' : growthPercent < -5 ? 'down' : 'stable'
        },
        meta: {
          range,
          startDate: queryStartDate.toISOString(),
          endDate: queryEndDate.toISOString(),
          dataPoints: chartData.length,
          includeBusinessHours,
          lastUpdated: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Enhanced daily revenue API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Additional helper function for real-time revenue updates
export async function POST(request) {
  try {
    await connectDB();
    
    const { date, includeProjected } = await request.json();
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Get actual revenue for the day
    const actualBookings = await Booking.find({
      createdAt: { $gte: targetDate, $lte: endDate },
      status: { $in: ['completed', 'active'] }
    });
    
    const actualRevenue = actualBookings.reduce((sum, booking) => 
      sum + (booking.finalAmount || 0), 0);
    
    let projectedRevenue = actualRevenue;
    
    if (includeProjected && targetDate.toDateString() === new Date().toDateString()) {
      // Get current hour and project based on hourly trends
      const currentHour = new Date().getHours();
      const hoursRemaining = 24 - currentHour;
      
      if (hoursRemaining > 0) {
        // Simple projection based on current rate
        const revenuePerHour = actualRevenue / Math.max(currentHour, 1);
        projectedRevenue = actualRevenue + (revenuePerHour * hoursRemaining);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        actualRevenue,
        projectedRevenue,
        bookings: actualBookings.length,
        isToday: targetDate.toDateString() === new Date().toDateString(),
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Real-time revenue update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}