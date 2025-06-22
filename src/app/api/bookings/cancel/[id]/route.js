import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const {
      reason,
      customReason,
      staffNotes,
      cancelledBy,
      withinWindow,
      manualOverride
    } = await request.json();

    // Find the booking
    const booking = await Booking.findById(id)
      .populate('vehicleId')
      .populate('customerId');

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' });
    }

    // Check if booking is already cancelled or completed
    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Booking is already cancelled' });
    }

    if (booking.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Cannot cancel completed booking' });
    }

    // Validate cancellation window if not manual override
    if (!withinWindow && !manualOverride) {
      return NextResponse.json({ 
        success: false, 
        error: 'Booking is outside 2-hour cancellation window and no manual override provided' 
      });
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: cancelledBy || 'Staff',
      reason: reason,
      customReason: customReason,
      staffNotes: staffNotes,
      withinWindow: withinWindow,
      manualOverride: manualOverride
    };

    await booking.save();

    // Update vehicle status back to available
    await Vehicle.findByIdAndUpdate(booking.vehicleId._id, {
      status: 'available'
    });

    // Return updated booking
    const updatedBooking = await Booking.findById(id)
      .populate('vehicleId')
      .populate('customerId');

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}