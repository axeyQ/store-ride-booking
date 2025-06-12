
// src/app/api/analytics/export/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';

// GET /api/analytics/export - Export analytics data to CSV
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(searchParams.get('endDate') || new Date());

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
      'booking.status': 'completed'
    }).populate('vehicleDetails');

    if (format === 'csv') {
      const csvHeaders = [
        'Booking ID',
        'Customer Name',
        'Mobile',
        'Vehicle Type',
        'Vehicle Number',
        'Pickup Date',
        'Return Date',
        'Duration (Hours)',
        'Base Amount',
        'Late Penalty',
        'Damage Charges',
        'Total Amount',
        'Payment Status',
        'Customer Rating'
      ];

      const csvRows = bookings.map(booking => [
        booking._id.toString().substring(0, 8),
        booking.customerDetails.name,
        booking.customerDetails.mobile,
        booking.vehicleDetails.type,
        booking.vehicleDetails.vehicleNumber,
        booking.vehicleDetails.pickupDate.toISOString().split('T')[0],
        booking.vehicleDetails.returnDate ? booking.vehicleDetails.returnDate.toISOString().split('T')[0] : '',
        booking.enhancedReturn?.totalHours || '',
        booking.enhancedReturn?.amountBreakdown?.baseAmount || booking.booking.totalAmount,
        booking.enhancedReturn?.amountBreakdown?.latePenalty || 0,
        booking.enhancedReturn?.amountBreakdown?.damageCharges || 0,
        booking.booking.totalAmount,
        booking.booking.paymentStatus,
        booking.enhancedReturn?.customerFeedback?.rating || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-export-${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unsupported export format'
    }, { status: 400 });

  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}