// src/app/api/change-vehicle/route.js
// IMMEDIATE WORKING FIX - Replace your current file with this

import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    console.log('🔄 Vehicle change API called - Working Fix');
    await connectDB();
    
    const body = await request.json();
    const { bookingId, newVehicleId, reason: userReason } = body;

    console.log('📝 Request data:', { bookingId, newVehicleId, userReason });

    // Validate input
    if (!bookingId || !newVehicleId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and new vehicle ID are required' },
        { status: 400 }
      );
    }

    // Find the booking
    const booking = await Booking.findOne({ bookingId })
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    console.log('📋 Found booking:', {
      id: booking.bookingId,
      status: booking.status,
      currentVehicle: booking.vehicleId.plateNumber
    });

    // Check if booking is active
    if (booking.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only active bookings can have vehicle changes' },
        { status: 400 }
      );
    }

    // Enhanced timing check
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const createdAt = new Date(booking.createdAt);
    
    const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));
    const minutesSinceCreation = Math.floor((now - createdAt) / (1000 * 60));

    console.log('⏰ Timing check:', {
      minutesSinceStart,
      minutesSinceCreation
    });

    // Enhanced eligibility check
    let canChange = false;
    let reason = '';
    
    if (now < startTime) {
      canChange = true;
      reason = 'Rental has not started yet';
    } else if (minutesSinceStart <= 30) {
      canChange = true;
      reason = `Within 30min of start (${minutesSinceStart}m ago)`;
    } else if (minutesSinceCreation <= 45) {
      canChange = true;
      reason = `Within 45min of booking (${minutesSinceCreation}m ago)`;
    } else if (minutesSinceStart <= 60) {
      canChange = true;
      reason = `Within first hour (${minutesSinceStart}m into rental)`;
    } else {
      reason = `Too late (${minutesSinceStart}m into rental, ${minutesSinceCreation}m since booking)`;
    }

    if (!canChange) {
      console.error('❌ Vehicle change not allowed:', reason);
      return NextResponse.json(
        { success: false, error: reason },
        { status: 400 }
      );
    }

    // Check if trying to change to the same vehicle
    if (booking.vehicleId._id.toString() === newVehicleId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change to the same vehicle' },
        { status: 400 }
      );
    }

    // Find and validate new vehicle
    const newVehicle = await Vehicle.findById(newVehicleId);
    if (!newVehicle) {
      return NextResponse.json(
        { success: false, error: 'New vehicle not found' },
        { status: 404 }
      );
    }

    if (newVehicle.status !== 'available') {
      return NextResponse.json(
        { success: false, error: `Selected vehicle is ${newVehicle.status}, not available` },
        { status: 400 }
      );
    }

    const currentVehicle = booking.vehicleId;
    
    console.log('🔄 Starting vehicle change operation...');

    // Update vehicle statuses
    await Vehicle.findByIdAndUpdate(currentVehicle._id, { 
      status: 'available' 
    });

    await Vehicle.findByIdAndUpdate(newVehicle._id, { 
      status: 'rented' 
    });

    // Update booking with new vehicle
    booking.vehicleId = newVehicle._id;
    
    // ✅ WORKING: Store change info in simple format to avoid BSON errors
    if (!booking.additionalNotes) {
      booking.additionalNotes = '';
    }
    
    // Add change info as a simple text note (avoids schema issues)
    const changeNote = `\n[${new Date().toISOString()}] Vehicle changed from ${currentVehicle.model} (${currentVehicle.plateNumber}) to ${newVehicle.model} (${newVehicle.plateNumber}). Reason: ${userReason || 'Customer request'}. Timing: ${reason}`;
    booking.additionalNotes += changeNote;

    console.log('📝 Saving booking with simple change tracking...');
    await booking.save();

    // Return updated booking
    const updatedBooking = await Booking.findOne({ bookingId })
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

    const successMessage = `Vehicle changed successfully to ${newVehicle.model} (${newVehicle.plateNumber})`;
    
    console.log('🎉 Vehicle change completed successfully:', {
      bookingId: booking.bookingId,
      from: currentVehicle.plateNumber,
      to: newVehicle.plateNumber
    });

    return NextResponse.json({
      success: true,
      message: successMessage,
      booking: updatedBooking,
      changeDetails: {
        previousVehicle: {
          model: currentVehicle.model,
          plateNumber: currentVehicle.plateNumber
        },
        newVehicle: {
          model: newVehicle.model,
          plateNumber: newVehicle.plateNumber
        },
        changedAt: new Date(),
        minutesSinceStart,
        reason: reason
      }
    });

  } catch (error) {
    console.error('💥 Vehicle change API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during vehicle change',
        details: error.message 
      },
      { status: 500 }
    );
  }
}