
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const endTime = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // Next 6 hours

    // Get active bookings with estimated return times in the next 6 hours
    const upcomingReturns = await Booking.find({
      status: 'active',
      estimatedReturnTime: {
        $gte: now,
        $lte: endTime
      }
    })
    .populate('vehicleId', 'model plateNumber type')
    .populate('customerId', 'name')
    .sort({ estimatedReturnTime: 1 });

    // Group returns by hour
    const forecast = [];
    for (let i = 0; i < 6; i++) {
      const slotStart = new Date(now.getTime() + (i * 60 * 60 * 1000));
      const slotEnd = new Date(now.getTime() + ((i + 1) * 60 * 60 * 1000));
      
      const returnsInSlot = upcomingReturns.filter(booking => {
        const returnTime = new Date(booking.estimatedReturnTime);
        return returnTime >= slotStart && returnTime < slotEnd;
      });
      
      forecast.push({
        hour: slotStart.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        expectedReturns: returnsInSlot.length,
        vehicles: returnsInSlot.map(b => 
          `${b.vehicleId?.model || 'Unknown'} (${b.vehicleId?.plateNumber || 'N/A'})`
        ),
        bookings: returnsInSlot.map(b => ({
          bookingId: b.bookingId,
          customerName: b.customerId?.name,
          vehicleModel: b.vehicleId?.model,
          plateNumber: b.vehicleId?.plateNumber,
          estimatedReturn: b.estimatedReturnTime,
          isCustomBooking: b.isCustomBooking,
          customBookingType: b.customBookingType
        }))
      });
    }

    return NextResponse.json({
      success: true,
      forecast,
      generatedAt: now.toISOString(),
      totalUpcomingReturns: upcomingReturns.length
    });

  } catch (error) {
    console.error('Fleet forecast API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}