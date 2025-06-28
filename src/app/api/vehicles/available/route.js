import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params; // Await params in Next.js 15+
    const vehicle = await Vehicle.findById(id);
    
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Add PATCH method for status updates
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    console.log(`🔧 Updating vehicle ${id}:`, body);
    
    // Validate status changes
    if (body.status) {
      const validStatuses = ['available', 'rented', 'maintenance'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Must be: available, rented, or maintenance' },
          { status: 400 }
        );
      }
      
      // Special validation for status changes to 'available'
      if (body.status === 'available') {
        // Check if vehicle is actually rented
        const activeBooking = await Booking.findOne({ 
          'vehicleId': id, 
          status: 'active' 
        }).populate('customerId', 'name');
        
        if (activeBooking) {
          console.warn(`⚠️ Attempting to mark vehicle ${id} as available but it has active booking ${activeBooking.bookingId}`);
          return NextResponse.json(
            { 
              success: false, 
              error: `Cannot mark as available. Vehicle is currently rented to ${activeBooking.customerId?.name || 'Unknown'} (Booking: ${activeBooking.bookingId})` 
            },
            { status: 400 }
          );
        }
      }
    }
    
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Updated vehicle ${vehicle.plateNumber}: ${JSON.stringify(body)}`);
    
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    console.error('Vehicle update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    
    // Check if vehicle is currently rented
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    if (vehicle.status === 'rented') {
      // Double-check with active bookings
      const activeBooking = await Booking.findOne({ 
        'vehicleId': id, 
        status: 'active' 
      }).populate('customerId', 'name');
      
      if (activeBooking) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot delete vehicle. Currently rented to ${activeBooking.customerId?.name || 'Unknown'} (Booking: ${activeBooking.bookingId})` 
          },
          { status: 400 }
        );
      }
    }
    
    const deletedVehicle = await Vehicle.findByIdAndDelete(id);
    console.log(`🗑️ Deleted vehicle: ${deletedVehicle.plateNumber}`);
    
    return NextResponse.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}