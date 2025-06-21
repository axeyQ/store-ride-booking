import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    
    let query = {};
    const now = new Date();
    
    switch (range) {
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        query.date = { $gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        query.date = { $gte: monthAgo };
        break;
      case 'all':
        // No date filter
        break;
    }
    
    const operations = await DailyOperations.find(query).sort({ date: -1 });
    
    // Create CSV content
    const headers = [
      'Date', 'Status', 'Start Time', 'End Time', 'Started By', 'Ended By',
      'Operating Hours', 'Total Revenue', 'Revenue Per Hour', 'Total Bookings',
      'Completed Bookings', 'Active Bookings', 'Cancelled Bookings',
      'New Customers', 'Vehicles Rented', 'Average Booking Value',
      'Restart Count', 'Auto Ended', 'Start Notes', 'End Notes'
    ];
    
    const csvRows = operations.map(op => [
      new Date(op.date).toLocaleDateString('en-IN'),
      op.status,
      op.startTime ? new Date(op.startTime).toLocaleString('en-IN') : '',
      op.endTime ? new Date(op.endTime).toLocaleString('en-IN') : '',
      op.startedBy || '',
      op.endedBy || '',
      op.dailySummary?.operatingHours || 0,
      op.dailySummary?.totalRevenue || 0,
      op.dailySummary?.revenuePerHour || 0,
      op.dailySummary?.totalBookings || 0,
      op.dailySummary?.completedBookings || 0,
      op.dailySummary?.activeBookings || 0,
      op.dailySummary?.cancelledBookings || 0,
      op.dailySummary?.newCustomers || 0,
      op.dailySummary?.vehiclesRented || 0,
      op.dailySummary?.averageBookingValue || 0,
      op.restartCount || 0,
      op.autoEnded ? 'Yes' : 'No',
      op.startNotes || '',
      op.endNotes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field}"` 
            : field
        ).join(',')
      )
    ].join('\n');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="daily-operations-${range}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    
  } catch (error) {
    console.error('Export daily operations error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}