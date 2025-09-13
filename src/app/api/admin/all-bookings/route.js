import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentMethod = searchParams.get('paymentMethod') || 'all';
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const customDateFrom = searchParams.get('customDateFrom') || '';
    const customDateTo = searchParams.get('customDateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query
    let query = {};
    
    // Status filter
    if (status !== 'all') {
      query.status = status;
    }
    
    // Date filter
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayStart.getDate() + 1);
        query.createdAt = { $gte: todayStart, $lt: todayEnd };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: weekStart };
        break;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        monthStart.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: monthStart };
        break;
    }
    
    // Build sort object
    const sort = {};
    if (sortBy === 'customerId.name') {
      // For nested sorting, we'll handle this in the aggregation
      sort['customerId.name'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }
    
    // Search functionality
    let searchQuery = {};
    if (search) {
      // First, find customers that match the search
      const customerSearchRegex = new RegExp(search, 'i');
      
      // We need to use aggregation for complex search across populated fields
      const searchPipeline = [
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
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
          $unwind: '$customer'
        },
        {
          $unwind: '$vehicle'
        },
        {
          $match: {
            ...query,
            $or: [
              { 'customer.name': customerSearchRegex },
              { 'customer.phone': customerSearchRegex },
              { 'bookingId': customerSearchRegex },
              { 'vehicle.model': customerSearchRegex },
              { 'vehicle.plateNumber': customerSearchRegex }
            ]
          }
        },
        {
          $sort: sort
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: 1,
            bookingId: 1,
            startTime: 1,
            endTime: 1,
            actualDuration: 1,
            finalAmount: 1,
            paymentMethod: 1,
            status: 1,
            createdAt: 1,
            customerId: '$customer',
            vehicleId: '$vehicle'
          }
        }
      ];
      
      const countPipeline = [
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
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
          $unwind: '$customer'
        },
        {
          $unwind: '$vehicle'
        },
        {
          $match: {
            ...query,
            $or: [
              { 'customer.name': customerSearchRegex },
              { 'customer.phone': customerSearchRegex },
              { 'bookingId': customerSearchRegex },
              { 'vehicle.model': customerSearchRegex },
              { 'vehicle.plateNumber': customerSearchRegex }
            ]
          }
        },
        {
          $count: "total"
        }
      ];
      
      const [bookings, countResult] = await Promise.all([
        Booking.aggregate(searchPipeline),
        Booking.aggregate(countPipeline)
      ]);
      
      const total = countResult.length > 0 ? countResult[0].total : 0;
      
      return NextResponse.json({
        success: true,
        bookings,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } else {
      // No search - use regular find with populate
      const skip = (page - 1) * limit;
      
      const [bookings, total] = await Promise.all([
        Booking.find(query)
          .populate('vehicleId', 'type model plateNumber')
          .populate('customerId', 'name phone driverLicense')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Booking.countDocuments(query)
      ]);
      
      return NextResponse.json({
        success: true,
        bookings,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    }
  } catch (error) {
    console.error('All bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}