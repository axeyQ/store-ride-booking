import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import { NextResponse } from 'next/server';

// GET single reservation
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const reservation = await Reservation.findById(id)
      .populate('customerId', 'name phone driverLicense')
      .populate('bookingId', 'bookingId status startTime');

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, reservation });
  } catch (error) {
    console.error('Reservation GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH — update status (cancel / no_show / convert)
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await request.json();

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const { action, bookingId, notes, cancelledBy, noShowBy } = body;

    if (action === 'cancel') {
      if (reservation.status !== 'reserved') {
        return NextResponse.json(
          { success: false, error: 'Only reserved reservations can be cancelled' },
          { status: 400 }
        );
      }
      reservation.status = 'cancelled';
      reservation.cancelledAt = new Date();
      reservation.cancelledBy = cancelledBy || 'staff';
      reservation.cancelReason = notes || '';
    } else if (action === 'no_show') {
      if (reservation.status !== 'reserved') {
        return NextResponse.json(
          { success: false, error: 'Only reserved reservations can be marked no-show' },
          { status: 400 }
        );
      }
      reservation.status = 'no_show';
      reservation.noShowAt = new Date();
      reservation.noShowBy = noShowBy || 'staff';
      reservation.noShowNotes = notes || '';
    } else if (action === 'convert') {
      if (reservation.status !== 'reserved') {
        return NextResponse.json(
          { success: false, error: 'Only reserved reservations can be converted' },
          { status: 400 }
        );
      }
      if (!bookingId) {
        return NextResponse.json(
          { success: false, error: 'bookingId is required to convert' },
          { status: 400 }
        );
      }
      reservation.status = 'converted';
      reservation.bookingId = bookingId;
      reservation.convertedAt = new Date();
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: cancel, no_show, or convert' },
        { status: 400 }
      );
    }

    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
      .populate('customerId', 'name phone driverLicense')
      .populate('bookingId', 'bookingId status');

    return NextResponse.json({
      success: true,
      reservation: populated,
      message: `Reservation marked as ${reservation.status}`
    });
  } catch (error) {
    console.error('Reservation PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}