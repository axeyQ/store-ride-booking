import { NextResponse } from 'next/server';
import Booking from '@/models/Booking';
import connectDB from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'month';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = (page - 1) * limit;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (filter) {
      case 'week':
        const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        dateFilter = { 'cancellationDetails.cancelledAt': { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { 'cancellationDetails.cancelledAt': { $gte: monthAgo } };
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        dateFilter = { 'cancellationDetails.cancelledAt': { $gte: quarterAgo } };
        break;
      case 'all':
      default:
        // No date filter for 'all'
        break;
    }

    const [cancelledBookings, totalCount] = await Promise.all([
      Booking.find({
        status: 'cancelled',
        ...dateFilter
      })
      .populate('customerId', 'name phone driverLicense')
      .populate('vehicleId', 'type model plateNumber')
      .sort({ 'cancellationDetails.cancelledAt': -1 })
      .skip(skip)
      .limit(limit),
      
      Booking.countDocuments({
        status: 'cancelled',
        ...dateFilter
      })
    ]);

    // Calculate summary statistics
    const summaryStats = await Booking.aggregate([
      {
        $match: {
          status: 'cancelled',
          ...dateFilter
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
          },
          avgTimeToCancellation: {
            $avg: {
              $divide: [
                { $subtract: ['$cancellationDetails.cancelledAt', '$createdAt'] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      bookings: cancelledBookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      summary: summaryStats[0] || {
        totalCancellations: 0,
        withinWindow: 0,
        manualOverride: 0,
        avgTimeToCancellation: 0
      }
    });

  } catch (error) {
    console.error('Error fetching cancelled bookings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}