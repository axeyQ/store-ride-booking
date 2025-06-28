import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const forChange = searchParams.get('forChange'); // For vehicle changes
    const excludeBookingId = searchParams.get('excludeBookingId');
    
    console.log('🚗 Vehicles API called:', { status, forChange, excludeBookingId });
    
    // Build query based on status parameter
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const vehicles = await Vehicle.find(query).sort({ type: 1, model: 1 });
    console.log(`📋 Found ${vehicles.length} vehicles matching query:`, query);
    
    // ✅ ENHANCED: For vehicle changes or when requesting available vehicles, cross-check with active bookings
    if (forChange === 'true' || status === 'available') {
      console.log('🔍 Cross-checking vehicle availability with active bookings...');
      
      // Get all active bookings to verify which vehicles are actually rented
      let bookingQuery = { status: 'active' };
      if (excludeBookingId) {
        bookingQuery.bookingId = { $ne: excludeBookingId };
      }
      
      const activeBookings = await Booking.find(bookingQuery).populate('vehicleId', '_id plateNumber model');
      console.log(`📋 Found ${activeBookings.length} active bookings`);
      
      // Create a set of actually rented vehicle IDs
      const rentedVehicleIds = new Set(
        activeBookings
          .filter(booking => booking.vehicleId) // Only bookings with valid vehicle refs
          .map(booking => booking.vehicleId._id.toString())
      );
      
      console.log('🚫 Actually rented vehicles:', Array.from(rentedVehicleIds).slice(0, 5), rentedVehicleIds.size > 5 ? '...' : '');
      
      // Filter vehicles based on actual availability
      const trulyAvailableVehicles = vehicles.filter(vehicle => {
        const vehicleId = vehicle._id.toString();
        const isMarkedAvailable = vehicle.status === 'available';
        const isActuallyRented = rentedVehicleIds.has(vehicleId);
        
        if (isActuallyRented && isMarkedAvailable) {
          console.warn(`⚠️ Vehicle ${vehicle.plateNumber} marked as available but actually rented!`);
          // Auto-fix the inconsistency in background (don't await to avoid slowing down response)
          Vehicle.findByIdAndUpdate(vehicle._id, { status: 'rented' }).catch(err => 
            console.error(`Failed to auto-fix ${vehicle.plateNumber}:`, err)
          );
        }
        
        // Only include if marked available AND not actually rented
        return isMarkedAvailable && !isActuallyRented;
      });
      
      console.log(`✅ Truly available vehicles: ${trulyAvailableVehicles.length}/${vehicles.length}`);
      
      return NextResponse.json({
        success: true,
        vehicles: trulyAvailableVehicles,
        meta: {
          total: vehicles.length,
          available: trulyAvailableVehicles.length,
          actuallyRented: rentedVehicleIds.size,
          crossChecked: true,
          inconsistencies: vehicles.length - trulyAvailableVehicles.length - rentedVehicleIds.size
        }
      });
    }
    
    // Regular response for other requests (no cross-checking)
    return NextResponse.json({
      success: true,
      vehicles,
      meta: {
        total: vehicles.length,
        crossChecked: false
      }
    });
    
  } catch (error) {
    console.error('Vehicles API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || !body.model || !body.plateNumber) {
      return NextResponse.json(
        { success: false, error: 'Type, model, and plate number are required' },
        { status: 400 }
      );
    }
    
    // Check for duplicate plate number
    const existingVehicle = await Vehicle.findOne({ plateNumber: body.plateNumber });
    if (existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'A vehicle with this plate number already exists' },
        { status: 400 }
      );
    }
    
    const vehicle = new Vehicle({
      ...body,
      status: body.status || 'available' // Default to available
    });
    
    await vehicle.save();
    console.log(`✅ Created new vehicle: ${vehicle.model} (${vehicle.plateNumber})`);
    
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    console.error('Vehicle creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}