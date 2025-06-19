import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const dateFilter = searchParams.get('dateFilter') || 'all';
    
    // Build query (same logic as all-bookings API)
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
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
    
    let bookings;
    
    if (search) {
      // Use aggregation for search
      const customerSearchRegex = new RegExp(search, 'i');
      
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
          $sort: { createdAt: -1 }
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
      
      bookings = await Booking.aggregate(searchPipeline);
    } else {
      bookings = await Booking.find(query)
        .populate('vehicleId', 'type model plateNumber')
        .populate('customerId', 'name phone driverLicense')
        .sort({ createdAt: -1 });
    }
    
    // Convert to CSV
    const csvHeaders = [
      'Booking ID',
      'Customer Name', 
      'Customer Phone',
      'Driver License',
      'Vehicle Type',
      'Vehicle Model',
      'Plate Number',
      'Start Time',
      'End Time',
      'Duration (Hours)',
      'Final Amount',
      'Payment Method',
      'Status',
      'Created At'
    ];
    
    const csvRows = bookings.map(booking => {
      const calculateDuration = (startTime, endTime) => {
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date();
        const diffMs = end - start;
        return Math.ceil(diffMs / (1000 * 60 * 60));
      };
      
      const duration = calculateDuration(booking.startTime, booking.endTime);
      const finalAmount = booking.finalAmount || (duration * 80);
      
      return [
        booking.bookingId || '',
        booking.customerId?.name || 'Unknown',
        booking.customerId?.phone || '',
        booking.customerId?.driverLicense || '',
        booking.vehicleId?.type || '',
        booking.vehicleId?.model || '',
        booking.vehicleId?.plateNumber || '',
        booking.startTime ? new Date(booking.startTime).toLocaleString('en-IN') : '',
        booking.endTime ? new Date(booking.endTime).toLocaleString('en-IN') : '',
        duration,
        finalAmount,
        booking.paymentMethod || '',
        booking.status || '',
        booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN') : ''
      ];
    });
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          // Escape fields that contain commas or quotes
          typeof field === 'string' && (field.includes(',') || field.includes('"')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');
    
    // Generate filename with current date
    const filename = `MR_Travels_Bookings_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Return CSV response
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Export bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}