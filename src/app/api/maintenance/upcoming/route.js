// src/app/api/maintenance/upcoming/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Maintenance from '@/models/Maintenance';

// GET /api/maintenance/upcoming - Get upcoming maintenance
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 30; // Next 30 days
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const upcomingMaintenance = await Maintenance.find({
      status: { $in: ['scheduled', 'in-progress'] },
      scheduledDate: { $lte: futureDate }
    })
    .populate('vehicleId', 'vehicleNumber type brand model')
    .sort({ scheduledDate: 1 });
    
    // Transform data to include vehicle details at top level
    const transformedData = upcomingMaintenance.map(maintenance => ({
      ...maintenance.toObject(),
      vehicleNumber: maintenance.vehicleId?.vehicleNumber || 'Unknown',
      vehicleType: maintenance.vehicleId?.type || 'Unknown',
      vehicleBrand: maintenance.vehicleId?.brand || 'Unknown'
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedData
    });
    
  } catch (error) {
    console.error('Error fetching upcoming maintenance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upcoming maintenance' },
      { status: 500 }
    );
  }
}