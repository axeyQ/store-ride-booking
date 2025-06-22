import { NextResponse } from 'next/server';
import Booking from '@/models/Booking';
import connectDB from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month'; // week, month, quarter
    
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get all bookings for the period
    const allBookings = await Booking.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Get cancelled bookings analytics
    const cancellationStats = await Booking.aggregate([
      {
        $match: {
          status: 'cancelled',
          'cancellationDetails.cancelledAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCancellations: { $sum: 1 },
          withinWindow: {
            $sum: { $cond: ['$cancellationDetails.withinWindow', 1, 0] }
          },
          manualOverride: {
            $sum: { $cond: ['$cancellationDetails.manualOverride', 1, 0] }
          }
        }
      }
    ]);

    // Get top cancellation reasons
    const topReasons = await Booking.aggregate([
      {
        $match: {
          status: 'cancelled',
          'cancellationDetails.cancelledAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$cancellationDetails.reason',
          count: { $sum: 1 },
          withinWindow: {
            $sum: { $cond: ['$cancellationDetails.withinWindow', 1, 0] }
          },
          manualOverride: {
            $sum: { $cond: ['$cancellationDetails.manualOverride', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Calculate weekly trend for the last 4 weeks
    const weeklyTrend = await Booking.aggregate([
      {
        $match: {
          status: 'cancelled',
          'cancellationDetails.cancelledAt': { 
            $gte: new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000))
          }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$cancellationDetails.cancelledAt' },
            year: { $year: '$cancellationDetails.cancelledAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    const stats = cancellationStats[0] || {
      totalCancellations: 0,
      withinWindow: 0,
      manualOverride: 0
    };

    const cancellationRate = allBookings > 0 
      ? Math.round((stats.totalCancellations / allBookings) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCancellations: stats.totalCancellations,
        cancellationRate,
        withinWindow: stats.withinWindow,
        manualOverride: stats.manualOverride,
        topReasons,
        weeklyTrend,
        period: timeframe,
        totalBookings: allBookings
      }
    });

  } catch (error) {
    console.error('Error fetching cancellation analytics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}