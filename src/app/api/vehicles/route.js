// src/app/api/vehicles/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';

// GET /api/vehicles - Get all vehicles with filters
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    let query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    
    const vehicles = await Vehicle.find(query)
      .sort({ vehicleNumber: 1 })
      .populate('currentBooking', 'customerDetails vehicleDetails');
    
    return NextResponse.json({
      success: true,
      data: vehicles
    });
    
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Add new vehicle
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      vehicleNumber,
      type,
      brand,
      model,
      registrationNumber,
      insuranceNumber,
      insuranceExpiry,
      pucExpiry
    } = body;
    
    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ vehicleNumber });
    if (existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle with this number already exists' },
        { status: 409 }
      );
    }
    
    const vehicle = new Vehicle({
      vehicleNumber: vehicleNumber.toUpperCase(),
      type,
      brand,
      model,
      documents: {
        registrationNumber,
        insuranceNumber,
        insuranceExpiry: new Date(insuranceExpiry),
        pucExpiry: new Date(pucExpiry)
      }
    });
    
    await vehicle.save();
    
    return NextResponse.json({
      success: true,
      data: vehicle,
      message: 'Vehicle added successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add vehicle' },
      { status: 500 }
    );
  }
}