import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { bookingId, newVehicleId } = body;

    // Validate input
    if (!bookingId || !newVehicleId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and new vehicle ID are required' },
        { status: 400 }
      );
    }

    // Find the booking by bookingId (not _id)
    const booking = await Booking.findOne({ bookingId })
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking is active
    if (booking.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only active bookings can have vehicle changes' },
        { status: 400 }
      );
    }

    // Check if within 15-minute window
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));

    console.log('Vehicle change timing check:', {
      bookingId,
      startTime: startTime.toISOString(),
      currentTime: now.toISOString(),
      minutesSinceStart
    });

    if (minutesSinceStart > 15) {
      return NextResponse.json(
        { success: false, error: 'Vehicle changes are only allowed within 15 minutes of booking start' },
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
        { success: false, error: 'Selected vehicle is not available' },
        { status: 400 }
      );
    }

    // Get current vehicle for status update
    const currentVehicle = await Vehicle.findById(booking.vehicleId._id);
    if (!currentVehicle) {
      return NextResponse.json(
        { success: false, error: 'Current vehicle not found' },
        { status: 404 }
      );
    }

    console.log('Vehicle change operation:', {
      bookingId: booking.bookingId,
      currentVehicle: {
        id: currentVehicle._id,
        model: currentVehicle.model,
        plate: currentVehicle.plateNumber,
        status: currentVehicle.status
      },
      newVehicle: {
        id: newVehicle._id,
        model: newVehicle.model,
        plate: newVehicle.plateNumber,
        status: newVehicle.status
      }
    });

    // Perform atomic updates
    // 1. Update current vehicle to available
    await Vehicle.findByIdAndUpdate(currentVehicle._id, { 
      status: 'available' 
    });

    // 2. Update new vehicle to rented
    await Vehicle.findByIdAndUpdate(newVehicle._id, { 
      status: 'rented' 
    });

    // 3. Update booking with new vehicle
    booking.vehicleId = newVehicle._id;
    
    // Add change history (optional - for audit trail)
    if (!booking.vehicleChangeHistory) {
      booking.vehicleChangeHistory = [];
    }
    
    booking.vehicleChangeHistory.push({
      changedAt: new Date(),
      previousVehicleId: currentVehicle._id,
      previousVehicleDetails: {
        type: currentVehicle.type,
        model: currentVehicle.model,
        plateNumber: currentVehicle.plateNumber
      },
      newVehicleId: newVehicle._id,
      newVehicleDetails: {
        type: newVehicle.type,
        model: newVehicle.model,
        plateNumber: newVehicle.plateNumber
      },
      minutesSinceStart,
      reason: 'Customer request'
    });

    await booking.save();

    // Return updated booking with populated data
    const updatedBooking = await Booking.findOne({ bookingId })
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

    console.log('Vehicle change completed successfully:', {
      bookingId: booking.bookingId,
      newVehicle: updatedBooking.vehicleId.model,
      changeCount: booking.vehicleChangeHistory.length
    });

    return NextResponse.json({
      success: true,
      message: `Vehicle changed successfully to ${newVehicle.model} (${newVehicle.plateNumber})`,
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
        minutesSinceStart
      }
    });

  } catch (error) {
    console.error('Vehicle change API error:', error);
    
    // Rollback any partial changes if needed
    // In a production environment, you might want to use transactions
    
    return NextResponse.json(
      { success: false, error: 'Internal server error during vehicle change' },
      { status: 500 }
    );
  }
}

// Optional: GET method to check if vehicle change is allowed
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'active') {
      return NextResponse.json({
        success: true,
        canChange: false,
        reason: 'Booking is not active'
      });
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));
    const canChange = minutesSinceStart <= 15;

    return NextResponse.json({
      success: true,
      canChange,
      reason: canChange ? 'Within allowed time window' : 'Beyond 15-minute change window',
      minutesSinceStart,
      timeRemaining: Math.max(0, 15 - minutesSinceStart)
    });

  } catch (error) {
    console.error('Vehicle change check API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}