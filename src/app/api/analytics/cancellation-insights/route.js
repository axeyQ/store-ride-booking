import { NextResponse } from 'next/server';
import Booking from '@/models/Booking';
import connectDB from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Advanced cancellation insights
    const insights = await Promise.all([
      // 1. Cancellation by hour of day
      Booking.aggregate([
        {
          $match: {
            status: 'cancelled',
            'cancellationDetails.cancelledAt': { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $hour: '$cancellationDetails.cancelledAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // 2. Cancellation by day of week
      Booking.aggregate([
        {
          $match: {
            status: 'cancelled',
            'cancellationDetails.cancelledAt': { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$cancellationDetails.cancelledAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // 3. Vehicle type cancellation patterns
      Booking.aggregate([
        {
          $match: {
            status: 'cancelled',
            'cancellationDetails.cancelledAt': { $gte: thirtyDaysAgo }
          }
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicle'
          }
        },
        {
          $group: {
            _id: '$vehicle.type',
            count: { $sum: 1 },
            avgTimeToCancellation: {
              $avg: {
                $divide: [
                  { $subtract: ['$cancellationDetails.cancelledAt', '$startTime'] },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          }
        }
      ]),

      // 4. Customer cancellation behavior
      Booking.aggregate([
        {
          $match: {
            status: 'cancelled',
            'cancellationDetails.cancelledAt': { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$customerId',
            cancellationCount: { $sum: 1 },
            reasons: { $push: '$cancellationDetails.reason' },
            withinWindowCount: {
              $sum: { $cond: ['$cancellationDetails.withinWindow', 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $match: { cancellationCount: { $gt: 1 } } }, // Only frequent cancellers
        { $sort: { cancellationCount: -1 } },
        { $limit: 10 }
      ]),

      // 5. Revenue impact analysis
      Booking.aggregate([
        {
          $match: {
            status: 'cancelled',
            'cancellationDetails.cancelledAt': { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalCancellations: { $sum: 1 },
            estimatedLostRevenue: {
              $sum: {
                $multiply: [
                  { $divide: [
                    { $subtract: ['$startTime', '$createdAt'] },
                    1000 * 60 * 60 // Convert to hours
                  ]},
                  80 // Base hourly rate
                ]
              }
            }
          }
        }
      ])
    ]);

    // Transform day of week data
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const cancellationsByDay = insights[1].map(item => ({
      day: dayNames[item._id - 1],
      count: item.count
    }));

    return NextResponse.json({
      success: true,
      data: {
        hourlyPattern: insights[0],
        dailyPattern: cancellationsByDay,
        vehicleTypePattern: insights[2],
        frequentCancellers: insights[3],
        revenueImpact: insights[4][0] || { totalCancellations: 0, estimatedLostRevenue: 0 },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching cancellation insights:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
