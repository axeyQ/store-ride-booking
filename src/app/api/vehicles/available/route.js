import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const excludeBookingId = searchParams.get('excludeBookingId');
    const crossCheck = searchParams.get('crossCheck') !== 'false'; // Default to true
    
    console.log('🚗 Available vehicles API called:', { excludeBookingId, crossCheck });
    
    // Get vehicles marked as available
    const availableVehicles = await Vehicle.find({ status: 'available' }).sort({ type: 1, model: 1 });
    console.log(`📋 Found ${availableVehicles.length} vehicles marked as available`);
    
    if (!crossCheck) {
      // Skip cross-checking if explicitly disabled
      return NextResponse.json({ 
        success: true, 
        vehicles: availableVehicles,
        meta: { crossChecked: false }
      });
    }
    
    // ✅ CROSS-CHECK: Verify which vehicles are actually available
    console.log('🔍 Cross-checking with active bookings...');
    
    let bookingQuery = { status: 'active' };
    if (excludeBookingId) {
      bookingQuery.bookingId = { $ne: excludeBookingId };
    }
    
    const activeBookings = await Booking.find(bookingQuery).populate('vehicleId', '_id plateNumber model');
    console.log(`📋 Found ${activeBookings.length} active bookings`);
    
    // Create set of actually rented vehicle IDs
    const rentedVehicleIds = new Set(
      activeBookings
        .filter(booking => booking.vehicleId)
        .map(booking => booking.vehicleId._id.toString())
    );
    
    console.log(`🚫 Actually rented: ${rentedVehicleIds.size} vehicles`);
    
    // Filter out vehicles that are actually rented
    const trulyAvailableVehicles = [];
    const inconsistentVehicles = [];
    
    for (const vehicle of availableVehicles) {
      const vehicleId = vehicle._id.toString();
      const isActuallyRented = rentedVehicleIds.has(vehicleId);
      
      if (isActuallyRented) {
        inconsistentVehicles.push({
          id: vehicleId,
          plateNumber: vehicle.plateNumber,
          model: vehicle.model
        });
        console.warn(`⚠️ Vehicle ${vehicle.plateNumber} marked available but actually rented!`);
        
        // Auto-fix in background
        Vehicle.findByIdAndUpdate(vehicleId, { status: 'rented' }).catch(err => 
          console.error(`Failed to auto-fix ${vehicle.plateNumber}:`, err)
        );
      } else {
        trulyAvailableVehicles.push(vehicle);
      }
    }
    
    console.log(`✅ Truly available: ${trulyAvailableVehicles.length}/${availableVehicles.length}`);
    
    if (inconsistentVehicles.length > 0) {
      console.log(`🔧 Auto-fixing ${inconsistentVehicles.length} inconsistent vehicles`);
    }
    
    return NextResponse.json({
      success: true,
      vehicles: trulyAvailableVehicles,
      meta: {
        total: availableVehicles.length,
        available: trulyAvailableVehicles.length,
        crossChecked: true,
        inconsistencies: inconsistentVehicles.length,
        inconsistentVehicles: inconsistentVehicles.slice(0, 5) // Limit response size
      }
    });
    
  } catch (error) {
    console.error('Available vehicles API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}