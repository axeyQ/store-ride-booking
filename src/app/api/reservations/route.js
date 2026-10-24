import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

// GET — list enquiries (default: today by createdAt / queue order)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date'); // YYYY-MM-DD, default today

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Open queue = created today OR pickup today (covers "need now" with no special time)
    const query = {
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { pickupTime: { $gte: startOfDay, $lte: endOfDay } }
      ]
    };

    if (status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const s = search.trim();
      query.$and = [
        {
          $or: [
            { customerName: { $regex: s, $options: 'i' } },
            { customerPhone: { $regex: s, $options: 'i' } },
            { reservationId: { $regex: s, $options: 'i' } }
          ]
        }
      ];
    }

    // Priority first, then FIFO (oldest waiting first)
    const reservations = await Reservation.find(query)
      .populate('customerId', 'name phone driverLicense')
      .populate('bookingId', 'bookingId status')
      .sort({ isPriority: -1, createdAt: 1 });

    return NextResponse.json({
      success: true,
      reservations,
      count: reservations.length
    });
  } catch (error) {
    console.error('Enquiries GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST — create enquiry
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      customerId,
      customer,
      preferredType = 'any',
      pickupTime,
      urgency = 'now',
      preferredTime = null,
      isPriority = false,
      notes = '',
      createdBy = 'staff'
    } = body;

    if (!['now', 'later'].includes(urgency)) {
      return NextResponse.json(
        { success: false, error: 'Urgency must be now or later' },
        { status: 400 }
      );
    }

    if (!['scooty', 'bike', 'any'].includes(preferredType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid preferred type' },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    let pickup;
    if (urgency === 'later') {
      const raw = preferredTime || pickupTime;
      if (!raw) {
        return NextResponse.json(
          { success: false, error: 'Preferred time is required when urgency is later' },
          { status: 400 }
        );
      }
      pickup = new Date(raw);
      if (pickup < startOfToday || pickup > endOfToday) {
        return NextResponse.json(
          { success: false, error: 'Preferred time must be today only' },
          { status: 400 }
        );
      }
    } else {
      pickup = pickupTime ? new Date(pickupTime) : now;
      if (isNaN(pickup.getTime())) pickup = now;
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
        customerDoc.name = customer.name.trim();
        customerDoc.phone = customer.phone.trim();
        await customerDoc.save();
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer ID or full details (name, phone, driverLicense) required'
        },
        { status: 400 }
      );
    }

    const activeBooking = await Booking.findOne({
      customerId: customerDoc._id,
      status: 'active'
    });

    if (activeBooking) {
      return NextResponse.json(
        {
          success: false,
          error: `Customer already has an active booking (${activeBooking.bookingId}). Complete or cancel it first.`,
          activeBooking: {
            bookingId: activeBooking.bookingId,
            startTime: activeBooking.startTime
          }
        },
        { status: 400 }
      );
    }

    const existingEnquiry = await Reservation.findOne({
      customerId: customerDoc._id,
      status: 'reserved',
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    if (existingEnquiry) {
      return NextResponse.json(
        {
          success: false,
          error: `Customer already has an open enquiry today (${existingEnquiry.reservationId}).`,
          existingReservation: {
            reservationId: existingEnquiry.reservationId,
            pickupTime: existingEnquiry.pickupTime
          }
        },
        { status: 400 }
      );
    }

    const reservation = new Reservation({
      customerId: customerDoc._id,
      customerName: customerDoc.name,
      customerPhone: customerDoc.phone,
      preferredType,
      pickupTime: pickup,
      urgency,
      preferredTime: urgency === 'later' ? pickup : null,
      isPriority: Boolean(isPriority),
      advanceAmount: 0,
      notes: notes || '',
      status: 'reserved',
      createdBy
    });

    await reservation.save();

    const populated = await Reservation.findById(reservation._id).populate(
      'customerId',
      'name phone driverLicense'
    );

    return NextResponse.json({
      success: true,
      reservation: populated,
      message: `Enquiry ${reservation.reservationId} created for ${customerDoc.name}`
    });
  } catch (error) {
    console.error('Enquiries POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}