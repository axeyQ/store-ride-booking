import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';
import { SettingsService } from '@/services/SettingsService';

// GET — list reservations (default: today)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date'); // YYYY-MM-DD, default today

    // Build date range (same day)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      pickupTime: { $gte: startOfDay, $lte: endOfDay }
    };

    if (status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const s = search.trim();
      query.$or = [
        { customerName: { $regex: s, $options: 'i' } },
        { customerPhone: { $regex: s, $options: 'i' } },
        { reservationId: { $regex: s, $options: 'i' } }
      ];
    }

    const reservations = await Reservation.find(query)
      .populate('customerId', 'name phone driverLicense')
      .populate('bookingId', 'bookingId status')
      .sort({ pickupTime: 1 });

    return NextResponse.json({
      success: true,
      reservations,
      count: reservations.length
    });
  } catch (error) {
    console.error('Reservations GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST — create reservation
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      customerId,          // existing customer
      customer,            // { name, phone, driverLicense } for new customer
      preferredType = 'any',
      pickupTime,
      advanceAmount,
      advancePaymentMethod,
      notes = '',
      createdBy = 'staff'
    } = body;

    // Validate pickup time (must be today)
    if (!pickupTime) {
      return NextResponse.json(
        { success: false, error: 'Pickup time is required' },
        { status: 400 }
      );
    }

    const pickup = new Date(pickupTime);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (pickup < startOfToday || pickup > endOfToday) {
      return NextResponse.json(
        { success: false, error: 'Pickup time must be today only' },
        { status: 400 }
      );
    }

    if (!['scooty', 'bike', 'any'].includes(preferredType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid preferred type' },
        { status: 400 }
      );
    }

    if (!advancePaymentMethod || !['cash', 'upi'].includes(advancePaymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Advance payment method required (cash or upi)' },
        { status: 400 }
      );
    }

    // Resolve customer
    let customerDoc = null;

    if (customerId) {
      customerDoc = await Customer.findById(customerId);
      if (!customerDoc) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
    } else if (customer?.name && customer?.phone && customer?.driverLicense) {
      // Create or find by license
      const license = customer.driverLicense.trim().toUpperCase();
      customerDoc = await Customer.findOne({ driverLicense: license });

      if (!customerDoc) {
        customerDoc = new Customer({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          driverLicense: license,
          totalBookings: 0,
          lastVisit: new Date()
        });
        await customerDoc.save();
      } else {
        // Update name/phone if needed
        customerDoc.name = customer.name.trim();
        customerDoc.phone = customer.phone.trim();
        await customerDoc.save();
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Customer ID or full customer details (name, phone, driverLicense) required' },
        { status: 400 }
      );
    }

    // Block if customer already has an active booking
    const activeBooking = await Booking.findOne({
      customerId: customerDoc._id,
      status: 'active'
    });

    if (activeBooking) {
      return NextResponse.json({
        success: false,
        error: `Customer already has an active booking (${activeBooking.bookingId}). Complete or cancel it first.`,
        activeBooking: {
          bookingId: activeBooking.bookingId,
          startTime: activeBooking.startTime
        }
      }, { status: 400 });
    }

    // Block if customer already has a reserved reservation for today
    const existingReservation = await Reservation.findOne({
      customerId: customerDoc._id,
      status: 'reserved',
      pickupTime: { $gte: startOfToday, $lte: endOfToday }
    });

    if (existingReservation) {
      return NextResponse.json({
        success: false,
        error: `Customer already has a reservation today (${existingReservation.reservationId}) at ${new Date(existingReservation.pickupTime).toLocaleTimeString('en-IN')}.`,
        existingReservation: {
          reservationId: existingReservation.reservationId,
          pickupTime: existingReservation.pickupTime
        }
      }, { status: 400 });
    }

    // Default advance = hourly rate from settings
// Default advance = 0 (staff enters amount only if they collect money)
let finalAdvance = advanceAmount;
if (finalAdvance == null || finalAdvance === '') {
  finalAdvance = 0;
}

finalAdvance = Number(finalAdvance);
if (isNaN(finalAdvance) || finalAdvance < 0) {
  return NextResponse.json(
    { success: false, error: 'Invalid advance amount' },
    { status: 400 }
  );
}

    const reservation = new Reservation({
      customerId: customerDoc._id,
      customerName: customerDoc.name,
      customerPhone: customerDoc.phone,
      preferredType,
      pickupTime: pickup,
      advanceAmount: finalAdvance,
      advancePaymentMethod,
      notes: notes || '',
      status: 'reserved',
      createdBy
    });

    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
      .populate('customerId', 'name phone driverLicense');

    return NextResponse.json({
      success: true,
      reservation: populated,
      message: `Reservation ${reservation.reservationId} created for ${customerDoc.name}`
    });
  } catch (error) {
    console.error('Reservations POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}