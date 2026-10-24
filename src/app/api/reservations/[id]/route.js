import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import { NextResponse } from 'next/server';

// GET single enquiry
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const reservation = await Reservation.findById(id)
      .populate('customerId', 'name phone driverLicense')
      .populate('bookingId', 'bookingId status startTime');

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, reservation });
  } catch (error) {
    console.error('Enquiry GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH — status actions OR field updates
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await request.json();

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      );
    }

    const {
      action,
      bookingId,
      notes,
      cancelledBy,
      noShowBy,
      // Optional field updates (no action)
      isPriority,
      urgency,
      preferredTime,
      preferredType,
      updateNotes
    } = body;

    // ---- Status actions ----
    if (action === 'cancel') {
      if (reservation.status !== 'reserved') {
        return NextResponse.json(
          { success: false, error: 'Only open enquiries can be cancelled' },
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
          { success: false, error: 'Only open enquiries can be marked no-show' },
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
          { success: false, error: 'Only open enquiries can be converted' },
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
    } else if (action) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: cancel, no_show, or convert' },
        { status: 400 }
      );
    } else {
      // ---- Soft updates (open enquiries only) ----
      if (reservation.status !== 'reserved') {
        return NextResponse.json(
          { success: false, error: 'Only open enquiries can be edited' },
          { status: 400 }
        );
      }

      if (typeof isPriority === 'boolean') {
        reservation.isPriority = isPriority;
      }
      if (urgency === 'now' || urgency === 'later') {
        reservation.urgency = urgency;
        if (urgency === 'now') {
          reservation.preferredTime = null;
        }
      }
      if (preferredTime !== undefined) {
        reservation.preferredTime = preferredTime ? new Date(preferredTime) : null;
        if (preferredTime) {
          reservation.pickupTime = new Date(preferredTime);
        }
      }
      if (preferredType && ['scooty', 'bike', 'any'].includes(preferredType)) {
        reservation.preferredType = preferredType;
      }
      if (typeof updateNotes === 'string') {
        reservation.notes = updateNotes.slice(0, 500);
      } else if (typeof notes === 'string' && !action) {
        reservation.notes = notes.slice(0, 500);
      }
    }

    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
      .populate('customerId', 'name phone driverLicense')
      .populate('bookingId', 'bookingId status');

    const label =
      reservation.status === 'reserved' ? 'waiting' : reservation.status;

    return NextResponse.json({
      success: true,
      reservation: populated,
      message: action
        ? `Enquiry marked as ${label}`
        : 'Enquiry updated'
    });
  } catch (error) {
    console.error('Enquiry PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}