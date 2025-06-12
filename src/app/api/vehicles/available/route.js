// src/app/api/vehicles/available/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';

// GET /api/vehicles/available - Get available vehicles by type
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Vehicle type is required' },
        { status: 400 }
      );
    }
    
    const vehicles = await Vehicle.getAvailableByType(type);
    
    return NextResponse.json({
      success: true,
      data: vehicles.map(v => ({
        vehicleNumber: v.vehicleNumber,
        brand: v.brand,
        model: v.model,
        type: v.type
      }))
    });
    
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available vehicles' },
      { status: 500 }
    );
  }
}