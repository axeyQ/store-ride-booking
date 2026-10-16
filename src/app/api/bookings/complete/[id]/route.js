// src/app/api/bookings/complete/[id]/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';
import { PricingService } from '@/services/PricingService';

// 🛡️ BULLETPROOF VEHICLE STATUS UPDATE FUNCTION (unchanged)
async function updateVehicleStatusSafely(vehicleId, newStatus, context = '') {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}: Updating vehicle ${vehicleId} to ${newStatus} (${context})`);
      
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle with ID ${vehicleId} not found`);
      }

      console.log(`📋 Vehicle ${vehicle.plateNumber} current status: ${vehicle.status} → ${newStatus}`);

      const updateResult = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { status: newStatus },
        { 
          new: true,
          runValidators: true,
          upsert: false
        }
      );

      if (!updateResult) {
        throw new Error(`Vehicle update returned null for ID ${vehicleId}`);
      }

      const verificationCheck = await Vehicle.findById(vehicleId);
      if (!verificationCheck || verificationCheck.status !== newStatus) {
        throw new Error(`Verification failed: Vehicle ${vehicleId} status is ${verificationCheck?.status}, expected ${newStatus}`);
      }

      console.log(`✅ Vehicle ${vehicle.plateNumber} successfully updated to ${newStatus}`);
      return {
        success: true,
        previousStatus: vehicle.status,
        newStatus: verificationCheck.status,
        plateNumber: vehicle.plateNumber,
        attempts: attempt
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed for vehicle ${vehicleId}:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error(`💥 CRITICAL: Failed to update vehicle ${vehicleId} after ${maxRetries} attempts. Last error:`, lastError.message);
  return {
    success: false,
    error: lastError.message,
    attempts: maxRetries
  };
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();

    console.log(`🏁 Starting booking completion for ID: ${id}`);

    // Find and validate booking
    const booking = await Booking.findById(id)
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

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

    const vehicleInfo = `${booking.vehicleId.model} (${booking.vehicleId.plateNumber})`;
    console.log(`📋 Completing booking ${booking.bookingId} for vehicle ${vehicleInfo}`);

    const endTime = new Date(body.endTime || new Date());

    // 🚀 NEW: Use PricingService instead of inline calculation
    console.log(`💰 Calculating pricing using PricingService...`);
    const pricingResult = await PricingService.calculateAdvancedPricing(booking.startTime, endTime);
    let finalAmount = pricingResult.totalAmount;

    // Apply adjustments (unchanged)
    if (body.discountAmount) finalAmount -= body.discountAmount;
    if (body.additionalCharges) finalAmount += body.additionalCharges;
    finalAmount = Math.max(0, finalAmount);

    const actualDurationHours = Math.ceil(pricingResult.totalMinutes / 60);

    // 🔄 STEP 1: Update booking record (unchanged)
    console.log(`📝 Updating booking ${booking.bookingId}...`);
    
    booking.endTime = endTime;
    booking.actualDuration = actualDurationHours;
    booking.finalAmount = finalAmount;
    booking.paymentMethod = body.paymentMethod;
    booking.status = 'completed';

    // Add return-specific fields
    if (body.vehicleCondition) booking.vehicleCondition = body.vehicleCondition;
    if (body.returnNotes) booking.returnNotes = body.returnNotes;
    if (body.damageNotes) booking.damageNotes = body.damageNotes;
    if (body.discountAmount) booking.discountAmount = body.discountAmount;
    if (body.additionalCharges) booking.additionalCharges = body.additionalCharges;
    booking.pricingBreakdown = pricingResult.breakdown;
    booking.passengerInfo = undefined;

    await booking.save();
    console.log(`✅ Booking ${booking.bookingId} marked as completed`);

    // 🔄 STEP 2: Update vehicle status (unchanged)
    console.log(`🚗 Updating vehicle ${vehicleInfo} status...`);
    
    const vehicleUpdateResult = await updateVehicleStatusSafely(
      booking.vehicleId._id,
      'available',
      `booking completion for ${booking.bookingId}`
    );

    // 🚨 CRITICAL ERROR HANDLING (unchanged)
    if (!vehicleUpdateResult.success) {
      console.error(`💥 CRITICAL: Vehicle status update failed for ${vehicleInfo}`);
      console.error(`🚨 MANUAL INTERVENTION REQUIRED: Vehicle ${vehicleInfo} needs status changed to 'available'`);
    }

    // Return populated booking with vehicle status info
    const updatedBooking = await Booking.findById(id)
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

    console.log(`🏁 Booking completion finished for ${booking.bookingId}`);

    // ✅ RESPONSE FORMAT UNCHANGED - 100% backward compatibility
    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      pricingDetails: pricingResult,
      vehicleStatusUpdate: vehicleUpdateResult,
      message: `Booking completed successfully. Final amount: ₹${finalAmount}`,
      warnings: vehicleUpdateResult.success ? [] : [
        `Vehicle ${vehicleInfo} status may not have updated correctly. Please verify manually.`
      ]
    });

  } catch (error) {
    console.error('❌ Booking completion error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}