// src/app/api/bookings/complete/[id]/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await request.json();
    
    console.log('Completing booking:', id, body);
    
    // Find the booking by ID (not bookingId)
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    if (booking.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Booking is not active' },
        { status: 400 }
      );
    }
    
    // Update booking with completion data
    booking.endTime = new Date(body.endTime || new Date());
    booking.actualDuration = body.actualDuration;
    booking.finalAmount = body.finalAmount;
    booking.paymentMethod = body.paymentMethod;
    booking.status = 'completed';
    
    // Add return-specific fields
    if (body.vehicleCondition) booking.vehicleCondition = body.vehicleCondition;
    if (body.returnNotes) booking.returnNotes = body.returnNotes;
    if (body.damageNotes) booking.damageNotes = body.damageNotes;
    if (body.discountAmount) booking.discountAmount = body.discountAmount;
    if (body.additionalCharges) booking.additionalCharges = body.additionalCharges;
    
    await booking.save();
    
    // Update vehicle status back to available
    await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'available' });
    
    // Return populated booking
    const updatedBooking = await Booking.findById(id)
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone driverLicense');
    
    console.log('Booking completed successfully:', updatedBooking.bookingId);
    
    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error('Error completing booking:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}