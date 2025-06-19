// src/app/api/vehicles/[id]/route.js
import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
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

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
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
    const { id } = params;
    
    // Check if vehicle is currently rented
    const vehicle = await Vehicle.findById(id);
    if (vehicle && vehicle.status === 'rented') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a rented vehicle' },
        { status: 400 }
      );
    }
    
    const deletedVehicle = await Vehicle.findByIdAndDelete(id);
    
    if (!deletedVehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}